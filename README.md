# Credits (working name)

Prototype for the theatre-credits platform: a search home page, a press-and-hold ticket stub that reveals everyone who worked a night, a show page with every production and night logged, and a profile for every person. No build step, no dependencies. Plain HTML, CSS and ES modules.

## Run it

ES modules and `fetch` do not work from `file://`, so serve the folder:

- **VS Code:** install the recommended "Live Server" extension, right-click `index.html`, "Open with Live Server".
- **Terminal:** `npx serve .` (or `python3 -m http.server 8000`), then open the address it prints.
- **Tests:** `npm test` (Node 20+, uses the built-in test runner).

## Folder map

```
index.html              static shell: app bar + <main id="app">
data/                   the four JSON datasets (below)
css/
  tokens.css            every color, space, size, radius, weight and easing. Start here to change the look.
  base.css              reset, page frame, grain, the "misprint" (.w), reduced motion
  components/           one CSS file per component, named like its JS file
js/
  main.js               boots: load data, build store, start router
  router.js             hash routes (#/, #/show/<id>, #/show/<id>/<performance id>, #/person/<id>) and `links` to build hrefs
  config.js             hold duration, data folder
  data/store.js         loads the JSON and exposes lookups (the only door to the data)
  data/integrity.js     checks that every id points at something (warns in the console)
  domain/               pure logic, no DOM: company.js (roster + changes), credits.js (show history and overview, a person's credits), search-index.js
  lib/                  dom.js (element builder h()), utils.js, title.js (fits titles to the ticket)
  components/           one function per component: Entry, RowList, Ticket, HoldButton, ...
  views/                home.js, stub.js, show.js and person.js assemble components into pages
tests/                  unit tests for data, domain and routing
```

## Data model

Four files, linked only by ids. People appear only as ids. Credits are never stored on a person: they are derived, so each fact lives in one place.

| File | Holds | Points at |
|---|---|---|
| `shows.json` | the piece: title, language, premiere year, origin, jukebox, acts, dialogue, genre, style, synopsis, composers, default `characters` | none |
| `productions.json` | one run: number, run type, language, venue, city, dates, `roster` of `{ role, person, character? }` | `show` |
| `performances.json` | one night: number, date, time, preview, matinee, `changes` of `{ role, person, replaces, type }`. Optional `venue`/`city` override for touring nights | `production` |
| `people.json` | `id`, `name`, `aliases` (spelling variants, searchable), optional `bio` (plain text, blank line between paragraphs) and `link` (one full `https://` address, shown on the profile) | none |

A night's company = the production's roster with that night's changes applied (`domain/company.js`).

## Pages

| Route | Page | Notes |
|---|---|---|
| `#/` | Home | With no query, show cards open their latest night. In results, shows open the show page and people open their profile. |
| `#/show/<id>` | Show | An aggregate of the piece (`showOverview` in `domain/credits.js`): facts and totals, the latest night of each production as a stub card, then every production with its counts, its three most recent nights, older nights and the company behind toggles. Runs that share a run type get their number ("Broadway 2"). Each night links to its stub. |
| `#/show/<id>/<performance>` | Stub | Every name in the company links to that person's profile. |
| `#/person/<id>` | Profile | Every show the person is credited on, grouped by production, with each night they were on. A night they were replaced drops out and a night they covered is added, with its note (`domain/credits.js`). Labeled Actor, Crew, or both: a role is cast when it names one of the show's characters. |

## How to add things

- **A show, run or night:** add a record to the right JSON file. Use an existing person id, or add the person to `people.json` first. Open the console: `Data problems:` lists any id that points nowhere.
- **A component:** create `js/components/thing.js` exporting a function that returns an element built with `h()`, and `css/components/thing.css` with classes named `thing`, `thing__part`, `thing--variant`. Add the CSS to `css/main.css`. Components take plain data in and call callbacks out (see `HoldButton`, `Ticket`). Views are the only place that knows about the store.
- **A page:** add a route in `router.js` (and a builder in `links`), a view in `js/views/`, and a case in `pickView` in `main.js`. Build hrefs with `links`, never by hand.
- **Real search:** replace `searchIndex` in `domain/search-index.js`. Nothing else calls the raw index.
- **New colors, spacing or type:** add a token in `tokens.css` and use the variable. Spacing follows an 8pt grid, text uses three sizes, and display type is fluid on purpose.

## Design rules this code follows

- One family (Archivo) with four widths and four weights. Hierarchy comes from width and weight, never from size within a list: every name in a company is the same size.
- Two inks plus paper (dark navy). Ink carries all text. Pink is the accent and the misprint offset.
- Every control is at least 44px tall. The search input has a visible label. Focus rings are pink and always on.
- Animation uses transform and opacity, with one exception below. `prefers-reduced-motion` shortens every animation to nothing.

## Known exceptions and open items

- The ticket tab collapses by animating `max-height` once, after the tear. It is the only layout animation. `--tab-max` in `ticket.css` must stay taller than the two hold buttons.
- Pink on paper is used only for decoration (stamp, misprint, underlines, change marker). All reading text is ink. The stamp text is also announced to screen readers.
- Synopses and names in the sample data are placeholders.
- Ideas for next: a performance picker on the stub page, the logging "show report" flow, production-level `style`, opaque ids (like `p_0001`) instead of readable slugs.
