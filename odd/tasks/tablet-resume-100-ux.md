# Feature: tablet resume + 100 usability improvements

## Objective
Make the app comfortable on tablets, pause cleanly when hidden, restore exactly where the user left off (data + screen state), and ship 100 usability/visual improvements. Deploy to production (Vercel) when done.

## Problem / why
Data already persists in localStorage and the section lives in the URL hash, but screen state (tabs, filters, searches, selections, half-edited forms, scroll) is lost when the tablet discards the tab. Background work (camera, cloud polling timers) should stop while the page is hidden.

## Scope / constraints
- Branch: feat/pedidos-recepcion; ff-merge to main and deploy at the end (user authorized).
- No new dependencies. Local-first; cloud sync unchanged except flushing on hide.
- TDD: off (no project/session config) -> ordinary checks: `npm test`, `npm run lint`, `npm run build`, E2E flows (scratchpad flow/flow2/flow3 + tablet flow).
- Route: direct inline (user global rule: no subagents unless asked).

## Tasks
- [x] T1 Commit pending docs (b3ec751)
- [x] T2 Pause/resume: persistent UI state lib, wiring per screen, scroll restore, stop camera/timers when hidden, flush cloud push on hide
- [x] T3 Tablet/touch layout and comfort (CSS + layout)
- [x] T4 Visual improvements
- [x] T5 Usability improvements across screens (to reach 100, listed in docs/MEJORAS-100.md)
- [x] T6 Verify (tests, lint, build, E2E desktop/phone/tablet), docs, merge to main, deploy, verify production

## Acceptance
- Reload / tab discard on any screen restores section, tab, filters, search, selection, in-progress edits and scroll.
- Hidden page: no camera stream, no polling; pending cloud upload flushed.
- No horizontal overflow at 768x1024 and 1024x768; touch targets >= 44px on coarse pointers.
- docs/MEJORAS-100.md lists 100 implemented items.

## Progress / evidence
- T1: commit b3ec751
- Found + fixed data-loss bug: reload reseeded the demo over saved data (screens persisted before hydration). Commit 41dbdc3.
- T2: screen state persisted per screen (lib/ui-state.ts), scroll + last section restore, camera closes when hidden, cloud polling stops when hidden and pending upload flushes on hide. Checks: npm test 53/53, lint clean, build OK, E2E resume.mjs 9/9 (820x1180 touch), flow 1/2/3 all pass, no JS errors.
- T3/T4: commit 81bb6de (tablet/touch, cards, search field, wake lock, badges, update notice).
- T5: Escape on dialogs, stock adjustment fields persisted, "go" key hint; docs/MEJORAS-100.md lists 100 items (sequence verified).
- Verification on final build: npm test 53/53; lint clean; build OK; resume.mjs 9/9 at 820x1180, 1180x820, 390x844; ux.mjs 18/18; flow 13, flow2 17 (5/5 runs after replacing its fixed 2.2s wait with a content wait - the intermittent failure was the script timing), flow3 9; no horizontal overflow in 18 sections x 3 viewports; no JS errors.
- Next: T6 ff-merge to main, push, verify Vercel deploy.
- RDD review review-51d3c4cc1f90551b (base b3ec751..911ce0c): approved + acknowledged (authority burned). Advisory findings addressed in a follow-up commit: R3-001 test for the hydration guard (createDemoPersistence + tests/demo-persistence.test.mjs), R3-002 order draft discarded if the order changed (base hash) and editor uses the current order, R3-003 usePersistentState stores value with its key, R3-004 cloud polling no longer restarts on every edit (refs), R3-005 resume notice only for the reopened screen. Checks: npm test 56/56, lint, build, resume 10/10 x3 viewports, ux 18/18, flows 13/17/9.
- T6: ff-merged main 9661ce5..a42a52a, pushed; Vercel production success; prod URL 200; prod E2E resume 10/10 (820x1180) and ux 18/18, no JS errors. Follow-up (not done): other form drafts (catalog/supplier/user/payment) can still be stale vs newer cloud data, same as before this change.
