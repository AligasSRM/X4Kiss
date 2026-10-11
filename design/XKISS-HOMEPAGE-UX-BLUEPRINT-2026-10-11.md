# XKiss Homepage — UX Research & Visual Blueprint
**Date:** 2026-10-11  
**Scope:** Public homepage only; design/review plan for Draft PR #24.  
**Branch:** `feature/homepage-real-content-2026-10-11`  
**State:** 🟡 REVIEW REQUIRED — blueprint only; no merge or production deployment authorized.

## 1. Product goal
The homepage must help a first-time visitor understand XKiss, search and discover genuinely published videos, browse categories, find verified creators, and reach the correct account/upload path. It must feel premium and deliberate without pretending that missing product capabilities or content already exist.

**Non-negotiable rules**
- Never display demo/test records, invented creators, fake view counts, fake verification badges, or placeholder videos as if they were real.
- A visible button must have a defined, tested destination/action. Hide or omit unavailable actions rather than rendering dead controls.
- The public homepage and public video catalogue must not expose drafts or unreviewed uploads.
- The 18+ label is informational only; it is not proof of age assurance or a replacement for a server-enforced age gate where required.
- Do not modify the locked ElasticLake storage provider/configuration as part of homepage work.
- Keep PR #24 in Draft until the visual review and acceptance checks are completed. Do not merge or deploy without Ali's explicit approval.

## 2. Research basis
1. **YouTube:** its official explanation describes the homepage as a discovery surface and distinguishes recommendations from search, subscriptions, and topic destinations. For XKiss, the transferable principle is clear content discovery; personalized recommendations should not be claimed until there is a real, privacy-conscious recommendation signal and implementation.  
   https://support.google.com/youtube/answer/16089387
2. **Vimeo:** its official help and category pages connect video discovery with search, categories/channels, and creator follow/feed paths. For XKiss, category pages and public creator profiles should be connected, but follow/feed controls must wait until they work end-to-end.  
   https://help.vimeo.com/hc/en-us/articles/12426004157969-About-discovering-videos-on-Vimeo  
   https://vimeo.com/categories/
3. **Nielsen Norman Group:** homepage guidance emphasizes a clearly communicated site purpose, visible/simple search, and navigation labels that make destinations understandable. Use this to avoid redundant shortcut grids and unclear buttons.  
   https://www.nngroup.com/articles/113-design-guidelines-homepage-usability/
4. **web.dev:** measure loading, interaction responsiveness and layout stability using Core Web Vitals; lab checks support development but do not replace real-user field measurements.  
   https://web.dev/articles/vitals
5. **W3C WCAG 2.2:** keyboard-operable controls need visible focus, with sufficient contrast for controls and indicators.  
   https://www.w3.org/WAI/WCAG22/Understanding/focus-visible  
   https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast

These are patterns to adapt, not designs to copy. XKiss must retain its own identity and must not imply features that are not implemented.

