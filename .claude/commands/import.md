---
description: Import mapped Isolocity exports with a dry run
---

1. Read CLAUDE.md. 
2. Run `npm run quality -- import isolocity --kind=documents --file=<export.csv> --map=<mapping.json> --actor="<operator>" --dry-run --json`. Replace placeholders with the operator's supplied values. Run help or read docs/replace-isolocity.md for entity fields.
3. Present the result with record codes, owners and dates. If a match is ambiguous, show the candidates and obtain the intended record. Never invent evidence or completion.
4. Any document is a draft saved locally. Never send, publish, release a batch or certify compliance.

Read docs/replace-isolocity.md first. Verify the operator's real export headers. Review unmapped fields, counts and references in the dry run, then run the same command without --dry-run when the operator has requested the import. Keep the original file and verify record counts.
