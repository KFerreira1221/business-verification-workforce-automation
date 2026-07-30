// =====================================================
// ELEMENT REFERENCES
// =====================================================

const apiStatus =
  document.getElementById("apiStatus");

const dbStatus =
  document.getElementById("dbStatus");

const chromiumStatus =
  document.getElementById("chromiumStatus");

const ollamaStatus =
  document.getElementById("ollamaStatus");

const runBtn =
  document.getElementById("runBtn");

const verifyNextBtn =
  document.getElementById("verifyNextBtn");

const listFilesBtn =
  document.getElementById("listFilesBtn");

const loadAllBtn =
  document.getElementById("loadAllBtn");

const crawlerUrl =
  document.getElementById("crawlerUrl");

const crawlerScreen =
  document.getElementById("crawlerScreen");

const scanTitle =
  document.getElementById("scanTitle");

const confidenceScore =
  document.getElementById("confidenceScore");

const websiteEvidence =
  document.getElementById("websiteEvidence");

const phoneEvidence =
  document.getElementById("phoneEvidence");

const addressEvidence =
  document.getElementById("addressEvidence");

const loadResults =
  document.getElementById("loadResults");

const activityLog =
  document.getElementById("activityLog");

let liveViewerTimer = null;


// =====================================================
// SAFE HTML
// =====================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =====================================================
// ACTIVITY LOG
// =====================================================

function log(message) {
  if (!activityLog) {
    return;
  }

  const time =
    new Date().toLocaleTimeString();

  const line =
    document.createElement("p");

  line.textContent =
    `[${time}] ${message}`;

  activityLog.appendChild(line);
  activityLog.scrollTop =
    activityLog.scrollHeight;
}


// =====================================================
// RESPONSE HELPER
// =====================================================

async function readJsonResponse(response) {
  const text =
    await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Backend returned an invalid response: ${text.slice(0, 150)}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}


// =====================================================
// RESULT DISPLAY
// =====================================================

function showResult(title, data) {
  if (!loadResults) {
    return;
  }

  loadResults.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <pre>${escapeHtml(
      JSON.stringify(data, null, 2)
    )}</pre>
  `;
}


// =====================================================
// LIVE CRAWLER VIEWER
// =====================================================

function startLiveViewer() {
  stopLiveViewer();

  const messages = [
    "Launching Chromium...",
    "Opening business website...",
    "Reviewing homepage...",
    "Searching contact information...",
    "Searching phone numbers...",
    "Searching email addresses...",
    "Checking company address...",
    "Calculating verification confidence...",
    "Preparing verification results..."
  ];

  let messageIndex = 0;

  if (crawlerScreen) {
    crawlerScreen.innerHTML = `
      <div class="crawler-message">
        <div class="globe">🌐</div>
        <h3 id="liveViewerTitle">
          ${messages[0]}
        </h3>
        <p>
          The verification engine is currently working.
        </p>
      </div>
    `;
  }

  liveViewerTimer = setInterval(() => {
    messageIndex =
      (messageIndex + 1) %
      messages.length;

    const title =
      document.getElementById(
        "liveViewerTitle"
      );

    if (title) {
      title.textContent =
        messages[messageIndex];
    }
  }, 1800);
}


function stopLiveViewer() {
  if (liveViewerTimer) {
    clearInterval(liveViewerTimer);
    liveViewerTimer = null;
  }
}


// =====================================================
// CRAWLER ERROR DISPLAY
// =====================================================

function showCrawlerError(message) {
  if (crawlerScreen) {
    crawlerScreen.innerHTML = `
      <div class="crawler-message">
        <h3>Verification Failed</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  if (scanTitle) {
    scanTitle.textContent =
      "Verification Error";
  }

  if (confidenceScore) {
    confidenceScore.textContent =
      "0%";
  }
}


// =====================================================
// NORMALIZATION HELPERS
// =====================================================

function hasEvidence(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (
    typeof value === "string"
  ) {
    return value.trim().length > 0;
  }

  return Boolean(value);
}


