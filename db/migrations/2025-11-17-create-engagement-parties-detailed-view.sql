-- Create engagement_parties_detailed view (if not exists)
-- This view resolves party_name from the polymorphic engagement_parties relationship

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

-- Grant access to authenticated users
GRANT SELECT ON engagement_parties_detailed TO authenticated;
