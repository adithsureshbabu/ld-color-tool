/* ============================================
   app.js — Lighten/Darken Color Tool
   State-driven rendering, event delegation
   ============================================ */

// ==================== STATE ====================

const DEFAULTS = Object.freeze({
  color: "#0099dd",
  mode: "lighten",
  amount: 40,
  invert: false,
  contrastBg: "#FFFFFF"
});

const state = { ...DEFAULTS };

const setState = updates => {
  Object.assign(state, updates);
  render();
  syncToUrl();
};

// ==================== URL SYNC ====================

const readFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const mode = (params.get("mode") || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  const color = (params.get("color") || "").replace(/[^a-fA-F0-9]/g, "").substring(0, 6);
  const amount = parseFloat(params.get("amount"));
  const invert = params.get("invert") === "true";

  if (mode === "lighten" || mode === "darken") state.mode = mode;
  if (color.length === 6) {
    state.color = `#${color.toLowerCase()}`;
  } else if (color.length === 3) {
    state.color = `#${color[0]}${color[0]}${color[1]}${color[1]}${color[2]}${color[2]}`.toLowerCase();
  }
  if (!isNaN(amount) && amount >= 0 && amount <= 100) {
    state.amount = Math.round(amount * 10) / 10;
  }
  state.invert = invert;
};

const syncToUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("color", state.color.replace("#", ""));
  url.searchParams.set("amount", state.amount);
  url.searchParams.set("invert", state.invert);
  history.pushState({}, "", url);
};

// ==================== COLOR MATH ====================

const rgbToAnsi = (r, g, b) => {
  const ar = r >= 75 ? Math.floor((r - 35) / 40) : 0;
  const ag = g >= 75 ? Math.floor((g - 35) / 40) : 0;
  const ab = b >= 75 ? Math.floor((b - 35) / 40) : 0;
  return ar * 36 + ag * 6 + ab + 16;
};

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

const luminance = ({ r, g, b }) => {
  const [rl, gl, bl] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
};

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

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

// ==================== RENDER ====================

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
};

const renderPickerInputs = () => {
  const { r, g, b } = tinycolor(state.color).toRgb();
  $("hexInput").value = state.color;
  $("rInput").value = r;
  $("gInput").value = g;
  $("bInput").value = b;
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
  input.value = state.amount;
  styleSlider(slider);
};

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

// ==================== CLIPBOARD ====================

const copyToClipboard = async (text, triggerEl) => {
  try {
    await navigator.clipboard.writeText(text);
    showTooltip(triggerEl);
  } catch {
    /* clipboard unavailable */
  }
};

const showTooltip = target => {
  for (const tip of $$(".nb-tooltip--visible")) {
    tip.classList.remove("nb-tooltip--visible");
  }
  target.classList.add("nb-tooltip--visible");
  setTimeout(() => target.classList.remove("nb-tooltip--visible"), 2000);
};

const flashCopyButton = btn => {
  btn.classList.add("nb-output-row__copy--flash");
  setTimeout(() => btn.classList.remove("nb-output-row__copy--flash"), 300);
};

// ==================== COLOR WHEEL ====================

let wheelReady = false;

const onColorWheelChange = () => {
  if (!wheelReady) return;
  const hex = $("colorWheel").getAttribute("hex");
  if (!hex) return;
  state.color = hex.toLowerCase();
  render();
  syncToUrl();
};

const setColorWheel = hex => {
  wheelReady = false;
  $("colorWheel").setAttribute("hex", hex);
  wheelReady = true;
};

// ==================== EVENTS ====================

const setupEvents = () => {
  const bento = document.querySelector(".bento");

  $("colorWheel").addEventListener("change", onColorWheelChange);

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
    }
  });

  bento.addEventListener("input", e => {
    const { target } = e;
    const { action } = target.dataset;

    if (action === "hex-input") {
      let val = target.value.replace(/[^a-fA-F0-9#]/g, "");
      if (!val.startsWith("#")) val = `#${val}`;
      if (val.length === 7) {
        setColorWheel(val);
        setState({ color: val.toLowerCase() });
      }
    } else if (action === "rgb-input") {
      const v = Math.min(255, Math.max(0, parseInt(target.value, 10)));
      if (isNaN(v)) return;
      const r = parseInt($("rInput").value, 10) || 0;
      const g = parseInt($("gInput").value, 10) || 0;
      const b = parseInt($("bInput").value, 10) || 0;
      const hex = tinycolor({ r, g, b }).toHexString();
      setColorWheel(hex);
      setState({ color: hex });
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
    } else if (action === "contrast-bg-input") {
      let val = target.value.trim();
      if (!val.startsWith("#")) val = `#${val}`;
      if (val.length === 7 && tinycolor(val).isValid()) {
        state.contrastBg = val;
        renderContrast(computeOutput(state).hex);
      }
    }
  });
};

// ==================== JSON API ====================

const buildJsonResponse = () => {
  const output = computeOutput(state);
  const contrast = computeContrast(output.hex, state.contrastBg);
  const harmonies = computeHarmonies(output.hex);
  const shades = computeShadeScale(output.hex);

  return {
    input: { color: state.color, mode: state.mode, amount: state.amount, invert: state.invert },
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

readFromUrl();

if (new URLSearchParams(window.location.search).get("format") === "json") {
  renderJsonPage(buildJsonResponse());
} else {
  setColorWheel(state.color);
  wheelReady = true;
  render();
  setupEvents();

  const loader = $("nb-loader");
  if (loader) {
    loader.hidden = true;
    setTimeout(() => loader.remove(), 300);
  }
}
