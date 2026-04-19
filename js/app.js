/* ============================================
   app.js — Lighten/Darken Color Tool

   Architecture: single state object drives all UI.
   Every user action calls setState() which triggers
   render() (updates DOM) and syncToUrl() (updates URL).

   Sections:
     STATE       → state object, defaults, setState
     URL SYNC    → read/write URL query parameters
     COLOR MATH  → pure functions, no DOM access
     DOM HELPERS → shorthand for getElementById, createElement
     RENDER      → updates each bento card from state
     CLIPBOARD   → copy-to-clipboard + tooltip feedback
     COLOR WHEEL → integration with <reinvented-color-wheel>
     COLOR INPUT → format-aware validation for picker inputs
     EVENTS      → delegated click, input, focusout on .bento
     JSON API    → ?type=json renders raw JSON output
     INIT        → entry point, boots the app or JSON mode
   ============================================ */

// ==================== STATE ====================

const DEFAULTS = Object.freeze({
  color: "#0099dd",
  mode: "lighten",
  amount: 40,
  invert: false,
  contrastBg: "#ffffff",
  format: "hex",
  palette: "brutalist"
});

const FORMATS = ["hex", "rgb", "hsl", "hsv", "ansi"];

const FORMAT_PLACEHOLDERS = {
  hex: "#ff6b6b or #f57",
  rgb: "rgb(255, 107, 107)",
  hsl: "hsl(0, 100%, 71%)",
  hsv: "hsv(0, 58%, 100%)",
  ansi: "0-255 (e.g. 203)"
};

/** Multi-channel format configuration — channel labels and max values. */
const CHANNEL_CONFIG = {
  rgb: { labels: ["R", "G", "B"], maxes: [255, 255, 255] },
  hsl: { labels: ["H", "S", "L"], maxes: [360, 100, 100] },
  hsv: { labels: ["H", "S", "V"], maxes: [360, 100, 100] }
};

/**
 * Spin-wheel palette themes — 5 curated palettes, 12 colors each.
 * Segment count matches wheel division (360° / 30°).
 */
const PALETTES = Object.freeze({
  brutalist:   ["#FF6B9B", "#4ECDC4", "#F4C506", "#C3B1E1", "#2A9D8F", "#E76F51",
                "#264653", "#F5F5F5", "#222222", "#6A4C93", "#F77F00", "#00B2CA"],
  pastel:      ["#FFD6E0", "#C1E1C1", "#FFE5B4", "#B4E7F5", "#E6D7F5", "#FFDAB9",
                "#D4F4DD", "#FFF1B8", "#C8E0F4", "#E8D5C4", "#FEDCBA", "#D1C4E9"],
  neon:        ["#FF00FF", "#00FFFF", "#FFFF00", "#00FF00", "#FF0080", "#8000FF",
                "#FF8000", "#00FF80", "#0080FF", "#FF4000", "#80FF00", "#FF0040"],
  earth:       ["#8B4513", "#556B2F", "#B8860B", "#696969", "#CD853F", "#2F4F4F",
                "#A0522D", "#6B8E23", "#D2691E", "#708090", "#8FBC8F", "#BDB76B"],
  monochrome:  ["#FFFFFF", "#F0F0F0", "#D9D9D9", "#BFBFBF", "#A6A6A6", "#8C8C8C",
                "#737373", "#595959", "#404040", "#262626", "#0D0D0D", "#000000"]
});

const PALETTE_KEYS = Object.keys(PALETTES);
const SEGMENT_COUNT = 12;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

const isMultiFieldFormat = format => format in CHANNEL_CONFIG;

const state = { ...DEFAULTS };

/** Merge updates into state, re-render UI, and sync URL. */
const setState = updates => {
  Object.assign(state, updates);
  render();
  syncToUrl();
};

// ==================== URL SYNC ====================

