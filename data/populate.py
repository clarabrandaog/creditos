#!/usr/bin/env python3
"""
populate.py: add entries to the four theatre datasets from your terminal.

Usage:
    python3 populate.py                 # uses the current folder
    python3 populate.py path/to/data    # folder that holds the four JSON files

    # fetch real data from IBDB, one or many shows in one go:
    python3 populate.py path/to/data --ibdb URL1 URL2 URL3
    python3 populate.py path/to/data --ibdb URL --yes --perfs 4
    (a URL looks like https://www.ibdb.com/broadway-production/hadestown-520711;
     a saved .html page of it also works. --yes skips the questions,
     --debug writes ibdb_debug.txt with what the parser read.)

Menu:
    1 person       2 show        3 production       4 performance
    5 paste JSON   6 list ids    7 import from IBDB  q quit

Every write first saves a one-time backup (people.json.bak, etc.) per session,
checks that ids are unique, and checks that every reference (composers, show,
production, people in rosters and changes) points to something that exists.
Press Enter to accept the [default] shown in brackets. Press Ctrl+C to cancel
the entry you are on without saving it.
"""
import json
import re
import shutil
import sys
import unicodedata
from datetime import date
from pathlib import Path

FILES = {
    "people": "people.json",
    "shows": "shows.json",
    "productions": "productions.json",
    "performances": "performances.json",
}
ORIGINS = ["original", "adaptation"]
CHANGE_TYPES = ["replacement", "understudy", "standby", "swing", "alternate"]

# ---------------------------------------------------------------- helpers


def fold(s):
    """Lowercase and strip accents so 'Théo' matches 'theo'."""
    s = unicodedata.normalize("NFKD", str(s))
    return "".join(c for c in s if not unicodedata.combining(c)).lower().strip()


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", fold(s)).strip("-")


