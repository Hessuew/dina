# CLAUDE.md

## Purpose

This file is the canonical design and UI guidance for AI-assisted changes in this repository.
It reflects the **actual implementation** as audited across all landing page components (Apr 2026).

Unless the user explicitly requests otherwise, all new pages, sections, components, and visual refactors must follow this document.
When a design direction changes materially, update this file alongside the implementation.

---

## Brand Positioning

- **Product**: DINA — Disciplers of Nations Academy
- **Category**: Elite discipleship formation school for global Christian leaders
- **Brand feeling**: timeless, authoritative, serene, intelligent, premium, institutional
- **Creative direction**: architectural minimalist, high-end editorial, quiet luxury

---

## Core Visual Principles

- **Prefer restraint over decoration** — fewer elements, stronger spacing, more confidence
- **Design for a premium institutional feel** — editorial composition, monumental typography, tactile materials
- **Use contrast with discipline** — light marble surfaces alternate with deep graphite panels; gold is a refined highlight only
- **Make everything feel intentional** — thin borders, clean alignment, controlled shadows, no random colors

---

## Color Palette

These are the exact values used across all current components. Use them, do not invent alternatives.

### Light Surface Colors (used on marble/stone sections)

| Token               | Hex       | Usage                                                |
| ------------------- | --------- | ---------------------------------------------------- |
| Imperial stone      | `#F8F4EC` | Primary light surface; warm off-white                |
| Hero warm parchment | `#F7F4EE` | Softer warm white for section text on dark           |
| Body text dark      | `#1C1815` | Primary text on light sections (hero, teachers, Q&A) |
| Body text medium    | `#4E463D` | Secondary/paragraph text on light surfaces           |
| Body text warm      | `#4B443A` | Long-form body copy on hero marble                   |
| Subtext stone       | `#5E5549` | Tagline/subtitle on hero                             |

### Dark Surface Colors (used on graphite/dark sections)

| Token                  | Hex                   | Usage                                          |
| ---------------------- | --------------------- | ---------------------------------------------- |
| Dark surface primary   | `#121212` / `#1A1A1A` | Section backgrounds, graphite panels           |
| Dark surface secondary | `#151515`             | Lower panel background (course/teacher detail) |
| Dark surface rich      | `#171717`             | Outer panel wrapper                            |
| Dark espresso          | `#1A1716`             | Dark warm black; nav buttons, active tabs      |
| Dark espresso deep     | `#1C1C1D`             | Next-course button fill                        |
| Pure black overlay     | `rgba(0,0,0,0.24)`    | Thumbnail info box background                  |

### Text on Dark Surfaces

| Token         | Hex       | Usage                                   |
| ------------- | --------- | --------------------------------------- |
| White primary | `#FFFFFF` | Headings on dark image areas            |
| Warm white    | `#F8F4EC` | Section headings, course titles on dark |
| Warm cream    | `#F7F4EE` | General text on dark sections           |
| Cream body    | `#D6CCBE` | Course description body text            |
| Warm body     | `#D3CAC0` | About section body text on dark         |
| Soft body     | `#CFC6B7` | Courses section paragraph text          |
| Pale body     | `#D8D0C7` | Testimonial card secondary text         |
| Muted light   | `#C9C0B6` | Timeline description text               |
| Stone muted   | `#AFA28F` | Subdued supporting text                 |

### Gold Accent Scale

| Token               | Hex / Opacity | Usage                                                 |
| ------------------- | ------------- | ----------------------------------------------------- |
| Gold primary        | `#C5A059`     | Decorative lines, borders, divider accents            |
| Gold warm           | `#D4B373`     | Eyebrow labels on dark; number badges                 |
| Gold deep           | `#9B7A41`     | Eyebrow labels on light sections                      |
| Gold amber          | `#6e562d`     | Subdued label on teachers section                     |
| Gold text warm      | `#E9D9B4`     | Serif stat values, CTA button text, number indicators |
| Gold text muted     | `#9B8A73`     | Muted stat labels, supporting captions                |
| Gold text stone     | `#8E816D`     | Lower-tier labels on dark panels                      |
| Gold text warm dark | `#8A7B68`     | Inactive state labels on dark selectors               |

### Border Values

