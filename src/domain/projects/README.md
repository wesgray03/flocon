# Domain: Projects

This directory encapsulates the domain logic and types for Projects — both the detail page and the projects list.

## Structure

- `types.ts` — Canonical TypeScript interfaces for project-related entities (`Project`, `Stage`, `User`, `ProjectComment`). This decouples page/components from raw Supabase row shapes and allows incremental evolution.
- `useProjectCore.ts` — Central hook that loads and normalizes data needed by the project detail page (session/user, project, stages, comments, next/prev stages). All data loading, transformation, and lightweight orchestration are consolidated here so the page and presentational components remain declarative.
- `useProjectsListCore.ts` — Central hook for the projects index page. Loads rows from the `projects_v` thin view, loads parties and user roles separately via helper functions (`getPrimaryPartiesForEngagements`, `getPrimaryUserRolesForEngagements`), computes financial data from `engagement_change_orders` and `engagement_pay_apps`, resolves canonical stage names from `stages` table, and exposes filtering/sorting state plus derived suggestion lists.

## Responsibilities

| Concern                              | Location                                          | Notes                                                                   |
| ------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Raw data fetching (Supabase)         | `useProjectCore.ts`                               | Batched and memoized inside effects. Exposes shaped data + setters.     |
| Derived navigation (next/prev stage) | `useProjectCore.ts`                               | Computed whenever stage list or current project stage changes.          |
| UI composition                       | Page + `src/components/project/*`                 | Components consume normalized domain objects.                           |
| Projects list filtering/sorting      | `useProjectsListCore.ts`                          | Exposes `filters`, `setFilters`, `handleSort`, `filteredAndSortedRows`. |
| Formatting (currency/date)           | `src/lib/format.ts`                               | Shared, side-effect free helpers.                                       |
| Role/party junction sync             | Page update handlers + `lib/engagementParties.ts` | Restricted to edit/save flows; not mixed into rendering.                |

## Component Extraction Status

| Component                       | Purpose                                      | Status                                            |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `ProjectInfoCard`               | Left sidebar project info & edit form        | Extracted ✅                                      |
| `FinancialOverview`             | Consolidated desktop/mobile financial tables | Extracted ✅                                      |
| `SubcontractorsSection`         | List & manage subcontractors                 | Already modular                                   |
| `CommentsSection`               | Comment CRUD                                 | Already modular                                   |
| `ProjectStatusBlock`            | Stage progress & advance controls            | Already modular                                   |
| `SOVSection` / `PayAppsSection` | Billing sub-modules                          | Already modular (large; future refactors planned) |

## Refactor Guidelines

1. Keep data loading side-effects confined to domain hooks; never bury Supabase queries in presentational components.
2. Prefer narrow prop contracts; components should accept explicit primitives instead of entire `Project` where possible (e.g., pass `contract_amount` rather than whole project when only that is needed).
3. Avoid duplicating markup between desktop/mobile — introduce a `variant` prop (as done in `FinancialOverview`).
4. Defer expensive aggregations (billings, cash flow) to future dedicated hooks (e.g., `useProjectFinancials`) to keep `useProjectCore` lean.
5. When adding new domain concerns (tasks, risk register), create a sibling hook (`useProjectTasks`) and combine at the page layer rather than expanding the core hook indefinitely.

## Planned Next Steps

- Introduce `useProjectFinancials` for dynamic metrics (billings, retainage, costs, margins) once source tables and queries are finalized.
- Reduce the size of billing pages (`billings/[projectId].tsx`) by extracting Pay Application and SOV summary subcomponents.
- Normalize prospects domain similarly (create `src/domain/prospects/`).

### Projects List Page Follow-ups

- Extract presentational components from `pages/projects/index.tsx`:
  - `ProjectsFilters` — wraps filter row and mobile filters modal, wired to `useProjectsListCore`. (Planned)
  - `ProjectsTable` — desktop table rendering of `filteredAndSortedRows` with sortable headers. (Extracted ✅ at src/components/projects/ProjectsTable.tsx)
  - `ProjectsCards` — mobile card layout. (Planned)
  - Keep creation/editing modal in the page for now; move to a component once the contract stabilizes. (Current)

## Extensibility Notes

- Types purposely omit some transitional columns (e.g., legacy `qbid` handling); add optional fields with clear comments rather than overloading existing properties.
- Prefer utility functions in `src/lib` for pure transforms (`mapEngagementRowToProject`) if transformation logic grows.

## Testing Hints

- Domain hooks can be tested by mocking Supabase client (injectable pattern) — consider refactoring `supabaseClient` import behind a factory if test coverage becomes a priority.
- Snapshot test extracted presentational components (`ProjectInfoCard`, `FinancialOverview`) against stubbed props to prevent regressions when adjusting styles.

---

### Financial Overview structure (current)

Sections shown in the component:

- Revenue — contract amount, change orders, billings/retainage to date, remaining, % complete.
- Cost — budgets, cost to date, remaining, % complete.
- Cash Flow — cash in/out, net flow, position.
- Profit — merged former "Gross Margin" and "Gross Profit" into a single section. Duplicated metrics consolidated:
  - Keep Total Profit % (replaces both Total GM % and Unadjusted GM %).
  - Keep Projected Profit % (replaces both Expected GM % and Projected GP %).
  - Include Projected Profit ($) amount.

Last updated: 2025-11-11
