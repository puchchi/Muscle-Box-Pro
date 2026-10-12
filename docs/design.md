# Design rules for public pages

How a public MuscleBoxPro page should look and behave. Follow this when you build a new
page or rework an existing one. The reference implementations are:

- **Showroom pages:** [Home](../client/src/pages/Home.tsx), [Gym Demo](../client/src/pages/GymDemo.tsx), [Specs](../client/src/pages/MachineSpecs.tsx)
- **Reference pages:** [Gym Partnership](../client/src/pages/GymPartnership.tsx), [Franchise](../client/src/pages/Franchise.tsx)
- **Shared page chrome:** [pageChrome.tsx](../client/src/components/marketing/pageChrome.tsx)
- **Theme values:** [index.css](../client/src/index.css)

Scope: the marketing site, plus the signed-in dashboards in section 11. The admin panel,
the machine console and onboarding have their own conventions and are not covered here.

---

## 1. Pick the page type first

Every public page is one of two types. They share type scale, colour, buttons and cards.
They differ in layout and motion.

| | Showroom | Reference |
|---|---|---|
| Job | Make someone want the product | Let someone check the deal and act on it |
| Examples | Home, Gym Demo, Specs, Menu, Advertise | Gym Partnership, Franchise, anything with terms or money |
| Container | `max-w-7xl` | `max-w-5xl` via `<Section>` |
| Motion | Sections fade/slide in on scroll | Nothing animates except the hero |
| Navigation | Navbar only | Navbar, sticky `SectionNav`, `SkipLink`, mobile `StickyCta` |
| Must have | Hero, gradient CTA band | Breadcrumb, disclaimer band, FAQ, gradient CTA band |

If a page publishes rupee figures, percentages or contract terms, it is a reference page.

---

## 2. Typography

One family: **Plus Jakarta Sans** (`--font-sans`, loaded in `app/layout.tsx`).
`font-display` is the same family, used at weight 900 for headlines.

Write headings in sentence case in the source. `uppercase` does the capitals. Screen
readers and crawlers then get normal text.

### Type scale

| Role | Classes | Where |
|---|---|---|
| Hero h1, short headline, wide column | `font-display font-black uppercase leading-[0.88]` + `style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}` | Home |
| Hero h1, centred | same, `clamp(2.5rem, 6vw, 5rem)` | Specs |
| Hero h1, long headline in a split hero | `font-display font-black uppercase text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.9] text-balance` | Partnership |
| Hero h1, very long headline in a split hero | same, `text-[clamp(2rem,4vw,3rem)] leading-[0.95]` | Franchise, Gym Demo |
| Section h2 | `font-display font-black uppercase leading-none` + `clamp(2rem, 4.5vw, 3.5rem)` | Every section; `SectionHeading` does this |
| Minor section h2 | same, `clamp(1.8rem, 3.5vw, 2.8rem)` | Secondary sections on Specs |
| CTA band h2 | `font-display font-black uppercase leading-none text-white` + `clamp(2.5rem, 6vw, 4.5rem)` | Bottom gradient band |
| Eyebrow | `block text-xs font-bold tracking-[0.25em] uppercase mb-3` | Above every h1/h2 |
| Hero lead | `text-lg leading-relaxed` | Under the h1 |
| Section blurb | `text-base leading-relaxed text-muted-foreground` | Under a section h2 |
| Card title | `font-bold text-lg` (or `font-display font-black uppercase text-lg`) | h3 in cards |
| Body in cards and lists | `text-[15px] leading-relaxed` | Bullet lists, FAQ answers |
| Supporting text | `text-sm leading-relaxed text-muted-foreground` | Card descriptions, notes |
| Labels | `text-xs font-bold uppercase tracking-[0.12em]`–`[0.2em]` | Card labels, figure labels |

Rules:

- **Nothing under `text-sm` (14px) for text people read.** 9 to 11px is allowed only for
  decorative chips over a photo, and those are `aria-hidden` with the same facts readable
  elsewhere.
- **Gradient text only at 24px and above.** `text-transparent bg-clip-text bg-gradient-to-r
  from-accent to-primary` is too low-contrast for anything smaller.
- **The gradient goes on the second half of a headline**, as its own `<span>`. Leave a
  `{" "}` before the span, or text extractors run the words together.
- **No forced `<br>` in a split-column hero.** It defeats `text-balance`. Forced breaks are
  fine in centred, full-width headlines.
- Cap readable prose at about 65 to 75 characters (`max-w-xl` / `max-w-2xl`, or `max-w-[32rem]`
  at 15px). Do not use `ch` units with this font: its `0` is much wider than an average glyph.

