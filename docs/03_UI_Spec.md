# Ollyo FC — UI specification

Two layers exist. Shell chrome (top bar, auth card, page background) uses the hex tokens in `src/scss/variables.scss`. Component colors use the shadcn tokens in `src/scss/styles.css`. Those tokens are authored in OKLCH. The hex values below are the sRGB conversion of those OKLCH numbers. When you change a color, edit the source token, not a one-off hex in a component.

There is no theme toggle. The app renders the light tokens. The `.dark` block is reserved and unused. The top bar is always the dark shell color, in both cases.

## Color

### Shell (`variables.scss`)

| Token | Hex | Use |
| --- | --- | --- |
| `$color-text` | `#111827` | Legacy body text |
| `$color-muted` | `#9ca3af` | Legacy muted text |
| `$color-helper` | `#4b5563` | Helper text |
| `$color-error` | `#dc2626` | `.error-text` |
| `$color-page` | `#f3f4f6` | Page wash behind the shell |
| `$color-surface` | `#ffffff` | Cards and sheets |
| `$color-topbar` | `#111827` | Header background |
| `$color-topbar-text` | `#ffffff` | Header text and icons |
| `$color-border` | `#e5e7eb` | Legacy borders |
| `$color-row` | `#f9fafb` | Zebra and hover wash |
| `$color-avatar` | `#dbeafe` | Fallback avatar fill |
| `$color-avatar-text` | `#1d4ed8` | Fallback avatar letter |
| `$color-primary` | `#2563eb` | Legacy primary. Prefer the shadcn `primary` token in new UI. |
| `$color-secondary` | `#e5e7eb` | Legacy secondary fill |
| `$color-welcome` | `#eff6ff` | Soft blue panel |
| `$color-shadow` | `rgba(15, 23, 42, 0.12)` | Card shadow |

Header controls on the top bar use `bg-white/15`, hover `bg-white/30`, active nav `bg-white/20`, inactive label `text-white/80`.

### shadcn light (`:root`)

| Token | OKLCH | Hex |
| --- | --- | --- |
| `--background`, `--card`, `--popover` | `oklch(1 0 0)` | `#ffffff` |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `oklch(0.145 0 0)` | `#0a0a0a` |
| `--primary`, `--primary-foreground` inverted pair | primary `oklch(0.205 0 0)`, foreground `oklch(0.985 0 0)` | `#171717` on `#fafafa` |
| `--secondary`, `--muted`, `--accent` | `oklch(0.97 0 0)` | `#f5f5f5` |
| `--secondary-foreground`, `--accent-foreground` | `oklch(0.205 0 0)` | `#171717` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#e7000b` |
| `--border`, `--input` | `oklch(0.922 0 0)` | `#e5e5e5` |
| `--ring` | `oklch(0.708 0 0)` | `#a1a1a1` |
| `--sidebar` | `oklch(0.985 0 0)` | `#fafafa` |
| `--chart-1` … `--chart-5` | lightness `0.87`, `0.556`, `0.439`, `0.371`, `0.269` | `#d4d4d4`, `#737373`, `#525252`, `#404040`, `#262626` |

### shadcn dark (defined, not applied)

| Token | OKLCH | Hex |
| --- | --- | --- |
| `--background` | `oklch(0.145 0 0)` | `#0a0a0a` |
| `--foreground` | `oklch(0.985 0 0)` | `#fafafa` |
| `--card`, `--popover` | `oklch(0.205 0 0)` | `#171717` |
| `--primary` | `oklch(0.922 0 0)` | `#e5e5e5` |
| `--primary-foreground` | `oklch(0.205 0 0)` | `#171717` |
| `--secondary`, `--muted`, `--accent` | `oklch(0.269 0 0)` | `#262626` |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#a1a1a1` |
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#ff6467` |
| `--border` | `oklch(1 0 0 / 10%)` | white at 10% |
| `--input` | `oklch(1 0 0 / 15%)` | white at 15% |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` | `#1447e6` |

Do not add a dark toggle until header, poster, and fireworks colors are checked against these tokens.

### Accent colors that are not tokens

