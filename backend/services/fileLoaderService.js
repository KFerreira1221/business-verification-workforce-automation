const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pool = require("./db");

const INPUT_FOLDER = path.join(
  __dirname,
  "../data/input"
);

// =====================================================
// FILE CATEGORIES
// =====================================================

function getCategory(fileName) {
  const name = String(fileName || "").toLowerCase();

  // CSV and XLSX files remain visible in the input-file
  // list, but they will not be imported into PostgreSQL.
  if (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx")
  ) {
    return "business_dataset_disabled";
  }

  if (
    name.includes("license") ||
    name.includes("vendor") ||
    name.includes("insurance") ||
    name.includes("invoice") ||
    name.includes("w9")
  ) {
    return "business_document";
  }

  if (
    name.includes("employee") ||
    name.includes("background") ||
    name.includes("training") ||
    name.includes("employment") ||
    name.includes("compliance")
  ) {
    return "employee_document";
  }

  return "unknown";
}

// =====================================================
// LIST INPUT FILES
// =====================================================

async function listInputFiles() {
  if (!fs.existsSync(INPUT_FOLDER)) {
    throw new Error(
      `Input folder not found: ${INPUT_FOLDER}`
    );
  }

  const files = fs.readdirSync(INPUT_FOLDER);

  return files.map((fileName) => ({
    fileName,
    extension: path
      .extname(fileName)
      .toLowerCase(),
    category: getCategory(fileName),
    path: path.join(
      INPUT_FOLDER,
      fileName
    ),
  }));
}

// =====================================================
// BUSINESS DATASET IMPORT DISABLED
// =====================================================

async function loadBusinessDataset() {
  console.log(
    "[DATASET] Business CSV/XLSX import is disabled."
  );

  console.log(
    "[DATASET] Businesses must be created through the Businesses page."
  );

  return {
    success: true,
    disabled: true,
    message:
      "Business dataset import is disabled. Add businesses through the Businesses page.",
    filesProcessed: [],
    count: 0,
    imported: [],
  };
}

// =====================================================
// COMPATIBILITY FUNCTION
// =====================================================

async function upsertBusiness() {
  throw new Error(
    "Business dataset import is disabled. Add or update businesses through the Businesses API."
  );
}

// =====================================================
// DOCX TEXT EXTRACTION
// =====================================================

async function extractDocxText(filePath) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    });

  return String(
    result.value || ""
  ).trim();
}

// =====================================================
// DOCUMENT TYPE
// =====================================================

function detectDocumentType(fileName) {
  const name =
    String(fileName || "").toLowerCase();

  if (name.includes("license")) {
    return "Business License";
  }

  if (name.includes("vendor")) {
    return "Vendor Registration";
  }

  if (name.includes("w9")) {
    return "W9 Form";
  }

  if (name.includes("insurance")) {
    return "Insurance Certificate";
  }

  if (name.includes("invoice")) {
    return "Invoice";
  }

  if (name.includes("onboarding")) {
    return "Employee Onboarding";
  }

  if (name.includes("background")) {
    return "Background Check";
  }

  if (name.includes("training")) {
    return "Employee Training";
  }

  if (name.includes("employment")) {
    return "Employment Verification";
  }

  if (name.includes("compliance")) {
    return "Compliance Certificate";
  }

  return "Unknown Document";
}

// =====================================================
// GENERIC FIELD EXTRACTOR
// =====================================================

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function extractValue(text, label) {
  const safeLabel =
    escapeRegex(label);

  const regex =
    new RegExp(
      `^${safeLabel}:\\s*(.+)$`,
      "im"
    );

  const match =
    String(text || "").match(regex);

  return match
    ? match[1].trim()
    : null;
}

// =====================================================
// EXTRACT DOCUMENT FIELDS
// =====================================================

