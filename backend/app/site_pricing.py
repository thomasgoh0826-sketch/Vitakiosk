from __future__ import annotations

from typing import Literal, TypedDict


class SitePricingPlan(TypedDict):
    id: str
    group: Literal["vitaflow", "vitakiosk", "academy", "website"]
    name: str
    price_label: str
    billing_kind: Literal["subscription", "one_time", "deposit", "quote"]
    cta: str
    negotiable: bool
    non_negotiable_label: str | None


MANUAL_PAYMENT_NOTICE = (
    "Payment will be confirmed manually after discussion. Online payment "
    "gateway is not enabled yet."
)


SITE_PRICING_PLANS: list[SitePricingPlan] = [
    {
        "id": "vitaflow-starter",
        "group": "vitaflow",
        "name": "Starter",
        "price_label": "Free setup + RM199/month",
        "billing_kind": "subscription",
        "cta": "Request ERP Demo",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "vitaflow-growth",
        "group": "vitaflow",
        "name": "Growth",
        "price_label": "Free setup + RM399/month",
        "billing_kind": "subscription",
        "cta": "Start Subscription Inquiry",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "vitaflow-enterprise",
        "group": "vitaflow",
        "name": "Enterprise",
        "price_label": "Free setup + custom quote from RM899/month",
        "billing_kind": "quote",
        "cta": "Start Subscription Inquiry",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "vitakiosk-local-edition",
        "group": "vitakiosk",
        "name": "Local Edition",
        "price_label": "From RM500 setup + RM200/month maintenance",
        "billing_kind": "deposit",
        "cta": "Request VitaKiosk Quote",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "vitakiosk-clinic-partner-campaign",
        "group": "vitakiosk",
        "name": "Clinic Partner Campaign",
        "price_label": "From RM1,500/campaign",
        "billing_kind": "quote",
        "cta": "Discuss Campaign Placement",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "vitakiosk-enterprise-deployment",
        "group": "vitakiosk",
        "name": "Enterprise Deployment",
        "price_label": "Custom quote from RM3,000",
        "billing_kind": "quote",
        "cta": "Request VitaKiosk Quote",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "ai-basics-1to1",
        "group": "academy",
        "name": "AI Basics 1-to-1",
        "price_label": "RM199",
        "billing_kind": "one_time",
        "cta": "Book AI Lesson",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "ai-pharmacy-workflow",
        "group": "academy",
        "name": "AI Pharmacy Workflow",
        "price_label": "RM499",
        "billing_kind": "one_time",
        "cta": "Book AI Lesson",
        "negotiable": False,
        "non_negotiable_label": "Non-negotiable",
    },
    {
        "id": "codex-website-coaching",
        "group": "academy",
        "name": "Codex / Website Coaching",
        "price_label": "RM399/session",
        "billing_kind": "one_time",
        "cta": "Book AI Lesson",
        "negotiable": False,
        "non_negotiable_label": "Non-negotiable",
    },
    {
        "id": "ai-content-video-workflow",
        "group": "academy",
        "name": "AI Content & Video Workflow",
        "price_label": "RM399/session",
        "billing_kind": "one_time",
        "cta": "Book AI Lesson",
        "negotiable": False,
        "non_negotiable_label": "Non-negotiable",
    },
    {
        "id": "team-training-workshop",
        "group": "academy",
        "name": "Team Training / Corporate Workshop",
        "price_label": "From RM1,500 half-day / RM2,800 full-day",
        "billing_kind": "quote",
        "cta": "Reserve Training Slot",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "landing-page-launch",
        "group": "website",
        "name": "Landing Page Launch",
        "price_label": "From RM80",
        "billing_kind": "deposit",
        "cta": "Start Website Project",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "business-website",
        "group": "website",
        "name": "Business Website",
        "price_label": "From RM200",
        "billing_kind": "deposit",
        "cta": "Request Website Quote",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "ai-website-chatbot",
        "group": "website",
        "name": "AI Website with Chatbot",
        "price_label": "From RM200 + RM150/month",
        "billing_kind": "deposit",
        "cta": "Start Website Project",
        "negotiable": True,
        "non_negotiable_label": None,
    },
    {
        "id": "custom-web-app",
        "group": "website",
        "name": "Custom Web App",
        "price_label": "From RM300",
        "billing_kind": "quote",
        "cta": "Request Website Quote",
        "negotiable": True,
        "non_negotiable_label": None,
    },
]
