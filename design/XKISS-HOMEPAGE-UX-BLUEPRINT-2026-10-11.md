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
