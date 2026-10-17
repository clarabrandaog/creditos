import { h } from "../lib/dom.js";

const LINES = ["Who", "was", "on", "tonight?"];   // the headline, one word per line

export const Hero = () =>
  h("h1", { class: "hero", "aria-label": "Who was on tonight?" },
    LINES.map((text, i) => h("span", { class: `w hero__line--${i + 1}`, dataset: { t: text } }, text)));
