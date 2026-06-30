# Product Data Specification

## Purpose

Display branch-scoped product facts without inventing authoritative values.

## Behavior

Product search uses the VitaFlow adapter and returns ID, name, price, stock,
shelf location, branch, source, product image metadata, and an unavailable
reason when applicable. Initial records are fictional and marked
`mock_vitaflow`.

Product image metadata is part of the same source-of-truth boundary. The
backend may return `imageUrl`, `thumbnailUrl`, and `images[]` entries with
`url`, `type`, `isPrimary`, and `alt`. The frontend must render only these
backend-provided values through the reusable `ProductImage` component. It must
not hardcode product-specific image paths in React components, CSS switches, or
scan UI code.

When a typed or spoken product name is close but not exact, the adapter may
return fuzzy product candidates with confidence, match reason, and matched text.
Candidate identification is only an aid to selection: all displayed facts still
come from the VitaFlow/mock adapter, and a customer selection is required for
medium-confidence or ambiguous matches.

Camera product scan can add barcode, OCR, or product image similarity signals
to the same candidate confirmation flow. Barcode exact matches may select the
authoritative VitaFlow/mock product directly; OCR and image-similarity matches
must show confirmation candidates unless the workflow has an exact trusted
barcode match.

Product images are also prepared for future image-similarity indexing, but scan
results still identify candidates only. Product facts and product display
images must be resolved from the VitaFlow/mock adapter record.

## Safety constraints

- Never infer missing price, stock, shelf location, or product details.
- A missing product creates a purchasing query.
- Product data contains no customer or sales fields.
- Product image URLs must be backend-controlled local/static or approved
  server paths. Unsafe values must fall back to the generated initials artwork
  instead of rendering a broken or injected image.

## Acceptance criteria

- Known `MOCK-P001` returns the exact fixture values for `SG-001`.
- The same search in an unrelated branch returns no item.
- Unknown product responses contain no product object and include a purchasing-query ID.
- Near-name product search such as `Relief Bomb` returns a `Relief Balm`
  candidate with Mock VitaFlow facts and no purchasing-query ID.
- Candidate cards show only customer-safe match labels such as `Best match`,
  product facts, branch, shelf, and source; technical scoring terms are not
  shown to customers.
- Camera scan candidates show customer-safe labels such as `Barcode match`,
  `Best visual match`, or `Label text match`; all candidate facts are
  adapter-backed and no raw camera image is stored by default.
- Product panels, enlarged product sheets, and candidate cards use the same
  backend-driven `ProductImage` behavior: display the adapter image when
  present, use `object-fit: contain`, expose accessible alt text, and fall back
  to the premium initials/icon if the image is missing, invalid, or fails to
  load.
- Missing values display `Unavailable from VitaFlow`.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
