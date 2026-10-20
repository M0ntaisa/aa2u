# Drawing-led identity, hero, dossier, /work views (roadmap #12–#15, with #18 basics)

Status: design proposal, waiting for client approval on the open questions at the end.
Owner: uiux. Implementers: fe (UI), be (schema/migration/admin data).
Mockup: `aa2u-mockup.html` (static HTML, shared separately). It uses Hanken Grotesk as a stand-in for General Sans because the mockup may only load Google Fonts. Production keeps General Sans from Fontshare.

---

## 0. Goal and audience

People who visit this site are prospective clients (homeowners, developers, institutions), juries and press, and possible hires. Within about ten seconds they want to know what the studio builds, where, and how well. After that they want evidence: real buildings, drawings, areas, materials and credits.

Today the site reads as a developer-portfolio template: a giant wordmark three times, greyscale images, fade-ups everywhere, and a ring cursor that says "VIEW". This direction makes the site read like **a drawing set**. It uses the existing palette with:

1. a technical mono for every piece of metadata (it reads like a title block and dimension text),
2. a visible 12-column hairline grid with dimension ticks,
3. photographs in true colour (colour becomes the only "loud" thing on the page),
4. motion that comes from drafting: lines draw in, section planes cut images open,
5. a crosshair cursor with a coordinate readout.

---

## 1. Design tokens

### 1.1 Colour (the palette stays; only contrast is corrected)

All ratios are measured against `--bg #1a1b26`. Values with alpha are listed as their flattened hex.

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--bg` | `#1a1b26` | n/a | Page background (unchanged) |
| `--fg` | `#ffffff` | 17.09:1 | Primary text, drawings, active states (unchanged) |
| `--fg-2` | `#babbbe` (white at 70%) | 8.90:1 | Secondary body text, captions |
| `--muted` | **`#9a9db0`** (was `#7a7d8e`) | 6.37:1 | Mono metadata, labels, `dt`. The old `#7a7d8e` measured **4.19:1 and fails** AA |
| `--accent` | `#c0caf5` | 10.59:1 | Existing token. Selected filter chip, active view tab underline |
| `--line` | `rgba(255,255,255,.12)` ≈ `#353640` | 1.43:1 | **Decorative only**: grid hairlines, ticks, table rules |
| `--line-strong` | `rgba(255,255,255,.36)` ≈ `#6b6c73` | 3.25:1 | Borders that carry meaning (inputs, toggle outline, focus-adjacent rules). Meets 1.4.11 (3:1) |
| `--scrim` | `linear-gradient(to top, rgba(26,27,38,.85), rgba(26,27,38,0) 60%)` | n/a | Under any text placed on a photo |
| `--signal` (OPTIONAL) | `#ff8a3d` "survey orange" | 7.29:1 | **Needs client approval.** See 1.1.1 |

**Clean up opacity text.** The codebase currently uses `text-white/35`, `/40` and `/45` (3.2, 3.8 and 4.5:1) plus `opacity-30…60` on text. Replace every text use with `--muted`, or with `--fg-2` where it carries information. `text-white/55` and above can stay or map to `--fg-2`. Reduced opacity remains acceptable only on decorative SVG and on disabled controls.

#### 1.1.1 Optional signal colour (client decision)
- **Option A, no new colour (default if the client says no):** the "signal" role uses `--accent #c0caf5`.
- **Option B, survey orange `#ff8a3d`:** the colour of site-survey stakes and redline markup. It is very sparing and used for **at most these 4 things**: the crosshair centre point, the active map marker, the "live" dot beside local time, and the tick for the current dossier chapter. It never fills large areas, never colours body text, and never sits behind text.

The mockup has a switch so the client can compare both options.

### 1.2 Typography

| Role | Family | Note |
|---|---|---|
| Display | General Sans 500 (Fontshare, already loaded) | Headings, project titles, hero positioning line |
| Body | Inter 400/500 (Google, already loaded) | Running text, table project names |
| Mono (**new**) | **IBM Plex Mono 400/500** (Google), recommended | All metadata: coordinates, years, areas, numbering, captions prefix, tick labels, table columns except Project |

Alternatives for the client: JetBrains Mono (rounder, more "code"), Geist Mono (more neutral and modern), Space Mono (too quirky for this direction, not recommended). IBM Plex Mono is recommended because its engineered, draughting-office character fits best and it stays legible at 12px. Add it to `@nuxt/fonts`:

```ts
{ name: 'IBM Plex Mono', provider: 'google', weights: [400, 500] }
```
and `--font-mono: 'IBM Plex Mono', ui-monospace, monospace;` in `@theme`, with an explicit `.font-mono { font-family: ... }` rule (same scanner caveat as the display face).

**Scale (fluid, rem):**

| Token | Size | Line-height / tracking | Family |
|---|---|---|---|
| `display-xl` | `clamp(2.75rem, 6vw, 6rem)` | 0.95 / -0.03em | Display 500. Dossier title only |
| `display-l` | `clamp(2rem, 4vw, 3.5rem)` | 1.02 / -0.02em | Display 500. Page titles, next-project |
| `display-m` | `clamp(1.375rem, 2.2vw, 2rem)` | 1.15 / -0.01em | Display 500. Hero positioning line, chapter titles |
| `body-l` | 1.125rem | 1.6 | Inter. Chapter text |
| `body` | 1rem | 1.6 | Inter |
| `body-s` | 0.875rem | 1.5 | Inter. Captions |
| `mono-s` | 0.75rem (12px) | 1.4 / +0.04em, UPPERCASE | Mono. All meaningful metadata. **Minimum size for information** |
| `mono-xs` | 0.6875rem (11px) | 1 / +0.06em | Mono. **Ornament only** (tick labels), `aria-hidden` |

