# Changelog

All notable changes to this project in this session are documented here for continuity between chats.

## 2025-11-11

### Added

- StageBadge component to centralize stage color/label rendering.
- CSV export of Projects list respecting current filters and sort.

### Changed

- Projects index page now uses `useProjectsListCore` with persisted filters/sort via localStorage.
- Extracted `ProjectsTable` (desktop) and integrated `StageBadge` directly (removed inline utilities).
- Financial Overview redesign: merged "Gross Margin" and "Gross Profit" into a single "Profit" section. Consolidated duplicate metrics:
  - Total Profit % (replaces Total GM % and Unadjusted GM %)
  - Projected Profit % (replaces Expected GM % and Projected GP %)
  - Projected Profit ($)
- Root README now summarizes stack, recent changes, and current focus.
- Projects domain README updated with the new Financial Overview structure.
- Billing domain README expanded with current hook contract and component roadmap.

### Fixed

- Variable redeclaration in billing page (`sovTotal`).

### Notes

- Next steps: introduce `useProjectFinancials`, extract `SOVTable` and `PayAppsTable`, add `BillingSummary`, and consider tests for hooks.
