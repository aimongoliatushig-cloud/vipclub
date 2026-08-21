# VIP Club UI/UX Design System

Status: active · Updated 2026-08-20

This is the canonical visual rule for CEO, manager, entertainer, lead entertainer, HR, guard, operator, and every other employee-facing application.

## Direction

- Default theme is light: cool off-white canvas, white work surfaces, charcoal text, subtle gray borders, and one restrained indigo accent.
- All roles use the same visual language. Do not create role-specific primary palettes.
- Premium means clear hierarchy, precise alignment, readable typography, generous whitespace, and subtle elevation—not decorative effects.
- Dark mode is optional and user-controlled. It uses slate surfaces with the same indigo identity.

## Active color tokens

| Semantic token | Light value | Use |
| --- | --- | --- |
| `--canvas` | `#F4F6F8` | App/page background |
| `--surface` | `#FFFFFF` | Main work surface |
| `--surface-subtle` | `#F8FAFB` | Quiet grouped surface |
| `--ink` | `#18212B` | Primary text |
| `--muted` | `#68727E` | Secondary text |
| `--border` | `#DEE3E8` | Neutral divider and border |
| `--primary` | `#4F46E5` | Primary action and active indicator |
| `--primary-strong` | `#4338CA` | Interactive text and pressed state |
| `--primary-hover` | `#6366F1` | Hover state |
| `--primary-soft` | `#EEF2FF` | Selected navigation and tinted surface |
| `--primary-border` | `#C7D2FE` | Selected/accent border |
| `--focus-ring` | `#818CF8` | Keyboard focus ring |
| `--success` | `#247653` | Confirmed success |
| `--danger` | `#B3424D` | Error/destructive action |

Dark theme overrides:

- `--primary: #6366F1`
- `--primary-hover: #818CF8`
- `--primary-strong: #A5B4FC`
- `--primary-soft: rgb(99 102 241 / 14%)`
- `--primary-border: rgb(129 140 248 / 34%)`

## Deprecated yellow/gold UI

The old UI palette below is deprecated:

- `#B6892F`
- `#77591E`
- `#FBF6E9`
- `#EAD9A9`

Do not use these colors for navigation, primary buttons, links, focus, selected tabs, progress, avatars, informational cards, or newly built components. Do not add new `--gold*` CSS variables; use the semantic `--primary*` tokens.

Bronze, Silver, Gold, and Diamond metallic colors are allowed only when the data itself represents that rank or inside the official rank image asset. Rank artwork must not change the surrounding application chrome.

## Component rules

- One primary action per view; secondary actions use neutral surfaces.
- Controls are at least 44px high and use clear hover, pressed, focus-visible, disabled, loading, success, and error states.
- Use a 4px/8px spacing grid. Default control radius is 10–12px; self-contained work surfaces may use 16px.
- Prefer lists and tables for operational data. Avoid nested cards, pill overload, gradients, glow, glassmorphism, and ornamental decoration.
- Use Noto Sans or another Mongolian Cyrillic-compatible sans-serif.
- Status colors remain semantic: green for success, red for danger, amber only for a real warning, and blue only for explicitly informational data. Always include a text label or icon; never rely on color alone.

## Product copy and source-system names

- User-facing UI must describe the task, record state, and next action in plain Mongolian.
- Do not show implementation or integration names such as `ERPNext` or `Finex` unless the user explicitly asks for that system name on the specific surface.
- Prefer role-appropriate labels such as “Баталгаажсан мэдээлэл”, “Импортолсон мэдээлэл”, “Менежерийн бүртгэл”, “Төлбөрийн баримт”, or “POS борлуулалт”.
- Technical source names may remain in audit logs, administrator diagnostics, integration settings, and developer documentation; they must not leak into ordinary employee workflows.
- If data provenance matters to a decision, show a concise data-state label (verified, imported, inferred, unresolved) instead of a vendor/product name.

## Entertainer daily rank surface

- The primary view is one summary, never a rank carousel: `Нийт дундаж оноо`, `Одоогийн зэрэг`, `Мөрдөх хувь`, counted days, and the next attainable rank.
- Every entertainer starts at 3-р зэрэг. There is no Rookie rank and a low daily score cannot create a fourth rank.
- The next-rank line must state the exact threshold and missing score in everyday Mongolian, for example `2-р зэрэг · 80 оноо` and `6.84 оноо дутуу`.
- The rank score is the lifetime average of finalized attendance days. A present day contributes its finalized eight-factor score; a confirmed absence contributes one `0` day; approved leave and incomplete days do not enter the average.
- A confirmed absence must not receive default scores for skill, appearance, personal development, attitude, or stage rounds.
- If the new average changes the rank, apply the new rank and payout from the following calendar day. Never present tomorrow's payout as today's payout.
- Reveal the eight-factor calculation under `Оноо хэрхэн бодогдов?`; keep data verification and target achievement as separate labels.
- Keep history under `Өмнөх өдрүүдийн оноо` and all thresholds under one secondary `Дүрэм` control.
- Do not show cumulative sales points, internal source names, approval workflow, or implementation copy on the rank screen.

## Migration rule

When an older screen is edited, migrate every touched yellow/gold UI control on that screen to the shared indigo tokens. Do not mix the old and new palettes inside one workflow.

## Responsive QA

Verify every changed screen at 390×844, 768×1024, and 1440×900. Check Mongolian labels, focus states, overflow, sticky navigation, empty/loading/error states, and touch targets before deployment.
