# Quality Management for Claude Code

Corrective actions, controlled documents, training evidence, supplier reviews and calibration dates in a database you own. Built by Enterprise DNA for general manufacturers.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Clone it and run the demo. | Your fields, rules, Isolocity exports and paperwork. | Installed and operated through Omni by Enterprise DNA. A setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=isolocity) · [Instead of Isolocity](https://enterprisedna.co/omni/instead-of/isolocity)

## What this replaces

The quality manager's weekly administration: chase overdue actions, check revision training, review supplier failures, read calibration due dates and assemble evidence reports. The free version stores references to your documents, not their binary files. It runs through Claude Code, Codex, OpenCode or Cursor and has no application front end.

Isolocity lists full users at $220 a month under an annual contract. Ten full users imply a $26,400 annual subscription scenario. This is not an observed customer invoice, and the vendor page does not state a currency code. Basic users are free and lower-cost production seats are available. Compare your actual seat mix and quote. [Pricing checked 9 October 2026](https://isolocity.com/pricing).

General manufacturing records are the scope. This is not a validated pharmaceutical or medical-device system, regulated signature service, statistical process control engine or batch-release authority. Read [the scope](docs/why-no-front-end.md) before choosing a replacement.

## Quick start

Requires Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/quality-management-for-claude-code.git
cd quality-management-for-claude-code
npm install
npm run demo
npm run quality -- weekly-review
npm run view
npm run docs
```

No database service is needed: PGlite stores local data in .data/db. For PostgreSQL use DATABASE_URL, then npm run migrate. Keep credentials out of version control. Use a trusted database owner or a role configured for this installation; tables have RLS and no public policies. The schema uses core PostgreSQL functions without extensions. Never seed a real database.

The fictional Kauri Components demo has an overdue supplier review, a repeated fastener defect, a major action without containment, revision training gaps and an inspection after a calibration due date. Seed data uses relative dates and is idempotent.

## The weekly rituals

Monday: /weekly-review combines the action queue, supplier scorecard, training gaps and recurring failures. Each morning: /attention. After incoming inspection: /add and /inspection-review. Before a supplier meeting: /supplier-review and /draft-supplier-letter. Before closing an issue: /close-capa requires cause, action, verification and reviewer. Before the audit: /compliance, /docs and /closure-evidence.

## Ten questions this database answers today

These are tested questions about this build, not claims that Isolocity lacks a feature.

1. Which major actions are overdue and still lack containment? /attention
2. Which people completed an older procedure revision? /training-due
3. Which suppliers combine repeated inspection failures with overdue actions? /supplier-review
4. Which failure modes have returned after an earlier closure? /repeat-failures plus /closure-evidence
5. Which failed inspections have no linked action? /compliance
6. Who owns the most overdue actions? /owner-load
7. Which effective documents are past their review date? /document-review
8. Which inspections occurred after the recorded calibration due date? /compliance
9. What evidence and reviewer supported the last action closure? /closure-evidence
10. What changed on a record, who recorded it and what were its prior values? /activity

## Commands

25 CLI commands, each with --json, and 29 slash command recipes including customisation and rendering. Partial IDs and case-insensitive names work; an ambiguous name lists matches and exits with failure.

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
| /docs, /view | Render branded quality reports and snapshots |
| /customise, /new-view | Add your fields, rules and views |

```bash
npm run quality -- add --kind=capas --code=CA-004 --title="Coating defect" --owner="Mara Chen" --due-on=2026-12-01 --failure-mode="coating thickness" --actor="Mara Chen"
npm run quality -- show --kind=capas --ref=CA-004 --json
npm run quality -- log --kind=capas --ref=CA-004 --note="Batch held for inspection" --actor="Mara Chen"
```

All write operations record an actor. Update records keep the previous values. Administrators can still modify the database directly; the history is not tamper-proof. The [data guide](docs/replace-isolocity.md) lists every supported entity and field.

## Bring your history

Export from Isolocity, inspect its headers, then create an explicit column map. The vendor documents CSV exports but not a stable public header schema. The included fixture is synthetic.

```bash
npm run quality -- import isolocity --kind=documents --file=documents.csv --map=document-map.json --actor="Your name" --dry-run
npm run quality -- import isolocity --kind=documents --file=documents.csv --map=document-map.json --actor="Your name"
```

Files are atomic. Dry runs roll back. Repeats do not duplicate records. Conflicting records stop for review. Original row values and mappings are retained as provenance, including unmapped columns. [Export, mapping and reconciliation guide](docs/replace-isolocity.md).

## Paperwork and views

Change brand.json once. npm run docs writes corrective-action reports, supplier evaluation records and training records to docs-out. npm run view writes the quality week, supplier scorecard and training snapshots to views. All are escaped, read-only HTML suitable for printing. /draft-capa and /draft-supplier-letter write to drafts, never send. Source document binaries and evidence files remain in your controlled storage.

## Record checks

Nine checks cover dates, references and evidence presence. The [compliance guide](docs/compliance.md) distinguishes ISO 9001:2015 evidence guidance from business policies. It is not an exhaustive standard audit and a clean result does not certify a company.

## Your first hour: ten things to ask for

1. Put our business name and colours on the supplier report.
2. Import a test export without saving anything.
3. Add a customer complaint reference to every action.
4. Use our defect categories in the weekly review.
5. Put our quality manager on the controlled-document review.
6. Add a second verifier to major action closure.
7. Show repeated failures grouped by supplier and quarter.
8. Put our document links in the training record.
9. Add calibration certificate history before migrating older inspections.
10. Write a supplier meeting brief from its open actions.

/customise writes and applies a migration, updates the CLI and documents, and tests the change. /new-view creates another read-only report using the same records.

## Verification

npm test creates a temporary database, migrates, seeds twice, exercises all 25 CLI commands, raises and clears each of nine rules, checks missing evidence, CSV mapping, invalid dates, conflicts, duplicate files, rollback, reference matching, exports, drafts, escaped HTML and exit codes. TEST_DATABASE_URL selects a disposable empty PostgreSQL database. The workflow runs Linux, Windows and PostgreSQL; inspect its actual results before claiming those environments passed.

## Installed for you

Enterprise DNA maps and checks your exports, builds the missing workflows, adds a web front end or a different stack when needed, and runs the agreed system through Omni by Enterprise DNA. A setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=isolocity).

MIT. Copyright 2026 Enterprise DNA. Not affiliated with Isolocity or Anthropic. Hosting and agent use have their own costs.
