ALTER TABLE public_document_acceptances
  DROP CONSTRAINT IF EXISTS public_document_acceptances_source_check;

ALTER TABLE public_document_acceptances
  ADD CONSTRAINT public_document_acceptances_source_check
  CHECK (acceptance_source IN ('legacy', 'document_acceptance_page', 'invite_activation'));
