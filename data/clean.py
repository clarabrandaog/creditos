#!/usr/bin/env python3
"""
clean.py: remove the junk rows that early IBDB imports left in the datasets.

Usage:
    python3 clean.py path/to/data            # dry run, only reports what it would remove
    python3 clean.py path/to/data --apply    # writes the changes (keeps .bak copies)

What it removes:
  - roster rows whose role is "(" or ends with "(" (a theatre line read as a cast row),
    for example "Walter Kerr Theatre (", or is a section heading such as "Opening Night Cast"
  - show characters made from those same theatre lines (ids like "new-amsterdam-theatre")
  - performance changes with such a role, and date-only performances left with no changes
    because of it

It does NOT touch anything else, and it never deletes people. At the end it lists the
people who are no longer used anywhere, so you can decide about them yourself.
Roles flattened by the old importer (for example an "Associate Scenic Design" credit stored as
"Scenic designer") cannot be repaired here. Delete that show's entries and import it again.
"""
import json
import re
import shutil
import sys
from pathlib import Path

FILES = ["people", "shows", "productions", "performances"]
HEADINGS = {"opening night cast", "current cast", "replacements", "production staff",
            "swings and understudies", "understudies", "swings", "people", "cast", "staff"}


def junk(text):
    t = (text or "").strip()
    return t == "(" or t == ")" or t.endswith("(") or t.lower() in HEADINGS


def load(folder, name):
    path = folder / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply = "--apply" in sys.argv
    folder = Path(args[0] if args else ".")
    data = {n: load(folder, n) for n in FILES}
    for n in FILES:
        if not (folder / f"{n}.json").exists():
            print(f"  (no {n}.json in {folder.resolve()})")
    print(f"Working in {folder.resolve()}  ({'APPLY' if apply else 'dry run'})\n")

    report = []
    # shows: junk characters
    for show in data["shows"]:
        keep, drop = [], []
        for c in show.get("characters", []):
            (drop if junk(c.get("name")) or not c.get("id") else keep).append(c)
        if drop:
            report.append(f"show {show['id']}: {len(drop)} junk characters ({', '.join(c.get('name') or '(empty)' for c in drop)})")
            show["characters"] = keep

    # productions: junk roster rows
    for prod in data["productions"]:
        keep, drop = [], []
        for r in prod.get("roster", []):
            (drop if junk(r.get("role")) else keep).append(r)
        if drop:
            report.append(f"production {prod['id']}: {len(drop)} junk roster rows ({', '.join(repr(r['role']) for r in drop[:4])}"
                          + (", ..." if len(drop) > 4 else "") + ")")
            prod["roster"] = keep
        # a roster row whose character no longer exists in the show
    # performances: junk changes
    kept_perfs, removed_perfs = [], []
    for perf in data["performances"]:
        changes = perf.get("changes", [])
        good = [c for c in changes if not junk(c.get("role"))]
        if len(good) != len(changes):
            if not good and perf.get("number") is None and not perf.get("preview"):
                removed_perfs.append(perf["id"])
                continue
            report.append(f"performance {perf['id']}: {len(changes) - len(good)} junk changes removed")
            perf["changes"] = good
        kept_perfs.append(perf)
    if removed_perfs:
        report.append(f"performances removed (their only change was junk): {', '.join(removed_perfs)}")
    data["performances"] = kept_perfs

    if not report:
        print("Nothing to clean.")
    for line in report:
        print(" -", line)

    # people no longer used anywhere
    used = set()
    for s in data["shows"]:
        used.update(s.get("composers", []))
    for p in data["productions"]:
        used.update(r["person"] for r in p.get("roster", []))
    for pf in data["performances"]:
        for c in pf.get("changes", []):
            used.add(c.get("person"))
            used.add(c.get("replaces"))
    orphans = [p for p in data["people"] if p["id"] not in used]
    if orphans:
        print(f"\n{len(orphans)} people are not used in any show, production or performance "
              f"(left in place):")
        print("   " + ", ".join(p["name"] for p in orphans[:40]) + (" ..." if len(orphans) > 40 else ""))

    if not apply:
        if report:
            print("\nDry run only. Run again with --apply to write these changes.")
        return
    for n in ("shows", "productions", "performances"):
        path = folder / f"{n}.json"
        if path.exists():
            shutil.copy(path, str(path) + ".bak")
            path.write_text(json.dumps(data[n], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\nSaved. Backups are next to each file as .bak")


if __name__ == "__main__":
    main()
