# Cloudflare Images Integration - Hero Component

Migrate hero.tsx to use Cloudflare Images runtime optimization instead of static asset imports, enabling automatic format detection (AVIF/WebP/JPEG) and responsive width adaptation at the edge.

## Scope

Phase 1: Hero component only (`src/components/landing/hero.tsx`)

## Current State

- Images imported from `src/assets/images/` via static imports
- `marbleTexture` (bg_hero.webp) used as CSS background
- `heroEmblem` (logo.webp) used as `<img>` tag
- Images already moved to `public/images/` by user

## Implementation

### 1. Update hero.tsx imports

Replace static imports with Cloudflare Image URLs:

```typescript
// Remove:
import marbleTexture from '@/assets/images/bg/bg_hero.webp'
import heroEmblem from '@/assets/images/bg/logo.webp'

// Add:
const marbleTexture = `${import.meta.env.VITE_APP_URL ?? 'https://christ-dina.juhani-juusola.workers.dev'}/cdn-cgi/image/format=auto,width=auto/images/bg/bg_hero.webp`
const heroEmblem = `${import.meta.env.VITE_APP_URL ?? 'https://christ-dina.juhani-juusola.workers.dev'}/cdn-cgi/image/format=auto,width=auto/images/bg/logo.webp`
```

### 2. Verify image paths

Ensure images exist at:

- `public/images/bg/bg_hero.webp`
- `public/images/bg/logo.webp`

### 3. Test locally

Run `bun run dev` and verify:

- Hero background loads correctly
- Logo displays correctly
- No console errors for missing images

### 4. Test on Cloudflare

Deploy and verify Cloudflare transformation works:

- Check Network tab to confirm transformed URLs are served
- Verify format (AVIF/WebP/JPEG) based on browser support

## Benefits

- Zero build-time overhead (no vite-imagetools)
- Automatic format detection (AVIF/WebP/JPEG)
- Responsive width adaptation
- Works for dynamic images later
- Global edge caching

## Next Phases (Future)

After hero validation:

- Lecturer component (lecturers.tsx)
- Other landing components
- Authed route images
- User-uploaded images
