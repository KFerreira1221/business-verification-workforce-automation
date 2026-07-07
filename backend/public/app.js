const runBtn = document.getElementById("runBtn");
const activityLog = document.getElementById("activityLog");
const loadResults = document.getElementById("loadResults");

function log(message) {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement("p");
  line.textContent = `[${time}] ${message}`;
  activityLog.prepend(line);
}

function showResult(title, data) {
  loadResults.innerHTML = `
    <p><strong>${title}</strong></p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  `;
}

async function postLoad(url, title) {
  try {
    log(`Loading ${title}...`);

    const response = await fetch(url, { method: "POST" });
    const data = await response.json();

    showResult(title, data);
    log(`${title} complete`);
  } catch (error) {
    log(`Error loading ${title}: ${error.message}`);
  }
}

document.getElementById("listFilesBtn").addEventListener("click", async () => {
  try {
    log("Listing input files...");

    const response = await fetch("/api/load/files");
    const data = await response.json();

    showResult("Input Files", data);
    log("Input files loaded");
  } catch (error) {
    log("Error listing files: " + error.message);
  }
});

document.getElementById("loadBusinessBtn").addEventListener("click", () => {
  postLoad("/api/load/business-dataset", "Business Dataset");
});

document.getElementById("loadBusinessLicenseBtn").addEventListener("click", () => {
  postLoad("/api/load/file/BusinessLicense.docx", "Business License");
});

document.getElementById("loadVendorBtn").addEventListener("click", () => {
  postLoad("/api/load/file/VendorRegistrationForm.docx", "Vendor Registration");
});

document.getElementById("loadW9Btn").addEventListener("click", () => {
  postLoad("/api/load/file/W9FormSample.docx", "W9 Form");
});

document.getElementById("loadInsuranceBtn").addEventListener("click", () => {
  postLoad("/api/load/file/InsuranceCertificate.docx", "Insurance Certificate");
});

document.getElementById("loadInvoiceBtn").addEventListener("click", () => {
  postLoad("/api/load/file/InvoiceSample.docx", "Invoice");
});

document.getElementById("loadOnboardingBtn").addEventListener("click", () => {
  postLoad("/api/load/file/EmployeeOnboardingForm.docx", "Employee Onboarding");
});

document.getElementById("loadEmploymentBtn").addEventListener("click", () => {
  postLoad("/api/load/file/EmploymentVerificationLetter.docx", "Employment Verification");
});

document.getElementById("loadBackgroundBtn").addEventListener("click", () => {
  postLoad("/api/load/file/BackgroundCheckReport.docx", "Background Check");
});

document.getElementById("loadTrainingBtn").addEventListener("click", () => {
  postLoad("/api/load/file/EmployeeTrainingRecord.docx", "Employee Training");
});

document.getElementById("loadComplianceBtn").addEventListener("click", () => {
  postLoad("/api/load/file/ComplianceCertificate.docx", "Compliance Certificate");
});

runBtn.addEventListener("click", async () => {
  log("Starting Chromium verification scan...");

  let liveInterval;

  document.getElementById("crawlerScreen").innerHTML = `
    <div>
      <h3>Preparing live crawler screen...</h3>
      <p>Screenshot will appear once Chromium captures the page.</p>
    </div>
  `;

  setTimeout(() => {
    document.getElementById("crawlerScreen").innerHTML = `
      <img id="liveCrawlerImage"
        src="/screenshots/current.png?t=${Date.now()}"
        style="width:100%; height:100%; object-fit:cover;" />
    `;

    liveInterval = setInterval(() => {
      const img = document.getElementById("liveCrawlerImage");
      if (img) img.src = "/screenshots/current.png?t=" + Date.now();
    }, 1000);
  }, 1500);

  try {
    const response = await fetch("/api/verification/run-csv-first", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: "Microsoft",
        website: "https://www.microsoft.com"
      })
    });

    const data = await response.json();
    const result = data.result;

    if (liveInterval) clearInterval(liveInterval);

    document.getElementById("scanTitle").textContent = `${result.businessName} - ${result.status}`;
    document.getElementById("confidenceScore").textContent = `${result.confidence}%`;

    document.querySelector(".score-ring").style.background =
      `conic-gradient(#8b5cf6 ${result.confidence}%, #e5e7eb 0%)`;

    document.getElementById("websiteEvidence").textContent =
      result.website ? "✓ Website evidence found" : "○ Website evidence missing";

    document.getElementById("phoneEvidence").textContent =
      result.phoneFound ? "✓ Phone evidence found" : "○ Phone evidence missing";

    document.getElementById("addressEvidence").textContent =
      result.addressFound ? "✓ Address evidence found" : "○ Address evidence missing";

    log(`Scan complete: ${result.businessName} | Confidence: ${result.confidence}%`);
  } catch (error) {
    if (liveInterval) clearInterval(liveInterval);
    log("Error running scan: " + error.message);
  }
});