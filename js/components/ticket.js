import { h } from "../lib/dom.js";
import { fitLines, shrinkToFit } from "../lib/title.js";
import { formatDate } from "../lib/utils.js";
import { HoldButton } from "./hold-button.js";

const STAMP_TEXT = { was: "I was there", want: "I wanted to be here" };

// The stub for one performance. onTear(kind) runs once, when a hold completes ("was" or "want").
// A touring night may carry its own venue and city. Otherwise the production's are used.
// showHref, when given, turns the title into a link to the show page.
export function Ticket({ show, production, performance, showHref, onTear }) {
  const venue = performance.venue ?? production.venue;
  const city = performance.city ?? production.city;
  const stamp = h("div", { class: "ticket__stamp", "aria-live": "polite" });

  const tear = kind => {
    if (ticket.classList.contains("ticket--torn")) return;
    stamp.textContent = STAMP_TEXT[kind];
    ticket.classList.add("ticket--torn");
    onTear(kind);
  };
  const holdButton = kind => HoldButton({
    label: STAMP_TEXT[kind],
    ariaLabel: `Press and hold to mark: ${STAMP_TEXT[kind]}`,
    onComplete: () => tear(kind),
  });

  // imported nights can lack a number or a curtain time, so anything not logged is left out
  const meta = [["Production", production.number], ["Performance", performance.number != null && `No. ${performance.number}`], ["Date", formatDate(performance.date)], ["Curtain", performance.time]]
    .filter(([, value]) => value != null && value !== false);
  const fitted = fitLines(show.title);
  const titleLines = fitted.map(line =>
    h("span", { class: `w ticket__title-line ticket__title-line--${line.wide ? "wide" : "narrow"}`, dataset: { t: line.text }, style: { fontSize: line.size } }, line.text));

  const title = showHref
    ? h("h1", { class: "ticket__title" }, h("a", { class: "ticket__title-link", href: showHref, "aria-label": show.title }, titleLines))
    : h("h1", { class: "ticket__title", "aria-label": show.title }, titleLines);
  shrinkToFit(title, titleLines, fitted);

  const ticket = h("section", { class: "ticket", "aria-label": "Ticket stub" },
    h("div", { class: "ticket__top" },
      h("div", { class: "ticket__venue" }, `${venue}, ${city}`),
      title,
      h("dl", { class: "ticket__meta" }, meta.map(([term, value]) => h("div", {}, h("dt", {}, term), h("dd", {}, String(value))))),
      stamp),
    h("div", { class: "ticket__perf" }),
    h("div", { class: "ticket__tab" }, holdButton("was"), holdButton("want")));
  return ticket;
}