### Figures

Headline numbers are part of the design, not body text.

- `font-display font-black leading-none tabular-nums`
- Headline strip (four figures under a hero): `text-2xl sm:text-[2rem]`
- Stat tiles and term cards: `text-2xl sm:text-3xl`, gradient allowed
- Price on a tier card: `text-3xl sm:text-4xl`, gradient allowed
- Show figure and label as `<dl>`. Use `flex flex-col-reverse` so the figure reads first
  while `<dt>` still comes first in the DOM.

---

## 3. Colour

Use theme tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-muted`), not raw
`gray-*` / `white`. Raw grays are allowed only inside dark sections (see below).

### The brand hue has three roles

`--primary` (#FF512F) is too light to sit next to text. That is why it has two darker
siblings. Getting this wrong fails contrast on every button.

| Token | Use for | Never for |
|---|---|---|
| `primary` | Icons, bars, rings, dots, fills with no text on them, display type 24px+ | Small text on white, button backgrounds with white labels |
| `primary-ink` | Brand-coloured **text** on light backgrounds: eyebrows, links, small numerals | Dark backgrounds (use `primary` there) |
| `primary-fill` | Surfaces that **carry text**: every filled button, the skip link | Decoration |

Measured: white on `primary` is 3.25:1 (fails), white on `primary-fill` is 5.11:1 (passes).

### Other colours

- **`accent`** (#DD2476, pink) is decoration only: the gradient, and secondary icon chips.
  Never give it a meaning a reader would have to learn.
- **Brand gradient:** `bg-gradient-to-r from-accent to-primary`. Used for headline halves,
  big figures, the bottom CTA band and progress bars.
- **No other hues.** Not blue, purple or green as decoration. Status colours (red error,
  amber notice, green live dot) are the only exceptions.
- **Party coding (reference pages):** orange means the reader ("you"), grey means MuscleBox
  Pro. Do not colour MuscleBox Pro with the brand hue on a page that uses this coding.

### Surfaces

| Surface | Classes | Text inside |
|---|---|---|
| Default | `bg-background` | Tokens |
| Tinted | `bg-muted/40 border-y border-border` (`<Section tone="tinted">`) | Tokens |
| Dark | `bg-gray-950` (`<Section tone="dark">`) | Set your own: `text-white`, `text-gray-300` body, `text-gray-400` secondary. `text-muted-foreground` is near-invisible here. |
| CTA band | `bg-gradient-to-r from-accent to-primary` + 7% noise overlay | `text-white` only, solid (white at reduced opacity fails on the orange end) |

Dark heroes use the glow (`bg-gradient-to-r from-accent/20 to-primary/20 blur-[100px]`) and
optionally the 48px grid texture at `opacity-[0.035]`. On reference pages, alternate light
and dark sections so a long page reads in parts.

---

## 4. Layout and spacing

- Navbar and footer are `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Showroom sections match.
  Reference sections use `max-w-5xl` through `<Section>`.
- Section padding: showroom `py-20`–`py-24`, reference `py-16 sm:py-20 lg:py-24` (`<Section>`).
- Heading block to content: `mt-9`–`mt-10` on reference pages, `mb-14`–`mb-16` on showroom.
- Card grids: `gap-4` to `gap-5`; two-column splits `gap-10` to `gap-16`.
- Fixed navbar is `h-16`. Pages either add `pt-20`/`pt-32` to the first section or render the
  `h-16` spacer (needed when `SectionNav` pins under it).
- A page with `StickyCta` adds `pb-24 lg:pb-0` to its root so the bar does not cover the footer.
- Test at 390, 768, 1024 and 1440. No horizontal scroll at any width.

### Radius

| Element | Radius |
|---|---|
| Buttons, pills, chips, badges | `rounded-full` |
| Cards, panels, figure strips | `rounded-2xl` |
| Hero and product images | `rounded-2xl` / `rounded-3xl` |
| Inputs, inner tiles, icon chips | `rounded-xl` (small chips `rounded-lg`) |

---

## 5. Components

### Buttons

All buttons are pills with a trailing `ArrowRight` (`w-4 h-4`, `aria-hidden`) when they
navigate forward. Minimum height 48px (`min-h-12`); 56px (`h-14`) for hero and CTA-band
buttons. Use `<Button asChild>` around a `<Link>` or `<a>`, not a button inside a link.