| Usage                        | Value                                     |
| ---------------------------- | ----------------------------------------- |
| Gold border emphasis         | `border-[#C5A059]/35` to `/55`            |
| Gold border subtle           | `border-[#C5A059]/14` (section separator) |
| Gold border hover active     | `border-[#D6B16E]`                        |
| Gold left accent bar         | `border-l-2 border-[#C5A059]/40`          |
| Dark border (light sections) | `border-[#1A1A1A]/10`                     |
| White border (dark panels)   | `border-white/10`, `border-white/12`      |
| Dark panel border            | `border-white/8` (separator rows)         |

---

## Typography

### Fonts in Use

- **`font-serif`** — Tailwind's default serif stack (Georgia/Times). Used for all premium display, headings, stat values, CTA labels, and quote text.
- **`font-sans`** — Geist Variable. Used for body copy, labels, eyebrows, navigation, microcopy.

### Scale Reference (from actual components)

| Context                 | Class                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Hero H1                 | `font-serif text-[clamp(3.9rem,7vw,6.7rem)] leading-[0.88] tracking-[-0.06em]`  |
| Footer hero H2          | `font-serif text-[clamp(3.5rem,8vw,8rem)] leading-[0.88] tracking-[-0.06em]`    |
| Section H2              | `font-serif text-[clamp(3rem,5vw,5.1rem)] leading-[0.92] tracking-[-0.055em]`   |
| Right panel H3 (image)  | `font-serif text-[clamp(2.4rem,4vw,4rem)] leading-[0.94] tracking-[-0.045em]`   |
| Testimonial quote       | `font-serif text-[1.32rem] sm:text-[1.55rem] leading-[1.6]`                     |
| Hero tagline            | `font-serif text-[1.35rem] sm:text-[1.6rem] leading-8`                          |
| Stat value large        | `font-serif text-2xl`                                                           |
| Stat value medium       | `font-serif text-xl`                                                            |
| Lecturer name           | `font-serif text-[1.45rem] leading-tight`                                       |
| Panel course title grid | `font-serif text-xl`                                                            |
| Timeline event label    | `font-serif text-lg`                                                            |
| Q&A question            | `font-serif text-[clamp(1.3rem,2.5vw,1.6rem)] leading-[1.3] tracking-[-0.02em]` |

### Eyebrow Labels (consistent sitewide)

```
text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase   ← light sections
text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase   ← dark sections (same)
text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase   ← stat labels on dark
text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase   ← highlighted labels (gold)
text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase   ← muted panel labels
text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase  ← small info box labels
text-[0.65rem] font-medium tracking-[0.28em] text-[#8E816D] uppercase  ← course number badge
```

### Body Copy

```
text-base leading-8 font-light tracking-[0.04em]   ← standard body on all sections
text-base leading-8 text-[#D6CCBE]                ← dark section body (courses/marks)
text-base leading-8 text-[#D3CAC0]                ← about section body on dark
text-base leading-8 text-[#4E463D]                ← light section body (teachers, Q&A)
text-sm leading-7 text-[#D8D0C7]                  ← small body / lecturer bio on dark
text-sm leading-6 text-[#C9C0B6]                  ← smallest supporting text on dark
```

### Eyebrow Decoration Pattern (sitewide standard)

Every section header uses this exact two-line gold divider pattern:

```tsx
<div className="inline-flex flex-col gap-2 text-[0.72rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
  <div className="h-px w-20 bg-[#C5A059]/50 lg:w-28" />
  <div className="flex flex-row items-center gap-3">
    <span className="h-px w-10 bg-[#C5A059]/55" />
    Section Name
  </div>
</div>
```

Centered variant (Q&A, testimonials):

```tsx
<div className="inline-flex flex-col items-center gap-3 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
  <div className="h-px w-16 bg-[#C5A059]/50" />
  Section Name
</div>
```

---

## Section Backgrounds

Each section alternates between light marble and dark graphite. This rhythm is intentional.

