const express = require("express");
const router = express.Router();

const {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments
} = require("../services/fileLoaderService");

function handleError(res, error) {
  console.error("LOAD ERROR:", error);
  res.status(500).json({
    success: false,
    error: error.message || "Unknown error",
    detail: error.detail || null
  });
}

router.get("/files", async (req, res) => {
  try {
    const files = await listInputFiles();
    res.json({ success: true, files });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/business-dataset", async (req, res) => {
  try {
    const result = await loadBusinessDataset();
    res.json({ success: true, category: "business_dataset", result });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/business-documents", async (req, res) => {
  try {
    const result = await loadBusinessDocuments();
    res.json({ success: true, category: "business_documents", result });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/employee-documents", async (req, res) => {
  try {
    const result = await loadEmployeeDocuments();
    res.json({ success: true, category: "employee_documents", result });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;