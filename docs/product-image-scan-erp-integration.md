# Product Image Scan ERP Integration Plan

## Purpose

VitaKiosk product image scan is live-ready but mock-first. The current
implementation uses a local deterministic scan adapter and fictional mock
VitaFlow records. Future ERP integration must keep VitaFlow as the source of
truth and must not let a vision model invent product facts.

## Source-of-truth contract

The scan layer may produce signals:

- barcode value
- OCR text
- image-similarity candidate ID
- confidence and match reason

Only the VitaFlow adapter may provide:

- product name
- SKU/product ID
- price
- stock
- branch
- shelf location
- product image metadata
- source/provenance
- promotion/campaign eligibility

If VitaFlow does not return a product, the kiosk must show no match or continue
to the purchasing-query flow. It must not fabricate product details from OCR or
image recognition.

## Future read-only ERP fields

The first reviewed VitaFlow live connector should expose read-only fields such
as:

```json
{
  "product_id": "string",
  "name": "string",
  "sku": "string",
  "barcode": "string",
  "branch_id": "string",
  "price": 0,
  "stock": 0,
  "shelf_location": "string",
  "images": [
    {
      "url": "self-hosted-or-approved-static-path",
      "type": "front|label|package|barcode",
      "isPrimary": true,
      "alt": "customer-safe product image description"
    }
  ],
  "imageUrl": "primary-backend-controlled-image-path",
  "thumbnailUrl": "backend-controlled-thumbnail-path",
  "source": "vitaflow_readonly"
}
```

The connector must be `readonly_api` only. It must not write stock, sales,
customer, purchasing, promotion, or shelf data.

## Local scan provider boundary

`VISION_PROVIDER=local_product_scan` is a local provider selector. It must:

- run only when explicitly selected in local `.env`
- avoid cloud image recognition
- avoid storing raw customer/product images by default
- return controlled errors for invalid images or unavailable local libraries
- use VitaFlow/mock lookups for every product fact
- use VitaFlow/mock image metadata for display and future similarity indexing
- keep OCR/image-similarity candidates in the confirmation UI unless an exact
  trusted barcode match is found

## Safety constraints

- Safety guardrails still run before product recommendation.
- Red-flag or pharmacist-review cases must not be bypassed by camera scan.
- Promotion and shelf information must come from VitaFlow/mock adapters only.
- No customer face, customer data, sales record, camera frame, log, cache, or
  model artifact may be committed.

## Test evidence

- `backend/tests/test_api.py`
- `backend/tests/test_services.py`
- `backend/tests/test_provider_config.py`
- `frontend/src/App.integration.test.tsx`
- `scripts/check-staged-files.mjs`
- `scripts/check-provider-secrets.mjs`