| Section          | Background         | Texture Asset | Overlay                                           |
| ---------------- | ------------------ | ------------- | ------------------------------------------------- |
| **Hero**         | Light marble       | `bg.jpg`      | `rgba(255,255,255,0.82) → rgba(248,244,236,0.9)`  |
| **About**        | Dark blue-graphite | `bg3_v1.png`  | `rgba(10,14,20,0.9) → rgba(12,16,22,0.95)`        |
| **Courses**      | Dark graphite      | `bg2_v1.png`  | `rgba(10,10,11,0.9) → rgba(16,16,17,0.95)`        |
| **Teachers**     | Light white        | `bg1d.png`    | `rgba(255,255,255,0.9)` flat                      |
| **Testimonials** | Dark near-black    | `bg4_v1.png`  | `rgba(14,13,17,0.922) → rgba(10,10,12,0.97)`      |
| **Marks**        | Dark graphite      | `bg6_v1.png`  | `rgba(10,10,11,0.9) → rgba(16,16,17,0.95)`        |
| **Q&A**          | Light marble       | `bg.jpg`      | `rgba(247,244,238,0.96) → rgba(247,244,238,0.98)` |
| **Footer**       | Dark warm          | `bg7_v1.png`  | `rgba(8,6,5,0.65) → rgba(10,8,7,0.75)`            |

**Radial gold glow** — applied inside dark sections:

```css
bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]
```

**Decorative hairline** — bottom corner accent in most sections:

```tsx
<div className="absolute right-[8%] bottom-24 h-px w-16 bg-white/12 lg:w-24" />  // dark
<div className="absolute right-[8%] bottom-24 h-px w-16 bg-[#1A1A1A]/12 lg:w-24" />  // light
```

---

## Layout System

### Page Container (sitewide standard)

```tsx
<div className="relative mx-auto max-w-[calc(100%-2rem)] px-5 py-18
  sm:max-w-[calc(100%-4rem)] sm:px-8 sm:py-22
  lg:max-w-[calc(100%-8rem)] lg:px-12 lg:py-24">
```

Section vertical padding varies slightly per section but uses this scale:

- `py-18 / sm:py-22 / lg:py-24` — standard
- `py-20 / sm:py-24 / lg:py-12` — footer
- `py-18 / sm:py-22 / lg:py-28` — testimonials (extra tall)

### Two-Column Split Layout (standard for all showcase sections)

```tsx
<div className="grid items-start gap-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)] lg:gap-20">
```

Left column always contains: eyebrow + H2 + body + navigation controls + item selector grid.
Right column always contains: the "feature panel" — an image-backed card + detail panel below.

Column ratios vary slightly per section:

- About, Marks: `0.88fr / 1.12fr`
- Courses: `0.85fr / 1.15fr`
- Teachers: `0.82fr / 1.18fr`

---

## Component Patterns

### Right-Panel Feature Card (courses, teachers, about, marks)

A consistent two-part pattern: image header area + detail area below.

```tsx
<div className="relative border border-white/10 bg-[#171717]/72 p-4 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
  {/* Image area */}
  <div className="relative overflow-hidden border border-white/10"
    style={{ backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${bg})`, ... }}>
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_38%,rgba(197,160,89,0.14)_100%)]" />
    <div className="relative flex min-h-84 flex-col justify-between p-6 sm:p-8 lg:min-h-100">
      {/* Title area top, info chip bottom */}
    </div>
  </div>

  {/* Detail area */}
  <div className="border-x border-b border-white/10 bg-[#151515]/88 px-6 py-7 sm:px-8 sm:py-8">
    {/* Content */}
  </div>
</div>
```

**Info chip** (bottom-left of image area):

```tsx
<div className="max-w-60 border border-white/12 bg-black/24 px-4 py-4 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
  <div className="text-[0.62rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
    Label
  </div>
  <div className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
    Value
  </div>
</div>
```

**Number badge** (top-right of image area):

```tsx
<div className="border border-white/12 bg-black/18 px-4 py-3 text-[0.9rem] font-medium tracking-[0.26em] text-[#E9D9B4] uppercase">
  01
</div>
```

### Selector Grid (courses, teachers, marks — left panel)

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  <button
    className={`group flex items-center justify-between gap-4 border px-4 py-4 text-left transition-all ${
      isActive
        ? 'border-[#C5A059]/42 bg-white/8 shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]'
        : 'border-white/10 bg-white/3 hover:border-white/18 hover:bg-white/5'
    }`}
  >
    <div>
      <div className="text-[0.65rem] font-medium tracking-[0.28em] text-[#8E816D] uppercase">
        01
      </div>
      <div className="mt-2 font-serif text-xl text-[#F8F4EC]">Title</div>
    </div>
    <ArrowRight className="h-4 w-4 text-[#8E816D] transition-transform group-hover:translate-x-0.5" />
  </button>
</div>
```

### Navigation Controls (prev/next buttons)

Always a pair: secondary (left) + primary (right):

