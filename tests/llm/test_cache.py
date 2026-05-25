"""Tests for the on-disk LLM cache."""

from __future__ import annotations

from pathlib import Path

from tilt.llm.cache import CacheKey, LLMCache


def test_cache_get_miss_returns_none(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path)
    key = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    assert cache.get(key) is None


def test_cache_put_then_get_roundtrip(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path)
    key = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    cache.put(key, "the thesis text", prompt="the prompt")
    assert cache.get(key) == "the thesis text"


def test_cache_key_hash_is_stable() -> None:
    a = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    b = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    assert a.hash() == b.hash()
    assert a.filename() == b.filename()


def test_cache_key_distinguishes_kinds() -> None:
    a = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    b = CacheKey(kind="thesis_short", ticker="TCS", snapshot_date="2026-03-27")
    assert a.hash() != b.hash()


def test_cache_key_distinguishes_dates() -> None:
    a = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    b = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-28")
    assert a.hash() != b.hash()


def test_cache_filename_browsable(tmp_path: Path) -> None:
    """Cache filenames embed ticker + date so the dir stays inspectable for demo."""
    cache = LLMCache(tmp_path)
    key = CacheKey(kind="thesis", ticker="TCS", snapshot_date="2026-03-27")
    cache.put(key, "x")
    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1
    name = files[0].name
    assert "TCS" in name
    assert "2026-03-27" in name
    assert "thesis" in name


def test_cache_market_read_uses_empty_ticker(tmp_path: Path) -> None:
    """Market-read entries have no ticker — the filename uses a placeholder."""
    cache = LLMCache(tmp_path)
    key = CacheKey(kind="market_read", ticker="", snapshot_date="2026-03-27")
    cache.put(key, "market text")
    assert cache.get(key) == "market text"


def test_cache_clear_wipes_files(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path)
    cache.put(CacheKey(kind="thesis", ticker="A", snapshot_date="2026-03-27"), "x")
    cache.put(CacheKey(kind="thesis", ticker="B", snapshot_date="2026-03-27"), "y")
    assert len(list(tmp_path.glob("*.json"))) == 2
    cache.clear()
    assert len(list(tmp_path.glob("*.json"))) == 0


def test_cache_corrupt_file_returns_none(tmp_path: Path) -> None:
    """A bad JSON file shouldn't blow up the read path."""
    cache = LLMCache(tmp_path)
    key = CacheKey(kind="thesis", ticker="X", snapshot_date="2026-03-27")
    # Write garbage to where this key would live.
    (tmp_path / key.filename()).write_text("not json {", encoding="utf-8")
    assert cache.get(key) is None


def test_cache_creates_parent_dir(tmp_path: Path) -> None:
    """LLMCache transparently creates its base directory."""
    nested = tmp_path / "deep" / "nested" / "cache"
    assert not nested.exists()
    LLMCache(nested)
    assert nested.exists()
