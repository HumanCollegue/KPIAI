import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { companiesApi, triageApi, displayNamesApi } from "../services/api";

// Consistent sector ordering
const SECTOR_ORDER = [
  "Retail & Consumer",
  "Energy & Resources",
  "Industrials, Transport & Utilities",
  "Healthcare",
  "Telecom & Media",
];

export default function CompanySelectPage() {
  const navigate = useNavigate();

  const [companies, setCompanies]       = useState([]);
  const [fetchError, setFetchError]     = useState(null);
  const [search, setSearch]             = useState("");
  const [activeCompany, setActive]      = useState(null);
  const [triageError, setTriageError]   = useState(null);

  // Display name state — keyed by legal_name (company.display_name from API)
  const [displayNames, setDisplayNames] = useState({});   // legal_name -> custom_name
  const [editingKey, setEditingKey]     = useState(null); // pdf_filename of row in edit mode
  const [editValue, setEditValue]       = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState(null);
  const [showLegal, setShowLegal]       = useState(new Set()); // pdf_filenames showing legal name

  useEffect(() => {
    companiesApi.list()
      .then(({ data }) => setCompanies(data))
      .catch(() => setFetchError("Could not load the company list. Make sure the backend is running."));
    displayNamesApi.list()
      .then(({ data }) => setDisplayNames(data))
      .catch(() => {}); // non-fatal — fall back to legal names
  }, []);

  // Resolve effective display name for a company
  const effectiveName = useCallback(
    (company) => displayNames[company.display_name] || company.display_name,
    [displayNames],
  );

  // Filter + group — matches on both custom name and legal name
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? companies.filter((c) =>
          effectiveName(c).toLowerCase().includes(q) ||
          c.display_name.toLowerCase().includes(q)
        )
      : companies;

    const map = {};
    filtered.forEach((c) => {
      map[c.sector] = map[c.sector] || [];
      map[c.sector].push(c);
    });
    return map;
  }, [companies, search, effectiveName]);

  const sectors    = SECTOR_ORDER.filter((s) => grouped[s]);
  const totalShown = sectors.reduce((n, s) => n + grouped[s].length, 0);

  const handleSelect = async (company) => {
    if (activeCompany || editingKey) return;
    setTriageError(null);
    // Inject the resolved display name so downstream pages show the custom name
    const enriched = { ...company, display_name: effectiveName(company) };
    setActive(enriched);
    try {
      const { data: extraction } = await triageApi.run(company.pdf_filename);
      navigate("/triage", { state: { company: enriched, extraction } });
    } catch (err) {
      setActive(null);
      setTriageError(
        err.response?.data?.detail ||
          `Analysis failed for ${effectiveName(company)}. Please try again.`
      );
    }
  };

  // ── Inline edit handlers ──────────────────────────────────────────────────

  const openEdit = (e, company) => {
    e.stopPropagation();
    setEditingKey(company.pdf_filename);
    setEditValue(effectiveName(company));
    setEditError(null);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingKey(null);
    setEditValue("");
    setEditError(null);
  };

  const saveEdit = async (e, company) => {
    e.stopPropagation();
    if (editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const { data } = await displayNamesApi.set(company.display_name, editValue);
      setDisplayNames(data);
      setEditingKey(null);
      setEditValue("");
    } catch {
      setEditError("Save failed — please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleLegal = (e, company) => {
    e.stopPropagation();
    setShowLegal((prev) => {
      const next = new Set(prev);
      next.has(company.pdf_filename) ? next.delete(company.pdf_filename) : next.add(company.pdf_filename);
      return next;
    });
  };

  const hasCustomName = (company) =>
    !!displayNames[company.display_name] &&
    displayNames[company.display_name] !== company.display_name;

  return (
    <>
      {/* Loading overlay while triage runs */}
      {activeCompany && (
        <div className="overlay">
          <div className="overlay__box">
            <div className="spinner" />
            <div className="overlay__title">Analyzing financial statements…</div>
            <div className="overlay__sub">{activeCompany.display_name}</div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar__brand">KPI<span>-AI</span></span>
        <div className="nav-steps">
          <div className="nav-step nav-step--active">
            <span className="nav-step__num">1</span> Select Company
          </div>
          <span className="nav-divider">›</span>
          <div className="nav-step">
            <span className="nav-step__num">2</span> Review & Verify
          </div>
          <span className="nav-divider">›</span>
          <div className="nav-step">
            <span className="nav-step__num">3</span> KPI Calculation
          </div>
        </div>
      </nav>

      <div className="page">
        <div className="company-select-header">
          <div className="page-title">Select a Company</div>
          <div className="page-subtitle">
            {companies.length > 0
              ? `Choose from ${companies.length} companies below to assess recent performance`
              : "Loading company list…"}
          </div>
        </div>

        {fetchError  && <div className="alert alert--error">{fetchError}</div>}
        {triageError && <div className="alert alert--error">{triageError}</div>}

        {/* Search */}
        {companies.length > 0 && (
          <div className="search-wrap">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Results count when filtering */}
        {search && (
          <div className="text-sm text-muted mt-8" style={{ marginBottom: 12 }}>
            {totalShown === 0
              ? "No companies match your search."
              : `${totalShown} result${totalShown !== 1 ? "s" : ""}`}
          </div>
        )}

        {/* Grouped company list */}
        {sectors.map((sector) => (
          <div key={sector} className="sector-block">
            <div className="sector-label">{sector}</div>
            <div className="company-list">
              {grouped[sector].map((company) => {
                const isEditing    = editingKey === company.pdf_filename;
                const isActive     = activeCompany?.pdf_filename === company.pdf_filename;
                const isCustom     = hasCustomName(company);
                const legalVisible = showLegal.has(company.pdf_filename);

                return (
                  <div
                    key={company.pdf_filename}
                    className={`company-row${isActive ? " company-row--active" : ""}`}
                    onClick={() => !isEditing && !activeCompany && handleSelect(company)}
                    style={{ cursor: isEditing ? "default" : activeCompany ? "wait" : "pointer" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name row */}
                      <div className="company-row__name-wrap">
                        {isCustom && <span className="company-row__custom-dot" title="Custom display name set" />}
                        <span className={`company-row__name${isCustom ? " company-row__name--custom" : ""}`}>
                          {effectiveName(company)}
                        </span>
                        {/* Pencil edit button */}
                        {!isEditing && (
                          <button
                            className="company-row__edit-btn"
                            onClick={(e) => openEdit(e, company)}
                            title="Edit display name"
                          >
                            ✎
                          </button>
                        )}
                        {/* Toggle legal name — only relevant when custom name is set */}
                        {isCustom && !isEditing && (
                          <button
                            className={`company-row__legal-toggle${legalVisible ? " company-row__legal-toggle--open" : ""}`}
                            onClick={(e) => toggleLegal(e, company)}
                            title="Show official filing name"
                          >
                            ›
                          </button>
                        )}
                      </div>

                      {/* Official filing name — visible when toggled */}
                      {isCustom && legalVisible && (
                        <div className="company-row__legal">
                          Official filing name: {company.display_name}
                        </div>
                      )}

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="inline-edit" onClick={(e) => e.stopPropagation()}>
                          <input
                            className="inline-edit__input"
                            type="text"
                            value={editValue}
                            autoFocus
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")  saveEdit(e, company);
                              if (e.key === "Escape") cancelEdit(e);
                            }}
                            placeholder={company.display_name}
                          />
                          <div className="inline-edit__actions">
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={(e) => saveEdit(e, company)}
                              disabled={editSaving || !editValue.trim()}
                            >
                              {editSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              className="btn btn--secondary btn--sm"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && (
                            <div className="inline-edit__error">{editError}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && <span className="company-row__chevron">›</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Page footer */}
        <div className="page-footer">
          <button
            className="page-footer__link"
            onClick={() => {
              localStorage.removeItem("kpiai_tutorial_done");
              localStorage.removeItem("kpiai_tutorial_step");
              window.location.reload();
            }}
          >
            Replay tutorial
          </button>
        </div>
      </div>
    </>
  );
}
