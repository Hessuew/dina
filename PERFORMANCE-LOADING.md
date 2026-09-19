# Page loading performance

Status: 🟡 In progress  
Scope: landing page, dashboard, and authenticated navigation  
Current implementation slices: **1 / 5 complete**

## Done

- ✅ Confirmed TanStack Router intent preloading is already enabled.
- ✅ Dashboard now loads assignments and upcoming lessons in parallel after the course role is known.
- ✅ Recorded the production build baseline: browser entry is about 1,020 KB minified (319 KB gzip).

## Remaining

- ⬜ Make course → lesson → assignment navigation use the fastest safe preload path.
- ⬜ Add representative browser measurements for landing, dashboard, course, lesson, and assignment flows.
- ⬜ Split or otherwise reduce the oversized browser entry and route chunks.
- ⬜ Re-run the measurements and push the finished work as a GitHub PR (do not merge automatically).

Next slice: profile the course/lesson/assignment navigation path and remove its largest avoidable wait.
