const runBtn = document.getElementById("runBtn");
const activityLog = document.getElementById("activityLog");
const loadResults = document.getElementById("loadResults");

let liveInterval = null;


// =====================================================
// HELPERS
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


function showResult(title, data) {
  if (!loadResults) return;

  loadResults.innerHTML = `
    <p><strong>${title}</strong></p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  `;
}


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


function stopLiveViewer() {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
}


function startLiveViewer() {
  const crawlerScreen = document.getElementById("crawlerScreen");

  if (!crawlerScreen) return;

  crawlerScreen.innerHTML = `
    <div>
      <h3>Preparing crawler...</h3>
      <p>Waiting for Chromium to capture the researched page.</p>
    </div>
  `;

  setTimeout(() => {
    crawlerScreen.innerHTML = `
      <img
        id="liveCrawlerImage"
        src="/screenshots/current.png?t=${Date.now()}"
        alt="Live crawler screenshot"
        style="width:100%; height:100%; object-fit:cover;"
      />
    `;

    liveInterval = setInterval(() => {
      const image = document.getElementById("liveCrawlerImage");

      if (image) {
        image.src =
          `/screenshots/current.png?t=${Date.now()}`;
      }
    }, 1000);
  }, 1500);
}


function showCrawlerError(message) {
  const crawlerScreen = document.getElementById("crawlerScreen");

  if (!crawlerScreen) return;

  crawlerScreen.innerHTML = `
    <div>
      <h3>Verification could not be completed</h3>
      <p>${message}</p>
    </div>
  `;
}


// =====================================================
// GENERIC FILE LOADER
// =====================================================

async function postLoad(url, title) {
  try {
    log(`Loading ${title}...`);

    const response = await fetch(url, {
      method: "POST"
    });

    const data = await readJsonResponse(response);

    showResult(title, data);

    log(`${title} loaded successfully.`);
  } catch (error) {
    log(`Error loading ${title}: ${error.message}`);
    showResult(`${title} Error`, {
      error: error.message
    });
  }
}


// =====================================================
// INPUT FILES
// =====================================================

document
  .getElementById("listFilesBtn")
  ?.addEventListener("click", async () => {
    try {
      log("Checking backend input files...");

      const response = await fetch("/api/load/files");

      const data = await readJsonResponse(response);

      showResult("Input Files", data);

      log("Input file list loaded.");
    } catch (error) {
      log(`Error listing files: ${error.message}`);
    }
  });


// =====================================================
// BUSINESS DATASET
// =====================================================

document
  .getElementById("loadBusinessBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/business-dataset",
      "Business Dataset"
    );
  });


// =====================================================
// BUSINESS DOCUMENTS
// =====================================================

document
  .getElementById("loadBusinessLicenseBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/BusinessLicense.docx",
      "Business License"
    );
  });


document
  .getElementById("loadVendorBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/VendorRegistrationForm.docx",
      "Vendor Registration"
    );
  });


document
  .getElementById("loadW9Btn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/W9FormSample.docx",
      "W9 Form"
    );
  });


document
  .getElementById("loadInsuranceBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/InsuranceCertificate.docx",
      "Insurance Certificate"
    );
  });


document
  .getElementById("loadInvoiceBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/InvoiceSample.docx",
      "Invoice"
    );
  });


// =====================================================
// EMPLOYEE DOCUMENTS
// =====================================================

document
  .getElementById("loadOnboardingBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/EmployeeOnboardingForm.docx",
      "Employee Onboarding"
    );
  });


document
  .getElementById("loadEmploymentBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/EmploymentVerificationLetter.docx",
      "Employment Verification"
    );
  });


document
  .getElementById("loadBackgroundBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/BackgroundCheckReport.docx",
      "Background Check"
    );
  });


document
  .getElementById("loadTrainingBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/EmployeeTrainingRecord.docx",
      "Employee Training"
    );
  });


document
  .getElementById("loadComplianceBtn")
  ?.addEventListener("click", () => {
    postLoad(
      "/api/load/file/ComplianceCertificate.docx",
      "Compliance Certificate"
    );
  });


// =====================================================
// VERIFICATION RESULT UI
// =====================================================

