from datetime import UTC, datetime

from services.models import Poster, Product, Promotion


MOCK_PRODUCTS: tuple[Product, ...] = (
    Product(
        id="MOCK-P001",
        name="Relief Balm",
        aliases=("pain relief balm", "relief balm", "balm"),
        branch_id="SG-001",
        price=12.50,
        stock=18,
        shelf_location="A-03",
    ),
    Product(
        id="MOCK-P002",
        name="Hydration Salts",
        aliases=("rehydration salts", "hydration salts"),
        branch_id="SG-001",
        price=8.90,
        stock=24,
        shelf_location="B-07",
    ),
    Product(
        id="MOCK-P003",
        name="Gentle Skin Wash",
        aliases=("skin wash", "gentle wash"),
        branch_id="SG-002",
        price=10.20,
        stock=11,
        shelf_location="C-02",
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
