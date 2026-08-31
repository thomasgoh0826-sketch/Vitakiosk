from datetime import UTC, datetime

from services.models import (
    BranchShelfMap,
    Leaflet,
    LeafletKind,
    Poster,
    Product,
    ProductImage,
    ProductLocation,
    Promotion,
    ShelfMapPoint,
    ShelfMapRegion,
)


MOCK_PRODUCTS: tuple[Product, ...] = (
    Product(
        id="MOCK-P001",
        name="Relief Balm",
        aliases=("pain relief balm", "relief balm", "balm"),
        branch_id="SG-001",
        price=12.50,
        stock=18,
        shelf_location="A-03",
        location=ProductLocation(
            regionName="Aisle 03",
            areaZone="Pain relief",
            shelfRackBay="A-03",
            rowLevel="02",
            binPosition="Front bay",
            locationCode="SG001-A03-L02",
            locationNote="Topical relief shelf near the right-side aisle.",
            pinX=82,
            pinY=27,
        ),
        barcode="9550000000019",
        imageUrl="/assets/mock-products/relief-balm-front.svg",
        thumbnailUrl="/assets/mock-products/relief-balm-front.svg",
        images=(
            ProductImage(
                url="/assets/mock-products/relief-balm-front.svg",
                type="front_pack",
                isPrimary=True,
                alt="Relief Balm product image",
            ),
            ProductImage(
                url="/assets/mock-products/relief-balm-label.svg",
                type="label_closeup",
                isPrimary=False,
                alt="Relief Balm product label",
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
        location=ProductLocation(
            regionName="Hydration Bay",
            areaZone="Wellness",
            shelfRackBay="B-07",
            rowLevel="01",
            binPosition="Middle bay",
            locationCode="SG001-B07-L01",
            locationNote="Hydration products near the pharmacist counter.",
            pinX=52,
            pinY=55,
        ),
        barcode="9550000000026",
        imageUrl="/assets/mock-products/hydration-salts-front.svg",
        thumbnailUrl="/assets/mock-products/hydration-salts-front.svg",
        images=(
            ProductImage(
                url="/assets/mock-products/hydration-salts-front.svg",
                type="front_pack",
                isPrimary=True,
                alt="Hydration Salts product image",
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
        location=ProductLocation(
            regionName="Skin Care",
            areaZone="Dermatology",
            shelfRackBay="C-02",
            rowLevel="01",
            binPosition="Left bay",
            locationCode="SG002-C02-L01",
            pinX=38,
            pinY=40,
        ),
        barcode="9550000000033",
        imageUrl="/assets/mock-products/gentle-skin-wash-front.svg",
        thumbnailUrl="/assets/mock-products/gentle-skin-wash-front.svg",
        images=(
            ProductImage(
                url="/assets/mock-products/gentle-skin-wash-front.svg",
                type="front_pack",
                isPrimary=True,
                alt="Gentle Skin Wash product image",
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

MOCK_BRANCH_SHELF_MAPS: tuple[BranchShelfMap, ...] = (
    BranchShelfMap(
        branch_id="SG-001",
        map_id="MOCK-MAP-SG-001",
        name="Mock VitaFlow SG-001 pharmacy map",
        source="mock_vitaflow",
        entrance=ShelfMapPoint(x=8, y=84, label="Entrance"),
        regions=(
            ShelfMapRegion(id="mock-aisle-01", name="Aisle 01", type="aisle", x=18, y=25, width=14, height=36, label="01"),
            ShelfMapRegion(id="mock-aisle-02", name="Aisle 02", type="aisle", x=43, y=25, width=14, height=36, label="02"),
            ShelfMapRegion(id="mock-aisle-03", name="Aisle 03", type="aisle", x=68, y=25, width=14, height=36, label="03"),
            ShelfMapRegion(id="mock-pharmacist", name="Pharmacist", type="counter", x=78, y=82, width=16, height=6, label="Pharmacist"),
        ),
    ),
    BranchShelfMap(
        branch_id="SG-002",
        map_id="MOCK-MAP-SG-002",
        name="Mock VitaFlow SG-002 pharmacy map",
        source="mock_vitaflow",
        entrance=ShelfMapPoint(x=10, y=80, label="Entrance"),
        regions=(
            ShelfMapRegion(id="mock-sg2-skin", name="Skin Care", type="aisle", x=34, y=28, width=18, height=32, label="C"),
            ShelfMapRegion(id="mock-sg2-counter", name="Pharmacist", type="counter", x=72, y=82, width=18, height=6, label="Pharmacist"),
        ),
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
