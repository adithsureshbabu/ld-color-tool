let domLoaded = false;
let defaultMode = "lighten";
let defaultColor = "#0099dd";
let defaultAmount = 10;
let defaultInvert = false;

window.addEventListener("DOMContentLoaded", (event) => {
  domLoaded = true;
  let { mode, color, amount, invert } = urlQuery();
  setValues(color, amount, mode, invert);
});

const debounce = (fn, wait = 250, immediate = false) => {
  try {
    let timeout;
    return (...args) => {
      let context = this;
      let later = () => {
        timeout = null;
        if (!immediate) fn.apply(context, args);
      };
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) fn.apply(context, args);
    };
  } catch (err) {
    console.log(err);
  }
};

const cleanHexColr = (value = "") => {
  if (value !== 0 && !value) return;
  value = String(value)
    .replace(/[^a-fA-F0-9]/g, "")
    .substr(0, 6);
  if (value.length === 3)
    return `${value.replace(/([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/g, "#$1$1$2$2$3$3")}`.toLowerCase();
  else if (value.length === 6) return `#${value}`.toLowerCase();
  else if (value.length < 6) return `#${value}${new Array(7).join("9")}`.substr(0, 7).toLowerCase();
};

const showToast = (content = "") => {
  let toast = document.querySelector(".toast_bar");
  if (toast.classList.contains("show_toast")) return;
  let toastTextContainer = document.createElement("div");
  toastTextContainer.classList.add("toast_msg_container");
  let toastText = document.createElement("span");
  toastText.innerText = content;
  toastText.classList.add("toast_message");
  toastTextContainer.appendChild(toastText);
  toast.appendChild(toastTextContainer);
  toast.classList.add("show_toast");
  setTimeout(() => {
    toast.classList.remove("show_toast");
    toast.removeChild(toastTextContainer);
  }, 2000);
};

const colorOut = (color = defaultColor, amount = defaultAmount, mode = defaultMode) => {
  color = tinycolor(color);
  let { _r, _g, _b } = color;
  switch (mode.toLowerCase()) {
    case "lighten":
      amount = (amount * ((1 - color.toHsl().l) * 100)) / 100;
      color = color.lighten(amount);
      break;
    case "darken":
      amount = (amount * (color.toHsl().l * 100)) / 100;
      color = color.darken(amount);
      break;
    case "hue":
      amount = amount * 1;
      color = color.spin(amount);
      break;
    case "saturate":
      amount = (amount * ((1 - color.toHsl().s) * 100)) / 100;
      color = color.saturate(amount);
      break;
    case "desaturate":
      amount = (amount * (color.toHsl().s * 100)) / 100;
      color = color.desaturate(amount);
      break;
    case "invert":
      color = tinycolor(`rgb(${255 - _r},${255 - _g},${255 - _b})`);
      break;
    default:
      break;
  }
  return {
    hex: color.toHexString(),
    rgb: color.toRgbString(),
    hsl: color.toHslString(),
    hsv: color.toHsvString(),
  };
};

const setValues = (color = defaultColor, amount = defaultAmount, mode = defaultMode, invert = defaultInvert) => {
  let invertColor = color;
  if (invert) invertColor = colorOut(color, amount, "invert").hex;
  let { hex, hsl, hsv, rgb } = colorOut(invertColor, amount, mode);
  if (mode.toLowerCase() == "darken") {
    document.querySelector("#rbDarken").checked = true;
    document.querySelector("#rbLighten").checked = false;
  } else {
    document.querySelector("#rbLighten").checked = true;
    document.querySelector("#rbDarken").checked = false;
  }
  document.querySelector("#cbInvert").checked = invert;
  document.querySelector("#slider").value = amount;
  document.querySelector("#sliderInpValue").value = amount;
  document.querySelector(".color_preview").style.backgroundColor = rgb;
  document.querySelector("#txtOutHexColor").value = hex;
  document.querySelector("#txtOutRgbColor").value = rgb;
  document.querySelector("#txtOutHslColor").value = hsl;
  document.querySelector("#txtOutHsvColor").value = hsv;
  document.querySelector("#rcwColorPicker").setAttribute("hex", color);
};

