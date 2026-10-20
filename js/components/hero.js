import { h } from "../lib/dom.js";
import { shrinkToFit } from "../lib/title.js";

const LINES = ["Who", "was", "on", "tonight?"];   // the headline, one word per line

// Line sizes are vw-based (tokens.css), which ignores the page gutters, so on narrow phones a line
// like "WHO" can run past the edge. shrinkToFit measures each line and scales it down when it does.
export function Hero() {
  const spans = LINES.map((text, i) => h("span", { class: `w hero__line--${i + 1}`, dataset: { t: text } }, text));
  const hero = h("h1", { class: "hero", "aria-label": "Who was on tonight?" }, spans);
  shrinkToFit(hero, spans, LINES.map((_, i) => ({ size: `var(--display-hero-${i + 1})` })));
  return hero;
}