function getConfidence(result) {
  return Number(
    result?.confidence ??
    result?.confidence_score ??
    result?.confidenceScore ??
    0
  );
}


// =====================================================
// DISPLAY VERIFICATION RESULT
// =====================================================

function displayVerificationResult(result = {}) {
  const businessName =
    result.businessName ||
    result.business_name ||
    "Unknown Business";

  const confidence =
    getConfidence(result);

  const phones =
    result.phones ||
    result.phoneNumbers ||
    [];

  const emails =
    result.emails ||
    [];

  const addresses =
    result.addresses ||
    [];

  const websiteFound =
    Boolean(
      result.reachable ||
      result.websiteVerified ||
      result.website_verified ||
      result.finalUrl
    );

  const phoneFound =
    hasEvidence(phones) ||
    result.phoneFound ||
    result.phone_found;

  const addressFound =
    hasEvidence(addresses) ||
    result.addressFound ||
    result.address_found;

  if (scanTitle) {
    scanTitle.textContent =
      businessName;
  }

  if (confidenceScore) {
    confidenceScore.textContent =
      `${confidence}%`;
  }

  if (websiteEvidence) {
    websiteEvidence.textContent =
      websiteFound
        ? "✓ Website evidence found"
        : "○ Website evidence not found";
  }

  if (phoneEvidence) {
    phoneEvidence.textContent =
      phoneFound
        ? `✓ Phone evidence found${
            Array.isArray(phones) &&
            phones.length
              ? ` (${phones.length})`
              : ""
          }`
        : "○ Phone evidence not found";
  }

  if (addressEvidence) {
    addressEvidence.textContent =
      addressFound
        ? `✓ Address evidence found${
            Array.isArray(addresses) &&
            addresses.length
              ? ` (${addresses.length})`
              : ""
          }`
        : "○ Address evidence not found";
  }

  if (crawlerUrl) {
    crawlerUrl.textContent =
      result.finalUrl ||
      result.website ||
      "crawler://verification-complete";
  }

  const pagesVisited =
    Array.isArray(result.pagesVisited)
      ? result.pagesVisited
      : [];

  const pageItems =
    pagesVisited.length
      ? pagesVisited
          .slice(0, 8)
          .map((page) => {
            const pageUrl =
              typeof page === "string"
                ? page
                : page.url ||
                  page.finalUrl ||
                  "Page visited";

            return `
              <li>
                ${escapeHtml(pageUrl)}
              </li>
            `;
          })
          .join("")
      : "<li>No page list was returned.</li>";

  if (crawlerScreen) {
    crawlerScreen.innerHTML = `
      <div class="crawler-message">
        <h3>
          Verification Complete
        </h3>

        <p>
          <strong>
            ${escapeHtml(businessName)}
          </strong>
        </p>

        <p>
          Confidence:
          <strong>${confidence}%</strong>
        </p>

        <p>
          Phones found:
          ${Array.isArray(phones) ? phones.length : 0}
        </p>

        <p>
          Emails found:
          ${Array.isArray(emails) ? emails.length : 0}
        </p>

        <p>
          Addresses found:
          ${Array.isArray(addresses) ? addresses.length : 0}
        </p>

        <p>
          Pages inspected:
          ${pagesVisited.length}
        </p>

        <ul>
          ${pageItems}
        </ul>
      </div>
    `;
  }

  showResult(
    "Latest Verification Result",
    result
  );
}


// =====================================================
// CHECK SYSTEM STATUS
// =====================================================