| Variant | Classes |
|---|---|
| Primary | `min-h-12 rounded-full px-7 font-bold bg-primary-fill text-white hover:bg-primary-fill/90 border-0 cursor-pointer transition-colors` |
| Secondary on light | `variant="outline"` + `rounded-full font-semibold border-gray-300 text-gray-800 hover:bg-gray-100` |
| Secondary on dark | `variant="outline"` + `rounded-full font-bold text-white border-white/25 bg-white/5 hover:bg-white/10` |
| On gradient, primary | `rounded-full font-bold bg-white text-gray-900 hover:bg-white/90 shadow-lg` |
| On gradient, secondary | `rounded-full font-bold text-white bg-white/15 border border-white/30 hover:bg-white/25` |

One primary button per view. A reference page also needs a CTA in the hero, one after the
money section, and the mobile `StickyCta`, so nobody has to scroll the whole page to act.

### Cards

- Base: `bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm`
- On dark: `rounded-2xl border border-white/10 bg-white/[0.04]`
- **Only clickable cards react to hover** (`hover:shadow-md`, border or background change,
  `cursor-pointer`). A card that lifts and then does nothing is a false affordance.
- Let cards in a row have their own heights (`items-start`) when their contents differ a lot.

### Icon chips

Lucide icons only, never emoji. Decorative icons get `aria-hidden="true"`.

- Feature card: `w-11 h-11`–`w-12 h-12 rounded-xl bg-primary/10`, icon `w-5 h-5`–`w-6 h-6 text-primary`
- Card title: `w-8 h-8 rounded-xl bg-primary/10`, icon `w-4 h-4`
- Compact row: `w-7 h-7 rounded-lg`, icon `w-3.5 h-3.5`
- Secondary tone swaps `primary` for `accent`

### Shared chrome (reference pages)

From `components/marketing/pageChrome.tsx`. Do not rebuild these per page.

- `Section` — id, padding, container, `tone="tinted" | "dark"`, scroll margin for the pinned bars
- `SectionHeading` — eyebrow, h2 and blurb at the scale above, with the right ink per tone
- `SectionNav` — sticky jump links with the current section highlighted (desktop only)
- `SkipLink`, `StickyCta`

Keep the `sections` array that feeds `SectionNav` and the section `id`s in one list, so a
renamed section cannot leave a dead link.

---

## 6. Motion

- **Showroom:** `framer-motion` with `whileInView`, `viewport={{ once: true }}`, `y: 20` or
  `x: ±24`, 0.5 to 0.7s, stagger `i * 0.1`.
- **Reference:** nothing fades in. People scan these pages, jump around and come back.
- **Every hero:** CSS `.hero-rise` (transform only). Never fade the `h1`. It is the LCP
  element, and an opacity start leaves it invisible until hydration.
- Micro-interactions 150 to 300ms, `transition-colors` by default. Animate `transform` and
  `opacity`, never layout properties.
- `prefers-reduced-motion` is handled globally in `index.css`. Do not override it.

---

## 7. Images

- `next/image` always. The largest above-the-fold image gets `priority` and an accurate `sizes`.
- Keep each render's own aspect ratio (`aspect-[2/3]`, `[3/4]`, `[4/5]`). Other ratios crop
  the top or the wheels off the machine.
- The studio render comes from `MACHINE_SPEC.imageSrc`, so one new render updates every page.
  Use the in-gym photos (`machine_gym_bg*.png`) when the point is "what it looks like on a gym
  floor".
- Text over a photo needs a gradient scrim (`bg-gradient-to-t from-gray-950/70`).
- Alt text describes what is in the picture. A diagram's alt carries its labels.

---

## 8. Data and copy

- **Never hardcode a figure.** Rupee amounts, percentages, machine specs and counts come from
  `@shared/partnership`, `@shared/franchise`, `@shared/machine/spec` and `@shared/company`.
- Tabular data is a real `<table>` with `scope="row"` headers. A ratio is drawn (bars), not
  described in a paragraph.
- State a fact in one place on the page. Link to it from elsewhere instead of repeating it.
- Pages with commercial terms keep their disclaimer band visible above the fold.
- **No em dashes in rendered text.** Split into two sentences.
- **Plain English.** No software words on a page asking someone for money.
- Short lists (under about six words per item) are chips. Long ones are checklists.

---

## 9. Accessibility

