-- AI-Powered Business Verification and Workforce Automation System

CREATE TABLE businesses (
    business_id SERIAL PRIMARY KEY,
    business_name VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE business_addresses (
    address_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States'
);

CREATE TABLE data_sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50),
    source_url TEXT,
    reliability_score DECIMAL(3,2)
);

CREATE TABLE verification_records (
    verification_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    source_id INT REFERENCES data_sources(source_id),
    verified_name VARCHAR(255),
    verified_website VARCHAR(255),
    verified_phone VARCHAR(50),
    verified_address TEXT,
    verification_status VARCHAR(50),
    confidence_score DECIMAL(5,2),
    discrepancies TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    document_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    document_name VARCHAR(255),
    document_type VARCHAR(100),
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE extracted_document_data (
    extraction_id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(document_id) ON DELETE CASCADE,
    extracted_text TEXT,
    extracted_business_name VARCHAR(255),
    extracted_address TEXT,
    extracted_phone VARCHAR(50),
    extracted_date DATE,
    confidence_score DECIMAL(5,2),
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_tasks (
    task_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    task_name VARCHAR(255),
    task_type VARCHAR(100),
    task_status VARCHAR(50) DEFAULT 'Pending',
    assigned_to VARCHAR(100),
    due_date DATE,
    completed_at TIMESTAMP
);

CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(business_id) ON DELETE CASCADE,
    report_title VARCHAR(255),
    report_summary TEXT,
    generated_by VARCHAR(100),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
