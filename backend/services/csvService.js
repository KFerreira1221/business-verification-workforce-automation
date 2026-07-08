const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

function loadBusinesses() {
  return new Promise((resolve, reject) => {
    const results = [];
    const csvPath = path.join(__dirname, "../../database/BusinessDatasets.csv");

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

module.exports = { loadBusinesses };