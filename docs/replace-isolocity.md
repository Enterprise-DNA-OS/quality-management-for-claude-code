# Bring Isolocity quality records across

Start with the business's own export and keep the original unchanged. The scope is general manufacturing quality records: suppliers, documents, training, equipment, inspections and corrective actions. Regulated signatures, validated release, live measurements and inventory are outside this build.

## Obtain an export

Isolocity's [Document Export instructions](https://help.isolocity.com/support/solutions/articles/44002281854-exporting-your-documents-list) say to open Documents, Reports, then Download in Document Export. Isolocity also documents an Organization Data Export containing a ZIP of CSV files in its [data export documentation, page 6](https://isolocity.com/wp-content/uploads/2023/05/FDA-21-CFR-Part-11-Compliance-Rev-3-2021.pdf). Its [getting-started FAQ](https://help.isolocity.com/support/solutions/articles/44002576194-faqs-for-getting-started-) directs users to support for a user export. Checked 9 October 2026.

Unzip the export locally. If a downloaded report is a spreadsheet, save the relevant sheet as UTF-8 CSV. The vendor does not publish a stable CSV header specification. The fixture in this project is synthetic and illustrates mapping; it is not claimed to be an actual vendor export.

## Map once, then import in one command

A mapping is a JSON object with local field names as keys and exact export headings as values. Inspect your headers, then copy and adjust `fixtures/document-map.json`. Run `npm run quality -- help` and read `entities` in `scripts/quality.mjs` for the allowed local fields. Dates must be YYYY-MM-DD, booleans true/false, and status values must match the documented local model. Blank optional dates are accepted. A required field absent from the export needs a deliberate, reviewed transformation before import; it is never guessed.

```bash
npm run quality -- import isolocity --kind=documents --file=documents.csv --map=document-map.json --actor="Your name" --dry-run
npm run quality -- import isolocity --kind=documents --file=documents.csv --map=document-map.json --actor="Your name"
```

Import suppliers, documents and equipment first, then training and inspections, then corrective actions. Foreign-reference fields accept the corresponding source codes after those records have been imported. Map source identifiers into `code` to keep those relationships. The entities and supported states are:

| Entity | Required fields | Additional fields |
|---|---|---|
| suppliers | code, name, review_due | risk (normal/high), approved, evidence |
| documents | code, title, revision, owner, review_due | status (draft/effective/obsolete), approved_by, evidence |
| training | code, person, document_id, revision, due_on | completed_on, evidence |
| equipment | code, name, owner, calibration_due | certificate, in_service |
| inspections | code, batch, supplier_id, equipment_id, inspected_on, result (pass/fail/hold), inspector | evidence |
| capas | code, title, owner, due_on, failure_mode | supplier_id, inspection_id, opened_on, status (open/investigating/verification/closed), severity (minor/major), containment, root_cause, action, verification, verified_by, closed_on |

Dry runs write nothing. A repeated identical file adds nothing. A changed existing record, invalid date, missing reference or duplicate source code stops the entire file and rolls back its changes. Every imported row retains its original columns and mapping in the activity record; unmapped columns are reported, never silently discarded from the provenance record. They do not become operational fields until customised.

## Reconcile before switching

Compare counts and sample every relationship, evidence link, due date and status. Run the weekly review and generate the documents. Check actual evidence files remain accessible. Keep the export, attachment files, old audit history and supplier correspondence under your retention policy. The export importer handles mapped records, not binary attachments, source permissions, signatures, source audit logs, archived versions or source automations. Decide with the quality lead which history must be carried into an extended version before retiring access.

`npm run quality -- export` saves all local records and activity to JSON. `npm run quality -- export --kind=documents` saves CSV; foreign references in other entity exports use codes. Retain backups separately and test recovery before relying on the system. The single local operator design is not a validated multi-user quality platform.

Enterprise DNA maps the files, adds the fields and reconciles the move in your custom version. The installed service is Omni by Enterprise DNA: a setup fee, then a retainer. [Book with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=replace-guide&utm_campaign=isolocity).
