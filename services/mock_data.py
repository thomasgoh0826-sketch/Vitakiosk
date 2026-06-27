from datetime import UTC, datetime

from services.models import Leaflet, LeafletKind, Poster, Product, ProductImage, Promotion


MOCK_PRODUCTS: tuple[Product, ...] = (
    Product(
        id="MOCK-P001",
        name="Relief Balm",
        aliases=("pain relief balm", "relief balm", "balm"),
        branch_id="SG-001",
        price=12.50,
        stock=18,
        shelf_location="A-03",
        barcode="9550000000019",
        images=(
            ProductImage(
                url="/assets/mock-products/relief-balm-front.svg",
                type="front_pack",
                isPrimary=True,
            ),
            ProductImage(
                url="/assets/mock-products/relief-balm-label.svg",
                type="label_closeup",
                isPrimary=False,
            ),
        ),
        productSummary={
            "ingredient": {
                "en": "Menthol, camphor, herbal soothing ingredients",
                "zh": "Menthol、camphor、草本舒缓成分",
                "ms": "Menthol, camphor, bahan herba yang menenangkan",
            },
            "howToUse": {
                "en": "Apply externally to the affected area as needed.",
                "zh": "外用，适量涂抹在需要舒缓的部位。",
                "ms": "Sapu secara luaran pada bahagian yang diperlukan.",
            },
            "bestFor": {
                "en": "Muscle discomfort, shoulder tension, general soothing use.",
                "zh": "肌肉不适、肩颈紧绷、日常舒缓。",
                "ms": "Ketidakselesaan otot, ketegangan bahu, kegunaan luaran umum.",
            },
            "size": {
                "en": "30g",
                "zh": "30g",
                "ms": "30g",
            },
            "description": {
                "en": "Cooling relief balm. Easy to apply. For external use only.",
                "zh": "清凉舒缓膏，方便外用。只供外用。",
                "ms": "Balm rasa sejuk untuk kegunaan luaran. Mudah digunakan.",
            },
        },
    ),
    Product(
        id="MOCK-P002",
        name="Hydration Salts",
        aliases=("rehydration salts", "hydration salts"),
        branch_id="SG-001",
        price=8.90,
        stock=24,
        shelf_location="B-07",
        barcode="9550000000026",
        images=(
            ProductImage(
                url="/assets/mock-products/hydration-salts-front.svg",
                type="front_pack",
                isPrimary=True,
            ),
        ),
        productSummary={
            "ingredient": {"en": "Oral rehydration salts blend"},
            "howToUse": {
                "en": "Follow the product label and ask the pharmacist if unsure."
            },
            "bestFor": {"en": "Hydration support information from mock VitaFlow."},
            "size": {"en": "10 sachets"},
            "description": {
                "en": "Mock hydration product record. Speak with a pharmacist for advice."
            },
        },
    ),
    Product(
        id="MOCK-P003",
        name="Gentle Skin Wash",
        aliases=("skin wash", "gentle wash"),
        branch_id="SG-002",
        price=10.20,
        stock=11,
        shelf_location="C-02",
        barcode="9550000000033",
        images=(
            ProductImage(
                url="/assets/mock-products/gentle-skin-wash-front.svg",
                type="front_pack",
                isPrimary=True,
            ),
        ),
        productSummary={
            "ingredient": {"en": "Gentle skin cleansing base"},
            "howToUse": {"en": "Use externally as described on the product label."},
            "bestFor": {"en": "General cleansing information from mock VitaFlow."},
            "size": {"en": "250ml"},
            "description": {
                "en": "Mock skin wash product record. Ask the pharmacist for personal advice."
            },
        },
    ),
)

MOCK_PROMOTIONS: tuple[Promotion, ...] = (
    Promotion(
        id="MOCK-PR001",
        title="Relief Balm Demo Offer",
        branch_id="SG-001",
        product_ids=("MOCK-P001",),
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
    ),
    Promotion(
        id="MOCK-PR002",
        title="Inactive Historical Demo Offer",
        branch_id="SG-001",
        product_ids=("MOCK-P001",),
        active=False,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
    ),
    Promotion(
        id="MOCK-PR003",
        title="Other Branch Demo Offer",
        branch_id="SG-002",
        product_ids=("MOCK-P003",),
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
    ),
)

