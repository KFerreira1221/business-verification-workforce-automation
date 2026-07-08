-- =====================================================
-- AI-Powered Business Verification & Workforce Automation
-- PostgreSQL Database Schema
-- =====================================================

DROP VIEW IF EXISTS business_verification_summary;
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS document_classifications CASCADE;
DROP TABLE IF EXISTS workflow_tasks CASCADE;
DROP TABLE IF EXISTS extracted_document_data CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS verification_results CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

CREATE TABLE businesses (
    business_id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    industry VARCHAR(100),
    business_status VARCHAR(50) DEFAULT 'Pending'
        CHECK (business_status IN ('Active', 'Pending', 'Inactive', 'Imported', 'Imported From Document')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_results (
    verification_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    website_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    confidence_score DECIMAL(5,2),
    verification_status VARCHAR(50),
    discrepancies TEXT,
    notes TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'Pending',
    processed_at TIMESTAMP
);

CREATE TABLE extracted_document_data (
    extraction_id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(document_id) ON DELETE CASCADE,
    extracted_text TEXT,
    extracted_business_name VARCHAR(255),
    extracted_employee_name VARCHAR(255),
    extracted_vendor_name VARCHAR(255),
    extracted_address TEXT,
    extracted_phone VARCHAR(50),
    extracted_email VARCHAR(255),
    extracted_license_number VARCHAR(100),
    extracted_invoice_number VARCHAR(100),
    extracted_amount DECIMAL(12,2),
    extracted_tin VARCHAR(50),
    extracted_document_status VARCHAR(100),
    extracted_training_name VARCHAR(255),
    extracted_coverage_type VARCHAR(255),
    extracted_date DATE,
    confidence_score DECIMAL(5,2),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_tasks (
    task_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    task_name VARCHAR(255),
    task_description TEXT,
    task_status VARCHAR(50) DEFAULT 'Pending',
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE system_users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(100),
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE document_classifications (
    classification_id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(document_id) ON DELETE CASCADE,
    predicted_class VARCHAR(100),
    confidence_score DECIMAL(5,2),
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES system_users(user_id),
    action VARCHAR(255),
    target_table VARCHAR(100),
    target_record_id INT,
    log_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    action_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW business_verification_summary AS
SELECT 
    b.business_id,
    b.business_name,
    b.website,
    b.phone_number,
    b.email,
    b.industry,
    b.business_status,
    vr.verification_status,
    vr.confidence_score,
    vr.discrepancies,
    vr.notes,
    vr.verified_at
FROM businesses b
LEFT JOIN verification_results vr
ON b.business_id = vr.business_id;

CREATE INDEX idx_business_name ON businesses(business_name);
CREATE INDEX idx_business_status ON businesses(business_status);
CREATE INDEX idx_document_type ON documents(document_type);
CREATE INDEX idx_document_business ON documents(business_id);
CREATE INDEX idx_task_status ON workflow_tasks(task_status);
CREATE INDEX idx_verification_business ON verification_results(business_id);
CREATE INDEX idx_verification_status ON verification_results(verification_status);
CREATE INDEX idx_user_email ON system_users(email);
CREATE INDEX idx_documents_business_id ON documents(business_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();