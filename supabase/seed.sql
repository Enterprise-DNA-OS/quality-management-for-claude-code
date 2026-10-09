insert into suppliers(code,name,risk,review_due,approved,evidence) values
 ('SUP-AL','Alpine Fasteners','high',current_date-20,true,'supplier-review/2025-alpine.pdf'),
 ('SUP-HA','Harbour Coatings','normal',current_date+60,true,'supplier-review/harbour.pdf'),
 ('SUP-PA','Pacific Packaging','normal',current_date+10,false,'') on conflict(code) do nothing;
insert into documents(code,title,revision,owner,status,approved_by,evidence,review_due) values
 ('SOP-01','Incoming goods inspection','3','Mara Chen','effective','Ira Patel','controlled/SOP-01-r3.pdf',current_date-5),
 ('SOP-02','Torque inspection','2','Mara Chen','effective','Ira Patel','controlled/SOP-02-r2.pdf',current_date+30),
 ('SOP-03','Supplier review','1','Tui Williams','draft','','',current_date+7) on conflict(code) do nothing;
insert into training(code,person,document_id,revision,due_on,completed_on,evidence) values
 ('TR-01','Noah Reed',(select id from documents where code='SOP-01'),'2',current_date-10,current_date-60,'training/noah-r2.pdf'),
 ('TR-02','Aroha King',(select id from documents where code='SOP-01'),'3',current_date-2,null,''),
 ('TR-03','Ira Patel',(select id from documents where code='SOP-02'),'2',current_date+15,current_date-5,'training/ira-r2.pdf') on conflict(code) do nothing;
insert into equipment(code,name,owner,calibration_due,certificate) values
 ('EQ-01','Torque wrench 40 Nm','Noah Reed',current_date-15,'calibration/TW40.pdf'),
 ('EQ-02','Digital calliper','Aroha King',current_date+100,'calibration/DC02.pdf') on conflict(code) do nothing;
insert into inspections(code,batch,supplier_id,equipment_id,inspected_on,result,inspector,evidence) values
 ('IN-01','AL-240',(select id from suppliers where code='SUP-AL'),(select id from equipment where code='EQ-01'),current_date-3,'fail','Noah Reed','inspection/AL-240.pdf'),
 ('IN-02','AL-241',(select id from suppliers where code='SUP-AL'),(select id from equipment where code='EQ-02'),current_date-2,'fail','Aroha King',''),
 ('IN-03','HA-112',(select id from suppliers where code='SUP-HA'),(select id from equipment where code='EQ-02'),current_date-1,'pass','Ira Patel','inspection/HA-112.pdf') on conflict(code) do nothing;
insert into capas(code,title,supplier_id,inspection_id,owner,opened_on,due_on,status,severity,failure_mode,containment,root_cause,action,verification,verified_by,closed_on) values
 ('CA-01','Undersize fasteners in incoming lot',(select id from suppliers where code='SUP-AL'),(select id from inspections where code='IN-01'),'Mara Chen',current_date-25,current_date-4,'investigating','major','undersize fastener','','','','','',null),
 ('CA-02','Previous undersize fastener lot',(select id from suppliers where code='SUP-AL'),null,'Mara Chen',current_date-90,current_date-60,'closed','minor','undersize fastener','Lot isolated','Supplier gauge drift','Recalibrated supplier gauge','Next lot passed, report QA-120','Ira Patel',current_date-65),
 ('CA-03','Coating thickness variation',(select id from suppliers where code='SUP-HA'),null,'Tui Williams',current_date-8,current_date+5,'verification','minor','coating thickness','Batch held','Bath concentration drift','Changed bath control','','',null) on conflict(code) do nothing;
