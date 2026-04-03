# CLAUDE.md

## Purpose

This file is the canonical design and UI guidance for AI-assisted changes in this repository.

Unless the user explicitly requests otherwise, all new pages, sections, components, and visual refactors should follow this document.

If a future design direction changes materially, update this file first or alongside the implementation.

## Brand Positioning

- **Product**: DINA — Disciplers Institute / Disciples of Nations Academy
- **Category**: elite digital Bible academy for global leaders
- **Brand feeling**: timeless, authoritative, serene, intelligent, premium, expensive
- **Creative direction**: architectural minimalist, high-end editorial, quiet luxury

## Core Visual Principles

- **Prefer restraint over decoration**
  - fewer elements
  - stronger spacing
  - more confidence

- **Design for a premium institutional feel**
  - editorial composition
  - asymmetrical balance
  - monumental typography
  - tactile materials

- **Use contrast with discipline**
  - light stone backgrounds
  - graphite accents
  - gold only as a refined highlight, never as a loud fill everywhere

- **Make everything feel intentional**
  - thin borders
  - clean alignment
  - controlled shadows
  - no random colors or novelty effects

## Sitewide Aesthetic

### Overall Look

- **Primary visual language**
  - white imperial granite / marble surfaces
  - deep graphite panels
  - burnished antique gold accents
  - quiet luxury editorial spacing
  - sharp architectural framing

- **Mood targets**
  - calm
  - expensive
  - intelligent
  - spiritual but not cliché
  - modern but not trendy

### Avoid

- **Do not use**
  - playful startup gradients
  - bright saturated blues, greens, or purples as dominant accents
  - oversized rounded “bubble” UI
  - cartoonish icon treatment
  - generic SaaS hero layouts
  - crowded nav bars
  - glassmorphism everywhere
  - cheap-looking glow effects

## Color Palette

Use these colors as the default palette unless the user asks otherwise.

### Core Brand Colors

- **Imperial stone**: `#F8F4EC`
  - default premium light background

- **Soft marble white**: `#FCFBF8`
  - elevated section backgrounds

- **Warm parchment**: `#F3EDE2`
  - subtle fills and layered surfaces

- **Deep charcoal**: `#1A1A1A`
  - premium dark surfaces, header/button surfaces, hero slice backgrounds

- **Graphite**: `#2A2A2A`
  - secondary dark layer for gradients and elevated dark UI

- **Espresso black**: `#1C1815`
  - primary text color for premium pages

- **Burnished antique gold**: `#C5A059`
  - borders, accents, highlights, premium emphasis

### Support Colors

- **Warm stone text**: `#5E5549`
  - secondary text, eyebrow labels, captions

- **Muted body text**: `#4B443A`
  - long-form paragraph text on premium light surfaces

- **Hairline border dark**: `rgba(26, 26, 26, 0.10)`
  - structural separators on light backgrounds

- **Hairline border gold**: `rgba(197, 160, 89, 0.45)`
  - premium accents and CTA borders

### Color Usage Rules

- **Gold is an accent, not a background system**
  - use it for edges, type highlights, dividers, and premium details

- **Charcoal is the primary action surface**
  - buttons
  - dark panels
  - header accents

- **Text should almost always land in espresso or charcoal**
  - preserve strong readability
  - avoid low-contrast luxury styling

## Typography

### Display / Heading Direction

- **Display style**
  - editorial serif look
  - monumental scale
  - high contrast feeling
  - elegant and restrained

- **Implementation rule**
  - until a dedicated premium serif is installed, use `font-serif` for high-impact headings
  - use tight leading and slightly negative tracking for major headlines

- **Use for**
  - hero headlines
  - section titles when premium emphasis is needed
  - premium CTA labels in select places

### Body / Interface Direction

- **Body style**
  - clean Swiss-inspired sans-serif
  - light to regular weight
  - generous tracking
  - quiet and readable

- **Current implementation**
  - default site body font is `Geist Variable`
  - use `font-sans` for body, interface text, forms, navigation, and supporting copy

### Typography Rules

- **Headlines**
  - large
  - spacious
  - minimal line count
  - high contrast against the background

- **Body text**
  - never too dense
  - prefer `leading-7` or `leading-8` on premium landing sections
  - keep line length controlled

- **Eyebrows / labels / microcopy**
  - uppercase
  - tracked out
  - small
  - subtle, not loud

## Shape Language

- **Primary rule**
  - prefer sharp 90-degree corners for premium marketing surfaces

- **Use minimal rounding only when necessary**
  - utility UI or app chrome may use small radii
  - premium marketing components should feel architectural, not soft and bubbly

- **Avoid**
  - large pill-heavy layouts unless the user explicitly asks for them

## Layout System

### General Layout Rules

- **Use strong whitespace**
  - premium pages should breathe
  - avoid cramming content into the viewport

