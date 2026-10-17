import { h } from "../lib/dom.js";

// A big count with its label underneath, e.g. 12 / nights on record.
export const Tally = ({ count, one, many, label }) =>
  h("p", { class: "tally" }, `${count} ${count === 1 ? one : many}`, h("span", { class: "tally__label" }, label));
