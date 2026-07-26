// =====================================================
// ELEMENTS
// =====================================================

const runBtn = document.getElementById("runBtn");
const activityLog = document.getElementById("activityLog");
const loadResults = document.getElementById("loadResults");
const listFilesBtn = document.getElementById("listFilesBtn");
const loadAllBtn = document.getElementById("loadAllBtn");

let liveInterval = null;


// =====================================================
// LOGGING
// =====================================================

function log(message) {
  const time = new Date().toLocaleTimeString();

  if (!activityLog) {
    console.log(`[${time}] ${message}`);
    return;
  }

  const line = document.createElement("p");
  line.textContent = `[${time}] ${message}`;

  activityLog.prepend(line);
}


// =====================================================
// RESULT DISPLAY
// =====================================================

function showResult(title, data) {
  if (!loadResults) return;

  loadResults.innerHTML = `
    <p><strong>${title}</strong></p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  `;
}


// =====================================================
// SAFE JSON RESPONSE HANDLER
// =====================================================

async function readJsonResponse(response) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}.`
    );
  }

  if (data?.success === false) {
    throw new Error(
      data.error ||
      data.message ||
      "The backend reported that the request failed."
    );
  }

  return data;
}


// =====================================================
// GENERIC POST REQUEST
// =====================================================

async function postLoad(url, title) {
  try {
    log(`Starting: ${title}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await readJsonResponse(response);

    showResult(title, data);

    log(`${title} completed successfully.`);

    return data;

  } catch (error) {
    log(`${title} failed: ${error.message}`);

    showResult(`${title} Error`, {
      success: false,
      error: error.message
    });

    throw error;
  }
}


// =====================================================
// SHOW INPUT FILES
// =====================================================

listFilesBtn?.addEventListener("click", async () => {
  listFilesBtn.disabled = true;
  listFilesBtn.textContent = "Checking Files...";

  try {
    log("Checking files available to the backend...");

    const response = await fetch("/api/load/files");

    const data = await readJsonResponse(response);

    const files = Array.isArray(data.files)
      ? data.files
      : [];

    showResult(
      "Backend Input Files",
      {
        count: files.length,
        files
      }
    );

    log(
      `${files.length} input file(s) found on the backend.`
    );

  } catch (error) {
    log(
      `Unable to list input files: ${error.message}`
    );

    showResult(
      "Input File Error",
      {
        error: error.message
      }
    );

  } finally {
    listFilesBtn.disabled = false;
    listFilesBtn.textContent = "Show Input Files";
  }
});


// =====================================================
// LOAD ALL PROJECT DATA
// =====================================================

loadAllBtn?.addEventListener("click", async () => {
  loadAllBtn.disabled = true;
  loadAllBtn.textContent = "Loading Project Data...";

  try {
    log("Starting full project data import...");
    log("Step 1: Loading business datasets.");
    log("Step 2: Loading business documents.");
    log("Step 3: Loading employee documents.");

    const data = await postLoad(
      "/api/load/all",
      "Load All Project Data"
    );

    const result =
      data?.result ||
      data?.results ||
      {};

    const businesses =
      result?.businesses ||
      result?.businessDataset ||
      null;

    const businessDocuments =
      result?.businessDocuments ||
      null;

    const employeeDocuments =
      result?.employeeDocuments ||
      null;

    if (businesses) {
      log(
        `Business dataset processed: ${
          businesses.count ?? "complete"
        } record(s).`
      );
    }

    if (businessDocuments) {
      log(
        `Business documents processed: ${
          businessDocuments.count ?? "complete"
        }.`
      );
    }

    if (employeeDocuments) {
      log(
        `Employee documents processed: ${
          employeeDocuments.count ?? "complete"
        }.`
      );
    }

    log("All project data finished loading.");

  } catch (error) {
    log(
      `Full project import stopped: ${error.message}`
    );

  } finally {
    loadAllBtn.disabled = false;
    loadAllBtn.textContent = "Load All Project Data";
  }
});


// =====================================================
// LIVE CRAWLER VIEWER
// =====================================================

function stopLiveViewer() {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
}


function startLiveViewer() {
  const crawlerScreen =
    document.getElementById("crawlerScreen");

  if (!crawlerScreen) return;

  crawlerScreen.innerHTML = `
    <div class="crawler-message">
      <h3>Preparing crawler...</h3>
      <p>
        Chromium is preparing to research the selected business.
      </p>
    </div>
  `;

  setTimeout(() => {
    crawlerScreen.innerHTML = `
      <img
        id="liveCrawlerImage"
        src="/screenshots/current.png?t=${Date.now()}"
        alt="Live crawler screenshot"
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
        "
      />
    `;

    liveInterval = setInterval(() => {
      const image =
        document.getElementById(
          "liveCrawlerImage"
        );

      if (image) {
        image.src =
          `/screenshots/current.png?t=${Date.now()}`;
      }
    }, 1000);

  }, 1500);
}


// =====================================================
// CRAWLER ERROR
// =====================================================

function showCrawlerError(message) {
  const crawlerScreen =
    document.getElementById("crawlerScreen");

  if (!crawlerScreen) return;

  crawlerScreen.innerHTML = `
    <div class="crawler-message crawler-error">
      <h3>Verification could not be completed</h3>
      <p>${message}</p>
    </div>
  `;
}


