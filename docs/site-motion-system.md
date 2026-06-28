# Site Motion System

The homepage is authored as a small number of immersive scenes, not a normal card stack.

## Architecture

- `GlobalGlowBackdrop` owns the global pointer/touch glow field.
- GSAP ScrollTrigger owns homepage journey progress.
- `activeSceneIndex` is derived from one scroll controller in `ScrollSceneController`.
- The pinned journey currently has nine deterministic steps: five product
  showcase positions, then interactive demo, ERP source, partner corridor, and
  AI split scene.
- The video carousel owns continuous `orbitalProgress`; `activeVideoIndex` is derived from the nearest item.
- Page scroll does not mutate the video carousel index.
- The carousel has no native horizontal overflow or scrollbar.
- Reduced motion disables pinned scroll choreography and keeps every scene visible.

## Glow Backdrop

Component:

```text
GlobalGlowBackdrop
```

Behavior:

- A fixed CSS glow layer is mounted once per site page at the root layout layer, above
  the static background and behind all content.
- It uses `pointer-events: none` and never blocks buttons, cards, forms, or videos.
- Pointer and touch movement softly shift a cyan/violet ambient spotlight.
- The component does not render water, ripples, canvas wakes, circular pulses,
  fluid distortion, or tap explosions.
- Pointer movement only changes CSS variables for glow position and subtle
  intensity; when the pointer stops, the glow calmly settles.
- The page also updates `--pointer-x` and `--pointer-y` so foreground glass
  panels receive a soft light bend from the same pointer source.
- Scroll progress changes the depth/intensity of the glow field.
- The animation loop pauses when the tab is hidden.
- In reduced-motion environments, the component falls back to a static gradient.

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
- The carousel stores one continuous normalized `orbitalProgress` value.
- The visible ring renders the seven logical videos once; each card computes a
  wrapped relative offset from `orbitalProgress`, so the loop is continuous
  without stacking duplicate cards in the visible active area.
- `activeVideoIndex` is derived from the nearest item on that rotation.
- Each card's visual position is derived from its logical index minus
  `orbitalProgress`, wrapped into the shortest circular distance instead of
  resetting at either end.
- Active card is large, readable, and has the highest z-depth.
- Side cards curve backward in a cylindrical path with generous spacing and no
  overlap with the active card footprint.
- Far/back cards become dim atmosphere; far text is hidden so it cannot bleed
  into the center card.
- The orbit rotates slowly by itself with constant delta-time velocity when idle;
  it does not snap, pause, or wait at each centered card.
- Hover, touch, drag, keyboard focus, preview playback, and the full viewer pause
  auto-rotation.
- Auto-rotation resumes immediately on pointer leave, and after a short idle
  delay for touch/drag/viewer close when the pointer is no longer inside.
- Pointer or touch drag updates orbit rotation continuously before snapping.
- Release uses damped velocity projection so normal swipes do not jump across
  too many cards.
- Wheel/trackpad movement inside the orbit frame is captured by the frame and
  converted to damped orbit velocity; page scrolling remains normal outside the
  orbit frame.
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