function displayVerificationResult(result) {
  const confidence = Math.max(
    0,
    Math.min(100, Number(result?.confidence) || 0)
  );

  const businessName =
    result?.businessName ||
    result?.business_name ||
    "Unknown Business";

  const status =
    result?.status ||
    "needs_review";


  const scanTitle =
    document.getElementById("scanTitle");

  if (scanTitle) {
    scanTitle.textContent =
      `${businessName} - ${status}`;
  }


  const confidenceScore =
    document.getElementById("confidenceScore");

  if (confidenceScore) {
    confidenceScore.textContent =
      `${confidence}%`;
  }


  const scoreRing =
    document.querySelector(".score-ring");

  if (scoreRing) {
    scoreRing.style.background =
      `conic-gradient(
        #8b5cf6 ${confidence}%,
        #e5e7eb ${confidence}%
      )`;
  }


  const websiteEvidence =
    document.getElementById("websiteEvidence");

  if (websiteEvidence) {
    websiteEvidence.textContent =
      result?.reachable
        ? "✓ Website successfully reached"
        : "○ Website could not be verified";
  }


  const phones =
    Array.isArray(result?.phones)
      ? result.phones
      : [];

  const phoneEvidence =
    document.getElementById("phoneEvidence");

  if (phoneEvidence) {
    phoneEvidence.textContent =
      phones.length > 0
        ? `✓ ${phones.length} phone number(s) extracted`
        : result?.phoneFound
          ? "✓ Phone evidence detected"
          : "○ No phone evidence found";
  }


  const addresses =
    Array.isArray(result?.addresses)
      ? result.addresses
      : [];

  const addressEvidence =
    document.getElementById("addressEvidence");

  if (addressEvidence) {
    addressEvidence.textContent =
      addresses.length > 0
        ? `✓ ${addresses.length} address candidate(s) extracted`
        : result?.addressFound
          ? "✓ Address evidence detected"
          : "○ No address evidence found";
  }


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

      emails:
        Array.isArray(result?.emails)
          ? result.emails
          : [],

      addresses,

      pagesCrawled:
        result?.pagesCrawled || 0,

      pagesVisited:
        Array.isArray(result?.pagesVisited)
          ? result.pagesVisited
          : [],

      crawledAt:
        result?.crawledAt || null,

      attempts:
        Array.isArray(result?.attempts)
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
  log("Requesting the first business from the dataset...");

  runBtn.disabled = true;
  runBtn.textContent = "Scanning...";

  startLiveViewer();

  try {
    /*
      IMPORTANT:

      /run-csv-first chooses the business on the BACKEND.

      Therefore we do NOT send Microsoft or another
      hard-coded company from this frontend.
    */

    const response = await fetch(
      "/api/verification/run-csv-first",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );


    const data = await readJsonResponse(response);


    if (!data.result) {
      throw new Error(
        "The backend completed the request but returned no verification result."
      );
    }


    const result = data.result;


    const businessName =
      result.businessName ||
      result.business_name ||
      data.scannedBusiness?.business_name ||
      "Unknown Business";


    log(`Business selected: ${businessName}`);


    if (result.website) {
      log(`Website investigated: ${result.website}`);
    }


    if (result.finalUrl) {
      log(`Final page reached: ${result.finalUrl}`);
    }


    if (Array.isArray(result.pagesVisited)) {
      log(
        `Crawler inspected ${result.pagesVisited.length} page(s).`
      );
    }


    if (Array.isArray(result.phones)) {
      log(
        `Phone candidates extracted: ${result.phones.length}`
      );
    }


    if (Array.isArray(result.emails)) {
      log(
        `Email candidates extracted: ${result.emails.length}`
      );
    }


    if (Array.isArray(result.addresses)) {
      log(
        `Address candidates extracted: ${result.addresses.length}`
      );
    }


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

    log(`Verification failed: ${error.message}`);

    showCrawlerError(error.message);

    showResult(
      "Verification Error",
      {
        error: error.message
      }
    );

  } finally {

    stopLiveViewer();

    runBtn.disabled = false;
    runBtn.textContent = "Run Test Scan";

  }
});
