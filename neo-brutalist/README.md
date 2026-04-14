# Neo-Brutalist Design System

A portable, zero-dependency CSS design system with a neo-brutalist aesthetic. Copy the `neo-brutalist/` folder into any project.

**Prefix:** `nb-` (neo-brutalist)

---

## Quick Start

Add these links to your `<head>`:

```html
<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Phosphor Icons -->
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">

<!-- Design System -->
<link rel="stylesheet" href="neo-brutalist/brutalist.css">
<link rel="stylesheet" href="neo-brutalist/brutalist-icons.css">
```

---

## Theming

Override any CSS custom property on `:root` to retheme the entire system:

```css
:root {
  --nb-bg: #F0F4FF;           /* page background */
  --nb-surface: #FFFFFF;      /* card/input backgrounds */
  --nb-ink: #111111;          /* primary text & borders */
  --nb-ink-muted: #666666;    /* secondary text */
  --nb-accent-1: #FF6B6B;     /* primary accent (buttons, labels) */
  --nb-accent-2: #4ECDC4;     /* secondary accent (copy flash) */
  --nb-accent-3: #F4C506;     /* tertiary accent */
  --nb-accent-4: #C3B1E1;     /* quaternary accent (checkbox) */
  --nb-border: 3px solid var(--nb-ink);
  --nb-border-sm: 2px solid var(--nb-ink);
  --nb-shadow: 5px 5px 0 var(--nb-ink);
  --nb-shadow-sm: 3px 3px 0 var(--nb-ink);
  --nb-font-heading: 'Space Grotesk', system-ui, sans-serif;
  --nb-font-mono: 'JetBrains Mono', monospace;
}
```

---

## Components

### nb-card

A bordered surface with a hard drop shadow.

```html
<div class="nb-card">
  <p class="nb-card-label">Section Label</p>
  <p>Card content goes here.</p>
</div>
```

---

### nb-btn

A flat button with hover and active states.

```html
<!-- Default -->
<button class="nb-btn">Click Me</button>

<!-- Active / selected state -->
<button class="nb-btn nb-btn--active">Selected</button>
```

---

### nb-toggle-group

A group of connected buttons that act as a segmented control.

```html
<div class="nb-toggle-group" role="group">
  <button class="nb-btn nb-btn--active">Hex</button>
  <button class="nb-btn">RGB</button>
  <button class="nb-btn">HSL</button>
</div>
```

---

### nb-checkbox

A brutalist-styled checkbox with a custom checkmark.

```html
<label class="nb-checkbox">
  <input type="checkbox" checked>
  Show contrast ratio
</label>
```

---

### nb-input

A monospaced input with a clear focus ring.

```html
<input class="nb-input" type="text" placeholder="#FF6B6B" value="#FF6B6B">
```

---

### nb-output-row

A read-only output row with a colored label and copy button.

```html
<div class="nb-output-row">
  <span class="nb-output-row__label">HEX</span>
  <span class="nb-output-row__value">#FF6B6B</span>
  <button class="nb-output-row__copy" aria-label="Copy">
    <i class="ph ph-copy"></i>
  </button>
</div>
```

Add `.nb-output-row__copy--flash` temporarily via JS to show a copy-success flash:

```js
btn.classList.add('nb-output-row__copy--flash');
setTimeout(() => btn.classList.remove('nb-output-row__copy--flash'), 600);
```

---

### nb-badge

A compact status badge for pass/fail results.

```html
<span class="nb-badge nb-badge--pass">AA PASS</span>
<span class="nb-badge nb-badge--fail">AAA FAIL</span>
```

---

### nb-swatch

A clickable color swatch that reveals its hex value on hover.

```html
<div class="nb-swatch" style="background: #FF6B6B; width: 64px; height: 64px;">
  <span class="nb-swatch__hex">#FF6B6B</span>
</div>
```

---

### nb-shade-strip

A horizontal strip of color shades (e.g. 100–900 scale).

