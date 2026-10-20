// Run with:  npm test   (Node 20+, no dependencies)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "../js/data/store.js";
import { findProblems } from "../js/data/integrity.js";
import { resolveCompany } from "../js/domain/company.js";
import { buildIndex, searchIndex } from "../js/domain/search-index.js";
import { fitLines } from "../js/lib/title.js";
import { formatDate, safeLink } from "../js/lib/utils.js";
import { parseRoute, links } from "../js/router.js";
import { showHistory, showOverview, personCredits } from "../js/domain/credits.js";

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const store = createStore({ shows: read("shows"), productions: read("productions"), performances: read("performances"), people: read("people") });
const index = buildIndex(store);
const company = id => {
  const night = store.performances.find(p => p.id === id);
  return resolveCompany(store, store.production(night.production), night);
};

test("every id in the data resolves", () => assert.deepEqual(findProblems(store), []));

test("a night with a change shows the swap and a note", () => {
  const light = company("wicked-p1-7852").find(r => r.role === "Light operator");
  assert.equal(light.name, "David Harris");
  assert.equal(light.note, "On for Emily Cooper");
});

test("a night without changes uses the default roster", () => {
  const light = company("wicked-p1-7851").find(r => r.role === "Light operator");
  assert.equal(light.name, "Emily Cooper");
  assert.equal(light.note, undefined);
});

test("two productions of one show can have different casts", () => {
  const elphaba = id => company(id).find(r => r.role === "Elphaba").name;
  assert.equal(elphaba("wicked-p1-7850"), "Jessica Vosk");
  assert.notEqual(store.production("wicked-p2").roster.find(r => r.role === "Elphaba").person, "p-jessica-vosk");
});

test("company is sorted A to Z", () => {
  const names = company("wicked-p1-7852").map(r => r.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
});

test("search ignores accents and finds spelling variants", () => {
  assert.equal(searchIndex(index, "anais")[0].label, "Anaïs Mitchell");
  assert.equal(searchIndex(index, "renee")[0].label, "Renée Elise Goldsberry");
});

test("a person's credits are derived from every production", () => {
  const jessica = searchIndex(index, "vosk").find(i => i.kind === "Person");
  assert.ok(jessica.rows.some(r => r.name === "Wicked, broadway" && r.role === "Elphaba"));
});

test("a show's default stub is its most recent night", () => {
  assert.equal(store.latestPerformance("wicked").id, "wicked-p1-7852");
  assert.equal(store.latestPerformance("wicked", "wicked-p1-7850").id, "wicked-p1-7850");
});

test("title lines: one line per word, alternating wide and condensed", () => {
  const lines = fitLines("The Lion King");
  assert.deepEqual(lines.map(l => l.text), ["The", "Lion", "King"]);
  assert.deepEqual(lines.map(l => l.wide), [true, false, true]);
});

test("title lines: words of 1 or 2 letters join the next word", () => {
  assert.deepEqual(fitLines("It Is Over").map(l => l.text), ["It Is Over"]);
  assert.deepEqual(fitLines("A Last Showing").map(l => l.text), ["A Last", "Showing"]);
});

test("routes", () => {
  assert.deepEqual(parseRoute("#/"), { name: "home" });
  assert.deepEqual(parseRoute("#/show/hamilton"), { name: "show", showId: "hamilton", performanceId: undefined });
  assert.deepEqual(parseRoute("#/show/wicked/wicked-p1-7850"), { name: "show", showId: "wicked", performanceId: "wicked-p1-7850" });
  assert.deepEqual(parseRoute("#/person/p-jessica-vosk"), { name: "person", personId: "p-jessica-vosk" });
  assert.equal(links.night("wicked", "wicked-p1-7850"), "#/show/wicked/wicked-p1-7850");
});

test("show page: productions in order, nights newest first, empty runs kept", () => {
  const history = showHistory(store, "wicked");
  assert.deepEqual(history.map(r => r.production.id), ["wicked-p1", "wicked-p2"]);
  assert.equal(history[0].nights[0].id, "wicked-p1-7852");
  assert.equal(history[1].nights.length, 0);
});

test("show page: latest night of each run, totals across every run", () => {
  const wicked = showOverview(store, "wicked");
  assert.deepEqual(wicked.latestNights.map(n => n.performance.id), ["wicked-p1-7852"]);   // the touring run has no nights yet
  assert.equal(wicked.nightCount, 4);
  assert.ok(wicked.peopleCount >= store.production("wicked-p1").roster.length);
  const hadestown = showOverview(store, "hadestown").latestNights.map(n => `${n.performance.date} ${n.performance.time}`);
  assert.deepEqual(hadestown, [...hadestown].sort().reverse());
});

test("profile: a cover night is added with its note", () => {
  const julia = personCredits(store, "p-julia-k-harriman");
  const p1 = julia.shows[0].productions.find(p => p.production.id === "wicked-p1");
  assert.deepEqual(p1.nights.map(n => n.performance.id), ["wicked-p1-7851"]);
  assert.equal(p1.nights[0].note, "On for Amanda Jane Cooper");
  assert.ok(julia.cast && !julia.crew);
});

test("profile: a night someone was replaced drops out", () => {
  const amanda = personCredits(store, "p-amanda-jane-cooper");
  assert.ok(!amanda.shows[0].productions[0].nights.some(n => n.performance.id === "wicked-p1-7851"));
  assert.equal(amanda.nightCount, 3);
});

test("profile: roles on a run with no nights still count", () => {
  const emily = personCredits(store, "p-emily-cooper");
  const p2 = emily.shows.find(e => e.show.id === "wicked").productions.find(p => p.production.id === "wicked-p2");
  assert.deepEqual(p2.roles, ["Light operator"]);
  assert.equal(p2.nights.length, 0);
  assert.ok(emily.crew && !emily.cast);
});

test("profile: show-level composer credit sits with production roles", () => {
  const stephen = personCredits(store, "p-stephen-schwartz");
  assert.deepEqual(stephen.shows[0].roles, ["Composer", "Music director"]);
});

test("dates read the same everywhere", () => {
  assert.equal(formatDate("2026-03-15"), "15 Mar 2026");
  assert.equal(formatDate("2026-03-11"), "11 Mar 2026");
});

test("profile links: only full http(s) addresses get through", () => {
  assert.equal(safeLink("https://example.com/me").hostname, "example.com");
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("example.com"), null);
});
