const MANUAL_PAYMENT_NOTICE =
  "Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.";
const MANUAL_NEXT_STEP =
  "We will follow up by WhatsApp or email with the quote, schedule, and manual bank transfer or DuitNow instructions if payment is needed.";
const CUSTOMER_SUCCESS_MESSAGE =
  "Your inquiry has been submitted. We will contact you to confirm scope, schedule, and manual payment details.";
const AGNES_DEFAULT_API_URL = "https://apihub.agnes-ai.com/v1/chat/completions";
const AGNES_DEFAULT_MODEL = "agnes-2.0-flash";
const CHAT_PUBLIC_SITE_CONTEXT = `
PUBLIC WEBSITE FACTS ONLY:
- Brand: VitaKiosk Asia. Secondary: VitaKiosk Labs. Tagline: AI Systems & Experience Lab.
- Main message: AI systems, websites, and training for pharmacies, clinics, and modern businesses.
- Service lines:
  1. VitaFlow ERP: pharmacy ERP for inventory, stock movement, branch-aware product data, price monitoring, promotions, purchase workflow, reports, and analytics.
  2. VitaKiosk AI Kiosk: product education, supplement/product information, where-to-buy guidance, promotion display, shelf guidance, queue support, and staff/pharmacist escalation.
  3. AI Website Studio: landing pages, business websites, AI chatbot websites, booking/contact flows, lead generation, deployment, domain setup, and maintenance.
  4. AI Academy: AI basics, Codex workflow, prompt training, automation, AI website building, AI video/content workflow, pharmacy AI workflow, 1-to-1 lessons, and team training.
- Pricing shown publicly:
  VitaFlow Starter: Free setup + RM199/month.
  VitaFlow Growth: Free setup + RM399/month.
  VitaFlow Enterprise: Free setup + custom quote from RM899/month.
  VitaKiosk Local Edition: From RM500 setup + RM200/month maintenance.
  VitaKiosk Clinic Partner Campaign: From RM1,500/campaign.
  VitaKiosk Enterprise Deployment: Custom quote from RM3,000.
  AI Basics 1-to-1: RM199.
  AI Pharmacy Workflow: RM499, non-negotiable.
  Codex / Website Coaching: RM399/session, non-negotiable.
  AI Content & Video Workflow: RM399/session, non-negotiable.
  Team Training / Corporate Workshop: From RM1,500 half-day / RM2,800 full-day.
  Landing Page Launch: From RM80.
  Business Website: From RM200.
  AI Website with Chatbot: From RM200 + RM150/month.
  Custom Web App: From RM300.
- Manual payment and quotation are available. Prices are negotiable unless marked as Non-negotiable.
- Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.
- Contact path: use Book Demo, Contact Sales, pricing/order/book/contact forms; follow-up is manual by email or WhatsApp.
- Safety wording: VitaKiosk provides product education and guidance only. It is not diagnosis, prescription consultation, professional medical advice, doctor endorsement, hospital endorsement, or pharmacist replacement.
- Sponsored product education must be clearly labelled and reviewed before display.
`;
const CHAT_SYSTEM_PROMPT =
  "You are the VitaKiosk Asia website customer service assistant. Answer only from the public website facts supplied below. Keep answers concise and practical. Match the user's language when possible. Do not reveal or infer secrets, API keys, private customer data, sales data, source code, internal records, business strategy, or operational credentials. Do not provide medical diagnosis, prescription consultation, professional medical advice, doctor endorsement, hospital endorsement, or pharmacist replacement claims. If a question is off-topic or asks for private information, refuse briefly and redirect to public website details.";
const CHAT_OFF_TOPIC_REPLY =
  "I can only answer questions about the VitaKiosk Asia website, services, pricing, booking, contact, and public safety information. I cannot share private business information, secrets, customer data, source code, or internal records.";
