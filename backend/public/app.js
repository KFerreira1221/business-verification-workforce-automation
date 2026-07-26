// =====================================================
// VERIFY NEXT BUSINESS FROM POSTGRESQL
// =====================================================

const verifyNextBtn =
  document.getElementById("verifyNextBtn");


verifyNextBtn?.addEventListener(
  "click",
  async () => {

    stopLiveViewer();

    verifyNextBtn.disabled = true;
    verifyNextBtn.textContent =
      "Verifying Business...";

    log(
      "Requesting next unverified business from PostgreSQL..."
    );

    startLiveViewer();


    try {

      const response = await fetch(
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
        await readJsonResponse(
          response
        );


      // ===============================================
      // EVERYTHING HAS ALREADY BEEN VERIFIED
      // ===============================================

      if (data.complete) {

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

        const crawlerScreen =
          document.getElementById(
            "crawlerScreen"
          );

        if (crawlerScreen) {
          crawlerScreen.innerHTML = `
            <div class="crawler-message">
              <h3>Verification Complete</h3>
              <p>
                No unverified businesses remain.
              </p>
            </div>
          `;
        }

        return;
      }


      // ===============================================
      // GET BUSINESS + CRAWLER RESULT
      // ===============================================

      const business =
        data.business || {};

      const result =
        data.result;


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


      // ===============================================
      // ACTIVITY CONSOLE
      // ===============================================

      log(
        `Database business selected: ${businessName}`
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


      // ===============================================
      // DISPLAY RESULT
      // ===============================================

      displayVerificationResult({
        ...result,
        businessName
      });


      log(
        `Verification complete: ${businessName} | Confidence: ${
          Number(result.confidence) || 0
        }%`
      );


      log(
        "Verification result saved to PostgreSQL."
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
          error:
            error.message
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
