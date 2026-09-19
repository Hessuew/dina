# Page loading performance

Status: 🟡 In progress  
Scope: landing page, dashboard, and authenticated navigation  
Current implementation slices: **3 / 5 complete**

## Done

- ✅ Confirmed TanStack Router intent preloading is already enabled.
- ✅ Dashboard now loads assignments and upcoming lessons in parallel after the course role is known.
- ✅ Lazy-loaded the optional PostHog SDK so it is not part of the shared browser entry (configured builds emit it as a separate 280.70 KB / 92.79 KB gzip chunk).
- ✅ Reduced the production browser entry from 1,019.88 KB to 738.03 KB minified (318.79 KB to 225.06 KB gzip).
- ✅ Added pointer-intent route preloading for course → lesson and lesson → assignment detail navigation that uses imperative navigation.

## Remaining

- ⬜ Extend the fastest safe preload path to any remaining imperative detail navigation.
- ⬜ Add representative browser measurements for landing, dashboard, course, lesson, and assignment flows.
- ⬜ Split or otherwise reduce the oversized browser entry and route chunks.
- ⬜ Re-run the measurements and push the finished work as a GitHub PR (do not merge automatically).

Next slice: profile the course/lesson/assignment navigation path and remove its largest avoidable wait.
