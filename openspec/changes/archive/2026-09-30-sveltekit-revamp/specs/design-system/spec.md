# Spec Delta

## Purpose
Establishes the design tokens, typography scale, component styling conventions, dark mode transitions, and subtle motion foundations for the application interface in both light and dark themes.

## ADDED Requirements

### Requirement: Color Tokens and Palette Resolution
The design system MUST define a warm monochrome color palette derived from warm stone neutral tones, exposed through semantic CSS custom properties that adapt to active light and dark themes.

- Light theme surface background MUST resolve to an ultra-light warm stone tint (`stone-50` equivalent), with foreground text resolving to deep warm charcoal (`stone-900` equivalent).
- Dark theme surface background MUST resolve to deep warm charcoal/black (`stone-950` equivalent), with foreground text resolving to warm off-white (`stone-100` equivalent).
- Muted surfaces, card backgrounds, borders, and input fields MUST utilize stepped stone tonal shades (`stone-100` through `stone-800`) to maintain clear hierarchy without saturated colors.
- Component borders MUST use subtle `1px solid` dividers with muted opacity rather than heavy decorative outlines.

#### Scenario: Color token resolution in light mode
- **WHEN** the application is rendered in light mode
- **THEN** the root background token resolves to warm off-white, card surfaces resolve to pure white or light stone, and primary text resolves to deep warm stone charcoal.

#### Scenario: Color token resolution in dark mode
- **WHEN** the application is rendered in dark mode
- **THEN** the root background token resolves to dark warm stone, card surfaces resolve to elevated stone dark tones, and primary text resolves to warm off-white.

---

### Requirement: Typography Scale and Hierarchy
The design system MUST provide a three-tier typographic hierarchy combining editorial serif headings, geometric sans-serif body text, and monospaced metadata text.

- Display and section headings (h1, h2, h3) MUST render with an editorial serif font family with tight letter tracking (`tracking-tight`) to evoke a clean, editorial look.
- Body copy, labels, table cells, form controls, and descriptive text MUST render with a clean geometric sans-serif font family.
- Code snippets, AWS resource identifiers, task definition revisions, ARNs, timestamps, and numeric metrics MUST render with a monospaced font family for alignment and readability.

#### Scenario: Typography rendering across hierarchy tiers
- **WHEN** a page renders with page titles, section descriptions, and resource identifiers
- **THEN** page titles render in serif font with tight tracking, body descriptions render in geometric sans-serif, and resource identifiers render in monospace.

---

### Requirement: Component Styling and Flat Card Containers
Components MUST follow an ultra-flat design aesthetic featuring flat cards, crisp border radii, and generous whitespace.

- Cards and panels MUST use flat surface backgrounds, `1px solid` border dividers, and subtle or zero box-shadows.
- Interactive cards and containers MUST feature crisp border radius sizing within the 8px to 12px range (`rounded-lg` or `rounded-xl`).
- Containers MUST enforce generous internal padding (minimum 16px to 24px) and layout gutters to create breathable whitespace.
- Container layouts MUST adhere to a responsive bento grid structure constrained within a maximum content container width (such as `max-w-5xl` or `max-w-6xl`).
- Elements MUST NOT feature bright saturated background gradients, drop shadows, or pill-shaped container badges.

#### Scenario: Card presentation and container borders
- **WHEN** a summary card or content section is displayed
- **THEN** the container renders with a flat surface, 1px subtle border, 8-12px border radius, generous internal padding, and no heavy drop shadow or colorful gradient background.

---

### Requirement: Semantic Status Colors
The design system MUST provide semantic status colors for service health, operation outcomes, and alert states that remain consistent across both light and dark modes.

- Healthy or running status MUST use emerald green tokens for text, indicators, and subtle translucent badge backgrounds.
- Warning, transitioning, or degraded status MUST use amber tokens for text, indicators, and subtle translucent badge backgrounds.
- Critical, failed, or stopped status MUST use red tokens for text, indicators, and subtle translucent badge backgrounds.
- Status badges MUST maintain WCAG AA contrast against their respective card and page surfaces in both light and dark modes without altering the core hue.

#### Scenario: Status badge coloring
- **WHEN** a service status badge is displayed with "Healthy", "Warning", or "Critical" state
- **THEN** "Healthy" renders in emerald, "Warning" renders in amber, and "Critical" renders in red across both light and dark themes.

---

### Requirement: Dark Mode Switching and Preference Synchronization
The interface MUST support switching between light and dark themes, supporting explicit user toggling as well as automatic matching of system preferences.

- The system MUST detect the user's OS color scheme preference (`prefers-color-scheme`) on initial load when no manual override is stored.
- The user MUST be able to manually toggle between light and dark themes through an interface toggle.
- When the theme is manually changed, the user preference MUST persist across reloads and navigation.
- Theme transitions MUST smoothly swap CSS custom property values without flash of unstyled theme (FOUT).

#### Scenario: Dark mode toggle
- **WHEN** a user activates the theme toggle switch
- **THEN** the active theme toggles between light and dark, updates the root document theme class/attribute, and persists the chosen theme for subsequent visits.

#### Scenario: System theme preference detection
- **WHEN** a user opens the application for the first time without a saved preference
- **THEN** the interface adopts the user's operating system dark/light preference automatically.

---

### Requirement: Subtle Motion and Animations
The interface MUST provide subtle, purposeful motion transitions for element entries, list item reveals, and hover states while honoring reduced motion preferences.

- Page content and cards entering the viewport MUST employ subtle scroll-entry animations consisting of upward translation (`translateY(12px)` to `translateY(0)`) and opacity fade-in over approximately 600ms.
- List items and card collections MUST support staggered reveal animations to introduce complex dashboards gracefully.
- Interactive elements (cards, buttons, rows) MUST apply smooth hover transitions on border color and subtle background shift without jarring scale transforms.
- All animations MUST be disabled or immediately resolve when `prefers-reduced-motion: reduce` is enabled by the user's environment.

#### Scenario: Scroll-entry animation
- **WHEN** content sections or cards render into view
- **THEN** elements animate into position with a subtle upward translate and opacity fade-in over 600ms.

#### Scenario: Reduced motion compliance
- **WHEN** a user has `prefers-reduced-motion: reduce` enabled
- **THEN** all entry translations and duration-based transitions are bypassed and content renders immediately without animation.