function extractDocumentFields(text) {
  return {
    businessName:
      extractValue(
        text,
        "Business"
      ) ||
      extractValue(
        text,
        "Vendor"
      ) ||
      extractValue(
        text,
        "Employer"
      ),

    employeeName:
      extractValue(
        text,
        "Employee"
      ),

    vendorName:
      extractValue(
        text,
        "Vendor"
      ),

    address:
      extractValue(
        text,
        "Address"
      ),

    phone:
      extractValue(
        text,
        "Phone"
      ),

    email:
      extractValue(
        text,
        "Email"
      ),

    licenseNumber:
      extractValue(
        text,
        "License"
      ),

    invoiceNumber:
      extractValue(
        text,
        "Invoice"
      ),

    amount:
      extractValue(
        text,
        "Amount"
      ),

    tin:
      extractValue(
        text,
        "TIN"
      ),

    documentStatus:
      extractValue(
        text,
        "Status"
      ),

    trainingName:
      extractValue(
        text,
        "Training"
      ) ||
      extractValue(
        text,
        "Course"
      ),

    coverageType:
      extractValue(
        text,
        "Coverage"
      ),

    extractedDate:
      extractValue(
        text,
        "Date"
      ),
  };
}

// =====================================================
// FIND EXISTING BUSINESS
// =====================================================

async function findBusinessByName(
  businessName
) {
  const normalizedName =
    String(
      businessName || ""
    ).trim();

  if (!normalizedName) {
    return null;
  }

  const result =
    await pool.query(
      `
        SELECT *
        FROM businesses
        WHERE LOWER(TRIM(business_name))
          = LOWER(TRIM($1))
        LIMIT 1
      `,
      [normalizedName]
    );

  return result.rows[0] || null;
}

// =====================================================
// DOCUMENT BUSINESS LOOKUP
// =====================================================

async function getExistingBusiness(
  businessName
) {
  if (!businessName) {
    return null;
  }

  const business =
    await findBusinessByName(
      businessName
    );

  if (!business) {
    console.log(
      `[DOCUMENT] No existing PostgreSQL business matched: ${businessName}`
    );

    console.log(
      "[DOCUMENT] The document will be stored without creating a placeholder business."
    );
  }

  return business;
}

// =====================================================
// SAFE DATE VALUE
// =====================================================

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
}

// =====================================================
// INSERT OR UPDATE DOCUMENT
// =====================================================

async function insertDocument(
  file,
  category
) {
  if (!file?.path) {
    throw new Error(
      "A valid document file path is required."
    );
  }

  const extension =
    String(
      file.extension ||
      path.extname(file.path)
    ).toLowerCase();

  if (extension !== ".docx") {
    console.log(
      `[DOCUMENT] Skipped unsupported file: ${file.fileName}`
    );

    return {
      skipped: true,
      reason:
        "Only DOCX document extraction is currently supported.",
      fileName:
        file.fileName,
      category,
    };
  }

  const text =
    await extractDocxText(
      file.path
    );

  const documentType =
    detectDocumentType(
      file.fileName
    );

  const extracted =
    extractDocumentFields(
      text
    );

  let businessId = null;

  if (extracted.businessName) {
    const business =
      await getExistingBusiness(
        extracted.businessName
      );

    businessId =
      business?.business_id ||
      null;
  }

  // Find an existing document by name so repeated
  // imports update rather than duplicate it.
  const existingDocument =
    await pool.query(
      `
        SELECT document_id
        FROM documents
        WHERE document_name = $1
        LIMIT 1
      `,
      [file.fileName]
    );

  let document;

  if (
    existingDocument.rows.length > 0
  ) {
    const documentId =
      existingDocument
        .rows[0]
        .document_id;

    const updated =
      await pool.query(
        `
          UPDATE documents
          SET
            business_id = $1,
            document_type = $2,
            file_path = $3,
            processing_status = 'Processed',
            processed_at = CURRENT_TIMESTAMP
          WHERE document_id = $4
          RETURNING *
        `,
        [
          businessId,
          documentType,
          file.path,
          documentId,
        ]
      );

    document =
      updated.rows[0];

    await pool.query(
      `
        DELETE FROM
          extracted_document_data
        WHERE document_id = $1
      `,
      [documentId]
    );
  } else {
    const inserted =
      await pool.query(
        `
          INSERT INTO documents
          (
            business_id,
            document_name,
            document_type,
            file_path,
            processing_status,
            processed_at
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'Processed',
            CURRENT_TIMESTAMP
          )
          RETURNING *
        `,
        [
          businessId,
          file.fileName,
          documentType,
          file.path,
        ]
      );

    document =
      inserted.rows[0];
  }

  const extractedDate =
    normalizeDate(
      extracted.extractedDate
    );

  await pool.query(
    `
      INSERT INTO
        extracted_document_data
      (
        document_id,
        extracted_text,
        extracted_business_name,
        extracted_employee_name,
        extracted_vendor_name,
        extracted_address,
        extracted_phone,
        extracted_email,
        extracted_license_number,
        extracted_invoice_number,
        extracted_amount,
        extracted_tin,
        extracted_document_status,
        extracted_training_name,
        extracted_coverage_type,
        extracted_date,
        confidence_score
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,

        NULLIF(
          REGEXP_REPLACE(
            COALESCE($11, ''),
            '[^0-9.]',
            '',
            'g'
          ),
          ''
        )::DECIMAL,

        $12,
        $13,
        $14,
        $15,
        NULLIF($16, '')::DATE,
        $17
      )
    `,
    [
      document.document_id,
      text,
      extracted.businessName,
      extracted.employeeName,
      extracted.vendorName,
      extracted.address,
      extracted.phone,
      extracted.email,
      extracted.licenseNumber,
      extracted.invoiceNumber,
      extracted.amount,
      extracted.tin,
      extracted.documentStatus,
      extracted.trainingName,
      extracted.coverageType,
      extractedDate,
      80,
    ]
  );

  console.log(
    `[DOCUMENT] Imported ${file.fileName}`
  );

  if (
    extracted.businessName &&
    !businessId
  ) {
    console.log(
      `[DOCUMENT] Saved without a business link because "${extracted.businessName}" does not exist in PostgreSQL.`
    );
  }

  return {
    documentId:
      document.document_id,

    fileName:
      file.fileName,

    category,

    documentType,

    businessId,

    linkedToExistingBusiness:
      Boolean(businessId),

    ...extracted,
  };
}

