# XKiss Homepage — Research, Design Blueprint & Execution Roadmap
**Document status:** APPROVED WORKING PLAN — 2026-10-11  
**Scope:** Homepage structure, visual design system, background/decor layers, responsive behavior, content integrity, accessibility, performance, and verification.  
**Production status:** No production change is authorized by this document.  
**Important:** This is the locked method and acceptance map, not a claim that a final visual design has already been implemented or validated.

## 1. Purpose and decision
The homepage must be designed deliberately from a researched blueprint, not by adding random CSS, effects, cards, or decorative elements. Research informs the decisions; the actual XKiss code and real content remain the source of truth. The final visual composition must be reviewed against a visual blueprint before implementation begins.

## 2. Research principles to follow
1. **Immediate identity:** A visitor should understand what the site is and what the primary next action is without having to decode the page.
2. **Clear hierarchy:** Establish a visible order among brand/header, primary navigation, hero, featured content, categories, creator/content discovery, account actions, and footer.
3. **Truthful content:** Never present repeated, invented, or unavailable items as real content. A card must map to a distinct valid content record and a real supported action.
4. **Purposeful decoration:** Use layers in a controlled system: base surface → gradients/light fields → optional texture/overlay → content surfaces → borders/shadows. Decoration must support legibility and hierarchy, not compete with content.
5. **Consistent components:** Define tokens for colors, typography, spacing, radii, borders, shadows, card proportions, and interactive states before styling every section separately.
6. **Responsive by design:** Specify mobile and desktop behavior, including navigation, search, hero crop, card grid, touch targets, and footer—not just shrink the desktop page.
7. **Accessible interaction:** Check contrast, keyboard operation, visible focus, semantic headings/labels, motion preferences, and target sizes. Automated checks alone are not sufficient.
8. **Performance-aware media:** Use appropriately sized responsive images and optimized assets; do not load large video files merely to decorate a page. Measure actual page performance instead of assuming it is fast.
9. **Functional honesty:** A visible button/link/filter/pagination control is not considered complete until its behavior is tested. If a feature is not available, label or disable it clearly.
10. **No premature release:** Keep design approval, implementation, QA, and production release as separate gates.

## 3. Proposed homepage information architecture
This is the baseline structure to evaluate in the visual blueprint; the exact layout and styling are not considered final until reviewed.

1. **Header:** XKiss identity, search, account/sign-in actions, and a clear responsive layout.
2. **Primary navigation:** A small, coherent set of destinations with clear active/hover/focus states.
3. **Hero / introduction:** One clear value proposition and one primary action; avoid competing calls to action or oversized decorative effects.
4. **Featured content:** Only real, published items backed by the content catalog; each card must have a unique, valid content identity.
5. **Browse by category:** Useful categories that lead to real filtered content, or are explicitly marked unavailable until implemented.
6. **Creator/content discovery:** Include only if supported by real data and working destinations.
7. **Account shortcuts:** Show only actions that exist and route correctly.
8. **Footer:** Clear secondary navigation, support/contact route, privacy/terms/age-related information as applicable, and no dead links.

Sections may be reordered or omitted only when the source code, actual product requirements, or usability review supports the change.

## 4. Visual system and background-layer plan
Before page implementation, document these choices in a visual specification:
- **Color tokens:** page background, elevated surface, primary text, secondary text, accent, borders, focus ring, and status colors.
- **Typography:** heading/body scale, weight, line-height, text width, and mobile adjustments.
- **Background:** define the base color and any gradients/light fields; keep contrast behind text measurable.
- **Texture and overlays:** optional and subtle; test on low-end/mobile devices and remove if they reduce clarity or performance.
- **Cards and panels:** consistent padding, radius, border, image ratio, metadata hierarchy, hover/focus behavior, and loading/empty states.
- **Motion:** only where it communicates state or helps orientation; respect reduced-motion preferences.
- **Images/video:** define source, aspect ratio, responsive sizing, crop rules, loading strategy, and fallback.
- **States:** default, hover, keyboard focus, active, disabled, loading, empty, error, and unavailable.

Do not commit to a particular glow, glass, texture, animation, or image treatment merely because it looks fashionable in a reference. Compare alternatives in the blueprint and choose based on hierarchy, readability, brand fit, and performance.

## 5. Known issues to verify against the current source
Prior inspection reported that the main homepage displayed three video cards using the same `data-video-id="video-001"`, while `js/video-data.js` contained one catalog item named “XKiss Test Video.” Recheck the current branch before acting; if still true, treat this as a content/data defect, not a cosmetic issue. Never create fake catalog items to fill a grid.

A separate homepage/navigation proposal exists on branch `feature/xkiss-homepage-expanded-navigation` / PR #22. It is not automatically approved by this roadmap. Review it independently, verify its routes and interactions, and do not merge it or publish it solely because its checks appear green. A reported preview showed a “Page not found / Log in with a different user” issue for the user; preview access and actual visual behavior must be re-tested.

