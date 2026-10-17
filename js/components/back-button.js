import { h } from "../lib/dom.js";

// "← Back" at the top of every page but home. Goes back to wherever the visitor came from.
// Opened directly (no history), it goes home.
export const BackButton = () => h("button", {
  class: "link-btn link-btn--back", type: "button",
  onclick: () => (history.length > 1 ? history.back() : (location.hash = "#/")),
}, "← Back");
