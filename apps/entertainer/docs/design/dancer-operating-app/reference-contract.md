# Dancer operating app reference contract

## Authority and scope

- Primary reference: `concept-home-glass.png`. It governs the one-dominant-number Home hierarchy, open spacing, precise thin-line language, translucent surface treatment, and compact five-item navigation.
- State references: `concept-request.png`, `concept-active-service.png`, `concept-earnings.png`, and `concept-team.png`. Each governs only the named workflow state and reuses the Home system.
- Supplied finance screenshots are quality evidence for numeric hierarchy, analytics craft, transaction disclosure, and information density. They do not authorize copying Finwave branding, layouts, data, dark colors, or gradients.
- Product scope is Dancer and Senior Dancer only. Senior capability is a contextual extension of the personal app, not a separate manager product.

## Palette and glass treatment

- Canvas `#F4F6F8`, tinted canvas `#EEF2FF`, surface fallback `#FFFFFF`.
- Text `#18212B`, muted `#68727E`, border `#DEE3E8`.
- Primary `#4F46E5`, hover `#6366F1`, strong `#4338CA`, soft `#EEF2FF`, border `#C7D2FE`, focus `#818CF8`.
- Success `#247653`, danger `#B3424D`, amber only for a real warning.
- Glass is limited to self-contained work surfaces, navigation, sheets, and responsive shell. It uses translucent white, thin highlight edges, restrained blur, and one soft shadow model. Rows, earnings, timers, charts, and primary controls remain open or solid.
- Every glass selector has an opaque white fallback when `backdrop-filter` is unavailable.

## Visual grammar

- Noto Sans first; tabular numerals for money, time, countdowns, and scores.
- 4/8px spacing rhythm, 12px control radius, 16px work-surface radius, 20–22px only for navigation/sheets.
- 1px dividers, 1.5–2px icons/charts/active lines.
- Lucide is the single icon family already installed in the repository.
- No photos or lifestyle imagery. Initials are used for the prototype profile.
- Solid indigo primary buttons; no button gradients or neon glow.
- Motion is limited to countdown progress, loading, sheet appearance, and small disclosure movement; reduced-motion is respected.

## Product structure

- Shared shell: responsive workbench, bottom navigation on mobile/tablet, rail navigation on desktop.
- Main destinations: Нүүр, Хүсэлт, Хуваарь, Орлого, Профайл.
- Connected details: request detail, active service, completion, transaction, shift, rank, adjustment, notifications, loan request, team, rotation, and exception resolution.
- Senior access exposes operational status, rotation, and exceptions only. It excludes other dancers' earnings, private profiles, banking, and customer data.
- Destructive or irreversible decisions use a confirmation sheet. Offline request acceptance provides a recovery action through the persistent state and retry message.

## Acceptance evidence

- Reference viewport: 390×844 mobile.
- Required checks: 390×844, 768×1024, and 1440×900.
- Intentional deviations: the brief's dark-first request is replaced by the canonical VIP Club light-indigo system; the later explicit request authorizes restrained glassmorphism. The generated request/service concepts show slight button gradients, but implementation uses solid semantic indigo buttons. Rank labels follow the canonical `1-р/2-р/3-р зэрэг` business model instead of Bronze/Silver/Gold examples.

## Home analytics-card addendum · 2026-08-24

- Primary reference: `codex-clipboard-2526209f-92f9-4072-becd-b22872e0ddd4.png`. It governs the varied card rhythm, chart-led decorative language, compact circular disclosure control, and one stronger focal card.
- Preserve: the current Mongolian labels, real navigation targets, existing data hierarchy, Lucide control icons, semantic VIP Club accents, light/dark themes, and glass fallback.
- Adapt: the reference's neon yellow becomes one coordinated VIP Club indigo family. Cards differ through the official `#4F46E5`, `#6366F1`, `#818CF8`, and `#A5B4FC` ramp plus icon and chart shape—not unrelated semantic hues. Dashboard decorations remain truthful, non-interactive Recharts mini analytics: bars for earnings, rings for attendance/rank, a four-segment request-type ring, an area pulse for notifications, and selectable repayment-rate bars for loan.
- Do not copy: the source product identity, perspective presentation, neon-yellow primary chrome, English labels, or unrelated marketing metrics.
- Acceptance checks: the six task-critical Home cards remain scannable at 390×844; mini charts never obscure values or labels; light and dark text contrast remain readable; 768×1024 and 1440×900 layouts have no overlap or horizontal overflow; existing card click targets and destinations remain unchanged; the loan card opens a consent-based request flow that separates maximum request amount, current balance, repayment rate, and decision status.
