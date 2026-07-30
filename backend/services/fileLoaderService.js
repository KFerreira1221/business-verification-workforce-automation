const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");


// =====================================================
// OPTIONAL XLSX SUPPORT
// =====================================================

let XLSX = null;

try {
  XLSX = require("xlsx");
} catch (error) {
  console.log(
    "[FILES] XLSX package is not installed. CSV and DOCX will still work."
  );
}


// =====================================================
// INPUT FOLDER
// =====================================================

const INPUT_FOLDER = path.join(
  __dirname,
  "../data/input"
);


// =====================================================
// IN-MEMORY STORAGE
//
// PostgreSQL is no longer used.
// These values reset when Render restarts.
// =====================================================

let loadedBusinesses = [];
let loadedDocuments = [];

let nextBusinessId = 1;
let nextDocumentId = 1;


// =====================================================
// FILE CATEGORIES
// =====================================================

function getCategory(fileName) {
  const name = String(
    fileName || ""
  ).toLowerCase();

  if (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
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
    name.includes("compliance") ||
    name.includes("onboarding")
  ) {
    return "employee_document";
  }

  if (name.endsWith(".docx")) {
    return "document";
  }

  return "unknown";
}


// =====================================================
// LIST INPUT FILES
// =====================================================

async function listInputFiles() {
  if (!fs.existsSync(INPUT_FOLDER)) {
    fs.mkdirSync(
      INPUT_FOLDER,
      {
        recursive: true,
      }
    );
  }

  const files =
    fs.readdirSync(INPUT_FOLDER);

  return files.map(
    (fileName) => ({
      fileName,

      extension:
        path
          .extname(fileName)
          .toLowerCase(),

      category:
        getCategory(fileName),

      path:
        path.join(
          INPUT_FOLDER,
          fileName
        ),
    })
  );
}


// =====================================================
// NORMALIZE WEBSITE
// =====================================================

function normalizeWebsite(website) {
  if (!website) {
    return null;
  }

  const cleaned =
    String(website).trim();

  if (!cleaned) {
    return null;
  }

  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
}


// =====================================================
// FIND A VALUE USING MULTIPLE POSSIBLE COLUMN NAMES
// =====================================================

function getRowValue(
  row,
  possibleNames
) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const keys =
    Object.keys(row);

  for (const possibleName of possibleNames) {
    const matchingKey =
      keys.find(
        (key) =>
          String(key)
            .trim()
            .toLowerCase() ===
          String(possibleName)
            .trim()
            .toLowerCase()
      );

    if (matchingKey) {
      const value =
        row[matchingKey];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value).trim();
      }
    }
  }

  return null;
}


// =====================================================
// NORMALIZE BUSINESS ROW
// =====================================================

function normalizeBusinessRow(
  row,
  sourceFile
) {
  const businessName =
    getRowValue(
      row,
      [
        "business_name",
        "business name",
        "business",
        "company_name",
        "company name",
        "company",
        "name",
      ]
    );

  const website =
    normalizeWebsite(
      getRowValue(
        row,
        [
          "website",
          "business_website",
          "business website",
          "company website",
          "url",
          "web",
        ]
      )
    );

  const phone =
    getRowValue(
      row,
      [
        "phone",
        "phone_number",
        "phone number",
        "telephone",
      ]
    );

  const email =
    getRowValue(
      row,
      [
        "email",
        "email_address",
        "email address",
      ]
    );

  const industry =
    getRowValue(
      row,
      [
        "industry",
        "business_industry",
        "sector",
        "category",
      ]
    );

  const address =
    getRowValue(
      row,
      [
        "address",
        "business_address",
        "business address",
        "street address",
      ]
    );

  const city =
    getRowValue(
      row,
      [
        "city",
        "business_city",
      ]
    );

  const state =
    getRowValue(
      row,
      [
        "state",
        "business_state",
      ]
    );

  const zipCode =
    getRowValue(
      row,
      [
        "zip",
        "zipcode",
        "zip_code",
        "postal code",
      ]
    );

  if (!businessName) {
    return null;
  }

  return {
    business_id:
      nextBusinessId++,

    business_name:
      businessName,

    businessName,

    website,

    phone_number:
      phone,

    phoneNumber:
      phone,

    email,

    industry,

    address,

    city,

    state,

    zip_code:
      zipCode,

    business_status:
      "Imported",

    source_file:
      sourceFile,

    imported_at:
      new Date().toISOString(),
  };
}


// =====================================================
// SIMPLE CSV PARSER
// =====================================================

