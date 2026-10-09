import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,reads,entities,commands,rules} from './quality.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table as htmlTable} from './lib/render.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'quality-smoke-'));
process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=tmp;
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
const db=await getDb(),seen=new Set();
const call=async(c,o={},a=[])=>{seen.add(c);return run(db,c,o,a);};
const actor='Smoke Operator',today=new Date().toISOString().slice(0,10);
const date=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const fails=(c,o,re=/./,a=[])=>assert.rejects(()=>call(c,o,a),re);
let closed=false;
try{
 await migrate(db);assert.equal((await migrate(db)).ran.length,0);await seed(db);await seed(db);
 assert.equal((await call('list',{kind:'capas'})).length,3);
 for(const c of Object.keys(reads))assert.ok(Array.isArray(await call(c)));
 for(const kind of Object.keys(entities))assert.ok((await call('list',{kind})).length);
 const findings=await call('compliance');for(const rule of Object.keys(rules))assert.ok(findings.some(f=>f.rule===rule),rule);
 assert.equal((await call('weekly-review')).repeats[0].failure_mode,'undersize fastener');
 assert.equal((await call('show',{kind:'suppliers',ref:'alpine'}))[0].code,'SUP-AL');
 const s=(await call('show',{kind:'suppliers',ref:'SUP-AL'}))[0];assert.equal((await call('show',{kind:'suppliers',ref:s.id.slice(0,8)}))[0].id,s.id);
 await fails('show',{kind:'suppliers',ref:'SUP'},/Ambiguous.*SUP-AL/);await fails('show',{kind:'suppliers',ref:'missing'},/No suppliers/);
 await fails('list',{kind:'suppliers; drop table suppliers'},/Choose/);
 await fails('add',{kind:'suppliers',code:'X',name:'X',review_due:today},/actor/);
 await fails('add',{actor,kind:'suppliers',code:'sup-al',name:'Duplicate',review_due:today},/unique|duplicate/i);
 await fails('add',{actor,kind:'documents',code:'BAD',title:'Bad',revision:'1',owner:actor,review_due:'2026-02-30'},/Invalid ISO date/);
 await fails('add',{actor,kind:'documents',code:'BAD',title:'Bad',revision:'1',owner:actor,review_due:today,status:'effective'},/check constraint/);
 await call('add',{actor,kind:'suppliers',code:'SUP-T',name:'Test supplier',review_due:date(20),approved:'false'});
 await call('add',{actor,kind:'documents',code:'DOC-T',title:'<script>alert(1)</script>',revision:'1',owner:actor,review_due:date(10)});
 await call('add',{actor,kind:'equipment',code:'EQ-T',name:'Test gauge',owner:actor,calibration_due:date(20),certificate:'test.pdf'});
 await call('add',{actor,kind:'training',code:'TR-T',person:'Test person',document_id:'DOC-T',revision:'1',due_on:today});
 await call('add',{actor,kind:'inspections',code:'IN-T',batch:'TEST',supplier_id:'SUP-T',equipment_id:'EQ-T',inspected_on:today,result:'hold',inspector:actor,evidence:'test.pdf'});
 await call('add',{actor,kind:'capas',code:'CA-T',title:'Test action',supplier_id:'SUP-T',inspection_id:'IN-T',owner:actor,due_on:date(10),failure_mode:'test'});
 await call('update',{actor,kind:'documents',ref:'DOC-T',status:'effective',approved_by:actor,evidence:'document.pdf'});
 await call('log',{actor,kind:'capas',ref:'CA-T',note:'Lot held for review'});
 await fails('update',{actor,kind:'capas',ref:'CA-T',status:'closed',closed_on:today},/check constraint/);
 await fails('close-capa',{actor,ref:'CA-T',root_cause:'cause',action:'action',verification:'proof',verified_by:actor,closed_on:date(1)},/future/);
 await fails('update',{actor,kind:'training',ref:'TR-T',completed_on:date(1),evidence:'x'},/future/);
 await call('close-capa',{actor,ref:'CA-T',root_cause:'Gauge worn',action:'Replaced gauge',verification:'Three lots passed, report Q-3',verified_by:'Test reviewer',closed_on:today});
 await fails('complete-training',{actor,ref:'TR-T',revision:'1',completed_on:today},/evidence/);
 await call('complete-training',{actor,ref:'TR-T',revision:'1',completed_on:today,evidence:'training-test.pdf'});
 assert.ok(!(await call('training-due')).some(r=>r.code==='TR-T'));
 await call('update',{actor,kind:'documents',ref:'DOC-T',revision:'2'});assert.ok((await call('training-due')).some(r=>r.code==='TR-T'&&r.gap==='revision changed'));
 // Repair each seeded finding with records, not by suppressing its rule.
 await call('update',{actor,kind:'capas',ref:'CA-01',due_on:date(10),containment:'Affected lot quarantined'});
 await call('update',{actor,kind:'documents',ref:'SOP-01',review_due:date(30)});
 for(const ref of ['TR-01','TR-02'])await call('complete-training',{actor,ref,revision:'3',completed_on:today,evidence:'training-verified.pdf'});
 await call('complete-training',{actor,ref:'TR-T',revision:'2',completed_on:today,evidence:'training-v2.pdf'});
 await call('update',{actor,kind:'suppliers',ref:'SUP-AL',review_due:date(30)});
 await call('update',{actor,kind:'suppliers',ref:'SUP-PA',approved:'true',evidence:'supplier-review.pdf'});
 await call('update',{actor,kind:'suppliers',ref:'SUP-T',approved:'true',evidence:'supplier-review.pdf'});
 await call('update',{actor,kind:'equipment',ref:'EQ-01',calibration_due:date(30)});
 await call('update',{actor,kind:'inspections',ref:'IN-02',evidence:'inspection-IN02.pdf'});
 await call('add',{actor,kind:'capas',code:'CA-IN02',title:'Failed inspection investigation',owner:actor,due_on:date(10),failure_mode:'test second failure',inspection_id:'IN-02'});
 assert.equal((await call('compliance')).length,0);
 // Real parsing, mapping, provenance, dry run, idempotency and rollback.
 const file=path.join(tmp,'documents.csv'),map=path.join(REPO_ROOT,'fixtures/document-map.json');fs.copyFileSync(path.join(REPO_ROOT,'fixtures/documents.csv'),file);
 const imp={actor,kind:'documents',file,map};
 assert.equal((await call('import',{...imp,dry_run:true},['isolocity']))[0].added,2);await fails('show',{kind:'documents',ref:'EXT-01'},/No documents/);
 assert.equal((await call('import',imp,['isolocity']))[0].added,2);assert.equal((await call('import',imp,['isolocity']))[0].unchanged,2);
 assert.ok((await call('activity')).some(r=>r.action==='import-source'&&r.details.row['Document Number']==='EXT-01'));
 const original=fs.readFileSync(file,'utf8');fs.writeFileSync(file,original.replace('Incoming inspection, west site','Changed title'));
 await fails('import',imp,/Conflicting/,['isolocity']);
 fs.writeFileSync(file,original.replaceAll('EXT-01','ROLL-01').replaceAll('EXT-02','ROLL-02').replace('2026-12-15','2026-02-30'));
 await fails('import',imp,/Invalid ISO date/,['isolocity']);await fails('show',{kind:'documents',ref:'ROLL-01'},/No documents/);
 fs.writeFileSync(file,original.replaceAll('EXT-02','EXT-01'));await fails('import',imp,/Duplicate code/,['isolocity']);
 fs.writeFileSync(file,original.replace('Document Number','Wrong header'));await fails('import',imp,/Missing CSV header/,['isolocity']);
 await fails('import',{...imp,map:undefined},/map/,['isolocity']);
 assert.equal(parseCsv('\ufeffa,b\r\n"hello\nworld","quote ""x"""\r\n')[0].a,'hello\nworld');
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);assert.throws(()=>parseCsv('a,b\n"broken,2'),/unclosed/);
 for(const kind of Object.keys(entities)){
  const exported=(await call('export',{kind,dir:tmp}))[0];const csvRows=parseCsv(fs.readFileSync(exported.file,'utf8'));assert.ok(csvRows.length);assert.ok(!('id' in csvRows[0]));
  const identity=path.join(tmp,kind+'-map.json');fs.writeFileSync(identity,JSON.stringify(Object.fromEntries(entities[kind].fields.map(k=>[k,k]))));
  assert.equal((await call('import',{actor,kind,file:exported.file,map:identity},['isolocity']))[0].added,0);
 }
 const backup=(await call('export',{dir:tmp}))[0];const all=JSON.parse(fs.readFileSync(backup.file,'utf8'));assert.ok(all.activity.length>10);assert.ok(all.capas.length>=5);
 for(const c of ['draft-capa','draft-supplier-letter']){const d=(await call(c,{ref:c==='draft-capa'?'CA-T':'SUP-AL'}))[0];assert.ok(fs.readFileSync(d.file,'utf8').includes('DRAFT'));}
 assert.ok(htmlTable([{value:'<img src=x onerror=alert(1)>'}]).includes('&lt;img'));assert.ok(!htmlTable([{value:'<script>'}]).includes('<script>'));
 assert.ok((await db.query("select relname from pg_class where relname in ('suppliers','documents','training','equipment','inspections','capas','activity') and relrowsecurity")).length===7);
 await call('help');assert.deepEqual([...seen].sort(),[...commands].sort());
 await db.close();closed=true;
 for(const script of ['view.mjs','docs.mjs']){const p=spawnSync(process.execPath,['scripts/'+script],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
 assert.ok(fs.existsSync(path.join(tmp,'views/week.html')));assert.equal(fs.readdirSync(path.join(tmp,'docs-out/training-record')).length,4);
 // Verify the actual CLI entrypoint and exit status, including name ambiguity.
 const cli=spawnSync(process.execPath,['scripts/quality.mjs','show','--kind=suppliers','--ref=SUP','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(cli.status,1);assert.match(cli.stderr,/Ambiguous/);
 const json=spawnSync(process.execPath,['scripts/quality.mjs','attention','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(json.status,0,json.stderr);assert.ok(Array.isArray(JSON.parse(json.stdout)));
 console.log(`PASS: ${commands.length} CLI commands; all nine checks raised and cleared; imports, rollback, evidence, exports, drafts, HTML and CLI exit codes (${process.env.TEST_DATABASE_URL?'Postgres':'PGlite'}).`);
}finally{if(!closed)await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
