-- Create essential views for production
-- Run this in Supabase SQL Editor for production database

-- 1. Create engagement_parties_detailed view
CREATE OR REPLACE VIEW engagement_parties_detailed AS
SELECT 
  ep.id,
  ep.engagement_id,
  ep.party_type,
  ep.party_id,
  ep.role,
  ep.is_primary,
  ep.notes,
  ep.created_at,
  ep.updated_at,
  e.name as engagement_name,
  e.type as engagement_type,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.name
    WHEN ep.party_type = 'company' THEN co.name
  END as party_name,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.email
    WHEN ep.party_type = 'company' THEN co.email
  END as party_email,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.phone
    WHEN ep.party_type = 'company' THEN co.phone
  END as party_phone,
  CASE 
    WHEN ep.party_type = 'contact' THEN c.contact_type
    ELSE NULL
  END as contact_type,
  CASE 
    WHEN ep.party_type = 'company' THEN co.company_type
    ELSE NULL
  END as company_type,
  CASE
    WHEN ep.party_type = 'contact' THEN c.company_id
    ELSE NULL
  END as contact_company_id,
  CASE
    WHEN ep.party_type = 'contact' AND c.company_id IS NOT NULL THEN parent_co.name
    ELSE NULL
  END as contact_company_name
FROM engagement_parties ep
LEFT JOIN engagements e ON ep.engagement_id = e.id
LEFT JOIN contacts c ON ep.party_id = c.id AND ep.party_type = 'contact'
LEFT JOIN companies co ON ep.party_id = co.id AND ep.party_type = 'company'
LEFT JOIN companies parent_co ON c.company_id = parent_co.id;

COMMENT ON VIEW engagement_parties_detailed IS 
  'Detailed view of engagement parties with resolved contact/company information';

-- 2. Create engagement_user_roles_detailed view
CREATE OR REPLACE VIEW engagement_user_roles_detailed AS
SELECT 
  eur.id,
  eur.engagement_id,
  eur.user_id,
  eur.role,
  eur.is_primary,
  eur.created_at,
  eur.updated_at,
  e.name as engagement_name,
  e.type as engagement_type,
  u.name as user_name,
  u.email as user_email,
  u.user_type
FROM engagement_user_roles eur
LEFT JOIN engagements e ON eur.engagement_id = e.id
LEFT JOIN users u ON eur.user_id = u.id;

COMMENT ON VIEW engagement_user_roles_detailed IS 
  'Detailed view of engagement user roles with resolved user information';

-- 3. Create engagement_dashboard view (simplified for production)
CREATE OR REPLACE VIEW engagement_dashboard AS
SELECT 
  e.id,
  e.name,
  e.project_number,
  e.type,
  e.stage_id,
  s.name as stage_name,
  s.order as stage_order,
  e.contract_amount,
  e.bid_amount,
  e.start_date,
  e.end_date,
  e.created_at,
  e.updated_at,
  e.sharepoint_folder,
  e.address,
  e.city,
  e.state,
  
  -- Customer info from engagement_parties
  customer.party_name as customer_name,
  customer.party_id as customer_id,
  
  -- Project manager from engagement_parties
  pm.party_name as project_manager_name,
  pm.party_id as project_manager_id,
  
  -- Owner from engagement_user_roles
  owner_role.user_name as owner_name,
  owner_role.user_id as owner_id,
  
  -- Foreman from engagement_user_roles
  foreman_role.user_name as foreman_name,
  foreman_role.user_id as foreman_id,
  
  -- Superintendent from engagement_parties
  super.party_name as superintendent_name,
  super.party_id as superintendent_id

FROM engagements e
LEFT JOIN stages s ON e.stage_id = s.id
LEFT JOIN LATERAL (
  SELECT party_name, party_id
  FROM engagement_parties_detailed epd
  WHERE epd.engagement_id = e.id 
    AND epd.role = 'customer' 
    AND epd.is_primary = true
  LIMIT 1
) customer ON true
LEFT JOIN LATERAL (
  SELECT party_name, party_id
  FROM engagement_parties_detailed epd
  WHERE epd.engagement_id = e.id 
    AND epd.role = 'project_manager' 
    AND epd.is_primary = true
  LIMIT 1
) pm ON true
LEFT JOIN LATERAL (
  SELECT user_name, user_id
  FROM engagement_user_roles_detailed eurd
  WHERE eurd.engagement_id = e.id 
    AND eurd.role = 'owner' 
    AND eurd.is_primary = true
  LIMIT 1
) owner_role ON true
LEFT JOIN LATERAL (
  SELECT user_name, user_id
  FROM engagement_user_roles_detailed eurd
  WHERE eurd.engagement_id = e.id 
    AND eurd.role = 'foreman' 
    AND eurd.is_primary = true
  LIMIT 1
) foreman_role ON true
LEFT JOIN LATERAL (
  SELECT party_name, party_id
  FROM engagement_parties_detailed epd
  WHERE epd.engagement_id = e.id 
    AND epd.role = 'superintendent' 
    AND epd.is_primary = true
  LIMIT 1
) super ON true;

COMMENT ON VIEW engagement_dashboard IS 
  'Dashboard view with flattened engagement info and primary contacts/roles';

-- 4. Create helper function to get primary party
CREATE OR REPLACE FUNCTION get_engagement_primary_party(
  p_engagement_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  party_id UUID,
  party_type TEXT,
  party_name TEXT,
  party_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.party_id,
    ep.party_type,
    CASE 
      WHEN ep.party_type = 'contact' THEN c.name
      WHEN ep.party_type = 'company' THEN co.name
      ELSE NULL
    END as party_name,
    CASE 
      WHEN ep.party_type = 'contact' THEN c.email
      WHEN ep.party_type = 'company' THEN co.email
      ELSE NULL
    END as party_email
  FROM engagement_parties ep
  LEFT JOIN contacts c ON ep.party_id = c.id AND ep.party_type = 'contact'
  LEFT JOIN companies co ON ep.party_id = co.id AND ep.party_type = 'company'
  WHERE ep.engagement_id = p_engagement_id
    AND ep.role = p_role
    AND ep.is_primary = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Production views and functions created successfully!' as status;
