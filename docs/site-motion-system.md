# Site Motion System

The homepage is authored as a small number of immersive scenes, not a normal card stack.

## Architecture

- `GlobalLiquidBackdrop` owns the global pointer/touch liquid field.
- GSAP ScrollTrigger owns homepage journey progress.
- `activeSceneIndex` is derived from one scroll controller in `ScrollSceneController`.
- The pinned journey currently has nine deterministic steps: five product
  showcase positions, then interactive demo, ERP source, partner corridor, and
  AI split scene.
- The video carousel owns continuous `orbitRotation`; `activeVideoIndex` is derived from the nearest item.
- Page scroll does not mutate the video carousel index.
- The carousel has no native horizontal overflow or scrollbar.
- Reduced motion disables pinned scroll choreography and keeps every scene visible.

## Fluid Backdrop

Component:

```text
GlobalLiquidBackdrop
```

Behavior:

- A fixed canvas is mounted once per site page at the root layout layer, above
  the static background and behind all content.
- It uses `pointer-events: none` and never blocks buttons, cards, forms, or videos.
- Pointer and touch movement create subtle cyan/violet ripple rings.
- The page also updates `--pointer-x` and `--pointer-y` so foreground glass
  panels receive a soft light bend from the same pointer source.
- Scroll progress changes the depth/intensity of the canvas field.
- The animation loop pauses when the tab is hidden.
- In test or reduced-motion environments, the component falls back to a static
  gradient and does not start the animation loop.

## Homepage Journey

The current homepage sequence is:

1. Hero cinematic lab scene.
2. Pinned system showcase stage.
3. Interactive VitaKiosk demo stage.
4. VitaFlow ERP source-of-truth scene.
5. Clinic and pharmacy partner corridor.
6. AI Website Studio and AI Academy split scene.
7. Spherical video carousel.
8. Commerce console.
9. Final CTA.

## Scroll Stability Rules

- One ScrollTrigger controls `activeSceneIndex`.
- Direction-aware index updates prevent scroll-down progress from flickering
  backward at label boundaries.
- No IntersectionObserver competes for the same active scene state.
- No native horizontal scrolling is nested inside pinned sections.
- Pinned duration is bounded to avoid huge empty spacer gaps.
- Scene height is stable before ScrollTrigger calculates.
- `invalidateOnRefresh` and a delayed refresh run after media/image load.
- Cleanup kills the ScrollTrigger on unmount.

## Spherical Video Carousel

Component:

```text
SphericalVideoCarousel
VideoPreviewCard
VideoViewerModal
```

Behavior:

- Cards are positioned with CSS 3D variables: angle, x offset, z depth, scale, opacity, and z index.
- The carousel stores one continuous `orbitRotation` value.
- `activeVideoIndex` is derived from the nearest item on that rotation.
- Active card is large and readable.
- Side cards curve backward in a cylindrical path.
- Far/back cards remain visible as atmosphere and become pointer targets only
  after rotating closer.
- The orbit rotates slowly by itself when idle.
- Hover, touch, drag, keyboard focus, preview playback, and the full viewer pause auto-rotation.
- Auto-rotation resumes after a short idle delay once the user leaves or stops interacting.
- Pointer or touch drag updates orbit rotation continuously before snapping.
- Release uses damped velocity projection so normal swipes do not jump across
  too many cards.
- Horizontal trackpad wheel can rotate the orbit, but there is no native
  horizontal scrollbar.
- Visible previous/next arrow buttons are intentionally removed.
- Pointer hover loads and plays only that muted preview.
- Pointer leave pauses and resets the preview.
- Click or Enter opens the full viewer.
- Escape or outside click closes the viewer.
- Focus returns to the opener after closing.

## Performance

- Posters render first.
- Video sources lazy-load only for active or hovered cards.
- Preview video is muted, inline, metadata-preloaded, and looped.
- Full viewer uses controls and starts only after user action.
- If autoplay is blocked or media is unsupported, the card stays poster-only without console spam.
