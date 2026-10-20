#!/usr/bin/env python3
"""
merge.py: merge one production into another of the same show.

Usage:
    python3 merge.py [folder] --merge KEEP REMOVE [--merge KEEP REMOVE ...] [options]

    python3 merge.py data --merge hadestown-p2 hadestown-p1 --drop-performances --no-roster
    python3 merge.py data --merge hadestown-p2 hadestown-p1 --merge chicago-p2 chicago-p1 --apply

Options:
    --apply              write the changes (without it, only a preview is printed)
    --drop-performances  delete the performances of REMOVE instead of moving them to KEEP
    --no-roster          ignore REMOVE's roster (default: add the rows KEEP does not have)

What happens to each pair:
  - roster: rows of REMOVE that KEEP lacks (same role and person) are added, unless --no-roster
  - opening: the earlier of the two; closing: empty if either run is still open, else the later
  - performances of REMOVE are moved to KEEP and renamed (hadestown-p1-2106 becomes
    hadestown-p2-2106). If KEEP already has a performance with that id, KEEP's is kept and the
    changes of the other one are added to it
  - REMOVE is deleted from productions.json
Production ids and numbers of the other productions are left alone, so gaps in numbering can remain.
A .bak copy of each changed file is saved next to it.
"""
import json
import shutil
import sys
from pathlib import Path


def fold(s):
    return str(s).strip().lower()


def main():
    argv = sys.argv[1:]
    apply = "--apply" in argv
    drop_perfs = "--drop-performances" in argv
    no_roster = "--no-roster" in argv
    pairs, rest, i = [], [], 0
    while i < len(argv):
        a = argv[i]
        if a == "--merge":
            if i + 2 >= len(argv):
                sys.exit("--merge needs two ids: KEEP REMOVE")
            pairs.append((argv[i + 1], argv[i + 2]))
            i += 3
            continue
        if not a.startswith("--"):
            rest.append(a)
        i += 1
    if not pairs:
        sys.exit(__doc__)
    folder = Path(rest[0] if rest else ".")
    prods = json.loads((folder / "productions.json").read_text(encoding="utf-8"))
    perfs = json.loads((folder / "performances.json").read_text(encoding="utf-8"))
    print(f"Working in {folder.resolve()}  ({'APPLY' if apply else 'preview'})\n")

    for keep_id, rem_id in pairs:
        keep = next((p for p in prods if p["id"] == keep_id), None)
        rem = next((p for p in prods if p["id"] == rem_id), None)
        if not keep or not rem:
            print(f"! skipped {keep_id} <- {rem_id}: "
                  f"{'keep' if not keep else 'remove'} id not found in productions.json")
            continue
        if keep_id == rem_id:
            print(f"! skipped {keep_id}: same production twice")
            continue
        if keep["show"] != rem["show"]:
            print(f"! skipped {keep_id} <- {rem_id}: different shows ({keep['show']} / {rem['show']})")
            continue
        print(f"== {rem_id}  ->  {keep_id}   (show {keep['show']})")

        # roster
        if not no_roster:
            have = {(fold(r["role"]), r["person"]) for r in keep["roster"]}
            added = [r for r in rem["roster"] if (fold(r["role"]), r["person"]) not in have]
            keep["roster"].extend(added)
            print(f"   roster: {len(added)} rows added from {rem_id} ({len(rem['roster']) - len(added)} already there)")
        else:
            print("   roster: kept as it is (--no-roster)")

        # dates
        keep["opening"] = min(keep["opening"], rem["opening"])
        if keep.get("closing") is None or rem.get("closing") is None:
            keep["closing"] = None
        else:
            keep["closing"] = max(keep["closing"], rem["closing"])
        print(f"   dates: opening {keep['opening']}, closing {keep['closing']}")

        # performances
        moved = [p for p in perfs if p["production"] == rem_id]
        others = [p for p in perfs if p["production"] != rem_id]
        if drop_perfs:
            perfs = others
            print(f"   performances: {len(moved)} deleted (--drop-performances)")
        else:
            by_id = {p["id"]: p for p in others}
            result, merged_into, renamed = list(others), 0, 0
            for p in moved:
                tail = p["id"][len(rem_id) + 1:] if p["id"].startswith(rem_id + "-") else p["date"]
                new_id = f"{keep_id}-{tail}"
                if new_id in by_id:
                    target = by_id[new_id]
                    for c in p.get("changes", []):
                        if c not in target["changes"]:
                            target["changes"].append(c)
                    if target.get("number") is None:
                        target["number"] = p.get("number")
                    merged_into += 1
                else:
                    p["id"], p["production"] = new_id, keep_id
                    result.append(p)
                    by_id[new_id] = p
                    renamed += 1
            perfs = result
            print(f"   performances: {renamed} moved and renamed, {merged_into} combined with an existing one")

        prods = [p for p in prods if p["id"] != rem_id]
        print(f"   {rem_id} removed from productions.json\n")

    # checks
    pids = {p["id"] for p in prods}
    dangling = [f["id"] for f in perfs if f["production"] not in pids]
    ids = [f["id"] for f in perfs]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    print("Check: performances pointing at a missing production:", dangling or "none")
    print("Check: duplicate performance ids:", dupes or "none")

    if not apply:
        print("\nPreview only. Add --apply to write these changes.")
        return
    if dangling or dupes:
        sys.exit("Not saved: fix the problems above first.")
    for name, data in (("productions", prods), ("performances", perfs)):
        path = folder / f"{name}.json"
        shutil.copy(path, str(path) + ".bak")
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\nSaved. Backups are next to each file as .bak")


if __name__ == "__main__":
    main()
