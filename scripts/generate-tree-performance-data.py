#!/usr/bin/env python3
"""Generate deterministic CSV data for tree-query performance benchmarks.

Examples:
  python scripts/generate-tree-performance-data.py --people 10000 --output target/tree-10k
  python scripts/generate-tree-performance-data.py --people 100000 --output target/tree-100k
  python scripts/generate-tree-performance-data.py --people 1000000 --output target/tree-1m

The generated relationship graph is a bounded-width lineage tree plus spouse
edges. CSV files are intentionally database-neutral and can be loaded with
PostgreSQL COPY after mapping the documented columns.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--people", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--clan-id", type=int, default=900001)
    parser.add_argument("--branch-id", type=int, default=900001)
    parser.add_argument("--children-per-parent", type=int, default=3)
    args = parser.parse_args()
    if args.people < 1:
        parser.error("--people must be positive")
    if args.children_per_parent < 1:
        parser.error("--children-per-parent must be positive")
    return args


def write_people(path: Path, count: int, clan_id: int, branch_id: int) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["external_id", "clan_id", "branch_id", "person_code", "generation_no", "data_status"])
        for person_id in range(1, count + 1):
            generation = 1
            cursor = person_id
            while cursor > 1:
                cursor = (cursor - 2) // 3 + 1
                generation += 1
            writer.writerow([person_id, clan_id, branch_id, f"PERF-{person_id:08d}", generation, "published"])


def write_relationships(path: Path, count: int, clan_id: int, children_per_parent: int) -> int:
    edge_id = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "external_id", "clan_id", "from_external_id", "to_external_id",
            "relation_type", "relation_category", "is_lineage_relation", "data_status"
        ])
        for child in range(2, count + 1):
            parent = (child - 2) // children_per_parent + 1
            edge_id += 1
            writer.writerow([edge_id, clan_id, parent, child, "parent_child", "blood", True, "published"])
        for left in range(2, count, 2):
            right = left + 1
            if right > count:
                break
            edge_id += 1
            writer.writerow([edge_id, clan_id, left, right, "spouse", "marriage", False, "published"])
    return edge_id


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    people_path = args.output / "people.csv"
    relationships_path = args.output / "relationships.csv"
    write_people(people_path, args.people, args.clan_id, args.branch_id)
    edges = write_relationships(relationships_path, args.people, args.clan_id, args.children_per_parent)
    print(f"generated people={args.people} relationships={edges} output={args.output}")


if __name__ == "__main__":
    main()
