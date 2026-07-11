# Demo and access-control evidence

## Demo thesis

**Who:** a Tasco employee in Accounting within automotive distribution. **Goal:** get an accurate, permission-safe answer fast. **Proof:** the same question returns correctly scoped depth by role, a Restricted source is provably invisible, and each server-resolved identity remembers its own questions.

## Grounded automotive-distribution examples

The app renders these examples from `GET /api/v1/workspace/examples`; they are not README-only claims.

| # | Question | Grounded answer (summary) | Source | Scope |
| --- | --- | --- | --- | --- |
| 1 | Who owns the automotive distribution operating model? | Distribution Operations owns the dealer model; Accounting owns vehicle revenue, inventory, incentives, close, and reconciliation. | AUTO-COMP-001 | Internal |
| 2 | What should a new automotive distribution accountant complete in week one? | DMS/ERP access, chart mapping, dealer assignment, segregation-of-duties review, VIN training, and a close rehearsal. | AUTO-HR-001 | Internal |
| 3 | What is the dealer network month-end close sequence? | Freeze interfaces, reconcile bank/AR, match VINs, post approved incentives and accruals, review margin, and lock. | ACC-AUTO-001 | Internal |
| 4 | When can revenue for a vehicle sale be recorded? | After contract, payment or credit approval, VIN allocation, handover evidence, and invoice data agree. | ACC-AUTO-002 | Internal |
| 5 | How is landed cost allocated to each vehicle? | Assign purchase price and attributable freight/import/preparation cost to the VIN using an approved basis. | ACC-AUTO-003 | Internal |
| 6 | What controls apply before a vehicle-sales e-invoice? | Validate customer, tax code, contract, VIN, amount, tax, approval, sequence, and correction evidence. | ACC-AUTO-004 | Internal |
| 7 | How is vehicle inventory reconciled? | Reconcile physical VINs to the DMS subledger and GL by location and status; investigate every unmatched VIN. | ACC-AUTO-005 | Finance Confidential |
| 8 | What evidence is required before paying a dealer incentive? | Approved program, eligible VIN sales, delivery evidence, dealer claim, and Accounting calculation. | ACC-AUTO-006 | Finance Confidential |
| 9 | What must be tested before a dealer pricing release? | Model/trim mapping, price, options, discount authority, tax, incentives, dates, duplicates, audit fields, and rollback. | AUTO-PROD-001 | Product Confidential |
| 10 | How are dealer finance pipeline failures handled? | Quarantine, preserve payload/VIN/correlation ID, reconcile totals, and replay after Accounting approval. | AUTO-ENG-001 | Internal |
| 11 | When is a dealer receivable handed to Accounting? | After contract, VIN, delivery, deposit, financing, ledger, dispute, and payment-plan validation. | AUTO-OPS-001 | Internal |
| 12 | What vehicle-sales contract evidence must Accounting retain? | Signed agreement, approvals, VIN/specification, price authority, acceptance, handover, amendments, and invoice. | AUTO-LEGAL-001 | Internal |
| 13 | How is the automotive distribution network performing this month? | Accounting sees 1,240 deliveries, 96% collections, 8.4% gross margin, and three dealerships requiring receivables follow-up. | AUTO-DIR-001 | Finance Confidential |

An Executive asking question 13 is grounded instead in Restricted source `AUTO-EXEC-002`, which adds OEM bonus forecasts, dealer profitability, and acquisition sensitivity.

## Enforcement

The browser submits only a demo identity ID. The API joins that ID to `tasco_users` or the separately labelled `tasco_demo_personas`; it never accepts browser-supplied role, department, or subsidiary claims. Public_Evaluation always joins to the 32 canonical Users-sheet rows. The workbook’s role/department fields are retained as source snapshots, and 18 role mismatches are visibly labelled “snapshot corrected.”

Department input is normalized against the Departments dimension in English and Vietnamese. Unknown department names throw and fail closed.

SQL applies subsidiary, classification, role, and canonical department predicates before lexical/vector ranking. A Restricted denial returns:

- no source ID, title, classification, content, snippet, citation, or answer payload;
- `authorizedChunks: 0`;
- `restrictedContextSentToModel: 0`;
- an append-only server audit containing the enforcement decision, not protected text.

## Permission cases

Fifteen cases render in Evidence: seven sponsor cases plus eight automotive-distribution cases. The focused cases cover own-department Confidential allow, cross-department Confidential deny, Director cross-department deny, Executive cross-department allow, Employee Restricted deny, Executive Restricted allow, and sponsor/automotive-business-unit isolation.

The release gates are 50/50 Public_Evaluation, 15/15 permission cases, zero unauthorized leaks, and zero Restricted context hits for a non-Executive principal.

## Provenance

- `ai_workspace_dataset_vietnamese_participants.xlsm`: 40 exact Vietnamese documents, 32 canonical identities, eight Departments-sheet rows, and 50 Public_Evaluation rows.
- `ai_workspace_mytasco_api_documentation.pdf`: COP headers/envelope, staff and organization entity shapes, request IDs, and integration conventions mirrored under `/mytasco/v1`.
- Automotive-distribution context: 15 clearly labelled demo sources. Official context URLs point to Vietnam Ministry of Finance and the Government legal portal for accounting and e-invoice controls.
- `pnpm context:apify` runs the Apify Website Content Crawler against those official URLs. A real run ID must be supplied as `APIFY_RUN_ID` before the seed marks crawl provenance verified; absent credentials never become a fabricated success claim.
