import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { kpisApi } from "../services/api";

// Human-readable names for blocking items
const ITEM_LABELS = {
  "balance_sheet.current_assets":      "Current Assets",
  "balance_sheet.inventory":           "Inventory",
  "balance_sheet.current_liabilities": "Current Liabilities",
  "balance_sheet.total_assets":        "Total Assets",
  "balance_sheet.total_debt":          "Total Debt",
  "balance_sheet.total_equity":        "Total Equity",
  "income_statement.revenue":            "Revenue",
  "income_statement.cost_of_goods_sold": "Cost of Goods Sold",
  "income_statement.gross_profit":       "Gross Profit",
  "income_statement.operating_income":   "Operating Income",
  "income_statement.operating_expenses": "Operating Expenses",
  "income_statement.interest_expense":   "Interest Expense",
  "income_statement.net_income":         "Net Income",
  "cash_flow.operating_cash_flow": "Operating Cash Flow",
  "cash_flow.total_debt_service":  "Total Debt Service",
};

export default function KPIPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;
  if (!state?.extraction) {
    navigate("/", { replace: true });
    return null;
  }

  const { company, extraction, rawExtraction, overrides } = state;

  const [catalog, setCatalog]         = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [selected, setSelected]       = useState({});   // key -> bool
  const [results, setResults]         = useState({});   // key -> result object
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError]     = useState(null);

  useEffect(() => {
    kpisApi.catalog()
      .then(({ data }) => setCatalog(data))
      .catch(() => setCatalogError("Failed to load the KPI catalog."));
  }, []);

  const toggleKpi = (key) => {
    if (calculating) return;
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
    // Clear any prior result for this KPI when re-toggling
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const selectedKeys = catalog.filter((k) => selected[k.key]).map((k) => k.key);

  const handleCalculate = async () => {
    if (selectedKeys.length === 0) return;
    setCalculating(true);
    setCalcError(null);

    // Clear previous results for selected KPIs and mark as loading
    setResults((prev) => {
      const next = { ...prev };
      selectedKeys.forEach((k) => (next[k] = { status: "loading" }));
      return next;
    });

    // Fire all requests in parallel — update state as each resolves
    await Promise.all(
      selectedKeys.map(async (key) => {
        try {
          const { data } = await kpisApi.calculate(key, extraction);
          setResults((prev) => ({ ...prev, [key]: data }));
        } catch (err) {
          setResults((prev) => ({
            ...prev,
            [key]: {
              status: "error",
              kpi_name: key,
              error_message:
                err.response?.data?.detail || "Network error — please retry.",
            },
          }));
        }
      })
    );

    setCalculating(false);
  };

  // ── Result card ──────────────────────────────────────────────────────────

  const ResultCard = ({ kpiKey, result, formula }) => {
    const statusClass =
      result.status === "calculated" ? "kpi-result--calculated" :
      result.status === "blocked"    ? "kpi-result--blocked"    :
      result.status === "error"      ? "kpi-result--error"      :
      result.status === "loading"    ? "kpi-result--loading"    : "";

    return (
      <div className={`kpi-result ${statusClass}`}>
        <div className="kpi-result__name">{result.kpi_name || kpiKey}</div>

        {result.status === "loading" && (
          <div style={{ marginTop: 10 }}>
            <span className="mini-spinner" />
          </div>
        )}

        {result.status === "calculated" && (
          <>
            <div className="kpi-result__value">{Number(result.value).toFixed(2)}</div>
            <div className="kpi-result__formula">{formula}</div>
          </>
        )}

        {result.status === "blocked" && (
          <>
            <div style={{ marginBottom: 8 }}>
              <span className="badge badge--blocked">Blocked</span>
            </div>
            <div className="kpi-result__blocked-title">
              Flagged inputs blocking this KPI:
            </div>
            {result.blocked_by?.map((item) => (
              <div key={item} className="kpi-result__blocked-item">
                · {ITEM_LABELS[item] || item}
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <button
                className="btn btn--danger btn--sm"
                onClick={() =>
                  navigate("/triage", { state: { company, extraction: rawExtraction ?? extraction, overrides } })
                }
              >
                ← Resolve in Review
              </button>
            </div>
          </>
        )}

        {(result.status === "error" || result.status === "unknown_kpi") && (
          <div className="kpi-result__error">{result.error_message}</div>
        )}
      </div>
    );
  };

  // KPIs that have results to show (ordered by catalog sequence)
  const resultKeys = catalog
    .map((k) => k.key)
    .filter((k) => results[k]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <nav className="navbar">
        <div className="navbar__left">
          <span className="navbar__brand">KPI<span>-AI</span></span>
        </div>
        <div className="nav-steps">
          <div className="nav-step nav-step--done">
            <span className="nav-step__num">✓</span> Select Company
          </div>
          <span className="nav-divider">›</span>
          <div className="nav-step nav-step--done">
            <span className="nav-step__num">✓</span> Review & Verify
          </div>
          <span className="nav-divider">›</span>
          <div className="nav-step nav-step--active">
            <span className="nav-step__num">3</span> KPI Calculation
          </div>
        </div>
        <div className="navbar__right">
          <button
            className="navbar__tutorial-btn"
            onClick={() => {
              localStorage.removeItem("kpiai_tutorial_done");
              localStorage.removeItem("kpiai_tutorial_step");
              window.location.href = "/";
            }}
            title="Replay tutorial from the beginning"
          >
            View Tutorial
          </button>
        </div>
      </nav>

      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">{company.display_name}</div>
            <div className="page-subtitle">Select KPIs to calculate</div>
          </div>
          <button
            className="back-link"
            onClick={() => navigate("/triage", { state: { company, extraction: rawExtraction ?? extraction, overrides } })}
          >
            ← Back to Review
          </button>
        </div>

        {extraction.meta?.source === "placeholder" && (
          <div className="alert alert--info">
            Running on placeholder data — all KPIs will be blocked until a real
            extraction is run with a valid API key.
          </div>
        )}

        {catalogError && (
          <div className="alert alert--error">{catalogError}</div>
        )}

        {calcError && (
          <div className="alert alert--error">{calcError}</div>
        )}

        {/* KPI selector */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">Available KPIs</span>
            <span className="text-sm text-muted">
              {selectedKeys.length > 0
                ? `${selectedKeys.length} selected`
                : "Select one or more to calculate"}
            </span>
          </div>
          <div className="card-body">
            {catalog.length === 0 && !catalogError && (
              <div className="text-muted text-sm">Loading KPI catalog…</div>
            )}
            <div className="kpi-grid">
              {catalog.map((kpi) => (
                <button
                  key={kpi.key}
                  className={`kpi-toggle${selected[kpi.key] ? " kpi-toggle--selected" : ""}`}
                  onClick={() => toggleKpi(kpi.key)}
                  disabled={calculating}
                >
                  <span className="kpi-toggle__check">
                    {selected[kpi.key] ? "✓" : ""}
                  </span>
                  <div className="kpi-toggle__name">{kpi.display_name}</div>
                  <div className="kpi-toggle__formula">{kpi.formula}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="btn btn--primary"
                onClick={handleCalculate}
                disabled={selectedKeys.length === 0 || calculating}
              >
                {calculating ? "Calculating…" : selectedKeys.length > 0 ? `Calculate (${selectedKeys.length})` : "Calculate"}
              </button>
              {selectedKeys.length > 0 && !calculating && (
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => { setSelected({}); setResults({}); }}
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {resultKeys.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Results</span>
              <span className="text-sm text-muted">
                {resultKeys.filter((k) => results[k]?.status === "calculated").length} calculated
                {" · "}
                {resultKeys.filter((k) => results[k]?.status === "blocked").length} blocked
                {resultKeys.filter((k) => results[k]?.status === "error").length > 0
                  ? ` · ${resultKeys.filter((k) => results[k]?.status === "error").length} error`
                  : ""}
              </span>
            </div>
            <div className="card-body">
              <div className="results-grid">
                {resultKeys.map((key) => {
                  const kpi = catalog.find((k) => k.key === key);
                  return (
                    <ResultCard
                      key={key}
                      kpiKey={key}
                      result={results[key]}
                      formula={kpi?.formula}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
