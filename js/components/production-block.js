import { h } from "../lib/dom.js";
import { formatDate } from "../lib/utils.js";
import { productionName } from "../data/store.js";

// "Gershwin Theatre, New York · opened 30 Oct 2003, still running" (the run type is the heading)
export function runLine(production) {
  const dates = production.closing
    ? `${formatDate(production.opening)} to ${formatDate(production.closing)}`
    : production.opening ? `opened ${formatDate(production.opening)}, still running` : null;
  return [`${production.venue}, ${production.city}`, dates].filter(Boolean).join(" · ");
}

// One production run: heading, where and when, then whatever the view passes as children.
// level is the heading level (2 on the show page, 3 under a show on a profile).
export function ProductionBlock({ production, level = 2, title, children }) {
  return h("section", { class: "production" },
    h(`h${level}`, { class: "production__title" }, title ?? productionName(production)),
    h("p", { class: "production__sub" }, runLine(production)),
    children);
}
