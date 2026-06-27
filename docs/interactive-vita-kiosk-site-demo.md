# Interactive VitaKiosk Site Demo

The public marketing site now uses a code-native React demo instead of a flat kiosk screenshot.

## Source Component

```text
apps/site/src/App.tsx
InteractiveVitaKioskDemo
```

The demo is simulated for marketing. It does not require the live kiosk frontend, backend, microphone, camera, ElevenLabs, Ollama, or VitaFlow ERP. The local live demo link is secondary only; the public page works by itself.

## Approved Screenshot Rule

The only approved local VitaKiosk UI reference is:

```text
apps/site/public/assets/reference/vitakiosk-demo-approved.png
```

This screenshot is the visible high-fidelity base surface for the website demo,
but it is not the whole demo. A locked base layer keeps the screenshot sharp and
readable while React controls, transparent hotspots, lightweight highlights,
transcripts, route animation, scan state, fuzzy candidate state, and modal sheets
sit above it.

The screenshot stays full opacity with no blur filter. The demo frame uses
non-scrollable clipping so hotspot focus cannot push the screenshot layer out of
alignment. The interactive layer is intentionally lightweight so the public
website does not become a flat image or a fake redrawn wireframe.

Do not add screenshots from `reports/evidence`, old capture folders, private ERP folders, temporary screenshots, customer data, or sales data.

## Demo States

State content is controlled in:

```text
apps/site/src/content/interactiveDemoStates.ts
```

Supported states:

- `idle`: approved screenshot base with transparent hotspots over Tap to Speak, product, shelf route, promotion leaflet, scan, language, and staff handoff regions.
- `listening`: Tap to Speak shows the animated waveform and transcript `Where is Relief Balm?`.
- `answering`: product, shelf, and promotion regions glow with the simulated response.
- `fuzzy_match`: the `Relief Bomb` chip opens `Do you mean Relief Balm?`.
- `promotion_open`: the leaflet enlarges into a cinematic glass sheet.
- `product_enlarged`: the product sheet morphs between summary and detail.
- `shelf_route`: the approved screenshot stays visible while an animated route overlay and target pulse highlight Shelf A-03.
- `scan_product`: a mock camera/scan overlay shows `Packaging detected` and `Best match: Relief Balm`.
- `pharmacist_handoff`: safe handoff copy says a pharmacist or staff member can assist.

## Interaction Layer

Visible hotspots and native controls cover the key product regions:

- Tap to Speak
- Product panel
- Promotion leaflet
- Shelf map
- Scan Product
- Request assistance
- Language chips

The language rail is layered above the Tap to Speak hotspot so EN, 中文, and BM
remain clickable. Modal and callout layers temporarily disable the transparent
hotspot layer so close, select, and toggle controls cannot be intercepted.

Hover and focus states glow instead of shifting layout. State transitions use
the same cyan/violet glass language as the approved screenshot. Promotion uses
a cylindrical leaflet entrance; product uses a holographic summary/detail
morph; shelf replay uses an animated route trace over the real screenshot.

The component is intentionally simulated:

- no microphone
- no real camera
- no backend dependency
- no ElevenLabs/Ollama/VitaFlow live call
- no customer or sales data

## Safety Copy

Use only this positioning:

```text
Product education and guidance only. Not diagnosis, prescription consultation, or professional medical advice.
```

Never position VitaKiosk as an AI doctor, diagnosis tool, prescription consultant, pharmacist replacement, hospital endorsement, doctor endorsement, or guaranteed result system.

## Local Live Demo Link

The marketing demo includes an optional local link:

```text
http://127.0.0.1:5175
```

That is only for development. Public visitors must be able to use the simulated demo without local services.