const onColrWhlChnge = (el) => {
  try {
    let color = el.getAttribute("hex");
    let rgbColor = el.getAttribute("rgb");
    if (rgbColor) rgbColor = rgbColor.split(",");
    if (!domLoaded) return;
    if (color) document.querySelector("#txtInpHexColor").value = color;
    if (typeof rgbColor === "object" && rgbColor.length > 0) {
      document.querySelector("#txtInpRColor").value = rgbColor[0];
      document.querySelector("#txtInpGColor").value = rgbColor[1];
      document.querySelector("#txtInpBColor").value = rgbColor[2];
    }
    onColrWhelChngeEnd(el, color);
  } catch (err) {
    console.log(err);
  }
};

const onColrWhelChngeEnd = debounce((el, color) => {
  let mode = document.querySelector("#rbDarken").checked ? "darken" : "lighten";
  let amount = parseNumber(document.querySelector("#sliderInpValue").value);
  let invert = document.querySelector("#cbInvert").checked;
  updateUrlQuery(mode, color.replace(/#/g, ""), amount, invert);
  if (invert) color = colorOut(color, amount, "invert").hex;
  let { hex, hsl, hsv, rgb } = colorOut(color, amount, mode);
  document.querySelector(".color_preview").style.backgroundColor = rgb;
  document.querySelector("#txtOutHexColor").value = hex;
  document.querySelector("#txtOutRgbColor").value = rgb;
  document.querySelector("#txtOutHslColor").value = hsl;
  document.querySelector("#txtOutHsvColor").value = hsv;
});

const onTxtInpColrKeyUp = (event) => {
  event.preventDefault();
  let keyCode = event.which || event.keyCode || event.charCode;
  let color = cleanHexColr(event.target.value);
  if (keyCode === 13) {
    event.target.value = "";
    event.target.value = color;
    document.querySelector("#rcwColorPicker").setAttribute("hex", color);
  }
};

const onTxtInpColrBlur = (event) => {
  let color = cleanHexColr(event.target.value);
  event.target.value = "";
  event.target.value = color;
  document.querySelector("#rcwColorPicker").setAttribute("hex", color);
};

const onTxtInpColrRgbBlur = (event, type = "") => {
  let value = parseInt(event.target.value.replace(/[^0-9]/g, ""), 10);
  if (value !== 0 && !value) value = 0;
  else if (value > 255) value = 255;
  event.target.value = "";
  event.target.value = value;
  onTxtInpColrChnge(type, value);
};

const onTxtInpColrChnge = (type, value) => {
  if (type === "hex") {
    if ((value.startsWith("#") && value.length < 7) || (!value.startsWith("#") && value.length < 6)) return;
    if (!value.startsWith("#")) value = `#${value.substr(0, 6)}`;
    document.querySelector("#rcwColorPicker").setAttribute("hex", value);
  } else if (type === "r") {
    let g = document.querySelector("#txtInpGColor").value;
    let b = document.querySelector("#txtInpBColor").value;
    document.querySelector("#rcwColorPicker").setAttribute("rgb", `${value},${g},${b}`);
  } else if (type === "g") {
    let r = document.querySelector("#txtInpRColor").value;
    let b = document.querySelector("#txtInpBColor").value;
    document.querySelector("#rcwColorPicker").setAttribute("rgb", `${r},${value},${b}`);
  } else if (type === "b") {
    let r = document.querySelector("#txtInpRColor").value;
    let g = document.querySelector("#txtInpGColor").value;
    document.querySelector("#rcwColorPicker").setAttribute("rgb", `${r},${g},${value}`);
  }
};

const validateColorKeyCode = (event) => {
  let keyCode = event.which || event.keyCode || event.charCode;
  return (
    event.ctrlKey ||
    event.altKey ||
    (47 < keyCode && keyCode < 58 && event.shiftKey == false) ||
    (95 < keyCode && keyCode < 106) ||
    keyCode == 8 ||
    keyCode == 9 ||
    (keyCode > 34 && keyCode < 41) ||
    keyCode == 46 ||
    (keyCode > 64 && keyCode < 71) ||
    keyCode == 51
  );
};

const validateIntegerKeyCode = (event) => {
  let keyCode = event.which || event.keyCode || event.charCode;
  return (
    event.ctrlKey ||
    event.altKey ||
    (47 < keyCode && keyCode < 58 && event.shiftKey == false) ||
    (95 < keyCode && keyCode < 106) ||
    keyCode == 8 ||
    keyCode == 9 ||
    (keyCode > 34 && keyCode < 41) ||
    keyCode == 46
  );
};

const validateFloatKeyCode = (event) => {
  let keyCode = event.which || event.keyCode || event.charCode;
  return (
    event.ctrlKey ||
    event.altKey ||
    (47 < keyCode && keyCode < 58 && event.shiftKey == false) ||
    (95 < keyCode && keyCode < 106) ||
    keyCode == 8 ||
    keyCode == 9 ||
    (keyCode > 34 && keyCode < 41) ||
    keyCode == 46 ||
    keyCode == 190 ||
    keyCode == 110
  );
};

const onSliderInpChngeEnd = debounce((value) => {
  let mode = document.querySelector("#rbDarken").checked ? "darken" : "lighten";
  let color = document.querySelector("#txtInpHexColor").value;
  let amount = parseNumber(value);
  let invert = document.querySelector("#cbInvert").checked;
  updateUrlQuery(mode, color.replace(/#/g, ""), amount, invert);
  if (invert) color = colorOut(color, amount, "invert").hex;
  let { hex, hsl, hsv, rgb } = colorOut(color, amount, mode);
  document.querySelector(".color_preview").style.backgroundColor = rgb;
  document.querySelector("#txtOutHexColor").value = hex;
  document.querySelector("#txtOutRgbColor").value = rgb;
  document.querySelector("#txtOutHslColor").value = hsl;
  document.querySelector("#txtOutHsvColor").value = hsv;
});

const onSliderInpChnge = (event) => {
  let value = parseNumber(event.target.value);
  if (value > 99.2) event.target.step = 0.1;
  else event.target.step = 0.4;
  document.querySelector("#sliderInpValue").value = value;
  onSliderInpChngeEnd(value);
};

const onSliderTxtInpChnge = (value) => {
  value = parseNumber(value);
  if (value !== 0 && !value) return;
  else if (value > 100) value = 100;
  document.querySelector("#slider").value = value;
  onSliderInpChngeEnd(value);
};

const onSliderTxtInpKeyPres = (event) => {
  event.preventDefault();
  let keyCode = event.which || event.keyCode || event.charCode;
  let value = parseNumber(event.target.value.replace(/[^0-9.]/g, ""));
  if (value !== 0 && !value) value = 0;
  else if (value > 100) value = 100;
  if (keyCode === 13) {
    event.target.value = "";
    event.target.value = value;
    document.querySelector("#slider").value = value;
    onSliderInpChngeEnd(value);
  }
};

const onSliderTxtInpBlur = (event) => {
  let value = parseNumber(event.target.value.replace(/[^0-9.]/g, ""));
  if (value !== 0 && !value) value = 0;
  else if (value > 100) value = 100;
  event.target.value = "";
  event.target.value = value;
  document.querySelector("#slider").value = value;
  onSliderInpChngeEnd(value);
};

const onRbOptnChnge = (el) => {
  let mode = el.value.toLowerCase();
  let color = document.querySelector("#txtInpHexColor").value;
  let amount = parseNumber(document.querySelector("#sliderInpValue").value);
  let invert = document.querySelector("#cbInvert").checked;
  updateUrlQuery(mode, color.replace(/#/g, ""), amount, invert);
  if (invert) color = colorOut(color, amount, "invert").hex;
  let { hex, hsl, hsv, rgb } = colorOut(color, amount, mode);
  document.querySelector(".color_preview").style.backgroundColor = rgb;
  document.querySelector("#txtOutHexColor").value = hex;
  document.querySelector("#txtOutRgbColor").value = rgb;
  document.querySelector("#txtOutHslColor").value = hsl;
  document.querySelector("#txtOutHsvColor").value = hsv;
};

const onCbOptnChnge = (el) => {
  let mode = document.querySelector("#rbDarken").checked ? "darken" : "lighten";
  let color = document.querySelector("#txtInpHexColor").value;
  let amount = parseNumber(document.querySelector("#sliderInpValue").value);
  let invert = el.checked;
  updateUrlQuery(mode, color.replace(/#/g, ""), amount, invert);
  if (invert) color = colorOut(color, amount, "invert").hex;
  let { hex, hsl, hsv, rgb } = colorOut(color, amount, mode);
  document.querySelector(".color_preview").style.backgroundColor = rgb;
  document.querySelector("#txtOutHexColor").value = hex;
  document.querySelector("#txtOutRgbColor").value = rgb;
  document.querySelector("#txtOutHslColor").value = hsl;
  document.querySelector("#txtOutHsvColor").value = hsv;
};

const copyText = (text) => {
  let input = document.createElement("input");
  document.body.appendChild(input);
  input.value = text;
  input.select();
  document.execCommand("copy", false);
  input.remove();
  showToast(`${text} copied!`);
};

const getParamFromUrl = (param = "", type = "") => {
  let queryString = window.location.href.split("/").pop();
  param = new URLSearchParams(queryString).get(param);
  if (!param) return "";
  param = decodeURIComponent(param).toLowerCase();
  if (type === "alphabet") param = param.replace(/[^a-zA-Z]/g, "");
  if (type === "hex") param = param.replace(/[^a-fA-F0-9]/g, "");
  return param;
};

const parseNumber = (value = 0, places = 2, multiple = 0.1) => {
  return Number(
    (Math.ceil(parseFloat(value.toString().replace(/[^0-9.]/g, "")) / multiple) * multiple).toFixed(places)
  );
};

const urlQuery = () => {
  let mode = getParamFromUrl("mode", "alphabet");
  let color = getParamFromUrl("color", "hex").substr(0, 6);
  let amount = parseNumber(getParamFromUrl("amount"));
  let invert = String(getParamFromUrl("invert", "alphabet")) === "true";
  if (!mode) mode = defaultMode;
  if (!color) color = defaultColor.toLowerCase();
  else color = cleanHexColr(color);
  if (amount !== 0 && !amount) amount = defaultAmount;
  else if (amount > 100) amount = 100;
  updateUrlQuery(mode, color.replace(/#/g, ""), amount, invert);
  return { mode, color, amount, invert };
};

const updateUrlQuery = (mode = defaultMode, color = defaultColor, amount = defaultAmount, invert = defaultInvert) => {
  mode = encodeURIComponent(mode.replace(/[^a-zA-Z]/g, "").toLowerCase());
  color = color.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  amount = encodeURIComponent(String(amount).replace(/[^0-9.]/g, ""));
  invert = encodeURIComponent(String(invert).replace(/[^a-zA-Z]/g, ""));
  if (!window.history.pushState) return;
  let baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
  let url = new URL(baseUrl);
  url.searchParams.set("mode", mode);
  url.searchParams.set("color", color);
  url.searchParams.set("amount", amount);
  url.searchParams.set("invert", invert);
  window.history.pushState({}, "", url);
};
