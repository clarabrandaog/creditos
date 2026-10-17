import { h } from "../lib/dom.js";
import { RowList } from "./row-list.js";

// rows come from domain/company.js (with an href per person). onReturn() puts the stub back.
// show: { title, href } links to the show page.
export function CompanySection({ rows, show, onReturn }) {
  const count = rows.length;
  return h("section", { class: "company", "aria-label": "Company of this performance" },
    h("h2", { class: "company__count" }, `${count} ${count === 1 ? "person" : "people"}`, h("span", { class: "company__count-label" }, "were on this night")),
    h("p", { class: "company__rule" }, "Everyone is set at the same size and listed A to Z."),
    RowList(rows),
    h("div", { class: "company__actions" },
      h("button", { class: "link-btn", type: "button", onclick: onReturn }, "Return the stub"),
      show && h("a", { class: "link-btn", href: show.href }, `Every night of ${show.title}`),
      h("a", { class: "link-btn", href: "#/" }, "Back to search")));
}
