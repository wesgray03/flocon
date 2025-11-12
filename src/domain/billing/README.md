# Domain: Billing

This directory hosts the central hook and future domain logic for Billing (Pay Applications and Schedule of Values).

## Files

- `useBillingCore.ts`
  - Loads: project header details, pay applications, Schedule of Values (SOV) lines for a given engagement (project) id.
  - Computes aggregates: `sovTotal` (sum of SOV line contract values), `totalBilled` (sum of approved pay app billed amounts).
  - Exposes: `project`, `payApps`, `sovLines`, `sovTotal`, `totalBilled`, `loading` plus setters for in-page mutations.
  - Contract
    - Input: `projectId?: string`
    - Output: normalized entities + derived totals for presentational components.
  - Error modes: returns empty arrays and zero totals if projectId is undefined or queries fail (future: attach `error` state).

## Why this exists

- Removes ad-hoc data loading from `pages/billings/[projectId].tsx` and centralizes it for reuse.
- Enables component extraction by providing stable props (e.g., a future `SOVTable` or `PayAppsTable` can rely on this contract).

## Component Extraction Roadmap

Target directory: `src/components/billing/`

1. `SOVTable` (High priority)

- Inputs: `sovLines`, `sovTotal`.
- Features: line display, subtotal footer, future inline edit hooks.

2. `PayAppsTable`

- Inputs: `payApps`, `totalBilled`.
- Features: status badge, billed-to-date footer row.

3. `BillingSummary` (New)

- Inputs: `sovTotal`, `totalBilled`.
- Purpose: Quick top-line summary (contract vs billed vs remaining) parallel to Project Financial Overview.

4. `PayAppModal`
5. `ContinuationSheetModal`
6. `G703SModal`

Sequence: 1 & 2 (low risk, pure presentation) → 3 (aggregated view) → modals (higher complexity).

## Notes

- Formatting should flow through `src/lib/format.ts` (`money`, `dateStr`).
- Supabase writes (insert/update/delete) remain in the page until patterns stabilize; then extract to `lib/billingMutations.ts`.
- Performance: if pay apps + SOV queries cause waterfall latency, batch in a single RPC or use `select` with embedded relations.
- Future hook: `useBillingFinancials` — to compute retainage held, pending retains release, percent complete revenue/cost alignment with Financial Overview Profit section.

## Current Status Snapshot (2025-11-11)

- Central data hook (`useBillingCore.ts`) stable; provides totals consumed by billing page.
- No extracted billing components yet (pending).
- Profit section in `FinancialOverview` now expects eventual alignment metrics (Projected Profit %, Projected Profit $) — billing domain will supply these once cost + billings data unify.

## Next Steps (Concrete)

1. Extract `SOVTable` using existing hook data (no API changes).
2. Extract `PayAppsTable`; add simple status column (Approved / Draft / Submitted).
3. Add `BillingSummary` top block with three stats: Contract (sovTotal), Billed (totalBilled), Remaining (sovTotal - totalBilled).
4. Introduce error state in `useBillingCore` (string or structured) and surface in page.
5. Add unit tests for hook aggregations (stub SOV/payApps arrays).

---

Last updated: 2025-11-11 (post Financial Overview Profit merge)
