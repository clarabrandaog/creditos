import { h } from "../lib/dom.js";

// One show on a person's profile: its title (a link to the show page), the roles they held on it,
// then one ProductionBlock per run, built by the view.
export function CreditShow({ title, href, roles, children }) {
  return h("section", { class: "credit-show" },
    h("h2", { class: "credit-show__title" }, h("a", { class: "w", href, dataset: { t: title } }, title)),
    h("p", { class: "credit-show__roles" }, roles.join(" · ")),
    children);
}
