INSERT INTO businesses (business_name, website, phone_number, email, industry, business_status)
VALUES
('Sample Company One', 'https://example.com', '555-111-2222', 'info@example.com', 'Technology', 'Verified'),
('Sample Company Two', 'https://example.org', '555-333-4444', 'contact@example.org', 'Healthcare', 'Unverified')
ON CONFLICT DO NOTHING;
