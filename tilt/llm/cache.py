"""File-based LLM response cache keyed by (kind, ticker, snapshot_date).

JSON files under ``data/llm_cache/`` — one per cache entry. Same input always
returns the same text without re-calling the model. Cheap, transparent, easy
to inspect during the demo.
"""

from __future__ import annotations

import contextlib
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

DEFAULT_CACHE_DIR = Path("data/llm_cache")


@dataclass(frozen=True)
class CacheKey:
    """Stable cache identity for an LLM call.

    ``kind`` distinguishes thesis vs market-read so a ticker that gets both
    types of generation never collides on disk.
    """

    kind: str  # "thesis" | "thesis_short" | "market_read"
    ticker: str  # "" for market-read entries
    snapshot_date: str  # ISO-8601 date; "" if not snapshot-bound

    def hash(self) -> str:
        raw = f"{self.kind}|{self.ticker}|{self.snapshot_date}".encode()
        return hashlib.sha256(raw).hexdigest()[:16]

    def filename(self) -> str:
        # Human-readable filename + hash suffix. Keeps the dir browsable.
        ticker_part = self.ticker or "_"
        date_part = self.snapshot_date or "_"
        return f"{self.kind}__{ticker_part}__{date_part}__{self.hash()}.json"


class LLMCache:
    """Get/put JSON-on-disk cache for LLM responses.

    Misses are not exceptions — ``get`` returns ``None``. The provider layer
    owns the cache-miss path (call the model, store the result).
    """

    def __init__(self, base_dir: Path | str = DEFAULT_CACHE_DIR) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, key: CacheKey) -> Path:
        return self.base_dir / key.filename()

    def get(self, key: CacheKey) -> str | None:
        path = self._path(key)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            text = data.get("text")
            if isinstance(text, str):
                return text
        except (json.JSONDecodeError, OSError):
            return None
        return None

    def put(self, key: CacheKey, text: str, *, prompt: str | None = None) -> None:
        path = self._path(key)
        payload = {
            "kind": key.kind,
            "ticker": key.ticker,
            "snapshot_date": key.snapshot_date,
            "text": text,
            "prompt": prompt,
        }
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def clear(self) -> None:
        """Wipe every cache file under ``base_dir``. Useful in tests."""
        if not self.base_dir.exists():
            return
        for file in self.base_dir.glob("*.json"):
            with contextlib.suppress(OSError):
                file.unlink()