// =====================================================
// LOAD BUSINESS DOCUMENTS
// =====================================================

async function loadBusinessDocuments() {
  const files =
    await listInputFiles();

  const documents =
    files.filter(
      (file) =>
        file.category ===
        "business_document"
    );

  const imported = [];
  const errors = [];

  for (const file of documents) {
    try {
      const result =
        await insertDocument(
          file,
          "business_document"
        );

      imported.push(result);
    } catch (error) {
      console.error(
        `[DOCUMENT] Failed to import ${file.fileName}:`,
        error
      );

      errors.push({
        fileName:
          file.fileName,
        message:
          error.message,
      });
    }
  }

  return {
    message:
      "Business documents processed",

    count:
      imported.length,

    errorCount:
      errors.length,

    imported,

    errors,
  };
}

// =====================================================
// LOAD EMPLOYEE DOCUMENTS
// =====================================================

async function loadEmployeeDocuments() {
  const files =
    await listInputFiles();

  const documents =
    files.filter(
      (file) =>
        file.category ===
        "employee_document"
    );

  const imported = [];
  const errors = [];

  for (const file of documents) {
    try {
      const result =
        await insertDocument(
          file,
          "employee_document"
        );

      imported.push(result);
    } catch (error) {
      console.error(
        `[DOCUMENT] Failed to import ${file.fileName}:`,
        error
      );

      errors.push({
        fileName:
          file.fileName,
        message:
          error.message,
      });
    }
  }

  return {
    message:
      "Employee documents processed",

    count:
      imported.length,

    errorCount:
      errors.length,

    imported,

    errors,
  };
}

// =====================================================
// LOAD ALL PROJECT DATA
// =====================================================

async function loadAllInputData() {
  console.log(
    "[IMPORT] Starting document-only project import..."
  );

  console.log(
    "[IMPORT] CSV/XLSX business dataset import is disabled."
  );

  console.log(
    "[IMPORT] PostgreSQL businesses are the source of truth."
  );

  const businessDocuments =
    await loadBusinessDocuments();

  const employeeDocuments =
    await loadEmployeeDocuments();

  console.log(
    "[IMPORT] Document-only project import completed."
  );

  return {
    success: true,

    message:
      "Project documents loaded. Business CSV/XLSX import is disabled.",

    businesses: {
      disabled: true,
      message:
        "Businesses must be added through the Businesses page.",
      count: 0,
      imported: [],
    },

    businessDocuments,

    employeeDocuments,
  };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments,
  loadAllInputData,
  upsertBusiness,
  insertDocument,
};
