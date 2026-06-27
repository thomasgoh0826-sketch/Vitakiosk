# Site Video Orbit

The homepage video hub uses `SphericalVideoCarousel`; it is not a horizontal
card row.

## State Ownership

- `activeVideoIndex` belongs only to the carousel.
- Page scroll never overwrites the video index.
- Hover state only controls preview playback.
- The full viewer owns its own open/close state and returns focus to the card
  that opened it.

## Drag / Swipe Behavior

- Mouse and touch drag update `dragProgress` continuously.
- Release projects a damped velocity and snaps to the nearest card.
- Normal swipes advance predictably; very long or fast swipes can move more
  than one card without creating a bounce or z-index pop.
- Trackpad horizontal wheel gestures rotate the orbit with a short lockout.
- Arrows remain secondary controls.
- There is no native horizontal scrollbar.

## Video Loading

- Posters render first.
- Preview video source is mounted only for the active or hovered card.
- Preview videos are muted, inline, looped, and metadata-preloaded.
- Pointer leave pauses and resets the preview.
- Click/tap opens `VideoViewerModal` with controls; sound is available only
  after user action.
- Escape and outside click close the viewer.

## Manifest

All video paths come from:

```text
apps/site/src/content/videoHub.ts
apps/site/src/content/demoAssets.ts
```

Do not hardcode video paths inside carousel components.
