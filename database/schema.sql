-- =====================================================
-- AI-Powered Business Verification & Workforce Automation
-- PostgreSQL Database Schema
-- =====================================================

-- =====================================
-- BUSINESSES
-- =====================================

CREATE TABLE businesses (
    business_id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    industry VARCHAR(100),
    business_status VARCHAR(50)
        CHECK (business_status IN ('Active', 'Pending', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- BUSINESS VERIFICATION RESULTS
-- =====================================

CREATE TABLE verification_results (
    verification_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,

    website_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,

    confidence_score DECIMAL(5,2),
    verification_status VARCHAR(50),

    notes TEXT,

    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- DOCUMENTS
-- =====================================

CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,

    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,

    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),

    file_path TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    processing_status VARCHAR(50)
        DEFAULT 'Pending',

    processed_at TIMESTAMP
);

-- =====================================
-- OCR EXTRACTION RESULTS
-- =====================================

CREATE TABLE extracted_document_data (
    extraction_id SERIAL PRIMARY KEY,

    document_id INT REFERENCES documents(document_id)
        ON DELETE CASCADE,

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

-- =====================================
-- WORKFLOW AUTOMATION TASKS
-- =====================================

CREATE TABLE workflow_tasks (
    task_id SERIAL PRIMARY KEY,

    business_id INT REFERENCES businesses(business_id)
        ON DELETE CASCADE,

    task_name VARCHAR(255),
    task_description TEXT,

    task_status VARCHAR(50)
        DEFAULT 'Pending',

    assigned_to VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    completed_at TIMESTAMP
);

-- =====================================
-- SYSTEM USERS
-- =====================================

CREATE TABLE system_users (
    user_id SERIAL PRIMARY KEY,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,

    role VARCHAR(100),

    password_hash TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- =====================================
-- DOCUMENT CLASSIFICATIONS
-- =====================================

CREATE TABLE document_classifications (
    classification_id SERIAL PRIMARY KEY,

    document_id INT REFERENCES documents(document_id)
        ON DELETE CASCADE,

    predicted_class VARCHAR(100),

    confidence_score DECIMAL(5,2),

    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- AUDIT LOGS
-- =====================================

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,

    user_id INT REFERENCES system_users(user_id),

    action VARCHAR(255),
    target_table VARCHAR(100),
    target_record_id INT,

    log_details TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

CREATE INDEX idx_business_name
ON businesses(business_name);

CREATE INDEX idx_business_status
ON businesses(business_status);

CREATE INDEX idx_document_type
ON documents(document_type);

CREATE INDEX idx_document_business
ON documents(business_id);

CREATE INDEX idx_task_status
ON workflow_tasks(task_status);

CREATE INDEX idx_verification_business
ON verification_results(business_id);

CREATE INDEX idx_user_email
ON system_users(email);

-- =====================================
-- SAMPLE DOCUMENT TYPES SUPPORTED
-- =====================================
-- Employee Onboarding Forms
-- Employment Verification Letters
-- Business Licenses
-- Compliance Certificates
-- Vendor Registration Forms
-- W-9 Forms
-- Insurance Certificates
-- Invoices
-- Employee Training Records
-- Background Check Reports

-- =====================================
-- SAMPLE BUSINESS STATUS VALUES
-- =====================================
-- Active
-- Pending
-- Inactive