async function checkSystemStatus() {
  try {
    const response =
      await fetch("/health");

    const data =
      await readJsonResponse(response);

    if (apiStatus) {
      apiStatus.textContent =
        "Online";
    }

    if (dbStatus) {
      dbStatus.textContent =
        data.database === "connected"
          ? "Connected"
          : data.database === "disabled"
            ? "Demo Mode"
            : "Not Connected";
    }

    log("API health check successful.");
    log(
      `Database status: ${
        data.database || "unknown"
      }`
    );
  } catch (error) {
    if (apiStatus) {
      apiStatus.textContent =
        "Error";
    }

    if (dbStatus) {
      dbStatus.textContent =
        "Not Connected";
    }

    log(
      `Health check failed: ${error.message}`
    );
  }

  try {
    const response =
      await fetch("/api/system/status");

    const status =
      await readJsonResponse(response);

    if (chromiumStatus) {
      chromiumStatus.textContent =
        status.chromium === "ready"
          ? "Ready"
          : status.chromium === "unknown"
            ? "Pending"
            : status.chromium || "Unknown";
    }

    if (ollamaStatus) {
      ollamaStatus.textContent =
        status.ollama || "Pending";
    }
  } catch (error) {
    log(
      `System status check failed: ${error.message}`
    );
  }
}


// =====================================================
// SHOW INPUT FILES
// =====================================================

listFilesBtn?.addEventListener(
  "click",
  async () => {
    listFilesBtn.disabled = true;
    listFilesBtn.textContent =
      "Loading Files...";

    log("Requesting project input files...");

    try {
      const response =
        await fetch("/api/load/files");

      const data =
        await readJsonResponse(response);

      const files =
        Array.isArray(data.files)
          ? data.files
          : [];

      if (files.length === 0) {
        loadResults.innerHTML = `
          <p>
            No project input files were found.
          </p>
        `;

        log("No input files were found.");
        return;
      }

      loadResults.innerHTML = `
        <h3>
          Input Files (${files.length})
        </h3>

        <ul>
          ${files
            .map((file) => {
              const fileName =
                typeof file === "string"
                  ? file
                  : file.name ||
                    file.fileName ||
                    file.path ||
                    JSON.stringify(file);

              return `
                <li>
                  ${escapeHtml(fileName)}
                </li>
              `;
            })
            .join("")}
        </ul>
      `;

      log(
        `${files.length} project input file(s) found.`
      );
    } catch (error) {
      log(
        `Unable to list files: ${error.message}`
      );

      showResult(
        "Input File Error",
        {
          success: false,
          error: error.message
        }
      );
    } finally {
      listFilesBtn.disabled = false;
      listFilesBtn.textContent =
        "Show Input Files";
    }
  }
);


// =====================================================
// LOAD ALL PROJECT DATA
// =====================================================

loadAllBtn?.addEventListener(
  "click",
  async () => {
    loadAllBtn.disabled = true;
    loadAllBtn.textContent =
      "Loading Project Data...";

    log(
      "Starting full project data import..."
    );

    loadResults.innerHTML = `
      <p>
        Loading business data into the demo queue...
      </p>
    `;

    try {
      const response =
        await fetch("/api/load/all", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          }
        });

      const data =
        await readJsonResponse(response);

      showResult(
        "Project Data Loaded",
        data
      );

      log(
        data.message ||
        "All project data loaded successfully."
      );

      await checkSystemStatus();
    } catch (error) {
      log(
        `Project data import failed: ${error.message}`
      );

      showResult(
        "Project Data Import Error",
        {
          success: false,
          error: error.message
        }
      );
    } finally {
      loadAllBtn.disabled = false;
      loadAllBtn.textContent =
        "Load All Project Data";
    }
  }
);


// =====================================================
// RUN MICROSOFT TEST SCAN
// =====================================================

