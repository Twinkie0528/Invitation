# update2.md — Second pass changes for the Unitel 20 invitation site

This document captures the second round of changes after [Update.md](Update.md) has been merged. It assumes the current site map (Hero → CEO → Urtuu → Gala → RSVP, with the guest name living on CEO) is the starting state.

The user's mockups are **layout drafts only** — they pin where new content lives and which words go in which colour, but the typography, fonts, and entry animations of the existing scenes stay the same. No design overhaul.

---

## 1. Current vs planned site map

A new "Dear" scene is being inserted at the front, pushing every existing scene down one slot.

| Slot | Current section | Planned section | File |
|------|-----------------|-----------------|------|
| 1 | Hero | **Dear (new)** | `components/sections/DearSection.tsx` (to create) |
| 2 | CEO | Hero | [components/sections/HeroSection.tsx](components/sections/HeroSection.tsx) |
| 3 | Urtuu | CEO | [components/sections/CeoLetterSection.tsx](components/sections/CeoLetterSection.tsx) |
| 4 | Gala | Urtuu | [components/sections/UrtuuSection.tsx](components/sections/UrtuuSection.tsx) |
| 5 | RSVP | Gala | [components/sections/GalaSection.tsx](components/sections/GalaSection.tsx) |
| 6 | — | RSVP | [components/sections/RsvpSection.tsx](components/sections/RsvpSection.tsx) |

Six scenes instead of five → every `useSectionReveal` range and `useSceneEntered` threshold needs to be re-divided across `0 → 1`. New target distribution (suggested, ~equal slices with the existing tight overlaps preserved):

| Section | New `useSectionReveal` range | New `useSceneEntered` |
|---------|------------------------------|-----------------------|
| Dear    | start −0.02, peak 0.0,  hold 0.08, end 0.13 | (uses `introDone`, no scene-entered gate) |
| Hero    | start 0.13, peak 0.18, hold 0.25, end 0.30 | 0.15 |
| CEO     | start 0.30, peak 0.35, hold 0.47, end 0.52 | 0.32 |
| Urtuu   | start 0.52, peak 0.57, hold 0.67, end 0.72 | 0.54 |
| Gala    | start 0.72, peak 0.76, hold 0.85, end 0.88 | 0.74 |
| RSVP    | start 0.88, peak 0.92, hold 1.0,  end 1.05 | 0.90 |

These numbers are a starting point; expect to nudge by ±0.01–0.02 once the scenes are scrolled in dev.

---

## 2. Planned changes

### 2.1 Insert new "Dear" scene as page 1

The user's mockup (screenshot 1) shows: UNITEL · 20th Anniversary lockup at the top, "DEAR" + the personalised guest name on the centre line, chevron scroll cue at the bottom.

**File to create**: `components/sections/DearSection.tsx`

**Composition**:

- **Top lockup**: re-use [public/media/hero/unitel-20-lockup.svg](public/media/hero/unitel-20-lockup.svg) at the same anchor / sizing the Hero scene currently uses ([HeroSection.tsx:292-330](components/sections/HeroSection.tsx#L292-L330)) — the same FLIP hand-off animation from the LoadingOverlay applies here, since this is now the first scene the splash transitions into. **Both Dear and Hero render their own lockup at this anchor** so the mark crossfades naturally as the user scrolls Dear → Hero (each scene's overall reveal opacity drives the lockup with it; visually it reads as one continuous lockup that fades out then back in across the scene boundary). See §2.2 for the Hero-side note.
- **Centre row**: two pieces side-by-side, vertically centred on the viewport:
  - "DEAR" — Manrope, white, sized to read as a peer of the script name (start ≈ 22 px mobile / `2vw` desktop, like the current Hero "UNITEL GROUP" treatment). Tune to taste.
  - `{guestName}` — Ingkar Janji script with the blue→silver gradient (`linear-gradient(215deg, #73A4FF 14.69%, #E1E1E1 83.64%)`). This is the SAME calligraphy block currently sitting in the CEO scene ([CeoLetterSection.tsx:267-295](components/sections/CeoLetterSection.tsx#L267-L295)) — it moves here. Carry over the `charCount` / `heroScriptMobileVw` / `heroScriptDesktopCss` sizing math so long names like `Ch.Darkhanbaatar` still fit on one line in the new horizontal arrangement.
  - On narrow phones the row may need to stack (DEAR on one line, name on the next). Confirm against the mockup width during implementation.
- **Bottom scroll cue**: chevron only (no helper text in the mockup). Re-use the same `<ChevronDown>` SVG and entry transition Hero already has ([HeroSection.tsx:406-417, 423-443](components/sections/HeroSection.tsx#L406-L417)).
- **Background**: black plate. The user's mockup shows pure black — no video, no shader. Keep it minimal.

**Guest data**: read with `useGuestName()` + `formatGuestName()` from [lib/guestContext.tsx](lib/guestContext.tsx). Fallback to `"Esteemed Guest"` for the un-personalised root URL, identical to the current CEO behaviour.

**Reveal range**: see table in §1. Use `useSectionReveal({ start: -0.02, peak: 0.0, hold: 0.08, end: 0.13 })`. The lockup, DEAR, name, and chevron all gate on `introDone` from `useLoadGate` exactly like Hero does today, so the splash → static hand-off carries through.

**Wire into layout**:

- [components/InvitationLayout.tsx:6-10](components/InvitationLayout.tsx#L6-L10) — add `import DearSection from "@/components/sections/DearSection";`
- [components/InvitationLayout.tsx:22-26](components/InvitationLayout.tsx#L22-L26) — render `<DearSection />` as the first child, above `<HeroSection />`.

---

### 2.2 Hero — replace centre copy

The mockup (screenshot 2) shows new text. The wrapper layout, Manrope sizes, and the entry animation pattern (blur 12 → 0 + scale 0.94 → 1) **stay the same** — only the literal strings and one colour accent change.

**Edit**: [components/sections/HeroSection.tsx:342-400](components/sections/HeroSection.tsx#L342-L400)

Current centre block renders four reveal steps:

1. `UNITEL GROUP`
2. `is pleased to invite`
3. `lorem ipsum` (placeholder)
4. `to an exclusive evening`

Replace with three reveal steps that match the mockup wording:

1. `UNITEL GROUP` — keep as the title (Manrope semibold, current size unchanged)
2. **New body line** — `invites you to an [exclusive evening] where you become part of the story.` — single block, Manrope. The bracketed phrase `exclusive evening` renders in **UNITEL green** (`text-unitel-green`, the brand token already in [tailwind.config.ts](tailwind.config.ts)).
3. **New subtext** — `An evening where stories unfold, and you are not just a guest. But drawn into every moment.` — Manrope, lighter weight, smaller than the body line above. Sits below as a secondary line.

Trim the `useSequentialDelays` array at [HeroSection.tsx:65-80](components/sections/HeroSection.tsx#L65-L80) to match the new step count (drop `d_invite`, `d_placeholder`, `d_evening` → keep `d_unitel`, add `d_body`, `d_subtext`, keep `d_scroll`). Each step still uses the literal-duration `pause: 400` cadence the rest of the site shares.

**Bottom scroll cue**: replace the helper text on [HeroSection.tsx:413-415](components/sections/HeroSection.tsx#L413-L415) — `"Explore the experience below"` → `"Discover what awaits"`. The chevron, the wrapper, and the fade-in/out behaviour driven by the section's reveal range all stay as-is.

**Lockup**: keep the existing UNITEL · 20th Anniversary lockup at the top exactly as it is today ([HeroSection.tsx:292-330](components/sections/HeroSection.tsx#L292-L330)). The Dear scene also renders its own copy at the same anchor (§2.1), so as the user scrolls Dear → Hero the two lockups crossfade through each scene's reveal opacity — Dear's fades out as the scene leaves, Hero's fades in as the scene arrives. Reading: one continuous lockup with a soft fade-through at the boundary. No code change needed here beyond what the per-scene reveal range already does.

---

### 2.3 CEO — remove guest name calligraphy

The user's directive: "dear гэх мэт хэсэгт нэр байхгүй болсон. шууд л text Орж ирнэ." The personalised name is now on the new Dear page (§2.1), so the CEO header reverts to going straight into the body letter.

**Edits in [components/sections/CeoLetterSection.tsx](components/sections/CeoLetterSection.tsx)**:

- [Line 6](components/sections/CeoLetterSection.tsx#L6) — drop the `formatGuestName, useGuestName` import (CEO no longer reads guest context).
- [Lines 59-60](components/sections/CeoLetterSection.tsx#L59-L60) — delete the `rawGuestName` / `guestName` derivation.
- [Lines 62-76](components/sections/CeoLetterSection.tsx#L62-L76) — delete the calligraphy sizing math (`charCount`, `heroScriptDesktopCss`, `heroScriptMobileVw`). These move to the new Dear scene.
- [Lines 267-295](components/sections/CeoLetterSection.tsx#L267-L295) — delete the entire `<div>` rendering `{guestName}` (Ingkar Janji + gradient + entry transition).
- [Line 122](components/sections/CeoLetterSection.tsx#L122) — `d_para1 = 100` was the title delay slot; keep the constant but verify the body cadence still feels right with no header element to gate against (the body paragraphs may want to start a touch earlier now).
- The body paragraphs (`CEO_PARA_2` … `CEO_PARA_5`) and the signature row (Jamiyansharav D. + green signature.svg) **stay exactly as they are**.

**Risk**: with no header element, the first body paragraph becomes the visual top of the letter. Check that the `top-[16%] sm:top-[22%]` positioning ([CeoLetterSection.tsx:248](components/sections/CeoLetterSection.tsx#L248)) still feels right or if the column needs to slide up a touch.

---

### 2.4 RSVP — restructure to event-details list

The mockup (screenshot 3) shows a much simpler structure than the current RSVP scene. It drops the giant title, drops the gradient `18:00`, drops the hairline rules, and replaces them with a clean two-block layout: a preamble note + an event-details list.

**Layout in the mockup**:

```
Kindly note that this invitation is [non-transferable],
as it has been reserved [especially for you].

(gap)

EVENT DETAILS
18:00
June 18, 2026
Temporary Exhibition Hall
Outdoor of the State Academic Drama Theatre
Dress Code: Cocktail Attire

(gap)

Please confirm your attendance by [RSVP]
```

Words in `[brackets]` render in **UNITEL green** (`text-unitel-green`). `[RSVP]` is a placeholder — see §3 Open Items.

**Edits in [components/sections/RsvpSection.tsx](components/sections/RsvpSection.tsx)**:

- **Title block** ([Lines 11-15, 246-261](components/sections/RsvpSection.tsx#L246-L261)) — remove the `INVITATION_TITLE_TEXT` constant and the `<h2>` rendering it. The new preamble takes its slot.
- **New preamble** — replace the title slot with a two-line `<p>` rendering:
  > Kindly note that this invitation is `<span class="text-unitel-green">non-transferable</span>`, as it has been reserved `<span class="text-unitel-green">especially for you</span>`.
  - Manrope, white for the base text, green for the two highlighted phrases.
  - Re-use the same wrapper + entry transition (`d_title` slot, blur 12 → 0 + scale 0.94 → 1) so the cadence with the rest of the scene is preserved.
- **EVENT DETAILS heading** — new small bold label above the date list. Manrope bold, all caps, ~14 px / 0.2 em tracking (tune against the mockup).
- **Date list** ([Lines 263-344](components/sections/RsvpSection.tsx#L263-L344)) — collapse the mobile vertical stack and the desktop inline row down to a simple centred multi-row list:
  - `18:00` — solid white, no gradient (drop `backgroundImage` / `WebkitBackgroundClip` / `WebkitTextFillColor`).
  - `{month} {day}, {EVENT_YEAR}` — solid white, single line "June 18, 2026" (mockup format).
  - `Temporary Exhibition Hall` — solid white.
  - `Outdoor of the State Academic Drama Theatre` — solid white.
  - `Dress Code: Cocktail Attire` — `Dress Code:` bold, `Cocktail Attire` regular.
  - Remove the two hairline rules ([Lines 293, 301](components/sections/RsvpSection.tsx#L293-L301)).
  - All rows share the same entry transition slot (`d_date`) so they reveal as one unit.
- **VENUE_TEXT** ([Line 79](components/sections/RsvpSection.tsx#L79)) — replace with two separate constants for the two venue lines, OR inline them in the JSX. The current single combined string `"Temporary Exhibition Hall, Outdoor of the State Academic Drama Theatre."` becomes two lines.
- **Confirmation line** — new bottom `<p>` rendering:
  > Please confirm your attendance by `<span class="text-unitel-green">[RSVP]</span>`
  - Use the `d_venue` slot (or add a new `d_confirm`) so it reveals last in the cadence.
  - Render `[RSVP]` as styled text (square brackets included), not as a button or link.
- **Cosmos mp4 backdrop** ([Lines 149-189](components/sections/RsvpSection.tsx#L149-L189)) — keep entirely as-is. The mockup shows a black plate but that's because it's a wireframe; the user said "одоохондоо… draft, mock-up төдийхөн юм шүү" so the cosmos backdrop stays.
- **Shader plate** ([Lines 200-214](components/sections/RsvpSection.tsx#L200-L214)) — keep, but the mask region may need to grow now that the foreground content stack is taller (preamble + label + 5-row list + confirm = more vertical real estate than the old title + 3-row date).
- **Reveal cadence** ([Lines 85-103](components/sections/RsvpSection.tsx#L85-L103)) — re-tune `useSequentialDelays` for the new step count: preamble → details list → confirm (3 steps instead of the current 5). Keep each step's literal duration in the same 1.4–1.6 s range so the rhythm matches the rest of the site.

---

### 2.5 Green colour usage

Two new spots adopt the brand UNITEL green (`unitel.green` token in [tailwind.config.ts](tailwind.config.ts), used today for the CEO signature SVG and the hero `is pleased to invite`-era accent):

- Hero body line — `[exclusive evening]` (§2.2)
- RSVP preamble — `[non-transferable]` and `[especially for you]` (§2.4)
- RSVP confirm line — `[RSVP]` (§2.4)

In every case the green is applied as `text-unitel-green` on a `<span>`; nothing else about the surrounding line changes.

---

## 3. Open items / TBD

- **Dear-row stacking on narrow phones** — `DEAR` + long script names side-by-side may overflow a 375 px viewport. Decide: stack to two lines on mobile, or shrink the script with the same `heroScriptMobileVw` formula? The current CEO sizing math handles this; lift it intact.
- **EVENT DETAILS label styling** — the mockup shows it in plain bold Manrope. Confirm size and tracking against the screenshot during dev (start ≈ 14 px / 0.2 em, mobile).
- **Date hairlines on mobile** — the mockup omits them. Confirm whether they should be removed entirely or only hidden on the new layout.
- **Reveal range tuning** — the new 6-section split in §1 is a starting estimate. Walk through `/i/<slug>` end-to-end and adjust ±0.01–0.02 per section so each scene lands cleanly.
- **SectionDots count** — [components/ui/SectionDots.tsx](components/ui/SectionDots.tsx) likely hard-codes 5 dots. Add a 6th for the new Dear scene.

---

## 4. Verification checklist

- [ ] `npm run dev`, navigate to `/i/g-bold` (or any slug from [data/guests.json](data/guests.json)).
- [ ] Confirm scene order: **Dear → Hero → CEO → Urtuu → Gala → RSVP**.
- [ ] Confirm the new Dear page shows `DEAR {Name}` with the script + blue→silver gradient and the lockup at the top (and that the LoadingOverlay FLIP hand-off still lands correctly).
- [ ] Confirm Hero centre block now reads `UNITEL GROUP / invites you to an exclusive evening where you become part of the story. / An evening where stories unfold, and you are not just a guest. But drawn into every moment.` with `exclusive evening` in green.
- [ ] Confirm Hero scroll cue text is `Discover what awaits`.
- [ ] Confirm CEO opens directly with the body paragraph (no `Dear {Name}` header).
- [ ] Confirm RSVP shows the preamble note (with `non-transferable` and `especially for you` in green), then `EVENT DETAILS`, then the 5-row date list (with `18:00` in solid white, no gradient, no hairlines), then `Please confirm your attendance by [RSVP]` (green).
- [ ] Confirm `npx tsc --noEmit` passes (no orphaned imports left from CEO's guest-name removal).
- [ ] Confirm `npm run build` produces a clean build.
- [ ] Walk the un-personalised root `/` to confirm the fallback `Esteemed Guest` still renders on the new Dear page.
- [ ] Mobile + desktop visual pass on the Dear page so the `DEAR + name` row sits centred with comfortable breathing room above and below.
