// DATA LAYER. Four JSON files linked only by ids:
//   people.json       one record per person (name + spelling variants)
//   shows.json        the piece itself: show-level fields and its default characters
//   productions.json  one record per production run: venue, city, dates, language, and that run's roster
//   performances.json one record per night: date, time and that night's changes
// Chain: performance > production > show. People appear only as ids.
import { DATA_DIR, DATA_FILES } from "../config.js";
import { latest } from "../lib/utils.js";

export async function loadData(fetchFn = fetch) {
  const [shows, productions, performances, people] = await Promise.all(DATA_FILES.map(async name => {
    const res = await fetchFn(`${DATA_DIR}/${name}.json`);
    if (!res.ok) throw new Error(`Could not load ${name}.json (${res.status})`);
    return res.json();
  }));
  return { shows, productions, performances, people };
}

// How a production run is named everywhere: "broadway" for a Broadway run, otherwise its city
// ("Chicago" for a tour). Falls back to the run type, then its number, when those are missing.
export const productionName = pr =>
  pr.runType === "broadway" ? pr.runType : pr.city || pr.runType || `production ${pr.number}`;

// Wraps the four arrays with lookups. Everything else in the app asks the store, never the raw arrays.
export function createStore({ shows, productions, performances, people }) {
  const showById = Object.fromEntries(shows.map(s => [s.id, s]));
  const productionById = Object.fromEntries(productions.map(p => [p.id, p]));
  const personById = Object.fromEntries(people.map(p => [p.id, p]));
  const nightsByProduction = {};
  performances.forEach(pf => (nightsByProduction[pf.production] ??= []).push(pf));
  const store = {
    shows, productions, performances, people,
    show: id => showById[id],
    production: id => productionById[id],
    person: id => personById[id],
    hasPerson: id => id in personById,
    personName: id => personById[id]?.name ?? id,
    productionsOf: showId => productions.filter(p => p.show === showId),
    performancesOf: productionId => nightsByProduction[productionId] ?? [],
    performancesOfShow: showId => performances.filter(pf => productionById[pf.production]?.show === showId),
    productionLabel: pr => `${showById[pr.show].title}, ${productionName(pr)}`,
    // the performance asked for, otherwise the show's most recent night (time breaks a two-show day)
    latestPerformance: (showId, performanceId) => {
      const nights = store.performancesOfShow(showId);
      return nights.find(pf => pf.id === performanceId) ?? latest(nights, pf => `${pf.date} ${pf.time ?? ""}`);
    },
  };
  return store;
}
