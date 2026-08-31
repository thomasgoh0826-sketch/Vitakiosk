from __future__ import annotations

import os
import re
from typing import Any, Iterable

import httpx

from backend.app.site_database import sanitize_text


SECRET_PATTERN = re.compile(
    r"(sk-[A-Za-z0-9_-]{8,}|sb_secret_[A-Za-z0-9_-]+|\b[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}\b)",
)

AGNES_DEFAULT_API_URL = "https://apihub.agnes-ai.com/v1/chat/completions"
AGNES_DEFAULT_MODEL = "agnes-2.0-flash"

SITE_TOPICS = {
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
}

RESTRICTED_TOPICS = {
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
}

PUBLIC_SITE_CONTEXT = """
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
"""

DEFAULT_ASSISTANT_REPLY = (
    "I can help with VitaKiosk Asia website details: VitaFlow ERP, VitaKiosk AI Kiosk, "
    "AI Website Studio, AI Academy, pricing, demo booking, contact, and safety wording."
)

OFF_TOPIC_REPLY = (
    "I can only answer questions about the VitaKiosk Asia website, services, pricing, "
    "booking, contact, and public safety information. I cannot share private business "
    "information, secrets, customer data, source code, or internal records."
)

SYSTEM_PROMPT = (
    "You are the VitaKiosk Asia website customer service assistant. Answer only from the "
    "public website facts supplied below. Keep answers concise and practical. Match the "
    "user's language when possible. Do not reveal or infer secrets, API keys, private "
    "customer data, sales data, source code, internal records, business strategy, or "
    "operational credentials. Do not provide medical diagnosis, prescription consultation, "
    "professional medical advice, doctor endorsement, hospital endorsement, or pharmacist "
    "replacement claims. If a question is off-topic or asks for private information, refuse "
    "briefly and redirect to public website details."
)


def redact_sensitive(value: str) -> str:
    return SECRET_PATTERN.sub("[redacted]", value)


def is_allowed_site_question(message: str) -> bool:
    lowered = message.lower()
    if any(term in lowered for term in RESTRICTED_TOPICS):
        return False
    if len(lowered.split()) <= 3 and any(greeting in lowered for greeting in ("hi", "hello", "help", "你好")):
        return True
    return any(topic in lowered for topic in SITE_TOPICS)


def normalize_chat_history(history: Iterable[dict[str, Any]] | None) -> list[dict[str, str]]:
    if not history:
        return []

    normalized: list[dict[str, str]] = []
    for item in list(history)[-6:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        if role not in {"assistant", "user"}:
            continue
        raw_text = item.get("text", item.get("content", ""))
        content = redact_sensitive(sanitize_text(str(raw_text))[:800])
        if content:
            normalized.append({"role": role, "content": content})
    return normalized


def agnes_api_url() -> str:
    direct = os.getenv("AGNES_API_URL", "").strip()
    if direct:
        return direct
    base = os.getenv("AGNES_API_BASE_URL", "").strip().rstrip("/")
    if base:
        return f"{base}/chat/completions"
    return AGNES_DEFAULT_API_URL


def agnes_model() -> str:
    return os.getenv("AGNES_MODEL", "").strip() or AGNES_DEFAULT_MODEL


def agnes_messages(message: str, history: Iterable[dict[str, Any]] | None = None) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\n{PUBLIC_SITE_CONTEXT.strip()}"},
        *normalize_chat_history(history),
        {"role": "user", "content": message},
    ]