- Text contrast 4.5:1 (3:1 for 24px+ bold display type and non-text marks).
- Visible focus on every interactive element:
  `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
  (`ring-white` on dark and gradient backgrounds).
- One `h1`, headings in order, real `h3`s on card titles so heading navigation works.
- Touch targets at least 44px.
- Breadcrumb `<nav aria-label="Breadcrumb">` on every page below Home, outside `.hero-rise`.

---

## 10. Known drift

The showroom pages were built before some of these rules. Fix them when you touch them:

- Buttons use `bg-primary text-white` instead of `bg-primary-fill` (fails contrast).
- Small eyebrows and links use `text-primary` on white instead of `text-primary-ink`.
- Raw `bg-white`, `border-gray-100`, `text-gray-900`, `text-gray-400` instead of tokens.
- Specs and Gym Demo use blue and purple icon chips.
- Some non-clickable cards lift on hover (`hover:-translate-y-0.5 ... cursor-default`).

---

## 11. Dashboards

The signed-in portals (franchise dashboard, gym dashboard) follow their own rules. The
reference implementations are [FranchiseDashboard](../client/src/pages/franchise/FranchiseDashboard.tsx),
[GymDashboard](../client/src/pages/gym/GymDashboard.tsx) and the shared cards in
[portalCards.tsx](../client/src/pages/gym/portalCards.tsx).

### Theme

The root carries `dark theme-console`. That switches the brand to magenta and inverts the
fill, so the section 3 roles still hold but resolve to different colours:

| Token | On the dashboard |
|---|---|
| `primary`, `primary-ink`, `ring` | Magenta (338 85% 66%): icons, links, accent borders, focus outlines |
| `primary-fill` + `primary-foreground` | Near-white surface with a dark label: filled buttons, the selected tab |

Do not hardcode orange or magenta. Use the tokens and the theme decides.

### Type scale

| Role | Classes |
|---|---|
| Page h1 | `font-display text-2xl sm:text-3xl font-black uppercase tracking-tight` |
| Card title (h2) | `text-sm font-semibold text-foreground`, or the metric label below |
| Metric label (h2) | `text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground` |
| Metric figure | `font-display font-black leading-none tabular-nums text-[26px]` |
| Body, rows, captions, notes | `text-sm leading-relaxed` |
| Uppercase labels, chips, a meta line under a 14px value | `text-xs` |

- **14px for anything read as a sentence or a value.** That includes table rows, captions,
  references people copy (UTR, agreement reference) and the "Updated" chip.
- **12px only for uppercase labels, chips and a short meta line** (a date under a month name).
  Nothing smaller.
- **No opacity on text colour.** `text-muted-foreground/60` is 3.4:1 on a card. Use
  `text-muted-foreground` (7:1). Opacity is fine on icons.
- Card titles are `h2`, directly under the page `h1`. Do not skip to `h3`.

### Components

- **Card:** `rounded-2xl border border-border bg-card p-5`. Icon chip `h-9 w-9 rounded-xl
  bg-primary/10 text-primary ring-1 ring-inset ring-primary/20`.
- **Metric card:** label top left, `h-8 w-8 rounded-lg` icon chip top right, figure, caption.
  At most one per row gets `accent` (gradient hairline and glow).
- **Rows:** `Row` and `RowGroup` from portalCards, a `<dl>` with label left and value right.
- **Tabs:** `rounded-xl border bg-card p-1` list. Inactive tabs are `text-muted-foreground
  hover:text-foreground`. The selected tab is `bg-primary-fill text-primary-foreground`. A
  grey-on-grey selected state is about 1.1:1 and nobody can see it.
- **Grids of uneven cards** get `items-start`, or pack them into columns by hand. A
  stretched row leaves a hole under the shorter card.
- **Status colours:** emerald (confirmed, signed), amber (waiting, warning), rose (error).
  No other hues.
- **Loading:** skeleton blocks shaped like the cards. Errors render inside the page chrome,
  so Sign out is always reachable.

---

## Checklist for a new page

- [ ] Page type chosen (section 1), and the matching container and motion used
- [ ] Hero h1, section h2s, eyebrows and CTA band at the scale in section 2
- [ ] No readable text under 14px; gradient text only at 24px+
- [ ] Buttons use `primary-fill`; small brand-coloured text uses `primary-ink`
- [ ] Tokens, not raw grays (except inside dark sections)
- [ ] No hues beyond the brand pair and status colours
- [ ] Only clickable things react to hover
- [ ] Hero uses `.hero-rise` and does not fade the h1
- [ ] Figures come from `@shared/*`, none hardcoded
- [ ] No em dashes in rendered copy
- [ ] Focus rings, heading order, alt text, 44px targets
- [ ] Screenshotted at 390, 768, 1024 and 1440 with no horizontal scroll