```tsx
{
  /* Secondary — light/ghost */
}
;<button className="inline-flex h-12 w-12 items-center justify-center border border-white/12 bg-white/6 text-[#F8F4EC] transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/50 hover:bg-white/10">
  <ChevronLeft className="h-4 w-4" />
</button>

{
  /* Primary — dark gold */
}
;<button className="inline-flex h-12 w-12 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white">
  <ChevronRight className="h-4 w-4" />
</button>
```

Light-section variant (teachers): secondary button uses `bg-[#FCFBF8]/74 backdrop-blur-sm border-[#1A1A1A]/10`.

### Active State Bar (above nav controls)

```tsx
<div className="flex items-center justify-between gap-6 border-y border-white/10 py-5">
  <div>
    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
      Active course
    </div>
    <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">01. Ground</div>
  </div>
  {/* nav buttons */}
</div>
```

### CTA Buttons

**Primary CTA** (footer Apply Now, enrollment):

```tsx
<Link className="group inline-flex h-14 items-center justify-center gap-3 border border-[#C5A059]/55 bg-linear-to-b from-[#2A2A2A] to-[#111111] px-8 font-serif text-base tracking-[0.12em] text-[#E9D9B4] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)] transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white">
  Apply Now
  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
</Link>
```

**Secondary / header CTA** (Sign In):

```tsx
<Link className="inline-flex h-10 items-center justify-center border border-[#1A1A1A]/10 px-4 text-[0.7rem] font-medium tracking-[0.24em] text-[#1A1A1A] uppercase shadow-[0_16px_28px_-24px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/45">
  Sign In
</Link>
```

### Stat Block (about section)

```tsx
<div>
  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B8A73] uppercase">
    Label
  </div>
  <div className="mt-2 font-serif text-2xl text-[#F8F4EC]">Value</div>
</div>
```

Gold-highlighted stat (Tuition, Awards):

```tsx
<div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">Label</div>
<div className="mt-2 font-serif text-2xl text-[#E9D9B4]">Free</div>
```

### Highlight Box (excellence award pattern)

```tsx
<div className="border border-[#C5A059]/30 bg-[#1A1716]/60 px-5 py-4">
  <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
    Label
  </div>
  <p className="mt-2 font-serif text-xl text-[#E9D9B4]">Content</p>
</div>
```

### Left Gold Bar Quote (about section)

```tsx
<div className="border-l-2 border-[#C5A059]/40 pl-5">
  <p className="text-base leading-6 text-[#D8D0C7]">Text</p>
</div>
```

### Timeline Row (about section)

```tsx
<div className="flex items-start gap-5 border-b border-white/8 pb-5 last:border-b-0 last:pb-0">
  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-sm text-[#E9D9B4]">
    1
  </div>
  <div className="flex-1">
    <div className="text-[0.68rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
      Month
    </div>
    <div className="mt-1 font-serif text-lg text-[#F8F4EC]">Event Label</div>
    <p className="mt-2 text-sm leading-7 text-[#C9C0B6]">Description</p>
  </div>
</div>
```

### Q&A Row Pattern

```tsx
<div className="grid items-start gap-6 border-b border-[#C5A059]/20 pb-8 last:border-b-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] lg:gap-8">
  {/* Question */}
  <div className="space-y-3">
    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
      Question N
    </div>
    <h3 className="font-serif text-[clamp(1.3rem,2.5vw,1.6rem)] leading-[1.3] tracking-[-0.02em] text-[#1A1A1A]">
      ...
    </h3>
  </div>
  {/* Arrow divider */}
  <div className="hidden items-center justify-center lg:flex">
    <ArrowRight className="h-5 w-5 text-[#C5A059]" />
  </div>
  {/* Answer */}
  <div className="space-y-3">
    <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
      Answer
    </div>
    <p className="text-base leading-8 text-[#4E463D]">...</p>
  </div>
</div>
```

### Library Media Card

Landscape `aspect-3/2 w-80` card in horizontal-scroll shelves. Full-bleed thumbnail background, sharp corners only.

