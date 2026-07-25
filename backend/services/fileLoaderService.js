const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
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
  const name = fileName.toLowerCase();

  if (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx")
  ) {
    return "business_dataset";
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

  const files = fs.readdirSync(
    INPUT_FOLDER
  );

  return files.map((file) => ({
    fileName: file,
    extension: path
      .extname(file)
      .toLowerCase(),
    category: getCategory(file),
    path: path.join(
      INPUT_FOLDER,
      file
    ),
  }));
}


// =====================================================
// CSV READER
// =====================================================

function readCsv(filePath) {
  return new Promise(
    (resolve, reject) => {
      const rows = [];

      fs.createReadStream(filePath)
        .pipe(csv())

        .on("data", (row) => {
          rows.push(row);
        })

        .on("end", () => {
          resolve(rows);
        })

        .on("error", reject);
    }
  );
}


// =====================================================
// XLSX READER
// =====================================================

function readXlsx(filePath) {
  const workbook =
    xlsx.readFile(filePath);

  const sheetName =
    workbook.SheetNames[0];

  return xlsx.utils.sheet_to_json(
    workbook.Sheets[sheetName]
  );
}


// =====================================================
// NORMALIZE BUSINESS ROW
// =====================================================

function normalizeBusinessRow(row) {
  return {
    businessName: String(
      row.business_name ||
      row.businessName ||
      row.BusinessName ||
      row.Business ||
      row.business ||
      row.name ||
      row.Name ||
      ""
    ).trim(),

    website: String(
      row.website ||
      row.Website ||
      row.business_website ||
      row.BusinessWebsite ||
      ""
    ).trim() || null,

    phone: String(
      row.phone_number ||
      row.phoneNumber ||
      row.phone ||
      row.Phone ||
      ""
    ).trim() || null,

    email: String(
      row.email ||
      row.Email ||
      ""
    ).trim() || null,

    industry: String(
      row.industry ||
      row.Industry ||
      ""
    ).trim() || null,

    status: String(
      row.status ||
      row.business_status ||
      row.Status ||
      "Imported"
    ).trim(),
  };
}


// =====================================================
// FIND OR CREATE / UPDATE BUSINESS
// =====================================================

async function upsertBusiness(row) {
  const business =
    normalizeBusinessRow(row);

  if (!business.businessName) {
    return null;
  }

  const result = await pool.query(
    `
    INSERT INTO businesses
    (
      business_name,
      website,
      phone_number,
      email,
      industry,
      business_status
    )
    VALUES
    ($1, $2, $3, $4, $5, $6)

    ON CONFLICT (business_name)

    DO UPDATE SET

      website =
        COALESCE(
          EXCLUDED.website,
          businesses.website
        ),

      phone_number =
        COALESCE(
          EXCLUDED.phone_number,
          businesses.phone_number
        ),

      email =
        COALESCE(
          EXCLUDED.email,
          businesses.email
        ),

      industry =
        COALESCE(
          EXCLUDED.industry,
          businesses.industry
        ),

      business_status =
        CASE
          WHEN
            businesses.business_status
            = 'Imported From Document'
          THEN
            EXCLUDED.business_status
          ELSE
            businesses.business_status
        END,

      updated_at =
        CURRENT_TIMESTAMP

    RETURNING *
    `,
    [
      business.businessName,
      business.website,
      business.phone,
      business.email,
      business.industry,
      business.status,
    ]
  );

  return result.rows[0];
}


// =====================================================
// LOAD BUSINESS DATASET
// =====================================================

async function loadBusinessDataset() {
  const files =
    await listInputFiles();

  const datasetFiles =
    files.filter(
      (file) =>
        file.category ===
        "business_dataset"
    );

  const imported = [];

  for (const file of datasetFiles) {
    let rows = [];

    if (
      file.extension === ".csv"
    ) {
      rows =
        await readCsv(file.path);
    }

    if (
      file.extension === ".xlsx"
    ) {
      rows =
        readXlsx(file.path);
    }

    console.log(
      `[DATASET] Processing ${file.fileName}`
    );

    console.log(
      `[DATASET] Rows found: ${rows.length}`
    );

    for (const row of rows) {
      const business =
        await upsertBusiness(row);

      if (business) {
        imported.push(business);
      }
    }
  }

  return {
    message:
      "Business dataset imported",

    filesProcessed:
      datasetFiles.map(
        (file) => file.fileName
      ),

    count:
      imported.length,

    imported,
  };
}


// =====================================================
// DOCX TEXT
// =====================================================

async function extractDocxText(
  filePath
) {
  const result =
    await mammoth.extractRawText({
      path: filePath,
    });

  return result.value.trim();
}


