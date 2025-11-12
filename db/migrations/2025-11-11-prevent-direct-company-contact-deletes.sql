-- Add BEFORE DELETE triggers to prevent deleting companies / contacts in use

-- Company delete guard
CREATE OR REPLACE FUNCTION public.prevent_company_delete_if_in_use()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Check engagement_parties references
  IF EXISTS (
    SELECT 1 FROM public.engagement_parties
    WHERE party_type = 'company' AND party_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete company %, it is linked to engagements (engagement_parties).', OLD.id;
  END IF;

  -- Check engagement_subcontractors references
  IF EXISTS (
    SELECT 1 FROM public.engagement_subcontractors
    WHERE company_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete company %, it is assigned as a subcontractor.', OLD.id;
  END IF;

  RETURN OLD; -- Block delete with exception if in use
END;$$;

DROP TRIGGER IF EXISTS trg_prevent_company_delete ON public.companies;
CREATE TRIGGER trg_prevent_company_delete
BEFORE DELETE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.prevent_company_delete_if_in_use();

-- Contact delete guard
CREATE OR REPLACE FUNCTION public.prevent_contact_delete_if_in_use()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.engagement_parties
    WHERE party_type = 'contact' AND party_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete contact %, it is linked to engagements.', OLD.id;
  END IF;
  RETURN OLD; -- Block delete
END;$$;

DROP TRIGGER IF EXISTS trg_prevent_contact_delete ON public.contacts;
CREATE TRIGGER trg_prevent_contact_delete
BEFORE DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.prevent_contact_delete_if_in_use();
