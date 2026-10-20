import { h } from "../lib/dom.js";

// A label that opens a section of a long page, with an optional note set light after it,
// e.g. "Latest nights" / "one per production".
export const SectionHead = ({ title, note }) =>
  h("h2", { class: "section-head" }, title, note && h("span", { class: "section-head__note" }, note));
