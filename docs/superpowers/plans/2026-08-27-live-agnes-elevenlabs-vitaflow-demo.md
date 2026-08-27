# Live Agnes, ElevenLabs, and VitaFlow Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver and verify a real VitaKiosk demo using Agnes for guarded AI wording and product vision, ElevenLabs for STT/TTS, and VitaFlow ERP for all customer-visible product facts and routes.

**Architecture:** Keep the deterministic VitaKiosk workflow, pharmacy guardrails, VitaFlow adapter, and whitelisted UI actions authoritative. Add narrow provider adapters for ElevenLabs STT and Agnes HTTP calls; Agnes may return only validated wording or visual label signals, which are resolved against the VitaFlow kiosk catalog before the UI changes. Preserve the VRM renderer as an independent frontend runtime and verify all layers separately before the end-to-end demo.

**Tech Stack:** Python 3.12, FastAPI, httpx, pytest, React 19, TypeScript, Vitest, Vite, ElevenLabs REST API, Agnes OpenAI-compatible Chat Completions API, VitaFlow read-only kiosk API.

---

## File map

- `backend/app/config.py`: provider selectors and non-secret environment settings.
- `services/providers.py`: explicit provider construction and credential gates.
- `services/elevenlabs_stt.py`: ElevenLabs Scribe v2 multipart transcription adapter.
- `services/agnes_client.py`: shared authenticated Agnes Chat Completions transport.
- `services/agnes_ai.py`: guarded Agnes wording adapter built on the existing deterministic workflow validation.
- `services/agnes_vision.py`: strict Agnes visual-signal extraction and VitaFlow kiosk-catalog resolution.
- `services/models.py`: VitaFlow kiosk category field needed for supplement safety.
- `services/vitaflow_api.py`: map `category`/`kioskCategory` and continue using kiosk-only endpoints.
- `services/ai_brain.py`: supplement-only counselling and removal of unsolicited promotion follow-ups.
- `backend/app/routes/vision.py`: bounded image-size validation and controlled provider errors.
- `backend/app/main.py`: safe Agnes/VitaFlow runtime readiness flags without secrets.
- `frontend/src/components/CameraScanOverlay.tsx`: repeated capture, ambiguity, and no-match behavior.
- `frontend/src/App.tsx`: atomic product/location replacement and overlay close behavior.
- `frontend/src/hooks/useVoiceInteraction.ts`: preserve current product on unclear/failing turns and finish speaking state cleanly.
- `frontend/src/components/avatar/VrmAvatarRenderer.tsx`: verified mouth reset and active-target gaze.
- `frontend/src/components/LeafletModal.tsx`, `frontend/src/components/ProductCard.tsx`, `frontend/src/styles.css`: consistent close and touch scrolling.
- `scripts/start-live-demo.ps1`: start/verify the approved demo profile without writing secrets.
- `.env.example`, `frontend/.env.local.example`, `README.md`, `docs/local-demo-env.md`, `reports/test-evidence.md`: documented selectors and sanitized evidence.

### Task 1: Lock the VitaFlow 3100 contract and product category

**Files:**
- Modify: `services/models.py`
- Modify: `services/vitaflow_api.py`
- Modify: `backend/tests/test_vitaflow_readonly_api.py`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing VitaFlow category and kiosk-endpoint test**

Add `category` and `kioskCategory` to the fixture product and assert that the
adapter maps the kiosk category while continuing to call only the dedicated
kiosk endpoint:

```python
def test_readonly_api_maps_kiosk_category_from_kiosk_visible_product() -> None:
    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)
        products = adapter.search_products("relief balm", "JK")

    assert products[0].kiosk_category == "VITAMIN"
    assert requests[0]["path"] == "/api/vitakiosk/catalog/products/search"
    assert all("inventory" not in str(request["path"]) for request in requests)
```

- [ ] **Step 2: Run the test and verify the missing field failure**

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_vitaflow_readonly_api.py::test_readonly_api_maps_kiosk_category_from_kiosk_visible_product -v
```

Expected: FAIL because `Product` has no `kiosk_category` attribute.

- [ ] **Step 3: Add the authoritative category field and mapping**

Add to `Product`:

```python
@dataclass(frozen=True)
class Product:
    # existing fields remain unchanged
    kiosk_category: str | None = None
```

Add to `ReadOnlyVitaFlowAPI._map_product`:

```python
kiosk_category=(
    self._text(row.get("kioskCategory") or row.get("category")) or None
),
```

Keep product discovery on `/api/vitakiosk/catalog/products/search`; do not add a
general inventory endpoint or a client-side synthetic product.

- [ ] **Step 4: Run the targeted VitaFlow tests**

Run:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_vitaflow_readonly_api.py -v
```

Expected: PASS, including product image, location, shelf map, and category mapping.

- [ ] **Step 5: Document the stable local demo endpoint without a secret**

Set the example only:

