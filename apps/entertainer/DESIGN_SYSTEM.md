# VIP Club Staff — Premium light workbench

Reference concepts:

- `outputs/ui-concepts/staff-premium-workbench-dashboard-v2.png`
- `outputs/ui-concepts/staff-premium-workbench-people-review-v2.png`

## Direction

- Build a calm, premium operations workbench, not a nightclub marketing page.
- Premium comes from proportion, typography, alignment, whitespace, restrained indigo details, and subtle elevation.
- Use verified employee records as the primary view. Keep unresolved Finex names in a separate review queue.
- Show essential status and action first; reveal detail only when the user asks for it.
- Keep manager and entertainer information role-scoped.
- Demo records must always be marked `DEMO` and never presented as real employees.

## Tokens

- Canvas: `#F4F6F8`
- Surface: `#FFFFFF`
- Subtle surface: `#F8FAFB`
- Primary text: `#18212B`
- Muted text: `#68727E`
- Border: `#DEE3E8`
- Primary indigo: `#4F46E5`
- Strong indigo: `#4338CA`
- Hover indigo: `#6366F1`
- Indigo tint: `#EEF2FF`
- Indigo border: `#C7D2FE`
- Focus ring: `#818CF8`
- Success: `#247653`
- Danger: `#B3424D`
- Soft elevation: `0 1px 2px rgb(23 31 42 / 5%), 0 16px 40px -28px rgb(23 31 42 / 28%)`

The previous gold UI tokens (`#B6892F`, `#77591E`, `#FBF6E9`, `#EAD9A9`) are deprecated. New and touched components must use semantic `--primary*` indigo tokens. Bronze, silver, gold, and diamond colors belong only to rank artwork or rank-specific data—not general UI chrome.

Typography uses Noto Sans for Mongolian Cyrillic. Use 700–800 weight only for real hierarchy; body copy remains 400–600 at 1.5–1.6 line height.

## Layout and interaction

- Use a 4px/8px spacing grid. Common values: 8, 12, 16, 24, 32, 48, 64.
- Touch targets are at least 44px high.
- Controls use 10–12px radius; self-contained work surfaces use 16px.
- Prefer clean tables and lists to repeated cards for operational data.
- Desktop uses a persistent left navigation rail. Tablet and mobile use safe-area-aware bottom navigation.
- Mobile layouts are purpose-built and reordered; desktop tables must never be merely squeezed.
- Use one elevated priority surface per view. Avoid gradients, glow, glassmorphism, bento grids, nested card stacks, and badge overload.
- Every interaction needs hover, pressed, focus-visible, disabled, loading, success, and error states where relevant.
- Motion is limited to subtle state transitions and is disabled by `prefers-reduced-motion`.
