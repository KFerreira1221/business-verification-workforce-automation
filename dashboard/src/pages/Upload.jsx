import { useMemo, useState } from "react";

const DOCUMENTS = [
  {
    id: 1,
    name: "Business License",
    fileName: "BusinessLicense.docx",
    category: "Business",
    subject: "Business 2 LLC",
    detailLabel: "License",
    detailValue: "LIC-1001",
    status: "Available",
  },
  {
    id: 2,
    name: "Background Check Report",
    fileName: "BackgroundCheckReport.docx",
    category: "HR",
    subject: "Robert Wilson",
    detailLabel: "Status",
    detailValue: "Eligible",
    status: "Available",
  },
  {
    id: 3,
    name: "Compliance Certificate",
    fileName: "ComplianceCertificate.docx",
    category: "Compliance",
    subject: "Michael Davis",
    detailLabel: "Training",
    detailValue: "Safety",
    status: "Available",
  },
  {
    id: 4,
    name: "Employee Onboarding Form",
    fileName: "EmployeeOnboardingForm.docx",
    category: "HR",
    subject: "John Smith",
    detailLabel: "Department",
    detailValue: "Logistics",
    status: "Available",
  },
  {
    id: 5,
    name: "Employee Training Record",
    fileName: "EmployeeTrainingRecord.docx",
    category: "Compliance",
    subject: "Jessica Brown",
    detailLabel: "Course",
    detailValue: "Cybersecurity",
    status: "Available",
  },
  {
    id: 6,
    name: "Employment Verification Letter",
    fileName: "EmploymentVerificationLetter.docx",
    category: "HR",
    subject: "Sarah Johnson",
    detailLabel: "Employer",
    detailValue: "Business 1 LLC",
    status: "Available",
  },
  {
    id: 7,
    name: "Insurance Certificate",
    fileName: "InsuranceCertificate.docx",
    category: "Insurance",
    subject: "Business 5 LLC",
    detailLabel: "Coverage",
    detailValue: "General Liability",
    status: "Available",
  },
  {
    id: 8,
    name: "Invoice Sample",
    fileName: "InvoiceSample.docx",
    category: "Financial",
    subject: "INV-1001",
    detailLabel: "Amount",
    detailValue: "$4,250",
    status: "Available",
  },
  {
    id: 9,
    name: "Vendor Registration Form",
    fileName: "VendorRegistrationForm.docx",
    category: "Vendor",
    subject: "Business 3 LLC",
    detailLabel: "Status",
    detailValue: "Approved",
    status: "Available",
  },
  {
    id: 10,
    name: "W-9 Form",
    fileName: "W9FormSample.docx",
    category: "Vendor",
    subject: "Business 4 LLC",
    detailLabel: "TIN",
    detailValue: "12-3456789",
    status: "Available",
  },
];

const CATEGORIES = [
  "All",
  "Business",
  "HR",
  "Compliance",
  "Insurance",
  "Financial",
  "Vendor",
];

export default function Upload() {
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedDocument, setSelectedDocument] =
    useState(null);

  const filteredDocuments = useMemo(() => {
    return DOCUMENTS.filter((document) => {
      const categoryMatch =
        selectedCategory === "All" ||
        document.category === selectedCategory;

      const searchMatch =
        document.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        document.subject
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        document.fileName
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, searchTerm]);

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <p className="eyebrow">
            DOCUMENT MANAGEMENT
          </p>

          <h1 className="page-title">
            Document Center
          </h1>

          <p className="page-description">
            Review business, employee,
            compliance, vendor, insurance,
            and financial documents used by
            the verification system.
          </p>
        </div>

        <button
          className="btn-primary"
          type="button"
        >
          + Upload Document
        </button>
      </div>


      {/* CATEGORY FILTERS */}

      <div className="document-toolbar">

        <div className="category-tabs">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "category-tab active"
                  : "category-tab"
              }
              onClick={() =>
                setSelectedCategory(category)
              }
            >
              {category}
            </button>
          ))}
        </div>


        <input
          className="document-search"
          type="search"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
        />

      </div>


      {/* DOCUMENT SUMMARY */}

      <div className="document-summary">

        <div className="summary-item">
          <span>Total Documents</span>
          <strong>
            {DOCUMENTS.length}
          </strong>
        </div>

        <div className="summary-item">
          <span>Showing</span>
          <strong>
            {filteredDocuments.length}
          </strong>
        </div>

        <div className="summary-item">
          <span>Categories</span>
          <strong>
            {CATEGORIES.length - 1}
          </strong>
        </div>

      </div>


      {/* DOCUMENT CARDS */}

      <div className="document-grid">

        {filteredDocuments.map((document) => (

          <article
            className="document-card"
            key={document.id}
          >

            <div className="document-card-top">

              <div className="document-icon">
                📄
              </div>

              <span className="document-category">
                {document.category}
              </span>

            </div>


            <h2>
              {document.name}
            </h2>


            <p className="document-file-name">
              {document.fileName}
            </p>


            <div className="document-information">

              <div>
                <span>
                  Subject
                </span>

                <strong>
                  {document.subject}
                </strong>
              </div>


              <div>
                <span>
                  {document.detailLabel}
                </span>

                <strong>
                  {document.detailValue}
                </strong>
              </div>

            </div>


            <div className="document-status-row">

              <span className="badge badge-green">
                {document.status}
              </span>

            </div>


            <div className="document-actions">

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  setSelectedDocument(document)
                }
              >
                View Details
              </button>

              <button
                type="button"
                className="btn-outline"
              >
                Compare
              </button>

              <button
                type="button"
                className="btn-primary"
              >
                Verify
              </button>

            </div>

          </article>

        ))}

      </div>


      {filteredDocuments.length === 0 && (
        <div className="empty-state">
          <h2>
            No documents found
          </h2>

          <p>
            Try another category or search.
          </p>
        </div>
      )}


      {/* DOCUMENT DETAILS PANEL */}

      {selectedDocument && (

        <div className="document-modal-backdrop">

          <div className="document-modal">

            <div className="document-modal-header">

              <div>
                <p className="eyebrow">
                  DOCUMENT DETAILS
                </p>

                <h2>
                  {selectedDocument.name}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedDocument(null)
                }
              >
                ×
              </button>

            </div>


            <div className="document-modal-body">

              <div className="detail-row">
                <span>File</span>
                <strong>
                  {selectedDocument.fileName}
                </strong>
              </div>

              <div className="detail-row">
                <span>Category</span>
                <strong>
                  {selectedDocument.category}
                </strong>
              </div>

              <div className="detail-row">
                <span>Subject</span>
                <strong>
                  {selectedDocument.subject}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  {selectedDocument.detailLabel}
                </span>
                <strong>
                  {selectedDocument.detailValue}
                </strong>
              </div>

            </div>


            <div className="comparison-preview">

              <h3>
                Verification Comparison
              </h3>

              <div className="comparison-columns">

                <div>
                  <span>
                    Current Document
                  </span>

                  <strong>
                    {selectedDocument.detailValue}
                  </strong>
                </div>

                <div>
                  <span>
                    Newly Verified Value
                  </span>

                  <strong>
                    Waiting for verification
                  </strong>
                </div>

              </div>

            </div>


            <div className="document-modal-actions">

              <button
                type="button"
                className="btn-outline"
                onClick={() =>
                  setSelectedDocument(null)
                }
              >
                Close
              </button>

              <button
                type="button"
                className="btn-primary"
              >
                Run Verification
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
