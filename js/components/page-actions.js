import { h } from "../lib/dom.js";

// A row of text links at the foot of a page. links: [{ href, label }]
export const PageActions = links =>
  h("nav", { class: "page-actions", "aria-label": "More" }, links.map(({ href, label }) => h("a", { class: "link-btn", href }, label)));