def local_site_answer(message: str, *, allowed: bool) -> str:
    if not allowed:
        return OFF_TOPIC_REPLY

    lowered = message.lower()
    if any(word in lowered for word in ("price", "pricing", "cost", "quote", "payment", "duitnow", "bank", "价钱", "价格", "报价")):
        return (
            "VitaKiosk Asia uses manual confirmation first. VitaKiosk Local Edition starts "
            "from RM500 setup + RM200/month maintenance, clinic partner campaigns start from "
            "RM1,500/campaign, AI Website Studio starts from RM80, and AI lessons have listed "
            "packages. Online payment gateway is not enabled yet; payment and onboarding are "
            "confirmed manually after discussion."
        )

    if any(word in lowered for word in ("medical", "diagnosis", "prescription", "pharmacist", "safety")):
        return (
            "VitaKiosk provides general product education, where-to-buy guidance, promotion "
            "display, shelf guidance, and staff or pharmacist escalation. It does not provide "
            "diagnosis, prescription consultation, or professional medical advice."
        )

    if any(word in lowered for word in ("book", "demo", "contact", "consultation", "sales", "预约", "联系")):
        return (
            "You can use Book Demo, Contact Sales, or the inquiry forms on the site. The team "
            "will follow up manually by email or WhatsApp to confirm scope, schedule, quotation, "
            "and any payment details."
        )

    if any(word in lowered for word in ("website", "studio", "chatbot", "web app", "landing", "网站")):
        return (
            "AI Website Studio builds landing pages, business websites, AI chatbot websites, "
            "booking or lead generation flows, and custom web apps with launch and maintenance support."
        )

    if any(word in lowered for word in ("academy", "lesson", "training", "codex", "prompt", "课程")):
        return (
            "AI Academy teaches practical AI workflows: AI basics, Codex builds, prompt workflow, "
            "automation, AI website building, content/video workflow, and pharmacy AI operations."
        )

    return (
        "VitaKiosk Asia has four public service lines: VitaFlow ERP for pharmacy operations, "
        "VitaKiosk AI Kiosk for product education and shelf guidance, AI Website Studio for "
        "business websites and lead capture, and AI Academy for practical AI lessons."
    )


async def call_agnes_if_configured(message: str, history: Iterable[dict[str, Any]] | None = None) -> str | None:
    provider = os.getenv("SITE_AI_CHAT_PROVIDER", "website_local").strip().lower()
    live_enabled = os.getenv("SITE_AI_CHAT_LIVE", "false").strip().lower() in {"1", "true", "yes"}
    api_key = os.getenv("AGNES_API_KEY", "").strip()
    if provider != "agnes" or not live_enabled or not api_key:
        return None

    payload = {
        "model": agnes_model(),
        "messages": agnes_messages(message, history),
        "temperature": 0.2,
        "max_tokens": 450,
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.post(
            agnes_api_url(),
            headers={
                "authorization": f"Bearer {api_key}",
                "content-type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        data: Any = response.json()

    if isinstance(data, dict):
        if isinstance(data.get("answer"), str):
            return data["answer"].strip()
        choices = data.get("choices")
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message_data = first.get("message")
                if isinstance(message_data, dict) and isinstance(message_data.get("content"), str):
                    return message_data["content"].strip()
                if isinstance(first.get("text"), str):
                    return first["text"].strip()
    return None


async def answer_site_chat(message: str, history: Iterable[dict[str, Any]] | None = None) -> dict[str, Any]:
    safe_message = redact_sensitive(sanitize_text(message)[:800])
    allowed = is_allowed_site_question(safe_message)
    live_provider = False
    answer: str | None = None

    if allowed:
        try:
            answer = await call_agnes_if_configured(safe_message, history)
            live_provider = answer is not None
        except Exception:
            answer = None
            live_provider = False

    if not answer:
        answer = local_site_answer(safe_message or DEFAULT_ASSISTANT_REPLY, allowed=allowed)

    return {
        "ok": True,
        "answer": redact_sensitive(sanitize_text(answer)[:1_200]),
        "topic_allowed": allowed,
        "live_provider": live_provider,
        "provider": "agnes" if live_provider else "website_local",
        "safety_note": (
            "Website-only assistant. No secrets, private customer data, diagnosis, "
            "or prescription consultation."
        ),
    }