// =====================================================
// DOCUMENT TYPE
// =====================================================

function detectDocumentType(
  fileName
) {
  const name =
    fileName.toLowerCase();

  if (
    name.includes("license")
  ) {
    return "Business License";
  }

  if (
    name.includes("vendor")
  ) {
    return "Vendor Registration";
  }

  if (
    name.includes("w9")
  ) {
    return "W9 Form";
  }

  if (
    name.includes("insurance")
  ) {
    return "Insurance Certificate";
  }

  if (
    name.includes("invoice")
  ) {
    return "Invoice";
  }

  if (
    name.includes("onboarding")
  ) {
    return "Employee Onboarding";
  }

  if (
    name.includes("background")
  ) {
    return "Background Check";
  }

  if (
    name.includes("training")
  ) {
    return "Employee Training";
  }

  if (
    name.includes("employment")
  ) {
    return "Employment Verification";
  }

  if (
    name.includes("compliance")
  ) {
    return "Compliance Certificate";
  }

  return "Unknown Document";
}


// =====================================================
// GENERIC FIELD EXTRACTOR
// =====================================================

function extractValue(
  text,
  label
) {
  const regex =
    new RegExp(
      `${label}:\\s*(.+)`,
      "i"
    );

  const match =
    text.match(regex);

  return match
    ? match[1].trim()
    : null;
}


// =====================================================
// EXTRACT DOCUMENT FIELDS
// =====================================================

function extractDocumentFields(
  text
) {
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
  if (!businessName) {
    return null;
  }

  const result =
    await pool.query(
      `
      SELECT *
      FROM businesses
      WHERE LOWER(business_name)
        = LOWER($1)
      LIMIT 1
      `,
      [businessName]
    );

  return (
    result.rows[0] ||
    null
  );
}


// =====================================================
// GET OR CREATE BUSINESS FOR DOCUMENT
// =====================================================

async function getOrCreateBusiness(
  businessName
) {
  if (!businessName) {
    return null;
  }

  const existing =
    await findBusinessByName(
      businessName
    );

  if (existing) {
    return existing;
  }

  const result =
    await pool.query(
      `
      INSERT INTO businesses
      (
        business_name,
        business_status
      )
      VALUES ($1, $2)

      ON CONFLICT (business_name)

      DO UPDATE SET
        updated_at =
          CURRENT_TIMESTAMP

      RETURNING *
      `,
      [
        businessName,
        "Imported From Document",
      ]
    );

  return result.rows[0];
}


// =====================================================
// INSERT DOCUMENT
// =====================================================

async function insertDocument(
  file,
  category
) {
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
      await getOrCreateBusiness(
        extracted.businessName
      );

    businessId =
      business?.business_id ||
      null;
  }

  // Avoid inserting the same document
  // over and over on repeated imports.

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
    existingDocument.rows.length
    > 0
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

  // ==================================================
  // SAVE EXTRACTED DATA
  // ==================================================

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
      extracted.extractedDate,
      80,
    ]
  );

  console.log(
    `[DOCUMENT] Imported ${file.fileName}`
  );

  return {
    documentId:
      document.document_id,

    fileName:
      file.fileName,

    category,

    documentType,

    businessId,

    ...extracted,
  };
}


// =====================================================
// LOAD BUSINESS DOCUMENTS
// =====================================================

async function loadBusinessDocuments() {
  const files =
    await listInputFiles();

  const docs =
    files.filter(
      (file) =>
        file.category ===
        "business_document"
    );

  const imported = [];

  for (const file of docs) {
    imported.push(
      await insertDocument(
        file,
        "business_document"
      )
    );
  }

  return {
    message:
      "Business documents imported",

    count:
      imported.length,

    imported,
  };
}


// =====================================================
// LOAD EMPLOYEE DOCUMENTS
// =====================================================

async function loadEmployeeDocuments() {
  const files =
    await listInputFiles();

  const docs =
    files.filter(
      (file) =>
        file.category ===
        "employee_document"
    );

  const imported = [];

  for (const file of docs) {
    imported.push(
      await insertDocument(
        file,
        "employee_document"
      )
    );
  }

  return {
    message:
      "Employee documents imported",

    count:
      imported.length,

    imported,
  };
}


// =====================================================
// LOAD EVERYTHING
// =====================================================

async function loadAllInputData() {
  const businesses =
    await loadBusinessDataset();

  const businessDocuments =
    await loadBusinessDocuments();

  const employeeDocuments =
    await loadEmployeeDocuments();

  return {
    success: true,

    businesses,

    businessDocuments,

    employeeDocuments,
  };
}


module.exports = {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments,
  loadAllInputData,
  upsertBusiness,
  insertDocument,
};
