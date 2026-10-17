import { h } from "../lib/dom.js";
import { fitLines, shrinkToFit } from "../lib/title.js";

// Top of a show or person page: a small kind label, the title fitted line by line
// like the ticket (sizes from lib/title.js), and an optional line under it.
export function PageHead({ kind, title, sub }) {
  const fitted = fitLines(title);
  const lines = fitted.map(line =>
    h("span", { class: `w page-head__line page-head__line--${line.wide ? "wide" : "narrow"}`, dataset: { t: line.text }, style: { fontSize: line.size } }, line.text));
  const heading = h("h1", { class: "page-head__title", "aria-label": title }, lines);

  shrinkToFit(heading, lines, fitted);

  return h("header", { class: "page-head" },
    h("p", { class: "page-head__kind" }, kind),
    heading,
    sub && h("p", { class: "page-head__sub" }, sub));
}
