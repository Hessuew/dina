# Page loading performance

Status: 🟡 In progress  
Scope: landing page, dashboard, and authenticated navigation  
Current implementation slices: **5 / 5 complete**

## Done

- ✅ Confirmed TanStack Router intent preloading is already enabled.
- ✅ Dashboard now loads assignments and upcoming lessons in parallel after the course role is known.
- ✅ Lazy-loaded the optional PostHog SDK so it is not part of the shared browser entry (configured builds emit it as a separate 280.70 KB / 92.79 KB gzip chunk).
- ✅ Reduced the production browser entry from 1,019.88 KB to 738.03 KB minified (318.79 KB to 225.06 KB gzip).
- ✅ Added pointer-intent route preloading for course → lesson and lesson → assignment detail navigation that uses imperative navigation.
- ✅ Added pointer-intent route preloading for student detail → assignment navigation.
- ✅ Lazy-loaded the authenticated sidebar from the shared root so public landing-page visits do not eagerly download authenticated navigation, reducing the browser entry from 738.03 KB to 451.24 KB minified (225.05 KB to 144.56 KB gzip).

## Remaining

- ⬜ Audit remaining imperative detail navigation outside the core course/lesson/assignment flows.
- ⬜ Add representative browser measurements for landing, dashboard, course, lesson, and assignment flows.
- ⬜ Audit the remaining oversized route chunks, especially the PDF and enrollment paths, and keep them off unrelated navigations.
- ⬜ Re-run the measurements and push the finished work as a GitHub PR (do not merge automatically).

Next slice: collect representative browser measurements for landing, dashboard, course, lesson, and assignment flows, then use the timings to prioritize the next route-level change.
