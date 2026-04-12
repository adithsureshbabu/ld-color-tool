# Lighten / Darken Color Tool

A web-based color tool for adjusting, analyzing, and exploring colors. Lighten, darken, or invert any color and instantly see results in multiple formats with a contrast checker, shade scale, and color harmonies.

Built with a neo-brutalist UI using a [portable design system](#neo-brutalist-design-system) that can be reused elsewhere.

## Features

- **Lighten / Darken** - Adjust any color by a precise percentage using an interactive slider
- **Invert** - Flip a color to its RGB complement
- **Multi-format output** - View results in HEX, RGB, HSL, HSV, and ANSI with one-click copy
- **Contrast checker** - WCAG 2.1 compliance check (AA, AA+, AAA) against a configurable background
- **Shade scale** - Tailwind-style 11-step shade ramp (50-950) generated from the output color
- **Color harmonies** - Complementary, analogous, triadic, and split-complementary palettes
- **JSON output** - Append `format=json` to get all computed data as JSON
- **Deep-linking** - Share exact color states via URL query parameters
- **Responsive** - Bento grid layout adapts across desktop, tablet, and mobile

## Getting Started

No build tools required. Clone and open `index.html` in a browser, or serve locally:

```bash
git clone https://github.com/adithsureshbabu/ld-color-tool.git
cd ld-color-tool
python3 -m http.server 8080
# Open http://localhost:8080
```

### URL Parameters

Share a specific color state by appending query params:

```
?mode=darken&color=ff6b6b&amount=60&invert=true
```

| Param | Values | Default |
|---|---|---|
| `mode` | `lighten`, `darken` | `lighten` |
| `color` | hex without `#` | `0099dd` |
| `amount` | `0` - `100` | `0` |
| `invert` | `true`, `false` | `false` |
| `format` | `json` | *(none)* |

### JSON Output

Append `&format=json` to any URL to get the full computed result as JSON instead of the UI:

```
?color=ff6b6b&mode=darken&amount=60&invert=true&format=json
```

Returns all input parameters, output values (HEX, RGB, HSL, HSV, ANSI), contrast checker results (ratio, AA/AA+/AAA), color harmonies (complementary, analogous, triadic, split-complementary), and the full 11-step shade scale.

## Tech Stack

- **HTML/CSS/JS** - Vanilla, no frameworks, no build step
- **[tinycolor.js](https://github.com/bgrins/TinyColor)** - Color parsing and manipulation
- **[reinvented-color-wheel](https://github.com/nicosResworkedDesign/reinvented-color-wheel)** - Interactive color picker web component
- **[Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)** + **[JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)** - Typography (Google Fonts)
- **[Phosphor Icons](https://phosphoricons.com/)** - Icon system
- **[sanitize.css](https://csstools.github.io/sanitize.css/)** - CSS reset

## Project Structure

```
ld-color-tool/
├── neo-brutalist/          ← Portable design system
│   ├── brutalist.css       ← Tokens + component classes
│   ├── brutalist-icons.css ← Icon helpers
│   └── README.md           ← Design system docs
├── css/
│   ├── sanitize.css        ← CSS reset
│   └── app.css             ← Bento grid layout + responsive breakpoints
├── js/
│   ├── tinycolor-min.js    ← Color math library
│   ├── reinvented-color-wheel-wc.js ← Color picker web component
│   └── app.js              ← App logic (state, render, events)
├── index.html
├── LICENSE
└── README.md
```

## Neo-Brutalist Design System

The `neo-brutalist/` folder is a standalone, portable CSS design system. Copy it into any project to get the same visual style - no dependencies on this app's code.

**Highlights:**
- `nb-` prefixed classes - safe alongside existing styles
- CSS custom properties for theming - swap 4 accent colors to re-theme everything
- Components: cards, buttons, toggles, inputs, output rows, badges, sliders, swatches, shade strips, tooltips, loader
- WCAG 2.1 AA accessible: focus indicators, touch targets, reduced motion support

See [neo-brutalist/README.md](neo-brutalist/README.md) for full documentation and usage examples.

## Accessibility

- Semantic HTML with ARIA labels on all sections
- Keyboard navigable with visible focus indicators
- Touch targets meet 44x44px minimum
- `prefers-reduced-motion` respected - all animations disabled
- Contrast checker built into the tool itself

## License

[MIT](LICENSE) - Adith Sureshbabu
