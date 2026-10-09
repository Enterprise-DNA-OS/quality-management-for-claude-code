#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
import {page,table as htmlTable,writeOut} from './lib/render.mjs';

// Static identifiers only. User values are always bound parameters.
export const entities={
 suppliers:{required:['code','name','review_due'],fields:['code','name','risk','review_due','approved','evidence']},
 documents:{required:['code','title','revision','owner','review_due'],fields:['code','title','revision','owner','status','approved_by','evidence','review_due']},
 training:{required:['code','person','document_id','revision','due_on'],fields:['code','person','document_id','revision','due_on','completed_on','evidence'],refs:{document_id:'documents'}},
 equipment:{required:['code','name','owner','calibration_due'],fields:['code','name','owner','calibration_due','certificate','in_service']},
 inspections:{required:['code','batch','supplier_id','equipment_id','inspected_on','result','inspector'],fields:['code','batch','supplier_id','equipment_id','inspected_on','result','inspector','evidence'],refs:{supplier_id:'suppliers',equipment_id:'equipment'}},
 capas:{required:['code','title','owner','due_on','failure_mode'],fields:['code','title','supplier_id','inspection_id','owner','opened_on','due_on','status','severity','failure_mode','containment','root_cause','action','verification','verified_by','closed_on'],refs:{supplier_id:'suppliers',inspection_id:'inspections'}}
};
const source='https://www.iso.org/files/live/sites/isoorg/files/archive/pdf/en/documented_information.pdf';
export const rules={
 'CAPA-DUE':['House policy','Agreed corrective-action due date',null],
 'CAPA-CONTAINMENT':['House policy','Contain major issues before further processing',null],
 'DOC-REVIEW':['House policy','Business-selected document review date',null],
 'TRAINING-GAP':['ISO 9001:2015 7.2 / house policy','Competence evidence; revision matching is a local control',source],
 'SUPPLIER-REVIEW':['ISO 9001:2015 8.4.1 / house policy','Supplier evaluation evidence; approval and due dates are local controls',source],
 'CALIBRATION-DUE':['ISO 9001:2015 7.1.5 / house policy','Measurement resource evidence; dates are entered from the certificate',source],
 'INSPECTION-EVIDENCE':['ISO 9001:2015 8.6','Evidence supporting product acceptance decisions',source],
 'FAILED-NO-CAPA':['ISO 9001:2015 10.2.2 / house policy','Corrective-action evidence; a link per failed inspection is a local control',source],
 'INSPECTION-CALIBRATION':['House policy','Review inspections after the equipment calibration due date',null]
};
export const reads={
 attention:'select rule,code,owner,due_on,finding from quality_findings order by due_on,code,rule',
 'capa-review':'select code,title,owner,severity,status,failure_mode,due_on,days_overdue,supplier,batch from quality_capa_queue order by due_on,code',
 'document-review':"select code,title,revision,owner,status,review_due,approved_by from documents where status<>'obsolete' order by review_due,code",
 'training-due':'select code,person,document,trained_revision,current_revision,due_on,gap from quality_training_gaps order by due_on,code',
 'supplier-review':'select code,name,risk,approved,review_due,inspections,failed,open_capas,overdue_capas from quality_supplier_scorecard order by overdue_capas desc,failed desc,code',
 'calibration-due':'select code,name,owner,calibration_due,certificate,in_service from equipment where in_service order by calibration_due,code',
 'inspection-review':'select i.code,i.batch,s.code as supplier,e.code as equipment,i.inspected_on,i.result,i.inspector,i.evidence from inspections i join suppliers s on s.id=i.supplier_id join equipment e on e.id=i.equipment_id order by i.inspected_on desc,i.code',
 'repeat-failures':'select * from quality_repeat_failures order by occurrences desc,failure_mode',
 'owner-load':"select owner,count(*) as open_capas,count(*) filter(where due_on<current_date) as overdue,count(*) filter(where severity='major') as major from capas where status<>'closed' group by owner order by overdue desc,owner",
 'closure-evidence':"select code,title,root_cause,action,verification,verified_by,closed_on from capas where status='closed' order by closed_on desc,code",
 activity:'select kind,actor,action,details,created_at from activity order by created_at desc,id'
};
function need(o,k){if(o[k]===undefined||o[k]===null||String(o[k]).trim()==='')throw Error(`Give --${k.replaceAll('_','-')}`);return o[k];}
function entity(kind){if(!entities[kind])throw Error(`Choose --kind=${Object.keys(entities).join('|')}`);return entities[kind];}
export async function resolve(db,kind,value){
 entity(kind);const names=entities[kind].fields.filter(f=>['name','title','person'].includes(f));
 const exact=await db.query(`select * from ${kind} where lower(code)=lower($1) or id::text=$1`,[String(value)]);
 if(exact.length===1)return exact[0];
 const rows=await db.query(`select * from ${kind} where left(id::text,length($1))=lower($1) or position(lower($1) in lower(code))>0 ${names.map(n=>`or position(lower($1) in lower(${n}))>0`).join(' ')} order by code`,[String(value)]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${kind}: ${rows.map(r=>`${r.code} (${r.id})`).join(', ')}`:`No ${kind} match: ${value}`);
 return rows[0];
}
async function fields(db,kind,input,partial=false){
 const spec=entity(kind),out={};
 for(const [key,val] of Object.entries(input)){
  if(!spec.fields.includes(key))throw Error(`Unknown ${kind} field ${key}`);
  let v=val;
  if(['approved','in_service'].includes(key)){if(!['true','false','yes','no','1','0'].includes(String(v).toLowerCase()))throw Error(`Invalid boolean ${key}`);v=['true','yes','1'].includes(String(v).toLowerCase());}
  if(key.endsWith('_on')||key.endsWith('_due')){
   if(v==='')v=null;
   if(v!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))throw Error(`Invalid ISO date ${key}: ${v}`);
  }
  if(['closed_on','completed_on','inspected_on','opened_on'].includes(key)&&v&&v>new Date().toISOString().slice(0,10))throw Error(`${key} cannot be in the future`);
  if(spec.refs?.[key])v=v? (await resolve(db,spec.refs[key],v)).id:null;
  if(key==='code'){v=String(v).trim();if(!v)throw Error('Empty code');}
  out[key]=v;
 }
 if(!partial)for(const k of spec.required)need(out,k);
 return out;
}
async function record(db,kind,id,actor,action,details){await db.query('insert into activity(kind,record_id,actor,action,details) values($1,$2,$3,$4,$5::jsonb)',[kind,id,actor,action,JSON.stringify(details)]);}
async function transaction(db,fn,dry=false){await db.exec('begin');try{const out=await fn();await db.exec(dry?'rollback':'commit');return out;}catch(e){await db.exec('rollback');throw e;}}
async function insert(db,kind,data,actor){const cols=Object.keys(data);const [r]=await db.query(`insert into ${kind} (${cols.join(',')}) values(${cols.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(data));await record(db,kind,r.id,actor,'add',data);return r;}
async function update(db,kind,ref,changes,actor){const before=await resolve(db,kind,ref);const data=await fields(db,kind,changes,true);const cols=Object.keys(data);if(!cols.length)throw Error('No changed fields');const [r]=await db.query(`update ${kind} set ${cols.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${cols.length+1} returning *`,[...Object.values(data),before.id]);await record(db,kind,r.id,actor,'update',{before,changes:data});return r;}
function csv(rows,cols){const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [cols.map(esc).join(','),...rows.map(r=>cols.map(k=>esc(r[k])).join(','))].join('\r\n')+'\r\n';}
export const commands=[...Object.keys(reads),'help','list','show','compliance','weekly-review','add','update','log','close-capa','complete-training','import','export','draft-capa','draft-supplier-letter'];
export async function run(db,command,opts={},args=[]){
 if(reads[command])return db.query(reads[command]);
 if(command==='help')return commands.map(command=>({command}));
 if(command==='list'){entity(opts.kind);return db.query(`select * from ${opts.kind} order by code`);}
 if(command==='show')return [await resolve(db,opts.kind,need(opts,'ref'))];
 if(command==='compliance')return (await db.query(reads.attention)).map(r=>({...r,basis:rules[r.rule][0],check:rules[r.rule][1],source:rules[r.rule][2]||'docs/compliance.md (house policy)'}));
 if(command==='weekly-review')return {attention:await run(db,'attention'),suppliers:await run(db,'supplier-review'),training:await run(db,'training-due'),repeats:await run(db,'repeat-failures')};
 if(command==='add'||command==='update'){
  const actor=need(opts,'actor'),kind=need(opts,'kind');entity(kind);
  const input=Object.fromEntries(Object.entries(opts).filter(([k])=>!['actor','kind','ref','json'].includes(k)));
  return transaction(db,async()=>command==='add'?[await insert(db,kind,await fields(db,kind,input),actor)]:[await update(db,kind,need(opts,'ref'),input,actor)]);
 }
 if(command==='close-capa'){
  const actor=need(opts,'actor');const changes={status:'closed'};for(const k of ['root_cause','action','verification','verified_by','closed_on'])changes[k]=need(opts,k);
  if(changes.closed_on>new Date().toISOString().slice(0,10))throw Error('Closure cannot be in the future');
  return transaction(db,async()=>[await update(db,'capas',need(opts,'ref'),changes,actor)]);
 }
 if(command==='complete-training'){
  const actor=need(opts,'actor'),ref=need(opts,'ref');const changes={};for(const k of ['revision','completed_on','evidence'])changes[k]=need(opts,k);
  if(changes.completed_on>new Date().toISOString().slice(0,10))throw Error('Completion cannot be in the future');
  return transaction(db,async()=>[await update(db,'training',ref,changes,actor)]);
 }
 if(command==='log'){
  const actor=need(opts,'actor'),kind=need(opts,'kind'),r=await resolve(db,kind,need(opts,'ref'));need(opts,'note');
  await record(db,kind,r.id,actor,'note',{note:opts.note});return [{code:r.code,logged:true}];
 }
 if(command==='import'){
  if(args[0]!=='isolocity')throw Error('Use import isolocity --kind=... --file=... --map=... --actor=... [--dry-run]');
  const kind=need(opts,'kind'),spec=entity(kind),actor=need(opts,'actor');
  const mapping=JSON.parse(fs.readFileSync(need(opts,'map'),'utf8'));
  if(!mapping||Array.isArray(mapping)||typeof mapping!=='object')throw Error('Map must be an object of local field to source header');
  for(const [k,v] of Object.entries(mapping)){if(!spec.fields.includes(k)||typeof v!=='string'||!v.trim())throw Error(`Invalid mapping ${k}`);}
  for(const k of spec.required)if(!mapping[k])throw Error(`Map requires ${k}`);
  const rows=parseCsv(fs.readFileSync(need(opts,'file'),'utf8'));if(!rows.length)throw Error('CSV contains no records');
  const headers=Object.keys(rows[0]);for(const h of Object.values(mapping))if(!headers.includes(h))throw Error(`Missing CSV header: ${h}`);
  return transaction(db,async()=>{
   let added=0,unchanged=0;const seen=new Set();
   for(const row of rows){
    const raw=Object.fromEntries(Object.entries(mapping).map(([k,h])=>[k,row[h]]));const data=await fields(db,kind,raw);
    if(seen.has(data.code.toLowerCase()))throw Error(`Duplicate code in file: ${data.code}`);seen.add(data.code.toLowerCase());
    const existing=await db.query(`select * from ${kind} where lower(code)=lower($1)`,[data.code]);
    if(existing.length){if(existing.length>1||Object.entries(data).some(([k,v])=>String(existing[0][k]??'')!==String(v??'')))throw Error(`Conflicting existing record ${data.code}; review before updating`);unchanged++;continue;}
    const r=await insert(db,kind,data,actor);await record(db,kind,r.id,actor,'import-source',{vendor:'Isolocity',source_file:path.basename(opts.file),row,mapping});added++;
   }
   return [{kind,rows:rows.length,added,unchanged,dry_run:Boolean(opts.dry_run),unmapped_headers:headers.filter(h=>!Object.values(mapping).includes(h)).join(', ')}];
  },Boolean(opts.dry_run));
 }
 if(command==='export'){
  const dir=path.resolve(opts.dir||path.join(REPO_ROOT,'exports'));fs.mkdirSync(dir,{recursive:true});
  if(opts.kind){const spec=entity(opts.kind),rows=await db.query(`select * from ${opts.kind} order by code`);
   for(const r of rows)for(const [k,target] of Object.entries(spec.refs||{}))if(r[k])r[k]=(await resolve(db,target,r[k])).code;
   const file=path.join(dir,opts.kind+'.csv');fs.writeFileSync(file,csv(rows,spec.fields));return [{file,rows:rows.length}];
  }
  const out={exported_at:new Date().toISOString(),version:1};for(const kind of [...Object.keys(entities),'activity'])out[kind]=await db.query(`select * from ${kind} order by id`);
  const file=path.join(dir,'quality-backup.json');fs.writeFileSync(file,JSON.stringify(out,null,2)+'\n');return [{file,records:Object.keys(entities).reduce((n,k)=>n+out[k].length,0)}];
 }
 if(command==='draft-capa'||command==='draft-supplier-letter'){
  const kind=command==='draft-capa'?'capas':'suppliers',r=await resolve(db,kind,need(opts,'ref'));
  const history=await db.query('select actor,action,details,created_at from activity where kind=$1 and record_id=$2 order by created_at',[kind,r.id]);
  const related=kind==='suppliers'?await db.query('select code,title,status,owner,due_on,root_cause,action from capas where supplier_id=$1 order by due_on',[r.id]):[];
  const title=command==='draft-capa'?'Corrective action report: DRAFT':'Supplier corrective action letter: DRAFT';
  const file=writeOut('drafts',`${command}-${r.code.replace(/[^a-zA-Z0-9-]/g,'_')}-${r.id}`,page({title,subtitle:r.code,sections:[{title:'For review',note:'Check evidence and recipient before sending. Nothing has been sent.',html:htmlTable([r])},{title:'Related corrective actions',html:htmlTable(related)},{title:'Recorded history',html:htmlTable(history)}]}));return [{file,status:'draft only'}];
 }
 throw Error(`Unknown command ${command}. Run help.`);
}
export function print(value){
 if(Array.isArray(value))return value.length?table(value,Object.keys(value[0]).map(key=>({key,label:key,width:80}))):'  (none)';
 return Object.entries(value).map(([k,v])=>`${k}\n${print(v)}`).join('\n\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [command='help',...rest]=process.argv.slice(2),opts={},args=[];
 for(const a of rest){if(a.startsWith('--')){const at=a.indexOf('=');const key=a.slice(2,at<0?undefined:at).replaceAll('-','_');opts[key]=at<0?true:a.slice(at+1);}else args.push(a);}
 let db;try{db=await getDb();const out=await run(db,command,opts,args);console.log(opts.json?JSON.stringify(out):print(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