```html
<div class="nb-shade-strip">
  <div class="nb-shade-step" style="background: #FFE5E5; color: #222;">
    <span class="nb-shade-step__num">100</span>
    <span class="nb-shade-step__hex">#FFE5E5</span>
  </div>
  <div class="nb-shade-step" style="background: #FF6B6B; color: #fff;">
    <span class="nb-shade-step__num">500</span>
    <span class="nb-shade-step__hex">#FF6B6B</span>
  </div>
  <div class="nb-shade-step" style="background: #8B0000; color: #fff;">
    <span class="nb-shade-step__num">900</span>
    <span class="nb-shade-step__hex">#8B0000</span>
  </div>
</div>
```

---

### nb-slider

A range input styled to match the brutalist aesthetic.

```html
<input
  class="nb-slider"
  type="range"
  min="0"
  max="100"
  value="40"
  aria-label="Opacity"
>
```

The fill gradient is controlled by a CSS custom property or inline style. To update the fill position dynamically via JS:

```js
slider.style.background = `linear-gradient(to right, var(--nb-accent-1) ${pct}%, var(--nb-surface) ${pct}%)`;
```

---

### nb-color-preview

A color swatch block used to preview the current selected color.

```html
<!-- Small -->
<div class="nb-color-preview nb-color-preview--sm" style="background: #FF6B6B;"></div>

<!-- Large -->
<div class="nb-color-preview nb-color-preview--lg" style="background: #FF6B6B;"></div>
```

---

### nb-tooltip

Shows a tooltip above an element. Toggle `.nb-tooltip--visible` via JS on `mouseenter`/`mouseleave` (or use CSS `:hover` with a custom override).

```html
<button
  class="nb-btn nb-tooltip nb-tooltip--visible"
  data-tooltip="Copied!"
>
  Copy
</button>
```

Toggle visibility via JS:

```js
el.addEventListener('mouseenter', () => el.classList.add('nb-tooltip--visible'));
el.addEventListener('mouseleave', () => el.classList.remove('nb-tooltip--visible'));
```

---

### nb-loader

Full-page loading overlay with animated blocks in the four accent colors. Covers the viewport until dismissed.

**HTML** (place as first child of `<body>`):

```html
<div class="nb-loader" id="nb-loader">
  <div class="nb-loader-blocks">
    <div class="nb-loader-block"></div>
    <div class="nb-loader-block"></div>
    <div class="nb-loader-block"></div>
    <div class="nb-loader-block"></div>
  </div>

  <!-- Optional loading text -->
  <span class="nb-loader-text">Loading</span>
</div>
```

**Dismiss with JS** :

```javascript
const dismissLoader = () => {
  const loader = document.getElementById("nb-loader");

  if (loader) {
    // After the app is ready:
    loader.hidden = true;

    // Optional: remove from DOM after fade-out
    setTimeout(() => loader.remove(), 500);
  }
};

if (document.readyState === "complete") {
  // Dismiss loader after all resources (fonts, icons CDN) have loaded
  dismissLoader();
} else {
  window.addEventListener("load", dismissLoader, { once: true });
}
```

The loader automatically uses your theme's `--nb-bg` for the background and `--nb-accent-1` through `--nb-accent-4` for the blocks. Respects `prefers-reduced-motion` by disabling the animation.

---

### Icons (Phosphor)

Use Phosphor icon classes inside `.nb-icon` for consistent sizing.

```html
<!-- Default (18px) -->
<span class="nb-icon"><i class="ph ph-copy"></i></span>

<!-- Small (14px) -->
<span class="nb-icon nb-icon--sm"><i class="ph ph-check"></i></span>

<!-- Large (24px) -->
<span class="nb-icon nb-icon--lg"><i class="ph ph-palette"></i></span>
```

Commonly used icons in this design system:

| Icon class       | Usage            |
|------------------|------------------|
| `ph-copy`        | Copy to clipboard |
| `ph-check`       | Confirm / success |
| `ph-palette`     | Color picker      |
| `ph-sun`         | Light mode        |
| `ph-moon`        | Dark mode         |
| `ph-arrow-left`  | Back navigation   |
| `ph-x`           | Close / dismiss   |

Full icon catalog: https://phosphoricons.com