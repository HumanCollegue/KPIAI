"""
KPIService — calculate_kpi()

Calculates a single KPI from a triage extraction result produced by run_triage().
Does NOT re-extract any data — it only reads values already present in the dict.

Supported KPIs (12 total):
  Current Ratio, Quick Ratio, Debt-to-Equity Ratio, Debt-to-Asset Ratio,
  Debt-to-Equity YoY Change, Debt Service Coverage Ratio, Return on Assets,
  Asset Turnover Ratio, Degree of Operating Leverage,
  COGS to Revenue YoY Change, Revenue Growth Rate,
  Operating Expense Ratio YoY Change.
"""

from dataclasses import dataclass
from typing import Callable, Optional


# ---------------------------------------------------------------------------
# Return shape
# ---------------------------------------------------------------------------

def _result(
    kpi_name: str,
    status: str,
    value: Optional[float] = None,
    blocked_by: Optional[list] = None,
    error_message: Optional[str] = None,
) -> dict:
    """
    status      : "calculated" | "blocked" | "error" | "unknown_kpi"
    value       : float rounded to 4 dp, or None
    blocked_by  : list of "section.field" strings for every flagged dependency
    error_message: plain-English explanation when status is "error" or "unknown_kpi"
    """
    return {
        "kpi_name": kpi_name,
        "status": status,
        "value": value,
        "blocked_by": blocked_by or [],
        "error_message": error_message,
    }


# ---------------------------------------------------------------------------
# Value resolution helpers
# ---------------------------------------------------------------------------

def _item(extraction: dict, section: str, field: str) -> dict:
    """Return the raw line item dict (may be empty if missing)."""
    return extraction.get(section, {}).get(field, {})


def _cur(extraction: dict, section: str, field: str) -> Optional[float]:
    return _item(extraction, section, field).get("current_value")


def _prior(extraction: dict, section: str, field: str) -> Optional[float]:
    return _item(extraction, section, field).get("prior_year_value")


def _flagged(extraction: dict, section: str, field: str) -> bool:
    return _item(extraction, section, field).get("status") == "flagged"


# ---------------------------------------------------------------------------
# KPI definition
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class _Dep:
    """A single line-item dependency: section + field."""
    section: str
    field: str

    def key(self) -> str:
        return f"{self.section}.{self.field}"


@dataclass(frozen=True)
class KPIDefinition:
    display_name: str
    formula_str: str
    dependencies: tuple  # tuple[_Dep, ...]
    calculate: Callable  # (extraction: dict) -> float  — may raise ZeroDivisionError


# ---------------------------------------------------------------------------
# The 12 KPI definitions
# ---------------------------------------------------------------------------

# Shorthand dep constructors
_bs  = lambda f: _Dep("balance_sheet", f)
_is  = lambda f: _Dep("income_statement", f)
_cf  = lambda f: _Dep("cash_flow", f)


