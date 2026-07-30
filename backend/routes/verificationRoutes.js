const express = require("express");

const router = express.Router();

const {
  verifyBusiness,
} = require("../services/crawlerService");

const {
  normalizeWebsite,
  saveVerificationResult,
  getVerificationHistory,
  getVerificationById,
  hasBusinessBeenVerified,
  clearVerificationHistory,
  getStorageStatus,
} = require(
  "../services/verificationTrackingService"
);


// =====================================================
// TEMPORARY IN-MEMORY BUSINESS QUEUE
//
// PostgreSQL is no longer used.
//
// Businesses can be sent from the frontend using:
//
// POST /api/verification/businesses/load
//
// Body:
// {
//   "businesses": [
//     {
//       "businessName": "Microsoft",
//       "website": "https://microsoft.com"
//     }
//   ]
// }
// =====================================================

let pendingBusinesses = [];

let nextBusinessId = 1;


// =====================================================
// NORMALIZE BUSINESS OBJECT
// =====================================================

function normalizeBusiness(
  business,
  index = 0
) {
  if (!business || typeof business !== "object") {
    return null;
  }

  const businessName =
    String(
      business.businessName ||
      business.business_name ||
      business.name ||
      ""
    ).trim();

  const website =
    normalizeWebsite(
      business.website ||
      business.url ||
      business.businessWebsite ||
      business.business_website
    );

  const businessId =
    business.business_id ||
    business.businessId ||
    nextBusinessId++;

  return {
    business_id:
      businessId,

    business_name:
      businessName,

    website,

    phone_number:
      business.phone_number ||
      business.phoneNumber ||
      business.phone ||
      null,

    email:
      business.email ||
      null,

    industry:
      business.industry ||
      null,

    business_status:
      business.business_status ||
      business.businessStatus ||
      "Pending",

    queue_position:
      index + 1,
  };
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

      if (!name && !website) {
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
// VERIFY AND SAVE ONE BUSINESS
// =====================================================

async function verifyAndSaveBusiness(
  business
) {
  const businessName =
    String(
      business.business_name ||
      business.businessName ||
      ""
    ).trim();

  const website =
    normalizeWebsite(
      business.website
    );

  if (!businessName) {
    throw new Error(
      "Business name is missing"
    );
  }

  if (!website) {
    throw new Error(
      "Business website is missing"
    );
  }

  console.log(
    "\n========================================"
  );

  console.log(
    "[VERIFY] Starting verification"
  );

  console.log(
    `[VERIFY] Business: ${businessName}`
  );

  console.log(
    `[VERIFY] Website: ${website}`
  );

  console.log(
    "========================================\n"
  );

  const result =
    await verifyBusiness(
      businessName,
      website
    );

  const saved =
    await saveVerificationResult({
      businessName,
      website,
      result,
    });

  return {
    business_id:
      business.business_id ||
      saved.business_id,

    businessName,

    website,

    result,

    saved,
  };
}


// =====================================================
// LIVE CRAWLER TEST
//
// POST /api/verification/run-test
// =====================================================

router.post(
  "/run-test",
  async (req, res) => {
    try {
      const businessName =
        "Microsoft";

      const website =
        "https://www.microsoft.com";

      console.log(
        "[CRAWLER TEST] Starting Microsoft test"
      );

      const result =
        await verifyBusiness(
          businessName,
          website
        );

      return res.json({
        success: true,

        testMode: true,

        storage:
          "No PostgreSQL",

        message:
          "Live Chromium crawler test completed.",

        result,
      });
    } catch (error) {
      console.error(
        "[CRAWLER TEST] Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// VERIFY ONE MANUALLY PROVIDED BUSINESS
//
// POST /api/verification/run
//
// Body:
// {
//   "businessName": "Microsoft",
//   "website": "https://microsoft.com"
// }
// =====================================================

router.post(
  "/run",
  async (req, res) => {
    try {
      const businessName =
        String(
          req.body?.businessName ||
          req.body?.business_name ||
          ""
        ).trim();

      const website =
        normalizeWebsite(
          req.body?.website
        );

      if (!businessName) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              "businessName is required",
          });
      }

      if (!website) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              "website is required",
          });
      }

      const business =
        normalizeBusiness({
          businessName,
          website,
        });

      const verification =
        await verifyAndSaveBusiness(
          business
        );

      return res.json({
        success: true,

        source:
          "Frontend request",

        storage:
          "Server memory",

        persistent:
          false,

        business,

        result:
          verification.result,

        saved:
          verification.saved,

        verification,
      });
    } catch (error) {
      console.error(
        "[VERIFY] Manual verification error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// LOAD BUSINESSES INTO MEMORY
//
// POST /api/verification/businesses/load
//
// Body:
// {
//   "businesses": [
//     {
//       "businessName": "Microsoft",
//       "website": "https://microsoft.com"
//     }
//   ]
// }
// =====================================================

router.post(
  "/businesses/load",
  async (req, res) => {
    try {
      const businesses =
        req.body?.businesses;

      if (!Array.isArray(businesses)) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              "businesses must be an array",
          });
      }

      const normalized =
        businesses
          .map(
            (
              business,
              index
            ) =>
              normalizeBusiness(
                business,
                index
              )
          )
          .filter(Boolean);

      const validBusinesses =
        normalized.filter(
          (business) =>
            business.business_name &&
            business.website
        );

      const invalidBusinesses =
        normalized.filter(
          (business) =>
            !business.business_name ||
            !business.website
        );

      pendingBusinesses =
        removeDuplicateBusinesses(
          validBusinesses
        );

      return res.json({
        success: true,

        storage:
          "Server memory",

        persistent:
          false,

        message:
          `${pendingBusinesses.length} businesses loaded into the verification queue.`,

        loaded:
          pendingBusinesses.length,

        skipped:
          invalidBusinesses.length,

        businesses:
          pendingBusinesses,

        invalidBusinesses,
      });
    } catch (error) {
      console.error(
        "[BUSINESS LOAD] Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// ADD ONE BUSINESS TO QUEUE
//
// POST /api/verification/businesses/add
// =====================================================

router.post(
  "/businesses/add",
  async (req, res) => {
    try {
      const business =
        normalizeBusiness(
          req.body
        );

      if (!business?.business_name) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              "Business name is required",
          });
      }

      if (!business.website) {
        return res
          .status(400)
          .json({
            success: false,

            error:
              "Business website is required",
          });
      }

      const duplicate =
        pendingBusinesses.some(
          (existing) => {
            const sameName =
              existing.business_name
                .toLowerCase() ===
              business.business_name
                .toLowerCase();

            const sameWebsite =
              existing.website ===
              business.website;

            return (
              sameName ||
              sameWebsite
            );
          }
        );

      if (duplicate) {
        return res
          .status(409)
          .json({
            success: false,

            error:
              "This business is already in the queue.",
          });
      }

      pendingBusinesses.push(
        business
      );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Business added to verification queue.",

          business,

          queueCount:
            pendingBusinesses.length,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// GET NEXT BUSINESS
//
// GET /api/verification/next
// =====================================================

router.get(
  "/next",
  async (req, res) => {
    try {
      const nextBusiness =
        pendingBusinesses.find(
          (business) =>
            !hasBusinessBeenVerified({
              businessName:
                business.business_name,

              website:
                business.website,
            })
        );

      if (!nextBusiness) {
        return res.json({
          success: true,

          complete: true,

          message:
            "No unverified businesses remain in memory.",

          business:
            null,
        });
      }

      return res.json({
        success: true,

        complete:
          pendingBusinesses.length === 0,

        source:
          "In-memory queue",

        business:
          nextBusiness,
      });
    } catch (error) {
      console.error(
        "[NEXT] Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// VERIFY NEXT BUSINESS
//
// POST /api/verification/run-next
// =====================================================

router.post(
  "/run-next",
  async (req, res) => {
    try {
      const businessIndex =
        pendingBusinesses.findIndex(
          (business) =>
            !hasBusinessBeenVerified({
              businessName:
                business.business_name,

              website:
                business.website,
            })
        );

      if (businessIndex === -1) {
        return res.json({
          success: true,

          complete: true,

          message:
            "No unverified businesses remain.",
        });
      }

      const business =
        pendingBusinesses[
          businessIndex
        ];

      const verification =
        await verifyAndSaveBusiness(
          business
        );

      pendingBusinesses.splice(
        businessIndex,
        1
      );

      return res.json({
        success: true,

        complete: false,

        source:
          "In-memory queue",

        message:
          "Next business verified successfully.",

        business,

        result:
          verification.result,

        saved:
          verification.saved,

        verification,

        remaining:
          pendingBusinesses.length,
      });
    } catch (error) {
      console.error(
        "[RUN NEXT] Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// VERIFY ALL BUSINESSES
//
// POST /api/verification/run-loaded
//
// This route can use businesses already loaded into
// memory, or accept businesses directly in the request.
//
// Optional body:
// {
//   "businesses": [...]
// }
// =====================================================

router.post(
  "/run-loaded",
  async (req, res) => {
    try {
      if (
        Array.isArray(
          req.body?.businesses
        )
      ) {
        pendingBusinesses =
          removeDuplicateBusinesses(
            req.body.businesses
              .map(
                (
                  business,
                  index
                ) =>
                  normalizeBusiness(
                    business,
                    index
                  )
              )
              .filter(
                (business) =>
                  business &&
                  business.business_name &&
                  business.website
              )
          );
      }

      const businesses =
        [...pendingBusinesses];

      if (!businesses.length) {
        return res.json({
          success: true,

          complete: true,

          total: 0,

          completed: 0,

          skipped: 0,

          failed: 0,

          message:
            "No businesses are loaded into memory.",

          results: [],
        });
      }

      console.log(
        `[MEMORY BATCH] Starting ${businesses.length} verifications`
      );

      const results = [];

      for (
        let index = 0;
        index < businesses.length;
        index++
      ) {
        const business =
          businesses[index];

        if (!business.business_name) {
          results.push({
            success: false,

            status:
              "skipped",

            business,

            error:
              "Business name is missing",
          });

          continue;
        }

        if (!business.website) {
          results.push({
            success: false,

            status:
              "skipped",

            business,

            reason:
              "missing_website",

            error:
              "Business website is missing",
          });

          continue;
        }

        try {
          const verification =
            await verifyAndSaveBusiness(
              business
            );

          results.push({
            success: true,

            status:
              "completed",

            ...verification,
          });
        } catch (businessError) {
          results.push({
            success: false,

            status:
              "failed",

            business_id:
              business.business_id,

            businessName:
              business.business_name,

            website:
              business.website,

            error:
              businessError.message,
          });
        }
      }

      const completed =
        results.filter(
          (item) =>
            item.status ===
            "completed"
        ).length;

      const skipped =
        results.filter(
          (item) =>
            item.status ===
            "skipped"
        ).length;

      const failed =
        results.filter(
          (item) =>
            item.status ===
            "failed"
        ).length;

      const completedBusinessIds =
        new Set(
          results
            .filter(
              (item) =>
                item.status ===
                "completed"
            )
            .map(
              (item) =>
                String(
                  item.business_id
                )
            )
        );

      pendingBusinesses =
        pendingBusinesses.filter(
          (business) =>
            !completedBusinessIds.has(
              String(
                business.business_id
              )
            )
        );

      pendingBusinesses.forEach(
        (business, index) => {
          business.queue_position =
            index + 1;
        }
      );

      return res.json({
        success: true,

        source:
          "In-memory business queue",

        storage:
          "Server memory",

        persistent:
          false,

        total:
          businesses.length,

        completed,

        skipped,

        failed,

        results,

        // Frontend compatibility alias.
        verifications:
          results,
      });
    } catch (error) {
      console.error(
        "[MEMORY BATCH] Fatal error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// LIST PENDING BUSINESSES
//
// GET /api/verification/pending
// =====================================================

router.get(
  "/pending",
  async (req, res) => {
    try {
      return res.json({
        success: true,

        source:
          "In-memory queue",

        count:
          pendingBusinesses.length,

        businesses:
          pendingBusinesses,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// REMOVE ONE PENDING BUSINESS
//
// DELETE /api/verification/pending/:businessId
// =====================================================

router.delete(
  "/pending/:businessId",
  async (req, res) => {
    try {
      const businessId =
        String(
          req.params.businessId
        );

      const originalCount =
        pendingBusinesses.length;

      pendingBusinesses =
        pendingBusinesses.filter(
          (business) =>
            String(
              business.business_id
            ) !== businessId
        );

      const removed =
        originalCount -
        pendingBusinesses.length;

      if (!removed) {
        return res
          .status(404)
          .json({
            success: false,

            error:
              "Business was not found in the pending queue.",
          });
      }

      return res.json({
        success: true,

        removed,

        remaining:
          pendingBusinesses.length,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          error:
            error.message,
        });
    }
  }
);


// =====================================================
// CLEAR PENDING BUSINESS QUEUE
//
// DELETE /api/verification/pending
// =====================================================

router.delete(
  "/pending",
  async (req, res) => {
    const removed =
      pendingBusinesses.length;

    pendingBusinesses = [];

    return res.json({
      success: true,

      removed,

      message:
        "Pending business queue cleared.",
    });
  }
);


// =====================================================
// VERIFICATION HISTORY
//
// GET /api/verification/history
// =====================================================

router.get(
  "/history",
  async (req, res) => {
    try {
      const limit =
        req.query?.limit;

      const results =
        getVerificationHistory(
          limit
        );

      return res.json({
        success: true,

        source:
          "Server memory",

        persistent:
          false,

        count:
          results.length,

        results,
      });
    } catch (error) {
      console.error(
        "[HISTORY] Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          error:
            "Failed to load verification history",

          detail:
            error.message,
        });
    }
  }
);


// =====================================================
// GET ONE VERIFICATION RESULT
//
// GET /api/verification/history/:verificationId
// =====================================================

router.get(
  "/history/:verificationId",
  async (req, res) => {
    const result =
      getVerificationById(
        req.params.verificationId
      );

    if (!result) {
      return res
        .status(404)
        .json({
          success: false,

          error:
            "Verification result not found",
        });
    }

    return res.json({
      success: true,

      result,
    });
  }
);


// =====================================================
// CLEAR VERIFICATION HISTORY
//
// DELETE /api/verification/history
// =====================================================

router.delete(
  "/history",
  async (req, res) => {
    const result =
      clearVerificationHistory();

    return res.json(result);
  }
);


// =====================================================
// STORAGE STATUS
//
// GET /api/verification/storage
// =====================================================

router.get(
  "/storage",
  async (req, res) => {
    return res.json({
      success: true,

      pendingBusinesses:
        pendingBusinesses.length,

      verificationStorage:
        getStorageStatus(),
    });
  }
);


// =====================================================
// HEALTH CHECK
//
// GET /api/verification/health
// =====================================================

router.get(
  "/health",
  async (req, res) => {
    return res.json({
      success: true,

      service:
        "Verification Engine",

      database:
        "disabled",

      storage:
        "memory",

      pendingBusinesses:
        pendingBusinesses.length,

      verificationResults:
        getVerificationHistory(
          500
        ).length,

      timestamp:
        new Date().toISOString(),
    });
  }
);


module.exports = router;