Mono numerals use `font-variant-numeric: tabular-nums` so table columns line up.

### 1.3 Spacing, grid, radius

- Spacing scale (4px base): `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192`.
- **Grid:** desktop (≥1024) has 12 columns, a 24px gutter and a 40px outer margin. Tablet (640–1023) has 8 columns, a 20px gutter and a 24px margin. Mobile (<640) has 4 columns, a 16px gutter and a 16px margin. Max content width 1600px, centred; the hairlines extend to the viewport edges.
- **Radius: 0** everywhere (drawings have no rounded corners). Exceptions are focus rings (2px) and the cursor readout (0).
- **Hairline weight:** 1px. On DPR ≥ 2, decorative grid lines may use 0.5px through `transform: scaleX(.5)`.

### 1.4 Grid ornament: "the sheet"

- **`<SheetGrid>`** (fixed, `pointer-events:none`, `aria-hidden`, z below content) draws the column boundary hairlines in `--line` at full height. It is visible by default at 100% of `--line`. Over full-bleed images it is hidden (the image sits on a higher layer, so the grid does not run across photos).
- **`<DimRuler>`** is placed at the top of each major section. It is a 1px rule in `--line` with an 8px tick at every column boundary and a 4px tick at each column midpoint. Labels in `mono-xs` sit every 3 columns (`03`, `06`, `09`, `12`) on desktop and only at `04` on mobile. It also includes one **dimension callout** for the section's key element, for example `├──── 7/12 ────┤` over an inset image or `├── 4 ──┤` over the fact sheet. It is decorative and `aria-hidden`.
- The section number sits at the left end of the ruler in `mono-s`: `A-01 HOME`, `A-02 WORK`, `B-03 RUMAH SELAT`. This works like sheet numbering in a drawing set.

### 1.5 Motion (#18 basics)

**One easing:** `--ease-draft: cubic-bezier(0.22, 1, 0.36, 1)`, which is GSAP `power4.out` (quint out). It starts fast and settles like a pen stroke. Nothing bounces and nothing overshoots.

**Duration scale:**

| Token | ms | Use |
|---|---|---|
| `--d-1` | 120 | Hover colour, cursor state, chip toggle |
| `--d-2` | 240 | UI transitions, preview image swap, tab change |
| `--d-3` | 480 | Section-plane cut reveal of an image, text line reveal |
| `--d-4` | 960 | Line draw-in (drawings, rulers, curtain line) |

Stagger step: 60ms. Maximum total for one entrance sequence: 1200ms.

