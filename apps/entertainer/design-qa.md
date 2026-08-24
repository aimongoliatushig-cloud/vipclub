# VIP Club Home and Earnings analytics-card design QA

## Visual truth

- Source visual truth path: `C:\Users\User\AppData\Local\Temp\codex-clipboard-2526209f-92f9-4072-becd-b22872e0ddd4.png`
- Final dark desktop implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-dark-1440-fixed.png`
- Final dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-without-team-dark-390.png`
- Final light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-without-team-light-390.png`
- Loan card dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-loan-dark-390.png`
- Loan flow dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-loan-dark-390.png`
- Loan submitted-state light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-loan-light-390.png`
- Loan card light tablet implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-loan-light-768.png`
- Loan card dark desktop implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-loan-dark-1440.png`
- Minimal lower-card dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-minimal-dark-lower-390.png`
- Minimal lower-card light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-minimal-light-lower-390.png`
- Unified indigo-family dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-unified-indigo-dark-390.png`
- Unified indigo-family light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-unified-indigo-light-390.png`
- Earnings rounded-bar dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-earnings-bars-dark-390.png`
- Earnings rounded-bar light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-earnings-bars-light-390.png`
- Simplified Earnings summary dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-earnings-summary-dark-390.png`
- Simplified Earnings summary light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-earnings-summary-light-390.png`
- Language settings Mongolian dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-language-settings-mn-dark-390.png`
- Language settings Russian dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-language-settings-ru-dark-390.png`
- Language settings Russian light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-language-settings-ru-light-390.png`
- Clean Profile without duplicate appearance or prototype-role controls: `C:\Users\User\Desktop\vip club\entertainer-app\qa-profile-clean-dark-390.png`
- Dark Profile menu icon treatment: `C:\Users\User\Desktop\vip club\entertainer-app\qa-profile-icons-dark-390.png`
- Home without duplicate notification card, dark mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-without-notification-card-dark-390.png`
- Home without duplicate notification card, light mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-without-notification-card-light-390.png`
- Rank history rounded-bar chart, dark mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-rank-history-chart-dark-390.png`
- Rank history rounded-bar chart, light mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-rank-history-chart-light-390.png`
- Full Monday–Sunday schedule, dark mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-schedule-weekdays-dark-390.png`
- Full Monday–Sunday schedule, light mobile: `C:\Users\User\Desktop\vip club\entertainer-app\qa-schedule-weekdays-light-390.png`
- Home attention card dark mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-attention-dark-390.png`
- Home attention card light mobile implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-attention-light-390.png`
- Final light tablet implementation: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-light-768-final.png`
- Final same-input comparison: `C:\Users\User\Desktop\vip club\entertainer-app\qa-home-reference-comparison-final.png`

## Capture normalization

- Source: 1024 × 768 px at 1×. It is a perspective desktop-dashboard reference, not a 1:1 product viewport.
- Dark mobile: requested 390 × 844 CSS px at device pixel ratio 1; captured content is 375 × 812 px because the in-app browser excludes its scrollbar/chrome gutter.
- Light tablet: requested 768 × 1024 CSS px at device pixel ratio 1; captured content is 753 × 1004 px after the same gutter exclusion.
- Dark desktop: requested 1440 × 900 CSS px at device pixel ratio 1; captured content is 1425 × 891 px after the scrollbar/chrome gutter.
- Comparison input: source normalized to 960 × 720 px and implementation normalized to 1152 × 720 px, placed together in one 2144 × 720 px canvas without changing either crop's aspect ratio.
- State: Dancer Home, Nomad shift, dark theme for the primary comparison, four unread notifications, request state allowed to progress from live countdown to its honest empty-history state.

## Full-view comparison evidence

- The source and final dark desktop capture were opened together in `qa-home-reference-comparison-final.png`.
- Both show a near-black dashboard, a stronger focal metric card, varied compact secondary cards, circular disclosure controls, and functional chart art integrated into card surfaces.
- The implementation adapts the source's neon focal system into one VIP Club indigo family. Cards remain distinct through the `#4F46E5`–`#A5B4FC` shade ramp, icon metaphors, and different chart shapes rather than unrelated green, cyan, rose, and purple hues.
- The source's English commerce metrics, perspective frame, and neon-yellow product identity were intentionally not copied. Current Mongolian labels, routes, semantic states, and the VIP Club indigo theme remain authoritative.

