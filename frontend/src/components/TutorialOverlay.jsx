import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    page: "/",
    selector: null,
    content:
      "Welcome to KPI-AI. This platform automates the extraction and calculation of financial KPIs from audited annual financial statements. Select a company to begin.",
    position: "center",
  },
  {
    page: "/",
    selector: ".company-row",
    content:
      "Each company is listed by its legal filing name. Click the pencil icon to set a preferred display name — for example Empire Company Limited can be saved as Sobeys. This is stored for future sessions.",
    position: "bottom",
  },
  {
    page: "/triage",
    selector: null,
    content:
      "After selecting a company, KPI-AI reads the entire financial filing in a single pass and extracts all required line items automatically. No manual searching required.",
    position: "center",
  },
  {
    page: "/triage",
    selector: "[data-tutorial='status-col']",
    content:
      "Complete means the value was clearly labelled in the document and only needs a quick confirmation. Needs Review means Claude made an assumption or could not find a standard label — the detailed explanation tells you exactly what was found and why, so you can make an informed decision.",
    position: "bottom",
  },
  {
    page: "/triage",
    selector: ".val-display",
    content:
      "Every value is editable. Click any number to type a correction. The value will be used in all KPI calculations. You can also accept Claude's assumption as-is using the checkbox in the Verification column.",
    position: "bottom",
  },
  {
    page: "/triage",
    selector: ".page-actions .btn--primary",
    content:
      "Once all items are Accepted, Manually Adjusted, or Verified the Proceed button activates. The footer shows exactly what still needs attention.",
    position: "top",
  },
  {
    page: "/kpis",
    selector: ".kpi-grid",
    content:
      "Toggle one or as many KPIs as you need and click Calculate. You only calculate what is relevant to your review.",
    position: "bottom",
  },
  {
    page: "/kpis",
    selector: ".results-grid",
    content:
      "Each result card shows the calculated value and the formula used. That is it — your analysis is complete.",
    position: "top",
  },
];

// ── Tooltip positioning ──────────────────────────────────────────────────────

const TOOLTIP_W = 380;
const GAP       = 16;
const MARGIN    = 20;

function clampLeft(x) {
  return Math.max(MARGIN, Math.min(x, window.innerWidth - TOOLTIP_W - MARGIN));
}

