# VitaKiosk Live Agnes, ElevenLabs, and VitaFlow Demo Design

Date: 2026-08-27

## Objective

Prepare the existing VitaKiosk application for a real local demo in which voice,
AI wording, product vision, VitaFlow product facts, and shelf routing work as one
verified flow. A configured provider is not considered working until its live
smoke test and the complete kiosk flow both pass.

## Provider profile

- Keep `VITAKIOSK_PROVIDER_MODE=mock` as the safety envelope.
- Set `VITAFLOW_PROVIDER=readonly_api` and connect to the currently running
  VitaFlow ERP kiosk API at `http://127.0.0.1:3100`.
- Add `AI_PROVIDER=agnes` using the Agnes Chat Completions API and
  `agnes-2.0-flash`.
- Add `VISION_PROVIDER=agnes` using the Agnes multimodal chat API and
  `agnes-2.0-flash`.
- Add `STT_PROVIDER=elevenlabs` using ElevenLabs Scribe v2.
- Keep `TTS_PROVIDER=elevenlabs`; prefer the low-latency multilingual Flash v2.5
  model unless the configured voice does not support it.
- Keep frontend avatar configuration independent:
  `VITE_AVATAR_RENDERER=vrm` and `VITE_VRM_MODEL=vita-new`.
- Credentials remain in the ignored local `.env` only. The Agnes key pasted in
  chat is treated as exposed and must be revoked; a replacement key must never
  be committed, logged, or returned by a status endpoint.

## Product visibility and source of truth

- VitaKiosk reads products only from VitaFlow's dedicated
  `/api/vitakiosk/catalog/...` endpoints. It never searches the general ERP
  inventory directly.
- VitaFlow's `Show in VitaKiosk` selection controls which products those kiosk
  endpoints expose. Agnes cannot add a product that VitaFlow did not return.
- Product name, image, price, stock, barcode, summary, promotion, category,
  location, and shelf route always come from VitaFlow.
- If Agnes detects label text for an item that the kiosk catalog does not
  return, the kiosk reports no kiosk-visible match and does not display guessed
  product facts.

## Pharmacy safety boundary

- Agnes never diagnoses, prescribes, recommends a medicine, chooses a medicine,
  changes a dose, or replaces a pharmacist.
- VitaFlow product category determines whether an item is a supplement. Agnes
  cannot decide or override that category.
- For a VitaFlow-confirmed supplement, Agnes may explain only the confirmed
  customer-facing description, ingredients, intended use, directions, and
  cautions supplied by VitaFlow.
- For medicines and unknown categories, the kiosk may show objective VitaFlow
  facts such as product identity, image, price, stock, promotion, and location.
  Questions about suitability, dosing, interactions, symptoms, or treatment
  escalate to a pharmacist.
- Existing red-flag checks run before Agnes. Invalid, unsafe, mismatched-language,
  invented-fact, or non-whitelisted-action output is discarded in favor of the
  deterministic safe response.

## AI conversation behavior

- Deterministic intent and safety logic runs before the Agnes request.
- Agnes receives only the bounded intent, selected language, safe conversation
  context, and VitaFlow-confirmed facts needed to word the answer.
- The response must use the selected or reliably detected language: English,
  Chinese, or Malay. A wrong-language response is rejected and replaced by a
  deterministic response in the correct language.
- Agnes output uses a validated structured schema. UI actions are limited to the
  existing whitelist and cannot be inferred from free text.
- A request for product details does not open promotions. A location request
  opens the route for the currently matched product. A promotion request opens
  only the matching active leaflet, or the active gallery when the request is
  explicitly general.
- Follow-up replies such as `yes` apply only to the pending question and never
  become a new product search. Existing product details remain visible unless a
  different product is successfully selected.

## Voice behavior

- ElevenLabs Scribe v2 receives only the user-initiated recorded turn and returns
  transcript, language, and confidence metadata.
- English, Mandarin Chinese, and Malay are supported. Low-confidence or empty
  transcripts ask the customer to repeat and do not invoke Agnes or replace the
  current product.
- Product names from the VitaFlow kiosk catalog may be supplied as bounded STT
  keyterms, without exposing general inventory or customer information.
- ElevenLabs TTS returns the audio played by the browser. The VRM mouth movement
  is driven by actual audio activity, begins with playback, and closes when audio
  ends, is cancelled, or errors.
