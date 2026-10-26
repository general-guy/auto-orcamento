"""Gera MANIFEST.json UTF-8 para backup-legado/pre-uuid-migration."""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("Uso: write-backup-manifest.py <destRoot> <sourcePath>", file=sys.stderr)
        return 1

    dest = Path(sys.argv[1]).resolve()
    source = Path(sys.argv[2]).resolve()
    rows: list[dict[str, object]] = []

    for path in sorted(dest.rglob("*")):
        if not path.is_file() or path.name == "MANIFEST.json":
            continue
        rel = path.relative_to(dest).as_posix()
        data = path.read_bytes()
        rows.append(
            {
                "name": rel,
                "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
        )

    payload = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "sourcePath": str(source),
        "schemaNote": "string-list histories (pre-UUID)",
        "files": rows,
    }
    manifest = dest / "MANIFEST.json"
    manifest.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Manifest: {manifest} ({len(rows)} arquivo(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