KPI_CATALOG: dict[str, KPIDefinition] = {

    "current_ratio": KPIDefinition(
        display_name  = "Current Ratio",
        formula_str   = "Current Assets / Current Liabilities",
        dependencies  = (_bs("current_assets"), _bs("current_liabilities")),
        calculate     = lambda e: (
            _cur(e, "balance_sheet", "current_assets") /
            _cur(e, "balance_sheet", "current_liabilities")
        ),
    ),

    "quick_ratio": KPIDefinition(
        display_name  = "Quick Ratio",
        formula_str   = "(Current Assets - Inventory) / Current Liabilities",
        dependencies  = (_bs("current_assets"), _bs("inventory"), _bs("current_liabilities")),
        calculate     = lambda e: (
            (_cur(e, "balance_sheet", "current_assets") - _cur(e, "balance_sheet", "inventory")) /
            _cur(e, "balance_sheet", "current_liabilities")
        ),
    ),

    "debt_to_equity_ratio": KPIDefinition(
        display_name  = "Debt-to-Equity Ratio",
        formula_str   = "Total Debt / Total Equity",
        dependencies  = (_bs("total_debt"), _bs("total_equity")),
        calculate     = lambda e: (
            _cur(e, "balance_sheet", "total_debt") /
            _cur(e, "balance_sheet", "total_equity")
        ),
    ),

    "debt_to_asset_ratio": KPIDefinition(
        display_name  = "Debt-to-Asset Ratio",
        formula_str   = "Total Debt / Total Assets",
        dependencies  = (_bs("total_debt"), _bs("total_assets")),
        calculate     = lambda e: (
            _cur(e, "balance_sheet", "total_debt") /
            _cur(e, "balance_sheet", "total_assets")
        ),
    ),

    "debt_to_equity_yoy_change": KPIDefinition(
        display_name  = "Debt-to-Equity YoY Change",
        formula_str   = "(Current D/E - Prior Year D/E) / Prior Year D/E",
        dependencies  = (_bs("total_debt"), _bs("total_equity")),
        calculate     = lambda e: _de_yoy(e),
    ),

    "debt_service_coverage_ratio": KPIDefinition(
        display_name  = "Debt Service Coverage Ratio",
        formula_str   = "Operating Cash Flow / Total Debt Service",
        dependencies  = (_cf("operating_cash_flow"), _cf("total_debt_service")),
        calculate     = lambda e: (
            _cur(e, "cash_flow", "operating_cash_flow") /
            _cur(e, "cash_flow", "total_debt_service")
        ),
    ),

    "return_on_assets": KPIDefinition(
        display_name  = "Return on Assets",
        formula_str   = "Net Income / Total Assets",
        dependencies  = (_is("net_income"), _bs("total_assets")),
        calculate     = lambda e: (
            _cur(e, "income_statement", "net_income") /
            _cur(e, "balance_sheet", "total_assets")
        ),
    ),

    "asset_turnover_ratio": KPIDefinition(
        display_name  = "Asset Turnover Ratio",
        formula_str   = "Revenue / Total Assets",
        dependencies  = (_is("revenue"), _bs("total_assets")),
        calculate     = lambda e: (
            _cur(e, "income_statement", "revenue") /
            _cur(e, "balance_sheet", "total_assets")
        ),
    ),

    "degree_of_operating_leverage": KPIDefinition(
        display_name  = "Degree of Operating Leverage",
        formula_str   = "(Revenue - COGS - Operating Expenses) / Operating Income",
        dependencies  = (
            _is("revenue"),
            _is("cost_of_goods_sold"),
            _is("operating_expenses"),
            _is("operating_income"),
        ),
        calculate     = lambda e: (
            (
                _cur(e, "income_statement", "revenue")
                - _cur(e, "income_statement", "cost_of_goods_sold")
                - _cur(e, "income_statement", "operating_expenses")
            ) /
            _cur(e, "income_statement", "operating_income")
        ),
    ),

    "cogs_to_revenue_yoy_change": KPIDefinition(
        display_name  = "COGS to Revenue YoY Change",
        formula_str   = "(Current COGS/Revenue - Prior COGS/Revenue) / Prior COGS/Revenue",
        dependencies  = (_is("cost_of_goods_sold"), _is("revenue")),
        calculate     = lambda e: _cogs_rev_yoy(e),
    ),

    "revenue_growth_rate": KPIDefinition(
        display_name  = "Revenue Growth Rate",
        formula_str   = "(Current Revenue - Prior Year Revenue) / Prior Year Revenue",
        dependencies  = (_is("revenue"),),
        calculate     = lambda e: (
            (_cur(e, "income_statement", "revenue") - _prior(e, "income_statement", "revenue")) /
            _prior(e, "income_statement", "revenue")
        ),
    ),

    "operating_expense_ratio_yoy_change": KPIDefinition(
        display_name  = "Operating Expense Ratio YoY Change",
        formula_str   = "(Current OpEx/Revenue - Prior OpEx/Revenue) / Prior OpEx/Revenue",
        dependencies  = (_is("operating_expenses"), _is("revenue")),
        calculate     = lambda e: _opex_ratio_yoy(e),
    ),
}

# Display-name → catalog key (for callers who pass the human-readable name)
_DISPLAY_NAME_MAP: dict[str, str] = {
    v.display_name: k for k, v in KPI_CATALOG.items()
}


