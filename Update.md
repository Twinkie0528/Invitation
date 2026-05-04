# Update.md — Planned changes for the Unitel 20 invitation site

This document is a working reference for the next implementation pass. It captures (1) the current site map so each piece of code can be located quickly, and (2) the upcoming changes with exact file paths and line numbers.

---

## 1. Site Map

### 1.1 Tech stack

- **Framework**: Next.js 14.2.15 (App Router) + TypeScript 5.6.3
- **Styling**: Tailwind 3.4.13 — custom tokens in [tailwind.config.ts](tailwind.config.ts) (`unitel.green/dark/ink`, easings `out-expo`, `in-out-cine`); keyframes in [app/globals.css](app/globals.css)
- **Animation**: Framer Motion 11 (text reveals via `RevealText`), CSS keyframes (persistent motion such as `cosmos-drift`), GSAP (legacy/minimal), Lenis (smooth scroll, configured in [app/providers.tsx](app/providers.tsx))
- **3D / canvas**: Three.js + React Three Fiber installed; [components/canvas/MainScene.tsx](components/canvas/MainScene.tsx) currently returns null (each section paints its own backdrop)
- **Audio**: Howler 2.2.4
- **Fonts**: Fraunces (display), Manrope (sans), Ingkar Janji (script, local TTF in [public/fonts/IngkarJanji.ttf](public/fonts/IngkarJanji.ttf))

### 1.2 Routes & guest data flow

| Route | File | Purpose |
|-------|------|---------|
| `/` | [app/page.tsx](app/page.tsx) | Generic (un-personalised) landing |
| `/i/<slug>` | [app/i/[slug]/page.tsx](app/i/%5Bslug%5D/page.tsx) | Personalised guest page; static params from [data/guests.json](data/guests.json) |

- Guest source of truth: [data/guests-source.txt](data/guests-source.txt) (Mongolian comments, one guest per line, format `Name` or `Name | Date`)
- Build step: `npm run guests` → emits [data/guests.json](data/guests.json)
- React context: [lib/guestContext.ts](lib/guestContext.ts) exports `useGuest`, `useGuestName`, `formatGuestName`

### 1.3 Section order — current vs planned