// Returns inline style object for the tooltip card.
// Falls back to centered whenever rect is missing or has no area.
function getTooltipStyle(rect, position) {
  const centered = {
    position: "fixed",
    top:  "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: TOOLTIP_W,
    maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
    zIndex: 9002,
  };

  if (!rect || rect.width === 0 || rect.height === 0 || position === "center") {
    return centered;
  }

  const left = clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2);

  switch (position) {
    case "bottom": {
      const top = rect.bottom + GAP;
      // If card would go off-screen below, flip to top instead
      if (top + 200 > window.innerHeight) {
        const bottom = window.innerHeight - rect.top + GAP;
        if (bottom < 0) return centered;
        return { position: "fixed", bottom, left, width: TOOLTIP_W, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, zIndex: 9002 };
      }
      return { position: "fixed", top, left, width: TOOLTIP_W, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, zIndex: 9002 };
    }
    case "top": {
      const bottom = window.innerHeight - rect.top + GAP;
      if (bottom < 0 || bottom > window.innerHeight - 60) return centered;
      return { position: "fixed", bottom, left, width: TOOLTIP_W, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, zIndex: 9002 };
    }
    case "right": {
      const rightLeft = Math.min(rect.right + GAP, window.innerWidth - TOOLTIP_W - MARGIN);
      const top = Math.max(MARGIN, rect.top + rect.height / 2 - 90);
      return { position: "fixed", top, left: rightLeft, width: TOOLTIP_W, maxWidth: `calc(100vw - ${rect.right + GAP + MARGIN}px)`, zIndex: 9002 };
    }
    default:
      return centered;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TutorialOverlay() {
  const location = useLocation();

  const [stepIdx, setStepIdx] = useState(() => {
    if (localStorage.getItem("kpiai_tutorial_done") === "true") return -1;
    const saved = localStorage.getItem("kpiai_tutorial_step");
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [spotRect, setSpotRect] = useState(null);

  const step = stepIdx >= 0 && stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const onCorrectPage = step?.page === location.pathname;

  // Measure target element — small delay lets React finish painting
  useEffect(() => {
    if (!onCorrectPage || !step?.selector) {
      setSpotRect(null);
      return;
    }
    const id = setTimeout(() => {
      const el = document.querySelector(step.selector);
      setSpotRect(el ? el.getBoundingClientRect() : null);
    }, 80);
    return () => clearTimeout(id);
  }, [onCorrectPage, step?.selector, location.pathname]);

  const dismiss = useCallback(() => {
    localStorage.setItem("kpiai_tutorial_done", "true");
    localStorage.removeItem("kpiai_tutorial_step");
    setStepIdx(-1);
  }, []);

  // Escape key closes the tutorial
  useEffect(() => {
    if (!onCorrectPage) return;
    const handler = (e) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCorrectPage, dismiss]);

  const goNext = useCallback(() => {
    const next = stepIdx + 1;
    if (next >= STEPS.length) {
      dismiss();
    } else {
      localStorage.setItem("kpiai_tutorial_step", String(next));
      setStepIdx(next);
    }
  }, [stepIdx, dismiss]);

  const goPrev = useCallback(() => {
    if (stepIdx > 0) {
      const prev = stepIdx - 1;
      localStorage.setItem("kpiai_tutorial_step", String(prev));
      setStepIdx(prev);
    }
  }, [stepIdx]);

  if (!onCorrectPage) return null;

  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === STEPS.length - 1;

  // Use a valid rect only if it has real area (guards against hidden/zero-sized elements)
  const validRect = spotRect && spotRect.width > 0 && spotRect.height > 0 ? spotRect : null;
  const tooltipStyle = getTooltipStyle(validRect, step.position);

  // ── Render ─────────────────────────────────────────────────────────────────
  // Each element has its own position:fixed and a very high z-index so there
  // is NO stacking-context dependency on a wrapper element.

  return (
    <>
      {/* Dark overlay — spotlight if we have a target, full backdrop otherwise */}
      {validRect ? (
        <div
          style={{
            position: "fixed",
            zIndex: 9000,
            top:    validRect.top    - 6,
            left:   validRect.left   - 6,
            width:  validRect.width  + 12,
            height: validRect.height + 12,
            borderRadius: 8,
            // The large box-shadow IS the dark overlay; the div itself stays transparent
            boxShadow: "0 0 0 9999px rgba(17,24,39,0.62)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            zIndex: 9000,
            inset: 0,
            background: "rgba(17,24,39,0.62)",
            pointerEvents: "all",
          }}
        />
      )}

      {/* Tooltip card — always rendered, always above the overlay */}
      <div className="tutorial-card" style={tooltipStyle}>
        {/* X close button */}
        <button
          className="tutorial-close"
          onClick={dismiss}
          title="Close tutorial (Esc)"
          aria-label="Close tutorial"
        >
          ×
        </button>

        {/* Step counter + pip row */}
        <div className="tutorial-card__meta">
          <span className="tutorial-card__step">
            Step {stepIdx + 1} of {STEPS.length}
          </span>
          <div className="tutorial-pips">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`tutorial-pip${
                  i === stepIdx ? " tutorial-pip--active" : i < stepIdx ? " tutorial-pip--done" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <p className="tutorial-card__content">{step.content}</p>

        <div className="tutorial-card__actions">
          <div>
            {isFirst ? (
              <button className="tutorial-btn tutorial-btn--ghost" onClick={dismiss}>
                Skip Tutorial
              </button>
            ) : (
              <button className="tutorial-btn tutorial-btn--ghost" onClick={goPrev}>
                ← Previous
              </button>
            )}
          </div>
          <button className="tutorial-btn tutorial-btn--primary" onClick={goNext}>
            {isFirst ? "Start →" : isLast ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
