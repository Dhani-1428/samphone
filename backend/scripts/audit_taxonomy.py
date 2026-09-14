#!/usr/bin/env python3
"""Audit and optionally apply Parts vs Accessories taxonomy.

Dry-run (default): only prints and writes a JSON report. No database writes.
Apply: requires --apply AND env SAMPHONE_TAXONOMY_APPLY=YES.

Usage:
  python scripts/audit_taxonomy.py
  python scripts/audit_taxonomy.py --seed ../backend/products_seed.json
  SAMPHONE_TAXONOMY_APPLY=YES python scripts/audit_taxonomy.py --apply
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from product_taxonomy import META_SUB, META_TOP, assign_taxonomy, validate_taxonomy  # noqa: E402


def load_seed(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_mysql() -> list[dict]:
    try:
        from services.catalog_service import CatalogService

        svc = CatalogService()
        page = svc.filter_products(limit=5000, offset=0, sort="date_desc")
        items = list(page.get("items") or [])
        off = 5000
        while page.get("has_more") and off < 40000:
            page = svc.filter_products(limit=5000, offset=off, sort="date_desc")
            batch = page.get("items") or []
            if not batch:
                break
            items.extend(batch)
            off += 5000
        return items
    except Exception as exc:
        print(f"MySQL catalog unavailable ({exc}); using seed only.", file=sys.stderr)
        return []


def row_title(row: dict) -> str:
    return str(row.get("title") or row.get("name") or "")


def audit_rows(rows: list[dict]) -> dict:
    proposed = Counter()
    stored = Counter()
    flags = {"wrong_top": [], "missing": [], "ambiguous": []}
    for row in rows:
        stored[row.get("category") or "(missing)"] += 1
        asg = assign_taxonomy(
            title=row_title(row),
            leaf=str(row.get("leaf_category") or ""),
            part_type=str(row.get("part_type") or ""),
            category=str(row.get("category") or ""),
        )
        proposed[f"{asg['top']}/{asg['sub']}"] += 1
        sample = {
            "id": row.get("id") or row.get("wc_id"),
            "title": row_title(row),
            "stored": row.get("category"),
            "leaf": row.get("leaf_category") or row.get("part_type"),
            "proposed_top": asg["top"],
            "proposed_sub": asg["sub"],
            "reason": asg["reason"],
        }
        if asg["missing_stored"]:
            flags["missing"].append(sample)
        elif asg["mismatch"]:
            flags["wrong_top"].append(sample)
        if asg["ambiguous"]:
            flags["ambiguous"].append(sample)
    return {
        "total": len(rows),
        "stored_top": dict(stored.most_common()),
        "proposed": dict(proposed.most_common()),
        "counts": {
            "wrong_top": len(flags["wrong_top"]),
            "missing": len(flags["missing"]),
            "ambiguous": len(flags["ambiguous"]),
        },
        "samples": {
            "wrong_top": flags["wrong_top"][:40],
            "missing": flags["missing"][:20],
            "ambiguous": flags["ambiguous"][:40],
        },
        "all_wrong_top": flags["wrong_top"],
    }


def apply_meta(rows: list[dict], assignments: list[dict]) -> int:
    from catalog_db import get_catalog_db

    db = get_catalog_db()
    if not db.configured():
        raise SystemExit("Catalog MySQL is not configured; cannot apply.")
    by_id = {str(r.get("id") or r.get("wc_id")): r for r in rows}
    written = 0
    with db.connect() as conn:
        with conn.cursor() as cur:
            meta_t = db.t("postmeta")
            for asg in assignments:
                pid = asg.get("id")
                src = by_id.get(str(pid)) if pid is not None else None
                wc_id = int((src or {}).get("wc_id") or 0)
                if wc_id <= 0:
                    continue
                validate_taxonomy(asg["proposed_top"], asg["proposed_sub"])
                for key, val in ((META_TOP, asg["proposed_top"]), (META_SUB, asg["proposed_sub"])):
                    cur.execute(
                        f"SELECT meta_id FROM `{meta_t}` WHERE post_id=%s AND meta_key=%s LIMIT 1",
                        (wc_id, key),
                    )
                    found = cur.fetchone()
                    if found:
                        cur.execute(
                            f"UPDATE `{meta_t}` SET meta_value=%s WHERE meta_id=%s",
                            (val, found["meta_id"]),
                        )
                    else:
                        cur.execute(
                            f"INSERT INTO `{meta_t}` (post_id, meta_key, meta_value) VALUES (%s,%s,%s)",
                            (wc_id, key, val),
                        )
                written += 1
        conn.commit()
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit Parts vs Accessories taxonomy")
    parser.add_argument("--seed", type=Path, default=ROOT / "products_seed.json")
    parser.add_argument("--source", choices=["seed", "mysql", "auto"], default="auto")
    parser.add_argument("--apply", action="store_true", help="Write meta (requires SAMPHONE_TAXONOMY_APPLY=YES)")
    parser.add_argument("--out", type=Path, default=ROOT / "reports" / "taxonomy-audit.json")
    args = parser.parse_args()

    rows: list[dict] = []
    if args.source in {"auto", "mysql"}:
        rows = load_mysql()
    if not rows:
        rows = load_seed(args.seed)
        source = "seed"
    else:
        source = "mysql"
    report = audit_rows(rows)
    report["source"] = source
    args.out.parent.mkdir(parents=True, exist_ok=True)
    slim = {k: v for k, v in report.items() if k != "all_wrong_top"}
    args.out.write_text(json.dumps(slim, indent=2), encoding="utf-8")
    print(f"Source: {source} ({report['total']} products)")
    print("Stored top-level:")
    for k, v in report["stored_top"].items():
        print(f"  {v:6d}  {k}")
    print("Proposed browse taxonomy:")
    for k, v in report["proposed"].items():
        print(f"  {v:6d}  {k}")
    print(
        "Flags: "
        f"{report['counts']['wrong_top']} wrong top, "
        f"{report['counts']['missing']} missing, "
        f"{report['counts']['ambiguous']} ambiguous"
    )
    print(f"Report written to {args.out}")
    print("No database writes (dry-run).")

    if args.apply:
        if os.environ.get("SAMPHONE_TAXONOMY_APPLY") != "YES":
            raise SystemExit("Refusing to apply. Set SAMPHONE_TAXONOMY_APPLY=YES to confirm.")
        if source != "mysql":
            raise SystemExit("Apply requires MySQL catalog rows (wc_id).")
        n = apply_meta(rows, report["all_wrong_top"] + report["samples"]["missing"])
        print(f"Wrote taxonomy meta on {n} products.")


if __name__ == "__main__":
    main()
