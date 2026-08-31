# Local Product Vision Scan Test Guide

## Purpose

This guide verifies VitaKiosk local product scan without using cloud image
recognition, customer data, or saved camera images. Product facts may come from
the mock adapter or the reviewed read-only VitaFlow ERP adapter.

## Local configuration

Use local `.env` only and do not commit it:

```env
VISION_PROVIDER=local_product_scan
VITAFLOW_PROVIDER=mock
```

Install the optional local OCR runtime once in the backend environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-local-vision.txt
```

For reviewed read-only ERP matching, use `VITAFLOW_PROVIDER=readonly_api` and
the local ERP catalog URL. OCR only extracts label text; price, stock, product
image, and shelf facts are still loaded from VitaFlow.

The default CI/test mode remains:

```env
VISION_PROVIDER=mock
VITAFLOW_PROVIDER=mock
```

## Runtime flow

1. Start the backend on the local demo port:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
   ```

2. Start the frontend on the fixed Vite port:

   ```powershell
   npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
   ```

3. Open [http://127.0.0.1:5175](http://127.0.0.1:5175).
4. Tap `Scan Product`.
5. Grant camera permission only for the demo browser session.
6. Hold a product package, barcode, or front label steady inside the visible
   scan frame. The kiosk captures one frame automatically.

## Expected behavior

- Camera starts only after `Scan Product`.
- The visible reticle is cropped and enlarged before OCR so background and the
  customer's clothing do not dominate the product label.
- Camera tracks stop only after an accepted result or closing the overlay. A
  no-match result keeps the preview open for `Scan again`.
- Raw images/video frames are not saved by default.
- Exact barcode matches select the VitaFlow/mock product directly.
- Local OCR reads real JPEG/PNG/WebP label text and matching results show
  `Do you mean this item?` candidates.
- OCR matching removes scan-overlay instructions before building ERP queries,
  prioritizes adjacent high-confidence label lines before background/price
  noise, combines brand/range/flavour lines, and tolerates punctuation lost
  by OCR (for example `FISHERMANS FRIEND` -> `FISHERMAN S FRIEND`). It is not
  tied to Buffered C or any other single product.
- Selecting a candidate updates Product, Shelf Navigation, Promotion, and ERP
  panels using only VitaFlow/mock facts.
- If no product is found, the kiosk asks the customer to try again or type the
  product name. It must not invent a product.
- If camera permission fails, the kiosk shows a controlled message and typed
  input remains available.

## Deterministic backend test markers

Automated tests use mocked byte markers instead of camera hardware:

- `BARCODE:9550000000019`
- `IMAGE:MOCK-P001`
- `OCR:Relief Bomb`

These markers are for tests only. Runtime local OCR uses RapidOCR only when
`VISION_PROVIDER=local_product_scan` is explicitly enabled. CI remains on the
mock provider and does not load camera hardware or OCR models.

## Manual acceptance checklist

- [ ] `VISION_PROVIDER=mock` remains the default.
- [ ] `VISION_PROVIDER=local_product_scan` is explicit in local `.env`.
- [ ] Camera permission prompt appears only after `Scan Product`.
- [ ] Camera remains open after no match and closes after an accepted result or outside/Escape close.
- [ ] Barcode exact match resolves through mock VitaFlow.
- [ ] OCR/visual match opens product candidate confirmation.
- [ ] Product facts come only from mock VitaFlow.
- [ ] No camera image, screenshot, audio, log, cache, customer data, or sales
      data is staged or committed.
