"""Tests for the universe / sector membership loaders.

Verifies the on-disk JSON schema, the loader API surface, the union semantics
of ``get_universe``, and a couple of data-integrity invariants that should
never silently break — every sector having a display name, every ticker being
a non-empty uppercase string, etc.
"""

from __future__ import annotations

import re

import pytest

from tilt.universe import (
    SECTOR_DISPLAY_NAMES,
    SECTOR_NAMES,
    StockInfo,
    UnknownSectorError,
    get_all_sectors,
    get_nifty500,
    get_sector,
    get_universe,
)

# Allow uppercase letters, digits, and a few NSE-symbol metacharacters (-, &).
_TICKER_RE = re.compile(r"^[A-Z0-9&\-]+$")


class TestNifty500:
    def test_returns_non_empty_list(self) -> None:
        stocks = get_nifty500()
        assert len(stocks) > 0
        assert all(isinstance(s, StockInfo) for s in stocks)

    def test_tickers_are_well_formed(self) -> None:
        for stock in get_nifty500():
            assert _TICKER_RE.match(stock.ticker), f"Bad ticker: {stock.ticker!r}"
            assert stock.name.strip(), f"Empty name for ticker {stock.ticker}"

    def test_no_duplicate_tickers(self) -> None:
        tickers = [s.ticker for s in get_nifty500()]
        assert len(tickers) == len(set(tickers))


class TestSectors:
    def test_fourteen_sectors_registered(self) -> None:
        # SPEC Wave 3 locked the 14-index list (Nifty Media deliberately dropped).
        assert len(SECTOR_NAMES) == 14

    def test_every_sector_has_display_name(self) -> None:
        for name in SECTOR_NAMES:
            assert name in SECTOR_DISPLAY_NAMES
            assert SECTOR_DISPLAY_NAMES[name].strip()

    def test_every_sector_file_loads(self) -> None:
        sectors = get_all_sectors()
        assert set(sectors.keys()) == set(SECTOR_NAMES)
        for name, stocks in sectors.items():
            assert len(stocks) > 0, f"Sector {name} has no constituents"
            assert all(isinstance(s, StockInfo) for s in stocks)

    def test_sector_tickers_are_well_formed(self) -> None:
        for name, stocks in get_all_sectors().items():
            for stock in stocks:
                assert _TICKER_RE.match(stock.ticker), f"Bad ticker in {name}: {stock.ticker!r}"

    def test_no_duplicate_tickers_within_a_sector(self) -> None:
        for name, stocks in get_all_sectors().items():
            tickers = [s.ticker for s in stocks]
            assert len(tickers) == len(set(tickers)), f"Duplicates in {name}"

    def test_unknown_sector_raises(self) -> None:
        with pytest.raises(UnknownSectorError, match="Unknown sector"):
            get_sector("nifty_unicorns")

    def test_deliberate_overlaps_exist(self) -> None:
        # Per SPEC Wave 3, the Banking trio, Pharma/Healthcare, and
        # Energy/Oil&Gas overlap by design. Smoke-check the most obvious case.
        bank = {s.ticker for s in get_sector("nifty_bank")}
        private_bank = {s.ticker for s in get_sector("nifty_private_bank")}
        psu_bank = {s.ticker for s in get_sector("nifty_psu_bank")}
        assert private_bank & bank  # private banks are a subset of bank
        assert psu_bank & bank  # PSU banks are too


class TestUniverse:
    def test_returns_union_with_no_duplicates(self) -> None:
        universe = get_universe()
        tickers = [s.ticker for s in universe]
        assert len(tickers) == len(set(tickers))

    def test_includes_every_nifty500_ticker(self) -> None:
        n500 = {s.ticker for s in get_nifty500()}
        universe = {s.ticker for s in get_universe()}
        assert n500 <= universe

    def test_includes_every_sector_ticker(self) -> None:
        universe = {s.ticker for s in get_universe()}
        for stocks in get_all_sectors().values():
            for stock in stocks:
                assert stock.ticker in universe

    def test_is_strictly_larger_than_nifty500_subset(self) -> None:
        # Sectoral indices contain some names outside our Nifty 500 starter
        # subset (PSU banks, smaller pharma, etc), so the union is bigger.
        assert len(get_universe()) > len(get_nifty500())
