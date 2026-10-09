create function quality_touch() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table suppliers (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 risk text not null default 'normal' check(risk in ('normal','high')), review_due date not null,
 approved boolean not null default false, evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table documents (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 revision text not null, owner text not null, status text not null default 'draft' check(status in ('draft','effective','obsolete')),
 approved_by text not null default '', evidence text not null default '', review_due date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'effective' or (length(trim(approved_by))>0 and length(trim(evidence))>0))
);
create table training (
 id uuid primary key default gen_random_uuid(), code text not null unique, person text not null,
 document_id uuid not null references documents(id), revision text not null, due_on date not null,
 completed_on date, evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(completed_on is null or length(trim(evidence))>0)
);
create table equipment (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 owner text not null, calibration_due date not null, certificate text not null default '',
 in_service boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table inspections (
 id uuid primary key default gen_random_uuid(), code text not null unique, batch text not null,
 supplier_id uuid not null references suppliers(id), equipment_id uuid not null references equipment(id),
 inspected_on date not null, result text not null check(result in ('pass','fail','hold')),
 inspector text not null, evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table capas (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 supplier_id uuid references suppliers(id), inspection_id uuid references inspections(id),
 owner text not null, opened_on date not null default current_date, due_on date not null,
 status text not null default 'open' check(status in ('open','investigating','verification','closed')),
 severity text not null default 'minor' check(severity in ('minor','major')), failure_mode text not null,
 containment text not null default '', root_cause text not null default '', action text not null default '',
 verification text not null default '', verified_by text not null default '', closed_on date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(due_on>=opened_on), check(closed_on is null or closed_on>=opened_on),
 check((status='closed')=(closed_on is not null)),
 check(status<>'closed' or (length(trim(root_cause))>0 and length(trim(action))>0 and length(trim(verification))>0 and length(trim(verified_by))>0))
);
create table activity (
 id uuid primary key default gen_random_uuid(), kind text not null, record_id uuid,
 actor text not null check(length(trim(actor))>0), action text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index training_document_idx on training(document_id);
create index inspections_supplier_idx on inspections(supplier_id);
create index inspections_equipment_idx on inspections(equipment_id);
create index capas_supplier_idx on capas(supplier_id);
create index capas_inspection_idx on capas(inspection_id);
create index capas_due_idx on capas(due_on) where status<>'closed';
create index activity_record_idx on activity(kind,record_id,created_at);
do $$ declare t text; begin foreach t in array array['suppliers','documents','training','equipment','inspections','capas','activity'] loop
 execute format('create trigger quality_touch before update on %I for each row execute function quality_touch()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop; end $$;
create view quality_capa_queue with (security_invoker=true) as
 select c.id,c.code,c.title,c.owner,c.severity,c.status,c.failure_mode,c.due_on,
 current_date-c.due_on as days_overdue,s.code as supplier,i.batch
 from capas c left join suppliers s on s.id=c.supplier_id left join inspections i on i.id=c.inspection_id where c.status<>'closed';
create view quality_training_gaps with (security_invoker=true) as
 select t.id,t.code,t.person,d.code as document,t.revision as trained_revision,d.revision as current_revision,
 t.due_on,t.completed_on,
 case when t.revision<>d.revision then 'revision changed' when t.completed_on is null then 'completion missing' else 'evidence missing' end as gap
 from training t join documents d on d.id=t.document_id where d.status='effective' and
 (t.revision<>d.revision or t.completed_on is null or t.evidence='');
create view quality_supplier_scorecard with (security_invoker=true) as
 select s.id,s.code,s.name,s.risk,s.approved,s.review_due,
 (select count(*) from inspections i where i.supplier_id=s.id) as inspections,
 (select count(*) from inspections i where i.supplier_id=s.id and i.result='fail') as failed,
 (select count(*) from capas c where c.supplier_id=s.id and c.status<>'closed') as open_capas,
 (select count(*) from capas c where c.supplier_id=s.id and c.status<>'closed' and c.due_on<current_date) as overdue_capas
 from suppliers s;
create view quality_repeat_failures with (security_invoker=true) as
 select failure_mode,count(*) as occurrences,count(*) filter(where status<>'closed') as open_count,
 min(opened_on) as first_seen,max(opened_on) as last_seen from capas group by failure_mode having count(*)>1;
create view quality_findings with (security_invoker=true) as
 select 'CAPA-DUE'::text as rule,'capas'::text as kind,id,code,owner,due_on,'Corrective action past its agreed date'::text as finding from capas where status<>'closed' and due_on<current_date
 union all select 'CAPA-CONTAINMENT','capas',id,code,owner,due_on,'Major issue has no containment recorded' from capas where status<>'closed' and severity='major' and trim(containment)=''
 union all select 'DOC-REVIEW','documents',id,code,owner,review_due,'Effective document past its review date' from documents where status='effective' and review_due<current_date
 union all select 'TRAINING-GAP','training',id,code,person,due_on,gap from quality_training_gaps where due_on<=current_date or gap='revision changed'
 union all select 'SUPPLIER-REVIEW','suppliers',id,code,'quality manager',review_due,'Supplier approval, evidence or review needs attention' from suppliers where not approved or evidence='' or review_due<current_date
 union all select 'CALIBRATION-DUE','equipment',id,code,owner,calibration_due,'In-service equipment calibration overdue or certificate missing' from equipment where in_service and (calibration_due<current_date or certificate='')
 union all select 'INSPECTION-EVIDENCE','inspections',id,code,inspector,inspected_on,'Inspection has no evidence reference' from inspections where evidence=''
 union all select 'FAILED-NO-CAPA','inspections',i.id,i.code,i.inspector,i.inspected_on,'Failed inspection has no linked corrective action' from inspections i where i.result='fail' and not exists(select 1 from capas c where c.inspection_id=i.id)
 union all select 'INSPECTION-CALIBRATION','inspections',i.id,i.code,i.inspector,i.inspected_on,'Inspection dated after recorded calibration due date' from inspections i join equipment e on e.id=i.equipment_id where i.inspected_on>e.calibration_due;
revoke all on quality_capa_queue,quality_training_gaps,quality_supplier_scorecard,quality_repeat_failures,quality_findings from public;
-- Source identifiers are case-insensitive across manual entry and imports.
create unique index suppliers_code_folded on suppliers(lower(code));
create unique index documents_code_folded on documents(lower(code));
create unique index training_code_folded on training(lower(code));
create unique index equipment_code_folded on equipment(lower(code));
create unique index inspections_code_folded on inspections(lower(code));
create unique index capas_code_folded on capas(lower(code));