```tsx
<Link className="group relative flex aspect-3/2 w-80 shrink-0 overflow-hidden border border-[#C5A059]/40 bg-[#0F0C07] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C5A059]/70 hover:shadow-[0_0_40px_rgba(197,160,89,0.12)]">
  {/* Gradient: darken top + bottom, clear middle */}
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_35%,transparent_55%,rgba(5,4,2,0.88)_100%)]" />
  {/* Inset decorative gold hairline */}
  <div className="pointer-events-none absolute inset-[7px] z-10 border border-[#C5A059]/25 transition-colors duration-300 group-hover:border-[#C5A059]/45" />
  {/* Video: centered play affordance (sharp, no border-radius) */}
  <div className="flex size-12 items-center justify-center border border-[#C5A059]/45 bg-black/35 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-[#D6B16E]">
    <PlayIcon className="size-5 fill-[#E9D9B4] text-[#E9D9B4]" />
  </div>
  {/* Doc: corner mark (sharp chip, top-left) */}
  <div className="absolute top-3 left-3 z-20 border border-[#C5A059]/40 bg-black/50 p-1.5 backdrop-blur-sm">
    <FileIcon className="size-4 text-[#D4B373]" />
  </div>
  {/* Bottom: gold hairline + serif title + gold category badge */}
  <div className="h-px w-7 bg-[#C5A05988]" />
  <span className="inline-flex items-center gap-1.5 border border-[#C5A059]/40 bg-black/50 px-2 py-0.5 text-[0.65rem] font-medium tracking-widest text-[#D4B373] uppercase">
    <Icon className="size-3" />{category}
  </span>
</Link>
```

- All category badges use **gold** accent only (`border-[#C5A059]/40`, `text-[#D4B373]`); icon varies per category.
- Thumbnail scale: `duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105`.
- Course chip border: `border-[#C5A059]/30`. Draft badge: `border-[#9B7A41]/30`.

### Testimonial Card

```tsx
<div className="absolute top-0 left-1/2 flex h-full w-76 flex-col justify-between overflow-hidden border px-6 py-7 text-left shadow-[0_34px_72px_-44px_rgba(0,0,0,0.72)] backdrop-blur-sm transition-... duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-92 lg:w-116 xl:w-124 {isFocused ? 'border-[#C5A059]/50 bg-[#0F0D0C]/92' : 'border-[#C5A059]/20 bg-black/60'}">
```

Testimonial quote typography: `font-serif text-[1.32rem] sm:text-[1.55rem] leading-[1.6] text-white`

Testimonial progress indicators: `h-1.5 w-10 bg-white` (active) / `h-1.5 w-5 bg-white/18` (inactive)

### Animation (marks section)

Sequential fade-in slide right used on marks panel content:

```tsx
className="animate-[fadeInSlideRight_0.7s_ease-out_forwards] opacity-0"
style={{ animationDelay: '0.1s' }}  // 0.1s, 0.3s, 0.5s for sequential items
```

This animation must be defined in the Tailwind config / global CSS.

---

## Shape Language

- **Zero rounding everywhere** on premium marketing surfaces — sharp 90-degree corners only
- Navigation buttons: `h-12 w-12` square
- Timeline number badges: `h-10 w-10` square
- Teacher image placeholder: `h-20 w-20` square
- CTA buttons: `h-14` full rectangle, no radius

---

## Shadow Reference

| Context                | Shadow                                         |
| ---------------------- | ---------------------------------------------- |
| Feature panel outer    | `shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]` |
| Info chip inside image | `shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)]`  |
| Card in active state   | `shadow-[0_24px_44px_-34px_rgba(0,0,0,0.6)]`   |
| CTA primary button     | `shadow-[0_28px_60px_-28px_rgba(0,0,0,0.7)]`   |
| Testimonial card       | `shadow-[0_34px_72px_-44px_rgba(0,0,0,0.72)]`  |
| Lecturer bio card      | `shadow-[0_22px_36px_-30px_rgba(0,0,0,0.4)]`   |

---

## Asset Registry

| Asset                   | Path                                      | Used In      |
| ----------------------- | ----------------------------------------- | ------------ |
| Hero marble / Q&A       | `src/assets/images/bg.jpg`                | hero, qa     |
| About background        | `src/assets/images/bg3_v1.png`            | about        |
| Courses background      | `src/assets/images/bg2_v1.png`            | courses      |
| Teachers background     | `src/assets/images/bg1d.png`              | teachers     |
| Testimonials background | `src/assets/images/bg4_v1.png`            | testimonials |
| Marks background        | `src/assets/images/bg6_v1.png`            | marks        |
| Footer background       | `src/assets/images/bg7_v1.png`            | footer       |
| DINA emblem             | `src/assets/images/DINA_v3-Photoroom.png` | hero         |

---

## Landing Page Section Order