**Primitives** (these replace the generic fade-up everywhere):
1. **Draw** (`v-draw`): SVG strokes get `pathLength="1"` and animate `stroke-dashoffset 1 → 0` over `--d-4`. It is used for DimRulers, drawings and the curtain line. Text belonging to a section appears only after its ruler has drawn (offset by `--d-2`).
2. **Section cut** (`v-cut`): an image reveals with `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over `--d-3`, and a 1px `--fg` line travels with the cutting edge, like a section plane passing through. The direction is left to right, or bottom to top for tall images.
3. **Text line reveal:** each line goes from `translateY(100%)` to 0 inside an overflow-clipped line box over `--d-3`. It is used only for display text.

All primitives trigger once, at 15% in view. **`prefers-reduced-motion: reduce`** shows the final state immediately: there is no draw, no clip and no rotation autoplay, and the Lenis smooth scroll is off. JS gates each primitive, and the existing global CSS fallback stays in place.

### 1.6 Imagery

- **Remove** `grayscale(0.7)`, the brightness dimming and the opacity on images. Every photo is shown in true colour.
- Text on a photo always sits on `--scrim`. Caption text on the scrim is `--fg`, which measures above 7:1 over the darkest 40% of the gradient.
- **Loading placeholder:** a 45° hatch (`repeating-linear-gradient` in `--line`, 6px pitch). It reads as a "poché" area in a drawing, not as a grey box. Replace the skeleton shimmer on public images with it.
- Keep the film grain? Recommended: **remove it from the public site**, because it muddies true colour and drawings. This is flagged as a client question.

---

## 2. Components

### 2.1 Crosshair cursor (replaces `CustomCursor.vue` ring and "VIEW")

**Behaviour**
- It is enabled only when `(hover: hover) and (pointer: fine)` matches **and** reduced motion is not set. Otherwise it is not mounted at all.
- **The native cursor is not hidden.** The page sets `cursor: crosshair` on `body`, and links and buttons keep `cursor: pointer`, so form fields keep the text caret. Remove `html.cursor-hidden`. This removes the current accessibility risk, where the cursor disappears if JS lags.
- The overlay consists of two full-viewport 1px hairlines, horizontal and vertical, in `rgba(255,255,255,.18)`, that cross at the pointer. There is no lerp: they track 1:1 and are updated through rAF with `transform` only. A 5px centre square uses `--signal` (option B) or `--fg`.
- **Coordinate readout:** a `mono-xs` label offset +14/+14 from the pointer that flips at viewport edges. It shows the pointer position in the sheet's coordinate system, `X 07.4 · Y 12.8`, where X is in grid columns (column index plus fraction) and Y is in metres at a nominal 1:100 scale (1px = 1cm, from the page top). Over an element with `data-cursor-label` it adds a second line (for example `OPEN DOSSIER`, `ENLARGE`, `DRAG`). Those labels are supplementary; every target also has its own visible affordance and accessible name.
- Over `[data-cursor="hide"]` (video, map pan area, the lightbox) the hairlines are hidden.
- `aria-hidden="true"`, `pointer-events: none`, z-index under the header but above content.

### 2.2 Mono metadata line (`<MetaLine>`)
An inline list of items separated by ` · ` in `mono-s` and `--muted`, with the important value in `--fg`. It is rendered as a `<p>` (or a `<dl>` when label/value pairs carry meaning). Example: `06°13′S 106°48′E · JAKARTA 07:42 WIB · 2024`.

### 2.3 View toggle (`<ViewSwitch>`)
A segmented control: `INDEX | ATLAS | MAP` in `mono-s`, 40px tall (44px touch target on mobile, with padding), outlined in `--line-strong`. The active segment is `--fg` text with a 2px underline in `--accent`.
Semantics: a `role="radiogroup"` with `aria-label="Project view"` and buttons with `role="radio"` and `aria-checked`. Arrow keys move between segments. Changing the view calls `router.replace({ query: { ...route.query, view } })`, so `cat`, `q` and `year` are preserved. `index` is the default and is omitted from the URL; see the open questions.

### 2.4 Fact sheet (`<FactSheet>`)
A `<dl>`. Each row has a `dt` in `mono-s --muted` above or beside a `dd` in `body-s --fg`, with 12px row padding and a `--line` rule between rows. **Any row without data is not rendered.** Areas are formatted per locale (`id`: `1.240 m²`, `en`: `1,240 m²`). Coordinates use rounded DMS (see open question on privacy) and link to OpenStreetMap at the same rounded precision, with `rel="noopener"` and an external-link icon plus `<span class="sr-only">(opens map in new tab)</span>`.

Row order: Location, Coordinates, Year, Status, Typology, Site area, Built area, Client, Team, Collaborators, Photographer, Services.

### 2.5 Drawing figure (`<DrawingFigure>`)
A `<figure>` with the drawing, a mono caption bar (`PLAN — LEVEL 1 · 1:200`) and a north arrow / scale bar ornament when `kind` is `plan` or `site_plan`.
- **Preferred asset:** SVG or PNG with white (or `currentColor`) lines on transparent.
- **Fallback for black-on-white CAD exports:** when `invert: true`, apply `filter: invert(1) hue-rotate(180deg)` with `mix-blend-mode: screen`, so the paper drops out and the lines turn white. The admin preview shows the result on `--bg` before saving.
- SVGs are always rendered via `<img>` (never inlined) so embedded script cannot run. The draw-in effect therefore applies only to the decorative frame, ruler and scale bar, not to uploaded drawings, which use the section-cut reveal instead.
- Clicking or pressing Enter opens it in the lightbox.

### 2.6 Lightbox (`<Lightbox>`)
- A native `<dialog>` opened with `showModal()`. The browser provides the focus trap and Esc to close; focus returns to the trigger.
- Contents: the image or drawing at contain-fit, a counter `04 / 12` (mono), the caption, and Prev / Next / Close buttons (44px, labelled `Previous image`, `Next image`, `Close`).
- Keys: `←` and `→` move between items; `Home` and `End` jump to the first and last.
- Touch: a horizontal swipe with a 50px threshold moves between items, and a vertical swipe down of more than 80px closes.
- The sequence is every image and drawing on the page in document order. Neighbours are preloaded.
- Reduced motion: no transition. Otherwise an opacity crossfade over `--d-2`.
- The body is scroll-locked (Lenis `stop()`).

### 2.7 Next project band
A full-width band 60svh tall (40svh on mobile) with the next project's cover in true colour under `--scrim`. Bottom left shows `NEXT — 04 / 08` (mono) and the title in `display-l`; bottom right shows an arrow. On hover or focus, a section-cut line sweeps across. The whole band is one link: "Next project: Vila Ubud".

### 2.8 Footer "title block" (replaces the giant AA2U)
It is laid out like a drawing title block: a grid of cells with `--line` borders.
`STUDIO AA2U` | `ADDRESS …` | `06°13′S 106°48′E` | `CONTACT …` | `SHEET A-000 · SCALE NTS · © 2026`.
On mobile it becomes 2 columns. The wordmark stays only as the small header logotype (16px display 600). It no longer appears in the curtain or the hero.

---

## 3. Pages

### 3.1 Intro curtain (#13)
- It plays **at most once per session** (keep the existing `.no-intro` bootstrap). The total is **≤ 1.4s**, and any key, click, scroll or touch skips it.
- Sequence:
  1. 0–480ms: a horizontal section line draws across the viewport at 50% height, with `0.00` and `+3.20` level marks.
  2. 240–720ms: a small plan outline (the project's footprint, or a generic rectangle with a door swing) draws at the centre, 120px wide.
  3. 720–1200ms: the curtain splits along the section line (the top half moves up, the bottom half moves down) and reveals the hero.
  4. The first hero caption line is typed as mono over 200ms.
- There is no wordmark. It has `aria-hidden`; the hero `h1` is in the DOM from SSR.
- Reduced motion: never shown.

### 3.2 Home hero (#13)

```
DESKTOP ≥1024                                                     (full-bleed 100svh)
┌──────────────────────────────────────────────────────────────────────────────┐
│ AA2U          Work   Studio   Contact                 ID/EN   ● JKT 07:42 WIB │  header over image, scrim top
│                                                                              │
│                                                                              │
│                    [ FULL-BLEED TRUE-COLOUR PROJECT PHOTO ]                  │
│                                                                              │
│                                                                              │
│ ┌────────────────────────────────────┐                                       │
│ │ An architecture studio focused on  │  ← h1 = home.intro (display-m),      │
│ │ precision design, BIM methodology… │     cols 1–6                          │
│ └────────────────────────────────────┘                                       │
│ 08°49′S 115°05′E · ULUWATU, BALI · MORNING LIGHT, SUN 34°                    │  mono-s, --fg on scrim
│ 01/04  RUMAH SELAT — 2024   View project →        [❚❚ Pause] [‹] [›]  ▬▬▬▭▭▭ │  controls + scale-bar progress
└──────────────────────────────────────────────────────────────────────────────┘
  ├─03──────┼─06──────┼─09──────┼─12──────┤  DimRuler starts the next section (A-02 WORK)