runBtn?.addEventListener(
  "click",
  async () => {
    stopLiveViewer();

    runBtn.disabled = true;
    runBtn.textContent =
      "Running Test Scan...";

    log(
      "Starting Microsoft Chromium test scan..."
    );

    startLiveViewer();

    if (crawlerUrl) {
      crawlerUrl.textContent =
        "https://www.microsoft.com";
    }

    try {
      const response =
        await fetch(
          "/api/verification/run-test",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );

      const data =
        await readJsonResponse(response);

      const result =
        data.result ||
        data.verification ||
        data.latestVerification;

      if (!result) {
        throw new Error(
          "Backend returned no crawler test result."
        );
      }

      displayVerificationResult({
        ...result,
        businessName:
          result.businessName ||
          "Microsoft"
      });

      log(
        `Test scan completed with ${getConfidence(result)}% confidence.`
      );
    } catch (error) {
      log(
        `Test scan failed: ${error.message}`
      );

      showCrawlerError(
        error.message
      );

      showResult(
        "Crawler Test Error",
        {
          success: false,
          error: error.message
        }
      );
    } finally {
      stopLiveViewer();

      runBtn.disabled = false;
      runBtn.textContent =
        "Run Test Scan";
    }
  }
);


// =====================================================
// VERIFY NEXT BUSINESS FROM DEMO QUEUE
// =====================================================

verifyNextBtn?.addEventListener(
  "click",
  async () => {
    stopLiveViewer();

    verifyNextBtn.disabled = true;
    verifyNextBtn.textContent =
      "Verifying Business...";

    log(
      "Requesting next unverified business from the demo queue..."
    );

    startLiveViewer();

    try {
      const response =
        await fetch(
          "/api/verification/run-next",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );

      const data =
        await readJsonResponse(response);

      if (data.complete && !data.result && !data.verification) {
        stopLiveViewer();

        log(
          "No unverified businesses remain."
        );

        showResult(
          "Verification Complete",
          {
            message:
              data.message ||
              "All loaded businesses have been processed."
          }
        );

        if (crawlerScreen) {
          crawlerScreen.innerHTML = `
            <div class="crawler-message">
              <h3>
                Verification Complete
              </h3>

              <p>
                No unverified businesses remain.
              </p>
            </div>
          `;
        }

        return;
      }

      const business =
        data.business ||
        data.item ||
        {};

      const result =
        data.result ||
        data.verification ||
        data.latestVerification;

      if (!result) {
        throw new Error(
          "Backend returned no verification result."
        );
      }

      const businessName =
        business.business_name ||
        result.businessName ||
        result.business_name ||
        "Unknown Business";

      log(
        `Business selected: ${businessName}`
      );

      if (business.business_id) {
        log(
          `Business ID: ${business.business_id}`
        );
      }

      if (business.website) {
        log(
          `Stored website: ${business.website}`
        );
      }

      if (result.finalUrl) {
        log(
          `Final page reached: ${result.finalUrl}`
        );
      }

      if (
        Array.isArray(
          result.pagesVisited
        )
      ) {
        log(
          `Crawler inspected ${result.pagesVisited.length} page(s).`
        );
      }

      if (
        Array.isArray(
          result.phones
        )
      ) {
        log(
          `Phone candidates extracted: ${result.phones.length}`
        );
      }

      if (
        Array.isArray(
          result.emails
        )
      ) {
        log(
          `Email candidates extracted: ${result.emails.length}`
        );
      }

      if (
        Array.isArray(
          result.addresses
        )
      ) {
        log(
          `Address candidates extracted: ${result.addresses.length}`
        );
      }

      if (
        result.screenshotAvailable
      ) {
        log(
          "Chromium screenshot captured successfully."
        );
      }

      displayVerificationResult({
        ...result,
        businessName
      });

      log(
        `Verification complete: ${businessName} | Confidence: ${getConfidence(result)}%`
      );

      log(
        "Verification result stored for this demo session."
      );
    } catch (error) {
      stopLiveViewer();

      log(
        `Verification failed: ${error.message}`
      );

      showCrawlerError(
        error.message
      );

      showResult(
        "Verification Error",
        {
          success: false,
          error: error.message
        }
      );
    } finally {
      stopLiveViewer();

      verifyNextBtn.disabled =
        false;

      verifyNextBtn.textContent =
        "Verify Next Business";
    }
  }
);


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    log(
      "Backend interface initialized."
    );

    await checkSystemStatus();
  }
);
