import nodemailer from "nodemailer";
import crypto from "node:crypto";

const MANUAL_PAYMENT_NOTICE =
  "Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.";
const MANUAL_NEXT_STEP =
  "We will follow up by WhatsApp or email with the quote, schedule, and manual bank transfer or DuitNow instructions if payment is needed.";
const CUSTOMER_SUCCESS_MESSAGE =
  "Your inquiry has been submitted. We will contact you to confirm scope, schedule, and manual payment details.";
const CUSTOMER_RECEIVED_MESSAGE = "Your request was received. We will contact you shortly.";

const pricingItems = [
  ["vitaflow-starter", "vitaflow", "Starter", "Free setup + RM199/month", "subscription", "Request ERP Demo", true, null],
  ["vitaflow-growth", "vitaflow", "Growth", "Free setup + RM399/month", "subscription", "Start Subscription Inquiry", true, null],
  ["vitaflow-enterprise", "vitaflow", "Enterprise", "Free setup + custom quote from RM899/month", "quote", "Start Subscription Inquiry", true, null],
  ["vitakiosk-local-edition", "vitakiosk", "Local Edition", "From RM500 setup + RM200/month maintenance", "deposit", "Request VitaKiosk Quote", true, null],
  ["vitakiosk-clinic-partner-campaign", "vitakiosk", "Clinic Partner Campaign", "From RM1,500/campaign", "quote", "Discuss Campaign Placement", true, null],
  ["vitakiosk-enterprise-deployment", "vitakiosk", "Enterprise Deployment", "Custom quote from RM3,000", "quote", "Request VitaKiosk Quote", true, null],
  ["ai-basics-1to1", "academy", "AI Basics 1-to-1", "RM199", "one_time", "Book AI Lesson", true, null],
  ["ai-pharmacy-workflow", "academy", "AI Pharmacy Workflow", "RM499", "one_time", "Book AI Lesson", false, "Non-negotiable"],
  ["codex-website-coaching", "academy", "Codex / Website Coaching", "RM399/session", "one_time", "Book AI Lesson", false, "Non-negotiable"],
  ["ai-content-video-workflow", "academy", "AI Content & Video Workflow", "RM399/session", "one_time", "Book AI Lesson", false, "Non-negotiable"],
  ["team-training-workshop", "academy", "Team Training / Corporate Workshop", "From RM1,500 half-day / RM2,800 full-day", "quote", "Reserve Training Slot", true, null],
  ["landing-page-launch", "website", "Landing Page Launch", "From RM80", "deposit", "Start Website Project", true, null],
  ["business-website", "website", "Business Website", "From RM200", "deposit", "Request Website Quote", true, null],
  ["ai-website-chatbot", "website", "AI Website with Chatbot", "From RM200 + RM150/month", "deposit", "Start Website Project", true, null],
  ["custom-web-app", "website", "Custom Web App", "From RM300", "quote", "Request Website Quote", true, null],
].map(([id, group, name, price_label, billing_kind, cta, negotiable, non_negotiable_label]) => ({
  id,
  group,
  name,
  price_label,
  billing_kind,
  cta,
  negotiable,
  non_negotiable_label,
}));

const prefixByKind = {
  lead: "VK-LEAD",
  order: "VK-ORD",
  booking: "VK-BOOK",
  project: "VK-WEB",
  payment: "VK-PAY",
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, null);
  }

  try {
    const endpoint = routeEndpoint(event.path);

    if (event.httpMethod === "GET" && endpoint === "pricing") {
      return jsonResponse(200, {
        items: pricingItems,
        payment_provider: "manual_confirmation",
        payment_notice: MANUAL_PAYMENT_NOTICE,
      });
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { detail: "Method not allowed" });
    }

    if (endpoint === "webhooks/payment") {
      return jsonResponse(200, {
        live_payment: false,
        result: { provider: "manual_bank_transfer", status: "ignored" },
      });
    }

    const payload = parseBody(event.body);
    if (endpoint === "checkout/mock-success" || endpoint === "checkout/mock-cancel") {
      return jsonResponse(200, {
        ok: true,
        live_payment: false,
        status: endpoint.endsWith("success") ? "manual_payment_pending" : "cancelled",
      });
    }

    if (endpoint === "checkout/create") {
      return jsonResponse(200, await createManualConfirmation(payload));
    }

    const route = routeConfig(endpoint);
    if (!route) {
      return jsonResponse(404, { detail: "Not found" });
    }

    const safePayload = sanitizePayload(payload);
    validatePayload(route.kind, safePayload);
    const record = await createSiteRecord(route.kind, route.status, safePayload);
    const notification = await sendOwnerEmail(record, titleForRecord(record));

    return jsonResponse(201, {
      ...recordResponse(record),
      notification_status: notification.sent ? "sent" : notification.provider === "disabled" ? "disabled" : "deferred",
      customer_message: notification.sent ? CUSTOMER_SUCCESS_MESSAGE : CUSTOMER_RECEIVED_MESSAGE,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return jsonResponse(status, {
      detail: status >= 500 ? "Site inquiry service is not available. Please contact us directly." : error.message,
    });
  }
}