## 6. Mandatory workflow gates
### Gate A — Source and route inventory
- Inspect the current default branch, homepage markup/styles/scripts, content schema/data, assets, navigation destinations, and existing tests.
- Record what is real, broken, duplicated, missing, or only a visual placeholder.
- Do not edit the homepage during inventory.

**Exit evidence:** inventory with file paths, route list, content/data findings, and reproducible defects.

### Gate B — Research-backed visual blueprint
- Create a desktop and mobile wireframe / page composition before implementation.
- Show section order, content density, background layers, panel/card behavior, typography hierarchy, navigation/search placement, and key responsive changes.
- Provide at least one coherent recommended direction and explain trade-offs against alternatives.
- Identify which content is real and which is intentionally an empty/loading state.

**Exit evidence:** reviewable visual blueprint plus design tokens and acceptance criteria. No implementation begins until the blueprint is approved.

### Gate C — Implementation in an isolated branch
- Implement the approved blueprint in a dedicated branch.
- Reuse existing working components where appropriate; avoid unrelated changes and avoid patching symptoms when the root cause requires a clean fix.
- Keep production untouched.
- Every card, button, link, filter, sort, pagination control, search field, and account action must have a defined and testable behavior.

**Exit evidence:** commit/PR diff, build result, and mapping from each requirement to changed files.

### Gate D — Functional and visual QA
Test, at minimum:
- Desktop and narrow mobile layouts.
- Header/navigation/search and every visible destination.
- Real content IDs, card links, video/player behavior, empty/error/loading states.
- Keyboard-only navigation and visible focus.
- Contrast and reduced-motion behavior.
- Images/media loading, console/network errors, and responsive overflow.
- Performance measurements on the actual build.

**Exit evidence:** test matrix with PASS/FAIL, steps, screenshots or logs where available, and linked defects. A green build alone is not visual or functional proof.

### Gate E — Regression and release decision
- Run existing project tests and CI, plus new tests for changed behavior.
- Re-test unaffected navigation/auth/content paths.
- Review all open blockers and security/privacy/age-related requirements relevant to the release.
- Obtain Ali’s explicit approval before merge or production publication.

**Exit evidence:** regression report, known-issues list, approved PR/commit, and separate production smoke test after release.

## 7. Acceptance criteria (measurable)
- No duplicate cards presented as distinct content; each displayed item maps to a distinct valid catalog record.
- Zero known dead internal links among visible homepage controls, or clearly disabled/labelled unavailable controls.
- No horizontal overflow at the selected mobile test widths.
- Keyboard focus is visible and interactive controls are operable without a pointer.
- Contrast meets WCAG 2.2 AA requirements for applicable text and interface components; verify with tools and manual review.
- Responsive images/media are appropriately sized; measure rather than assume.
- Record Core Web Vitals for the tested build. Reference “good” thresholds at the 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. These are targets, not current XKiss measurements.
- No production merge/deploy without explicit approval and a passing evidence package.

## 8. Decision/status rules
- **GREEN:** The stated acceptance criteria have been tested and evidence is recorded.
- **YELLOW:** Blueprint or implementation is preliminary, partially tested, or blocked.
- **RED:** Not started, failing, or lacking required evidence.
- Do not label the homepage fully GREEN just because a build or deployment succeeds.
- Do not reopen a locked stage without a concrete technical reason and recorded evidence.

## 9. Research references
- Nielsen Norman Group — Homepage Design: 5 Fundamental Principles: https://www.nngroup.com/articles/homepage-design-principles/
- Nielsen Norman Group — 113 Design Guidelines for Homepage Usability: https://www.nngroup.com/articles/113-design-guidelines-homepage-usability/
- Baymard Institute — Homepage & Navigation UX Best Practices: https://baymard.com/research-articles/ecommerce-navigation-best-practice
- W3C — Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/
- W3C Design System — Contrast: https://design-system.w3.org/settings/
- web.dev — Image performance: https://web.dev/learn/performance/image-performance/
- web.dev — Video performance: https://web.dev/learn/performance/video-performance/
- web.dev — Web Vitals: https://web.dev/articles/vitals
- Shopify — Homepage design examples and best practices: https://www.shopify.com/blog/homepage-design

## 10. Current checkpoint
**Approved now:** this research-led workflow, the stage gates, the content-truth rule, the need for a visual blueprint, and the requirement for evidence before calling anything GREEN.

**Not approved yet:** a final pixel-level visual design, a production code change, merging PR #22, or publishing a redesign.

**Next action:** complete Gate A against the current source, then prepare the desktop/mobile visual blueprint for review. Do not skip directly to styling or deployment.