## Focused region comparison evidence

- A separate crop was not required: the 2144 × 720 comparison keeps the complete source card row and the implementation's full Home workbench large enough to inspect typography, chart shapes, card borders, radii, spacing, and control icons.
- The final mobile and tablet captures were opened separately only for responsive verification, not treated as the primary visual comparison.

## Required fidelity surfaces

- Fonts and typography: Noto Sans renders Mongolian Cyrillic correctly; tabular money/time values keep the source's strong numeric hierarchy. Card titles, values, details, and metadata remain distinct, with no clipping or accidental truncation at tested widths.
- Spacing and layout rhythm: 12 px grid gaps, 16 px card padding, 168 px secondary-card minimum height, 204 px focal-card height, 18 px radii, circular disclosure controls, and consistent chart slots reproduce the source's roomy, composed card rhythm.
- Colors and visual tokens: the implementation uses the canonical deep-indigo, indigo, periwinkle, and lavender ramp on semantic glass surfaces. Dark mode stays near-black with white text; light mode uses calm tinted surfaces with charcoal text. Card meaning is distinguished by labels, icons, and chart shape—not color alone.
- Image quality and asset fidelity: the source contains no reusable raster asset for this product. Mini analytics are rendered with the installed Recharts library instead of custom SVG, CSS art, emoji, or placeholder imagery; standard controls use the existing Lucide family.
- Copy and content: concise Mongolian copy remains task-specific and truthful. Secondary Home cards show only their title, primary value, and one short status/action line; shift time, score gap, routing guidance, and repayment detail are deferred to the connected screen. Chart art reinforces the meaning without inventing new user-facing metrics.

## Responsive, accessibility, and interaction QA

- 390 × 844 dark: the six task-critical cards render in the approved hierarchy, no card reports internal horizontal overflow, document width stays within the content viewport, and the page scrolls vertically to the fixed five-item navigation.
- 768 × 1024 light: all card art renders after layout observation settles; no card or document horizontal overflow is present.
- 1440 × 900 dark: persistent side navigation and centered workbench retain the two-column card hierarchy; the taller content scrolls vertically without hiding navigation.
- Earnings uses the same rounded indigo bar language as the Home earnings card. Day, 7-day, and month controls refresh seven discrete values; the latest value is emphasized, earlier values remain quieter, and the layout has no horizontal overflow in dark/light mobile or dark desktop checks.
- The Earnings summary shows `Гарт авах дүн` once. `Орлого` and `Суутгал` remain as one compact calculation row, and that row preserves direct access to the detailed deduction screen without repeating the net amount in another card.
- Profile → Settings now exposes persistent Mongolian, English, and Russian language choices with device-independent inline flag artwork. The selected language immediately updates the Settings, Profile, shared navigation, theme controls, document language, and app label; reload persistence and Russian long-label overflow were checked at 390, 768, and 1440 widths.
- Profile no longer duplicates the appearance control or exposes the prototype-only role preview. Both are absent from Profile; appearance remains available once inside Settings alongside language.
- Dark Profile menu icons now share the semantic indigo surface, border, and foreground tokens instead of carrying the light theme's pale gray blocks into dark mode. All four repeated icons match; the light theme treatment remains unchanged, and no horizontal overflow appears at 390, 768, or 1440 widths.
- Home no longer repeats notifications as a full analytics card. The header bell remains the single notification entry point, keeps the unread indicator, and was click-tested through the Notifications screen and back to Home. The remaining five cards reflow without a half-row gap: `Хүсэлт` and `Зээл` now use full-width rows, with no horizontal overflow in dark/light mobile or desktop checks.
- Rank history is now a five-day rounded bar comparison on an honest 0–100 scale. Exact scores are printed above each bar; the missed day is labeled `0`, approved leave is labeled `—` and excluded from the average, and the legend distinguishes confirmed, missed, and leave states without relying on color alone. Dark/light renders and 390, 768, and 1440 widths were checked with no horizontal overflow.
- The weekly schedule now presents every localized weekday from `Даваа` through `Ням`, paired with its date. Monday, Wednesday, and Friday retain their real shift time, branch, status, and detail navigation; Tuesday, Thursday, Saturday, and Sunday are truthfully marked `Амралт · Ээлжгүй`. Today mode stays focused on Monday only. Dark/light mobile, tablet, and desktop layouts were checked without horizontal overflow.
- Home ends with one compact `Анхаарах зүйлс` card containing two truthful next steps: reduce lateness by opening Attendance and improve the 78-point daily opening factor by opening Rank. Both routes, bottom-navigation clearance, and dark/light responsive layouts were verified.
- Card controls remain semantic buttons with descriptive `aria-label` text, visible focus treatment, and minimum 44 px targets.
- Clicking the earnings card was verified in the browser and opened `#earnings` with `data-screen="earnings"`.
- Clicking the loan card was verified in the browser and opened `#loan` with `data-screen="loan"`. The submit action remained disabled until a valid amount, repayment rate, purpose, and explicit terms acceptance were present; submission then updated both the request status and Home card.
- No visible Vite error overlay or alert dialog was present in the final browser pass.
- `npm run lint`, `npm run build`, and all 57 automated tests passed. The existing unresolved `/staff/design/staff-pwa-concept.png` build warning and existing large-chunk advisory remain unrelated to these UI changes.