/** Parse URL query params (?mode, color, amount, invert, format) into state. */
const readFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const mode = (params.get("mode") || "").replace(/[^a-z]/gi, "").toLowerCase();
  const colorRaw = params.get("color") || "";
  const amount = parseFloat(params.get("amount"));
  const invert = params.get("invert") === "true";
  const format = (params.get("format") || "").toLowerCase();
  const pal = (params.get("palette") || "").toLowerCase();

  if (mode === "lighten" || mode === "darken") state.mode = mode;

  // Parse color based on format param; fall back to legacy hex parsing only
  // when the format is hex AND the param is clean hex chars (so
  // mismatched inputs like ?color=rgb(255,107,107)&format=hex don't get
  // silently reinterpreted as garbage hex).
  if (FORMATS.includes(format)) state.format = format;
  if (PALETTE_KEYS.includes(pal)) state.palette = pal;
  if (colorRaw) {
    const parsed = parseColorByFormat(colorRaw, state.format);
    if (parsed) {
      state.color = parsed.toLowerCase();
    } else if (state.format === "hex") {
      // Legacy hex fallback — param may be bare hex without `#`
      // Reject if input has structural chars (parens, commas) that suggest
      // the user meant a non-hex format but specified format=hex by mistake.
      const cleanInput = colorRaw.replace(/^#/, "");
      if (/^[a-f0-9]*$/i.test(cleanInput)) {
        const hex = cleanInput.substring(0, 6);
        if (hex.length === 6) state.color = `#${hex.toLowerCase()}`;
        else if (hex.length === 3) {
          state.color = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
        }
      }
    }
    // For non-hex formats with an unparseable color, leave state.color at default
  }

  if (!isNaN(amount) && amount >= 0 && amount <= 100) {
    state.amount = Math.round(amount * 10) / 10;
  }
  state.invert = invert;
};

/**
 * Format a hex color for URL storage — compact, readable form.
 *   hex:  "ff6b6b"
 *   rgb:  "255,107,107"
 *   hsl:  "0,100,71"
 *   hsv:  "0,58,100"
 *   ansi: "203"
 */
const formatColorForUrl = (hex, format) => {
  const c = tinycolor(hex);
  if (format === "hex") return hex.replace("#", "");
  if (format === "rgb") {
    const { r, g, b } = c.toRgb();
    return `${r},${g},${b}`;
  }
  if (format === "hsl") {
    const { h, s, l } = c.toHsl();
    return `${Math.round(h)},${Math.round(s * 100)},${Math.round(l * 100)}`;
  }
  if (format === "hsv") {
    const { h, s, v } = c.toHsv();
    return `${Math.round(h)},${Math.round(s * 100)},${Math.round(v * 100)}`;
  }
  if (format === "ansi") {
    const { r, g, b } = c.toRgb();
    return String(rgbToAnsi(r, g, b));
  }
  return hex.replace("#", "");
};

/** Push current state to URL without page reload. */
const syncToUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("color", formatColorForUrl(state.color, state.format));
  url.searchParams.set("amount", state.amount);
  url.searchParams.set("invert", state.invert);
  if (state.format !== DEFAULTS.format) {
    url.searchParams.set("format", state.format);
  } else {
    url.searchParams.delete("format");
  }
  if (state.palette !== DEFAULTS.palette) {
    url.searchParams.set("palette", state.palette);
  } else {
    url.searchParams.delete("palette");
  }
  history.pushState({}, "", url);
};

// ==================== COLOR MATH ====================
// Pure functions — no DOM access, safe to reuse elsewhere.

/**
 * Resolve raw hex digits to a full 7-char hex string.
 * Accepts 3-char shorthand (e.g. "f57" → "#ff5577") or 6-char full hex.
 * Returns null for any other length.
 */
const resolveHex = raw => {
  if (raw.length === 6) return `#${raw}`;
  if (raw.length === 3) return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  return null;
};

/** Convert RGB (0-255) to ANSI 256-color code. */
const rgbToAnsi = (r, g, b) => {
  const ar = r >= 75 ? Math.floor((r - 35) / 40) : 0;
  const ag = g >= 75 ? Math.floor((g - 35) / 40) : 0;
  const ab = b >= 75 ? Math.floor((b - 35) / 40) : 0;
  return ar * 36 + ag * 6 + ab + 16;
};

/**
 * Convert ANSI 256 code (0-255) to RGB using the xterm palette.
 * 16-231: 6×6×6 color cube. 232-255: grayscale. 0-15: system colors.
 */
const ANSI_LEVELS = [0, 95, 135, 175, 215, 255];
const ANSI_SYSTEM = [
  [0, 0, 0], [128, 0, 0], [0, 128, 0], [128, 128, 0],
  [0, 0, 128], [128, 0, 128], [0, 128, 128], [192, 192, 192],
  [128, 128, 128], [255, 0, 0], [0, 255, 0], [255, 255, 0],
  [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255]
];

const ansiToRgb = n => {
  if (!Number.isInteger(n) || n < 0 || n > 255) return null;
  if (n < 16) {
    const [r, g, b] = ANSI_SYSTEM[n];
    return { r, g, b };
  }
  if (n >= 232) {
    const v = (n - 232) * 10 + 8;
    return { r: v, g: v, b: v };
  }
  const i = n - 16;
  return {
    r: ANSI_LEVELS[Math.floor(i / 36)],
    g: ANSI_LEVELS[Math.floor((i % 36) / 6)],
    b: ANSI_LEVELS[i % 6]
  };
};

