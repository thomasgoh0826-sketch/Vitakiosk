# Site Video Orbit

The homepage video hub uses `SphericalVideoCarousel`; it is not a horizontal
card row.

## State Ownership

- `orbitRotation` belongs only to the carousel.
- `activeVideoIndex` is derived from the nearest item on `orbitRotation`.
- Page scroll never overwrites the video index.
- Hover state only controls preview playback.
- `isUserInteracting` pauses auto-rotation when hover, touch, focus, drag, preview, or modal state is active.
- The full viewer owns its own open/close state and returns focus to the card
  that opened it.

## Drag / Swipe Behavior

- The orbit slowly auto-rotates when idle, like a display installation.
- Auto-rotation pauses on pointer enter, touch start, drag, preview hover, keyboard focus, or full viewer open.
- Auto-rotation resumes after a short idle delay once interaction stops.
- Mouse and touch drag update `orbitRotation` continuously.
- Release projects a damped velocity and snaps to the nearest card.
- Normal swipes advance predictably; very long or fast swipes can move more
  than one card without creating a bounce or z-index pop.
- Trackpad horizontal wheel gestures rotate the orbit with a short lockout.
- Visible previous/next arrow buttons are removed.
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
