-- ==========================================
-- Seed Data
-- AI-Powered Business Verification System
-- ==========================================

-- Businesses
INSERT INTO businesses (
    business_name,
    website,
    phone_number,
    email,
    industry,
    business_status
)
VALUES
('OpenAI', 'https://openai.com', '555-1111', 'contact@openai.com', 'Artificial Intelligence', 'Active'),
('Microsoft', 'https://microsoft.com', '555-2222', 'contact@microsoft.com', 'Technology', 'Verified'),
('Google', 'https://google.com', '555-3333', 'contact@google.com', 'Technology', 'Verified'),
('Amazon', 'https://amazon.com', '555-4444', 'contact@amazon.com', 'E-Commerce', 'Pending'),
('Example Health Services', 'https://examplehealth.com', '555-5555', 'info@examplehealth.com', 'Healthcare', 'Pending');

-- Addresses
INSERT INTO business_addresses (
    business_id,
    street_address,
    city,
    state,
    zip_code
)
VALUES
(1,'3180 18th Street','San Francisco','CA','94110'),
(2,'1 Microsoft Way','Redmond','WA','98052'),
(3,'1600 Amphitheatre Parkway','Mountain View','CA','94043'),
(4,'410 Terry Ave N','Seattle','WA','98109'),
(5,'100 Main Street','Miami','FL','33101');

-- Data Sources
INSERT INTO data_sources (
    source_name,
    source_type,
    source_url,
    reliability_score
)
VALUES
('Google Business','Directory','https://business.google.com',0.98),
('LinkedIn','Company Profile','https://linkedin.com',0.95),
('OpenCorporates','Registry','https://opencorporates.com',0.97);

-- Verification Records
INSERT INTO verification_records (
    business_id,
    source_id,
    verified_name,
    verified_website,
    verified_phone,
    verified_address,
    verification_status,
    confidence_score,
    discrepancies
)
VALUES
(1,1,'OpenAI','https://openai.com','555-1111','San Francisco, CA','Verified',98.8,NULL),
(2,2,'Microsoft','https://microsoft.com','555-2222','Redmond, WA','Verified',99.1,NULL),
(5,3,'Example Health Services','https://examplehealth.com','555-5555','Miami, FL','Pending',77.5,'Address needs review');

-- Documents
INSERT INTO documents (
    business_id,
    document_name,
    document_type,
    file_path
)
VALUES
(1,'BusinessLicense.pdf','License','uploads/business_license.pdf'),
(5,'Registration.pdf','Registration','uploads/registration.pdf');

-- OCR Extraction
INSERT INTO extracted_document_data (
    document_id,
    extracted_text,
    extracted_business_name,
    extracted_address,
    extracted_phone,
    extracted_date,
    confidence_score
)
VALUES
(
1,
'OpenAI LLC Business License',
'OpenAI',
'3180 18th Street, San Francisco',
'555-1111',
'2025-01-15',
98.9
),
(
2,
'Example Health Registration',
'Example Health Services',
'100 Main Street, Miami',
'555-5555',
'2025-03-10',
94.4
);

-- Workflow Tasks
INSERT INTO workflow_tasks (
    business_id,
    task_name,
    task_type,
    task_status,
    assigned_to,
    due_date
)
VALUES
(
5,
'Verify Address',
'Verification',
'Pending',
'Kevin Ferreira',
CURRENT_DATE + INTERVAL '7 days'
),
(
1,
'Review OCR Extraction',
'OCR',
'Completed',
'Kevin Ferreira',
CURRENT_DATE
);

-- Reports
INSERT INTO reports (
    business_id,
    report_title,
    report_summary,
    generated_by
)
VALUES
(
1,
'Business Verification Report',
'Business successfully verified across multiple sources.',
'AI Verification Engine'
),
(
5,
'Pending Verification Report',
'Business requires manual review due to address discrepancy.',
'AI Verification Engine'
);

-- Activity Logs
INSERT INTO activity_logs (
    action_type,
    description,
    related_business_id,
    created_by
)
VALUES
('CREATE', 'Business record created for OpenAI.', 1, 'Kevin Ferreira'),
('VERIFY', 'Business verification completed for Microsoft.', 2, 'AI Verification Engine'),
('UPLOAD', 'Business license document uploaded for OpenAI.', 1, 'Kevin Ferreira'),
('REPORT', 'Verification report generated for Example Health Services.', 5, 'AI Verification Engine'),
('REVIEW', 'Address discrepancy flagged for manual review.', 5, 'AI Verification Engine');