import React, { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ── Section / field metadata ────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "balance_sheet",
    label: "Balance Sheet",
    fields: [
      "current_assets",
      "inventory",
      "current_liabilities",
      "total_assets",
      "total_debt",
      "total_equity",
    ],
  },
  {
    key: "income_statement",
    label: "Income Statement",
    fields: [
      "revenue",
      "cost_of_goods_sold",
      "operating_income",
      "operating_expenses",
      "interest_expense",
      "net_income",
    ],
  },
  {
    key: "cash_flow",
    label: "Cash Flow Statement",
    fields: ["operating_cash_flow", "total_debt_service"],
  },
];

const FIELD_LABELS = {
  current_assets:      "Current Assets",
  inventory:           "Inventory",
  current_liabilities: "Current Liabilities",
  total_assets:        "Total Assets",
  total_debt:          "Total Debt",
  total_equity:        "Total Equity",
  revenue:             "Revenue",
  cost_of_goods_sold:  "Cost of Goods Sold",
  operating_income:    "Operating Income",
  operating_expenses:  "Operating Expenses",
  interest_expense:    "Interest Expense",
  net_income:          "Net Income",
  operating_cash_flow: "Operating Cash Flow",
  total_debt_service:  "Total Debt Service",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const parseYear = (fye) => {
  if (!fye) return null;
  const m = fye.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
};

const totalItems = SECTIONS.reduce((n, { fields }) => n + fields.length, 0);

const normalizeUnit = (unit) => {
  if (!unit) return unit;
  return unit.charAt(0).toUpperCase() + unit.slice(1);
};

// ── Component ────────────────────────────────────────────────────────────────

export default function TriagePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;
  if (!state?.extraction) {
    navigate("/", { replace: true });
    return null;
  }

  const { company, extraction } = state;
  const { meta } = extraction;

  const currentYear = parseYear(meta.fiscal_year_end);
  const priorYear   = currentYear ? currentYear - 1 : null;

  // overrides[`${section}.${field}`] = { current?: string, prior?: string, verified?: bool }
  // Re-hydrate from router state when navigating back from KPI page
  const [overrides, setOverrides]       = useState(state?.overrides ?? {});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [editingCell, setEditingCell]   = useState(null); // `${section}.${field}.${year}`

  // ── Override helpers ────────────────────────────────────────────────────

  const setFieldOverride = useCallback((section, field, year, value) => {
    const key = `${section}.${field}`;
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [year]: value },
    }));
  }, []);

  const toggleVerified = useCallback((section, field) => {
    const key = `${section}.${field}`;
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), verified: true },
    }));
  }, []);

  const toggleAccepted = useCallback((section, field) => {
    const key = `${section}.${field}`;
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), accepted: true },
    }));
  }, []);

  const toggleExpand = useCallback((key) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Verify all Complete items across every section
  const verifyAllComplete = useCallback(() => {
    setOverrides((prev) => {
      const next = { ...prev };
      SECTIONS.forEach(({ key: section, fields }) => {
        fields.forEach((field) => {
          const item = extraction[section]?.[field];
          if (!item || item.status !== "clean") return;
          const k = `${section}.${field}`;
          next[k] = { ...(next[k] || {}), verified: true };
        });
      });
      return next;
    });
  }, [extraction]);

  // Verify all Complete items within one section
  const verifySectionComplete = useCallback((sectionKey, fields) => {
    setOverrides((prev) => {
      const next = { ...prev };
      fields.forEach((field) => {
        const item = extraction[sectionKey]?.[field];
        if (!item || item.status !== "clean") return;
        const k = `${sectionKey}.${field}`;
        next[k] = { ...(next[k] || {}), verified: true };
      });
      return next;
    });
  }, [extraction]);

  // ── Status computation ──────────────────────────────────────────────────
  //   needs_review      — flagged by extraction, no value entered yet
  //   complete          — extracted cleanly, not yet explicitly verified
  //   manually_adjusted — flagged, but CAM has entered a value (auto-verified)
  //   verified          — clean extraction explicitly signed off via checkbox

  const getStatus = (section, field) => {
    const item = extraction[section]?.[field];
    const ov   = overrides[`${section}.${field}`];

    if (!item || item.status === "clean") {
      return ov?.verified ? "verified" : "complete";
    }

    // flagged item — accepted, or transitions to manually_adjusted as soon as any value entered
    if (ov?.accepted) return "accepted";
    const hasValue =
      (ov?.current !== undefined && ov.current !== "") ||
      (ov?.prior   !== undefined && ov.prior   !== "");
    return hasValue ? "manually_adjusted" : "needs_review";
  };

  const getInputVal = (section, field, year) => {
    const key = `${section}.${field}`;
    const ov  = overrides[key];
    if (ov && ov[year] !== undefined) return ov[year];
    const item = extraction[section]?.[field];
    const v    = year === "current" ? item?.current_value : item?.prior_year_value;
    return v !== null && v !== undefined ? String(v) : "";
  };

  const isDirty = (section, field, year) => {
    const ov = overrides[`${section}.${field}`];
    if (!ov || ov[year] === undefined) return false;
    const item = extraction[section]?.[field];
    const orig = year === "current" ? item?.current_value : item?.prior_year_value;
    return ov[year] !== "" && ov[year] !== String(orig ?? "");
  };

  // ── Counts ──────────────────────────────────────────────────────────────

  const flagStats = (() => {
    let total = 0, resolved = 0;
    SECTIONS.forEach(({ key, fields }) =>
      fields.forEach((field) => {
        const item = extraction[key]?.[field];
        if (item?.status === "flagged") {
          total++;
          const s = getStatus(key, field);
          if (s === "manually_adjusted" || s === "accepted") resolved++;
        }
      })
    );
    return { total, resolved, remaining: total - resolved };
  })();

  const completeCount = SECTIONS.reduce(
    (n, { key, fields }) =>
      n + fields.filter((f) => getStatus(key, f) === "complete").length,
    0
  );

  // Items that block proceeding (needs_review or complete-but-unverified)
  const unresolvedCount = SECTIONS.reduce(
    (n, { key, fields }) =>
      n + fields.filter((f) => {
        const s = getStatus(key, f);
        return s === "needs_review" || s === "complete";
      }).length,
    0
  );

  // ── Build resolved extraction ───────────────────────────────────────────

  const buildResolved = () => {
    const resolved = JSON.parse(JSON.stringify(extraction));
    SECTIONS.forEach(({ key: section, fields }) => {
      fields.forEach((field) => {
        const ov   = overrides[`${section}.${field}`];
        const item = resolved[section]?.[field];
        if (!item) return;

        const status = getStatus(section, field);

        if (status === "manually_adjusted") {
          if (ov?.current !== undefined && ov.current !== "") {
            const v = parseFloat(ov.current);
            if (!isNaN(v)) item.current_value = v;
          }
          if (ov?.prior !== undefined && ov.prior !== "") {
            const v = parseFloat(ov.prior);
            if (!isNaN(v)) item.prior_year_value = v;
          }
          item.status = "clean";
        } else if (status === "accepted" || status === "verified" || status === "complete") {
          // accepted: use Claude's original extracted value as-is
          item.status = "clean";
        }
        // needs_review stays flagged → blocks dependent KPIs
      });
    });
    return resolved;
  };

  const handleProceed = () => {
    navigate("/kpis", {
      state: {
        company,
        extraction:    buildResolved(), // resolved values for KPI calculation
        rawExtraction: extraction,       // original extraction — returned on Back to Review
        overrides,                       // CAM edits — restored on Back to Review
      },
    });
  };

  // ── Status badge ────────────────────────────────────────────────────────

  const StatusBadge = ({ status }) => {
    const map = {
      needs_review:      { cls: "badge--needs-review",      label: "Needs Review"      },
      accepted:          { cls: "badge--accepted",           label: "Accepted"          },
      complete:          { cls: "badge--complete",           label: "Complete"          },
      manually_adjusted: { cls: "badge--manually-adjusted",  label: "Manually Adjusted" },
      verified:          { cls: "badge--verified",           label: "✓ Verified"        },
    };
    const { cls, label } = map[status] || map.complete;
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  // ── Render ──────────────────────────────────────────────────────────────

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
          <div className="nav-step nav-step--active">
            <span className="nav-step__num">2</span> Review & Verify
          </div>
          <span className="nav-divider">›</span>
          <div className="nav-step">
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
        {/* Page header */}
        <div className="page-header">
          <div>
            <div className="page-title">{company.display_name}</div>
            <div className="page-subtitle">{company.sector}</div>
          </div>
          <button className="back-link" onClick={() => navigate("/")}>
            ← Back to Companies
          </button>
        </div>

        {/* Meta bar */}
        <div className="meta-bar">
          <div className="meta-item">
            <div className="meta-item__label">Company</div>
            <div className="meta-item__value">{company.display_name}</div>
          </div>
          <div className="meta-item">
            <div className="meta-item__label">Sector</div>
            <div className="meta-item__value">{company.sector}</div>
          </div>
          <div className="meta-item">
            <div className="meta-item__label">Fiscal Year End</div>
            <div className="meta-item__value">{meta.fiscal_year_end || "—"}</div>
          </div>
          {meta.reporting_currency && (
            <div className="meta-item">
              <div className="meta-item__label">Currency</div>
              <div className="meta-item__value">{meta.reporting_currency}</div>
            </div>
          )}
          {meta.reporting_unit && (
            <div className="meta-item">
              <div className="meta-item__label">Unit</div>
              <div className="meta-item__value">{normalizeUnit(meta.reporting_unit)}</div>
            </div>
          )}
        </div>

        {/* Placeholder banner */}
        {meta.source === "placeholder" && (
          <div className="alert alert--info">
            API key not configured — showing placeholder data. Set{" "}
            <code>ANTHROPIC_API_KEY</code> in <code>backend/.env</code> to run
            a real extraction.
          </div>
        )}

        {/* Flag summary bar */}
        {flagStats.total > 0 && (
          <div className={`flag-bar${flagStats.remaining === 0 ? " flag-bar--resolved" : ""}`}>
            <span className="flag-bar__label">
              {flagStats.remaining === 0
                ? `All ${flagStats.total} flagged items resolved`
                : `${flagStats.remaining} of ${flagStats.total} flagged item${flagStats.total !== 1 ? "s" : ""} need review`}
            </span>
            <span className="flag-bar__detail">
              {flagStats.remaining > 0
                ? "Enter corrected values for all flagged items before proceeding."
                : "You may proceed to KPI calculation."}
            </span>
          </div>
        )}

        {/* Statement sections */}
        {SECTIONS.map(({ key: section, label, fields }) => {
          const sectionNeedsReview = fields.filter(
            (f) => getStatus(section, f) === "needs_review"
          ).length;
          const sectionCompleteCount = fields.filter(
            (f) => getStatus(section, f) === "complete"
          ).length;

          return (
            <div key={section} className="card">
              <div className="card-header">
                <span className="card-title">{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {sectionCompleteCount > 0 && (
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => verifySectionComplete(section, fields)}
                    >
                      Verify all ({sectionCompleteCount})
                    </button>
                  )}
                  {sectionNeedsReview > 0 ? (
                    <span className="text-sm text-muted">
                      {sectionNeedsReview} need{sectionNeedsReview !== 1 ? "" : "s"} review
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 400, color: "var(--success)" }}>
                      All items complete
                    </span>
                  )}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="triage-table">
                  <thead>
                    <tr>
                      <th style={{ width: "20%" }}>Line Item</th>
                      <th className="col-num" style={{ width: "15%" }}>
                        Current Value
                        {meta.reporting_unit && (
                          <div className="col-unit">{normalizeUnit(meta.reporting_unit)}</div>
                        )}
                      </th>
                      <th className="col-num" style={{ width: "15%" }}>
                        Prior Value
                        {meta.reporting_unit && (
                          <div className="col-unit">{normalizeUnit(meta.reporting_unit)}</div>
                        )}
                      </th>
                      <th style={{ width: "35%" }} data-tutorial="status-col">Status</th>
                      <th className="col-verify" style={{ width: "15%" }}>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => {
                      const item       = extraction[section]?.[field] || {};
                      const status     = getStatus(section, field);
                      const rowKey     = `${section}.${field}`;
                      const isExpanded = expandedRows.has(rowKey);

                      const rowCls = [
                        "triage-row",
                        status === "needs_review"      ? "triage-row--needs-review"      : "",
                        status === "accepted"          ? "triage-row--accepted"          : "",
                        status === "manually_adjusted" ? "triage-row--manually-adjusted" : "",
                        status === "verified"          ? "triage-row--verified"          : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <React.Fragment key={field}>
                          <tr className={rowCls}>
                            {/* Line item — expand chevron + status indicator */}
                            <td>
                              <div className="row-item-cell">
                                <button
                                  className={`expand-btn${isExpanded ? " expand-btn--open" : ""}`}
                                  onClick={() => toggleExpand(rowKey)}
                                  title="Show source details"
                                >
                                  ›
                                </button>
                                <div className="row-canonical">
                                  {status === "needs_review" && (
                                    <span className="warn-icon" title="This item needs review">⚠</span>
                                  )}
                                  {status === "manually_adjusted" && (
                                    <span className="edit-icon" title="Value manually adjusted">✎</span>
                                  )}
                                  {FIELD_LABELS[field]}
                                </div>
                              </div>
                            </td>

                            {/* Current year value */}
                            <td className="col-num">
                              {(() => {
                                const cellKey = `${section}.${field}.current`;
                                const isEditing = editingCell === cellKey;
                                const val   = getInputVal(section, field, "current");
                                const dirty = isDirty(section, field, "current");
                                const num   = val !== "" ? parseFloat(val) : NaN;
                                const hasValue = !isNaN(num);
                                if (isEditing) {
                                  return (
                                    <div className="val-cell">
                                      <span className="val-currency">CAD</span>
                                      <input
                                        autoFocus
                                        type="number"
                                        step="any"
                                        className={`override-input${dirty ? " override-input--dirty" : ""}`}
                                        value={val}
                                        onChange={(e) => setFieldOverride(section, field, "current", e.target.value)}
                                        onBlur={() => setEditingCell(null)}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="val-cell" onClick={() => setEditingCell(cellKey)}>
                                    <span className="val-currency">CAD</span>
                                    <span className={`val-display${!hasValue ? " val-display--empty" : ""}${dirty ? " val-display--dirty" : ""}`}>
                                      {hasValue ? `$${num.toLocaleString("en-CA")}` : "—"}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Prior year value */}
                            <td className="col-num">
                              {(() => {
                                const cellKey = `${section}.${field}.prior`;
                                const isEditing = editingCell === cellKey;
                                const val   = getInputVal(section, field, "prior");
                                const dirty = isDirty(section, field, "prior");
                                const num   = val !== "" ? parseFloat(val) : NaN;
                                const hasValue = !isNaN(num);
                                if (isEditing) {
                                  return (
                                    <div className="val-cell">
                                      <span className="val-currency">CAD</span>
                                      <input
                                        autoFocus
                                        type="number"
                                        step="any"
                                        className={`override-input${dirty ? " override-input--dirty" : ""}`}
                                        value={val}
                                        onChange={(e) => setFieldOverride(section, field, "prior", e.target.value)}
                                        onBlur={() => setEditingCell(null)}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="val-cell" onClick={() => setEditingCell(cellKey)}>
                                    <span className="val-currency">CAD</span>
                                    <span className={`val-display${!hasValue ? " val-display--empty" : ""}${dirty ? " val-display--dirty" : ""}`}>
                                      {hasValue ? `$${num.toLocaleString("en-CA")}` : "—"}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Status */}
                            <td>
                              <StatusBadge status={status} />
                              {(status === "needs_review" || status === "accepted") && item.flag_reason && (
                                <div className="flag-reason-text">{item.flag_reason}</div>
                              )}
                            </td>

                            {/* Verification */}
                            <td className="col-verify">
                              {status === "needs_review" ? (
                                <input
                                  type="checkbox"
                                  className="verify-checkbox"
                                  checked={false}
                                  onChange={() => toggleAccepted(section, field)}
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  className="verify-checkbox"
                                  checked={status === "verified" || status === "manually_adjusted" || status === "accepted"}
                                  disabled={status !== "complete"}
                                  onChange={status === "complete" ? () => toggleVerified(section, field) : undefined}
                                />
                              )}
                            </td>
                          </tr>

                          {/* Expandable source detail row */}
                          {isExpanded && (
                            <tr className="triage-row-detail">
                              <td colSpan={5}>
                                <div className="triage-detail">
                                  <div className="triage-detail__item">
                                    <span className="triage-detail__label">Document Label</span>
                                    <span className="triage-detail__value">
                                      {item.source_label &&
                                      item.source_label !== "PLACEHOLDER — API key not set"
                                        ? item.source_label
                                        : "—"}
                                    </span>
                                  </div>
                                  <div className="triage-detail__item">
                                    <span className="triage-detail__label">Page Number</span>
                                    <span className="triage-detail__value">
                                      {item.page_number ?? "—"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div style={{ height: 20 }} />
      </div>

      {/* Sticky footer */}
      <div className="page-actions">
        <div className="page-actions__left">
          {unresolvedCount > 0 ? (
            <span style={{ color: "var(--warn)" }}>
              {completeCount > 0 && flagStats.remaining === 0
                ? `${completeCount} item${completeCount !== 1 ? "s" : ""} need verification — check the boxes before proceeding`
                : `${unresolvedCount} item${unresolvedCount !== 1 ? "s" : ""} need${unresolvedCount === 1 ? "s" : ""} attention — resolve all flagged items and verify before proceeding`}
            </span>
          ) : (
            <span style={{ color: "var(--success)" }}>
              {flagStats.total > 0 ? "All flagged items resolved" : `All ${totalItems} items ready`} — ready to proceed
            </span>
          )}
        </div>
        <button
          className="btn btn--primary"
          onClick={handleProceed}
          disabled={unresolvedCount > 0}
        >
          Proceed to KPI Selection →
        </button>
      </div>
    </>
  );
}
