# VIP Club product and UI rules

These rules apply to every user-facing web app in this workspace unless the user explicitly requests a different direction.

The canonical color and component guidance is in `UI_UX_DESIGN_SYSTEM.md`. New UI work must follow it.

## Visual direction

- Use a light, calm workbench aesthetic for internal tools. Prefer cool off-white page backgrounds, white work surfaces, charcoal text, a restrained indigo accent, and subtle gray dividers.
- All employee-facing apps and roles—including CEO, branch manager, HR, entertainer, lead entertainer, guard, operator, and other staff—must share one indigo brand system. Use `#4F46E5` for the primary accent, `#4338CA` for strong/interactive states, `#6366F1` for hover, `#EEF2FF` for selected or tinted surfaces, `#C7D2FE` for accent borders, and `#818CF8` for focus rings. Do not introduce role-specific primary colors.
- The former golden-yellow UI palette (`#B6892F`, `#77591E`, `#FBF6E9`, `#EAD9A9`) is deprecated. Do not use it for navigation, primary actions, focus, links, selected states, progress, or new components. Metallic bronze, silver, gold, and diamond colors are allowed only inside rank artwork or when the data itself represents that rank.
- Do not use a dark theme by default. A dark theme is allowed only when the user explicitly asks for it for a specific surface.
- Premium means precise typography, generous whitespace, clear alignment, strong information hierarchy, and subtle elevation. It does not mean decoration.
- Avoid AI-slop patterns: gradients, glassmorphism, glows, excessive rounded cards, bento grids, oversized headings, fake metrics, ornamental badges, pill overload, and repeated nested containers.
- Use cards only for genuinely self-contained objects. Prefer clean lists and tables for employees, schedules, transactions, and other dense operational data.
- Follow a 4px/8px spacing grid. Interactive controls must have at least a 44px touch target.

## Color implementation

- New CSS must use semantic tokens such as `--primary`, `--primary-hover`, `--primary-strong`, `--primary-soft`, `--primary-border`, and `--focus-ring`. Do not add new `--gold*` aliases.
- When editing an older surface that still has yellow/gold UI chrome, migrate the touched controls to the shared indigo tokens in the same change.
- Light is the default theme. In dark mode use `#6366F1` primary, `#818CF8` hover/focus, `#A5B4FC` strong text, `rgb(99 102 241 / 14%)` soft surfaces, and `rgb(129 140 248 / 34%)` borders.
- Status colors remain semantic: green for success, red for danger, amber only for a real warning, and blue only for explicitly informational data. Status must never be communicated by color alone.

## Content and interaction

- Write concise, grammatically correct Mongolian with the clearest everyday term available. Remove filler copy and instructions that do not help the current action.
- Show the essential information first and reveal supporting detail only on demand.
- Keep one primary action per view. Secondary actions must be visually quieter.
- Every interactive element needs clear hover, active, focus-visible, loading, disabled, success, and error behavior where applicable.
- Use a Mongolian Cyrillic-compatible sans-serif font for product UI. Decorative serif type may be used sparingly for brand moments, never for dense operational content.

## Data hierarchy

- Confirmed employee master data is the default employee view.
- Finex-derived names that do not match the employee master are a separate secondary review queue. Never present them as confirmed employees.
- A review decision must not silently create a login or a new employee master record unless that behavior is explicitly designed and approved.
- Labels must distinguish verified data, imported data, inferred data, and unresolved data.

## Responsive QA

- Design desktop and mobile layouts together. Do not compress a desktop table until it becomes unreadable; use purpose-built mobile rows/cards with the same information hierarchy.
- Verify at minimum: 390x844 mobile, 768x1024 tablet, and 1440x900 desktop.
- Check long Mongolian labels, iPhone safe areas, keyboard focus, overflow, sticky navigation, empty states, loading states, and error states before deployment.

## Repository delivery workflow

- Linear is the source of truth for scope, priority, owner, status, acceptance criteria, and delivery evidence. GitHub is the source of truth for code and review history.
- Local work must be synchronized into this repository's matching `apps/*` path. A production change must never exist only on a workstation or server.
- The user's default working branch is `nymka`. Use `battushig` only for Battushig-owned work. Do not commit directly to `main` or `develop`.
- Open pull requests from the owner's branch into `develop`. Promote tested, approved work from `develop` to `main` for production.
- Include the Linear issue identifier in commits and pull requests. Move work through `Todo` → `In Progress` → `In Review` → `Done`; mark it `Done` only after the required verification and deployment evidence are recorded.
- Follow `CONTRIBUTING.md` for the exact local-to-repository mapping and delivery steps.
