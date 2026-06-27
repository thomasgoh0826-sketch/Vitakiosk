# Interactive VitaKiosk Site Demo

The public marketing site now uses a code-native React demo instead of a flat kiosk screenshot.

## Source Component

```text
apps/site/src/App.tsx
InteractiveVitaKioskDemo
```

The demo is simulated for marketing. It does not require the live kiosk frontend, backend, microphone, camera, ElevenLabs, Ollama, or VitaFlow ERP.

## Approved Screenshot Rule

The only approved local VitaKiosk UI reference is:

```text
apps/site/public/assets/reference/vitakiosk-demo-approved.png
```

This screenshot is a visual reference only. The public demo is rebuilt with React layers and CSS so visitors can click and tap inside it.

Do not add screenshots from `reports/evidence`, old capture folders, private ERP folders, temporary screenshots, customer data, or sales data.

## Demo States

State content is controlled in:

```text
apps/site/src/content/interactiveDemoStates.ts
```

Supported states:

- `idle`: avatar panel, product panel, shelf route, promotion leaflet, ERP provenance, Tap to Speak, Scan Product, and staff handoff controls.
- `listening`: Tap to Speak shows the animated waveform and transcript `Where is Relief Balm?`.
- `fuzzy`: the `Relief Bomb` chip opens `Do you mean Relief Balm?`.
- `promotion`: the leaflet enlarges into a cinematic glass sheet.
- `product`: the product sheet morphs between summary and detail.
- `shelf`: the shelf map enlarges and animates the route to Shelf A-03.
- `scan`: a mock camera/scan overlay shows `Packaging detected`.
- `assist`: safe handoff copy says a pharmacist or staff member can assist.

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