- **Prefer asymmetrical balance**
  - a strong visual object on one side
  - disciplined typography on the other

- **Use structural lines sparingly**
  - thin dividers
  - measured framing
  - gold or charcoal hairlines

### Header Rules

- **Public landing header**
  - sticky
  - transparent
  - minimal
  - quiet and premium

- **Header composition**
  - minimal logo mark plus `DINA`
  - very restrained nav or controls
  - thin hairline divider treatment
  - graphite used as the premium action surface, not as a full heavy bar by default

- **Header should not feel like a dashboard navbar**
  - avoid crowded links
  - avoid loud filled backgrounds

### Hero Rules

- **Hero composition**
  - monumental headline
  - large open space
  - one dominant premium action
  - one hero object or one strong visual slice

- **Preferred hero materials**
  - marble or stone background
  - graphite / charcoal vertical slice
  - gold-highlighted type or edges

- **Hero CTA**
  - one primary action when possible
  - deep charcoal background
  - gold-thread border
  - serif or premium-styled label

## Component Guidelines

### Buttons

- **Primary buttons**
  - charcoal or graphite fill
  - gold border or gold accent edge
  - premium shadow
  - restrained hover lift

- **Secondary buttons**
  - transparent or lightly tinted surface
  - hairline border
  - avoid overly soft rounded pills by default

- **Avoid**
  - neon buttons
  - aggressive gradients
  - overly playful motion

### Cards and Panels

- **Use cards only when needed**
  - prefer sections and framing over excessive card stacks

- **Card styling**
  - subtle material contrast
  - thin borders
  - stone or white surfaces
  - crisp edges
  - controlled shadow depth

### Forms

- **Forms should feel premium and calm**
  - quiet backgrounds
  - thin borders
  - strong spacing
  - minimal ornament

- **Inputs**
  - readable
  - high contrast
  - clean focus states
  - no gimmicky color effects

## Imagery and Materials

### Approved Material Direction

- **Textures**
  - marble
  - granite
  - paper embossing
  - subtle gold foil cues

- **Hero imagery**
  - one premium focal object
  - high-resolution
  - realistic
  - never cluttered

### Current Useful Assets

- **Marble texture**: `src/assets/images/63511.jpg`
- **Premium emblem**: `src/assets/images/DINA_v2-Photoroom.png`
- **Dark premium background**: `src/assets/images/bg.jpg`

### Asset Rules

- **Do not overload pages with many competing images**
- **Prefer one strong object plus material textures**
- **If imagery feels cheap, remove it rather than forcing it**

## Shadows, Borders, and Depth

- **Shadows**
  - use deeper physical shadows
  - soft falloff
  - premium restraint

- **Borders**
  - favor hairline borders
  - use dark translucent borders on light surfaces
  - use gold translucent borders for emphasis

- **Depth strategy**
  - create hierarchy with material contrast, spacing, and shadow
  - do not rely on many stacked effects

## Motion and Interaction

- **Motion should be subtle**
  - slight lift
  - soft fade
  - minimal translate
  - no springy or flashy behavior by default

- **Recommended interaction feel**
  - confident
  - smooth
  - premium
  - understated

- **Default timing**
  - roughly `150ms` to `300ms`

## Copy Tone

- **Voice**
  - elevated
  - intelligent
  - calm
  - authoritative

- **Avoid copy that feels**
  - hype-driven
  - generic startup marketing
  - overly casual
  - overly churchy or cliché

- **Prefer language that feels**
  - thoughtful
  - mission-led
  - institutional
  - refined

## Tailwind and Implementation Rules

- **Use Tailwind classes that reinforce this system**
  - clean spacing
  - sharp geometry
  - restrained color use
  - elegant shadows

- **For body and UI text**
  - prefer `font-sans`

- **For hero and premium display moments**
  - prefer `font-serif` until a dedicated display font is installed

- **Use the palette above instead of random Tailwind defaults**
  - custom hex values are preferred for premium marketing surfaces

- **When in doubt**
  - reduce visual noise
  - increase whitespace
  - simplify the component
  - make it feel more editorial

## AI Working Rules

When an AI updates the UI in this repository, it should follow these defaults:

- **Always align new marketing UI with this document**
- **Keep the public-facing landing experience premium and minimal**
- **Reuse the approved palette and material direction**
- **Do not introduce a conflicting design language without explicit user approval**
- **If a page needs a new visual pattern, add it here so future work stays consistent**

## Quick Checklist

Before shipping a new public-facing UI, check:

- **Does it feel expensive, calm, and intentional?**
- **Is the spacing generous enough?**
- **Are the colors limited and disciplined?**
- **Are gold accents being used sparingly and well?**
- **Is the typography strong enough for a premium editorial feel?**
- **Are corners too rounded for this design language?**
- **Would this still look refined if one decorative element were removed?**

If unsure, simplify.
