---
name: Action Messaging System
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system powers a next-generation social messaging client centered around turning dialogue into collaborative execution. The aesthetic is anchored in an immersive, high-fidelity dark canvas with deep slate-obsidian backdrops, accented by hyper-vivid electric luminescence.

### Design Movement & Mood
- **Hyper-Modern Glass & Luminescence:** Blending deep tonal layering (#090D16 base) with refined frosted glassmorphism (`backdrop-blur-md`), razor-sharp hairline borders (`rgba(255, 255, 255, 0.08)`), and luminous chromatic accents.
- **Dynamic Action Vectors:** Distinctive micro-states and gradient glows representing proprietary interaction primitives:
  - **Magic Actions:** Electric Violet to Deep Indigo gradient aura (`#6366F1` to `#8B5CF6`).
  - **Fuse Actions:** Neon Cyan kinetic flash (`#06B6D4`).
  - **Whisper Actions:** Warm Amber/Topaz glow (`#F59E0B`).
- **Tone & Emotion:** Slick, fluid, hyper-responsive, secure, and effortlessly executive. It strips away noisy clutter while infusing conversation threads with energetic utility.

## Colors

The color palette establishes an uncompromising dark architecture engineered for sustained visual comfort, high readability, and vivid conversational focal points.

### Color Tokens & Roles
- **Base Canvas (`#090D16`):** Deep abyssal slate-black for foundational application canvases and outer framing.
- **Surface Elevation 1 (`#0F172A`):** Primary panel container, conversation stream container, and sidebar structure.
- **Surface Elevation 2 (`#1E293B`):** Elevated cards, inbound message bubbles, detached action sheets, and modal frames.
- **Surface Elevation 3 (`#334155`):** Sub-elements, hover states, input active backdrops, and active toggle rails.
- **Primary Accent — Magic Action (`#6366F1` / `#8B5CF6`):** Outbound user message bubbles, principal call-to-actions, AI synthesis prompts, and primary confirmation states.
- **Secondary Accent — Fuse Action (`#06B6D4`):** Task automation triggers, collaborative split threads, dynamic live polls, and linked external integrations.
- **Tertiary Accent — Whisper Action (`#F59E0B`):** Ephemeral disappearing messages, priority alerts, private side-threads, and contextual pinning.
- **Text & Content Contrast:**
  - `Text Primary`: `#F8FAFC` (98% luminance white-slate for body and headers).
  - `Text Secondary`: `#94A3B8` (Subtitles, metadata, timestamps, unread counts).
  - `Text Muted`: `#64748B` (Placeholders, inactive tab icons, divider rules).

## Typography

The type system pairs **Plus Jakarta Sans** for display, thread headers, modal headings, and user avatars with **Inter** for conversational bubbles, long-form discussions, metadata, and status badges.

### Typographic Hierarchy
- **Header Structure:** Plus Jakarta Sans delivers sculpted geometry with soft humanistic terminal curves, preserving a friendly yet tech-forward character.
- **Message Bubbles & Chat Streams:** Rendered in `body-md` (14px) and `body-lg` (16px) with Inter's neutral x-height to maximize scannability during fast-paced exchanges.
- **Status & Indicators:** Rendered in uppercase `label-sm` with tight tracking (+0.04em) for read receipts, online beacons, action tags, and live participant metrics.

## Layout & Spacing

The layout adapts between a lean single-column conversational viewport on mobile devices and an expansive 3-column operational cockpit on desktop environments.

### Responsive Breakpoints & Viewport Grid
- **Mobile (< 768px):** 1-column dynamic stack. Channel list transforms into an overlay sheet or full-screen navigation; thread occupies full width with `margin: 1rem` and `gutter: 1rem`.
- **Tablet (768px – 1024px):** 2-column split (320px persistent conversation drawer + flexible active chat canvas).
- **Desktop (> 1024px):** 3-column cockpit:
  - Left: Global navigation rail (72px) + conversation/team navigator (300px).
  - Center: Main message stream and conversational action stream (min 560px, fluid width).
  - Right: Contextual Action Dock / Inspector (340px) displaying pinned actions, thread artifacts, shared media, and integration cards.

### Spacing Rhythm
- Sequential chat messages by the same sender use `space-xs` (4px).
- Handoff between different authors uses `space-md` (12px).
- In-message compound blocks (e.g., inline action pill, message attachment, poll card) use `space-sm` (8px).

## Elevation & Depth

Visual hierarchy does not rely on harsh, opaque dropshadows. Instead, depth is articulated through **tonal stratification**, **backlit neon chromatic blurs**, and **hairline translucent glass edges**.

### Surface Elevation Hierarchy
- **Level 0 (Canvas Base):** Solid `#090D16`. Background noise texture optional at 2% opacity.
- **Level 1 (Panels & Sidebar Streams):** `#0F172A` with a right border of `1px solid rgba(255, 255, 255, 0.06)`.
- **Level 2 (Inbound Messages & Interactive Feed Cards):** `#1E293B` background with a subtle border of `1px solid rgba(255, 255, 255, 0.08)`. Shadow: `0 4px 16px -2px rgba(0, 0, 0, 0.4)`.
- **Level 3 (Modals, Overlays, Floating Action Composers):** High-density glass with background `rgba(15, 23, 42, 0.82)`, `backdrop-filter: blur(16px)`, border `1px solid rgba(255, 255, 255, 0.12)`, and outer ambient glow: `0 12px 32px -4px rgba(0, 0, 0, 0.7)`.

### Chromatic Glow Accents
- **Magic Action State:** Diffuse aura with `box-shadow: 0 0 24px -4px rgba(99, 102, 241, 0.35)`.
- **Fuse Action State:** Diffuse aura with `box-shadow: 0 0 20px -4px rgba(6, 182, 212, 0.32)`.
- **Whisper Mode:** Diffuse aura with `box-shadow: 0 0 20px -4px rgba(245, 158, 11, 0.28)`.

## Shapes

The geometric architecture balances organic friendliness with high-performance ergonomics. 

### Corner Radius System
- **Structural Shells & Modals:** Standard `rounded-2xl` (16px) to `rounded-3xl` (24px) providing soft contouring against high-contrast backgrounds.
- **Message Bubbles:**
  - Sent Message (Outbound): `rounded-2xl` (16px) with the bottom-right anchor corner sharply clipped to `rounded-sm` (4px).
  - Received Message (Inbound): `rounded-2xl` (16px) with the bottom-left anchor corner clipped to `rounded-sm` (4px).
- **Interactive Action Badges & Input Bars:** Complete pill shape (`rounded-full` / 9999px) for search bars, action pills, live statuses, and the multi-modal command input bar.

## Components

### 1. Message Bubbles
- **Outbound (Sender):** Fluid linear gradient from `#6366F1` to `#7C3AED` (135 deg). White text (`#FFFFFF`), micro-timestamp in `rgba(255, 255, 255, 0.7)`. Double-check read receipts rendered in `#06B6D4`.
- **Inbound (Recipient):** Deep charcoal slate `#1E293B` with border `1px solid rgba(255, 255, 255, 0.07)`. Text `#F8FAFC`, timestamp `#94A3B8`.
- **Action Embedded Message:** Message bubbles containing actionable tasks render an attached interactive sub-deck with a top separator of `1px solid rgba(255, 255, 255, 0.1)`.

### 2. Multi-Action Composer & Input Bar
- Floating rounded-full enclosure (`backdrop-blur-xl`, `bg-[#0F172A]/90`, border `1px solid rgba(255, 255, 255, 0.12)`).
- Left accessory slot: Action selector trigger (`+` icon) revealing quick-action toggles (*Magic AI*, *Fuse Task*, *Whisper Note*).
- Center: Auto-expanding text input with placeholder in `#64748B`.
- Right: Dynamic action trigger button; transitions from a mic icon to an illuminated gradient send capsule upon keystroke input.

### 3. Action Chips & Status Badges
- Pill-shaped (`rounded-full`), padding `0.25rem 0.75rem`.
- **Magic Action:** Subtle indigo background `rgba(99, 102, 241, 0.15)`, text `#818CF8`, border `1px solid rgba(99, 102, 241, 0.3)`.
- **Fuse Action:** Cyan tint `rgba(6, 182, 212, 0.15)`, text `#22D3EE`, border `1px solid rgba(6, 182, 212, 0.3)`.
- **Whisper Action:** Amber tint `rgba(245, 158, 11, 0.15)`, text `#FBBF24`, border `1px solid rgba(245, 158, 11, 0.3)`.

### 4. Interactive Action Cards (Inline Tasks & Polls)
- Border radius: `16px` (`rounded-2xl`).
- Background: Surface tier 2 (`#1E293B`) with a left edge 3px accent stroke matching the action type (Indigo, Cyan, or Amber).
- Contains primary action button, inline progress indicators, and collaborator avatars.

### 5. Buttons
- **Primary Action Button:** Gradient fill (`#6366F1` to `#8B5CF6`), `rounded-xl`, padding `0.625rem 1.25rem`, bold label. Hover: brightness(1.1) with soft ambient drop-shadow.
- **Secondary Button:** Surface `#1E293B`, border `1px solid rgba(255, 255, 255, 0.1)`, hover: background `#334155`.
- **Ghost Action Button:** Transparent background, text `#94A3B8`, hover: `#F8FAFC` and background `rgba(255, 255, 255, 0.05)`.