The render order is declared in [components/InvitationLayout.tsx:22-26](components/InvitationLayout.tsx#L22-L26). Each section also owns its own scroll-locked `useSectionReveal` range and `useSceneEntered` threshold.

| Slot | Current section | Planned section | File |
|------|-----------------|-----------------|------|
| 1 | Hero | Hero | [components/sections/HeroSection.tsx](components/sections/HeroSection.tsx) |
| 2 | Urtuu | **CEO** | [components/sections/CeoLetterSection.tsx](components/sections/CeoLetterSection.tsx) |
| 3 | Gala | Urtuu | [components/sections/UrtuuSection.tsx](components/sections/UrtuuSection.tsx) |
| 4 | CEO | Gala | [components/sections/GalaSection.tsx](components/sections/GalaSection.tsx) |
| 5 | RSVP | RSVP | [components/sections/RsvpSection.tsx](components/sections/RsvpSection.tsx) |

Current scroll ranges captured from each section file:

| Section | `useSectionReveal` range | `useSceneEntered` | Defined at |
|---------|--------------------------|-------------------|------------|
| Hero | start -0.02, peak 0.0, hold 0.10, end 0.16 | (n/a — uses `introDone` instead) | [HeroSection.tsx:38-43](components/sections/HeroSection.tsx#L38-L43) |
| Urtuu | start 0.16, peak 0.22, hold 0.37, end 0.42 | 0.18 | [UrtuuSection.tsx:31-36, 58](components/sections/UrtuuSection.tsx#L31-L58) |
| Gala | start 0.42, peak 0.48, hold 0.59, end 0.64 | 0.44 | [GalaSection.tsx:29-34, 51](components/sections/GalaSection.tsx#L29-L51) |
| CEO | start 0.64, peak 0.69, hold 0.84, end 0.85 | 0.66 | [CeoLetterSection.tsx:34-39, 55](components/sections/CeoLetterSection.tsx#L34-L55) |
| RSVP | start 0.85, peak 0.91, hold 1.0, end 1.05 | 0.87 | [RsvpSection.tsx:70-76](components/sections/RsvpSection.tsx#L70-L76) |

### 1.4 Content edit points (text living in TSX)

| Concern | File:lines | Notes |
|---------|------------|-------|
| Hero copy ("UNITEL GROUP", "is pleased to invite") | [HeroSection.tsx:115-116, 398, 408](components/sections/HeroSection.tsx#L115-L116) | Inside `useSequentialDelays` array + `RevealText` children |
| Hero guest name (calligraphy slot) | [HeroSection.tsx:48-49, 76-89, 411-441](components/sections/HeroSection.tsx#L411-L441) | `useGuestName()` + Ingkar Janji + blue→silver gradient |
| Hero "to an exclusive evening" | [HeroSection.tsx:466-468](components/sections/HeroSection.tsx#L466-L468) (mobile, live text) / [HeroSection.tsx:469-476](components/sections/HeroSection.tsx#L469-L476) (desktop, PNG) | Mobile already uses real text |
| Urtuu eyebrow / title / body | [UrtuuSection.tsx](components/sections/UrtuuSection.tsx) | Constants near top of file |
| Gala eyebrow / title / four paragraphs | [GalaSection.tsx:11-14, 67-73](components/sections/GalaSection.tsx#L11-L14) | `GALA_PARA_1` … `GALA_PARA_4` |
| CEO five paragraphs | [CeoLetterSection.tsx:11-15](components/sections/CeoLetterSection.tsx#L11-L15) | `CEO_PARA_1` = "Dear Valued Partner," is the line being replaced |
| CEO signature name + title | [CeoLetterSection.tsx:324, 330](components/sections/CeoLetterSection.tsx#L324-L330) | "Jamiyansharav D." / "CEO of Unitel Group" |
| RSVP date constants | [RsvpSection.tsx:29-30](components/sections/RsvpSection.tsx#L29-L30) | `EVENT_TIME = "18:00"`, `EVENT_YEAR = "2026"`; month/day from guest CSV |
| RSVP venue | [RsvpSection.tsx:83](components/sections/RsvpSection.tsx#L83) | `VENUE_TEXT` constant |
| RSVP title PNG | [RsvpSection.tsx:18, 258-265](components/sections/RsvpSection.tsx#L18) | "This invitation is reserved exclusively for you." baked into `invitation-title.png` |
| SEO metadata | [app/layout.tsx:33-43](app/layout.tsx#L33-L43) | Title, description, OG tags |

### 1.5 Media directories

- [public/media/hero/](public/media/hero/) — `first.mp4`, `unitel-20-lockup.svg`, `exclusive-evening.png`, `shader.png`, `particledepth1.png`
- [public/media/urtuu/](public/media/urtuu/) — `urtuu-script.mp4`, `urtuu-script.webp`, `floor.jpg`
- [public/media/gala/](public/media/gala/) — uses `common/gala-bloom.mp4`
- [public/media/ceo/](public/media/ceo/) — `mascot.mp4`, `signature.svg`
- [public/media/rsvp/](public/media/rsvp/) — `cosmos.mp4`, `cosmos.png`, `full.png`, `invitation-title.png`, `Mobile Version.jpg`
- [public/media/common/](public/media/common/) — `gala-bloom.mp4`, `gala-bloom.webp`, `shader.png`, `unitel-wordmark.svg`, `edge-gradient.svg/png`

### 1.6 What is NOT in the codebase

- No active RSVP form or API route ([app/api/](app/api/) does not exist; `RsvpSection` is informational only)
- No i18n library (English copy only; Mongolian appears in `data/guests-source.txt` comments and guest names)
- No analytics (no Plausible / GA / PostHog)

---

## 2. Planned Changes

### 2.1 Reorder sections — Hero → CEO → Urtuu → Gala → RSVP

**Current**: Hero → Urtuu → Gala → CEO → RSVP (CEO is page 4).
**Desired**: CEO moves up to page 2; Urtuu and Gala shift down one slot each.

**Edits**:

- [components/InvitationLayout.tsx:22-26](components/InvitationLayout.tsx#L22-L26) — change JSX order to:
  ```
  <HeroSection />
  <CeoLetterSection />
  <UrtuuSection />
  <GalaSection />
  <RsvpSection />
  ```
- [CeoLetterSection.tsx:34-39](components/sections/CeoLetterSection.tsx#L34-L39) — set `REVEAL_RANGE` to `{ start: 0.16, peak: 0.22, hold: 0.37, end: 0.42 }` (inherits Urtuu's old slot).
- [CeoLetterSection.tsx:55](components/sections/CeoLetterSection.tsx#L55) — change `useSceneEntered(0.66)` → `useSceneEntered(0.18)`.
- [UrtuuSection.tsx:31-36](components/sections/UrtuuSection.tsx#L31-L36) — set `REVEAL_RANGE` to `{ start: 0.42, peak: 0.48, hold: 0.59, end: 0.64 }` (inherits Gala's old slot).
- [UrtuuSection.tsx:58](components/sections/UrtuuSection.tsx#L58) — change `useSceneEntered(0.18)` → `useSceneEntered(0.44)`.
- [GalaSection.tsx:29-34](components/sections/GalaSection.tsx#L29-L34) — set `REVEAL_RANGE` to `{ start: 0.64, peak: 0.69, hold: 0.83, end: 0.85 }` (inherits CEO's old slot).
- [GalaSection.tsx:51](components/sections/GalaSection.tsx#L51) — change `useSceneEntered(0.44)` → `useSceneEntered(0.66)`.
- Hero (slot 1) and RSVP (slot 5) ranges unchanged.

**Risk**: section-dot navigation in [components/ui/SectionDots.tsx](components/ui/SectionDots.tsx) and any scroll-lock thresholds in [hooks/useScrollProgress.ts](hooks/useScrollProgress.ts) may hard-code the legacy order — verify during implementation.

---

### 2.2 Move guest name personalisation from Hero to CEO

The calligraphy block (Ingkar Janji + blue→silver gradient) moves with the name. In CEO it replaces the static "Dear Valued Partner," header.

**Remove from Hero** ([components/sections/HeroSection.tsx](components/sections/HeroSection.tsx)):

- [Line 8](components/sections/HeroSection.tsx#L8) — drop `useGuestName, formatGuestName` from the import (Hero no longer reads guest context).
- [Lines 48-49](components/sections/HeroSection.tsx#L48-L49) — delete `rawGuestName` / `guestName` derivations.
- [Lines 76-89](components/sections/HeroSection.tsx#L76-L89) — delete the calligraphy sizing math (`charCount`, `heroScriptDesktopCss`, `heroScriptMobileVw`).
- [Lines 107-127](components/sections/HeroSection.tsx#L107-L127) — drop `d_name` from the destructure and the `1500` step from the `useSequentialDelays` array. New cadence: UNITEL GROUP → invite → evening → scroll cue.
- [Lines 411-441](components/sections/HeroSection.tsx#L411-L441) — delete the calligraphy `<div>` rendering `{guestName}` and its `--hero-script-*` CSS-var styling.

**Add to CEO** ([components/sections/CeoLetterSection.tsx](components/sections/CeoLetterSection.tsx)):

- Top of file — add `import { useGuestName, formatGuestName } from "@/lib/guestContext";`
- Inside `CeoLetterSection()` — derive:
  ```
  const rawGuestName = useGuestName();
  const guestName = rawGuestName ? formatGuestName(rawGuestName) : "Esteemed Guest";
  ```
- [Line 11](components/sections/CeoLetterSection.tsx#L11) — remove `CEO_PARA_1 = "Dear Valued Partner,"` (or keep the constant and let the JSX render `{guestName}` instead).
- [Lines 225-235](components/sections/CeoLetterSection.tsx#L225-L235) — replace the `<p>{CEO_PARA_1}</p>` with the calligraphy block lifted from Hero:
  - `font-script` (Ingkar Janji)
  - `backgroundImage: linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)` + `WebkitBackgroundClip: text` + `WebkitTextFillColor: transparent`
  - Keep the existing CEO entry animation (`d_para1` + 1.6s blur 12 → 0 + scale 0.94 → 1)
- Carry over the calligraphy sizing math (`charCount`, `heroScriptMobileVw`, `heroScriptDesktopCss`) so long names like "Ch.Darkhanbaatar" still fit the column width.

**Risk**: the calligraphy was tuned to the Hero's centre column (max-w 560 / 1200 px). The CEO column is narrower (max-w 321 mobile / 920 desktop) so the sizing constants may need re-tuning.

---

### 2.3 Replace text-as-image PNGs with live Manrope text

**Guiding rule for both swaps below**: the live text must visually match the current PNG render — same on-screen position, same on-screen size, same letter-spacing — only the source switches from a baked image to live HTML in the project's Manrope font (`font-sans` / `var(--font-manrope)`). The existing wrapper's width, layout slot, and entry animation stay intact; only the inner element changes from `<Image>` to a typographic element.

#### 2.3.1 RSVP invitation title — "This invitation is reserved exclusively for you."

The PNG is 306×113 (Figma source) and currently renders at `w-[306px] sm:w-[600px]` ([RsvpSection.tsx:247](components/sections/RsvpSection.tsx#L247)). At 1:1 mobile scale the type stack is roughly Manrope ~28 px / line-height 1.4 / 4-line wrap.

- [RsvpSection.tsx:18](components/sections/RsvpSection.tsx#L18) — remove the `INVITATION_TITLE_SRC` constant.
- [RsvpSection.tsx:246-266](components/sections/RsvpSection.tsx#L246-L266) — keep the wrapper `<div>` (its `w-[306px] sm:w-[600px]` and the `opacity / scale / blur` entry transition stay). Replace the inner `<Image src={INVITATION_TITLE_SRC} … />` with a live `<h2>` (or `<p>`) using `font-sans` (Manrope). Tune size + weight + line-height so the rendered text occupies the same visual footprint as the PNG it replaces — start from the inspected Figma values (Manrope around 28 px mobile / 48-56 px desktop, line-height ~1.4) and adjust until the layout matches the current screenshot.
- After verification, [public/media/rsvp/invitation-title.png](public/media/rsvp/invitation-title.png) can be deleted.

#### 2.3.2 Hero "to an exclusive evening" — desktop only

Mobile already renders live Manrope text ([HeroSection.tsx:466-468](components/sections/HeroSection.tsx#L466-L468) — `text-[16px] uppercase tracking-[0.3em] text-[#B7B7B7]`); desktop is still served from `exclusive-evening.png` (Figma source 358×31, rendered at `w-[22vw]`).

- [HeroSection.tsx:469-476](components/sections/HeroSection.tsx#L469-L476) — replace the desktop `<Image src="/media/hero/exclusive-evening.png" … />` with a live `<span>` in `font-sans uppercase tracking-[0.3em] text-[#B7B7B7]` (extending the existing mobile span to all breakpoints, or adding a desktop-only sibling). Match the Figma desktop size — at `w-[22vw]` on a 1280-wide artboard (≈281 px) the PNG renders ~24 px tall, so a Manrope size around `sm:text-[18-20px]` should land in the same visual footprint. Iterate against the current screenshot until they match.
- After verification, [public/media/hero/exclusive-evening.png](public/media/hero/exclusive-evening.png) can be deleted.

> **Note**: these are the only two text-as-image PNGs left in the codebase. Other PNGs (`unitel-20-lockup.svg` is an SVG; `shader.png`, `cosmos.png`, `full.png`, `Mobile Version.jpg`, etc. are decorative backdrops) are not text and stay as image assets.

---

### 2.4 Swap RSVP cosmos backdrop from `full.png` to `cosmos.mp4`

Both mobile and desktop currently render the static `full.png`. The `cosmos.mp4` constant exists at [RsvpSection.tsx:23](components/sections/RsvpSection.tsx#L23) but is unused.

- [RsvpSection.tsx:154-174](components/sections/RsvpSection.tsx#L154-L174) (mobile cosmos wrapper) — replace the `<Image src="/media/rsvp/full.png" … />` with `<BackgroundVideoFrame src="/media/rsvp/cosmos.mp4" start={0.85} end={1.05} objectFit="cover" />`. Preserve the wrapper's `cosmos-drift-mobile` class and Figma-spec absolute dimensions (281.13 vw width, `aspectRatio: 1650/613`, `top: 40.33vh`, `left: -110.64vw`).
- [RsvpSection.tsx:175-185](components/sections/RsvpSection.tsx#L175-L185) (desktop cosmos) — replace the desktop `<Image>` with the same `BackgroundVideoFrame` instance, preserving the `cosmos-drift hidden md:block` class set.
- [RsvpSection.tsx:24](components/sections/RsvpSection.tsx#L24) — either remove the unused `COSMOS_POSTER` constant or wire `cosmos.png` as the poster fallback for mobile data-saver users.
- Confirm the four cosmos keyframe classes (`cosmos-drift`, `cosmos-drift-mobile`, `cosmos-shimmer`, `cosmos-pulse` in [app/globals.css](app/globals.css)) still apply to the new `<video>` element — they target classes, so they should.

**Risk**: mobile autoplay throttling. `cosmos.mp4` must be `muted` + `playsInline` (already standard inside `BackgroundVideoFrame`). Watch for the same triple-decoder issue documented in HeroSection — only one mobile + one desktop instance is needed, so the pattern is clean.

---

### 2.5 RSVP "18:00" colour — gradient → solid white

The blue→silver gradient on `EVENT_TIME` is being retired here (only the Hero/CEO calligraphy keeps the gradient).

- [RsvpSection.tsx:282-295](components/sections/RsvpSection.tsx#L282-L295) (mobile `<h2>`) — remove the inline `backgroundImage`, `WebkitBackgroundClip`, `backgroundClip`, `WebkitTextFillColor`, `color: "transparent"` styles. Replace with `text-white` to match the surrounding `{month} {day}` and `{EVENT_YEAR}` rows on lines 301 and 309.
- [RsvpSection.tsx:330-342](components/sections/RsvpSection.tsx#L330-L342) (desktop `<span>`) — same removal of gradient styles. Class becomes `text-[50px] md:text-[60px] lg:text-[66px] text-white` (matches the sibling spans on lines 343 and 346).

The blue→silver gradient on the Hero calligraphy ([HeroSection.tsx:432-438](components/sections/HeroSection.tsx#L432-L438)) is **separate** and is moving into CEO with the name — do not strip it there.

---

## 3. Open Items / TBD

- **New Hero centre copy** — once the guest name leaves Hero, the calligraphy slot is empty. The user will supply replacement text for the slot between "is pleased to invite" and "to an exclusive evening".
- **Calligraphy sizing in CEO** — the column is narrower than Hero's, so `heroScriptMobileVw` / `heroScriptDesktopCss` may need re-tuning for long names.
- **Asset cleanup** — decide whether to delete `invitation-title.png`, `exclusive-evening.png`, and `full.png` after the swaps are verified.
- **Section-dot order** — verify [components/ui/SectionDots.tsx](components/ui/SectionDots.tsx) labels/order after the reorder.

---

## 4. Verification Checklist

- [ ] Run `npm run dev` and walk the personalised route `/i/g-bold` (or any slug from `data/guests.json`) end-to-end.
- [ ] Confirm Hero → CEO → Urtuu → Gala → RSVP fires in order at the expected scroll positions.
- [ ] Confirm the guest name now appears at the top of the CEO section in Ingkar Janji + blue→silver gradient.
- [ ] Confirm the RSVP title renders as live text and the layout matches the Figma `Mobile Version` / `Screen PC` artboards.
- [ ] Confirm `cosmos.mp4` autoplays on iOS Safari (muted, playsInline, no decoder leak).
- [ ] Confirm "18:00" is solid white on both mobile stack and desktop inline row.
- [ ] Run `npx tsc --noEmit` and `npm run build` to catch any orphaned imports left from the move.
