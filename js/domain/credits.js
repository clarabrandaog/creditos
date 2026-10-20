import { resolveCompany } from "./company.js";

// Newest night first. Date, then curtain time, so a matinee sorts under that evening's show.
const newestFirst = (a, b) => (`${a.date} ${a.time}` < `${b.date} ${b.time}` ? 1 : -1);

// A role is cast when it names one of the show's characters. Everything else is crew or creative.
export const isCastRole = (show, role) => show.characters.some(c => c.name === role);

// Oldest run first, by opening date. A run with no opening date goes last. Ties fall back to the production number.
const oldestRunFirst = (a, b) =>
  (a.opening ?? "9999").localeCompare(b.opening ?? "9999") || a.number - b.number;

// Everything logged for one show: its productions oldest first, each with its nights, newest first.
//   [{ production, nights: [performance] }]
export function showHistory(store, showId) {
  return store.productionsOf(showId)
    .slice().sort(oldestRunFirst)
    .map(production => ({ production, nights: store.performancesOf(production.id).slice().sort(newestFirst) }));
}

// The show page in one pass: every run (from showHistory), the latest night of each run that has one
// (newest first), and the totals across all of them. People counts everyone on a roster, a change or the composers.
//   { runs, latestNights: [{ production, performance }], nightCount, peopleCount }
export function showOverview(store, showId) {
  const runs = showHistory(store, showId);
  const latestNights = runs.filter(run => run.nights.length)
    .map(({ production, nights }) => ({ production, performance: nights[0] }))
    .sort((a, b) => newestFirst(a.performance, b.performance));
  const people = new Set([
    ...(store.show(showId)?.composers ?? []),
    ...runs.flatMap(({ production, nights }) => [
      ...production.roster.map(r => r.person),
      ...nights.flatMap(pf => (pf.changes ?? []).map(c => c.person)),
    ]),
  ]);
  return { runs, latestNights, nightCount: runs.reduce((sum, run) => sum + run.nights.length, 0), peopleCount: people.size };
}

// Every credit for one person, grouped show > production. Derived, never stored on the person.
//   { shows: [{ show, roles, productions: [{ production, roles, nights: [{ performance, role, note? }] }] }],
//     nightCount, productionCount, cast, crew }
// A production role comes from its roster or from any night's change. A night counts only when the
// resolved company has the person on it: a night they were replaced drops out, a night they covered is added.
export function personCredits(store, personId) {
  const shows = [];
  const unique = list => [...new Set(list)];

  store.shows.forEach(show => {
    const showRoles = (show.composers ?? []).includes(personId) ? ["Composer"] : [];
    const productions = showHistory(store, show.id).map(({ production, nights }) => {
      const rosterRoles = production.roster.filter(r => r.person === personId).map(r => r.role);
      const changeRoles = nights.flatMap(pf => (pf.changes ?? []).filter(c => c.person === personId).map(c => c.role));
      const onNights = nights.flatMap(performance => resolveCompany(store, production, performance)
        .filter(row => row.person === personId)
        .map(row => ({ performance, role: row.role, note: row.note })));
      return { production, roles: unique([...rosterRoles, ...changeRoles]), nights: onNights };
    }).filter(p => p.roles.length || p.nights.length);

    if (!showRoles.length && !productions.length) return;
    shows.push({ show, roles: unique([...showRoles, ...productions.flatMap(p => p.roles)]), productions });
  });

  // Shows with the most recent night first. Shows with no nights logged go last, A to Z.
  const lastNight = entry => entry.productions.flatMap(p => p.nights).map(n => `${n.performance.date} ${n.performance.time}`).sort().pop() ?? "";
  shows.sort((a, b) => lastNight(b).localeCompare(lastNight(a)) || a.show.title.localeCompare(b.show.title, "en"));

  const roles = shows.flatMap(entry => entry.roles.map(role => ({ show: entry.show, role })));
  return {
    shows,
    nightCount: shows.reduce((sum, entry) => sum + entry.productions.reduce((n, p) => n + p.nights.length, 0), 0),
    productionCount: shows.reduce((sum, entry) => sum + entry.productions.length, 0),
    cast: roles.some(r => isCastRole(r.show, r.role)),
    crew: roles.some(r => !isCastRole(r.show, r.role)),
  };
}