class Store:
    def __init__(self, folder):
        self.folder = Path(folder)
        self.data = {}
        self.backed_up = set()
        for key, name in FILES.items():
            path = self.folder / name
            if path.exists():
                self.data[key] = json.loads(path.read_text(encoding="utf-8"))
            else:
                self.data[key] = []
                print(f"  (no {name} found, starting an empty one)")

    def ids(self, key):
        return {item["id"] for item in self.data[key]}

    def get(self, key, item_id):
        return next((i for i in self.data[key] if i["id"] == item_id), None)

    def add(self, key, item):
        if item["id"] in self.ids(key):
            print(f"  ! id '{item['id']}' already exists in {FILES[key]}. Not saved.")
            return False
        problems = self.check(key, item)
        if problems:
            print("  ! Not saved, fix these first:")
            for p in problems:
                print("    -", p)
            return False
        self.data[key].append(item)
        self.save(key)
        print(f"  + saved '{item['id']}' to {FILES[key]}")
        return True

    def save(self, key):
        path = self.folder / FILES[key]
        if key not in self.backed_up and path.exists():
            shutil.copy(path, str(path) + ".bak")
            self.backed_up.add(key)
        path.write_text(
            json.dumps(self.data[key], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    def check(self, key, item):
        out = []
        people = self.ids("people")
        if key == "shows":
            out += [f"composer {c} is not in people.json" for c in item.get("composers", []) if c not in people]
        elif key == "productions":
            if item.get("show") not in self.ids("shows"):
                out.append(f"show {item.get('show')} is not in shows.json")
            out += [f"roster person {r['person']} is not in people.json" for r in item.get("roster", []) if r["person"] not in people]
        elif key == "performances":
            if item.get("production") not in self.ids("productions"):
                out.append(f"production {item.get('production')} is not in productions.json")
            for c in item.get("changes", []):
                for field in ("person", "replaces"):
                    if c.get(field) and c[field] not in people:
                        out.append(f"change {field} {c[field]} is not in people.json")
        return out


# ---------------------------------------------------------------- prompts


def ask(label, default=None, required=True, choices=None):
    while True:
        suffix = f" [{default}]" if default not in (None, "") else ""
        if choices:
            suffix += f" ({'/'.join(choices)})"
        raw = input(f"  {label}{suffix}: ").strip()
        if not raw and default is not None:
            raw = str(default)
        if not raw and not required:
            return None
        if not raw:
            print("    required")
            continue
        if choices and raw not in choices:
            print(f"    pick one of: {', '.join(choices)}")
            continue
        return raw


def ask_int(label, default=None, required=True):
    while True:
        raw = ask(label, default, required)
        if raw is None:
            return None
        try:
            return int(raw)
        except ValueError:
            print("    enter a whole number")


def ask_bool(label, default=False):
    d = "y" if default else "n"
    while True:
        raw = ask(label, d).lower()
        if raw in ("y", "yes", "true", "1"):
            return True
        if raw in ("n", "no", "false", "0"):
            return False
        print("    y or n")


def ask_date(label, default=None, required=True):
    while True:
        raw = ask(label + " YYYY-MM-DD", default, required)
        if raw is None:
            return None
        try:
            date.fromisoformat(raw)
            return raw
        except ValueError:
            print("    use the format 2026-03-12")


def ask_time(label, default=None):
    while True:
        raw = ask(label + " HH:MM (blank = unknown)", default, required=False)
        if raw is None:
            return None
        if re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", raw):
            return raw
        print("    use 24h format like 19:00")


def more(label):
    return ask_bool(label, False)


# ---------------------------------------------------------------- people


def find_people(store, term):
    t = fold(term)
    hits = []
    for p in store.data["people"]:
        names = [p["name"]] + p.get("aliases", [])
        if t == fold(p["id"]) or t == "p-" + slugify(term) or any(t in fold(n) for n in names):
            hits.append(p)
    return hits


def create_person(store, name=None):
    name = name or ask("Full name")
    aliases = ask("Aliases, comma separated (e.g. spelling without accents)", required=False)
    person = {
        "id": "p-" + slugify(name),
        "name": name,
        "aliases": [a.strip() for a in aliases.split(",") if a.strip()] if aliases else [],
    }
    if store.get("people", person["id"]):
        print(f"  person {person['id']} already exists, using it")
        return person["id"]
    store.add("people", person)
    return person["id"]


def pick_person(store, label):
    """Type a name or id. Creates the person if nobody matches."""
    while True:
        term = ask(f"{label} (name or id)")
        hits = find_people(store, term)
        exact = [p for p in hits if fold(p["name"]) == fold(term) or p["id"] == term]
        if len(exact) == 1:
            return exact[0]["id"]
        if len(hits) == 1:
            if ask_bool(f"Use {hits[0]['name']} ({hits[0]['id']})?", True):
                return hits[0]["id"]
        elif len(hits) > 1:
            print("    matches:")
            for i, p in enumerate(hits, 1):
                print(f"      {i}. {p['name']} ({p['id']})")
            n = ask_int("Number to use, 0 to create a new person", 1)
            if 1 <= n <= len(hits):
                return hits[n - 1]["id"]
        else:
            print("    no match")
        if ask_bool(f"Create '{term}' as a new person?", True):
            return create_person(store, term)


def cmd_person(store):
    create_person(store)


# ---------------------------------------------------------------- shows


def cmd_show(store):
    title = ask("Title")
    show_id = ask("Show id", slugify(title))
    show = {
        "id": show_id,
        "title": title,
        "originalLanguage": ask("Original language code", "en"),
        "premiereYear": ask_int("Premiere year"),
        "origin": ask("Origin", "original", choices=ORIGINS),
        "jukebox": ask_bool("Jukebox musical?", False),
        "acts": ask_int("Number of acts", 2),
        "dialogue": ask_bool("Spoken dialogue (not sung-through)?", True),
        "genre": ask("Genre", "Musical"),
        "style": ask("Musical style", "Contemporary"),
        "characters": [],
        "synopsis": ask("Synopsis (one or two sentences)", required=False) or "",
        "composers": [],
    }
    print("  Characters (blank name to finish)")
    while True:
        name = ask("Character name", required=False)
        if not name:
            break
        cid = ask("Character id", slugify(name))
        show["characters"].append({"id": cid, "name": name})
    print("  Composers (blank to finish)")
    while True:
        term = ask("Composer name or id", required=False)
        if not term:
            break
        hits = find_people(store, term)
        if len(hits) == 1 and ask_bool(f"Use {hits[0]['name']} ({hits[0]['id']})?", True):
            show["composers"].append(hits[0]["id"])
        else:
            if ask_bool(f"Create '{term}' as a new person?", True):
                show["composers"].append(create_person(store, term))
    store.add("shows", show)


# ---------------------------------------------------------------- productions


def pick_from(store, key, label, show_field="title"):
    items = store.data[key]
    if not items:
        print(f"  no {key} yet, add one first")
        return None
    while True:
        term = ask(f"{label} (id, or part of its name; ? to list)")
        if term == "?":
            list_ids(store, key)
            continue
        exact = store.get(key, term)
        if exact:
            return exact
        hits = [i for i in items if fold(term) in fold(i["id"] + " " + str(i.get(show_field, "")))]
        if len(hits) == 1:
            return hits[0]
        if hits:
            for h in hits[:15]:
                print(f"      {h['id']}")
        else:
            print("    no match")


def cmd_production(store):
    show = pick_from(store, "shows", "Show")
    if not show:
        return
    existing = [p for p in store.data["productions"] if p["show"] == show["id"]]
    number = ask_int("Production number for this show", len(existing) + 1)
    prod = {
        "id": f"{show['id']}-p{number}",
        "show": show["id"],
        "number": number,
        "runType": ask("Run type", "resident"),
        "language": ask("Language code", show.get("originalLanguage", "en")),
        "venue": ask("Venue"),
        "city": ask("City"),
        "country": ask("Country code", "US"),
        "opening": ask_date("Opening date"),
        "closing": ask_date("Closing date, blank if still running", required=False),
        "roster": [],
    }
    chars = {c["id"]: c["name"] for c in show.get("characters", [])}
    if chars:
        print("  Characters in this show: " + ", ".join(f"{i} ({n})" for i, n in chars.items()))
    print("  Roster (blank role to finish). Cast roles and crew roles both go here.")
    while True:
        role = ask("Role (e.g. Elphaba, Director, Stage manager)", required=False)
        if not role:
            break
        entry = {"role": role, "person": pick_person(store, "Person")}
        char = ask("Character id, blank for crew roles", slugify(role) if slugify(role) in chars else None, required=False)
        if char:
            entry["character"] = char
        prod["roster"].append(entry)
    store.add("productions", prod)


# ---------------------------------------------------------------- performances


def cmd_performance(store):
    prod = pick_from(store, "productions", "Production", "show")
    if not prod:
        return
    number = ask_int("Performance number, blank if unknown", required=False)
    day = ask_date("Date")
    perf_id = f"{prod['id']}-{number}" if number else f"{prod['id']}-{day}"
    perf = {
        "id": ask("Performance id", perf_id),
        "production": prod["id"],
        "number": number,
        "date": day,
        "time": ask_time("Time"),
        "preview": ask_bool("Preview?", False),
        "matinee": ask_bool("Matinee?", False),
        "changes": [],
    }
    roster = prod.get("roster", [])
    if roster:
        print("  Roster for this production:")
        for r in roster:
            print(f"      {r['role']}: {r['person']}")
    print("  Changes from the default roster (blank role to finish)")
    while True:
        role = ask("Role that changes", required=False)
        if not role:
            break
        default_replaced = next((r["person"] for r in roster if fold(r["role"]) == fold(role)), None)
        person = pick_person(store, "Person on stage")
        replaces = ask("Replaces (person id)", default_replaced, required=False)
        if replaces and not store.get("people", replaces):
            replaces = pick_person(store, "Replaces")
        kind = ask("Type", "replacement", choices=CHANGE_TYPES)
        perf["changes"].append({"role": role, "person": person, "replaces": replaces, "type": kind})
    store.add("performances", perf)


# ---------------------------------------------------------------- paste


def cmd_paste(store):
    key = ask("Dataset", choices=list(FILES))
    print("  Paste one object or a list of objects. Finish with a line containing only END.")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line.strip() == "END":
            break
        lines.append(line)
    try:
        parsed = json.loads("\n".join(lines))
    except json.JSONDecodeError as e:
        print(f"  ! could not read that JSON: {e}")
        return
    items = parsed if isinstance(parsed, list) else [parsed]
    # accept the trailing-comma style the pasted samples use: handled by json above only if valid
    ok = sum(1 for item in items if store.add(key, item))
    print(f"  {ok} of {len(items)} added")


# ---------------------------------------------------------------- list


def list_ids(store, key=None):
    keys = [key] if key else list(FILES)
    for k in keys:
        items = store.data[k]
        print(f"  {k} ({len(items)})")
        for i in items[-40:]:
            label = i.get("name") or i.get("title") or ""
            print(f"      {i['id']}  {label}")
        if len(items) > 40:
            print(f"      ... {len(items) - 40} earlier entries not shown")


# ---------------------------------------------------------------- IBDB import

import ssl
import urllib.error
import urllib.request
from html.parser import HTMLParser

MONTHS = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
_D = r"(?:[A-Z][a-z]{2} \d{1,2}, \d{4}|\?)"
RANGE_RE = re.compile(rf"({_D})\s*[-–]\s*({_D}|Present)")
ONE_DATE = re.compile(r"([A-Z][a-z]{2}) (\d{1,2}), (\d{4})")
PERSON_HREF = re.compile(r"/broadway-cast-staff/(?:[^/?#]*-)?(\d+)")
THEATRE_HREF = re.compile(r"/theatre/(?:[^/?#]*-)?(\d+)")
BLOCK_TAGS = {"p", "div", "li", "tr", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "table", "tbody",
              "thead", "section", "article", "header", "footer", "ul", "ol", "br", "dd", "dt", "dl", "span", "label",
              "strong", "b"}
NOT_CHARACTERS = {"ensemble", "swing", "swings", "understudy", "standby", "dance captain", "onstage swing"}
CROSS_ROLE_NOTES = [("alternate", "alternate"), ("standby", "standby"), ("swing", "swing"), ("understudy", "understudy")]

# (regex on the folded label, role name written to the roster). First match wins.
STAFF_MAP = [
    (r"production stage manager", "Production stage manager"),
    (r"stage manager", "Stage manager"),
    (r"^direct(ed by|or)\b|^directed", "Director"),
    (r"aerial choreograph", "Aerial choreographer"),
    (r"choreograph", "Choreographer"),
    (r"hair and wig|wig design", "Hair and wig designer"),
    (r"make-?up design", "Make-up designer"),
    (r"fight direct", "Fight director"),
    (r"^dance captain", "Dance captain"),
    (r"^fight captain", "Fight captain"),
    (r"music(al)? direct|conducted|conductor", "Music director"),
    (r"scenic|set design", "Scenic designer"),
    (r"costume design", "Costume designer"),
    (r"lighting design", "Lighting designer"),
    (r"sound design", "Sound designer"),
    (r"projection design|video design", "Projection designer"),
    (r"orchestrat", "Orchestrator"),
]
COMPOSER_LABEL = re.compile(r"(music|lyrics|music (and|&) lyrics)( by)?")


class _Tokens(HTMLParser):
    """Turns a page into a flat list: ('t', text), ('p', name, ibdb_id), ('th', name, ibdb_id)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tokens, self.buf, self.skip = [], [], 0
        self.link, self.linkbuf = None, []
        self.in_h1 = self.in_title = False
        self.h1, self.title = None, ""

    def flush(self):
        t = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        self.buf = []
        if t:
            self.tokens.append(("t", t))

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip += 1
            return
        if tag in BLOCK_TAGS:
            self.flush()
        if tag == "h1":
            self.in_h1 = True
        if tag == "title":
            self.in_title = True
        if tag == "a":
            href = dict(attrs).get("href") or ""
            m = PERSON_HREF.search(href)
            kind = "p" if m else None
            if not m:
                m = THEATRE_HREF.search(href)
                kind = "th" if m else None
            if m:
                self.flush()
                self.link, self.linkbuf = (kind, m.group(1)), []

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.skip = max(0, self.skip - 1)
            return
        if tag == "a" and self.link:
            name = re.sub(r"\s+", " ", "".join(self.linkbuf)).strip()
            if name:
                self.tokens.append((self.link[0], name, self.link[1]))
            self.link = None
        if tag == "title":
            self.in_title = False
        if tag == "h1":
            self.in_h1 = False
            self.flush()
            if self.h1 is None and self.tokens and self.tokens[-1][0] == "t":
                self.h1 = self.tokens[-1][1]
        if tag in BLOCK_TAGS:
            self.flush()

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_title:
            self.title += data
            return
        if self.link:
            self.linkbuf.append(data)
        else:
            self.buf.append(data)


def d_iso(s):
    m = ONE_DATE.search(s or "")
    if not m or m.group(1) not in MONTHS:
        return None
    return date(int(m.group(3)), MONTHS[m.group(1)], int(m.group(2))).isoformat()


def _field(tokens, label):
    """Value that follows a label like 'Opening Date', on the same line or the next one."""
    rx = re.compile(rf"^{label}\b\s*:?\s*(.*)$", re.I)
    for i, t in enumerate(tokens):
        if t[0] != "t":
            continue
        m = rx.match(t[1])
        if m:
            if m.group(1):
                return m.group(1)
            if i + 1 < len(tokens) and tokens[i + 1][0] == "t":
                return tokens[i + 1][1]
    return None


def _staff_label(tokens, i):
    for j in range(i - 1, max(-1, i - 16), -1):
        t = tokens[j]
        if t[0] != "t":
            continue
        txt = t[1]
        if re.fullmatch(r"[,&/;\s]*|and", txt) or len(txt.strip(" :")) < 2:
            continue
        f = fold(txt.strip(" :;,"))
        if txt.endswith(":") or f.endswith(" by") or any(re.search(rx, f) for rx, _ in STAFF_MAP) \
                or COMPOSER_LABEL.fullmatch(f):
            return txt.strip(" :;,")
        if txt.startswith("("):
            continue
        return None
    return None


NOTE_CELL = re.compile(r"^(broadway debut|recorded voice only|understudy|alternate|standby|swing)$", re.I)
CUT_CELL = re.compile(r"cut during previews", re.I)
END_MARKERS = ("Songs", "Awards", "Statistics")
HEADINGS = {"opening night cast", "current cast", "replacements", "production staff", "swings and understudies",
            "understudies", "swings", "people", "cast", "staff"}


def _staff_role(label):
    """Map an IBDB credit label ('Associate Scenic Design by') to a roster role."""
    f = fold(label)
    pre = re.match(r"^(associate|assistant)\s+(.*)$", f)
    prefix, f = (pre.group(1).capitalize() + " ", pre.group(2)) if pre else ("", f)
    for rx, role in STAFF_MAP:
        if re.search(rx, f):
            return prefix + (role[0].lower() + role[1:] if prefix else role)
    return None


def _cast_rows(t, cells):
    """Cast rows for one person. 'cells' are the text cells that follow the name."""
    cut = []
    for c in cells:
        if c.endswith(":") or c.startswith(";"):
            break
        cut.append(c)
    joined = " | ".join(cut)
    m = RANGE_RE.search(joined)
    rows = []
    if m:  # layout with a date range: Name / Role / Mar 22, 2019 - Jan 12, 2022 / note
        segs = [x.strip() for x in re.split(r"[|/]", joined[:m.start()]) if x.strip()]
        segs = [x for x in segs if not re.search(r"debut", x, re.I)]
        if not segs or segs[-1].endswith("(") or segs[-1] == ")":
            return rows  # the "Theatre (Apr 17, 2019 - Present)" line is not a cast row
        note = joined[m.end():].strip(" |/")
        note = re.split(r"\s\|\s", note)[0] if note else ""
        start = None if m.group(1) == "?" else d_iso(m.group(1))
        end = None if m.group(2) in ("?", "Present") else d_iso(m.group(2))
        rows.append({"name": t[1], "ibdb": t[2], "role": segs[-1], "start": start, "end": end, "note": note})
        return rows
    # layout without dates (cast that has not changed): Name / Role / Role / ...
    roles = []
    for c in cut:
        if CUT_CELL.search(c):
            if roles:
                roles.pop()  # the role just before this note was cut
            continue
        if NOTE_CELL.match(c) or c.startswith("("):
            continue
        roles.append(c)
    for r in roles:
        rows.append({"name": t[1], "ibdb": t[2], "role": r, "start": None, "end": None, "note": ""})
    return rows


def parse_ibdb(html):
    tk = _Tokens()
    tk.feed(html)
    tk.flush()
    page_title = re.split(r"\s[\u2013\u2014\-]\s|\s\|\s", tk.title.strip())[0].strip()
    return parse_tokens(tk.tokens, page_title or tk.h1 or None)


def parse_tokens(tokens, title):
    out = {
        "title": title,
        "opening": d_iso(_field(tokens, "Opening Date")),
        "closing": d_iso(_field(tokens, "Closing Date")),
        "first_preview": d_iso(_field(tokens, r"1st Preview")),
        "previews": None,
        "venue": next((t[1] for t in tokens if t[0] == "th"), None),
        "category": next((t[1] for t in tokens[:60] if t[0] == "t" and re.search(r"(Original|Revival)", t[1])
                          and len(t[1]) < 60), None),
        "cast": [], "staff": [], "composers": [],
    }
    pv = _field(tokens, "Previews")
    if pv and re.match(r"\d+", pv.replace(",", "")):
        out["previews"] = int(re.match(r"\d+", pv.replace(",", "")).group(0))

    first_p = next((i for i, t in enumerate(tokens) if t[0] == "p"), None)
    if first_p is None:
        return out, tokens
    end = next((j for j in range(first_p, len(tokens))
                if tokens[j][0] == "t" and tokens[j][1] in END_MARKERS), len(tokens))

    seen_cast, seen_staff = set(), set()
    for i in range(first_p, end):
        t = tokens[i]
        if t[0] != "p":
            continue
        cells = []
        for u in tokens[i + 1:end]:
            if u[0] != "t":
                break
            cells.append(u[1])
            if len(cells) >= 8:
                break
        first = cells[0] if cells else ""
        credit_like = (not first or fold(first) in HEADINGS or re.match(r"^[,;()&]", first) or fold(first) == "and" or fold(first).startswith("and ")
                       or first.endswith(":") or re.search(r"\bby$", first, re.I))
        if not credit_like:
            for row in _cast_rows(t, cells):
                key = (row["ibdb"], fold(row["role"]), row["start"], row["end"])
                if key not in seen_cast:
                    seen_cast.add(key)
                    out["cast"].append(row)
            continue
        label = _staff_label(tokens, i)
        if not label:
            continue
        f = fold(label)
        if COMPOSER_LABEL.fullmatch(f):
            if (t[1], t[2]) not in out["composers"]:
                out["composers"].append((t[1], t[2]))
            continue
        role = _staff_role(label)
        if role and (t[2], role) not in seen_staff:
            seen_staff.add((t[2], role))
            out["staff"].append({"name": t[1], "ibdb": t[2], "role": role})
    return out, tokens


def _curl(src, headers):
    """Fallback that uses the system curl (macOS ships with the right certificates)."""
    import subprocess
    cmd = ["curl", "-sSL", "--max-time", "40", "-w", "\n%{http_code}"]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    try:
        r = subprocess.run(cmd + [src], capture_output=True, text=True, encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return None
    body, _, code = r.stdout.rpartition("\n")
    if r.returncode != 0 or not code.strip().startswith("2"):
        print(f"  ! curl got HTTP {code.strip() or '?'} {r.stderr.strip()[:120]}")
        return None
    return body


def fetch_source(src):
    if re.match(r"https?://", src):
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9"}
        req = urllib.request.Request(src, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            print(f"  ! IBDB answered HTTP {e.code}.")
        except (urllib.error.URLError, ssl.SSLError) as e:
            print(f"  (python could not connect securely: {getattr(e, 'reason', e)})")
            print("  trying again with curl...")
            body = _curl(src, headers)
            if body:
                return body
        print("    Save the page from your browser (File > Save Page As > Web Page, HTML Only)")
        print("    and use the saved .html file as the source instead of the URL.")
        return None
    path = Path(src.strip().strip("'\"")).expanduser()
    if not path.exists():
        print(f"  ! no such file: {path}")
        return None
    return path.read_text(encoding="utf-8", errors="replace")


def resolve_person(store, pending, name, ibdb_id):
    """Existing person by name or alias, else a new p-slug id (disambiguated with the IBDB id if taken)."""
    key = fold(name)
    for p in store.data["people"] + list(pending.values()):
        if key in [fold(n) for n in [p["name"]] + p.get("aliases", [])]:
            return p["id"]
    pid = "p-" + slugify(name)
    taken = store.ids("people") | {p["id"] for p in pending.values()}
    if pid in taken:
        pid = f"{pid}-{ibdb_id}"
    pending[pid] = {"id": pid, "name": name, "aliases": []}
    aliased = fold(name)
    plain = unicodedata.normalize("NFKD", name)
    plain = "".join(c for c in plain if not unicodedata.combining(c))
    if plain != name:
        pending[pid]["aliases"].append(plain)
    return pid


def pick_dates(dates, k):
    if k <= 0 or not dates:
        return []
    if len(dates) <= k:
        return list(dates)
    if k == 1:
        return [dates[0]]
    return [dates[round(i * (len(dates) - 1) / (k - 1))] for i in range(k)]


def import_ibdb(store, src, auto=False, n_perfs=4, debug=False):
    html = fetch_source(src)
    if html is None:
        return False
    parsed, tokens = parse_ibdb(html)
    if debug or not parsed["cast"]:
        dump = store.folder / "ibdb_debug.txt"
        dump.write_text("\n".join(" | ".join(map(str, t)) for t in tokens), encoding="utf-8")
        if not parsed["cast"]:
            print(f"  ! found no cast rows. I wrote what I read to {dump}.")
            print("    Send me that file and I will adjust the parser to IBDB's layout.")
            return False
    if not parsed["title"] or not parsed["opening"]:
        print(f"  ! missing title or opening date (title={parsed['title']}, opening={parsed['opening']}).")
        print("    Make sure the URL is a production page like https://www.ibdb.com/broadway-production/hadestown-520711")
        return False

    title = parsed["title"]
    if not auto:
        title = ask("Title", title)
    opening = parsed["opening"]
    first_prev = parsed["first_preview"] or opening
    today = date.today().isoformat()

    opening_rows = [r for r in parsed["cast"] if r["start"] is None or r["start"] <= opening]
    changes_rows = [r for r in parsed["cast"] if r["start"] and r["start"] > opening and r["start"] <= today]

    print(f"\n  {title}: opened {opening}, closing {parsed['closing'] or 'still running'}, "
          f"first preview {parsed['first_preview']}, {parsed['previews']} previews, at {parsed['venue']}")
    print(f"  {len(opening_rows)} opening-night cast rows, {len(changes_rows)} later replacements, "
          f"{len(parsed['staff'])} crew rows, composers: {', '.join(c[0] for c in parsed['composers']) or 'none found'}")
    if parsed["category"]:
        print(f"  IBDB category line: {parsed['category']}")

    show_id = slugify(title)
    existing_show = store.get("shows", show_id)
    if not auto:
        show_id = ask("Show id", show_id)
        existing_show = store.get("shows", show_id)
    show = None
    if existing_show:
        print(f"  show '{show_id}' already exists, only a new production will be added")
    else:
        if auto:
            origin, jukebox, genre, style, syn = "original", False, "Musical", "Contemporary", ""
        else:
            origin = ask("Origin", "original", choices=ORIGINS)
            jukebox = ask_bool("Jukebox musical?", False)
            genre = ask("Genre", "Musical")
            style = ask("Musical style", "Contemporary")
            syn = ask("Synopsis (one or two sentences)", required=False) or ""
        show = {"id": show_id, "title": title, "originalLanguage": "en", "premiereYear": int(opening[:4]),
                "origin": origin, "jukebox": jukebox, "acts": 2, "dialogue": True, "genre": genre,
                "style": style, "characters": [], "synopsis": syn, "composers": []}

    pending = {}
    for name, ibdb_id in parsed["composers"]:
        pid = resolve_person(store, pending, name, ibdb_id)
        if show is not None and pid not in show["composers"]:
            show["composers"].append(pid)

    n_existing = len([p for p in store.data["productions"] if p["show"] == show_id])
    prod_id = f"{show_id}-p{n_existing + 1}"
    roster, chars = [], []
    for r in opening_rows:
        pid = resolve_person(store, pending, r["name"], r["ibdb"])
        entry = {"role": r["role"], "person": pid}
        if fold(r["role"]) not in NOT_CHARACTERS:
            cid = slugify(r["role"])
            entry["character"] = cid
            if cid and cid not in [c["id"] for c in chars]:
                chars.append({"id": cid, "name": r["role"]})
        if entry not in roster:
            roster.append(entry)
    for s in parsed["staff"]:
        entry = {"role": s["role"], "person": resolve_person(store, pending, s["name"], s["ibdb"])}
        if entry not in roster:
            roster.append(entry)
    if show is not None:
        show["characters"] = chars

    production = {"id": prod_id, "show": show_id, "number": n_existing + 1, "runType": "resident",
                  "language": "en", "venue": parsed["venue"] or "", "city": "New York", "country": "US",
                  "opening": opening, "closing": parsed["closing"], "roster": roster}

    # Performances: first preview, opening night, then replacement dates spread across the run.
    perfs = []
    if n_perfs >= 1:
        perfs.append({"id": f"{prod_id}-1", "production": prod_id, "number": 1, "date": first_prev,
                      "time": None, "preview": True, "matinee": None, "changes": []})
    if n_perfs >= 2:
        n_open = (parsed["previews"] or 0) + 1
        perfs.append({"id": f"{prod_id}-{n_open}", "production": prod_id, "number": n_open, "date": opening,
                      "time": None, "preview": False, "matinee": None, "changes": []})
    by_date = {}
    for r in changes_rows:
        by_date.setdefault(r["start"], []).append(r)
    for d in pick_dates(sorted(by_date), n_perfs - 2):
        changes = []
        for r in by_date[d]:
            same_role = [x for x in parsed["cast"] if fold(x["role"]) == fold(r["role"]) and x["ibdb"] != r["ibdb"]
                         and x["end"] and x["end"] <= d]
            prev = max(same_role, key=lambda x: x["end"], default=None)
            kind = next((v for k, v in CROSS_ROLE_NOTES if k in fold(r["note"])), "replacement")
            changes.append({"role": r["role"], "person": resolve_person(store, pending, r["name"], r["ibdb"]),
                            "replaces": resolve_person(store, pending, prev["name"], prev["ibdb"]) if prev else None,
                            "type": kind})
        perfs.append({"id": f"{prod_id}-{d}", "production": prod_id, "number": None, "date": d,
                      "time": None, "preview": False, "matinee": None, "changes": changes})

    new_people = [p for pid, p in pending.items() if not store.get("people", pid)]
    print(f"  Will add: {len(new_people)} new people, {'1 show, ' if show else ''}production {prod_id} "
          f"({len(roster)} roster rows), {len(perfs)} performances")
    for p in perfs:
        print(f"      {p['id']}  {p['date']}  {len(p['changes'])} changes")
    if not auto and not ask_bool("Save these?", True):
        print("  skipped")
        return False
    for p in new_people:
        store.add("people", p)
    if show is not None:
        store.add("shows", show)
    store.add("productions", production)
    for p in perfs:
        store.add("performances", p)
    return True


def cmd_ibdb(store):
    print("  Paste an IBDB production URL (https://www.ibdb.com/broadway-production/...)")
    print("  or the path of a saved .html page. Blank line finishes.")
    while True:
        src = ask("Source", required=False)
        if not src:
            break
        try:
            import_ibdb(store, src)
        except KeyboardInterrupt:
            print("\n  cancelled")


# ---------------------------------------------------------------- main

MENU = {
    "1": ("person", cmd_person),
    "2": ("show", cmd_show),
    "3": ("production", cmd_production),
    "4": ("performance", cmd_performance),
    "5": ("paste JSON", cmd_paste),
    "6": ("list ids", lambda s: list_ids(s)),
    "7": ("import from IBDB", cmd_ibdb),
}


def main():
    args = sys.argv[1:]
    auto = "--yes" in args
    debug = "--debug" in args
    n_perfs = 4
    if "--perfs" in args:
        n_perfs = int(args[args.index("--perfs") + 1])
    sources, folder, i = [], ".", 0
    while i < len(args):
        a = args[i]
        if a == "--ibdb":
            i += 1
            while i < len(args) and not args[i].startswith("--"):
                sources.append(args[i])
                i += 1
            continue
        if a == "--perfs":
            i += 2
            continue
        if not a.startswith("--"):
            folder = a
        i += 1
    store = Store(folder)
    print(f"Working in {Path(folder).resolve()}")
    if sources:
        for src in sources:
            print(f"\n== {src}")
            try:
                import_ibdb(store, src, auto=auto, n_perfs=n_perfs, debug=debug)
            except KeyboardInterrupt:
                print("\n  cancelled")
        print("Done.")
        return
    while True:
        print("\n  " + "   ".join(f"{k} {v[0]}" for k, v in MENU.items()) + "   q quit")
        try:
            choice = input("> ").strip().lower()
        except EOFError:
            break
        if choice in ("q", "quit", "exit"):
            break
        if choice not in MENU:
            continue
        try:
            MENU[choice][1](store)
        except KeyboardInterrupt:
            print("\n  cancelled, nothing saved for that entry")
        except EOFError:
            print("\n  input closed")
            break
    print("Done.")


if __name__ == "__main__":
    main()
