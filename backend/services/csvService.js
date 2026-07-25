const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

function loadBusinesses() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, "../../database/BusinessDatasets.csv");

    fs.createReadStream(csvPath)const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_PATH = path.join(
  __dirname,
  "../data/input/BusinessDatasets.csv"
);

function normalizeRow(row) {
  return {
    business_name: String(
      row.business_name ||
      row.businessName ||
      row.BusinessName ||
      row.Business ||
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
    ).trim(),

    phone_number: String(
      row.phone_number ||
      row.phoneNumber ||
      row.phone ||
      row.Phone ||
      ""
    ).trim(),

    email: String(
      row.email ||
      row.Email ||
      ""
    ).trim(),

    industry: String(
      row.industry ||
      row.Industry ||
      ""
    ).trim(),

    status: String(
      row.status ||
      row.business_status ||
      row.Status ||
      "Pending"
    ).trim()
  };
}

function loadBusinesses() {
  return new Promise((resolve, reject) => {
    const results = [];

    if (!fs.existsSync(CSV_PATH)) {
      reject(
        new Error(
          `Business CSV not found: ${CSV_PATH}`
        )
      );
      return;
    }

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => {
        const normalized = normalizeRow(row);

        if (normalized.business_name) {
          results.push(normalized);
        }
      })
      .on("end", () => {
        console.log(
          `[CSV] Loaded ${results.length} businesses from ${CSV_PATH}`
        );

        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

module.exports = {
  loadBusinesses,
  normalizeRow,
  CSV_PATH
};
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

module.exports = { loadBusinesses };
