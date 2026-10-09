# Quality record checks

This build supports general manufacturing quality administration. It does not validate regulated manufacturing, release products, supply regulated electronic signatures, or certify a business. Do not replace a pharmaceutical or medical-device validated system with it. The operator decides which standard and controls apply.

Reference edition: ISO 9001:2015. ISO's published [guidance on documented information](https://www.iso.org/files/live/sites/isoorg/files/archive/pdf/en/documented_information.pdf) was checked on 9 October 2026. It describes evidence for measurement resources (7.1.5), competence (7.2), external providers (8.4.1), acceptance (8.6), and corrective action (10.2.2). This is guidance, not a copy of the standard or an exhaustive audit. Review your applicable edition before deployment.

| Check | Meaning and authority |
|---|---|
| CAPA-DUE | House policy: open corrective action past the date your business agreed. ISO does not set a universal number of days. |
| CAPA-CONTAINMENT | House policy: major open issue has no containment note. The business decides adequate containment. |
| DOC-REVIEW | House policy: an effective document is past its business-selected review date. No statutory review interval is claimed. |
| TRAINING-GAP | Competence evidence relates to 7.2. Matching completion to the current document revision is a local control, not proof of competence. |
| SUPPLIER-REVIEW | Evaluation evidence relates to 8.4.1. Approval flags and review intervals are business choices. |
| CALIBRATION-DUE | Measurement evidence relates to 7.1.5. Checks the entered due date and certificate reference for in-service equipment. It does not calibrate instruments. |
| INSPECTION-EVIDENCE | Acceptance evidence relates to 8.6. A reference is checked for presence, not independently verified. |
| FAILED-NO-CAPA | Corrective-action evidence relates to 10.2.2. Linking every failed inspection to a corrective action is a local control. A person assesses the appropriate action. |
| INSPECTION-CALIBRATION | House policy: inspection is after the currently recorded calibration due date. Before changing calibration details, retain the old certificate and inspect affected historical batches. This is not a complete certificate-history model. |

Dates become overdue the next UTC day. Revision changes flag completed training immediately. Closed actions require cause, action, verification evidence, verifier and closure date at database level. All changes through the CLI record an actor and the prior values. Direct database administrators can change those records: this is not a tamper-proof audit trail or authenticated signature system.

The database denies public access. Operate through a trusted database owner or a separately configured restricted role. No browser API or shared login is included. Back up records and source evidence, configure access and retention with the business, and keep certification decisions with its quality lead and auditor.
