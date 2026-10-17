// Returns a list of readable problems, or an empty list when every id resolves.
import { safeLink } from "../lib/utils.js";

export function findProblems(store) {
  const problems = [];
  const person = (id, where) => { if (id && !store.hasPerson(id)) problems.push(`${where}: person ${id} is not in people.json`); };

  store.shows.forEach(show => (show.composers ?? []).forEach(id => person(id, `show ${show.id}`)));

  store.productions.forEach(production => {
    const show = store.show(production.show);
    if (!show) { problems.push(`production ${production.id}: show ${production.show} is not in shows.json`); return; }
    production.roster.forEach(entry => {
      person(entry.person, `production ${production.id}`);
      if (entry.character && !show.characters.some(c => c.id === entry.character)) {
        problems.push(`production ${production.id}: character ${entry.character} is not in show ${show.id}`);
      }
    });
  });

  store.performances.forEach(night => {
    if (!store.production(night.production)) problems.push(`performance ${night.id}: production ${night.production} is not in productions.json`);
    (night.changes ?? []).forEach(change => { person(change.person, `performance ${night.id}`); person(change.replaces, `performance ${night.id}`); });
  });
  store.people.forEach(p => {
    if (p.link && !safeLink(p.link)) problems.push(`person ${p.id}: link ${p.link} is not a full http(s) address`);
  });
  return problems;
}