MOBILE ~390
┌──────────────────────────┐
│ AA2U              ≡ Menu │
│                          │
│  [ PHOTO, 100svh,        │
│    object-position from  │
│    image focal point ]   │
│                          │
│ An architecture studio   │ h1 display-m
│ focused on precision…    │
│ 08°49′S 115°05′E         │ mono-s (two lines max)
│ ULUWATU · 2024           │
│ RUMAH SELAT  View →      │
│ [❚❚] [‹] [›]   01/04 ▬▬▭ │ 44px buttons
└──────────────────────────┘
```

- **Content:** the image is a featured project's cover (`is_featured`, sorted by `sort_order`; max 4). The caption shows rounded coordinates, the locality, the project name and the year. The top-right "● JKT 07:42 WIB" is the studio's local time (it replaces the existing clock and later hooks into the #19 light index).
- **Rotation:** advances every 7s through the featured projects, with a section-cut transition over `--d-3`. **WCAG 2.2.2:**
  - a visible Pause/Play button (`aria-pressed`, label "Pause slideshow" / "Play slideshow"),
  - rotation also pauses on hover, on focus within the hero, and when the tab is hidden,
  - **no autoplay under reduced motion** (Prev/Next still work),
  - a `aria-live="polite"` region announces only manual changes ("Project 2 of 4: Kemang Pavilion"). It is silent during autoplay to avoid noise.
- **Primary action:** "View project →" links to the current dossier. The secondary action is scrolling into the Work section.
- **States:**
  - Loading: hatch placeholder plus caption text (from SSR).
  - Only one featured project: no controls and no rotation.
  - No featured projects: use the first published project.
  - No projects at all: the h1 sits on `--bg` with a large section ruler ornament and no image.
  - Image fails to load: hatch plus the caption remains.

### 3.3 /work: shared header

```
A-02 WORK  ├─03──────┼─06──────┼─09──────┼─12──────┤
Work (08)                                    [ INDEX | ATLAS | MAP ]
[All 08] [Residential 04] [Commercial 01] [Cultural 01] [Office 01] [Public 01]   Search…  Year ▾
```
The category chips, search and year filter remain and work identically in all three views because they filter one computed list. The result count updates live (`aria-live="polite"`: "5 projects").
**Empty state** (in every view): `No projects match "Residential · 2019".` with the button `Clear filters`.

### 3.4 /work view = Index (default)

```
DESKTOP
No   Project                 Location            Year   Type          Status        m²
──────────────────────────────────────────────────────────────────────────────────────
01   Rumah Selat             Uluwatu, Bali       2024   Residential   Completed   1,240
02   Kemang Pavilion         South Jakarta       2024   Public        Completed     380   ┌──────────────┐
03   Senopati Studio ←hover  Jakarta             2023   Office        Completed     610   │ preview img  │ follows cursor
04   Ubud Villa              Ubud, Bali          2023   Residential   Construction  920   │ 320×220 true │ (+24,+24),
──────────────────────────────────────────────────────────────────────────────────────    │ colour, cut  │ flips at edges
                                                                                          └──────────────┘