```dotenv
VITAFLOW_PROVIDER=readonly_api
VITAFLOW_API_BASE_URL=http://127.0.0.1:3100
VITAFLOW_API_TOKEN=
```

Do not add or stage the real `.env`.

- [ ] **Step 6: Commit Task 1**

```powershell
git add .env.example services/models.py services/vitaflow_api.py backend/tests/test_vitaflow_readonly_api.py
node scripts/check-staged-files.mjs
git commit -m "fix: bind kiosk products to VitaFlow category"
```

### Task 2: Add ElevenLabs Scribe v2 STT

**Files:**
- Create: `services/elevenlabs_stt.py`
- Create: `backend/tests/test_elevenlabs_stt.py`
- Modify: `backend/app/config.py`
- Modify: `services/providers.py`
- Modify: `backend/tests/test_provider_config.py`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing mocked-network STT tests**

Create tests that prove the exact multipart contract, language mapping, transcript
correction, confidence handling, and safe failures:

```python
def test_elevenlabs_stt_posts_scribe_v2_audio_without_real_network() -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "text": "buffered c",
                "language_code": "eng",
                "language_probability": 0.98,
                "words": [{"type": "word", "text": "buffered", "logprob": -0.02}],
            }

    class FakeClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            captured.update({"url": url, **kwargs})
            return FakeResponse()

    result = ElevenLabsSTT(
        api_key="test-key",
        model_id="scribe_v2",
        http_client=FakeClient(),
    ).transcribe(b"\x1a\x45\xdf\xa3audio", "audio/webm")

    assert captured["url"] == "https://api.elevenlabs.io/v1/speech-to-text"
    assert captured["headers"] == {"xi-api-key": "test-key"}
    assert captured["data"] == {"model_id": "scribe_v2", "tag_audio_events": "false"}
    assert result.provider == "elevenlabs"
    assert result.language == "english"
    assert result.corrected_transcript == "Buffered C"
    assert result.clarification_needed is False
```

Add parameterized responses for `zho -> chinese`, `msa -> malay`, an empty
transcript, low word confidence, HTTP 401, and timeout. Assert no provider body or
API key appears in the raised `RuntimeError`.

