// Routes live in the URL hash, so there is no server setup:
//   #/                          home
//   #/show/<id>                 show page: every production and night logged for the show
//   #/show/<id>/<performance>   stub for one specific night
//   #/person/<id>               profile: every show, production and night a person is on
export function parseRoute(hash) {
  const show = hash.match(/^#\/show\/([^/]+)(?:\/(.+))?$/);
  if (show) return { name: "show", showId: show[1], performanceId: show[2] };
  const person = hash.match(/^#\/person\/([^/]+)$/);
  if (person) return { name: "person", personId: person[1] };
  return { name: "home" };
}

// The only place that knows how links are spelled. Build every href with these.
export const links = {
  show: showId => `#/show/${showId}`,
  night: (showId, performanceId) => `#/show/${showId}/${performanceId}`,
  person: personId => `#/person/${personId}`,
};

export function startRouter(onRoute) {
  const go = () => onRoute(parseRoute(location.hash));
  window.addEventListener("hashchange", go);
  go();
}
