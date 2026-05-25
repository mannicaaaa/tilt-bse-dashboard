"""ScanService — orchestrates fetch → sector rotation → signal scans.

Sits between the route handlers and the underlying data/signal/sector modules.
Stateless across requests; the parquet cache absorbs the cost of repeated
universe-wide fetches.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta

import pandas as pd

from tilt.data import DataFetcher, FetchResult
from tilt.sectors import (
    SectorRanking,
    compute_sector_momentum,
    rank_sectors,
)
from tilt.signals import (
    ScanInput,
    SignalResult,
    build_snapshot,
    run_averaging_scan,
    run_rally_scan,
    run_trap_scan,
)
from tilt.universe import (
    SECTOR_NAMES,
    StockInfo,
    get_nifty500,
    get_sector,
    get_universe,
)

DEFAULT_LOOKBACK_DAYS = 365


@dataclass(frozen=True)
class UniverseSnapshot:
    """In-memory bundle the scan endpoints share."""

    closes: dict[str, pd.Series]
    rankings: list[SectorRanking]
    name_by_ticker: dict[str, str]
    sector_by_ticker: dict[str, SectorRanking]  # the strongest sector a ticker belongs to


class ScanService:
    def __init__(self, fetcher: DataFetcher) -> None:
        self.fetcher = fetcher

    # --- Fetch + assemble universe snapshot ---

    def refresh(
        self,
        force_refresh: bool = False,
        lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    ) -> tuple[UniverseSnapshot, FetchResult]:
        end = date.today()
        start = end - timedelta(days=lookback_days)
        universe = get_universe()
        tickers = [s.ticker for s in universe]

        fetch_result = self.fetcher.fetch(tickers, start, end, force_refresh=force_refresh)
        closes = {t: df["close"] for t, df in fetch_result.data.items() if not df.empty}

        rankings = self._rank_all_sectors(closes)
        name_by_ticker = {s.ticker: s.name for s in universe}
        sector_by_ticker = self._assign_strongest_sector(rankings)

        snapshot = UniverseSnapshot(
            closes=closes,
            rankings=rankings,
            name_by_ticker=name_by_ticker,
            sector_by_ticker=sector_by_ticker,
        )
        return snapshot, fetch_result

    def _rank_all_sectors(self, closes: dict[str, pd.Series]) -> list[SectorRanking]:
        sector_momentums: dict[str, float] = {}
        for sector_name in SECTOR_NAMES:
            constituents = get_sector(sector_name)
            sector_closes = {s.ticker: closes[s.ticker] for s in constituents if s.ticker in closes}
            sector_momentums[sector_name] = compute_sector_momentum(sector_closes)
        return rank_sectors(sector_momentums)

    def _assign_strongest_sector(self, rankings: list[SectorRanking]) -> dict[str, SectorRanking]:
        """Each ticker maps to the *highest-ranked* sector it belongs to.

        Many tickers appear in multiple sectors (HDFCBANK is in Bank + Private
        Bank + Financial Services). We pick the one with the strongest current
        momentum so the per-ticker sector_tag reflects the best read on the
        ticker's current rotation context.
        """
        ordered = sorted(rankings, key=lambda r: r.rank)  # rank 1 first
        assignment: dict[str, SectorRanking] = {}
        for r in ordered:
            for stock in get_sector(r.sector_name):
                assignment.setdefault(stock.ticker, r)
        return assignment

    # --- Build scan inputs ---

    def build_inputs(
        self,
        snapshot: UniverseSnapshot,
        tickers: list[str] | None = None,
    ) -> list[ScanInput]:
        """Build ScanInput rows for the given tickers (or whole universe)."""
        target = tickers or list(snapshot.closes.keys())
        inputs: list[ScanInput] = []
        for ticker in target:
            if ticker not in snapshot.closes:
                continue
            sector_ranking = snapshot.sector_by_ticker.get(ticker)
            if sector_ranking is None:
                continue
            inputs.append(
                ScanInput(
                    ticker=ticker,
                    name=snapshot.name_by_ticker.get(ticker, ticker),
                    close=snapshot.closes[ticker],
                    sector=sector_ranking.display_name,
                    sector_tag=sector_ranking.tag,
                    sector_strength=sector_ranking.momentum,
                )
            )
        return inputs

    # --- Scans ---

    def rally(self, snapshot: UniverseSnapshot, limit: int | None = None) -> list[SignalResult]:
        results = run_rally_scan(self.build_inputs(snapshot))
        return results[:limit] if limit else results

    def rally_conviction(self, snapshot: UniverseSnapshot, limit: int = 5) -> list[SignalResult]:
        """Rally passes restricted to Hot sectors only."""
        hot_sectors = {r.display_name for r in snapshot.rankings if r.tag == "Hot"}
        passes = run_rally_scan(self.build_inputs(snapshot))
        return [r for r in passes if r.sector in hot_sectors][:limit]

    def rally_by_sector(
        self, snapshot: UniverseSnapshot, per_sector_limit: int = 5
    ) -> dict[str, list[SignalResult]]:
        passes = run_rally_scan(self.build_inputs(snapshot))
        bucketed: dict[str, list[SignalResult]] = defaultdict(list)
        for r in passes:
            bucketed[r.sector].append(r)
        return {sector: rows[:per_sector_limit] for sector, rows in bucketed.items()}

    def averaging_for_holdings(
        self,
        snapshot: UniverseSnapshot,
        avg_buys: dict[str, float],
    ) -> list[SignalResult]:
        inputs = self.build_inputs(snapshot, tickers=list(avg_buys.keys()))
        # Inject avg_buy on each input.
        inputs_with_avg = [
            ScanInput(
                ticker=i.ticker,
                name=i.name,
                close=i.close,
                sector=i.sector,
                sector_tag=i.sector_tag,
                sector_strength=i.sector_strength,
                avg_buy=avg_buys.get(i.ticker),
            )
            for i in inputs
        ]
        return run_averaging_scan(inputs_with_avg)

    def traps_for_holdings(
        self,
        snapshot: UniverseSnapshot,
        tickers: list[str],
    ) -> list[SignalResult]:
        return run_trap_scan(self.build_inputs(snapshot, tickers=tickers))

    # --- Stock detail ---

    def stock_detail(
        self,
        snapshot: UniverseSnapshot,
        ticker: str,
    ) -> tuple[StockInfo, pd.DataFrame, ScanInput] | None:
        ticker_upper = ticker.upper()
        if ticker_upper not in snapshot.closes:
            return None
        info = self._lookup_stock_info(ticker_upper)
        # Use the snapshot's own date range so the cache lookup is guaranteed
        # to be fully covered (asking for today-365 calendar days vs what the
        # provider actually returned can mis-align by a day or two).
        close_index = snapshot.closes[ticker_upper].index
        ohlcv = self.fetcher.cache.get(
            ticker_upper,
            close_index[0].date(),
            close_index[-1].date(),
        )
        if ohlcv is None:
            return None
        sector_ranking = snapshot.sector_by_ticker.get(ticker_upper)
        scan_input = ScanInput(
            ticker=ticker_upper,
            name=info.name if info else ticker_upper,
            close=snapshot.closes[ticker_upper],
            sector=sector_ranking.display_name if sector_ranking else "—",
            sector_tag=sector_ranking.tag if sector_ranking else "Neutral",
            sector_strength=sector_ranking.momentum if sector_ranking else 0.5,
        )
        return info, ohlcv, scan_input

    @staticmethod
    def _lookup_stock_info(ticker: str) -> StockInfo | None:
        for stock in get_nifty500():
            if stock.ticker == ticker:
                return stock
        for sector_name in SECTOR_NAMES:
            for stock in get_sector(sector_name):
                if stock.ticker == ticker:
                    return stock
        return None


# Re-exported convenience for build_snapshot consumers in route handlers.
__all__ = ["DEFAULT_LOOKBACK_DAYS", "ScanService", "UniverseSnapshot", "build_snapshot"]
