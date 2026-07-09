const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const mammoth = require("mammoth");
const pool = require("./db");

const INPUT_FOLDER = path.join(__dirname, "../data/input");

function getCategory(fileName) {
  const name = fileName.toLowerCase();

  if (name.endsWith(".csv") || name.endsWith(".xlsx")) return "business_dataset";

  if (
    name.includes("license") ||
    name.includes("vendor") ||
    name.includes("insurance") ||
    name.includes("invoice") ||
    name.includes("w9")
  ) return "business_document";

  if (
    name.includes("employee") ||
    name.includes("background") ||
    name.includes("training") ||
    name.includes("employment") ||
    name.includes("compliance")
  ) return "employee_document";

  if (name.endsWith(".sql")) return "database_schema";

  return "unknown";
}

async function listInputFiles() {
  const files = fs.readdirSync(INPUT_FOLDER);

  return files.map((file) => ({
    fileName: file,
    extension: path.extname(file),
    category: getCategory(file),
    path: path.join(INPUT_FOLDER, file)
  }));
}

function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function readXlsx(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

async function insertBusiness(row) {
  const businessName =
    row.business_name ||
    row.businessName ||
    row.name ||
    row.Business ||
    row.business;

  if (!businessName) return null;

  const website = row.website || row.Website || null;
  const phone = row.phone_number || row.phoneNumber || row.phone || null;
  const email = row.email || row.Email || null;
  const industry = row.industry || row.Industry || null;
  const status = row.status || row.business_status || "Imported";

  const result = await pool.query(
    `
    INSERT INTO businesses
    (business_name, website, phone_number, email, industry, business_status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [businessName, website, phone, email, industry, status]
  );

  return result.rows[0];
}

async function loadBusinessDataset() {
  const files = await listInputFiles();
  const datasetFiles = files.filter((f) => f.category === "business_dataset");

  let imported = [];

  for (const file of datasetFiles) {
    let rows = [];

    if (file.extension === ".csv") {
      rows = await readCsv(file.path);
    }

    if (file.extension === ".xlsx") {
      rows = readXlsx(file.path);
    }

    for (const row of rows) {
      const inserted = await insertBusiness(row);
      if (inserted) imported.push(inserted);
    }
  }

  return {
    message: "Business dataset imported",
    filesProcessed: datasetFiles.map((f) => f.fileName),
    count: imported.length,
    imported
  };
}

async function extractDocxText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
}

function detectDocumentType(fileName) {
  const name = fileName.toLowerCase();

  if (name.includes("license")) return "Business License";
  if (name.includes("vendor")) return "Vendor Registration";
  if (name.includes("w9")) return "W9 Form";
  if (name.includes("insurance")) return "Insurance Certificate";
  if (name.includes("invoice")) return "Invoice";
  if (name.includes("onboarding")) return "Employee Onboarding";
  if (name.includes("background")) return "Background Check";
  if (name.includes("training")) return "Employee Training";
  if (name.includes("employment")) return "Employment Verification";
  if (name.includes("compliance")) return "Compliance Certificate";

  return "Unknown Document";
}

function extractValue(text, label) {
  const regex = new RegExp(`${label}:\\s*(.+)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

async function insertDocument(file, category) {
  const text = await extractDocxText(file.path);
  const documentType = detectDocumentType(file.fileName);

  const businessName =
    extractValue(text, "Business") ||
    extractValue(text, "Vendor") ||
    extractValue(text, "Employer");

  const employeeName = extractValue(text, "Employee");

  let businessId = null;

  if (businessName) {
    const businessResult = await pool.query(
      `
      INSERT INTO businesses (business_name, business_status)
      VALUES ($1, $2)
      RETURNING business_id
      `,
      [businessName, "Imported From Document"]
    );

    businessId = businessResult.rows[0].business_id;
  }

  const docResult = await pool.query(
    `
    INSERT INTO documents
    (business_id, document_name, document_type, file_path)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [businessId, file.fileName, documentType, file.path]
  );

  const document = docResult.rows[0];

  await pool.query(
    `
    INSERT INTO extracted_document_data
    (document_id, extracted_text, extracted_business_name, confidence_score)
    VALUES ($1, $2, $3, $4)
    `,
    [
      document.document_id,
      text,
      businessName || employeeName || null,
      80
    ]
  );

  return {
    fileName: file.fileName,
    category,
    documentType,
    businessName,
    employeeName,
    text
  };
}

async function loadBusinessDocuments() {
  const files = await listInputFiles();
  const docs = files.filter((f) => f.category === "business_document");

  const imported = [];

  for (const file of docs) {
    imported.push(await insertDocument(file, "business_document"));
  }

  return {
    message: "Business documents imported",
    count: imported.length,
    imported
  };
}

async function loadEmployeeDocuments() {
  const files = await listInputFiles();
  const docs = files.filter((f) => f.category === "employee_document");

  const imported = [];

  for (const file of docs) {
    imported.push(await insertDocument(file, "employee_document"));
  }

  return {
    message: "Employee documents imported",
    count: imported.length,
    imported
  };
}

module.exports = {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments
};