function parseCsvLine(line) {
  const values = [];

  let current = "";
  let insideQuotes = false;

  for (
    let index = 0;
    index < line.length;
    index++
  ) {
    const character =
      line[index];

    if (character === '"') {
      const nextCharacter =
        line[index + 1];

      if (
        insideQuotes &&
        nextCharacter === '"'
      ) {
        current += '"';
        index++;
      } else {
        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      values.push(
        current.trim()
      );

      current = "";
      continue;
    }

    current += character;
  }

  values.push(
    current.trim()
  );

  return values;
}


function parseCsvText(csvText) {
  const lines =
    String(csvText || "")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter(
        (line) =>
          line.trim() !== ""
      );

  if (!lines.length) {
    return [];
  }

  const headers =
    parseCsvLine(
      lines[0]
    );

  return lines
    .slice(1)
    .map((line) => {
      const values =
        parseCsvLine(line);

      const row = {};

      headers.forEach(
        (header, index) => {
          row[header] =
            values[index] ?? "";
        }
      );

      return row;
    });
}


// =====================================================
// READ BUSINESS DATASET FILE
// =====================================================

async function readBusinessDatasetFile(
  file
) {
  if (file.extension === ".csv") {
    const csvText =
      fs.readFileSync(
        file.path,
        "utf8"
      );

    return parseCsvText(
      csvText
    );
  }

  if (
    file.extension === ".xlsx" ||
    file.extension === ".xls"
  ) {
    if (!XLSX) {
      throw new Error(
        "The xlsx package is required to read Excel files."
      );
    }

    const workbook =
      XLSX.readFile(
        file.path
      );

    const firstSheetName =
      workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    return XLSX.utils.sheet_to_json(
      workbook.Sheets[
        firstSheetName
      ],
      {
        defval: "",
      }
    );
  }

  return [];
}


// =====================================================
// REMOVE DUPLICATE BUSINESSES
// =====================================================

function removeDuplicateBusinesses(
  businesses
) {
  const seen = new Set();

  return businesses.filter(
    (business) => {
      const name =
        String(
          business.business_name || ""
        )
          .trim()
          .toLowerCase();

      const website =
        String(
          business.website || ""
        )
          .trim()
          .toLowerCase();

      const key =
        `${name}|${website}`;

      if (!name) {
        return false;
      }

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}


// =====================================================
// LOAD BUSINESS DATASETS INTO MEMORY
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
  const errors = [];
  const filesProcessed = [];

  for (const file of datasetFiles) {
    try {
      const rows =
        await readBusinessDatasetFile(
          file
        );

      const businesses =
        rows
          .map((row) =>
            normalizeBusinessRow(
              row,
              file.fileName
            )
          )
          .filter(Boolean);

      imported.push(
        ...businesses
      );

      filesProcessed.push({
        fileName:
          file.fileName,

        rowCount:
          rows.length,

        importedCount:
          businesses.length,
      });
    } catch (error) {
      console.error(
        `[DATASET] Failed to load ${file.fileName}:`,
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

  loadedBusinesses =
    removeDuplicateBusinesses(
      imported
    );

  console.log(
    `[DATASET] Loaded ${loadedBusinesses.length} businesses into memory`
  );

  return {
    success: true,

    storage:
      "memory",

    persistent:
      false,

    filesProcessed,

    count:
      loadedBusinesses.length,

    imported:
      loadedBusinesses,

    errors,
  };
}


// =====================================================
// COMPATIBILITY FUNCTION
//
// This no longer writes to PostgreSQL.
// =====================================================

async function upsertBusiness(
  business
) {
  const normalized =
    normalizeBusinessRow(
      business,
      "frontend"
    );

  if (!normalized) {
    throw new Error(
      "A business name is required."
    );
  }

  const existingIndex =
    loadedBusinesses.findIndex(
      (current) => {
        const sameName =
          current.business_name
            .toLowerCase() ===
          normalized.business_name
            .toLowerCase();

        const sameWebsite =
          Boolean(
            current.website &&
            normalized.website &&
            current.website ===
              normalized.website
          );

        return (
          sameName ||
          sameWebsite
        );
      }
    );

  if (existingIndex >= 0) {
    loadedBusinesses[
      existingIndex
    ] = {
      ...loadedBusinesses[
        existingIndex
      ],

      ...normalized,

      business_id:
        loadedBusinesses[
          existingIndex
        ].business_id,

      updated_at:
        new Date().toISOString(),
    };

    return loadedBusinesses[
      existingIndex
    ];
  }

  loadedBusinesses.push(
    normalized
  );

  return normalized;
}


// =====================================================
// DOCX TEXT EXTRACTION
// =====================================================

async function extractDocxText(
  filePath
) {
  const result =
    await mammoth.extractRawText({
      path:
        filePath,
    });

  return String(
    result.value || ""
  ).trim();
}


// =====================================================
// DOCUMENT TYPE
// =====================================================

function detectDocumentType(
  fileName
) {
  const name =
    String(
      fileName || ""
    ).toLowerCase();

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

  return "General Document";
}


// =====================================================
// GENERIC FIELD EXTRACTION
// =====================================================

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


function extractValue(
  text,
  label
) {
  const safeLabel =
    escapeRegex(label);

  const regex =
    new RegExp(
      `^${safeLabel}:\\s*(.+)$`,
      "im"
    );

  const match =
    String(text || "").match(
      regex
    );

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
// INSERT DOCUMENT INTO MEMORY
//
// The function name remains insertDocument so existing
// routes do not break.
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
      path.extname(
        file.path
      )
    ).toLowerCase();

  if (extension !== ".docx") {
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

  const existingIndex =
    loadedDocuments.findIndex(
      (document) =>
        document.fileName ===
        file.fileName
    );

  const document = {
    documentId:
      existingIndex >= 0
        ? loadedDocuments[
            existingIndex
          ].documentId
        : nextDocumentId++,

    fileName:
      file.fileName,

    category,

    documentType,

    filePath:
      file.path,

    extractedText:
      text,

    processingStatus:
      "Processed",

    processedAt:
      new Date().toISOString(),

    confidenceScore:
      80,

    ...extracted,
  };

  if (existingIndex >= 0) {
    loadedDocuments[
      existingIndex
    ] = document;
  } else {
    loadedDocuments.push(
      document
    );
  }

  console.log(
    `[DOCUMENT] Loaded ${file.fileName} into memory`
  );

  return document;
}


// =====================================================
// LOAD DOCUMENT CATEGORY
// =====================================================

async function loadDocumentsByCategory(
  category
) {
  const files =
    await listInputFiles();

  const documents =
    files.filter(
      (file) =>
        file.category ===
          category ||
        (
          file.category ===
            "document" &&
          category ===
            "business_document"
        )
    );

  const imported = [];
  const errors = [];

  for (const file of documents) {
    try {
      const result =
        await insertDocument(
          file,
          category
        );

      imported.push(
        result
      );
    } catch (error) {
      console.error(
        `[DOCUMENT] Failed to load ${file.fileName}:`,
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
    success: true,

    storage:
      "memory",

    persistent:
      false,

    count:
      imported.length,

    errorCount:
      errors.length,

    imported,

    errors,
  };
}


// =====================================================
// LOAD BUSINESS DOCUMENTS
// =====================================================

async function loadBusinessDocuments() {
  const result =
    await loadDocumentsByCategory(
      "business_document"
    );

  return {
    message:
      "Business documents loaded into memory",

    ...result,
  };
}


// =====================================================
// LOAD EMPLOYEE DOCUMENTS
// =====================================================

async function loadEmployeeDocuments() {
  const result =
    await loadDocumentsByCategory(
      "employee_document"
    );

  return {
    message:
      "Employee documents loaded into memory",

    ...result,
  };
}


// =====================================================
// LOAD ALL PROJECT DATA
// =====================================================

async function loadAllInputData() {
  console.log(
    "[IMPORT] Starting no-database project import..."
  );

  loadedBusinesses = [];
  loadedDocuments = [];

  nextBusinessId = 1;
  nextDocumentId = 1;

  const businesses =
    await loadBusinessDataset();

  const businessDocuments =
    await loadBusinessDocuments();

  const employeeDocuments =
    await loadEmployeeDocuments();

  console.log(
    "[IMPORT] No-database project import completed."
  );

  return {
    success: true,

    storage:
      "memory",

    persistent:
      false,

    database:
      "disabled",

    message:
      "Project files loaded directly into backend memory.",

    businesses,

    businessDocuments,

    employeeDocuments,

    totals: {
      businesses:
        loadedBusinesses.length,

      documents:
        loadedDocuments.length,
    },
  };
}


// =====================================================
// GETTERS FOR ROUTES
// =====================================================

function getLoadedBusinesses() {
  return [
    ...loadedBusinesses,
  ];
}


function getLoadedDocuments() {
  return [
    ...loadedDocuments,
  ];
}


function getLoadedData() {
  return {
    businesses:
      getLoadedBusinesses(),

    documents:
      getLoadedDocuments(),

    totals: {
      businesses:
        loadedBusinesses.length,

      documents:
        loadedDocuments.length,
    },

    storage:
      "memory",

    persistent:
      false,
  };
}


// =====================================================
// CLEAR LOADED DATA
// =====================================================

function clearLoadedData() {
  const removedBusinesses =
    loadedBusinesses.length;

  const removedDocuments =
    loadedDocuments.length;

  loadedBusinesses = [];
  loadedDocuments = [];

  nextBusinessId = 1;
  nextDocumentId = 1;

  return {
    success: true,

    removedBusinesses,

    removedDocuments,
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
  getLoadedBusinesses,
  getLoadedDocuments,
  getLoadedData,
  clearLoadedData,
};