```
1. Hero          — light marble, emblem visual, serif headline
2. About         — dark blue-graphite, program overview + formation timeline
3. Courses       — dark graphite, 6-course carousel
4. Teachers      — light white, 6 lecturer pairs carousel
5. Testimonials  — dark near-black, carousel cards
6. Marks         — dark graphite, apostolic confirmations with fadeIn animation
7. Q&A           — light marble, question/answer rows
8. Footer        — dark warm, full-screen title + Apply Now CTA
```

---

## Motion and Interaction

- **Hover lift**: `hover:-translate-y-0.5` — used on all buttons
- **Arrow slide**: `group-hover:translate-x-0.5` — used on ArrowRight icons in nav
- **Testimonial card transition**: `duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]`
- **Navigation buttons**: `duration-500 ease-out` (testimonials)
- **General transitions**: `transition-all` (default)
- **Marks animation**: `fadeInSlideRight 0.7s ease-out forwards` with sequential delays
- No springy, bouncy, or flashy motion

---

## Copy Tone

- **Voice**: elevated, intelligent, calm, authoritative, mission-led
- **Scripture references**: always quoted inline, King James Version style preferred
- **Avoid**: hype-driven copy, generic startup language, overly casual, overly churchy clichés
- **Prefer**: thoughtful, institutional, refined language that reflects the formation mission

---

## AI Working Rules

- **Always align new marketing UI with this document**
- **Match exact color tokens from this document** — do not invent new hex values
- **Follow the eyebrow pattern** — all sections must use the gold double-line eyebrow
- **Follow the two-column layout** for any new showcase sections
- **Do not introduce rounded corners** on marketing surfaces
- **Do not introduce new background image assets** without updating the Asset Registry above
- **If a page needs a new visual pattern, document it here first**

---

## Component Patterns

## Feature Panel

Right-panel component with image header and detail body. Used for showcasing items with visual context.

**Structure:**

- Image header with overlay text
- Body with title, description, and supporting content
- Sharp corners (no border-radius)
- Gold accent borders on dark surfaces

**Usage:** `LandingFeaturePanel`, `LandingFeaturePanelHeader`, `LandingFeaturePanelBody`

## Selector Grid

Grid of selectable items with active state styling.

**Structure:**

- Grid layout with configurable columns
- Active item gets gold accent border and background
- Non-active items have subtle borders
- Arrow icon on active item

**Usage:** `LandingItemGrid`

## Navigation Controls

Prev/next navigation with label and active value display.

**Structure:**

- Label on left
- Active value in center
- Prev button on left
- Next button on right
- Subtle borders and hover states

**Usage:** `LandingActiveItemNav`

## Image Section Wrapper

Background section with image and gradient overlay. Replaces manual background styling.

**Structure:**

- Background image with gradient overlay
- Accepts all LandingSection props
- Consistent background positioning and sizing

**Usage:** `LandingImageSection`

**Props:**

- `backgroundImageUrl`: string - image path
- `gradientFrom`: string - top gradient color (rgba)
- `gradientTo`: string - bottom gradient color (rgba)
- All LandingSection props (id, className, etc.)

## Carousel Hook

Shared carousel logic for navigating through item lists.

**Structure:**

- Active index state
- goToPrevious/goToNext functions with circular navigation
- setActiveIndex for manual selection

**Usage:** `useCarousel(itemCount)`

**Returns:**

- `activeIndex`: number - current active item
- `setActiveIndex`: (index: number) => void - set active index
- `goToPrevious`: () => void - navigate to previous item
- `goToNext`: () => void - navigate to next item

---

## Quick Checklist

Before shipping any new public-facing UI:

- Does it feel expensive, calm, and intentional?
- Are colors drawn from this document's palette only?
- Is the eyebrow label using the correct gold pattern?
- Are all corners sharp (zero border-radius)?
- Is the section in the correct light/dark rhythm?
- Are gold accents sparse and disciplined (never dominant fills)?
- Is the typography scale consistent with the reference table above?
- Does the right-panel follow the feature card pattern?
- Would it still look refined if one decorative element were removed?

If unsure, simplify.

## Code Review Standards

After completing any implementation, review the code for:

- Functions longer than 30 lines (likely doing too much)
- Logic duplicated more than twice (extract to utility)
- Any `any` type usage in TypeScript (replace with real types)
- Components with more than 3 props that could be grouped into an object
- Missing error handling on async operations

Run /simplify before presenting code to the user.
