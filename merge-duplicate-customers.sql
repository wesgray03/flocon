-- Merge duplicate customers - keep older records, update all references

BEGIN;

-- 1. Merge "DF Chase" into "D.F. Chase, Inc." (older)
UPDATE engagements 
SET customer_id = (SELECT id FROM customers WHERE name = 'D.F. Chase, Inc.')
WHERE customer_id = (SELECT id FROM customers WHERE name = 'DF Chase');

DELETE FROM customers WHERE name = 'DF Chase';

-- 2. Merge "Layton Construction" into "Layton Construction Co" (older)
UPDATE engagements 
SET customer_id = (SELECT id FROM customers WHERE name = 'Layton Construction Co')
WHERE customer_id = (SELECT id FROM customers WHERE name = 'Layton Construction');

DELETE FROM customers WHERE name = 'Layton Construction';

-- 3. Merge "Aagaard-Juergensen" into "Aagaard-Juergensen, LLC" (older)
UPDATE engagements 
SET customer_id = (SELECT id FROM customers WHERE name = 'Aagaard-Juergensen, LLC')
WHERE customer_id = (SELECT id FROM customers WHERE name = 'Aagaard-Juergensen');

DELETE FROM customers WHERE name = 'Aagaard-Juergensen';

-- 4. Merge "Beech Construction" into "Beech Construction Services, Inc." (older)
UPDATE engagements 
SET customer_id = (SELECT id FROM customers WHERE name = 'Beech Construction Services, Inc.')
WHERE customer_id = (SELECT id FROM customers WHERE name = 'Beech Construction');

DELETE FROM customers WHERE name = 'Beech Construction';

COMMIT;

-- Verify no duplicates remain
SELECT name, party_type, created_at
FROM customers
WHERE name ILIKE '%chase%'
   OR name ILIKE '%layton%'
   OR name ILIKE '%aagaard%'
   OR name ILIKE '%beech%'
ORDER BY name;

-- Verify all prospects have customer_id
SELECT COUNT(*) as prospects_without_customer
FROM engagements
WHERE type = 'prospect' AND customer_id IS NULL;
