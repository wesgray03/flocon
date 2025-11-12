# Additional Import Templates

These templates are for additional features and extension tables. Import these AFTER the core data (templates 01-10).

All templates now use sequential UUIDs in the 80000000+ range for easy identification.

## Company Extension Tables

### Vendor Details Template

File: `11-company-vendor-details-template.csv`

```csv
id,company_id,account_number,w9_status,payment_terms,preferred_vendor
vd333333-3333-3333-3333-333333333333,33333333-3333-3333-3333-333333333333,ACCT-QFS-001,received,Net 30,true
```

### Subcontractor Details Template

File: `12-company-subcontractor-details-template.csv`

```csv
id,company_id,insurance_status,insurance_exp_date,license_number,license_state,scope_of_work,compliance_status
sd444444-4444-4444-4444-444444444444,44444444-4444-4444-4444-444444444444,current,2025-12-31,ROC-12345,AZ,Concrete prep and leveling,compliant
sd555555-5555-5555-5555-555555555555,55555555-5555-5555-5555-555555555555,current,2025-06-30,ROC-67890,AZ,Demolition and removal,compliant
```

## Engagement Tasks

File: `13-engagement-tasks-template.csv`

```csv
id,engagement_id,title,description,due_date,status,assigned_to_user_id,created_by_user_id
task1111-1111-1111-1111-111111111111,e1111111-1111-1111-1111-111111111111,Order carpet for offices,Place order with supplier for 2000 sqft carpet,2024-01-20,completed,b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e,a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
task1112-1111-1111-1111-111111111112,e1111111-1111-1111-1111-111111111111,Schedule concrete prep,Coordinate with Elite Concrete for prep work,2024-01-08,completed,c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f,b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e
task1113-1111-1111-1111-111111111113,e1111111-1111-1111-1111-111111111111,Final inspection walkthrough,Walk through with project manager,2024-03-28,pending,b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e,a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
```

## Engagement Comments

File: `14-engagement-comments-template.csv`

```csv
id,engagement_id,user_id,comment_text,created_at
cmt11111-1111-1111-1111-111111111111,e1111111-1111-1111-1111-111111111111,a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d,Customer requested upgrade to premium pad,2024-02-01 10:30:00
cmt11112-1111-1111-1111-111111111112,e1111111-1111-1111-1111-111111111111,b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e,Delay due to weather - rescheduled installation for next week,2024-02-15 14:20:00
cmt22221-2222-2222-2222-222222222221,e2222222-2222-2222-2222-222222222222,a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d,Customer very happy with progress so far,2024-03-05 09:15:00
```

## Schedule of Values

File: `15-engagement-sov-lines-template.csv`

```csv
id,engagement_id,line_number,description,scheduled_value,work_completed,materials_stored,total_completed,percent_complete
sov11111-1111-1111-1111-111111111111,e1111111-1111-1111-1111-111111111111,1,Mobilization and site prep,5000.00,5000.00,0.00,5000.00,100
sov11112-1111-1111-1111-111111111112,e1111111-1111-1111-1111-111111111111,2,Floor prep and leveling,15000.00,15000.00,0.00,15000.00,100
sov11113-1111-1111-1111-111111111113,e1111111-1111-1111-1111-111111111111,3,Carpet installation - offices,45000.00,45000.00,0.00,45000.00,100
sov11114-1111-1111-1111-111111111114,e1111111-1111-1111-1111-111111111111,4,LVT installation - common areas,35000.00,25000.00,0.00,25000.00,71.43
sov11115-1111-1111-1111-111111111115,e1111111-1111-1111-1111-111111111111,5,Baseboards and trim,18000.00,10000.00,0.00,10000.00,55.56
sov11116-1111-1111-1111-111111111116,e1111111-1111-1111-1111-111111111111,6,Final cleanup and punch list,7000.00,0.00,0.00,0.00,0
```

## Notes

- Import these templates AFTER the core tables (01-10)
- Vendor details only for companies with `is_vendor=true`
- Subcontractor details only for companies with `is_subcontractor=true`
- Tasks must reference valid user IDs in `assigned_to_user_id` and `created_by_user_id`
- Comments must reference valid user IDs
- SOV lines should sum to the contract amount (with change orders)
