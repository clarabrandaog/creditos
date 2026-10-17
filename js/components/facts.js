import { h } from "../lib/dom.js";

// facts: [[term, value]]. A value can be text or elements (links). Empty values are skipped.
export function Facts(facts) {
  const shown = facts.filter(([, value]) => value != null && value !== "" && !(Array.isArray(value) && !value.length));
  return h("dl", { class: "facts" }, shown.map(([term, value]) =>
    h("div", { class: "facts__item" }, h("dt", {}, term), h("dd", {}, Array.isArray(value) ? value : String(value)))));
}
