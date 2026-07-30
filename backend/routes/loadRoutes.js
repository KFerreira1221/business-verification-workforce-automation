const express = require("express");

const router = express.Router();

const {
  listInputFiles,
  loadBusinessDataset,
  loadBusinessDocuments,
  loadEmployeeDocuments,
  loadAllInputData,
  getLoadedBusinesses,
  getLoadedDocuments,
  getLoadedData,
  clearLoadedData,
} = require("../services/fileLoaderService");


// =====================================================
// ERROR HANDLER
// =====================================================

function handleError(
  res,
  error
) {
  console.error(
    "[LOAD ERROR]",
    error
  );

  return res
    .status(500)
    .json({
      success: false,

      error:
        error.message ||
        "Unknown error",

      detail:
        error.detail ||
        null,
    });
}


// =====================================================
// LIST ALL INPUT FILES
//
// GET /api/load/files
// =====================================================

router.get(
  "/files",
  async (req, res) => {
    try {
      const files =
        await listInputFiles();

      return res.json({
        success: true,

        database:
          "disabled",

        storage:
          "filesystem",

        count:
          files.length,

        files,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// LOAD BUSINESS DATASETS
//
// POST /api/load/business-dataset
// =====================================================

router.post(
  "/business-dataset",
  async (req, res) => {
    try {
      console.log(
        "[LOAD] Starting business dataset import..."
      );

      const result =
        await loadBusinessDataset();

      console.log(
        "[LOAD] Business dataset import complete."
      );

      return res.json({
        success: true,

        category:
          "business_dataset",

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        result,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// LOAD BUSINESS DOCUMENTS
//
// POST /api/load/business-documents
// =====================================================

router.post(
  "/business-documents",
  async (req, res) => {
    try {
      console.log(
        "[LOAD] Starting business document import..."
      );

      const result =
        await loadBusinessDocuments();

      console.log(
        "[LOAD] Business document import complete."
      );

      return res.json({
        success: true,

        category:
          "business_documents",

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        result,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// LOAD EMPLOYEE DOCUMENTS
//
// POST /api/load/employee-documents
// =====================================================

router.post(
  "/employee-documents",
  async (req, res) => {
    try {
      console.log(
        "[LOAD] Starting employee document import..."
      );

      const result =
        await loadEmployeeDocuments();

      console.log(
        "[LOAD] Employee document import complete."
      );

      return res.json({
        success: true,

        category:
          "employee_documents",

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        result,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// LOAD EVERYTHING
//
// POST /api/load/all
// =====================================================

router.post(
  "/all",
  async (req, res) => {
    try {
      console.log(
        "========================================"
      );

      console.log(
        "[LOAD ALL] Starting full project import"
      );

      console.log(
        "========================================"
      );

      const result =
        await loadAllInputData();

      console.log(
        "========================================"
      );

      console.log(
        "[LOAD ALL] Full project import complete"
      );

      console.log(
        "========================================"
      );

      return res.json({
        success: true,

        message:
          "All project files loaded successfully.",

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        result,
      });
    } catch (error) {
      console.error(
        "[LOAD ALL] Full import failed:",
        error
      );

      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// GET ALL LOADED DATA
//
// GET /api/load/data
// =====================================================

router.get(
  "/data",
  async (req, res) => {
    try {
      const data =
        getLoadedData();

      return res.json({
        success: true,

        ...data,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// GET LOADED BUSINESSES
//
// GET /api/load/businesses
// =====================================================

router.get(
  "/businesses",
  async (req, res) => {
    try {
      const businesses =
        getLoadedBusinesses();

      return res.json({
        success: true,

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        count:
          businesses.length,

        businesses,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// GET LOADED DOCUMENTS
//
// GET /api/load/documents
// =====================================================

router.get(
  "/documents",
  async (req, res) => {
    try {
      const documents =
        getLoadedDocuments();

      return res.json({
        success: true,

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        count:
          documents.length,

        documents,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// CLEAR LOADED DATA
//
// DELETE /api/load/data
// =====================================================

router.delete(
  "/data",
  async (req, res) => {
    try {
      const result =
        clearLoadedData();

      return res.json({
        success: true,

        message:
          "Loaded business and document data cleared.",

        ...result,
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


// =====================================================
// LOAD SERVICE STATUS
//
// GET /api/load/status
// =====================================================

router.get(
  "/status",
  async (req, res) => {
    try {
      const businesses =
        getLoadedBusinesses();

      const documents =
        getLoadedDocuments();

      return res.json({
        success: true,

        service:
          "Project File Loader",

        database:
          "disabled",

        storage:
          "memory",

        persistent:
          false,

        loadedBusinesses:
          businesses.length,

        loadedDocuments:
          documents.length,

        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      return handleError(
        res,
        error
      );
    }
  }
);


module.exports = router;
