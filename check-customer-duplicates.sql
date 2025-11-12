-- Check for potential duplicate customers with name variations

-- Look for customers that might be duplicates
SELECT name, party_type, created_at
FROM customers
WHERE name ILIKE '%chase%'
   OR name ILIKE '%layton%'
   OR name ILIKE '%dunn%'
   OR name ILIKE '%dpr%'
   OR name ILIKE '%aagaard%'
   OR name ILIKE '%axiom%'
   OR name ILIKE '%beech%'
   OR name ILIKE '%choate%'
ORDER BY name;

-- Check for prospects with null customer_id (couldn't find match)
SELECT name, customer_id
FROM engagements
WHERE type = 'prospect' 
  AND customer_id IS NULL;
