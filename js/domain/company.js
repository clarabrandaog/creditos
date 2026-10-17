import { sortByName } from "../lib/utils.js";

// A night's company = the production's roster with that night's changes applied.
// Returns display-ready rows: { person (id), name, role, note? }, sorted A to Z.
export function resolveCompany(store, production, performance) {
  const rows = production.roster.map(entry => ({ ...entry }));
  for (const change of performance.changes ?? []) {
    const note = change.replaces ? `On for ${store.personName(change.replaces)}` : "Added tonight";
    const hit = rows.find(r => r.role === change.role && r.person === change.replaces);
    if (hit) Object.assign(hit, { person: change.person, note });
    else rows.push({ role: change.role, person: change.person, note });
  }
  return sortByName(rows.map(r => ({ person: r.person, name: store.personName(r.person), role: r.role, note: r.note })));
}
