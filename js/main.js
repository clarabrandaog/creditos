import { h } from "./lib/dom.js";
import { loadData, createStore } from "./data/store.js";
import { findProblems } from "./data/integrity.js";
import { startRouter } from "./router.js";
import { HomeView } from "./views/home.js";
import { StubView } from "./views/stub.js";
import { ShowView } from "./views/show.js";
import { PersonView } from "./views/person.js";

const app = document.getElementById("app");

// #/show/<id> opens the show page, #/show/<id>/<night> its stub, #/person/<id> a profile.
// Anything that does not resolve falls back to home.
function pickView(store, route) {
  if (route.name === "show") {
    const show = store.show(route.showId);
    if (show && !route.performanceId) return ShowView(store, show);
    const night = show && store.latestPerformance(show.id, route.performanceId);
    if (night) return StubView(store, show, night);
  }
  if (route.name === "person") {
    const person = store.person(route.personId);
    if (person) return PersonView(store, person);
  }
  return HomeView(store);
}

async function boot() {
  try {
    const store = createStore(await loadData());
    const problems = findProblems(store);
    if (problems.length) console.warn("Data problems:", problems);
    startRouter(route => { app.replaceChildren(pickView(store, route)); window.scrollTo(0, 0); });
  } catch (error) {
    app.replaceChildren(h("p", { class: "results__empty" },
      `Could not load the data. If you opened index.html straight from disk, start a local server instead (see README). ${error.message}`));
  }
}
boot();