## Comparison history

1. Initial comparison found a P2 fidelity issue: the Home cards relied on one oversized low-opacity Lucide watermark, so every module read as the same surface and lacked the reference's varied analytic art.
2. Replaced the watermarks with truthful Recharts mini analytics, strengthened the focal earnings surface, coordinated the purple/cyan/emerald/rose palette, and changed disclosure chevrons into compact circular controls.
3. The first responsive capture found a P2 layout issue: a higher-specificity `#root button` rule overrode the intended card minimum heights, compressing the card rhythm and placing the mobile earnings bars too close to the amount.
4. Added scoped card-height specificity and a mobile-only focal chart width/type adjustment. Recaptured dark mobile, light tablet, and dark desktop states.
5. Opened the updated source/implementation comparison together. The earlier P2 findings are resolved; no new actionable P0/P1/P2 issue remains.
6. Unified all Home accents into the canonical indigo ramp while preserving card differentiation through shade, icon, and chart shape; rechecked dark/light mobile and dark desktop layouts.
7. Replaced the Earnings line chart with seven rounded indigo bars, added a visible period heading, and highlighted the latest value so the detailed screen follows the Home chart language.
8. Removed the duplicate net-income card and condensed gross income plus deductions into one quiet, tappable calculation row beneath the single primary amount.
9. Added a dedicated language Settings route with persistent Mongolian, English, and Russian choices, real flag artwork, localized Profile/navigation chrome, and light/dark responsive verification.
10. Removed the duplicated appearance row and the prototype-only role preview from Profile; retained appearance only in Settings and verified the Profile → Settings path.
11. Added a compact Home attention card with two evidence-backed, directly actionable rows for lateness and the daily opening score; verified both destinations and responsive placement.
12. Replaced the four washed-out dark Profile icon blocks with one shared indigo-tinted treatment, stronger outline contrast, and consistent hover/focus feedback while preserving the light theme.
13. Removed the duplicated Home notification analytics card, kept notification access and unread state in the header bell, and widened the lone request card so the five-card grid has no empty cell.
14. Replaced the rank-history text rows with a five-day, exact-labeled rounded bar chart that exposes the confirmed scores, zero-score absence, and average-excluded approved leave on one comparable scale.
15. Replaced the shift-only week list with a complete localized Monday–Sunday schedule, preserving shift-detail actions on working days and explicitly showing honest rest-day states on the other four days.

## Findings

- No actionable P0/P1/P2 visual, responsive, accessibility, content, or interaction issue remains.
- Acceptable intentional deviation: the source's neon yellow and perspective product render are replaced by VIP Club semantic accents and a straight-on operational workbench.
- P3 follow-up polish: a future motion pass could add a very restrained chart reveal while respecting `prefers-reduced-motion`; it is not required for the current static card fidelity.

final result: passed
