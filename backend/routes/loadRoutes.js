const express = require("express");
const router = express.Router();

const {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments
} = require("../services/fileLoaderService");


// =====================================================
// ERROR HANDLER
// =====================================================

function handleError(res, error) {
  console.error("LOAD ERROR:", error);

  res.status(500).json({
    success: false,
    error: error.message || "Unknown error",
    detail: error.detail || null
  });
}


// =====================================================
// LIST ALL INPUT FILES
// GET /api/load/files
// =====================================================

router.get("/files", async (req, res) => {
  try {
    const files = await listInputFiles();

    res.json({
      success: true,
      count: files.length,
      files
    });

  } catch (error) {
    handleError(res, error);
  }
});


// =====================================================
// LOAD BUSINESS DATASETS
// POST /api/load/business-dataset
// =====================================================

router.post("/business-dataset", async (req, res) => {
  try {
    console.log("[LOAD] Starting business dataset import...");

    const result = await loadBusinessDataset();

    console.log("[LOAD] Business dataset import complete.");

    res.json({
      success: true,
      category: "business_dataset",
      result
    });

  } catch (error) {
    handleError(res, error);
  }
});


// =====================================================
// LOAD BUSINESS DOCUMENTS
// POST /api/load/business-documents
// =====================================================

router.post("/business-documents", async (req, res) => {
  try {
    console.log("[LOAD] Starting business document import...");

    const result = await loadBusinessDocuments();

    console.log("[LOAD] Business document import complete.");

    res.json({
      success: true,
      category: "business_documents",
      result
    });

  } catch (error) {
    handleError(res, error);
  }
});


// =====================================================
// LOAD EMPLOYEE DOCUMENTS
// POST /api/load/employee-documents
// =====================================================

router.post("/employee-documents", async (req, res) => {
  try {
    console.log("[LOAD] Starting employee document import...");

    const result = await loadEmployeeDocuments();

    console.log("[LOAD] Employee document import complete.");

    res.json({
      success: true,
      category: "employee_documents",
      result
    });

  } catch (error) {
    handleError(res, error);
  }
});


// =====================================================
// LOAD ALL PROJECT DATA
// POST /api/load/all
// =====================================================

router.post("/all", async (req, res) => {
  try {
    console.log("========================================");
    console.log("[LOAD ALL] Starting full project import");
    console.log("========================================");

    // -------------------------------------------------
    // 1. BUSINESS DATASETS
    // -------------------------------------------------

    console.log("[LOAD ALL] Step 1/3: Business datasets");

    const businessDataset =
      await loadBusinessDataset();

    console.log(
      "[LOAD ALL] Business datasets complete."
    );


    // -------------------------------------------------
    // 2. BUSINESS DOCUMENTS
    // -------------------------------------------------

    console.log("[LOAD ALL] Step 2/3: Business documents");

    const businessDocuments =
      await loadBusinessDocuments();

    console.log(
      "[LOAD ALL] Business documents complete."
    );


    // -------------------------------------------------
    // 3. EMPLOYEE DOCUMENTS
    // -------------------------------------------------

    console.log("[LOAD ALL] Step 3/3: Employee documents");

    const employeeDocuments =
      await loadEmployeeDocuments();

    console.log(
      "[LOAD ALL] Employee documents complete."
    );


    // -------------------------------------------------
    // COMPLETE
    // -------------------------------------------------

    console.log("========================================");
    console.log("[LOAD ALL] Full project import complete");
    console.log("========================================");


    res.json({
      success: true,

      message:
        "All project data loaded successfully.",

      results: {
        businessDataset,
        businessDocuments,
        employeeDocuments
      }
    });

  } catch (error) {
    console.error(
      "[LOAD ALL] Full import failed:",
      error
    );

    handleError(res, error);
  }
});


module.exports = router;
