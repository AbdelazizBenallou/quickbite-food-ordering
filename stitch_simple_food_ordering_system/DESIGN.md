---
name: Warm Tabletop
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#5b403f'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#8f6f6e'
  outline-variant: '#e4bebc'
  surface-tint: '#bb162c'
  primary: '#b7122a'
  on-primary: '#ffffff'
  primary-container: '#db313f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb3b1'
  secondary: '#a83900'
  on-secondary: '#ffffff'
  secondary-container: '#fc6018'
  on-secondary-container: '#531800'
  tertiary: '#0051d5'
  on-tertiary: '#ffffff'
  tertiary-container: '#316bf3'
  on-tertiary-container: '#fefcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad8'
  primary-fixed-dim: '#ffb3b1'
  on-primary-fixed: '#410007'
  on-primary-fixed-variant: '#92001c'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#802a00'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system crafts an inviting, modern, and friction-free ordering experience centered on culinary warmth and operational clarity. Designed primarily for mobile-first food ordering, takeout, and real-time status tracking, it balances approachable hospitality with utilitarian speed. 

The aesthetic blends **warm minimalism** with subtle tactile feedback. Interfaces avoid clutter, unnecessary decorative ornamentation, or clinical chilliness. Instead, crisp white surfaces, soft cream undertones, and confident vermilion-amber highlights evoke appetizing aromas, fresh ingredients, and immediate reliability.

### Core Principles
- **Culinary Warmth:** Highlighting hearty appetites through warm, appetizing vermilion-reds and sun-warmed ambers rather than stark corporate primaries.
- **Frictionless Utility:** Ordering food is time-sensitive. Visual cues, calls-to-action (CTAs), modifiers, and status states must be instantly legible in varied lighting environments (e.g., walking down the street, low indoor lighting).
- **Crisp Structural Discipline:** Generous breathing room, neat hairline dividers, and softly radiused surfaces create order across complex menu hierarchies and checkout funnels.

## Colors

The palette leverages an appetizing high-energy primary red balanced by a savory amber-orange, supported by crisp, cool slate neutrals that ensure unmatched typographic readability.

### Brand & Interactive Colors
- **Primary (`#E23744`):** The signature vermilion red. Used strictly for high-priority conversion points: primary action buttons, checkout highlights, selected tabs, and price emphases.
- **Secondary (`#E65100`):** Rich amber-orange. Serves as culinary accent, attention banners, promotion highlights, and dynamic countdowns.
- **Tertiary (`#2563EB`):** Crisp information blue. Reserved for informational alerts, incoming order states, and utility navigation.

### Neutral System
- **Canvas / Background (`#F9FAFB`):** Soft, neutral off-white canvas that eliminates glare while maintaining a fresh, pristine presentation.
- **Surface / Card Background (`#FFFFFF`):** Pure white used for elevated cards, modal sheets, and inputs to create natural content separation.
- **Surface Border (`#E2E8F0`):** Hairline boundary tone for subtle separation without heavy visual weight.
- **Text Primary (`#0F172A`):** Deep slate for all headings, titles, and price totals; avoids harsh pitch-black while achieving peak contrast.
- **Text Secondary (`#475569`):** Balanced mid-slate for item descriptions, metadata, and supporting labels.
- **Text Subtle (`#94A3B8`):** Light slate for placeholder values, disabled actions, and subtle timestamps.

### Semantic Status Palette
Status badges rely on soft pastel tint containers (10-15% opacity) paired with high-contrast text:
- **New / Pending:** Deep Sky Blue text (`#1D4ED8`) over pale blue fill (`#EFF6FF`).
- **Accepted / In Kitchen:** Indigo/Purple text (`#5B21B6`) over pale lavender fill (`#F5F3FF`).
- **Sent for Delivery / Out on Road:** Rich Tangerine text (`#C2410C`) over soft amber fill (`#FFF7ED`).
- **Completed / Delivered:** Deep Sage text (`#15803D`) over soft mint fill (`#F0FDF4`).
- **Canceled / Issue:** Deep Crimson text (`#B91C1C`) over soft rose fill (`#FEF2F2`).

## Typography

The design system standardizes on **Plus Jakarta Sans** across all roles. Its geometric proportions, open apertures, and subtle contemporary warmth deliver instant readability on mobile displays even under bright outdoor light or quick scanning conditions.

### Usage Standards
- **Headlines:** Use `headline-xl` exclusively for landing showcases and celebratory post-checkout screens. Menu sections and restaurant headings utilize `headline-lg` and `headline-md` with strict negative tracking (`-0.01em` to `-0.02em`) to keep titles compact.
- **Numerical & Price Treatments:** Prices use `price-display` with tabular numbers enabled via CSS (`font-variant-numeric: tabular-nums`). Currency marks (`$`, `€`, `£`) match the weight of the amount but sit at 85% relative font size to emphasize magnitude clearly.
- **Labels & Micro-copy:** Badges, dish modifier tags, and button texts use `label-md` or `label-sm` with slightly raised letter spacing to enhance clarity on compact screens.

## Layout & Spacing

A strict 4px base rhythm underpins all layout parameters, prioritizing mobile ergonomics: thumb zones, clean tapping margins, and cohesive stacking.

