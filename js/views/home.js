import { h } from "../lib/dom.js";
import { buildIndex, searchIndex } from "../domain/search-index.js";
import { Hero } from "../components/hero.js";
import { SearchField } from "../components/search-field.js";
import { Entry } from "../components/entry.js";
import { FinePrint } from "../components/fine-print.js";
import { links } from "../router.js";
import { formatDate } from "../lib/utils.js";

const HINTS = ["Wicked", "stage manager", "Gershwin Theatre"];
let lastQuery = "";   // survives a trip to a stub page and back

// With no query: one card per show for its most recent night, newest first, labelled with that
// night's date and venue (a touring night may have its own). Shows with no nights go last.
function latestPerformances(store) {
  return store.shows.map(show => {
    const night = store.latestPerformance(show.id);
    if (!night) return { kind: "No nights logged yet", label: show.title, sub: "", href: links.show(show.id), date: "" };
    const production = store.production(night.production);
    const venue = night.venue ?? production.venue;
    const city = night.city ?? production.city;
    return { kind: [formatDate(night.date), night.time].filter(Boolean).join(" · "), label: show.title, sub: `${venue}, ${city} · ${production.runType}`,
             href: links.night(show.id, night.id), date: `${night.date} ${night.time ?? ""}` };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// Home: hero, search field, then either the latest performances (empty query) or matching results.
// Latest performance cards open that night's stub. In results, shows open their show page.
export function HomeView(store) {
  const index = buildIndex(store);
  const latest = latestPerformances(store);
  const status = h("p", { class: "results__status", "aria-live": "polite" });
  const list = h("ul", { class: "entry-list" });

  const update = query => {
    lastQuery = query;
    const searching = query.trim() !== "";
    const found = searching ? searchIndex(index, query) : latest;
    list.className = `entry-list entry-list--${searching ? "lines" : "stubs"}`;
    status.textContent = !searching ? "Latest performances" : found.length ? `${found.length} match${found.length > 1 ? "es" : ""}` : "";
    list.replaceChildren(...(found.length
      ? found.map(Entry)
      : [h("li", { class: "results__empty" }, `No match for "${query.trim()}". Accents and capitals are ignored. Try a first name, a role or part of a title.`)]));
  };

  const field = SearchField({ value: lastQuery, hints: HINTS, onInput: update });
  update(lastQuery);
  return h("div", { class: "view view--home" }, Hero(), field, status, list, FinePrint());
}
