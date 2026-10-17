import { h } from "../lib/dom.js";

// rows: [{ name, role, note?, href? }]. A row with a note is drawn as a change for the night.
// A row with an href links the name (to that person's profile).
export function RowList(rows, { variant = "" } = {}) {
  return h("ul", { class: `row-list ${variant}`.trim() }, rows.map(({ name, role, note, href }) =>
    h("li", { class: `row-list__item${note ? " row-list__item--changed" : ""}` },
      href ? h("a", { class: "row-list__name", href }, name) : h("span", { class: "row-list__name" }, name),
      h("span", { class: "row-list__role" }, role),
      note && h("span", { class: "row-list__note" }, note))));
}