// =====================================================
// DISPLAY VERIFICATION RESULT
// =====================================================

function displayVerificationResult(result) {
  const confidence = Math.max(
    0,
    Math.min(
      100,
      Number(result?.confidence) || 0
    )
  );


  const businessName =
    result?.businessName ||
    result?.business_name ||
    "Unknown Business";


  const status =
    result?.status ||
    "needs_review";


  // ---------------------------------------------------
  // TITLE
  // ---------------------------------------------------

  const scanTitle =
    document.getElementById(
      "scanTitle"
    );

  if (scanTitle) {
    scanTitle.textContent =
      `${businessName} - ${status}`;
  }


  // ---------------------------------------------------
  // CONFIDENCE
  // ---------------------------------------------------

  const confidenceScore =
    document.getElementById(
      "confidenceScore"
    );

  if (confidenceScore) {
    confidenceScore.textContent =
      `${confidence}%`;
  }


  const scoreRing =
    document.querySelector(
      ".score-ring"
    );

  if (scoreRing) {
    scoreRing.style.background =
      `conic-gradient(
        #8b5cf6 ${confidence}%,
        #e5e7eb ${confidence}%
      )`;
  }


  // ---------------------------------------------------
  // WEBSITE EVIDENCE
  // ---------------------------------------------------

  const websiteEvidence =
    document.getElementById(
      "websiteEvidence"
    );

  if (websiteEvidence) {
    websiteEvidence.textContent =
      result?.reachable
        ? "✓ Website successfully reached"
        : "○ Website could not be verified";
  }


  // ---------------------------------------------------
  // PHONE EVIDENCE
  // ---------------------------------------------------

  const phones =
    Array.isArray(result?.phones)
      ? result.phones
      : [];


  const phoneEvidence =
    document.getElementById(
      "phoneEvidence"
    );

  if (phoneEvidence) {
    phoneEvidence.textContent =
      phones.length > 0
        ? `✓ ${phones.length} phone number(s) extracted`
        : result?.phoneFound
          ? "✓ Phone evidence detected"
          : "○ No phone evidence found";
  }


  // ---------------------------------------------------
  // ADDRESS EVIDENCE
  // ---------------------------------------------------

  const addresses =
    Array.isArray(result?.addresses)
      ? result.addresses
      : [];


  const addressEvidence =
    document.getElementById(
      "addressEvidence"
    );

  if (addressEvidence) {
    addressEvidence.textContent =
      addresses.length > 0
        ? `✓ ${addresses.length} address candidate(s) extracted`
        : result?.addressFound
          ? "✓ Address evidence detected"
          : "○ No address evidence found";
  }


  // ---------------------------------------------------
  // EMAIL EVIDENCE
  // ---------------------------------------------------

  const emails =
    Array.isArray(result?.emails)
      ? result.emails
      : [];


  // ---------------------------------------------------
  // FULL EVIDENCE
  // ---------------------------------------------------

  showResult(
    "Verification Evidence",
    {
      businessName,

      originalWebsite:
        result?.website || null,

      finalUrl:
        result?.finalUrl || null,

      reachable:
        result?.reachable ?? false,

      businessNameFound:
        result?.businessNameFound ?? false,

      confidence,

      status,

      phones,

      emails,

      addresses,

      pagesCrawled:
        result?.pagesCrawled || 0,

      pagesVisited:
        Array.isArray(
          result?.pagesVisited
        )
          ? result.pagesVisited
          : [],

      crawledAt:
        result?.crawledAt || null,

      attempts:
        Array.isArray(
          result?.attempts
        )
          ? result.attempts
          : []
    }
  );
}


// =====================================================
// RUN TEST VERIFICATION
// =====================================================

runBtn?.addEventListener("click", async () => {
  stopLiveViewer();

  log("Starting business verification...");
  log(
    "Requesting the first business from the dataset..."
  );

  runBtn.disabled = true;
  runBtn.textContent = "Scanning...";

  startLiveViewer();

  try {

    // -------------------------------------------------
    // BACKEND CHOOSES FIRST BUSINESS FROM CSV
    // -------------------------------------------------

    const response = await fetch(
      "/api/verification/run-csv-first",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );


    const data =
      await readJsonResponse(
        response
      );


    if (!data.result) {
      throw new Error(
        "The backend completed the request but returned no verification result."
      );
    }


    const result =
      data.result;


    const businessName =
      result.businessName ||
      result.business_name ||
      data.scannedBusiness
        ?.business_name ||
      "Unknown Business";


    // -------------------------------------------------
    // CONSOLE ACTIVITY
    // -------------------------------------------------

    log(
      `Business selected: ${businessName}`
    );


    if (result.website) {
      log(
        `Website investigated: ${result.website}`
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


    // -------------------------------------------------
    // DISPLAY RESULT
    // -------------------------------------------------

    displayVerificationResult({
      ...result,
      businessName
    });


    log(
      `Verification complete: ${businessName} | Confidence: ${
        Number(result.confidence) || 0
      }%`
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
        error: error.message
      }
    );

  } finally {

    stopLiveViewer();

    runBtn.disabled = false;
    runBtn.textContent =
      "Run Test Scan";
  }
});