- [ ] **Step 2: Run the tests and verify the missing adapter failure**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_elevenlabs_stt.py -v
```

Expected: FAIL because `services.elevenlabs_stt` does not exist.

- [ ] **Step 3: Implement the narrow ElevenLabs adapter**

Create:

```python
class ElevenLabsSTT:
    provider_name = "elevenlabs"

    def __init__(
        self,
        *,
        api_key: str,
        model_id: str = "scribe_v2",
        low_confidence_threshold: float = 0.55,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._api_key = api_key
        self._model_id = model_id or "scribe_v2"
        self._threshold = low_confidence_threshold
        self._client = http_client or httpx.Client(timeout=30.0)

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        if not audio:
            raise ValueError("Audio payload is empty")
        try:
            response = self._client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": self._api_key},
                files={"file": ("kiosk-turn.webm", audio, content_type)},
                data={"model_id": self._model_id, "tag_audio_events": "false"},
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise RuntimeError("ElevenLabs STT request failed") from exc

        transcript = str(payload.get("text") or "").strip()
        correction = correct_transcript(transcript)
        confidence = _word_confidence(payload.get("words"))
        return TranscriptionResult(
            transcript=transcript,
            provider=self.provider_name,
            language=_language_name(payload.get("language_code")),
            confidence=confidence,
            clarification_needed=not transcript or confidence < self._threshold,
            corrected_transcript=correction.corrected_transcript or transcript,
            detected_terms=correction.detected_terms,
            possible_product_matches=correction.possible_product_matches,
        )
```

Use a conservative mean of `exp(logprob)` for word entries; when no word
confidence is available, use `language_probability` only as metadata and do not
claim transcript confidence above the threshold.

- [ ] **Step 4: Wire the selector and required settings**

Add `elevenlabs` to `ALLOWED_STT_PROVIDERS`, add
`ELEVENLABS_STT_MODEL_ID=scribe_v2`, and construct `ElevenLabsSTT` only when
`STT_PROVIDER=elevenlabs`. Require `ELEVENLABS_API_KEY`; credentials alone must
not switch providers.

- [ ] **Step 5: Run STT, provider, and voice route tests**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_elevenlabs_stt.py backend/tests/test_provider_config.py backend/tests/test_api.py -v
```

Expected: PASS with no real ElevenLabs network call.

- [ ] **Step 6: Commit Task 2**

```powershell
git add .env.example backend/app/config.py services/providers.py services/elevenlabs_stt.py backend/tests/test_elevenlabs_stt.py backend/tests/test_provider_config.py
node scripts/check-staged-files.mjs
git commit -m "feat: add ElevenLabs Scribe STT"
```

### Task 3: Add guarded Agnes AI with supplement-only counselling

**Files:**
- Create: `services/agnes_ai.py`
- Create: `backend/tests/test_agnes_ai.py`
- Modify: `services/ollama_ai.py`
- Modify: `services/ai_brain.py`
- Modify: `backend/app/config.py`
- Modify: `services/providers.py`
- Modify: `backend/tests/test_ai_brain.py`
- Modify: `backend/tests/test_provider_config.py`
- Modify: `.env.example`

- [ ] **Step 1: Write failing safety and request-contract tests**

Cover the Agnes endpoint and the pharmacy boundary:

```python
def test_agnes_uses_vitaflow_facts_and_openai_compatible_endpoint() -> None:
    client = RecordingClient({
        "choices": [{"message": {"content": json.dumps({
            "language": "en",
            "intent": "product_counselling",
            "answer": "This supplement contains the VitaFlow-confirmed ingredients.",
            "emotion": "friendly",
            "ui_actions": [],
            "requires_pharmacist": False,
            "safety_notes": [],
        })}}],
    })
    brain = make_agnes_brain(http_client=client)

    result = brain.respond("What are the ingredients in Buffered C?", "JK")

    assert client.url == "https://apihub.agnes-ai.com/v1/chat/completions"
    assert client.headers == {"Authorization": "Bearer test-key"}
    assert result.product is not None
    assert result.product.name == "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S"
    assert result.source == "agnes"
```

Define one-product fixture builders in the test file so every assertion uses a
known category and known VitaFlow facts:

```python
def product_with_category(category: str | None) -> Product:
    return replace(
        MOCK_PRODUCTS[0],
        name="Buffered C",
        aliases=("buffered c",),
        price=31.85,
        stock=1,
        kiosk_category=category,
        productSummary={
            "ingredient": {"en": "500mg Vitamin C"},
            "howToUse": {"en": "Take 1 tablet daily with a meal."},
            "bestFor": {"en": "VitaFlow-confirmed supplement use."},
            "size": {"en": "30 tablets"},
        },
    )


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


def valid_agnes_payload(
    *,
    answer: str,
    intent: str,
    language: str = "en",
) -> dict[str, object]:
    content = json.dumps({
        "language": language,
        "intent": intent,
        "answer": answer,
        "emotion": "friendly",
        "ui_actions": [],
        "requires_pharmacist": False,
        "safety_notes": [],
    })
    return {"choices": [{"message": {"content": content}}]}


class RecordingClient:
    def __init__(self, payload: dict[str, object] | None = None, error: Exception | None = None) -> None:
        self.payload = payload
        self.error = error
        self.calls = 0
        self.url = ""
        self.headers: dict[str, str] = {}

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.calls += 1
        self.url = url
        self.headers = dict(kwargs.get("headers") or {})
        if self.error is not None:
            raise self.error
        return FakeResponse(self.payload or {})


def make_agnes_brain(product: Product, client: RecordingClient) -> AgnesAIBrain:
    vitaflow = MockVitaFlowAPI(products=(product,))
    return AgnesAIBrain(
        vitaflow=vitaflow,
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=EscalationStore(),
        api_key="test-key",
        base_url="https://apihub.agnes-ai.com",
        model="agnes-2.0-flash",
        timeout_seconds=20,
        http_client=client,
    )
```

Then add the concrete safety and flow tests:

```python
@pytest.mark.parametrize("category", ["MEDICINE", "OTC", None, ""])
def test_non_supplement_counselling_escalates_before_agnes_request(category: str | None) -> None:
    client = RecordingClient()
    brain = make_agnes_brain(product_with_category(category), client)

    result = brain.respond("How should I use Buffered C?", "SG-001")

    assert result.requires_pharmacist is True
    assert result.ui_actions == (UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),)
    assert client.calls == 0


def test_supplement_may_explain_only_vitaflow_summary() -> None:
    client = RecordingClient(valid_agnes_payload(
        answer="VitaFlow lists 500mg Vitamin C and says to take 1 tablet daily with a meal.",
        intent="product_counselling",
    ))
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("What are the ingredients and how should I use Buffered C?", "SG-001")

    assert result.requires_pharmacist is False
    assert result.source == "agnes"
    assert "500mg Vitamin C" in result.message
    assert "1 tablet daily" in result.message


def test_agnes_cannot_change_vitaflow_price_or_stock() -> None:
    client = RecordingClient(valid_agnes_payload(
        answer="Buffered C costs RM1.00 and has 999 bottles.",
        intent="product_counselling",
    ))
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("Tell me about Buffered C ingredients", "SG-001")

    assert result.source == "agnes_fallback_mock"
    assert result.product is not None
    assert result.product.price == 31.85
    assert result.product.stock == 1
    assert "RM1.00" not in result.message


def test_agnes_wrong_language_falls_back_to_chinese() -> None:
    client = RecordingClient(valid_agnes_payload(
        answer="This supplement contains Vitamin C.",
        language="en",
        intent="product_counselling",
    ))
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("Buffered C 有什么成分？", "SG-001", preferred_language="zh")

    assert result.source == "agnes_fallback_mock"
    assert any("\u4e00" <= char <= "\u9fff" for char in result.message)


def test_agnes_timeout_keeps_deterministic_result() -> None:
    client = RecordingClient(error=httpx.TimeoutException("test timeout"))
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("What are the ingredients in Buffered C?", "SG-001")

    assert result.source == "agnes_fallback_mock"
    assert result.product is not None
    assert result.product.name == "Buffered C"


def test_product_detail_does_not_offer_unrelated_promotions() -> None:
    product = product_with_category("VITAMIN")
    brain = MockAIBrain(
        vitaflow=MockVitaFlowAPI(products=(product,)),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=EscalationStore(),
    )

    result = brain.respond("Show Buffered C product details", "SG-001", session_id="s1")

    assert result.product == product
    assert all(action.type is not UiActionType.SHOW_PROMOTION_GALLERY for action in result.ui_actions)
    follow_up = brain.respond("yes", "SG-001", session_id="s1")
    assert all(action.type is not UiActionType.SHOW_PROMOTION_GALLERY for action in follow_up.ui_actions)
```

- [ ] **Step 2: Run tests and verify failures**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_agnes_ai.py backend/tests/test_ai_brain.py -v
```

Expected: FAIL because the Agnes provider and category gate do not exist, and the
current no-promotion flow creates an unsolicited gallery follow-up.

- [ ] **Step 3: Make the existing guarded wording layer provider-neutral enough for Agnes**

In `OllamaAIBrain`, replace fixed fallback source strings with:

```python
@property
def fallback_source(self) -> str:
    return f"{self.provider_name}_fallback_mock"
```

Use `self.fallback_source` for every invalid/offline fallback. Keep all existing
schema, language, UI-action, intent, safety, and invented-fact validation.

Create `AgnesAIBrain(OllamaAIBrain)` and override only the HTTP transport:

```python
class AgnesAIBrain(OllamaAIBrain):
    provider_name = "agnes"

    def __init__(self, *, api_key: str, base_url: str, **kwargs: object) -> None:
        super().__init__(base_url=base_url, **kwargs)
        self._api_key = api_key

    def _call_ollama(self, payload: dict[str, object]) -> dict[str, object] | None:
        request = {
            "model": self.model,
            "messages": payload["messages"],
            "temperature": 0,
            "max_tokens": 900,
            "stream": False,
        }
        try:
            response = self._client.post(
                f"{self._base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=request,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except (httpx.HTTPError, ValueError, TypeError, KeyError, IndexError):
            return None
        return parsed if isinstance(parsed, dict) else None
```

- [ ] **Step 4: Enforce supplement-only counselling before Agnes**

Add a single category predicate in `MockAIBrain`:

```python
SUPPLEMENT_CATEGORIES = {
    "supplement", "vitamin", "mineral", "nutrition", "health supplement",
}

@staticmethod
def _is_confirmed_supplement(product: Product) -> bool:
    return (product.kiosk_category or "").strip().casefold() in SUPPLEMENT_CATEGORIES
```

For `Intent.PRODUCT_COUNSELLING`, return the VitaFlow summary without automatic
pharmacist confirmation only when this predicate is true. Otherwise create the
existing pharmacist handoff result before calling Agnes. Do not let Agnes infer
the category.

Remove `_fallback_leaflet_gallery_action` from ordinary product search and
counselling results. Set promotion/campaign pending state only after an explicit
promotion/campaign request.

- [ ] **Step 5: Wire Agnes settings and provider construction**

Add:

```dotenv
AI_PROVIDER=mock
AGNES_API_KEY=
AGNES_BASE_URL=https://apihub.agnes-ai.com
AGNES_MODEL=agnes-2.0-flash
AGNES_TIMEOUT_SECONDS=20
```

Require `AGNES_API_KEY` only when `AI_PROVIDER=agnes` or
`VISION_PROVIDER=agnes`; never expose it in `provider_summary`.

- [ ] **Step 6: Run all AI safety tests**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_agnes_ai.py backend/tests/test_ollama_ai.py backend/tests/test_ai_brain.py backend/tests/test_services.py -v
```

Expected: PASS; Ollama behavior remains compatible and Agnes cannot provide
medicine advice or invent VitaFlow facts.

- [ ] **Step 7: Commit Task 3**

```powershell
git add .env.example backend/app/config.py services/models.py services/ai_brain.py services/ollama_ai.py services/agnes_ai.py services/providers.py backend/tests/test_agnes_ai.py backend/tests/test_ai_brain.py backend/tests/test_provider_config.py
node scripts/check-staged-files.mjs
git commit -m "feat: add guarded Agnes AI provider"
```

### Task 4: Add real Agnes product vision resolved through VitaFlow

**Files:**
- Create: `services/agnes_vision.py`
- Create: `backend/tests/test_agnes_vision.py`
- Modify: `backend/app/config.py`
- Modify: `services/providers.py`
- Modify: `backend/app/routes/vision.py`
- Modify: `backend/tests/test_provider_config.py`
- Modify: `backend/tests/test_api.py`
- Modify: `.env.example`

- [ ] **Step 1: Write failing vision tests with two different images**

Use two tiny generated JPEG fixtures whose bytes differ, and a fake Agnes client
that returns different strict signals. Do not use fixed Buffered C output:

```python
def test_agnes_vision_resolves_each_label_against_vitaflow() -> None:
    client = SequenceAgnesClient([
        {"brand": "Blackmores", "product_name": "Buffered C", "pack_size": "30S", "barcode": None, "label_text": "Buffered C"},
        {"brand": "Fisherman's Friend", "product_name": "Lemon", "pack_size": "25GM", "barcode": None, "label_text": "Fisherman's Friend Lemon"},
    ])
    vision = AgnesProductVision(client=client)

    first = vision.scan_product(JPEG_ONE, "image/jpeg", "JK", "auto", vitaflow)
    second = vision.scan_product(JPEG_TWO, "image/jpeg", "JK", "auto", vitaflow)

    assert first.candidates[0].product.name.startswith("BLACKMORES BUFFERED C")
    assert second.candidates[0].product.name.startswith("FISHERMAN S FRIEND")
    assert first.candidates[0].product.id != second.candidates[0].product.id
```

Add tests for exact barcode auto-match, ambiguous candidates requiring
confirmation, no match returning no candidate, invalid Agnes JSON, timeout,
oversized frame, and no filesystem writes.

- [ ] **Step 2: Run tests and verify the missing provider failure**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_agnes_vision.py -v
```

Expected: FAIL because `AgnesProductVision` does not exist.

- [ ] **Step 3: Implement strict signal extraction**

Create a frozen signal type and parse only these fields:

```python
@dataclass(frozen=True)
class AgnesLabelSignals:
    brand: str = ""
    product_name: str = ""
    pack_size: str = ""
    barcode: str = ""
    label_text: str = ""
```

Send an OpenAI-compatible message with a direct data URI:

```python
content = [
    {
        "type": "text",
        "text": (
            "Read only visible package identity. Return JSON with brand, "
            "product_name, pack_size, barcode, and label_text. Do not give "
            "medical advice, product facts, price, stock, or location."
        ),
    },
    {
        "type": "image_url",
        "image_url": {"url": f"data:{content_type};base64,{encoded}"},
    },
]
```

Reject extra object shapes, values over 300 characters, markdown fences, and
non-string fields. Try exact barcode through `get_product_by_barcode`; otherwise
search `brand + product_name + pack_size`, then `label_text`. Return only
VitaFlow-produced `Product` objects.

- [ ] **Step 4: Fail closed if direct in-memory image input is rejected**

Map Agnes 400/415 responses to:

```python
raise RuntimeError("agnes_direct_image_input_not_supported")
```

In the route, return HTTP 503 with the customer message
`Cloud product vision is unavailable. Please scan again or search manually.`
Do not upload the frame to a public URL.

- [ ] **Step 5: Add image size and type bounds**

In `backend/app/routes/vision.py`:

```python
MAX_SCAN_BYTES = 4 * 1024 * 1024

frame = await image.read(MAX_SCAN_BYTES + 1)
if not frame or len(frame) > MAX_SCAN_BYTES:
    return invalid_image_error()
```

Keep JPEG, PNG, and WebP only.

- [ ] **Step 6: Wire `VISION_PROVIDER=agnes`**

Construct `AgnesProductVision` only when selected, using the same Agnes key and
base URL but a separate `AGNES_VISION_MODEL=agnes-2.0-flash` setting.

- [ ] **Step 7: Run vision and provider tests**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_agnes_vision.py backend/tests/test_provider_config.py backend/tests/test_api.py backend/tests/test_services.py -v
```

Expected: PASS with zero live calls and zero saved frames.

- [ ] **Step 8: Commit Task 4**

```powershell
git add .env.example backend/app/config.py backend/app/routes/vision.py services/agnes_vision.py services/providers.py backend/tests/test_agnes_vision.py backend/tests/test_provider_config.py backend/tests/test_api.py
node scripts/check-staged-files.mjs
git commit -m "feat: add VitaFlow-bound Agnes vision"
```

### Task 5: Make scan, product, and route state atomic

**Files:**
- Modify: `frontend/src/components/CameraScanOverlay.tsx`
- Modify: `frontend/src/components/ProductCandidatePanel.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/App.integration.test.tsx`
- Create: `frontend/src/components/CameraScanOverlay.test.tsx`

- [ ] **Step 1: Write failing frontend integration tests**

Add tests for the exact failures observed in the demo:

```tsx
it("keeps the scanner open after no match and scans again", async () => {
  api.scanProduct = vi.fn()
    .mockResolvedValueOnce({ ok: true, candidates: [], requiresConfirmation: false, message: "No match yet." })
    .mockResolvedValueOnce(fishermanScanResult);

  render(<App />);
  await user.click(screen.getByRole("button", { name: /scan product/i }));
  await completeCameraCapture();
  expect(screen.getByRole("dialog", { name: /scan product/i })).toBeVisible();
  await user.click(screen.getByRole("button", { name: /scan again/i }));
  await completeCameraCapture();
  expect(screen.getByText("FISHERMAN S FRIEND (SF) LEMON 25GM")).toBeVisible();
});

it("replaces product and route together without a stale candidate", async () => {
  render(<App />);
  await selectScanResult(bufferedCScanResult);
  await selectScanResult(fishermanScanResult);
  expect(screen.getByText("FISHERMAN S FRIEND (SF) LEMON 25GM")).toBeVisible();
  expect(screen.queryByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).not.toBeInTheDocument();
  expect(screen.getByLabelText(/shelf navigation/i)).toHaveTextContent("Counter 2");
});
```

Add a test proving an exact single barcode match closes automatically, while a
label match remains open until confirmation.

- [ ] **Step 2: Run the frontend tests and verify failures**

```powershell
npm.cmd run test:run --prefix frontend -- CameraScanOverlay.test.tsx App.integration.test.tsx
```

Expected: FAIL on no-match retention or stale product/candidate state.

- [ ] **Step 3: Keep scanning until success, explicit close, or cancel**

In `CameraScanOverlay`, replace unconditional close after a scan with:

```tsx
if (result.candidates.length === 0) {
  setStatus(result.message || labels.noMatchYet);
  setPhase("no_match");
  return;
}
onResult(result);
if (!result.requiresConfirmation && result.candidates.length === 1) {
  stopCamera();
  onClose();
}
```

The Scan Again button must reset only scan-local status, not the selected product.

- [ ] **Step 4: Apply a confirmed product as one state transition**

Create one helper in `App.tsx`:

```tsx
const applyConfirmedProduct = useCallback((product: Product) => {
  voice.stopCurrentAudio();
  setSelectedProductCandidate(null);
  setScanProductCandidates([]);
  setProductOverride(product);
  setModalLeafletId(null);
  setShelfMapOpen(false);
  setSelectedShelfProductId(product.id);
}, [voice]);
```

Derive the route only from `selectedShelfProductId === displayedProduct.id`; if
the IDs differ, show no route until the current product's VitaFlow location is
available.

- [ ] **Step 5: Run the targeted frontend tests**

```powershell
npm.cmd run test:run --prefix frontend -- CameraScanOverlay.test.tsx ProductCandidatePanel.test.tsx ShelfMap.test.tsx App.integration.test.tsx
```

Expected: PASS; Buffered C and Fisherman's Friend never appear simultaneously as
current and candidate products.

- [ ] **Step 6: Commit Task 5**

```powershell
git add frontend/src/App.tsx frontend/src/api/client.ts frontend/src/types.ts frontend/src/components/CameraScanOverlay.tsx frontend/src/components/CameraScanOverlay.test.tsx frontend/src/components/ProductCandidatePanel.tsx frontend/src/App.integration.test.tsx
node scripts/check-staged-files.mjs
git commit -m "fix: keep scan product and route state consistent"
```

### Task 6: Verify modal exit, touch scroll, VRM mouth reset, and gaze

**Files:**
- Modify: `frontend/src/components/LeafletModal.tsx`
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/components/avatar/VrmAvatarRenderer.tsx`
- Modify: `frontend/src/hooks/useVoiceInteraction.ts`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/components/LeafletModal.test.tsx`
- Modify: `frontend/src/components/ProductCard.test.tsx`
- Modify: `frontend/src/components/avatar/VrmAvatarRenderer.test.tsx`
- Modify: `frontend/src/hooks/useVoiceInteraction.test.ts`

- [ ] **Step 1: Write failing interaction tests**

Cover AI-opened and manual overlays identically:

```tsx
it.each(["ai", "manual"])("closes the enlarged map on backdrop click when opened by %s", async (source) => {
  render(<App initialMapOpenSource={source} />);
  await user.click(screen.getByTestId("modal-backdrop"));
  expect(screen.queryByRole("dialog", { name: /enlarged pharmacy route/i })).not.toBeInTheDocument();
});

it("sets VRM mouth to zero when TTS playback ends", async () => {
  const { rerender } = render(<VrmAvatarRenderer state="speaking" audioActivity={0.8} />);
  rerender(<VrmAvatarRenderer state="idle" audioActivity={0} />);
  expect(mockExpressionManager.setValue).toHaveBeenLastCalledWith("aa", 0);
});
```

Add tests for Escape, close button, hidden scrollbar with wheel scrolling, touch
`pointerdown/pointermove` scrolling, TTS failure, and gaze target `right` for
product/leaflet panels.

- [ ] **Step 2: Run tests and verify any remaining failures**

```powershell
npm.cmd run test:run --prefix frontend -- LeafletModal.test.tsx ProductCard.test.tsx VrmAvatarRenderer.test.tsx useVoiceInteraction.test.ts App.integration.test.tsx
```

Expected: at least one test fails if AI-opened overlays or TTS errors leave stale
state.

- [ ] **Step 3: Use one overlay close path**

For every enlarged overlay:

```tsx
<div
  className="modal-backdrop"
  data-testid="modal-backdrop"
  onPointerDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}
>
  <section role="dialog" onPointerDown={(event) => event.stopPropagation()}>
```

Register an Escape listener while open. AI actions may set the open state but may
not replace the close handler.

- [ ] **Step 4: Reset mouth and gaze deterministically**

In the VRM frame update:

```tsx
const mouthOpen = state === "speaking" ? clamp(audioActivity, 0, 1) : 0;
expressionManager.setValue("aa", mouthOpen);
```

In cleanup and every transition out of speaking, set `aa` to zero. Drive gaze
from a whitelisted `focusTarget: "center" | "product" | "leaflet" | "map"`; map
the three UI panels to bounded head/eye rotations instead of free coordinates.

- [ ] **Step 5: Preserve invisible scrolling and touch swipe**

Use:

```css
.modal-scroll-region {
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  touch-action: pan-y;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.modal-scroll-region::-webkit-scrollbar { display: none; }
```

Do not attach `preventDefault` to vertical touch movement inside this region.

- [ ] **Step 6: Run interaction tests and build**

```powershell
npm.cmd run test:run --prefix frontend -- LeafletModal.test.tsx ProductCard.test.tsx VrmAvatarRenderer.test.tsx useVoiceInteraction.test.ts App.integration.test.tsx
npm.cmd run build --prefix frontend
```

Expected: tests PASS and Vite build exits 0.

- [ ] **Step 7: Commit Task 6**

```powershell
git add frontend/src/components/LeafletModal.tsx frontend/src/components/ProductCard.tsx frontend/src/components/avatar/VrmAvatarRenderer.tsx frontend/src/hooks/useVoiceInteraction.ts frontend/src/styles.css frontend/src/components/LeafletModal.test.tsx frontend/src/components/ProductCard.test.tsx frontend/src/components/avatar/VrmAvatarRenderer.test.tsx frontend/src/hooks/useVoiceInteraction.test.ts
node scripts/check-staged-files.mjs
git commit -m "fix: stabilize VitaKiosk overlays and VRM speech"
```

### Task 7: Add safe runtime readiness and a repeatable live-demo launcher

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_health.py`
- Create: `scripts/start-live-demo.ps1`
- Modify: `scripts/check-provider-secrets.mjs`
- Modify: `README.md`
- Modify: `docs/local-demo-env.md`
- Modify: `frontend/.env.local.example`

- [ ] **Step 1: Write failing safe-status tests**

```python
def test_runtime_status_reports_readiness_without_secrets(monkeypatch) -> None:
    monkeypatch.setattr("backend.app.main.check_agnes_reachable", lambda settings: True)
    monkeypatch.setattr("backend.app.main.check_vitaflow_reachable", lambda settings: True)
    payload = client.get("/api/runtime/status").json()
    assert payload["agnes_reachable"] is True
    assert payload["vitaflow_reachable"] is True
    serialized = json.dumps(payload)
    assert "api_key" not in serialized.casefold()
    assert "authorization" not in serialized.casefold()
```

- [ ] **Step 2: Run and verify the missing readiness fields**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_health.py -v
```

Expected: FAIL because Agnes and VitaFlow readiness fields are absent.

- [ ] **Step 3: Implement bounded health probes**

Agnes probe: POST a minimal non-customer test only when `AI_PROVIDER=agnes` or
`VISION_PROVIDER=agnes`, with a maximum 3-second timeout and no response body in
status. VitaFlow probe: GET the kiosk search endpoint for the configured demo
branch with a non-matching sentinel and accept any valid `{ok: true}` response.
Return booleans only.

- [ ] **Step 4: Add a non-secret launcher**

`scripts/start-live-demo.ps1` must:

```powershell
$required = @('AGNES_API_KEY','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID')
# Parse presence only; never print values.
# Verify VitaFlow port 3100.
# Start backend with the project .venv on port 8001.
# Start frontend with npm.cmd on port 5175.
# Poll /health, /api/runtime/status, and the frontend root.
# Exit non-zero unless all required providers report ready.
```

Pass `-WindowStyle Hidden` for background helpers. Do not write `.env` or create
logs containing request/response payloads.

- [ ] **Step 5: Document the exact local selector profile**

```dotenv
VITAKIOSK_PROVIDER_MODE=mock
STT_PROVIDER=elevenlabs
TTS_PROVIDER=elevenlabs
AI_PROVIDER=agnes
VISION_PROVIDER=agnes
VITAFLOW_PROVIDER=readonly_api
VITAFLOW_API_BASE_URL=http://127.0.0.1:3100
AGNES_API_KEY=
AGNES_BASE_URL=https://apihub.agnes-ai.com
AGNES_MODEL=agnes-2.0-flash
AGNES_VISION_MODEL=agnes-2.0-flash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_STT_MODEL_ID=scribe_v2
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
```

Frontend example remains:

```dotenv
VITE_AVATAR_RENDERER=vrm
VITE_VRM_MODEL=vita-new
```

- [ ] **Step 6: Run status and repository safety tests**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/test_health.py backend/tests/test_provider_config.py -v
node scripts/check-provider-secrets.mjs
npm.cmd run check:repo
```

Expected: PASS with no secret value in tracked files or runtime JSON.

- [ ] **Step 7: Commit Task 7**

```powershell
git add backend/app/main.py backend/tests/test_health.py scripts/start-live-demo.ps1 scripts/check-provider-secrets.mjs README.md docs/local-demo-env.md frontend/.env.local.example
node scripts/check-staged-files.mjs
git commit -m "feat: add verified live demo startup"
```

### Task 8: Run live provider and end-to-end demo acceptance

**Files:**
- Modify: local ignored `.env` (never stage)
- Modify: local ignored `frontend/.env.local` (never stage)
- Modify: `reports/test-evidence.md`

- [ ] **Step 1: Rotate the exposed Agnes key outside the repository**

Revoke the key pasted in chat. Put the replacement key directly in the ignored
local `.env` as `AGNES_API_KEY`; do not paste it into a command, test, report, or
chat. Confirm only key presence with the existing boolean preflight.

- [ ] **Step 2: Set the approved local profile without printing secrets**

Use the exact selector profile from Task 7 and verify only:

```text
AGNES_API_KEY_present=true
ELEVENLABS_API_KEY_present=true
ELEVENLABS_VOICE_ID_present=true
```

- [ ] **Step 3: Run the full automated suites before any live call**

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -v
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd run check:repo
```

Expected: every command exits 0.

- [ ] **Step 4: Start the verified runtime**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-live-demo.ps1
```

Expected:

```text
VitaFlow: ready
Backend: ready
Frontend: ready
Agnes: ready
ElevenLabs STT: configured
ElevenLabs TTS: configured
VRM: vita-new
```

- [ ] **Step 5: Run multilingual voice acceptance**

Record deliberate non-customer demo turns:

```text
EN: Show me Buffered C product details.
ZH: 请给我看 Buffered C 的产品资料。
MS: Tunjukkan maklumat produk Buffered C.
```

Confirm transcript language, matching response language, correct VitaFlow product,
audible ElevenLabs voice, moving mouth during playback, and closed mouth afterward.

- [ ] **Step 6: Run pharmacy safety acceptance**

```text
Supplement: What are the ingredients and how do I use Buffered C?
Medicine: Which cough medicine should I take and what dose?
Red flag: I have chest pain and difficulty breathing.
```

Confirm the supplement answer uses only VitaFlow summary fields; the medicine and
red-flag prompts request a pharmacist before Agnes can advise.

- [ ] **Step 7: Run real two-product vision and route acceptance**

Scan the physical Buffered C package, then a physical Fisherman's Friend package.
For each scan confirm:

```text
Agnes returned different visual label signals.
VitaFlow returned the displayed product and image.
The previous product and candidate disappeared.
The map route target matches the current product location.
Unknown packaging keeps the scan overlay open.
```

Do not count a test marker, preset candidate, OCR-only forced match, or one hardcoded
product as success.

- [ ] **Step 8: Run modal and VRM acceptance**

Open the route once manually and once via the AI location request. Close both by
backdrop, close control, and Escape. Open product summary and leaflets, verify
mouse-wheel and touchscreen swipe scrolling with no visible scrollbar, and verify
the avatar looks toward the active panel.

- [ ] **Step 9: Record sanitized evidence**

Append a row to `reports/test-evidence.md` listing commands, pass/fail results,
tested product names, languages, and UI outcomes. Do not include frames, audio,
transcripts beyond the fixed demo phrases, keys, endpoints other than localhost,
or raw VitaFlow payloads.

- [ ] **Step 10: Run the final safety check and commit evidence**

```powershell
git add reports/test-evidence.md
node scripts/check-staged-files.mjs
git diff --cached --check
git commit -m "test: record live VitaKiosk demo acceptance"
```

The demo is ready only if every Task 8 acceptance step passes. If direct Agnes
image content is unsupported or a rotated Agnes key is unavailable, report the
Vision or Agnes layer as blocked and do not describe the demo as fully ready.
