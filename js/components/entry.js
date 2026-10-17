import { h } from "../lib/dom.js";
import { RowList } from "./row-list.js";

// One search result. Shows are links to their stub page. People and roles expand in place.
export function Entry(item) {
  const content = [
    h("span", { class: "entry__kind" }, item.kind),
    h("span", { class: "entry__label w", dataset: { t: item.label } }, item.label),
    h("span", { class: "entry__sub" }, item.sub),
  ];
  if (item.href) return h("li", { class: "entry" }, h("a", { class: "entry__head", href: item.href }, ...content));

  const detail = RowList(item.rows, { variant: "row-list--dashed" });
  detail.hidden = true;
  const head = h("button", { class: "entry__head", type: "button", "aria-expanded": "false" }, ...content);
  head.addEventListener("click", () => {
    const open = head.getAttribute("aria-expanded") === "true";
    head.setAttribute("aria-expanded", String(!open));
    detail.hidden = open;
  });
  return h("li", { class: "entry" }, head, detail);
}