MOCK_POSTERS: tuple[Poster, ...] = (
    Poster(
        id="MOCK-POSTER001",
        title="Relief Balm Demo Offer",
        branch_id="SG-001",
        promotion_id="MOCK-PR001",
        asset_path="/assets/posters/mock-relief-balm.svg",
    ),
    Poster(
        id="MOCK-POSTER002",
        title="Inactive Historical Demo Offer",
        branch_id="SG-001",
        promotion_id="MOCK-PR002",
        asset_path="/assets/posters/mock-inactive.svg",
    ),
    Poster(
        id="MOCK-POSTER003",
        title="Other Branch Demo Offer",
        branch_id="SG-002",
        promotion_id="MOCK-PR003",
        asset_path="/assets/posters/mock-other-branch.svg",
    ),
)

MOCK_LEAFLETS: tuple[Leaflet, ...] = (
    Leaflet(
        id="MOCK-LF-PROMO-001",
        kind=LeafletKind.PROMOTION,
        title="Relief Balm Demo Leaflet",
        description=(
            "Active branch promotion leaflet for Relief Balm. Fictional mock "
            "content sourced from mock VitaFlow data."
        ),
        branch_id="SG-001",
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-relief-balm-promo.svg",
        product_ids=("MOCK-P001",),
        category_tags=("pain-relief", "topical"),
        display_priority=10,
    ),
    Leaflet(
        id="MOCK-LF-PROMO-002",
        kind=LeafletKind.PROMOTION,
        title="Supplement Savings Demo",
        description=(
            "General active promotion leaflet for SG-001. Fictional mock "
            "campaign copy with no medical claim."
        ),
        branch_id="SG-001",
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-supplement-promo.svg",
        product_ids=(),
        category_tags=("supplement", "wellness"),
        display_priority=20,
    ),
    Leaflet(
        id="MOCK-LF-CAMP-001",
        kind=LeafletKind.CAMPAIGN,
        title="Hydration Health Campaign",
        description=(
            "Branch health campaign leaflet for hydration awareness. Fictional "
            "mock content; speak to a pharmacist for clinical advice."
        ),
        branch_id="SG-001",
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-hydration-campaign.svg",
        product_ids=("MOCK-P002",),
        category_tags=("hydration", "wellness"),
        display_priority=30,
    ),
    Leaflet(
        id="MOCK-LF-PROMO-INACTIVE",
        kind=LeafletKind.PROMOTION,
        title="Inactive Leaflet Demo",
        description="Inactive mock leaflet that must never render.",
        branch_id="SG-001",
        active=False,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-inactive.svg",
        product_ids=("MOCK-P001",),
        category_tags=("inactive",),
        display_priority=90,
    ),
    Leaflet(
        id="MOCK-LF-CAMP-EXPIRED",
        kind=LeafletKind.CAMPAIGN,
        title="Expired Campaign Demo",
        description="Expired mock campaign that must never render.",
        branch_id="SG-001",
        active=True,
        valid_from=datetime(2024, 1, 1, tzinfo=UTC),
        valid_to=datetime(2024, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-expired.svg",
        product_ids=(),
        category_tags=("expired",),
        display_priority=95,
    ),
    Leaflet(
        id="MOCK-LF-PROMO-OTHER-BRANCH",
        kind=LeafletKind.PROMOTION,
        title="Other Branch Leaflet Demo",
        description="Other-branch mock leaflet that must never render for SG-001.",
        branch_id="SG-002",
        active=True,
        valid_from=datetime(2025, 1, 1, tzinfo=UTC),
        valid_to=datetime(2030, 12, 31, 23, 59, tzinfo=UTC),
        image_url="/assets/leaflets/mock-other-branch.svg",
        product_ids=("MOCK-P003",),
        category_tags=("other-branch",),
        display_priority=99,
    ),
)
