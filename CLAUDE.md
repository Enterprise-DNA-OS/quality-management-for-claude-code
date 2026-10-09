# Quality Management for Claude Code

Read records before answering. This is general manufacturing quality administration for one trusted operator. Never claim regulated validation, authenticated signatures, certification or product release.

## Operator context

Business and brand: brand.json. Demo: fictional Kauri Components. Ask the operator for their name and applicable quality standard before recording real data. Never present demo records as customer records.

## Recurring work

| Command | Job |
|---|---|
| /attention | List every overdue or missing quality record |
| /capa-review | Review corrective actions by due date |
| /document-review | Review controlled document owners and revisions |
| /training-due | Find missing completion and outdated revision training |
| /supplier-review | Compare supplier failures, actions and reviews |
| /calibration-due | Review equipment calibration and certificates |
| /inspection-review | Review incoming inspections and evidence |
| /repeat-failures | Find failure modes that recur after previous actions |
| /owner-load | Balance open corrective actions by owner |
| /closure-evidence | Read closed actions and their verification evidence |
| /activity | Read the recorded change history |
| /help | List the available CLI commands |
| /list | List records in an entity |
| /show | Read a specific record |
| /compliance | Check records against cited evidence rules and local policies |
| /weekly-review | Prepare the Monday quality review |
| /add | Add a quality record |
| /update | Update a record with its before values retained |
| /log | Record a note against a record |
| /close-capa | Close a corrective action with cause, action and verification |
| /complete-training | Record evidence of training completion |
| /import | Import mapped Isolocity exports with a dry run |
| /export | Export all records or one entity |
| /draft-capa | Draft a corrective action report |
| /draft-supplier-letter | Draft a supplier action letter |
| /docs, /view | Branded paperwork and read-only snapshots |
| /customise, /new-view | Add fields, rules and read-only reports |

## Rules

Use npm run quality -- <command> --json for structured data. One CLI, one database, no second workflow. All write commands require --actor. Read docs/compliance.md before interpreting findings. Evidence links are references, not proof the evidence was reviewed. Never fabricate an approval, training completion, calibration or verification.

Drafts go to drafts/. Never send, publish or release goods. Never delete records without explicit instruction. Resolve ambiguous names by showing candidates. Keep original exports and source evidence. Do not run the demo seed against a real database.

A shared deployment needs access, backup, retention and recovery designed for that business. The base denies public access and is not a tenant service. No credentials belong in commits. For a field or rule change use /customise, a new numbered migration, and tests. Never modify an applied migration.

Omni by Enterprise DNA installs and runs a custom version: https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=agent&utm_campaign=isolocity