```
- Row height is 56px with a `--line` rule between rows. On hover the row becomes `--fg` and the other rows dim to `--muted` (text only, still ≥4.5:1). The No column becomes a `→`.
- **Preview:** on desktop with a fine pointer only. The image follows the pointer with a lerp (0.18; 1:1 under reduced motion, where it simply appears without the cut reveal). It swaps with a section cut over `--d-2`. It is `aria-hidden`.
- **Keyboard:** each project name is the row's link, made a stretched link so the whole row is clickable. On focus the preview is shown **anchored at the right end of the row** instead of at the pointer.
- **Sorting** (nice-to-have): Year and m² headers are buttons with `aria-sort`. The default order is `sort_order`.
- **Semantics:** a real `<table>` with `<caption class="sr-only">Projects, 8 results</caption>`. Missing m² shows `—` with `aria-label="not available"`.
- **Status column** uses the new `build_status`, not the CMS publish status (see the data contract).

```
MOBILE <640: same table, rows restyled as two-line items (keep ARIA roles explicit: role=table/row/cell,
because display:grid on tr drops semantics in Safari)
┌──────────────────────────┐
│ 01 Rumah Selat   ┌─────┐ │  title body 500; 72×54 thumbnail (true colour), no hover preview
│ Bali · 2024 · RES│ img │ │  mono-s --muted
│ 1,240 m² · DONE  └─────┘ │
├──────────────────────────┤
│ 02 Kemang Pavilion ┌───┐ │
│ …                        │
└──────────────────────────┘
```

### 3.5 /work view = Atlas (current grid, restyled)
- On a 12-column grid with a repeating rhythm of `7|5`, `5|7` and `4|4|4` rows (mobile: 1 column; tablet: 2).
- Images are in true colour with no hover scale or dim. On hover a section-cut line sweeps across and the cursor label reads `OPEN DOSSIER`.
- Under each image is a mono line, `03 — SENOPATI STUDIO / JAKARTA / 2023`, with the title also as `h3` body 500.
- Keep the shared FLIP transition into the dossier cover.

### 3.6 /work view = Map

```
DESKTOP
┌──────────────────────────────────────────────────────────┬────────────────────┐
│  INDONESIA  94°E ────────────────────────────── 141°E    │ JAVA (5)           │
│  ┌ monochrome SVG outline, --line-strong strokes, no   ┐ │  02 Kemang Pav.  ● │
│  │ fill; graticule every 5° in --line, labelled mono-xs│ │  03 Senopati St. ● │
│  │      ·Sumatra      ·Kalimantan    ·Sulawesi  ·Papua │ │  …                 │
│  │            ▣3 (Jakarta cluster)     ■ markers       │ │ BALI (2)           │
│  └─────────────────────────────────────────────────────┘ │  01 Rumah Selat  ● │
│  ┌ INSET: JAVA–BALI 105°–116°E (auto-shown when ≥60% of  │  04 Ubud Villa   ● │
│  │ results fall inside) ───────────────────────────────┐ │ NOT MAPPED (0)     │
│  └─────────────────────────────────────────────────────┘ │                    │
└──────────────────────────────────────────────────────────┴────────────────────┘
```
- **Asset:** `public/maps/indonesia.svg`, built once from Natural Earth admin-0 1:10m (public domain) and simplified with mapshaper to ≤ 30 kB. It uses an **equirectangular projection with fixed bounds** of lon 94.5–141.5 and lat +6.5 to −11.5, so plotting is linear:
  `x = (lng − 94.5) / 47 × W`, `y = (6.5 − lat) / 18 × H`. Include Indonesian territory only. Neighbouring land is optional, in 50% `--line`. No tile provider and no third-party requests.
- **Markers:** an 8px square (a drafting point) with a 1px crosshair, in `--fg`. The active marker uses `--signal`, or `--accent` under option A. Markers within 14px of each other merge into a numbered cluster square. Activating a cluster zooms the inset to it.
- Each marker is an `<a>` link to the dossier with an accessible name ("Rumah Selat, Uluwatu, Bali, 2024"). On hover or focus a mono label and a 200×140 preview card appear. **The adjacent list is the primary accessible path**: hovering or focusing a list item highlights its marker, and the reverse.
- Filtering hides non-matching markers entirely (they are removed, not dimmed).
- Projects without `lat/lng` appear under **"Not mapped (n)"** in the list.
- **Mobile:** the full map is only about 140px tall at 390px, so mobile **opens on the Java–Bali inset** (full width, about 220px tall) with a `Show all Indonesia` toggle. The list sits below the map, not beside it. There is no pinch-zoom requirement.

### 3.7 Project dossier (#14)

```
DESKTOP ≥1024
┌──────────────────────────────────────────────────────────────────────────────┐
│ COVER — full-bleed true-colour, 85svh, scrim bottom                          │
│ B-01 · RESIDENTIAL · ULUWATU, BALI · 2024                       (mono-s)     │
│ Rumah Selat                                                     (display-xl) │
└──────────────────────────────────────────────────────────────────────────────┘
├─03──────┼─06──────┼─09──────┼─12──────┤  ruler; callout "├── 3 ──┤" over the rail
┌ RAIL cols 1–3 (sticky, top: header+24) ┐ CONTENT cols 4–12
│ FACT SHEET                             │ 01 SITE ──────────────────────────────────
│ Location     Uluwatu, Bali             │ body-l text (cols 4–9, max 64ch)
│ Coordinates  08°49′S 115°05′E ↗        │ [ wide image, cols 4–12, bleeds to right edge ]
│ Year         2024                      │ caption: mono "FIG. 01" + body-s caption
│ Status       Completed                 │
│ Typology     Residential               │ 02 CONCEPT ───────────────────────────────
│ Site area    2,800 m²                  │ text  +  [ diagram drawing, inset cols 6–12 = 7/12 ]
│ Built area   1,240 m²                  │
│ Client       Private client            │ 03 PLAN ──────────────────────────────────
│ Team         A. Wibowo, R. Sari        │ [ plan drawing on dark, cols 4–12, north arrow, scale bar ]
│ With         Studio Tanah              │ PLAN — LEVEL 1 · 1:200
│ Photography  Mario Wibowo              │
│ ───────────────                        │ 04 SECTION ───────────────────────────────
│ CHAPTERS                               │ [ section drawing wide ] + [ pair: img | img, cols 4–8 / 9–12 ]
│ ■ 01 Site      ← current (signal tick) │
│ □ 02 Concept                           │ 05 MATERIAL ──────────────────────────────
│ □ 03 Plan                              │ swatch strip: 3–5 square tiles + mono names (#17 later)
│ □ 04 Section                           │
│ □ 05 Material                          │
│ □ 06 Built                             │
└────────────────────────────────────────┘
06 BUILT — rail ends; full-bleed + tall single (cols 5–9) + pair sequence, captions under each
NEXT PROJECT band (2.7)
```

```
MOBILE ~390
┌──────────────────────────┐
│ COVER 70svh              │
│ B-01 · RESIDENTIAL       │
│ Rumah Selat              │
├──────────────────────────┤
│ ▸ Fact sheet (11)        │ <details>, closed by default; first 4 rows visible above it
│ Uluwatu, Bali · 2024     │   (Location, Year, Status, Built area) as a MetaLine
│ Completed · 1,240 m²     │
├──────────────────────────┤
│ 02/06 CONCEPT        ▾   │ sticky chapter bar under header (40px); tap opens chapter list
├──────────────────────────┤
│ chapter content, all     │ every layout collapses to full width, except "tall",
│ layouts 1-col            │ which becomes 4/4 at 3:4 aspect; pairs stack
└──────────────────────────┘
```
- **Chapter nav:** `<nav aria-label="Chapters">` with anchor links, and `aria-current="true"` on the chapter in view (IntersectionObserver). The current chapter gets a filled square tick (in `--signal`, or `--fg` under option A).
- **Chapter rendering:** each chapter renders only when it has content (text, images, drawings or materials). An empty chapter is removed from both the body and the nav.
- **Fallback for existing projects (no new data):** the cover, then `description` as the Concept text and `process_note` as the Site text, then all `images` in Built with automatic layouts. **Every current project therefore keeps rendering.**
- **Image layouts:** `full` (viewport width, only in Built or between chapters), `wide` (cols 4–12, bleeding right), `inset` (cols 6–12 = 7/12), `pair` (two consecutive images, cols 4–8 and 9–12), `tall` (portrait, cols 6–9; mobile full width).
- **`auto` rule** (when no layout is set):
  - the first image in a chapter is `wide`,
  - a portrait image (h > w) is `tall`,
  - two consecutive landscape images after the first become a `pair`,
  - anything else alternates `inset` / `wide`.
  
  This requires image `width`/`height` (also good for CLS).
- **Captions** are always rendered when present: a mono `FIG. 07` plus the caption in `body-s --fg-2`. Missing alt text falls back to `"<project title>, figure 7"`. The caption is in a `<figcaption>`, with `alt` kept separate.
- Every figure opens the lightbox.

---

## 4. Accessibility checklist

1. **Contrast:** all text ≥ 4.5:1 (the tokens above); meaningful non-text ≥ 3:1 (`--line-strong`). `--line` is decorative only.
2. **Cursor:** the native cursor is never hidden. The crosshair is decorative, is not shown on touch or under reduced motion, and has `aria-hidden`.
3. **Motion:** one gate (`prefersReducedMotion()`) covers draw, cut, rotation autoplay, Lenis and the preview lerp. The intro curtain is skippable and never shown under reduced motion.
4. **Hero rotation:** Pause control, plus pause on hover, focus and hidden tab (WCAG 2.2.2). Polite announcements happen only on manual change.
5. **Keyboard:**
   - the view toggle uses arrow keys inside a radiogroup,
   - the Index preview anchors on focus,
   - map markers and the list are mutually linked, and all markers are reachable,
   - the lightbox is a `<dialog>` that handles Esc and arrows and returns focus,
   - the chapter nav uses anchors and `aria-current`.
6. **Semantics:**
   - the hero `h1` = `home.intro`,
   - the dossier `h1` = the project title, and each chapter is an `h2`,
   - the fact sheet is a `<dl>`,
   - the Index is a `<table>` (with explicit roles on mobile),
   - the map is wrapped in `<figure>`, with a `figcaption` stating "Map of 8 projects; list follows".
7. **Targets:** ≥ 44×44px on touch for hero controls, the view toggle, chips, lightbox buttons and the mobile chapter bar.
8. **Text size:** information is never below 12px. 11px is used for `aria-hidden` ornament only.
9. **Zoom/reflow:** at 320px CSS width, nothing scrolls horizontally. The rulers reduce to 4 columns, and the table becomes 2-line rows.
10. **Language:** coordinates and units are read naturally. Give DMS strings an `aria-label` such as "8 degrees 49 minutes south, 115 degrees 5 minutes east".

---

## 5. Data contract (#14, also used by #13 and #15)

All new fields are **optional**. A project with only today's fields renders exactly as described under "Fallback".

### 5.1 `types/content.ts` additions

```ts
export type BuildStatus = 'concept' | 'design' | 'construction' | 'completed' | 'unbuilt'
export type Chapter = 'site' | 'concept' | 'plan' | 'section' | 'material' | 'built'
export type ImageLayout = 'auto' | 'full' | 'wide' | 'inset' | 'pair' | 'tall'
export type DrawingKind = 'site_plan' | 'plan' | 'section' | 'elevation' | 'diagram' | 'axonometric'

export interface ProjectImage {
  url: string
  alt?: I18nField
  caption?: I18nField
  chapter?: Chapter            // default 'built'
  layout?: ImageLayout         // default 'auto'
  width?: number               // intrinsic px; enables auto layout + CLS-free
  height?: number
  focal_x?: number             // 0–1, object-position for crops (hero/cover), default .5
  focal_y?: number
}

export interface ProjectDrawing {
  url: string                  // SVG or PNG; light lines on transparent preferred
  kind: DrawingKind
  caption?: I18nField          // "Ground floor plan"
  alt?: I18nField
  scale?: string               // "1:200" (display only)
  level?: string               // "+3.20" / "Level 1"
  invert?: boolean             // true for black-on-white exports
  chapter?: Chapter            // default by kind: plan/site_plan→plan, section/elevation→section, diagram/axonometric→concept
  sort_order: number
}

export interface ProjectMaterial {
  name: I18nField              // "Paras Kerobokan stone"
  image?: string               // macro photo, square crop
  note?: I18nField             // origin / finish
  sort_order: number
}

export interface Project {
  // …existing fields unchanged…
  build_status?: BuildStatus          // shown as "Status" publicly; `status` stays the CMS publish state
  area_site_m2?: number
  area_built_m2?: number
  client?: I18nField                  // allows "Klien privat" / "Private client"
  team?: string[]                     // studio people credited (free text, or team member names)
  photographer?: string
  lat?: number                        // WGS84, stored exact
  lng?: number
  chapter_text?: Partial<Record<Chapter, I18nField>>
  drawings?: ProjectDrawing[]
  materials?: ProjectMaterial[]
}
```
`partners` stays and is shown as "Collaborators / With".

### 5.2 Supabase migration (`supabase/migrations/2026-10-xx_project_dossier.sql`; also fold into `schema.sql`)

```sql
create type build_status as enum ('concept','design','construction','completed','unbuilt');

alter table projects
  add column build_status   build_status,
  add column area_site_m2   numeric(10,1) check (area_site_m2  > 0),
  add column area_built_m2  numeric(10,1) check (area_built_m2 > 0),
  add column client         jsonb,                 -- i18n
  add column team           text[] default '{}',
  add column photographer   text,
  add column lat            double precision check (lat between -90 and 90),
  add column lng            double precision check (lng between -180 and 180),
  add column chapter_text   jsonb not null default '{}'::jsonb;  -- { "site": {id,en}, ... }

alter table project_images
  add column chapter text check (chapter in ('site','concept','plan','section','material','built')),
  add column layout  text not null default 'auto'
                     check (layout in ('auto','full','wide','inset','pair','tall')),
  add column width   int, add column height int,
  add column focal_x real check (focal_x between 0 and 1),
  add column focal_y real check (focal_y between 0 and 1);

create table project_drawings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  url text not null,
  kind text not null check (kind in ('site_plan','plan','section','elevation','diagram','axonometric')),
  caption jsonb, alt jsonb, scale text, level text,
  invert bool not null default false,
  chapter text check (chapter in ('site','concept','plan','section','material','built')),
  sort_order int not null default 0
);
create index project_drawings_project_idx on project_drawings(project_id, sort_order);