const CHAT_SECRET_PATTERN = /(sk-[A-Za-z0-9_-]{8,}|sb_secret_[A-Za-z0-9_-]+|\b[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}\b)/g;
const CHAT_SITE_TOPICS = [
  "vitakiosk",
  "vita kiosk",
  "vitaflow",
  "vita flow",
  "erp",
  "pharmacy",
  "clinic",
  "kiosk",
  "ai website",
  "website",
  "studio",
  "academy",
  "lesson",
  "training",
  "pricing",
  "price",
  "cost",
  "quote",
  "demo",
  "booking",
  "book",
  "contact",
  "payment",
  "manual",
  "duitnow",
  "bank transfer",
  "privacy",
  "terms",
  "disclaimer",
  "medical",
  "diagnosis",
  "prescription",
  "pharmacist",
  "promotion",
  "shelf",
  "stock",
  "malaysia",
  "价钱",
  "价格",
  "报价",
  "服务",
  "网站",
  "课程",
  "预约",
  "联系",
  "药房",
  "诊所",
  "付款",
];
const CHAT_RESTRICTED_TOPICS = [
  "api key",
  "secret",
  "token",
  "password",
  "service role",
  "private customer",
  "customer list",
  "sales data",
  "patient data",
  "database dump",
  "source code",
  "admin",
  "internal revenue",
  "revenue",
  "profit",
  "hack",
  "bypass",
  "密钥",
  "密码",
  "客户资料",
  "销售数据",
  "源码",
  "后台",
];

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/site")) {
      return handleSiteApi(request, env, url.pathname);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return withIndexHeader(assetResponse);
    }

    if (request.method === "GET" && acceptsHtml(request)) {
      const indexRequest = new Request(new URL("/index.html", url), request);
      return withIndexHeader(await env.ASSETS.fetch(indexRequest));
    }

    return assetResponse;
  },
};