## 3. Proposed page wireframe (top to bottom)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ XKiss logo   Home  Videos  Categories  Creators   [Search......]    │
│                                                     [Search] [Sign in]│
├─────────────────────────────────────────────────────────────────────┤
│ 18+ · ADULTS ONLY                                                    │
│ Discover XKiss                                                       │
│ Short, clear value statement — no unsupported feature claims         │
│ [Explore Videos]  [Upload Your Video / Create Account]               │
│ (Upload path must preserve return URL through sign-in when required) │
├─────────────────────────────────────────────────────────────────────┤
│ FEATURED VIDEO — only when a real, published featured video exists   │
│ Real title / real metadata / real poster                  [Watch]    │
│ If none exists: hide this entire section, not an empty fake feature. │
├─────────────────────────────────────────────────────────────────────┤
│ Latest Videos                                      [View all videos] │
│ [Real poster/card] [Real poster/card] [Real poster/card]             │
│ [Real poster/card] [Real poster/card] [Real poster/card]             │
│ Empty state when none are published; no test/demo content.          │
├─────────────────────────────────────────────────────────────────────┤
│ Browse Categories                                                    │
│ [All / real category] [real category] [real category]                │
│ Each category opens Videos with that category selected.              │
├─────────────────────────────────────────────────────────────────────┤
│ Verified Creators                                                    │
│ [Real verified profile] [Real verified profile] [Real profile]      │
│ Each card opens a public creator profile, not a private dashboard.   │
├─────────────────────────────────────────────────────────────────────┤
│ Creator CTA — one concise invitation to sign in / start uploading    │
│ Only show actions that have real, guarded destinations.              │
├─────────────────────────────────────────────────────────────────────┤
│ About · Help · Contact · Privacy · Terms · 18+ / safety information  │
└─────────────────────────────────────────────────────────────────────┘
```

### Visual system
- Keep the current dark graphite base with restrained pink/purple accents, but use gradients as emphasis rather than as a substitute for content imagery.
- Give the page one clear primary action; use secondary styling for navigation/supporting actions.
- Use a consistent max-width, spacing scale, card radius, typography scale, and focus treatment.
- Real video poster/thumbnail is the preferred card image. If a video has no real poster, use a neutral branded fallback that does not imply a real scene or content preview.
- Avoid excessive animations, autoplay, surprise audio, decorative controls that look interactive, and large hero areas that push all useful content below the fold.
- On mobile, replace the currently hidden desktop navigation with an accessible menu button or a compact navigation pattern; do not leave the main destinations undiscoverable.

## 4. Button and link contract
| Control | Purpose / destination | Display rule | Acceptance test |
|---|---|---|---|
| XKiss logo | Return to homepage | Always | Opens `index.html` |
| Home / Videos / Categories / Creators | Navigate to the named section/page | Always, with working mobile access | Correct destination and visible active/focus state |
| Search input + Search | Search published videos and creator names supported by the video index | Always | Enter submits to `videos.html?q=…`; query survives navigation and results reflect it |
| Sign in / My Account | Sign in when signed out; account/dashboard entry when authenticated | Based on validated server session | Invalid/expired token is cleared; no privileged access from client state alone |
| Explore Videos | Scroll to Latest Videos or open `videos.html` | Always | Reaches useful content even when feed is empty |
| Upload Your Video | Enter protected upload flow | Always only if route guard preserves return path | Signed-out visitor is directed to sign-in and returned to upload after success; signed-in creator reaches upload |
| Featured Watch | Open the actual featured published video in independent player | Only when a real published featured video exists | Opens `player.html?id=<real-id>`; never points to an arbitrary video |
| View all videos | Open public video catalogue | Always | Only published videos appear |
| Category chip/link | Open catalogue filtered to that real category | Only for categories derived from published metadata | Query parameter selects the category and filtering works |
| Creator profile | Open public creator profile | Only with a valid public profile route and authoritative verification data | Does not route visitors to a private creator dashboard |
| Follow creator | Follow/unfollow and persist state | **Do not display until backend persistence, authorization and unfollow are implemented** | State survives refresh and is authorized server-side |
| Creator CTA | Sign in / create account / upload | One clear CTA; adapt to validated auth state | Correct destination; no duplicate shortcut grid |
| Help / Contact / Privacy / Terms | Open real policy/support pages | Only link to existing, maintained destinations | No 404, empty hash, or placeholder destination |

**Remove/rework duplicates:** The current Quick Access grid repeats Videos, Categories, Creators, Upload and Sign in already exposed elsewhere; the bottom account grid repeats Upload and Sign in again. Prefer the page hierarchy above and retain only shortcuts that solve a proven user task.

## 5. Findings from the actual Draft PR #24 source
### Good foundations to preserve
- The homepage uses a visible search input and passes `q` to the video catalogue.
- The public feed filters on explicit `status === "published"` and `publishedAt`.
- The featured section is hidden unless a record is explicitly marked featured.
- Empty states explain why content is absent instead of manufacturing cards.
- Category links are derived from video metadata.
- The code has responsive layout rules and some explicit focus styling.
- The recorded CI checks passed on commit `7feeac485645101e2c5dbd1bd156615ef8b67df4`; this is automated evidence, not visual acceptance.

### Issues to address before visual acceptance
1. **Mobile navigation:** CSS hides `.nav-links` at widths up to 620px, and the inspected header has no menu button. Provide an accessible replacement.
2. **Creator destinations:** generated “View creator area” links point to `creator-dashboard.html`, which is not a public creator profile. Replace only after confirming/creating the correct public profile route; otherwise omit the card action.
3. **Verification source:** client-side flags such as `creatorVerified` / `verifiedCreator` in a static video file are not an authoritative production verification source. A public verification badge must be derived from trusted server-backed profile data before production.
4. **Thumbnail quality:** the current cards render an XKiss brand mark as the thumbnail, rather than a real video poster. Use actual poster metadata where available; otherwise show a clearly neutral fallback.
5. **Search claim:** the field says “videos and creators”; confirm that the catalogue really searches every supported creator field and that result labels make clear what matched.
6. **Upload routing:** verify the sign-in/return-path flow from the hero and any upload CTA; the button must not strand a signed-out visitor or bypass server authorization.
7. **Footer:** current footer is minimal. Add only real Help, Contact, Privacy, Terms and safety destinations once those pages/routes exist.
8. **18+ safety:** the visual label alone does not establish age assurance. Keep the existing production gate fail-closed until the separately tracked age/safety dependencies are verified.
9. **Content semantics:** make each video title a real link/button to the player, give poster images useful alt text when informative, and ensure play controls are not the only accessible way to open a video.
10. **Implementation hygiene:** the current homepage has a large inline CSS block and inline rendering script. This can be reviewed/refactored after the layout is accepted; avoid a risky broad refactor before the visual design is stable.

## 6. Validation plan — do not call GREEN until evidence exists
### Functional
- Logo, every nav link, search submit, hero CTAs, View all, category links, featured video, creator profile and account state.
- Signed-out and signed-in upload flows; expired session handling; no client-only authorization assumptions.
- Published-only feed; no draft/test records, fake views, fake creators, or unsupported verification badges.
- No-results, no-published-videos, no-categories, no-verified-creators, network error and slow-loading states.
- Browser back/forward and URL query parameter persistence.
- No dead buttons, empty links, console errors, or broken routes.

### Visual/responsive
- Desktop 1440px and 1280px; tablet 768px; mobile 390px and 360px.
- Check header overflow, hero fold height, card columns, category wrapping, footer, menu operation and touch target comfort.
- Keyboard-only walkthrough and visible focus; automated accessibility checks plus manual review of labels, contrast and semantics.

### Performance/accessibility targets
- Track Core Web Vitals at the 75th percentile when real-user data is available: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Run Lighthouse or equivalent lab checks during development; do not confuse lab scores with real-user field evidence.
- Target WCAG 2.2 AA for keyboard operation, focus visibility, text/control contrast and accessible names.

### Release boundary
- PR #24 stays Draft and unmerged until the visual preview has been inspected and accepted by Ali.
- No production deployment or production activation is authorized by this document.
- Do not change the locked ElasticLake storage configuration as part of this homepage work.

## 7. Ali's required workflow — visual approval BEFORE functionality work
**Recorded 2026-10-11 from Ali's explicit instruction.** This is the active execution gate for homepage work, not merely a general note.

### Phase A — complete the visual design first (current phase)
- Finish the full page inventory and decide what belongs, what is redundant, what is missing, and what must not appear.
- Prepare a complete, realistic visual preview for mobile and desktop. The preview must show the intended layout and hierarchy before any new button activation work starts.
- Include the visitor journey screens/states in the visual design: (1) 18+ / age-assurance entry state where applicable; (2) Register/create account; (3) Login; (4) homepage after successful authentication; and (5) public browsing behavior for signed-out visitors, where permitted by the product's age/safety policy.
- Registration and login are distinct screens/states. Do not depict login as completed before account creation/verification requirements are met.
- Show all major homepage sections in their intended final arrangement: header/navigation, search, hero, featured-video state, latest videos, categories, creators, creator invitation, account-related destinations, and footer/legal/safety links.
- Show both populated and empty-content states without fake published videos, fake creator profiles, fake counts, or fabricated verification.
- Define mobile navigation explicitly; desktop-only navigation that disappears on mobile is not an accepted design.
- Mark each planned item as KEEP, ADD, REMOVE, or DEFER, with a short reason. In particular, remove redundant Quick Access/account shortcut grids unless the visual review demonstrates a distinct user need; do not show the Test category to public visitors; do not present demo cards as genuine published content.
- Provide Ali a preview link and ask for visual/design approval. No feature implementation or button-by-button activation begins until Ali explicitly approves the visual design.

### Phase B — freeze the approved design
- Record the accepted preview/revision and approval date in this document and the development PR.
- Keep changes in the development branch and draft PR until approval and the required checks are complete.
- Do not merge to main, publish production, change hosting configuration, or modify the locked ElasticLake storage setup as part of design approval.

### Phase C — activate one control at a time (only after approval)
For each individual button, link, tab, category, form, or account action:
1. Define the expected behavior and authorized destination.
2. Implement that one control end-to-end.
3. Test it in the deployed preview, including relevant signed-out/signed-in and error states.
4. Record evidence and mark GREEN only after the test passes.
5. Fix failures before moving to the next control.
6. Do not mark a section complete because its UI merely looks clickable. No dead links, decorative controls pretending to work, or client-only authorization.

### Homepage inventory for design sign-off
| Item | Design decision before approval | Gate |
|---|---|---|
| XKiss logo + Home | Keep; one clear route to homepage | Visual placement first |
| Videos / Categories / Creators navigation | Keep only with a defined destination; ensure mobile access | Visual placement first |
| Search field + submit | Keep; show its intended placement and result state | Visual placement first |
| Register / Sign in | Keep as distinct account states; avoid duplicate shortcut tiles | Design both screens first |
| 18+ / age assurance | Design a clear, accessible entry/blocked state; a label alone is not age verification | Safety design review |
| Hero headline + primary CTA | Keep one primary discovery action and one secondary creator/upload action | Visual hierarchy first |
| Featured video | Conditional section only for real, published featured content; define the empty state | No fake content |
| Latest video cards | Define poster, title, creator, duration/metadata, and card action | Real published data only |
| Categories | Derive public categories from valid metadata; remove Test from the public taxonomy | Approve final taxonomy |
| Creator cards/profile | Design public profile destinations; no links to private dashboards as public profiles | Trusted profile data |
| Follow creator | Defer from visible UI until persistence and authorization exist | No decorative follow control |
| Upload video | Show a clear entry point and sign-in return journey | Design first; activate later |
| My Account / My Videos | Define what each destination contains and how signed-out users are handled | Design first |
| Go Live | Defer or visibly mark unavailable unless the real live workflow is ready | Do not imply readiness |
| Quick Access duplicate grid | Remove by default because it repeats main navigation and CTA links | Reconsider only with evidence |
| Help / Contact / Privacy / Terms / Safety | Include in layout, but only link to real maintained pages | No placeholder routes |
| Loading / empty / error states | Design these as part of the page, not as afterthoughts | Include in preview |
| Mobile and desktop layouts | Produce both views; test overflow, touch targets, menu and content hierarchy | Required for approval |

### Current status
- **🟡 Design and inventory only.** The page preview has not been accepted by Ali yet.
- **🔴 Button-by-button implementation phase has not been authorized to start.**
- **🟢 Existing production/storage locks remain untouched.**
