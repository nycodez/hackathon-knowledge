# Demo and access-control evidence

## Demo thesis

**Who:** a Tasco employee in Accounting within property management. **Goal:** get an accurate, permission-safe answer fast. **Proof:** the same question returns correctly scoped depth by role, a Restricted source is provably invisible, and each server-resolved identity remembers its own questions.

## Grounded property-management examples

The app renders these examples from `GET /api/v1/workspace/examples`; they are not README-only claims.

| # | Question | Grounded answer (summary) | Source | Scope |
| --- | --- | --- | --- | --- |
| 1 | Who owns the property-management operating model? | Property Operations owns the model; Accounting owns billing, close, reconciliation, and financial controls. | PM-COMP-001 | Internal |
| 2 | What should a new property accountant complete in week one? | Access, chart mapping, property assignment, segregation-of-duties review, and a supervised close rehearsal. | PM-HR-001 | Internal |
| 3 | What is the property month-end close sequence? | Freeze billing, reconcile bank/AR, post approved accruals, reconcile owner/fund balances, review variances, lock. | ACC-PM-001 | Internal |
| 4 | How is the monthly management fee calculated? | Approved rate × billable usable area, less approved concessions, with tax and e-invoice validation. | ACC-PM-002 | Internal |
| 5 | How are shared property costs allocated? | Direct costs first; shared costs require an approved driver, period, and reviewer. | ACC-PM-003 | Internal |
| 6 | What controls apply before a Vietnam e-invoice? | Validate identity, tax code, period, amount, tax, approval, sequence, and correction evidence. | ACC-PM-004 | Internal |
| 7 | How is the maintenance fund reconciled? | Dedicated bank balance to owner receipts and authorized spend; investigate variance and keep operating cash separate. | ACC-PM-005 | Finance Confidential |
| 8 | What evidence is required for vendor payment? | Approved PO/contract, acceptance, valid invoice, and independent approval of exceptions. | ACC-PM-006 | Finance Confidential |
| 9 | What must be tested before a billing release? | Rate, area, concessions, proration, tax, rounding, duplicates, audit fields, and rollback. | PM-PROD-001 | Product Confidential |
| 10 | How are finance pipeline failures handled? | Quarantine, preserve immutable payload/correlation ID, reconcile control totals, and replay after Accounting approval. | PM-ENG-001 | Internal |
| 11 | When is resident arrears handed to Accounting? | After ledger, notices, disputes, and payment-plan validation; Accounting reconciles the control account. | PM-OPS-001 | Internal |
| 12 | What contract evidence must Accounting retain? | Signed agreement, approvals, scope, fee basis, acceptance, amendments, invoices, and retention class. | PM-LEGAL-001 | Internal |
| 13 | How is the property portfolio performing this month? | Accounting sees collections, controllable cost, and arrears follow-up. | PM-DIR-001 | Finance Confidential |

An Executive asking question 13 is grounded instead in Restricted source `PM-EXEC-002`, which adds executive-only acquisition sensitivity and owner-margin forecasts.

## Enforcement

The browser submits only a demo identity ID. The API joins that ID to `tasco_users` or the separately labelled `tasco_demo_personas`; it never accepts browser-supplied role, department, or subsidiary claims. Public_Evaluation always joins to the 32 canonical Users-sheet rows. The workbook’s role/department fields are retained as source snapshots, and 18 role mismatches are visibly labelled “snapshot corrected.”

Department input is normalized against the Departments dimension in English and Vietnamese. Unknown department names throw and fail closed.

SQL applies subsidiary, classification, role, and canonical department predicates before lexical/vector ranking. A Restricted denial returns:

- no source ID, title, classification, content, snippet, citation, or answer payload;
- `authorizedChunks: 0`;
- `restrictedContextSentToModel: 0`;
- an append-only server audit containing the enforcement decision, not protected text.

## Permission cases

Fifteen cases render in Evidence: seven sponsor cases plus eight property-management cases. The focused cases cover own-department Confidential allow, cross-department Confidential deny, Director cross-department deny, Executive cross-department allow, Employee Restricted deny, Executive Restricted allow, and sponsor/property-business-unit isolation.

The release gates are 50/50 Public_Evaluation, 15/15 permission cases, zero unauthorized leaks, and zero Restricted context hits for a non-Executive principal.

## Provenance

- `ai_workspace_dataset_vietnamese_participants.xlsm`: 40 exact Vietnamese documents, 32 canonical identities, eight Departments-sheet rows, and 50 Public_Evaluation rows.
- `ai_workspace_mytasco_api_documentation.pdf`: COP headers/envelope, staff and organization entity shapes, request IDs, and integration conventions mirrored under `/mytasco/v1`.
- Property-management context: 15 clearly labelled demo sources. Official context URLs point to Vietnam Ministry of Finance, Ministry of Construction, and Government legal portals.
- `pnpm context:apify` runs the Apify Website Content Crawler against those official URLs. A real run ID must be supplied as `APIFY_RUN_ID` before the seed marks crawl provenance verified; absent credentials never become a fabricated success claim.
