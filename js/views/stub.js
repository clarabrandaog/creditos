import { h } from "../lib/dom.js";
import { links } from "../router.js";
import { resolveCompany } from "../domain/company.js";
import { Ticket } from "../components/ticket.js";
import { CompanySection } from "../components/company-section.js";
import { FinePrint } from "../components/fine-print.js";
import { BackButton } from "../components/back-button.js";

// Stub page for one performance: the ticket, and under it the company (hidden until the tear).
export function StubView(store, show, performance) {
  const production = store.production(performance.production);
  const root = h("div", { class: "view" });
  const back = BackButton();

  const mount = () => {
    const company = CompanySection({
      rows: resolveCompany(store, production, performance).map(row => ({ ...row, href: links.person(row.person) })),
      show: { title: show.title, href: links.show(show.id) },
      onReturn: () => { mount(); window.scrollTo({ top: 0, behavior: "smooth" }); },
    });
    company.hidden = true;
    const ticket = Ticket({
      show, production, performance,
      showHref: links.show(show.id),
      onTear: () => {
        company.hidden = false;
        company.classList.add("company--reveal");
        setTimeout(() => company.scrollIntoView({ behavior: "smooth", block: "start" }), 700);
      },
    });
    root.replaceChildren(back, ticket, company, FinePrint());
  };

  mount();
  return root;
}
