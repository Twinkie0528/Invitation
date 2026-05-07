# update3.md — Third pass refinements for the Unitel 20 invitation site

This document captures the third round of changes after [update2.md](update2.md)
has been merged. It assumes the current site map (Dear → CEO → Urtuu → Gala →
RSVP) is the starting state and that the LoadingOverlay's FLIP hand-off into
the Dear-page anniversary lockup has already been wired up.

User feedback at the start of this pass (verbatim, Mongolian):

> эхний Loading хийх үед гарч ирдэг Unitel гэх том лого байгаа түүнийг
> common/unitel-wordmark.svg ээр солиод уншаад дуусах үед нь дээшээ явахгүй
> fadeout хийгээд алга болдог баймаар байна.
>
> Dear page-ийн дээр байгаа том логог 30 хувь ч юм уу, 40 хувиар жижигсгэ?
> Ийм том лого орох шаардлагагүй
>
> Invitation cascade хэсгийн Invitation гэдэг болон доод талын body текст
> хоёрын зайг ойртуулах, текстийг жижигсгэх overall жижигсгэнэ.
>
> мөн Invitation cascade-ийн текстийг дээрээсээ доошоо Blur-даад гарч ирж
> байгаа мэт биш одоо бол мөр мөрөөрөө гарч ирж байгаа нь багахан зууралттай
> юм шиг байгаа илүү Blur-дагдаад гарч ирж байгаа мэт болгоно.
>
> ceo page-ийн текст нь илүү удаан elegant Invitation text-тэй адил байх
> хэрэгтэй байна. дээрээсээ доошоо blur-дагдсан байж байгаад тодрох маягаар.
>
> ceo Page-ийн body paragraph Нь Urtuu гэх мэт header-ийн гарч ирж байгаа
> хугацаатай адил байвал зүгээр байна.
>
> Dear page-ийн Background asset-ийг бүр арилгаад одоо байгаа shader-Ийгээ ч
> мөн адил устгах хэрэгтэй болсон

The seven items below map directly to those bullets.

---

## 1. Splash logo + FLIP retirement

**File**: [components/ui/LoadingOverlay.tsx](components/ui/LoadingOverlay.tsx)

The splash used to gate on `unitel-20-lockup.svg` and FLIP-fly that asset onto
the Dear page's anniversary lockup over 2.2 s. Per user feedback the splash
should now show the lighter UNITEL wordmark and exit with a pure fade-out —
no upward flight, no scale change.

Changes:

- `GATE_IMAGES` ([Lines 11-13](components/ui/LoadingOverlay.tsx#L11-L13)) →
  `["/media/common/unitel-wordmark.svg"]`. The wordmark is 1.4 KB and is the
  same asset the corner UNITEL marks on Urtuu / CEO / Gala already use.
- Animation cadence constants collapse to two values:
  `HOLD_BEFORE_FADE_MS = 800`, `FADE_OUT_MS = 700`. The previous
  `FLIP_DURATION_MS`, `BACKDROP_FADE_MS`, `POST_HANDOFF_GAP_MS`, and the
  three-phase state machine are gone.
- `phase` reduces to `"loading" | "fading" | "done"`. The `useEffect` that
  measured `#hero-lockup` and computed `dx/dy/scale` has been deleted; the
  remaining effect simply schedules a fade after `HOLD_BEFORE_FADE_MS`,
  unmounts after `FADE_OUT_MS`, and fires `markIntroDone()` at the unmount
  edge so downstream scenes' intro animations only kick off after the
  splash is fully gone.
- The logo wrapper carries only the centring transform
  (`translate(-50%, -50%)`) and an opacity transition. No `lg:[zoom:0.8]`,
  no `transform` transition, no FLIP math.

The Dear page's `id="hero-lockup"` element stays in place — it's now a
no-op identifier (no FLIP target lookup) but removing it adds churn for no
benefit.

---

## 2. Dear page lockup — shrink ~40 %

**File**: [components/sections/DearSection.tsx](components/sections/DearSection.tsx)

Current treatment renders the anniversary lockup at `h-8` (32 px) on mobile
and `sm:w-[30vw]` on desktop. User wanted ~40 % less so the mark reads as a
discreet header rather than a visual headline.

- Lockup classes ([Line 415](components/sections/DearSection.tsx#L415)):
  `h-8 w-auto sm:h-auto sm:w-[30vw]` → `h-5 w-auto sm:h-auto sm:w-[18vw]`.
  Mobile: 32 → 20 px (38 % shrink). Desktop: 30 → 18 vw (40 % shrink).
- Anchor offset ([Line 407](components/sections/DearSection.tsx#L407)):
  `top-[7vh] sm:top-[8vh] md:top-[6vh]` → `top-[5vh] sm:top-[6vh] md:top-[5vh]`
  so the smaller mark sits with consistent breathing room above and below.
- Asset unchanged — still `unitel-20-lockup.svg`. Anniversary branding stays.

---

## 3. Dear background + shader removal

**File**: [components/sections/DearSection.tsx](components/sections/DearSection.tsx)

Two full-screen plates were retired:

- Radial shader plate (former [Lines 286-301](components/sections/DearSection.tsx))
  rendering `url(/media/common/shader.png)` with a centred ellipse mask.
- Cosmic backdrop (former [Lines 303-326](components/sections/DearSection.tsx))
  rendering `url(/media/dear/background.png)` with a top-and-bottom gradient
  mask at z-index 6.

The section's plain `bg-black` plus the envelope mp4 stack is now the entire
visual floor. The `envelopeReady` state is still consumed by the loop video's
opacity gate, so the existing reveal cadence (Dear eyebrow → name typewriter
→ envelope appears) is preserved. `public/media/dear/background.png` is left
on disk — orphan-asset cleanup is out of scope of an animation refinement.

---

## 4. Invitation cascade — tighter, smaller, blur-reveal

**File**: [components/sections/DearSection.tsx](components/sections/DearSection.tsx)

User feedback split into two pieces: (a) the spacing/sizing was too generous,
and (b) the line-by-line opacity stagger read as discrete beats rather than a
flowing top-to-bottom blur reveal.

### 4a. Spacing + sizing

- INVITATION title ([Lines 484-493](components/sections/DearSection.tsx#L484-L493)):
  `text-[30px] sm:text-[32px] md:text-[2.3vw]` →
  `text-[22px] sm:text-[24px] md:text-[1.7vw]`.
- Title-to-body gap: first body `<p>` was `mt-6` (24 px) → `mt-3` (12 px).
  Subsequent paragraphs tightened from `mt-6` → `mt-4` (16 px) so the block
  reads as one tighter unit.
- Body type size: `text-[14px] md:text-[1vw]` → `text-[12px] md:text-[0.85vw]`.
  `leading-[1.55]`, `max-w-[64vw] md:max-w-[22vw]` preserved so wraps still
  break inside the envelope letter area.

### 4b. Blur-reveal mechanism

- [components/ui/LineFade.tsx](components/ui/LineFade.tsx) gained an optional
  `blur?: boolean` prop (default `false`, backward-compatible). When `true`,
  each letter additionally toggles `filter: blur(6px) → blur(0px)` on the
  same per-line `lineDelay`. Per-line delay (not per-letter) keeps the
  top-to-bottom wave shape — every letter on a given line transitions
  together, line N+1 transitions `lineStagger` ms later. `willChange:
  "opacity, filter"` is added in blur mode for compositor hinting.
- Passed `blur` to all three `<LineFade>` call sites
  ([Lines 506-545](components/sections/DearSection.tsx#L506-L545)).
- INVITATION title `<h2>` gained a matching `filter: blur(8px) → blur(0px)`
  transition alongside its opacity fade so title and body share the same
  reveal vocabulary.

### 4c. Cadence tighten

- `BODY_LINE_STAGGER_MS` ([Line 64](components/sections/DearSection.tsx#L64)):
  220 → 120 ms.
- `BODY_LINE_FADE_MS` ([Line 65](components/sections/DearSection.tsx#L65)):
  2200 → 2000 ms (cumulative settle stays inside the 13.5 s scroll lock).
- Title cadence (`TITLE_FADE_MS = 1200`, `TITLE_TO_BODY_MS = 200`)
  unchanged — title is a single block and reads cleanly.

---

## 5. CEO body — slow + blur-reveal to match Urtuu header rhythm

**File**: [components/sections/CeoLetterSection.tsx](components/sections/CeoLetterSection.tsx)

The Urtuu header chain is `eyebrow (1.8 s fade-in) → title (1.6 s fade-in)`
([UrtuuSection.tsx:78-82](components/sections/UrtuuSection.tsx#L78-L82)). User
asked for the CEO body to settle on roughly the same elegant clock instead of
the previous snappy 77 ms / 1.43 s line cadence.

- Cadence constants ([CeoLetterSection.tsx:98-99](components/sections/CeoLetterSection.tsx#L98-L99)):
  - `LINE_STAGGER_MS`: 77 → 220 ms.
  - `LINE_FADE_DURATION_MS`: 1430 → 1800 ms (sits in the eyebrow's 1.8 s band).
- Total settle: ~13 lines × 220 ms + 1800 ms ≈ 4.66 s. Comfortably inside the
  CEO scene's reveal hold (0.18-0.40 of scroll). The
  `SIGNATURE_SPEEDUP_FACTOR = 0.5` already at
  [Line 101](components/sections/CeoLetterSection.tsx#L101) keeps the
  signature firing partway into the last body line's fade — the new
  `d_signature` math walks out of the bumped constants automatically.
- Blur reveal: passed `blur` to all four `<LineFade>` instances
  ([Lines 261-302](components/sections/CeoLetterSection.tsx#L261-L302)).
- Signature row's blur entry transition
  ([Line 325](components/sections/CeoLetterSection.tsx#L325)) is unchanged.

---

## 6. LineFade — shared `blur` prop note

**File**: [components/ui/LineFade.tsx](components/ui/LineFade.tsx)

Single shared utility now backs the blur reveal on Dear and CEO. The
extension is additive only — the existing call site in
[components/sections/UrtuuSection.tsx](components/sections/UrtuuSection.tsx)
omits the prop and behaves exactly as before (opacity-only stagger). If the
user wants Urtuu's body to pick up the same treatment later, dropping `blur`
onto its two LineFade calls is a single-line edit per call site.

Notes:

- `filter: blur` on inline letter spans is supported across modern browsers
  including iOS Safari ≥ 13. The legacy approach (per-line wrapping span)
  was considered and rejected because the existing line measurement relies
  on the flat `data-letter` span list — wrapping per line would force a
  rebuild of the measurement strategy.
- No `display` change on letter spans — keeping them as default `inline`
  preserves natural word-wrap behaviour at word boundaries.

---

## 7. Verification checklist

- [ ] `npm run dev`, navigate to `/i/g-bold` (or any slug from
      [data/guests.json](data/guests.json)).
- [ ] Splash shows the small UNITEL wordmark centred on a transparent
      backdrop, holds briefly (~800 ms), fades out (no upward flight, no
      scale change). The Dear page's anniversary lockup appears
      independently after the splash is fully gone.
- [ ] Dear page top shows the anniversary lockup at noticeably smaller
      size (~40 % less than before) with comfortable breathing room above
      and below.
- [ ] Dear page background behind the envelope videos is plain black —
      no cosmic backdrop, no radial shader plate.
- [ ] Invitation cascade: INVITATION header smaller, sits close to the
      first body line (`mt-3` gap), body text smaller. Each line resolves
      from blurred-to-focus top-down rather than as discrete opacity beats.
- [ ] CEO body paragraphs reveal slowly — each line takes ≈ 1.8 s with
      ≈ 220 ms stagger, blurred into focus. Cadence reads comparable to
      Urtuu's eyebrow → title chain.
- [ ] Signature row on CEO still lands at the right moment (partway into
      the last body line's fade — `d_signature` math).
- [ ] Mobile + desktop pass on Dear and CEO. Confirm Invitation column
      stays inside the envelope letter area at the new smaller type.
- [ ] `npx tsc --noEmit` passes (LineFade `blur` prop addition is
      backward-compatible).
- [ ] `npm run build` produces a clean build.
