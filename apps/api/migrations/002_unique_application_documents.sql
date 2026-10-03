CREATE UNIQUE INDEX IF NOT EXISTS one_required_document_per_application
ON documents(application_id,kind)
WHERE kind IN ('pan_card','aadhaar_card','identity_document');
