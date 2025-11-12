# Flocon Data Model Guide

This guide documents the source of truth for key relationships in the database so we don't reintroduce deprecated columns or fetch from the wrong table/view again.

## Single Source of Truth (SSOT)

### Engagement Contact/Company Actors

**SSOT**: `engagement_parties` (junction), surfaced via `engagement_parties_detailed`.

- Each actor is a role-based "primary party" per engagement
- Parties can be:
  - `party_type = 'company'` → `party_id` references `companies.id`
  - `party_type = 'contact'` → `party_id` references `contacts.id`
- Examples: customer, architect, project manager, superintendent

### Engagement User Roles

**SSOT**: `engagement_user_roles` (junction), surfaced via `engagement_user_roles_detailed`.

- Each user role assignment links an engagement to a user with a specific role
- All assignments use: `user_id` references `users.id`
- Examples: project owner, foreman, estimator, prospect owner

### Dashboard Display

**SSOT**: `project_dashboard` view derives human-readable names from:

- `engagement_parties_detailed` for customer, project manager, architect, superintendent
- `engagement_user_roles_detailed` for project owner and foreman
- Aggregates billing from `engagement_id` foreign keys

### Billing

**SSOT**: `engagements.contract_amount`, `change_orders`, `pay_apps` with foreign key `engagement_id`.

## Roles Catalog (allowed values)

### engagement_parties.role (Contact/Company actors)

- `customer`
- `architect`
- `general_contractor`
- `project_manager`
- `superintendent`
- `estimator`
- `owner`
- `sales_contact`
- `subcontractor`
- `other`

### engagement_user_roles.role (User assignments)

- `sales_lead` (renamed from 'prospect_owner')
- `project_lead` (renamed from 'project_owner')
- `foreman`
- `superintendent`
- `estimator`
- `project_admin`
- `observer`

## Primary Role Enforcement

- **engagement_parties**: Exactly one primary party per role per engagement
  - Enforced with partial unique index: `(engagement_id, role) WHERE is_primary = true`
- **engagement_user_roles**: Exactly one primary user per role per engagement
  - Enforced with partial unique index: `(engagement_id, role) WHERE is_primary = true`

## Deprecated Columns

These columns must NOT be written to. They are kept as NULL-only placeholders temporarily.

- **`engagements.superintendent_id`**: Use `engagement_parties` with `role = 'superintendent'`. Enforced NULL-only.
- **`engagements.user_id`**: Use `engagement_user_roles` with `role = 'project_lead'`. Enforced NULL-only.
- **`engagements.foreman_id`**: Use `engagement_user_roles` with `role = 'foreman'`. Enforced NULL-only.

## View Contracts

### engagement_dashboard (renamed from project_dashboard) must:

- Read superintendent from `engagement_user_roles` (`role = 'superintendent'`, `is_primary = true`)
- Read project lead from `engagement_user_roles` (`role = 'project_lead'`, `is_primary = true`)
- Read foreman from `engagement_user_roles` (`role = 'foreman'`, `is_primary = true`)
- Compute billing columns using `engagement_id` joins: `contract_amt`, `co_amt`, `total_amt`, `billed_amt`, `balance`

## App Write-Path Contract

When saving edits from the UI:

- Use `setPrimaryParty({ engagementId, role, partyType, partyId })` for all contact/company-based roles
- Use `setPrimaryUserRole({ engagementId, role, userId })` for all user-based roles
- Do NOT write to any deprecated columns in `engagements`

## Guardrails

### 1. Database-level checks

- CHECK constraints keep deprecated columns NULL: `superintendent_id`, `user_id`, `foreman_id`
- Views source all roles from junction tables, not FK columns
- Unique constraints prevent duplicate primary role assignments

### 2. Automated checks (local/CI)

Run `npm run check:schema` to verify:

- No non-null values in deprecated columns
- All views source from junction tables
- Junction tables have proper primary role assignments

### 3. Code review checklist

- Any new role should be modeled through `engagement_parties` or `engagement_user_roles`
- Views should read names from detailed views
- Migrations must update CHECK constraints on `role` columns
- UI code should use helper functions (`setPrimaryParty`, `setPrimaryUserRole`)

## Migration Playbook

### Adding a new party role (contact/company)

1. Update `engagement_parties.role` CHECK constraint to include the new role
2. Optionally backfill from legacy columns (if any) into `engagement_parties`
3. Update views (`project_dashboard`, etc.) to read the new role from `engagement_parties_detailed`
4. Update application write-path to call `setPrimaryParty` for that role
5. Extend `check-schema-guards.js` to assert the new role where appropriate

### Adding a new user role

1. Update `engagement_user_roles.role` CHECK constraint to include the new role
2. Optionally backfill from legacy columns (if any) into `engagement_user_roles`
3. Update views to read the new role from `engagement_user_roles_detailed`
4. Update application write-path to call `setPrimaryUserRole` for that role
5. Extend schema guards to validate the new role

## Helper Functions

### engagementParties.ts

- `setPrimaryParty({ engagementId, role, partyType, partyId })` - Set/update primary party for a role
- `getPrimaryPartiesForEngagements(engagementIds, roles)` - Batch fetch primary parties

### engagementUserRoles.ts

- `setPrimaryUserRole({ engagementId, role, userId })` - Set/update primary user for a role
- `getPrimaryUserRolesForEngagements(engagementIds, roles)` - Batch fetch primary user roles
- `syncCoreUserRoles({ engagementId, projectOwnerId, foremanId })` - Convenience for common updates

## FAQ

**Why use junction tables instead of FK columns?**

- Supports multiple actors per engagement
- Flexible roles without schema changes
- Unified read path
- Prevents proliferation of FK columns in `engagements`

**Can we keep the legacy columns?**

- Temporarily, as NULL-only placeholders to avoid breaking old SQL
- Guard migrations block writes and document the deprecation path
- Will be dropped in future migrations after full transition

**What if UI values aren't updating?**

- Ensure write-path is calling `setPrimaryParty` or `setPrimaryUserRole`
- Verify contacts/companies/users exist for the selected names
- Check that views are refreshed and source from junction tables

**When should I use engagement_parties vs engagement_user_roles?**

- **engagement_parties**: For external actors (customer, architect, superintendent, etc.)
- **engagement_user_roles**: For internal team members (project owner, foreman, estimator, etc.)

---

Last updated: 2025-11-10
