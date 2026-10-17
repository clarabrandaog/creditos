import { h } from "../lib/dom.js";
import { formatDate } from "../lib/utils.js";

// nights: [{ href, performance, details: [text], changed? }]. Each row links to that night's stub.
// A changed row gets the pink marker, the same one RowList uses for a change on the night.
export function NightList(nights) {
  return h("ul", { class: "night-list" }, nights.map(({ href, performance, details = [], changed }) =>
    h("li", { class: `night-list__item${changed ? " night-list__item--changed" : ""}` },
      h("a", { class: "night-list__link", href },
        h("span", { class: "night-list__date" }, formatDate(performance.date)),
        h("span", { class: "night-list__time" }, `${performance.time} · no. ${performance.number}`),
        details.length > 0 && h("span", { class: "night-list__detail" }, details.join(" · "))))));
}

// The tags every night can carry, whoever is looking at it.
export function nightTags(performance, production) {
  const tags = [];
  if (performance.preview) tags.push("Preview");
  if (performance.matinee) tags.push("Matinee");
  if (performance.venue && performance.venue !== production.venue) tags.push(`${performance.venue}, ${performance.city ?? production.city}`);
  return tags;
}