- TTS failure preserves the subtitle and closes the mouth; it does not leave the
  avatar stuck in the speaking state.

## Vision and scan behavior

- A frame is captured only while the customer has explicitly opened the Scan
  Product overlay.
- The client sends only the product scan region. The backend validates image
  type and size, normalizes orientation, downsizes the frame, and does not save
  the raw or processed image.
- The Agnes request attempts direct in-memory image content. The image must not
  be uploaded to a public URL. If Agnes does not accept direct image content,
  cloud vision fails closed instead of publicly hosting the frame.
- Agnes returns a strict candidate signal containing only visible brand, product
  name, pack size, label text, and barcode candidates. It does not return product
  facts.
- Candidate signals are matched against the VitaFlow kiosk catalog. Exact barcode
  matches may complete automatically. A unique high-confidence label match may
  be presented for confirmation. Ambiguous or weak matches keep the scanner open
  and allow another frame.
- The scanner never closes on no match, never substitutes a fixed demo product,
  and never leaves an old product candidate above a newly selected product.

## VitaFlow location and route flow

- After a product is confirmed, VitaKiosk requests its current branch location
  and shelf map from VitaFlow.
- The route target uses the confirmed product's VitaFlow location only. A stale
  location from Buffered C, Fisherman's Friend, Relief Balm, or any previous
  product cannot be reused.
- If the product has no VitaFlow location, the kiosk shows location unavailable
  and does not draw a fabricated route.
- If location data exists, the standard map and enlarged map display the same
  target and route. The enlarged modal closes by outside click, close control,
  and Escape regardless of whether it was opened by the user or an AI UI action.

## Avatar and presentation behavior

- The `vita-new` VRM must render before demo acceptance; the holographic fallback
  is not counted as a passing VRM test.
- Speaking, listening, thinking, error, and idle states remain distinct.
- Mouth movement follows real playback amplitude and returns to a neutral closed
  mouth after playback.
- Gaze and gesture direction follow the active UI target when the assistant opens
  a product, route, promotion, or campaign panel.
- Product summary and leaflet modals preserve hidden-scrollbar mouse-wheel and
  touchscreen swipe scrolling, and all modals have deterministic exit behavior.

## Failure and privacy behavior

- Provider timeouts return controlled customer-facing messages without leaking
  endpoints, keys, request payloads, or provider error bodies.
- Failed AI, vision, STT, or TTS requests do not clear a valid current product.
- No camera frame, microphone recording, transcript, secret, customer data, or
  live VitaFlow payload is committed to Git or stored as test evidence.
- Tests use mocked HTTP transports. Live smoke tests use only deliberate local
  demo input and record sanitized pass/fail evidence.

## Acceptance evidence

The demo is ready only when all of the following pass:

1. Frontend returns HTTP 200 on `127.0.0.1:5175`; backend health and safe runtime
   status return HTTP 200 on `127.0.0.1:8001`.
2. VitaFlow ERP is reachable on `127.0.0.1:3100`, and the kiosk search endpoint
   returns the checked `BLACKMORES BUFFERED C SLOW RELEASE TAB 30S` product.
3. A mocked-network test proves each new provider selector, request contract,
   safe error, and absence of secret leakage.
4. A live ElevenLabs STT test correctly handles one English, one Chinese, and one
   Malay kiosk request without replacing the selected product on unclear audio.
5. A live ElevenLabs TTS test plays all three languages and leaves the VRM mouth
   closed at the end of every clip.
6. A live Agnes AI test answers in the requested language, preserves VitaFlow
   facts, rejects medicine advice, and explains only VitaFlow-confirmed supplement
   information.
7. A live Agnes Vision test recognizes at least two different physical products
   without a hardcoded result, matches only VitaFlow kiosk-visible products, and
   keeps the scanner open for an unknown or ambiguous item.
8. A complete scan-to-route test scans a product, confirms the correct product,
   displays its image and summary from VitaFlow, and draws the corresponding
   VitaFlow location route.
9. Switching between Buffered C and Fisherman's Friend replaces product, image,
   location, and route together with no stale state.
10. AI-opened and manually opened map and leaflet modals both close correctly and
    remain scrollable by mouse wheel and touchscreen swipe.
11. Backend tests, frontend tests, frontend production build, repository secret
    checks, and staged-file checks all pass.

Passing only unit tests, only provider health, only OCR, or only a single
hardcoded product is not sufficient demo evidence.