function routeEndpoint(pathname) {
  return pathname
    .replace(/^\/api\/site\/?/, "")
    .replace(/^\/\.netlify\/functions\/site-api\/?/, "")
    .replace(/^site-api\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function routeConfig(endpoint) {
  return {
    lead: { kind: "lead", status: "inquiry_submitted" },
    orders: { kind: "order", status: "quote_requested" },
    bookings: { kind: "booking", status: "inquiry_submitted" },
    projects: { kind: "project", status: "inquiry_submitted" },
  }[endpoint];
}

function parseBody(body) {
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch {
    throw httpError(400, "Invalid JSON body");
  }
}

function validatePayload(kind, payload) {
  const requiredByKind = {
    lead: ["name", "email", "message"],
    order: ["companyName", "contactPerson", "email"],
    booking: ["name", "email", "topic"],
    project: ["businessName", "contactPerson", "email", "selectedPackage"],
  };
  for (const field of requiredByKind[kind] || []) {
    if (!payload[field]) {
      throw httpError(422, `${field} is required`);
    }
  }
  const email = payload.email || payload.customer_email;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw httpError(422, "A valid email is required");
  }
}

function sanitizePayload(payload) {
  const safe = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (typeof value === "string") {
      safe[key] = sanitizeText(value).slice(0, 1000);
    } else if (value == null || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
}

async function createManualConfirmation(payload) {
  const safePayload = sanitizePayload({
    contactPerson: payload.customer_name,
    email: payload.customer_email,
    phone: payload.customer_phone,
    businessType: payload.business_type,
    selectedPlan: payload.selected_package,
    notes: payload.message,
    manual_payment_status: "manual_payment_pending",
  });
  validatePayload("order", {
    companyName: safePayload.businessType || safePayload.contactPerson || "Manual payment inquiry",
    contactPerson: safePayload.contactPerson,
    email: safePayload.email,
  });
  const record = await createSiteRecord("order", "manual_payment_pending", safePayload, "payment");
  const notification = await sendOwnerEmail(record, "Manual Payment Confirmation Request");
  const baseUrl = (process.env.SITE_BASE_URL || "").replace(/\/+$/, "");

  return {
    ok: true,
    live_payment: false,
    message: MANUAL_PAYMENT_NOTICE,
    customer_message: notification.sent ? CUSTOMER_SUCCESS_MESSAGE : CUSTOMER_RECEIVED_MESSAGE,
    notification_status: notification.sent ? "sent" : notification.provider === "disabled" ? "disabled" : "deferred",
    checkout: {
      provider: "manual_bank_transfer",
      status: "manual_payment_pending",
      reference_id: record.reference_id,
      checkout_url: `${baseUrl || ""}/checkout/success?reference=${encodeURIComponent(record.reference_id)}`,
      next_step: MANUAL_NEXT_STEP,
      message: MANUAL_PAYMENT_NOTICE,
    },
    record: recordResponse(record),
  };
}

async function createSiteRecord(kind, status, payload, referenceKind = kind) {
  const referenceId = makeReference(referenceKind);
  const table = tableForKind(kind);
  const row = rowForRecord(kind, status, referenceId, payload);
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !apiKey) {
    throw httpError(500, "Supabase is not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    throw httpError(500, "Supabase insert failed");
  }

  const data = await response.json();
  const inserted = Array.isArray(data) && data[0] ? data[0] : row;
  return {
    id: String(inserted.id || crypto.randomUUID()),
    kind,
    status: String(inserted.status || status),
    payload,
    reference_id: String(inserted.reference_code || referenceId),
    next_step: MANUAL_NEXT_STEP,
    payment_note: MANUAL_PAYMENT_NOTICE,
    database_provider: "supabase",
    created_at: new Date().toISOString(),
  };
}

function tableForKind(kind) {
  return {
    lead: "site_leads",
    order: "site_orders",
    booking: "site_bookings",
    project: "site_projects",
  }[kind];
}

function rowForRecord(kind, status, referenceCode, payload) {
  if (kind === "lead") {
    return {
      reference_code: referenceCode,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      business_type: payload.businessType || payload.interest || null,
      message: payload.message || payload.notes || null,
      status,
    };
  }
  if (kind === "booking") {
    return {
      reference_code: referenceCode,
      booking_type: String(payload.topic || "").toLowerCase().includes("lesson") ? "ai_lesson" : "book_demo",
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      topic: payload.topic,
      preferred_time: payload.preferredTime || null,
      participant_count: integerOrNull(payload.participants),
      mode: payload.format || null,
      notes: payload.notes || null,
      status,
      manual_payment_status: "not_required",
    };
  }
  if (kind === "project") {
    return {
      reference_code: referenceCode,
      business_name: payload.businessName,
      industry: payload.industry || null,
      contact_name: payload.contactPerson,
      email: payload.email,
      phone: payload.phone || null,
      current_website: payload.currentWebsite || null,
      selected_package: payload.selectedPackage,
      preferred_timeline: payload.timeline || null,
      notes: payload.notes || null,
      status,
      manual_payment_status: "not_required",
    };
  }
  return {
    reference_code: referenceCode,
    product_type: productTypeForPayload(payload),
    customer_name: payload.contactPerson || payload.name || payload.fullName || null,
    company_name: payload.companyName || payload.company || null,
    email: payload.email,
    phone: payload.phone || null,
    location: payload.location || null,
    selected_plan: payload.selectedPlan || null,
    estimated_users_locations: payload.branches || payload.units || null,
    message: payload.notes || payload.message || null,
    status,
    manual_payment_status: payload.manual_payment_status || "not_required",
  };
}

function productTypeForPayload(payload) {
  const text = `${payload.selectedPlan || payload.selectedPackage || ""} ${payload.buyerType || payload.businessType || ""}`.toLowerCase();
  if (text.includes("vitaflow")) return "vitaflow_erp";
  if (text.includes("partner") || text.includes("clinic")) return "vitakiosk_partner_campaign";
  if (text.includes("lesson") || text.includes("academy") || text.includes("training")) return "ai_lesson";
  if (text.includes("website") || text.includes("studio")) return "ai_website";
  return "vitakiosk_local";
}

async function sendOwnerEmail(record, submissionType) {
  const provider = (process.env.SITE_EMAIL_PROVIDER || "disabled").toLowerCase();
  const username = process.env.SITE_EMAIL_SMTP_USERNAME || process.env.SITE_OWNER_EMAIL;
  const appPassword = (process.env.SITE_EMAIL_SMTP_APP_PASSWORD || "").replace(/\s+/g, "");
  const to = process.env.SITE_OWNER_EMAIL || username;
  if (!["gmail_connected", "gmail_smtp"].includes(provider) || !username || !appPassword || !to) {
    return { sent: false, provider: "disabled" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SITE_EMAIL_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SITE_EMAIL_SMTP_PORT || 587),
    secure: false,
    auth: { user: username, pass: appPassword },
  });
  const subject = `[VitaKiosk Asia] ${submissionType} - ${record.reference_id}`;
  const info = await transporter.sendMail({
    from: username,
    to,
    subject,
    text: emailBody(record, submissionType),
  });

  return { sent: true, provider, message_id: info.messageId };
}

function emailBody(record, submissionType) {
  const payload = record.payload;
  return [
    "New VitaKiosk Asia inquiry",
    "",
    `Reference: ${record.reference_id}`,
    `Submission: ${submissionType}`,
    `Name: ${payload.name || payload.fullName || payload.contactPerson || payload.customer_name || "-"}`,
    `Email: ${payload.email || payload.customer_email || "-"}`,
    `Phone: ${payload.phone || payload.customer_phone || "-"}`,
    `Business type: ${payload.businessType || payload.interest || payload.industry || payload.buyerType || "-"}`,
    `Package: ${payload.selectedPlan || payload.selectedPackage || payload.topic || "-"}`,
    `Message: ${payload.message || payload.notes || "-"}`,
    `Manual payment status: ${(payload.manual_payment_status || record.status).replace(/_/g, " ")}`,
    `Created: ${record.created_at}`,
    "",
    "Next step:",
    "Contact the customer manually to confirm scope, schedule, and payment details.",
  ].join("\n");
}

function titleForRecord(record) {
  if (record.kind === "lead") return "New Inquiry";
  if (record.kind === "booking") return "New AI Lesson Booking";
  if (record.kind === "project") return "New Website Project";
  const selected = `${record.payload.selectedPlan || ""} ${record.payload.buyerType || ""}`.toLowerCase();
  return selected.includes("vitaflow") ? "New VitaFlow Request" : "New VitaKiosk Order";
}

function makeReference(kind) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  return `${prefixByKind[kind] || "VK-SITE"}-${stamp}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function integerOrNull(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function recordResponse(record) {
  return {
    ...record,
    reference_id: record.reference_id,
    source: record.database_provider,
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
    body: body == null ? "" : JSON.stringify(body),
  };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