# ---------------------------------------------------------------------------
# Multi-step formula helpers (too complex for a single lambda)
# ---------------------------------------------------------------------------

def _de_yoy(e: dict) -> float:
    """Debt-to-Equity YoY Change = (current D/E - prior D/E) / prior D/E"""
    cur_de  = _cur(e, "balance_sheet", "total_debt")   / _cur(e, "balance_sheet", "total_equity")
    prior_de = _prior(e, "balance_sheet", "total_debt") / _prior(e, "balance_sheet", "total_equity")
    return (cur_de - prior_de) / prior_de


def _cogs_rev_yoy(e: dict) -> float:
    """COGS to Revenue YoY Change = (current ratio - prior ratio) / prior ratio"""
    cur_ratio   = _cur(e, "income_statement", "cost_of_goods_sold")   / _cur(e, "income_statement", "revenue")
    prior_ratio = _prior(e, "income_statement", "cost_of_goods_sold") / _prior(e, "income_statement", "revenue")
    return (cur_ratio - prior_ratio) / prior_ratio


def _opex_ratio_yoy(e: dict) -> float:
    """Operating Expense Ratio YoY Change = (current ratio - prior ratio) / prior ratio"""
    cur_ratio   = _cur(e, "income_statement", "operating_expenses")   / _cur(e, "income_statement", "revenue")
    prior_ratio = _prior(e, "income_statement", "operating_expenses") / _prior(e, "income_statement", "revenue")
    return (cur_ratio - prior_ratio) / prior_ratio


# ---------------------------------------------------------------------------
# Additional guard: None values that slipped through (defensive)
# ---------------------------------------------------------------------------

def _missing_values(extraction: dict, defn: KPIDefinition, needs_prior: bool) -> list[str]:
    """
    Return a list of 'section.field [current|prior]' strings for any value
    that is None even though the item's status is 'clean'.
    These are caught as errors after the blocked check.
    """
    missing = []
    for dep in defn.dependencies:
        if _cur(extraction, dep.section, dep.field) is None:
            missing.append(f"{dep.key()} [current_value is None]")
    if needs_prior:
        for dep in defn.dependencies:
            if _prior(extraction, dep.section, dep.field) is None:
                missing.append(f"{dep.key()} [prior_year_value is None]")
    return missing


