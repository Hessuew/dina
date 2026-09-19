# Page loading performance

Status: 🟡 In progress  
Scope: landing page, dashboard, and authenticated navigation  
Current implementation slices: **28 / 28 complete**

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
- ✅ Landing-page lecturer portraits now load only for the current and adjacent carousel items (six of twelve on desktop, three of twelve on mobile), deferring the remaining portrait assets until interaction. The built portrait set is about 614 KB; the initial desktop selection exposes about 310 KB.
- ✅ Manager assignment detail loads now include the submissions panel data in the primary detail read, removing a second server-function round trip when opening an assignment as a course teacher or admin.
- ✅ Calendar lesson and assignment event previews now preload their detail route as soon as a navigable event is opened, so “View Details” can reuse the route data instead of starting the load after the click.
- ✅ Imperative lesson and assignment rows now also start route preloading on pointer-down, covering fast clicks and touch interactions where hover intent is unavailable.
- ✅ Browser Sentry now loads through a shared dynamic boundary, keeping its large SDK out of the critical application entry while preserving client initialization, user context, and error capture.
- ✅ Assignment detail now defers the manager-only submissions DataTable until the submissions panel renders, so student and non-managing staff navigations do not download the 132 KB table chunk.
- ✅ Assignments index navigation now reuses the authenticated root role instead of refetching courses solely for role resolution, removing one server-function round trip.
- ✅ Dashboard now defers the optional create-course dialog into an 11.84 KB / 4.39 KB gzip chunk that is requested only when a teacher or admin opens the create action.
- ✅ Event and Zoom validation schemas now import only their required Drizzle enum module instead of the full schema barrel, shrinking the client schema dependency from 111.06 KB to an 8.07 KB enum chunk.
- ✅ Replaced motion-based animated icons with static Lucide icons in authenticated navigation and enrollment admin actions, removing the 135.42 KB / 43.37 KB gzip animated-icon chunk. The authenticated sidebar route is now 41.95 KB / 13.27 KB gzip, down from 64.41 KB / 15.90 KB gzip.
- ✅ Deferred the course detail route's course, lesson, and media management dialogs until an editor action opens them, keeping optional form code off the initial course navigation.
- ✅ Course detail now runs student progress reads concurrently with course asset signing and media URL serialization, removing a serial post-processing phase from course navigation.
- ✅ Browser Sentry now waits for browser idle time before loading its optional SDK, while error capture still loads it immediately when needed.
- ✅ Lesson and assignment detail routes now defer their optional edit, delete, and grading dialogs until a staff action opens them, keeping form code off ordinary detail navigation.
- ✅ Students index authorization now reuses the authenticated root role instead of issuing a separate courses read before loading student data, removing one serial server-function round trip from that navigation.
- ✅ Events authorization now reuses the authenticated root role instead of issuing a separate courses read before loading events, removing one serial server-function round trip from that navigation.
- ✅ Student exam detail navigation now reads only the requested published exam and the student's attempt instead of loading and filtering the entire exam catalog again.
- ✅ Events management now lazy-loads the optional EventDialog, keeping event editing code off ordinary Events page entry.
- ✅ Library list and media detail routes now lazy-load the optional MediaDialog only after create, edit, or delete is opened, keeping its 23.62 KB / 6.31 KB gzip editor chunk off ordinary library navigation.

## Remaining

- ⬜ Audit remaining imperative detail navigation outside the core course/lesson/assignment flows.
- ⬜ Add representative browser measurements for landing, dashboard, course, lesson, and assignment flows.
- ⬜ Audit the remaining oversized route chunks, especially the PDF path, and keep them off unrelated navigations.
- ⬜ Re-run the measurements and push the finished work as a GitHub PR (do not merge automatically).

Latest build audit: the main shared browser entry is 407.72 KB minified / 131.16 KB gzip, down from 464.55 KB / 149.25 KB. The dashboard route is 30.44 KB minified / 10.19 KB gzip, with the optional CourseDialog deferred to an 11.88 KB / 4.40 KB gzip chunk. The Events route now emits a 7.60 KB / 3.45 KB gzip initial chunk and keeps its 11.60 KB / 4.49 KB gzip EventDialog chunk behind dialog interaction. Event and Zoom routes now share an 8.06 KB enum-only chunk instead of the previous 111.06 KB full Drizzle schema chunk. Authenticated navigation now uses a 41.95 KB / 13.27 KB gzip sidebar chunk with no standalone animated-icon runtime. Course detail now keeps its optional CourseDialog, LessonDialog, and MediaDialog modules behind interaction-triggered chunks; its generated route manifest has no initial imports for those dialog modules. Lesson and assignment detail routes likewise exclude their optional management dialogs from initial route dependencies. Library and media-detail route entries are 16.67 KB / 6.11 KB gzip and 18.38 KB / 6.83 KB gzip, respectively, and both request the 23.62 KB / 6.31 KB gzip MediaDialog chunk only after interaction. Sentry remains a deferred 476.28 KB / 156.08 KB chunk and is now requested after browser idle time rather than during router startup. PDF.js remains isolated to the library document viewer (487.96 KB minified / 148.26 KB gzip plus a 1.3 MB worker); these deferred assets do not load on the landing page. Student exam detail now avoids the catalog-sized student exam read and performs one exam lookup plus one attempt lookup in parallel before loading points.

## Browser baseline

Captured 2026-09-19 against the local Vite development server with Chrome DevTools. These are directional warm-cache measurements, not production or throttled-user benchmarks:

- ✅ Landing desktop (1200px viewport): response end 176 ms, DOMContentLoaded 349 ms, load 403 ms.
- ✅ Landing narrow viewport (500px effective viewport): response end 135 ms, DOMContentLoaded 223 ms, load 250 ms.
- ✅ Authenticated dashboard data waterfall (warm local Vite session): root user requests completed in 451–486 ms; dashboard course, upcoming-lesson, and assignment server functions completed in 461–732 ms and were issued concurrently.
- ⚠️ Authenticated route UI timing is not yet production-valid: the local Vite session repeatedly hit a hydration mismatch after route data returned, leaving stale content visible for several seconds. The measured course transition therefore cannot be used as a real-user baseline until a production-like Worker/Hyperdrive environment is available.

Next slice: capture authenticated course/lesson/assignment timings in a production-like environment, then use the request waterfall to choose the next route-level change. Keep auditing oversized route chunks without moving optional workflows back into the shared entry.