create table project_materials (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name jsonb not null, image text, note jsonb,
  sort_order int not null default 0
);
create index project_materials_project_idx on project_materials(project_id, sort_order);

-- RLS: copy the project_images policies verbatim (public read when parent project is
-- publicly visible; admins write) for both new tables.
```
Storage: allow `image/svg+xml` in the project bucket for drawings. SVGs are only ever rendered through `<img>`. Optionally sanitize on upload, for example by rejecting files that contain `<script` or `on*=` attributes.

### 5.3 Mapping and dummy data
- `mapProject` (and its duplicate, see roadmap #23) maps the new columns, sorts drawings and materials by `sort_order`, and converts `numeric` to `number`.
- Add values to `data/projects.ts` for all 8 dummy projects: `lat/lng`, areas, `build_status`, `client`, `photographer`, 2 drawings (the mockup's plan and section SVGs can serve as placeholders), and 3 materials. Leave one project (`kafe-bandung`) with **no** new fields to test the fallback.
- **Public coordinate precision:** round to 2 decimals (≈1.1 km) in **every** public output (fact sheet, map, hero caption, JSON-LD). Do it server-side in the mapper so exact values never reach the client. Exact values stay admin-only.

### 5.4 Admin form additions (`pages/admin/projects/*`)
1. A new **"Facts"** card: Build status (select), Site area m², Built area m² (number, step 0.1), Client (I18n, with a "Private client" quick-fill), Team (tag list), Photographer.
2. A **"Location"** card: Lat and Lng inputs, plus a "Paste from Google Maps" field that parses `-8.8291, 115.0849`. It includes a small preview: the same Indonesia SVG with a single marker, which catches swapped lat/lng signs.
3. A **"Chapters"** card: six I18n textareas (Site … Built), each collapsible and showing a filled/empty indicator.
4. **Gallery manager** (`AdminProjectGalleryManager.vue`): per image, add a Chapter select, a Layout select and a focal-point click on the thumbnail. Width and height are read automatically on upload.
5. **Drawings manager** (new, modelled on the gallery manager): upload SVG/PNG, then set Kind, Scale, Level, Caption (I18n), Alt (I18n), an Invert toggle **with a live preview on `#1a1b26`**, and Chapter override, with drag reorder.
6. **Materials manager** (new): Name (I18n), Macro image, Note (I18n), reorder.

---

## 6. Build order (suggested)

| # | Step | Owner | Size | Depends on |
|---|---|---|---|---|
| 1 | Tokens: contrast-fixed `--muted`, `--fg-2`, `--line(-strong)`, mono font, type scale, motion vars. Replace `text-white/35–45` and text opacity. Remove greyscale/dim; add hatch placeholder | fe | S | — |
| 2 | `<SheetGrid>`, `<DimRuler>`, `<MetaLine>`; `v-draw` + `v-cut` primitives with reduced-motion gate; swap the generic fade-ups | fe | M | 1 |
| 3 | Crosshair cursor (replace `CustomCursor.vue`, remove `cursor-hidden`) | fe | S | 1 |
| 4 | Migration + types + mapper (incl. coordinate rounding) + dummy data | be | M | — (parallel to 1–3) |
| 5 | Home: new hero with rotation and pause, short curtain, footer title block (wordmark ×3 removed) | fe | M | 2, 4 (lat/lng; falls back without it) |
| 6 | /work: `<ViewSwitch>` + `?view=` + Index table with preview + mobile rows; Atlas restyle | fe | M | 2, 4 |
| 7 | /work Map: build the SVG asset, projection util, markers and clusters, Java–Bali inset, list | fe | M–L | 6 |
| 8 | Dossier: cover, rail (fact sheet + chapter nav), chapter renderer + auto layout, DrawingFigure, Lightbox, Next band | fe | L | 2, 4 |
| 9 | Admin: Facts / Location / Chapters cards, gallery fields, Drawings + Materials managers | fe + be | M–L | 4 |
| 10 | QA pass: 320/390/1440 widths, reduced motion, keyboard-only, VoiceOver on table and map, Lighthouse contrast | qa + uiux review | S | all |

Steps 1–3 can ship on their own and change the feel of the whole site right away.

---

## 7. Open questions for the client

1. **Signal colour:** option A (no new colour; the `#c0caf5` accent does the job) or option B (survey orange `#ff8a3d`, used in 4 tiny places only)?
2. **Mono font:** IBM Plex Mono (recommended), JetBrains Mono or Geist Mono?
3. **Hero:** one fixed image, or rotating featured projects (how many, max 4; 7s each)? Which project opens?
4. **Coordinates for private homes:** OK to publish ≈1 km rounded coordinates for residential projects? Should there be a per-project "hide location" option?
5. **Client names:** may we publish them? Default to "Private client" for residential?
6. **Drawings:** does the studio have plans and sections it is willing to publish? In what format (CAD PDF, DWG export, SVG)? Who prepares the white-on-transparent versions? Without drawings, the Plan and Section chapters are hidden.
7. **Default /work view:** Index (most distinctive, fastest to scan) or Atlas (most visual)?
8. **Status vocabulary:** Concept / Design / Construction / Completed / Unbuilt. Is that right, and should "Unbuilt" (competitions) be shown?
9. **Film grain overlay:** remove (recommended with true colour) or keep at a lower strength?
10. **Sheet numbering ornament** (`A-01 HOME`, `B-03 …`): charming or too literal?

## 8. Client decisions (2026-10-20) — these override the open questions above

1. **Signal colour: B, approved.** `--signal: #ff8a3d`, used only for the small uses listed in 1.1.1.
2. **Mono font:** IBM Plex Mono.
3. **Hero:** uses the covers of featured projects, rotating automatically (pause / prev / next, WCAG 2.2.2 rules as specified).
4. **Location privacy:** add a per-project **"hide location"** option. When it is on:
   - no coordinates anywhere public (fact sheet, hero caption, map, JSON-LD);
   - the project goes in the map's "Not mapped" list;
   - only the free-text location the admin typed is shown (they can write just "Bali").

   When it is off, coordinates are rounded to 2 decimals in public. **Exact coordinates must never be readable with the public anon key.** Rounding inside a client-side mapper is not enough, because the anon key can query the REST API directly. Exact values live in an admin-only place (RLS), and public columns hold the rounded value or null.
5. **Client name:** per-project display mode:
   - `name` (real name)
   - `alias` (a pseudonym the admin types)
   - `private` (shows "Klien pribadi" / "Private client"; this is the default)

   The real name is admin-only (same RLS rule as 4) unless the mode is `name`.
6. **Drawings:** the studio has them but the formats are unknown. Accept PNG, JPG, WebP and SVG, up to 10 MB each. Keep the `invert` toggle for black-on-white CAD exports. PDF is not accepted: the admin form shows a hint to export to PNG first. If a project has no drawings, the Plan and Section chapters are hidden.
7. **/work default view:** Index. It is trivial to change later.
8. **Film grain:** remove it.
9. **Sheet numbering ornament** ("A-01 HOME"): keep.
10. **Hero Pause button:** swaps its accessible label between Pause and Play and does not use `aria-pressed`. This is the standard carousel pattern and replaces the `aria-pressed` wording in §3.2. Under reduced motion, autoplay starts only after the user presses Play.
