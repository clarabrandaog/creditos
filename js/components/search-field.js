import { h } from "../lib/dom.js";

// onInput(value) runs on every keystroke and when a hint is clicked.
export function SearchField({ value = "", hints = [], onInput }) {
  const input = h("input", { class: "search-field__input", id: "q", type: "search", placeholder: "type a name", autocomplete: "off", spellcheck: "false" });
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));

  const hintButtons = hints.map(text =>
    h("button", { class: "link-btn", type: "button", onclick: () => { input.value = text; onInput(text); input.focus(); } }, text));

  return h("form", { class: "search-field", role: "search", onsubmit: e => e.preventDefault() },
    h("label", { class: "search-field__label", for: "q" }, "Search a show, a venue, a person, or a role."),
    input,
    h("p", { class: "search-hints" }, h("span", {}, "Try"), ...hintButtons));
}
