import { h } from "../lib/dom.js";
import { formatDate, sortByName } from "../lib/utils.js";
import { links } from "../router.js";
import { productionName } from "../data/store.js";
import { showOverview } from "../domain/credits.js";
import { PageHead } from "../components/page-head.js";
import { Facts } from "../components/facts.js";
import { Tally } from "../components/tally.js";
import { SectionHead } from "../components/section-head.js";
import { Entry } from "../components/entry.js";
import { ProductionBlock } from "../components/production-block.js";
import { NightList, nightTags, nightNumber } from "../components/night-list.js";
import { Disclosure } from "../components/disclosure.js";
import { RowList } from "../components/row-list.js";
import { PageActions } from "../components/page-actions.js";
import { BackButton } from "../components/back-button.js";
import { FinePrint } from "../components/fine-print.js";

const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// How a run is titled on this page: its run type, plus its number when another run of the show has the same type.
function runTitles(runs) {
  const names = runs.map(({ production }) => productionName(production));
  return new Map(runs.map(({ production }, i) => [production.id,
    names.filter(name => name === names[i]).length > 1 ? `${names[i]} ${production.number}` : names[i]]));
}

// The latest night of one run, as a stub card like the home page. Opens that night's stub.
function latestCard(show, title, { production, performance }) {
  const changes = (performance.changes ?? []).length;
  return Entry({
    kind: [formatDate(performance.date), nightNumber(performance)].filter(Boolean).join(" · "),
    label: title,
    sub: [`${performance.venue ?? production.venue}, ${performance.city ?? production.city}`,
          performance.preview && "preview", performance.matinee && "matinee",
          changes && plural(changes, "change")].filter(Boolean).join(" · "),
    href: links.night(show.id, performance.id),
  });
}

// One run: where and when, its counts, every night, then the company behind a toggle.
function runBlock(store, show, title, { production, nights }) {
  const company = sortByName(production.roster.map(entry => ({
    name: store.personName(entry.person), role: entry.role, href: links.person(entry.person),
  })));
  const rows = nights.map(performance => {
    const changes = (performance.changes ?? []).length;
    return {
      href: links.night(show.id, performance.id),
      performance,
      changed: changes > 0,
      details: [...nightTags(performance, production), changes && `${plural(changes, "change")} to the company`].filter(Boolean),
    };
  });

  return ProductionBlock({
    production,
    title,
    level: 3,
    meta: [plural(nights.length, "night"), `company of ${company.length}`, production.language?.toUpperCase()].filter(Boolean),
    children: [
      nights.length ? NightList(rows) : h("p", { class: "production__empty" }, "No nights logged for this run yet."),
      company.length > 0 && Disclosure({
        openLabel: `Company of this run (${company.length})`,
        closeLabel: "Hide the company",
        content: RowList(company, { variant: "row-list--dashed" }),
      }),
    ],
  });
}

// Show page: an aggregate of the piece. Its facts and totals, the latest night of every run
// (each opens its stub), then every production with its nights and company.
export function ShowView(store, show) {
  const { runs, latestNights, nightCount, peopleCount } = showOverview(store, show.id);
  const titles = runTitles(runs);

  const composers = (show.composers ?? []).map(id => h("a", { class: "link-btn", href: links.person(id) }, store.personName(id)));
  const facts = Facts([
    ["Premiere", show.premiereYear],
    ["Style", show.style],
    ["Origin", capitalize(show.origin) + (show.jukebox ? ", jukebox" : "")],
    ["Acts", show.acts],
    ["Language", show.originalLanguage?.toUpperCase()],
    [composers.length === 1 ? "Composer" : "Composers", composers],
    ["Credited", peopleCount ? plural(peopleCount, "person", "people") : null],
  ]);

  return h("div", { class: "view" },
    BackButton(),
    PageHead({ kind: `Show · ${show.genre ?? ""}`.replace(/ · $/, ""), title: show.title, sub: show.synopsis }),
    facts,
    Tally({ count: nightCount, one: "night", many: "nights", label: `across ${plural(runs.length, "production")}` }),

    latestNights.length > 0 && [
      SectionHead({ title: latestNights.length === 1 ? "Latest night" : "Latest nights", note: latestNights.length > 1 ? "one per production, newest first" : "open the stub to see who was on" }),
      h("ul", { class: "entry-list entry-list--stubs entry-list--compact" }, latestNights.map(night => latestCard(show, titles.get(night.production.id), night))),
    ],

    SectionHead({ title: "Productions", note: runs.length ? `${plural(runs.length, "run")}, in order` : null }),
    runs.length ? runs.map(run => runBlock(store, show, titles.get(run.production.id), run)) : h("p", { class: "results__empty" }, "No productions logged for this show yet."),

    PageActions([{ href: "#/", label: "Back to search" }]),
    FinePrint());
}