async function handleSiteApi(request, env, pathname) {
  if (request.method === "OPTIONS") {
    return jsonResponse(204, null);
  }

  try {
    const endpoint = routeEndpoint(pathname);
    if (request.method === "GET" && endpoint === "pricing") {
      return jsonResponse(200, {
        items: pricingItems,
        payment_provider: "manual_confirmation",
        payment_notice: MANUAL_PAYMENT_NOTICE,
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { detail: "Method not allowed" });
    }

    if (endpoint === "webhooks/payment") {
      return jsonResponse(200, {
        live_payment: false,
        result: { provider: "manual_bank_transfer", status: "ignored" },
      });
    }

    const payload = await parseBody(request);
    if (endpoint === "chat") {
      return jsonResponse(200, await answerSiteChat(env, payload));
    }

    if (endpoint === "checkout/mock-success" || endpoint === "checkout/mock-cancel") {
      return jsonResponse(200, {
        ok: true,
        live_payment: false,
        status: endpoint.endsWith("success") ? "manual_payment_pending" : "cancelled",
      });
    }

    if (endpoint === "checkout/create") {
      return jsonResponse(200, await createManualConfirmation(env, payload));
    }

    const route = routeConfig(endpoint);
    if (!route) {
      return jsonResponse(404, { detail: "Not found" });
    }

    const safePayload = sanitizePayload(payload);
    validatePayload(route.kind, safePayload);
    const record = await createSiteRecord(env, route.kind, route.status, safePayload);

    return jsonResponse(201, {
      ...recordResponse(record),
      notification_status: "supabase_recorded",
      customer_message: CUSTOMER_SUCCESS_MESSAGE,
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

async function parseBody(request) {
  const text = await request.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
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

function redactChatText(value) {
  return sanitizeText(value).replace(CHAT_SECRET_PATTERN, "[redacted]");
}

function isAllowedSiteChat(message) {
  const lowered = message.toLowerCase();
  if (CHAT_RESTRICTED_TOPICS.some((topic) => lowered.includes(topic))) {
    return false;
  }
  if (lowered.split(/\s+/).length <= 3 && /^(hi|hello|help|你好)/i.test(lowered)) {
    return true;
  }
  return CHAT_SITE_TOPICS.some((topic) => lowered.includes(topic));
}

function localSiteChatAnswer(message, allowed) {
  if (!allowed) {
    return CHAT_OFF_TOPIC_REPLY;
  }
  const lowered = message.toLowerCase();
  if (/(price|pricing|cost|quote|payment|duitnow|bank)/.test(lowered)) {
    return "VitaKiosk Asia uses manual confirmation first. VitaKiosk Local Edition starts from RM500 setup + RM200/month maintenance, clinic partner campaigns start from RM1,500/campaign, AI Website Studio starts from RM80, and AI lessons have listed packages. Online payment gateway is not enabled yet; payment and onboarding are confirmed manually after discussion.";
  }
  if (/(medical|diagnosis|prescription|pharmacist|safety)/.test(lowered)) {
    return "VitaKiosk provides general product education, where-to-buy guidance, promotion display, shelf guidance, and staff or pharmacist escalation. It does not provide diagnosis, prescription consultation, or professional medical advice.";
  }
  if (/(book|demo|contact|consultation|sales)/.test(lowered)) {
    return "You can use Book Demo, Contact Sales, or the inquiry forms on the site. The team will follow up manually by email or WhatsApp to confirm scope, schedule, quotation, and any payment details.";
  }
  if (/(website|studio|chatbot|web app|landing)/.test(lowered)) {
    return "AI Website Studio builds landing pages, business websites, AI chatbot websites, booking or lead generation flows, and custom web apps with launch and maintenance support.";
  }
  if (/(academy|lesson|training|codex|prompt)/.test(lowered)) {
    return "AI Academy teaches practical AI workflows: AI basics, Codex builds, prompt workflow, automation, AI website building, content/video workflow, and pharmacy AI operations.";
  }
  return "VitaKiosk Asia has four public service lines: VitaFlow ERP for pharmacy operations, VitaKiosk AI Kiosk for product education and shelf guidance, AI Website Studio for business websites and lead capture, and AI Academy for practical AI lessons.";
}

async function callAgnesIfConfigured(env, message) {
  const provider = String(env.SITE_AI_CHAT_PROVIDER || "website_local").toLowerCase();
  const liveEnabled = ["1", "true", "yes"].includes(String(env.SITE_AI_CHAT_LIVE || "false").toLowerCase());
  const apiKey = String(env.AGNES_API_KEY || "");
  const apiUrl = String(env.AGNES_API_URL || "");
  if (provider !== "agnes" || !liveEnabled || !apiKey || !apiUrl) {
    return null;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (typeof data.answer === "string") {
    return data.answer;
  }
  const first = Array.isArray(data.choices) ? data.choices[0] : null;
  if (first && typeof first.text === "string") {
    return first.text;
  }
  if (first && first.message && typeof first.message.content === "string") {
    return first.message.content;
  }
  return null;
}

function normalizeChatHistoryForAgnes(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  return history
    .slice(-6)
    .map((item) => {
      if (!item || (item.role !== "assistant" && item.role !== "user")) {
        return null;
      }
      const content = redactChatText(item.text || item.content || "").slice(0, 800);
      return content ? { role: item.role, content } : null;
    })
    .filter(Boolean);
}

function isAllowedSiteChatV2(message) {
  const lowered = message.toLowerCase();
  if (CHAT_RESTRICTED_TOPICS.some((topic) => lowered.includes(topic))) {
    return false;
  }
  if (lowered.split(/\s+/).length <= 3 && /^(hi|hello|help|你好)/i.test(lowered)) {
    return true;
  }
  return CHAT_SITE_TOPICS.some((topic) => lowered.includes(topic));
}

function localSiteChatAnswerV2(message, allowed) {
  if (!allowed) {
    return CHAT_OFF_TOPIC_REPLY;
  }
  const lowered = message.toLowerCase();
  if (/(price|pricing|cost|quote|payment|duitnow|bank|价钱|价格|报价)/.test(lowered)) {
    return "VitaKiosk Asia uses manual confirmation first. VitaKiosk Local Edition starts from RM500 setup + RM200/month maintenance, clinic partner campaigns start from RM1,500/campaign, AI Website Studio starts from RM80, and AI lessons have listed packages. Online payment gateway is not enabled yet; payment and onboarding are confirmed manually after discussion.";
  }
  if (/(medical|diagnosis|prescription|pharmacist|safety)/.test(lowered)) {
    return "VitaKiosk provides general product education, where-to-buy guidance, promotion display, shelf guidance, and staff or pharmacist escalation. It does not provide diagnosis, prescription consultation, or professional medical advice.";
  }
  if (/(book|demo|contact|consultation|sales|预约|联系)/.test(lowered)) {
    return "You can use Book Demo, Contact Sales, or the inquiry forms on the site. The team will follow up manually by email or WhatsApp to confirm scope, schedule, quotation, and any payment details.";
  }
  if (/(website|studio|chatbot|web app|landing|网站)/.test(lowered)) {
    return "AI Website Studio builds landing pages, business websites, AI chatbot websites, booking or lead generation flows, and custom web apps with launch and maintenance support.";
  }
  if (/(academy|lesson|training|codex|prompt|课程)/.test(lowered)) {
    return "AI Academy teaches practical AI workflows: AI basics, Codex builds, prompt workflow, automation, AI website building, content/video workflow, and pharmacy AI operations.";
  }
  return "VitaKiosk Asia has four public service lines: VitaFlow ERP for pharmacy operations, VitaKiosk AI Kiosk for product education and shelf guidance, AI Website Studio for business websites and lead capture, and AI Academy for practical AI lessons.";
}

function agnesApiUrl(env) {
  const direct = String(env.AGNES_API_URL || "").trim();
  if (direct) {
    return direct;
  }
  const base = String(env.AGNES_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (base) {
    return `${base}/chat/completions`;
  }
  return AGNES_DEFAULT_API_URL;
}

function agnesModel(env) {
  return String(env.AGNES_MODEL || "").trim() || AGNES_DEFAULT_MODEL;
}

async function callAgnesSiteAssistant(env, message, history) {
  const provider = String(env.SITE_AI_CHAT_PROVIDER || "website_local").toLowerCase();
  const liveEnabled = ["1", "true", "yes"].includes(String(env.SITE_AI_CHAT_LIVE || "false").toLowerCase());
  const apiKey = String(env.AGNES_API_KEY || "");
  if (provider !== "agnes" || !liveEnabled || !apiKey) {
    return null;
  }

  const response = await fetch(agnesApiUrl(env), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: agnesModel(env),
      messages: [
        { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\n${CHAT_PUBLIC_SITE_CONTEXT.trim()}` },
        ...normalizeChatHistoryForAgnes(history),
        { role: "user", content: message },
      ],
      temperature: 0.2,
      max_tokens: 450,
    }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (typeof data.answer === "string") {
    return data.answer.trim();
  }
  const first = Array.isArray(data.choices) ? data.choices[0] : null;
  if (first && typeof first.text === "string") {
    return first.text.trim();
  }
  if (first && first.message && typeof first.message.content === "string") {
    return first.message.content.trim();
  }
  return null;
}

async function answerSiteChat(env, payload) {
  const message = redactChatText(payload.message || "").slice(0, 800);
  const history = normalizeChatHistoryForAgnes(payload.history);
  const allowed = isAllowedSiteChatV2(message);
  let answer = null;
  let liveProvider = false;

  if (allowed) {
    try {
      answer = await callAgnesSiteAssistant(env, message, history);
      liveProvider = Boolean(answer);
    } catch {
      answer = null;
      liveProvider = false;
    }
  }

  if (!answer) {
    answer = localSiteChatAnswerV2(message, allowed);
  }

  return {
    ok: true,
    answer: redactChatText(answer).slice(0, 1200),
    topic_allowed: allowed,
    live_provider: liveProvider,
    provider: liveProvider ? "agnes" : "website_local",
    safety_note: "Website-only assistant. No secrets, private customer data, diagnosis, or prescription consultation.",
  };
}

async function createManualConfirmation(env, payload) {
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
  const record = await createSiteRecord(env, "order", "manual_payment_pending", safePayload, "payment");
  const baseUrl = (env.SITE_BASE_URL || "").replace(/\/+$/, "");

  return {
    ok: true,
    live_payment: false,
    message: MANUAL_PAYMENT_NOTICE,
    customer_message: CUSTOMER_SUCCESS_MESSAGE,
    notification_status: "supabase_recorded",
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

async function createSiteRecord(env, kind, status, payload, referenceKind = kind) {
  const referenceId = makeReference(referenceKind);
  const table = tableForKind(kind);
  const row = rowForRecord(kind, status, referenceId, payload);
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/+$/, "");
  const apiKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "";
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

function makeReference(kind) {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `${prefixByKind[kind] || "VK-SITE"}-${stamp}-${suffix}`;
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

function jsonResponse(status, body) {
  return new Response(body == null ? "" : JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function acceptsHtml(request) {
  return (request.headers.get("accept") || "").includes("text/html");
}

function withIndexHeader(response) {
  const next = new Response(response.body, response);
  next.headers.set("x-robots-tag", "index, follow");
  return next;
}
