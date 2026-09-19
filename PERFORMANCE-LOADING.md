# Page loading performance

Status: 🟡 In progress  
Scope: landing page, dashboard, and authenticated navigation  
Current implementation slices: **9 / 9 complete**

## Done

- ✅ Confirmed TanStack Router intent preloading is already enabled.
- ✅ Dashboard now loads assignments and upcoming lessons in parallel after the course role is known.
- ✅ Lazy-loaded the optional PostHog SDK so it is not part of the shared browser entry (configured builds emit it as a separate 280.70 KB / 92.79 KB gzip chunk).
- ✅ Reduced the production browser entry from 1,019.88 KB to 738.03 KB minified (318.79 KB to 225.06 KB gzip).
- ✅ Added pointer-intent route preloading for course → lesson and lesson → assignment detail navigation that uses imperative navigation.
- ✅ Added pointer-intent route preloading for student detail → assignment navigation.
- ✅ Lazy-loaded the authenticated sidebar from the shared root so public landing-page visits do not eagerly download authenticated navigation, reducing the browser entry from 738.03 KB to 451.24 KB minified (225.05 KB to 144.56 KB gzip).
- ✅ Lazy-loaded enrollment review and admin dialogs so the enrollment table route no longer downloads optional workflows on entry, reducing its route chunk from 220.74 KB to 30.28 KB minified (60.53 KB to 10.66 KB gzip).
- ✅ Lazy-loaded the staff-only eBook importer so the library landing route does not download its optional PDF-validation workflow until “Import eBooks” is opened, reducing that route chunk from 36.00 KB to 15.54 KB minified (11.93 KB to 5.85 KB gzip).
- ✅ Lesson and assignment detail loaders now fetch the viewer profile concurrently with independent page data, removing one serial server-read step from the most common course → lesson → assignment flow.
- ✅ Exam list and detail loaders now use the authenticated root route context for the user role instead of refetching courses, removing one redundant server request from both exam entry points.

## Remaining

- ⬜ Audit remaining imperative detail navigation outside the core course/lesson/assignment flows.
- ⬜ Add representative browser measurements for landing, dashboard, course, lesson, and assignment flows.
- ⬜ Audit the remaining oversized route chunks, especially the PDF path, and keep them off unrelated navigations.
- ⬜ Re-run the measurements and push the finished work as a GitHub PR (do not merge automatically).

Latest build audit: PDF.js remains isolated to the library document viewer (about 480 KB minified plus a 1.3 MB worker); the shared browser entry remains about 456 KB minified. These are deferred assets, but still the next bundle-size targets after representative browser measurements are available.

Next slice: collect representative browser measurements for landing, dashboard, course, lesson, and assignment flows, then use the timings to prioritize the next route-level change.
