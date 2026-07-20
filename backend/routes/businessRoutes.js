const express = require("express");
const router = express.Router();
const pool = require("../services/db");

function normalizeWebsite(website) {
  if (!website) return null;

  const cleaned = String(website).trim();

  if (!cleaned) return null;

  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
}

function normalizeBusinessStatus(status) {
  const allowedStatuses = [
    "Unverified",
    "Verified",
    "Needs Review",
    "Active",
    "Pending",
    "Inactive",
    "Imported",
    "Imported From Document"
  ];

  if (!status) {
    return "Unverified";
  }

  const match = allowedStatuses.find(
    (allowedStatus) =>
      allowedStatus.toLowerCase() ===
      String(status).trim().toLowerCase()
  );

  return match || "Unverified";
}

function getBusinessPayload(body = {}) {
  return {
    business_name:
      body.business_name ||
      body.businessName ||
      body.name ||
      null,

    website: normalizeWebsite(
      body.website ||
      body.business_website ||
      body.businessWebsite
    ),

    phone_number:
      body.phone_number ||
      body.phoneNumber ||
      body.phone ||
      null,

    email:
      body.email ||
      body.business_email ||
      body.businessEmail ||
      null,

    industry:
      body.industry ||
      body.business_industry ||
      null,

    business_status: normalizeBusinessStatus(
      body.business_status ||
      body.businessStatus ||
      body