# KPIs that require prior-year values
_PRIOR_YEAR_KPIS = {
    "debt_to_equity_yoy_change",
    "cogs_to_revenue_yoy_change",
    "revenue_growth_rate",
    "operating_expense_ratio_yoy_change",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_kpi(kpi_name: str, extraction_result: dict) -> dict:
    """
    Calculate a single KPI from a run_triage() extraction result.

    Args:
        kpi_name:          KPI identifier — either the snake_case catalog key
                           (e.g. "current_ratio") or the display name
                           (e.g. "Current Ratio").
        extraction_result: The dict returned by run_triage().

    Returns:
        {
            "kpi_name":      str   — normalised display name,
            "status":        str   — "calculated" | "blocked" | "error" | "unknown_kpi",
            "value":         float | None  — rounded to 4 dp when calculated,
            "blocked_by":    list[str]     — "section.field" for each flagged dependency,
            "error_message": str | None,
        }
    """
    # --- Resolve KPI definition -------------------------------------------------
    key = kpi_name if kpi_name in KPI_CATALOG else _DISPLAY_NAME_MAP.get(kpi_name)
    if key is None:
        return _result(
            kpi_name,
            status="unknown_kpi",
            error_message=(
                f"'{kpi_name}' is not in the KPI catalog. "
                f"Valid keys: {sorted(KPI_CATALOG.keys())}"
            ),
        )

    defn = KPI_CATALOG[key]
    needs_prior = key in _PRIOR_YEAR_KPIS

    # --- Check for flagged dependencies ----------------------------------------
    blocked_by = [
        dep.key()
        for dep in defn.dependencies
        if _flagged(extraction_result, dep.section, dep.field)
    ]
    if blocked_by:
        return _result(defn.display_name, status="blocked", blocked_by=blocked_by)

    # --- Defensive None check (item clean but value unexpectedly missing) -------
    missing = _missing_values(extraction_result, defn, needs_prior)
    if missing:
        return _result(
            defn.display_name,
            status="error",
            error_message=(
                "One or more required values are None despite a 'clean' status — "
                f"possible extraction issue: {missing}"
            ),
        )

    # --- Calculate --------------------------------------------------------------
    try:
        raw = defn.calculate(extraction_result)
    except ZeroDivisionError:
        return _result(
            defn.display_name,
            status="error",
            error_message=_zero_division_message(key, extraction_result),
        )
    except TypeError as exc:
        # Catches arithmetic on None that wasn't caught above
        return _result(
            defn.display_name,
            status="error",
            error_message=f"Unexpected None during calculation: {exc}",
        )

    return _result(defn.display_name, status="calculated", value=round(raw, 2))


# ---------------------------------------------------------------------------
# Human-readable zero-division messages
# ---------------------------------------------------------------------------

def _zero_division_message(key: str, e: dict) -> str:
    messages = {
        "current_ratio": (
            f"Current Liabilities is zero "
            f"(value: {_cur(e, 'balance_sheet', 'current_liabilities')})"
        ),
        "quick_ratio": (
            f"Current Liabilities is zero "
            f"(value: {_cur(e, 'balance_sheet', 'current_liabilities')})"
        ),
        "debt_to_equity_ratio": (
            f"Total Equity is zero "
            f"(value: {_cur(e, 'balance_sheet', 'total_equity')})"
        ),
        "debt_to_asset_ratio": (
            f"Total Assets is zero "
            f"(value: {_cur(e, 'balance_sheet', 'total_assets')})"
        ),
        "debt_to_equity_yoy_change": (
            "Division by zero — either current or prior Total Equity is zero, "
            f"or prior D/E ratio is zero. "
            f"Prior equity: {_prior(e, 'balance_sheet', 'total_equity')}, "
            f"Prior debt: {_prior(e, 'balance_sheet', 'total_debt')}"
        ),
        "debt_service_coverage_ratio": (
            f"Total Debt Service is zero "
            f"(value: {_cur(e, 'cash_flow', 'total_debt_service')})"
        ),
        "return_on_assets": (
            f"Total Assets is zero "
            f"(value: {_cur(e, 'balance_sheet', 'total_assets')})"
        ),
        "asset_turnover_ratio": (
            f"Total Assets is zero "
            f"(value: {_cur(e, 'balance_sheet', 'total_assets')})"
        ),
        "degree_of_operating_leverage": (
            f"Operating Income is zero "
            f"(value: {_cur(e, 'income_statement', 'operating_income')})"
        ),
        "cogs_to_revenue_yoy_change": (
            "Division by zero — either current or prior Revenue is zero, "
            f"or the prior COGS/Revenue ratio is zero. "
            f"Prior revenue: {_prior(e, 'income_statement', 'revenue')}"
        ),
        "revenue_growth_rate": (
            f"Prior year Revenue is zero "
            f"(value: {_prior(e, 'income_statement', 'revenue')})"
        ),
        "operating_expense_ratio_yoy_change": (
            "Division by zero — either current or prior Revenue is zero, "
            f"or the prior OpEx/Revenue ratio is zero. "
            f"Prior revenue: {_prior(e, 'income_statement', 'revenue')}"
        ),
    }
    return messages.get(key, "Division by zero during KPI calculation.")


# ---------------------------------------------------------------------------
# Catalog accessor (for route handlers and tests)
# ---------------------------------------------------------------------------

def list_kpis() -> list[dict]:
    """Return a summary of every supported KPI — for the /api/kpis/catalog endpoint."""
    return [
        {
            "key":          k,
            "display_name": v.display_name,
            "formula":      v.formula_str,
            "requires_prior_year": k in _PRIOR_YEAR_KPIS,
            "dependencies": [dep.key() for dep in v.dependencies],
        }
        for k, v in KPI_CATALOG.items()
    ]
