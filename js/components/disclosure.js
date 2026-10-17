import { h } from "../lib/dom.js";

// A text toggle that shows or hides `content`. Closed to start.
export function Disclosure({ openLabel, closeLabel, content }) {
  const panel = h("div", { class: "disclosure__panel", hidden: true }, content);
  const toggle = h("button", { class: "link-btn disclosure__toggle", type: "button", "aria-expanded": "false" }, openLabel);
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.textContent = open ? openLabel : closeLabel;
    panel.hidden = open;
  });
  return h("div", { class: "disclosure" }, toggle, panel);
}
