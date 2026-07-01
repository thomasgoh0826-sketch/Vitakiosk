from __future__ import annotations

from typing import Literal, TypedDict


class SitePricingPlan(TypedDict):
    id: str
    group: Literal["vitaflow", "vitakiosk", "academy", "website"]
    name: str
    price_label: str
    billing_kind: Literal["subscription", "one_time", "deposit", "quote"]
    cta: str

MANUAL_PAYMENT_NOTICE = (
    "Online payment gateway is not enabled yet. Payment and onboarding are "
    "confirmed manually after discussion."
)


SITE_PRICING_PLANS: list[SitePricingPlan] = [
    {
        "id": "vitaflow-starter",
        "group": "vitaflow",
        "name": "VitaFlow Starter",
        "price_label": "Manual quote first",
        "billing_kind": "subscription",
        "cta": "Request Demo",
    },
    {
        "id": "vitaflow-growth",
        "group": "vitaflow",
        "name": "VitaFlow Growth",
        "price_label": "Manual quote first",
        "billing_kind": "subscription",
        "cta": "Request Quote",
    },
    {
        "id": "vitaflow-enterprise",
        "group": "vitaflow",
        "name": "VitaFlow Enterprise",
        "price_label": "Contact for quote",
        "billing_kind": "quote",
        "cta": "Request Quote",
    },
    {
        "id": "vitakiosk-local",
        "group": "vitakiosk",
        "name": "VitaKiosk Local Edition",
        "price_label": "Manual setup quote",
        "billing_kind": "deposit",
        "cta": "Request Quote",
    },
    {
        "id": "vitakiosk-partner-campaign",
        "group": "vitakiosk",
        "name": "VitaKiosk Clinic Partner Campaign",
        "price_label": "Compliance review and quote",
        "billing_kind": "quote",
        "cta": "Book Demo",
    },
    {
        "id": "ai-basics-1to1",
        "group": "academy",
        "name": "AI Basics 1-to-1",
        "price_label": "Manual lesson reservation",
        "billing_kind": "one_time",
        "cta": "Reserve Lesson Slot",
    },
    {
        "id": "website-landing-page",
        "group": "website",
        "name": "Landing Page Launch",
        "price_label": "Manual project inquiry",
        "billing_kind": "deposit",
        "cta": "Start Project Inquiry",
    },
    {
        "id": "website-ai-chatbot",
        "group": "website",
        "name": "AI Website with Chatbot",
        "price_label": "Scope quote plus deposit",
        "billing_kind": "deposit",
        "cta": "Start Project Inquiry",
    },
]