### Grid & Breakpoints
- **Mobile (<640px):** Single-column layout. Margin set to `1rem` (`16px`), gutter `0.75rem` (`12px`). Sticky bottom floating checkout anchors maximize one-handed ordering convenience.
- **Tablet (640px - 1023px):** 6-column fluid structure. Margin set to `1.5rem` (`24px`). Enables split-screen layouts: scrollable menu list on the left, sticky cart summary drawer on the right.
- **Desktop (≥1024px):** 12-column fixed-max layout capped at `1200px` centered canvas. Margin expands to `2rem` (`32px`), gutter to `1rem` (`16px`). Layout divides into restaurant header, category navigation sidebar, multi-column dish cards, and order receipt ledger.

### Ergonomics & Spacing Rules
- Interactive targets must measure at least `44px` in touch height.
- Menu items stack with `space-md` gaps on mobile, transitioning to a 2-column or 3-column card grid with `space-lg` gutters on tablet and desktop.

## Elevation & Depth

Visual hierarchy emphasizes clean, tactile clarity over heavy skeuomorphism or artificial 3D shadows. Depth is achieved primarily through pure white surfaces raised slightly above the `#F9FAFB` base, complemented by delicate borders and warm, diffused ambient shadows.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#F9FAFB` neutral foundation. Used for page body background and non-interactive container backdrops.
- **Level 1 (Card & ListItem):** `#FFFFFF` background with a crisp border (`1px solid #E2E8F0`) and an ultra-subtle ambient drop shadow: `0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Hover & Active Cart Sheet):** `#FFFFFF` with warm-tinted shadow: `0 8px 16px -2px rgba(226, 55, 68, 0.06), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`. Highlights focused menu items, quantity selectors, or active modal sheets.
- **Level 3 (Sticky Nav & Floating Checkout Drawer):** `#FFFFFF` paired with an upward ambient barrier: `0 -4px 18px rgba(15, 23, 42, 0.06)`. Keeps primary CTAs visually distinct without obscuring menu content beneath.

## Shapes

The design system incorporates roundedness tier `2` (`0.5rem` / `8px` default radius). This offers a soft, human, and appetizing feel while maintaining crisp structural integrity for scannable data layouts.

### Radius Distribution
- **Cards, Modals & Item Containers (`rounded-lg` / `1rem`):** All dish cards, restaurant profile headers, and modal overlays use `16px` curvature for a comforting, modern physical feel.
- **Buttons & Form Fields (`rounded` / `0.5rem`):** Buttons, search fields, text boxes, and counter steppers use `8px` corners to retain precise rectangular affordance.
- **Badges, Pills & Floating Action Indicators (`full` / `9999px`):** Order state badges, category filter chips, and pill counter tags adopt full circular ends to clearly differentiate tags and triggers from structural containers.
- **Media Containers:** Product imagery features clipped corners matching their parent card container (`16px` at the outer perimeter, zeroed on seamless joint edges).

## Components

### Buttons
- **Primary CTA:** High-contrast vermilion `#E23744` with pure white text, bold weight (`600`), and a minimum height of `48px` on mobile. Active states scale down to `0.98` with a subtle deep red overlay (`#C72C38`).
- **Secondary Action:** Outlined with `1.5px solid #E2E8F0`, transparent fill, slate `#0F172A` text. Hover shifts background to `#F8FAFC`.
- **Modifier / Quick Add (+):** Circular or pill-shaped counter with crisp hairline borders. Transforms into a stepper (`- 1 +`) filled with soft primary tint (`#FEF2F2`) and primary red text once selected.

### Status Badges
Minimalist, high-readability status indicators with no heavy dropshadows:
- **Structure:** Pill shape (`rounded-full`), padded `0.25rem 0.625rem` (`4px 10px`).
- **New / Received:** Deep Blue text (`#1D4ED8`) on soft blue (`#EFF6FF`). Includes a 6px solid dot indicator.
- **Accepted / In Kitchen:** Royal Purple text (`#5B21B6`) on soft lilac (`#F5F3FF`).
- **Sent for Delivery:** Warm Orange text (`#C2410C`) on gentle amber (`#FFF7ED`).
- **Completed:** Emerald Green text (`#15803D`) on pale mint (`#F0FDF4`).

### Cards & Menu Items
- **Horizontal Dish Row (Mobile):** Image thumbnail (`84px × 84px`, rounded `8px`) positioned on the trailing side; title, brief description (clamped to 2 lines in `#475569`), price, and "+ Add" button aligned on the leading side.
- **Vertical Feature Card (Desktop/Tablet):** Top-anchored food photography (16:9 ratio), with item name, diet icons (vegan, gluten-free tags), price, and customisation trigger stacked below.

### Inputs & Quantity Selectors
- **Input Fields:** Pure white background, `1px solid #CBD5E1` border, `12px 16px` internal padding, `14px` font size. Focused state features a crisp ring: `2px solid #E23744` with `0` offset.
- **Quantity Stepper:** Compact grouped control with three equal segments (`-`, count, `+`). Smooth tactile click response; disables decrement button at minimum quantity.

### Chips & Filter Pills
- **Category Filter Bar:** Horizontal scrollable rail with no visible scrollbar. Inactive chips use neutral surface `#FFFFFF` with `#E2E8F0` border and slate text. Active chips use `#0F172A` dark slate with white text or warm `#E23744` red with white text for active deal categories.