Winner ring: `#f43f5e`, `#f59e0b`, `#22c55e`, `#38bdf8`, `#a855f7`, `#ec4899`, returning to `#f43f5e`. Spin is 2.8s linear infinite.

## Typography

- Family: Geist Variable, loaded from `@fontsource-variable/geist`, set as `--font-sans` on `html`.
- Legacy shell fallback: Inter, system-ui, Segoe UI, sans-serif. Do not introduce a third family.
- Page title: `text-2xl font-bold tracking-tight`.
- 404 title: `text-3xl font-bold`.
- Section title: `text-lg font-semibold`.
- Body and nav: `text-sm`.
- Meta and hints: `text-xs text-muted-foreground` or `text-sm text-muted-foreground`.
- Stat value: `text-2xl font-semibold`.
- Points: one decimal in the UI, via `formatCareerPoints`. Do not round to an integer.

## Spacing and layout

Tailwind's default 4px scale is the spacing system. Do not invent a parallel scale.

| Use | Class or value |
| --- | --- |
| Header padding | `0.75rem 1rem`, and from 640px `1rem 2rem` |
| Page padding | `p-4 sm:p-6` |
| Stack gap | `gap-6` between sections, `gap-4` inside grids, `gap-1` in nav |
| Home content width | `max-w-4xl` |
| Dashboard and wide tables | `max-w-6xl` |
| Auth card | `max-w-md` |
| Sidebar | `w-64`, hidden below `md` |
| Control height in the header | `h-8` |
| Card | `rounded-xl border bg-background p-4` or `p-5`, `shadow-sm` |
| Breakpoint | `640px` (`sm`). Sidebar appears at `md` (768px). |

## Radius

shadcn base `--radius` is `0.625rem` (10px).

| Token | Value |
| --- | --- |
| `--radius-sm` | `0.375rem` |
| `--radius-md` | `0.5rem` |
| `--radius-lg` | `0.625rem` |
| `--radius-xl` | `0.875rem` |
| Shell `$radius-sm` … `$radius-xl` | `10px`, `12px`, `14px`, `18px` |

Buttons and nav pills use `rounded-lg`. Cards use `rounded-xl`.

## Core component states

Use `src/components/ui` (shadcn) before adding a new control. Buttons come from `Button` and `buttonVariants`. Feedback uses `react-hot-toast`.

| Component | Default | Hover / focus | Disabled | Loading | Error |
| --- | --- | --- | --- | --- | --- |
| Button | `variant` default is primary fill, primary foreground | opacity and background from the variant | `disabled`, no pointer | `Loader2Icon` with `animate-spin` plus the progress label. Keep the button disabled. | Do not paint the button red. Put the message in a toast or `.error-text`. |
| Header button | `bg-white/15 text-white` | `bg-white/30` | same as Button | same | same |
| Nav link | muted or white at 80% | muted wash or white at 15% | n/a | n/a | n/a |
| Active nav | `bg-primary text-primary-foreground` in the sidebar. `bg-white/20 text-white` in the header. | stays active | n/a | n/a | n/a |
| Input | border `--input`, radius lg | ring `--ring` at 50% | reduced opacity | n/a | toast or helper text under the field. Do not invent a second error color. |
| Badge | status label from `GAME_STATUS_LABELS` | n/a | n/a | n/a | n/a |
| Avatar | image, else one initial on `#dbeafe` / `#1d4ed8` | n/a | n/a | n/a | broken image falls back to the initial |
| Dialog | existing shadcn dialog | overlay click closes when the dialog allows it | primary action disabled until the form is valid | spinner on the submit button | toast, dialog stays open |
| Table row | default | `hover:bg-muted/60` when the row is a link | cancelled game rows are not links | "Loading…" copy spans the row | error copy replaces the body |
| Toast | hot-toast default | n/a | n/a | n/a | `toast.error` with the server or rules message |

Empty copy is specified in `02_AppFlow.md`. Do not replace it with a blank container or a new illustration unless the product owner asks.

## Motion

- Winner ring rotates 360deg in 2.8s, linear, infinite.
- Toss coin eases out over 5000ms (`TOSS_DURATION_MS`). The landing face is team A at 0deg and team B at 180deg, plus full spins.
- Spinners use `animate-spin` only on the icon, not on the page.
