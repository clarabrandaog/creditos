import { h } from "../lib/dom.js";
import { links } from "../router.js";
import { personCredits } from "../domain/credits.js";
import { PageHead } from "../components/page-head.js";
import { Bio } from "../components/bio.js";
import { Tally } from "../components/tally.js";
import { CreditShow } from "../components/credit-show.js";
import { ProductionBlock } from "../components/production-block.js";
import { NightList, nightTags } from "../components/night-list.js";
import { PageActions } from "../components/page-actions.js";
import { BackButton } from "../components/back-button.js";
import { FinePrint } from "../components/fine-print.js";

// Profile: name, an optional bio and link, then every show a person is credited on, each run they were part of, and every night they were on.
export function PersonView(store, person) {
  const credits = personCredits(store, person.id);
  const kind = credits.cast && credits.crew ? "Actor and crew" : credits.cast ? "Actor" : credits.crew ? "Crew" : "Person";
  const aliases = person.aliases ?? [];

  const shows = credits.shows.map(({ show, roles, productions }) => CreditShow({
    title: show.title,
    href: links.show(show.id),
    roles,
    children: productions.length
      ? productions.map(({ production, roles: runRoles, nights }) => ProductionBlock({
          production,
          level: 3,
          children: nights.length
            ? NightList(nights.map(({ performance, role, note }) => ({
                href: links.night(show.id, performance.id),
                performance,
                changed: Boolean(note),
                details: [role, note, ...nightTags(performance, production)].filter(Boolean),
              })))
            : h("p", { class: "production__empty" }, `${runRoles.join(" · ")}. No nights logged for this run yet.`),
        }))
      : h("p", { class: "production__empty" }, "Credited on the show itself, so on every production of it."),
  }));

  const showCount = credits.shows.length;
  return h("div", { class: "view" },
    BackButton(),
    PageHead({ kind, title: person.name, sub: aliases.length ? `Also credited as ${aliases.join(", ")}` : null }),
    Bio({ text: person.bio, link: person.link }),
    Tally({ count: credits.nightCount, one: "night", many: "nights", label: `on ${showCount} show${showCount === 1 ? "" : "s"}` }),
    shows.length ? shows : h("p", { class: "results__empty" }, "No credits logged for this person yet."),
    PageActions([{ href: "#/", label: "Back to search" }]),
    FinePrint());
}
