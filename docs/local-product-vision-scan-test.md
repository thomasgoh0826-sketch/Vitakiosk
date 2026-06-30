# Local Product Vision Scan Test Guide

## Purpose

This guide verifies VitaKiosk local product scan without using cloud image
recognition, real VitaFlow ERP, customer data, or saved camera images.

## Local configuration

Use local `.env` only and do not commit it:

```env
VISION_PROVIDER=local_product_scan
VITAFLOW_PROVIDER=mock
```

The default CI/test mode remains:

```env
VISION_PROVIDER=mock
VITAFLOW_PROVIDER=mock
```

## Runtime flow

1. Start the backend on the local demo port:

   ```powershell
   python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
   ```

2. Start the frontend on the fixed Vite port:

   ```powershell
   npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
   ```

3. Open [http://127.0.0.1:5175](http://127.0.0.1:5175).
4. Tap `Scan Product`.
5. Grant camera permission only for the demo browser session.
6. Hold a fictional mock package, barcode, or label in view and tap `Capture`.

## Expected behavior

- Camera starts only after `Scan Product`.
- Camera tracks stop after capture, cancel, or close.
- Raw images/video frames are not saved by default.
- Exact barcode matches select the VitaFlow/mock product directly.
- OCR and image-similarity results show `Do you mean this item?` candidates.
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

These markers are for tests only. They do not represent a production barcode,
OCR, or image-similarity library.

## Manual acceptance checklist

- [ ] `VISION_PROVIDER=mock` remains the default.
- [ ] `VISION_PROVIDER=local_product_scan` is explicit in local `.env`.
- [ ] Camera permission prompt appears only after `Scan Product`.
- [ ] Camera closes and track stops after capture/cancel.
- [ ] Barcode exact match resolves through mock VitaFlow.
- [ ] OCR/visual match opens product candidate confirmation.
- [ ] Product facts come only from mock VitaFlow.
- [ ] No camera image, screenshot, audio, log, cache, customer data, or sales
      data is staged or committed.
