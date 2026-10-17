import { norm, sortByName, latest } from "../lib/utils.js";
import { links } from "../router.js";

// Turns the store into searchable items:
//   { kind: "Show" | "Person" | "Role", label, terms, sub, rows, href? }
// Shows link to their show page. People link to their profile.
// Roles carry rows to expand in place, each row linking to that person.
// Credits are derived here from productions and performances, never stored on a person.
export function buildIndex(store) {
  const credits = {};   // personId -> [{ name: production label, role }]
  const byRole = {};    // role -> [{ personId, label }]
  const add = (personId, label, role) => {
    const mine = (credits[personId] ??= []);
    const holders = (byRole[role] ??= []);
    if (!mine.some(c => c.name === label && c.role === role)) mine.push({ name: label, role });
    if (!holders.some(x => x.personId === personId && x.label === label)) holders.push({ personId, label });
  };

  store.shows.forEach(show => (show.composers ?? []).forEach(id => add(id, show.title, "Composer")));
  store.productions.forEach(production => {
    if (!store.show(production.show)) return;
    const label = store.productionLabel(production);
    production.roster.forEach(entry => add(entry.person, label, entry.role));
  });
  store.performances.forEach(night => {
    const production = store.production(night.production);
    if (!production || !store.show(production.show)) return;
    const label = store.productionLabel(production);
    (night.changes ?? []).forEach(change => add(change.person, label, change.role));
  });

  return [
    ...store.shows.map(show => {
      const run = latest(store.productionsOf(show.id), p => p.number);
      return {
        kind: "Show",
        label: show.title,
        terms: run ? [show.title, run.venue, run.city, run.runType] : [show.title],
        href: links.show(show.id),
        rows: [],
        sub: run ? `${run.venue}, ${run.city} · ${run.runType}` : "no productions yet" };
    }),
    ...store.people.map(person => {
      const mine = credits[person.id] ?? [];
      return { kind: "Person", label: person.name, terms: [person.name, ...(person.aliases ?? [])], href: links.person(person.id),
               sub: `${mine.length} credit${mine.length === 1 ? "" : "s"}`, rows: sortByName(mine) };
    }),
    ...Object.entries(byRole).map(([role, holders]) => ({
      kind: "Role", label: role, terms: [role], sub: `${holders.length} on record`,
      rows: sortByName(holders.map(x => ({ name: store.personName(x.personId), role: x.label, href: links.person(x.personId) }))),
    })),
  ];
}

// Matches names, spelling variants, titles and roles. Swap for a real search call when there is a backend.
export function searchIndex(index, query) {
  const q = norm(query.trim());
  return q ? index.filter(item => item.terms.some(term => norm(term).includes(q))) : [];
}