/** Convert a hex color to a display string in the given format. */
const formatColor = (hex, format) => {
  const c = tinycolor(hex);
  switch (format) {
    case "hex": return c.toHexString();
    case "rgb": return c.toRgbString();
    case "hsl": return c.toHslString();
    case "hsv": return c.toHsvString();
    case "ansi": {
      const { r, g, b } = c.toRgb();
      return String(rgbToAnsi(r, g, b));
    }
    default: return c.toHexString();
  }
};

/**
 * Extract channel values from a hex color in the given multi-field format.
 * Returns [a, b, c] rounded to integers: [r,g,b], [h,s%,l%], or [h,s%,v%].
 */
const getChannelValues = (hex, format) => {
  const c = tinycolor(hex);
  if (format === "rgb") {
    const { r, g, b } = c.toRgb();
    return [r, g, b];
  }
  if (format === "hsl") {
    const { h, s, l } = c.toHsl();
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  if (format === "hsv") {
    const { h, s, v } = c.toHsv();
    return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
  }
  return [0, 0, 0];
};

/** Build a hex color from 3 channel values in the given multi-field format. */
const channelsToHex = (values, format) => {
  const [a, b, c] = values;
  const obj =
    format === "rgb" ? { r: a, g: b, b: c }
    : format === "hsl" ? { h: a, s: b, l: c }
    : /* hsv */ { h: a, s: b, v: c };
  const parsed = tinycolor(obj);
  return parsed.isValid() ? parsed.toHexString() : null;
};

/**
 * Parse a user input string in the given format to a hex color.
 * Accepts both full syntax (e.g. "rgb(255,107,107)") and bare
 * comma-separated numbers (e.g. "255,107,107"). Returns hex string
 * if valid, null otherwise.
 */
const parseColorByFormat = (input, format) => {
  if (!input) return null;
  const trimmed = input.trim();

  if (format === "hex") {
    const raw = trimmed.replace(/[^a-f0-9]/gi, "");
    return resolveHex(raw);
  }

  if (format === "ansi") {
    const n = parseInt(trimmed, 10);
    if (isNaN(n)) return null;
    const rgb = ansiToRgb(n);
    return rgb ? tinycolor(rgb).toHexString() : null;
  }

  // Try bare "a,b,c" (e.g. "255,107,107") — used for compact URL storage
  const bareMatch = trimmed.match(/^(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)$/);
  if (bareMatch) {
    const [a, b, c] = [parseFloat(bareMatch[1]), parseFloat(bareMatch[2]), parseFloat(bareMatch[3])];
    const obj =
      format === "rgb" ? { r: a, g: b, b: c }
      : format === "hsl" ? { h: a, s: b, l: c }
      : /* hsv */ { h: a, s: b, v: c };
    const parsed = tinycolor(obj);
    return parsed.isValid() ? parsed.toHexString() : null;
  }

  // Full syntax — tinycolor parses rgb(...), hsl(...), hsv(...) directly
  const parsed = tinycolor(trimmed);
  return parsed.isValid() ? parsed.toHexString() : null;
};

/**
 * Build an SVG path `d` attribute for a pie-chart segment.
 * Radius 100, centered at (0,0). Segment `i` is CENTERED on its index angle:
 * segment 0 centered at 12 o'clock (spans visual [-15°, +15°]), segment 1
 * centered at 1 o'clock, etc. Centering (rather than starting at i*30) lets
 * the fixed pointer at 12 o'clock unambiguously target the middle of a
 * segment, matching the landing formula in computeLandedIndex.
 */
const buildSegmentPath = (index, count) => {
  const anglePer = 360 / count;
  const startAngle = index * anglePer - anglePer / 2 - 90;
  const endAngle = startAngle + anglePer;
  const toRad = d => (d * Math.PI) / 180;
  const r = 100;
  const x1 = Math.cos(toRad(startAngle)) * r;
  const y1 = Math.sin(toRad(startAngle)) * r;
  const x2 = Math.cos(toRad(endAngle)) * r;
  const y2 = Math.sin(toRad(endAngle)) * r;
  const largeArc = anglePer > 180 ? 1 : 0;
  return `M 0 0 L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`;
};

/**
 * Apply invert + lighten/darken to produce the output color.
 * Amount is scaled relative to available lightness range so
 * 100% always reaches pure white (lighten) or pure black (darken).
 */
const computeOutput = ({ color: inputColor, amount, mode, invert }) => {
  let color = tinycolor(inputColor);

  if (invert) {
    const { r, g, b } = color.toRgb();
    color = tinycolor({ r: 255 - r, g: 255 - g, b: 255 - b });
  }

  if (mode === "lighten") {
    color = color.lighten((amount * ((1 - color.toHsl().l) * 100)) / 100);
  } else if (mode === "darken") {
    color = color.darken((amount * (color.toHsl().l * 100)) / 100);
  }

  const { r, g, b } = color.toRgb();
  return {
    hex: color.toHexString(),
    rgb: color.toRgbString(),
    hsl: color.toHslString(),
    hsv: color.toHsvString(),
    ansi: rgbToAnsi(r, g, b)
  };
};

/**
 * Generate a Tailwind-style shade ramp (50–950) from a base color.
 * Lighter steps boost saturation slightly; darker steps reduce it.
 * Step 500 matches the input color's natural lightness.
 */
const computeShadeScale = hexColor => {
  const { h, s: baseS, l: baseL } = tinycolor(hexColor).toHsl();
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  return steps.map(step => {
    let l, s;

    if (step === 50) {
      l = 0.97;
      s = Math.min(1, baseS + 0.15);
    } else if (step < 500) {
      const t = (step - 100) / 400;
      l = 0.9 - t * (0.9 - baseL);
      s = Math.min(1, Math.max(0.05, baseS + ((500 - step) / 100) * 0.03));
    } else if (step === 500) {
      l = baseL;
      s = baseS;
    } else if (step === 950) {
      l = 0.05;
      s = Math.max(0.05, baseS - 0.25);
    } else {
      const t = (step - 500) / 400;
      l = baseL - t * (baseL - 0.1);
      s = Math.max(0.05, Math.min(1, baseS - ((step - 500) / 100) * 0.05));
    }

    return {
      step,
      hex: tinycolor({ h, s, l }).toHexString(),
      textColor: l > 0.55 ? "#222222" : "#FFFFFF"
    };
  });
};

/** Compute four color harmony palettes via hue rotation. */
const computeHarmonies = hexColor => {
  const { h, s, l } = tinycolor(hexColor).toHsl();
  const shift = deg => tinycolor({ h: (h + deg + 360) % 360, s, l }).toHexString();

  return {
    complementary: [hexColor, shift(180)],
    analogous: [shift(-30), hexColor, shift(30)],
    triadic: [hexColor, shift(120), shift(240)],
    splitComplementary: [hexColor, shift(150), shift(210)]
  };
};

/** WCAG 2.1 relative luminance from linear RGB. */
const luminance = ({ r, g, b }) => {
  const [rl, gl, bl] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

/**
 * WCAG contrast ratio between two colors.
 * Returns ratio and pass/fail for AA (4.5:1), AA+ large (3:1), AAA (7:1).
 */
const computeContrast = (fgHex, bgHex) => {
  const fg = tinycolor(fgHex);
  const bg = tinycolor(bgHex);

  if (!fg.isValid() || !bg.isValid()) {
    return { ratio: 0, aa: false, aaLarge: false, aaa: false };
  }

  const l1 = luminance(fg.toRgb());
  const l2 = luminance(bg.toRgb());
  const ratio = Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;

  return { ratio, aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7 };
};

// ==================== DOM HELPERS ====================

const $ = sel => document.getElementById(sel);
const $$ = sel => document.querySelectorAll(sel);

/** Create an element with optional className and textContent. */
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// ==================== RENDER ====================
// Each render function updates one bento card.
// Focused inputs are skipped to avoid clobbering user input mid-type.

const render = () => {
  const output = computeOutput(state);
  renderPickerInputs();
  renderInputPreview();
  renderAdjustControls();
  renderSlider();
  renderOutputPreview(output);
  renderOutputs(output);
  renderContrast(output.hex);
  renderHarmonies(output.hex);
  renderShades(output.hex);
  renderSpinWheel();
};

const renderPickerInputs = () => {
  const formatSelect = $("formatSelect");
  if (formatSelect.value !== state.format) formatSelect.value = state.format;

  const container = $("colorInputArea");
  const active = document.activeElement;
  const currentFormat = container.dataset.format;
  const needsRebuild = currentFormat !== state.format;

  if (isMultiFieldFormat(state.format)) {
    const { labels, maxes } = CHANNEL_CONFIG[state.format];
    const values = getChannelValues(state.color, state.format);

    if (needsRebuild) {
      container.dataset.format = state.format;
      container.replaceChildren(
        ...labels.map((label, i) => {
          const field = el("div", "picker-channel");
          field.appendChild(el("span", "picker-channel__label", label));
          const input = document.createElement("input");
          input.type = "number";
          input.className = "nb-input";
          input.id = `channel${i}`;
          input.min = "0";
          input.max = String(maxes[i]);
          input.dataset.action = "color-channel";
          input.dataset.channel = String(i);
          input.title = `${label} channel (0–${maxes[i]})`;
          field.appendChild(input);
          return field;
        })
      );
    }

    // Update values (skip focused field so user input isn't clobbered)
    for (let i = 0; i < 3; i++) {
      const input = $(`channel${i}`);
      if (active !== input) {
        input.value = values[i];
        input.classList.remove("nb-input--error");
      }
    }
  } else {
    if (needsRebuild) {
      container.dataset.format = state.format;
      const input = document.createElement("input");
      input.className = "nb-input";
      input.id = "colorInput";
      input.dataset.action = "color-input";
      input.title = "Enter color value in the selected format";
      if (state.format === "ansi") {
        input.type = "number";
        input.min = "0";
        input.max = "255";
        input.step = "1";
      } else {
        input.type = "text";
        if (state.format === "hex") input.maxLength = 7;
      }
      container.replaceChildren(input);
    }
    const input = $("colorInput");
    if (active !== input) {
      input.value = formatColor(state.color, state.format);
      input.placeholder = FORMAT_PLACEHOLDERS[state.format];
      input.classList.remove("nb-input--error");
    }
  }
};

const renderInputPreview = () => {
  $("inputPreview").style.backgroundColor = state.color;
};

const renderAdjustControls = () => {
  for (const btn of $$('[data-action="set-mode"]')) {
    const isActive = btn.dataset.mode === state.mode;
    btn.classList.toggle("nb-btn--active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  }
  $("invertCheckbox").checked = state.invert;
};

const renderSlider = () => {
  const slider = $("amountSlider");
  const input = $("amountInput");
  slider.value = state.amount;
  if (document.activeElement !== input) input.value = state.amount;
  styleSlider(slider);
};

/** Fill the slider track with accent color up to the current percentage. */
const styleSlider = slider => {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  const accent = state.mode === "darken" ? "var(--nb-accent-2)" : "var(--nb-accent-1)";
  slider.style.background = `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, var(--nb-surface) ${pct}%, var(--nb-surface) 100%)`;
};

const renderOutputPreview = output => {
  $("outputPreview").style.backgroundColor = output.hex;
};

const renderOutputs = ({ hex, rgb, hsl, hsv, ansi }) => {
  $("outHex").textContent = hex;
  $("outRgb").textContent = rgb;
  $("outHsl").textContent = hsl;
  $("outHsv").textContent = hsv;
  $("outAnsi").textContent = ansi;
};

const renderContrast = fgHex => {
  const { contrastBg: bgHex } = state;
  const contrastBgInput = $("contrastBgInput");
  if (document.activeElement !== contrastBgInput) contrastBgInput.value = bgHex;
  const { ratio, aa, aaLarge, aaa } = computeContrast(fgHex, bgHex);

  const boxA = $("contrastBoxA");
  const boxB = $("contrastBoxB");
  boxA.style.backgroundColor = bgHex;
  boxA.style.color = fgHex;
  boxB.style.backgroundColor = fgHex;
  boxB.style.color = bgHex;

  $("contrastRatio").textContent = ratio > 0 ? `${ratio.toFixed(2)}:1` : "\u2014";

  const setBadge = (id, label, pass) => {
    const badge = $(id);
    badge.textContent = `${label} ${pass ? "\u2713" : "\u2717"}`;
    badge.className = `nb-badge ${pass ? "nb-badge--pass" : "nb-badge--fail"}`;
  };

  setBadge("badgeAA", "AA", aa);
  setBadge("badgeAALarge", "AA+", aaLarge);
  setBadge("badgeAAA", "AAA", aaa);
};

/** Build harmony swatches via safe DOM methods. Clicking a swatch sets it as input color. */
const renderHarmonies = outputHex => {
  const container = $("harmoniesContainer");
  const harmonies = computeHarmonies(outputHex);

  const sections = [
    { label: "Complementary", colors: harmonies.complementary },
    { label: "Analogous", colors: harmonies.analogous },
    { label: "Triadic", colors: harmonies.triadic },
    { label: "Split-Complementary", colors: harmonies.splitComplementary }
  ];

  container.replaceChildren(
    ...sections.map(({ label, colors }) => {
      const section = el("div", "harmony-section");
      section.appendChild(el("div", "harmony-type", label));

      const swatches = el("div", "harmony-swatches");
      for (const hex of colors) {
        const swatch = el("div", "nb-swatch");
        swatch.style.backgroundColor = hex;
        Object.assign(swatch.dataset, { action: "set-color", color: hex });
        swatch.title = `Use ${hex} as input color`;
        swatch.appendChild(el("span", "nb-swatch__hex", hex));
        swatches.appendChild(swatch);
      }

      section.appendChild(swatches);
      return section;
    })
  );
};

/** Build shade scale steps via safe DOM methods. Clicking a step copies its hex. */
const renderShades = outputHex => {
  const strip = $("shadeStrip");
  const shades = computeShadeScale(outputHex);

  strip.replaceChildren(
    ...shades.map(({ step: num, hex, textColor }) => {
      const stepEl = el("div", "nb-shade-step nb-tooltip");
      stepEl.dataset.tooltip = "Copied!";
      stepEl.style.backgroundColor = hex;
      stepEl.style.color = textColor;
      Object.assign(stepEl.dataset, { action: "copy-shade", hex });
      stepEl.title = `Copy ${hex}`;
      stepEl.appendChild(el("span", "nb-shade-step__num", num));
      stepEl.appendChild(el("span", "nb-shade-step__hex", hex));
      return stepEl;
    })
  );
};

/** Render/refresh the spin wheel's segment fills for the active palette. */
const renderSpinWheel = () => {
  const wheel = $("spinWheel");
  const paletteSelect = $("paletteSelect");
  if (paletteSelect.value !== state.palette) paletteSelect.value = state.palette;

  const palette = PALETTES[state.palette];
  const needsRebuild = wheel.dataset.palette !== state.palette;

  if (needsRebuild) {
    wheel.dataset.palette = state.palette;
    wheel.replaceChildren(
      ...palette.map((hex, i) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", buildSegmentPath(i, SEGMENT_COUNT));
        path.setAttribute("fill", hex);
        return path;
      })
    );
  }
};

// ==================== CLIPBOARD ====================

const copyToClipboard = async (text, triggerEl) => {
  try {
    await navigator.clipboard.writeText(text);
    showTooltip(triggerEl);
  } catch {
    /* clipboard unavailable (e.g. non-HTTPS, iframe sandbox) */
  }
};

/** Show a "Copied!" tooltip above the trigger element for 2 seconds. */
const showTooltip = target => {
  for (const tip of $$(".nb-tooltip--visible")) {
    tip.classList.remove("nb-tooltip--visible");
  }
  target.classList.add("nb-tooltip--visible");
  setTimeout(() => target.classList.remove("nb-tooltip--visible"), 2000);
};

/** Brief teal flash on copy button to confirm the action. */
const flashCopyButton = btn => {
  btn.classList.add("nb-output-row__copy--flash");
  setTimeout(() => btn.classList.remove("nb-output-row__copy--flash"), 300);
};

// ==================== COLOR WHEEL ====================

let wheelReady = false;

/** Handle color wheel change events (fires continuously while dragging). */
const onColorWheelChange = () => {
  if (!wheelReady) return;
  const hex = $("colorWheel").getAttribute("hex");
  if (!hex) return;
  state.color = hex.toLowerCase();
  render();
  syncToUrl();
};

/**
 * Set the color wheel value without triggering a change loop.
 * Temporarily disables wheelReady to suppress the change handler.
 */
const setColorWheel = hex => {
  wheelReady = false;
  $("colorWheel").setAttribute("hex", hex);
  wheelReady = true;
};

// ==================== SPIN WHEEL ====================

let currentWheelAngle = 0;
let spinning = false;
let spinFallbackTimer = null;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Derive which segment is under the pointer from the cumulative rotation.
 * Rotating the wheel +X° clockwise moves segment 0 away from the pointer by X°,
 * so the segment at -X° mod 360 on the wheel lands under the pointer.
 * Adding SEGMENT_ANGLE/2 shifts the boundary so each segment's center (not edge)
 * is the target.
 */
const computeLandedIndex = angle => {
  const normalized = ((360 - (angle % 360)) + 360) % 360;
  return Math.floor((normalized + SEGMENT_ANGLE / 2) / SEGMENT_ANGLE) % SEGMENT_COUNT;
};

/** Called when the spin settles — apply landed color, unlock UI. */
const onSpinComplete = () => {
  if (!spinning) return;
  spinning = false;
  clearTimeout(spinFallbackTimer);
  spinFallbackTimer = null;

  $("spinButton").disabled = false;
  $("paletteSelect").disabled = false;

  const landedIndex = computeLandedIndex(currentWheelAngle);
  const landedHex = PALETTES[state.palette][landedIndex];

  setColorWheel(landedHex);
  setState({ color: landedHex.toLowerCase() });
};

/** Kick off a spin — compute target angle, apply transform, lock UI. */
const handleSpin = () => {
  if (spinning) return;
  spinning = true;

  $("spinButton").disabled = true;
  $("paletteSelect").disabled = true;

  const rotations = randomInt(4, 6);
  const offset = Math.random() * 360;
  currentWheelAngle = currentWheelAngle + rotations * 360 + offset;

  $("spinWheel").style.transform = `rotate(${currentWheelAngle}deg)`;

  spinFallbackTimer = setTimeout(onSpinComplete, 3500);
};

// ==================== COLOR INPUT ====================
// On input: validate live, show error for invalid, apply valid colors.
// On blur: normalize value (format canonical string) and apply.

/**
 * Live hex-only input handler (used for contrast BG which doesn't have format dropdown).
 * Strips non-hex chars, keeps "#" prefix, toggles error state.
 */
const handleHexInput = input => {
  const raw = input.value.replace(/[^a-f0-9]/gi, "");
  const formatted = raw.length > 0 ? `#${raw}` : input.value.replace(/^(#?)([a-f0-9]*).*/i, "$1$2");
  if (input.value !== formatted) input.value = formatted;
  const resolved = resolveHex(raw);
  input.classList.toggle("nb-input--error", raw.length > 0 && !resolved);
  return resolved;
};

/** Blur handler for hex-only input — expand shorthand, apply via callback. */
const handleHexBlur = (input, apply) => {
  const raw = input.value.replace(/[^a-f0-9]/gi, "");
  const resolved = resolveHex(raw);
  if (resolved && tinycolor(resolved).isValid()) {
    input.value = resolved.toLowerCase();
    input.classList.remove("nb-input--error");
    apply(resolved.toLowerCase());
  } else if (raw.length === 0) {
    input.classList.remove("nb-input--error");
  }
};

/**
 * Live handler for the format-aware color input.
 * Parses in state.format, toggles error state, returns resolved hex or null.
 */
const handleColorInput = input => {
  const val = input.value;
  const resolved = parseColorByFormat(val, state.format);
  input.classList.toggle("nb-input--error", val.trim().length > 0 && !resolved);
  return resolved;
};

/** Blur handler for the format-aware color input — normalize value and apply. */
const handleColorBlur = (input, apply) => {
  let val = input.value;

  // ANSI: clamp out-of-range numbers to 0–255 on blur
  if (state.format === "ansi") {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const clamped = Math.min(255, Math.max(0, Math.floor(n)));
      val = String(clamped);
      input.value = val;
    }
  }

  const resolved = parseColorByFormat(val, state.format);
  if (resolved) {
    input.value = formatColor(resolved, state.format);
    input.classList.remove("nb-input--error");
    apply(resolved);
  } else if (val.trim().length === 0) {
    input.classList.remove("nb-input--error");
  }
};

// ==================== EVENTS ====================
// All events are delegated on the .bento container via data-action attributes.

const setupEvents = () => {
  const bento = document.querySelector(".bento");

  $("colorWheel").addEventListener("change", onColorWheelChange);

  // --- Click actions ---
  bento.addEventListener("click", e => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const { action } = target.dataset;

    if (action === "reset") {
      setState({ amount: 0, invert: false });
    } else if (action === "set-mode") {
      setState({ mode: target.dataset.mode });
    } else if (action === "copy") {
      const valueEl = $(target.dataset.target);
      if (valueEl) {
        copyToClipboard(valueEl.textContent, target);
        flashCopyButton(target);
      }
    } else if (action === "copy-shade") {
      copyToClipboard(target.dataset.hex, target);
    } else if (action === "set-color") {
      setColorWheel(target.dataset.color);
      setState({ color: target.dataset.color });
    } else if (action === "spin") {
      handleSpin();
    }
  });

  $("spinWheel").addEventListener("transitionend", e => {
    if (e.target === $("spinWheel") && e.propertyName === "transform") {
      onSpinComplete();
    }
  });

  // --- Select change events ---
  bento.addEventListener("change", e => {
    const { action } = e.target.dataset;
    if (action === "format-select") {
      const format = e.target.value;
      if (FORMATS.includes(format)) setState({ format });
    } else if (action === "set-palette") {
      const pal = e.target.value;
      if (PALETTE_KEYS.includes(pal)) setState({ palette: pal });
    }
  });

  // --- Live input actions ---
  bento.addEventListener("input", e => {
    const { target } = e;
    const { action } = target.dataset;

    if (action === "color-input") {
      const result = handleColorInput(target);
      if (result) {
        setColorWheel(result);
        setState({ color: result.toLowerCase() });
      }
    } else if (action === "contrast-bg-input") {
      const result = handleHexInput(target);
      if (result) {
        setState({ contrastBg: result.toLowerCase() });
      }
    } else if (action === "color-channel") {
      // Flag out-of-range values with error state (live feedback)
      const i = parseInt(target.dataset.channel, 10);
      const { maxes } = CHANNEL_CONFIG[state.format];
      const raw = parseFloat(target.value);
      const outOfRange = !isNaN(raw) && (raw < 0 || raw > maxes[i]);
      target.classList.toggle("nb-input--error", outOfRange);

      const values = [0, 1, 2].map(idx => parseFloat($(`channel${idx}`).value) || 0);
      const hex = channelsToHex(values, state.format);
      if (hex) {
        setColorWheel(hex);
        setState({ color: hex.toLowerCase() });
      }
    } else if (action === "slider-input") {
      const val = parseFloat(target.value) || 0;
      styleSlider(target);
      $("amountInput").value = val;
      setState({ amount: val });
    } else if (action === "amount-input") {
      const val = Math.min(100, Math.max(0, parseFloat(target.value) || 0));
      setState({ amount: val });
    } else if (action === "toggle-invert") {
      setState({ invert: target.checked });
    }
  });

  // --- Blur actions (formatting, clamping) ---
  bento.addEventListener("focusout", e => {
    const { target } = e;
    const { action } = target.dataset;

    if (action === "color-input") {
      handleColorBlur(target, hex => {
        setColorWheel(hex);
        setState({ color: hex });
      });
    } else if (action === "color-channel") {
      // Clamp this channel to its max, clear error, then rebuild color from all 3 channels
      const i = parseInt(target.dataset.channel, 10);
      const { maxes } = CHANNEL_CONFIG[state.format];
      target.value = Math.min(maxes[i], Math.max(0, parseFloat(target.value) || 0));
      target.classList.remove("nb-input--error");
      const values = [0, 1, 2].map(idx => parseFloat($(`channel${idx}`).value) || 0);
      const hex = channelsToHex(values, state.format);
      if (hex) {
        setColorWheel(hex);
        setState({ color: hex.toLowerCase() });
      }
    } else if (action === "contrast-bg-input") {
      handleHexBlur(target, hex => {
        setState({ contrastBg: hex });
      });
    } else if (action === "amount-input") {
      // Clamp displayed value to 0–100 on blur
      const val = Math.min(100, Math.max(0, parseFloat(target.value) || 0));
      target.value = val;
      setState({ amount: val });
    }
  });
};

// ==================== JSON API ====================
// Append ?type=json to any URL to get all computed data as JSON.

const buildJsonResponse = () => {
  const output = computeOutput(state);
  const contrast = computeContrast(output.hex, state.contrastBg);
  const harmonies = computeHarmonies(output.hex);
  const shades = computeShadeScale(output.hex);

  return {
    input: {
      color: state.color,
      mode: state.mode,
      amount: state.amount,
      invert: state.invert,
      palette: state.palette
    },
    output: { hex: output.hex, rgb: output.rgb, hsl: output.hsl, hsv: output.hsv, ansi: output.ansi },
    contrast: {
      background: state.contrastBg,
      ratio: contrast.ratio,
      aa: contrast.aa,
      aaLarge: contrast.aaLarge,
      aaa: contrast.aaa
    },
    harmonies: { ...harmonies },
    shades: shades.map(({ step, hex }) => ({ step, hex }))
  };
};

const renderJsonPage = data => {
  document.title = "Color Tool API \u2014 JSON";
  document.body.textContent = "";
  document.body.style.cssText = "background:#1a1a2e;margin:0;padding:24px;";

  const pre = el("pre");
  pre.style.cssText =
    "font-family:'JetBrains Mono',monospace;font-size:14px;color:#e0e0e0;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin:0;";
  pre.textContent = JSON.stringify(data, null, 2);
  document.body.appendChild(pre);
};

// ==================== INIT ====================
// type="module" defers execution until DOM is parsed.

readFromUrl();

if (new URLSearchParams(window.location.search).get("type") === "json") {
  renderJsonPage(buildJsonResponse());
} else {
  setColorWheel(state.color);
  wheelReady = true;
  render();
  // Normalize the URL on load — clean up unknown/invalid params that
  // readFromUrl silently fell back to defaults for (e.g. ?palette=bogus).
  syncToUrl();
  setupEvents();

  // Dismiss loader after all resources (fonts, icons CDN) have loaded
  const dismissLoader = () => {
    const loader = $("nb-loader");
    if (loader) {
      loader.hidden = true;
      setTimeout(() => loader.remove(), 500);
    }
  };

  if (document.readyState === "complete") {
    dismissLoader();
  } else {
    window.addEventListener("load", dismissLoader, { once: true });
  }
}
