import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ── Step definitions ─────────────────────────────────────────────────────────
//   page:     route pathname where this step appears
//   selector: CSS selector for the spotlight target (null = centered card)
//   content:  tooltip body text
//   position: "center" | "bottom" | "top" | "right"

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
    selector: ".triage-table th:nth-child(4)",
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

function getTooltipStyle(rect, position) {
  if (!rect || position === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: TOOLTIP_W,
      maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
    };
  }

  const clampLeft = (x) =>
    Math.max(MARGIN, Math.min(x, window.innerWidth - TOOLTIP_W - MARGIN));
  const centredLeft = clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2);

  switch (position) {
    case "bottom":
      return {
        position: "fixed",
        top: rect.bottom + GAP,
        left: centredLeft,
        width: TOOLTIP_W,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      };
    case "top":
      return {
        position: "fixed",
        bottom: window.innerHeight - rect.top + GAP,
        left: centredLeft,
        width: TOOLTIP_W,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      };
    case "right":
      return {
        position: "fixed",
        top: Math.max(MARGIN, rect.top + rect.height / 2 - 90),
        left: Math.min(rect.right + GAP, window.innerWidth - TOOLTIP_W - MARGIN),
        width: TOOLTIP_W,
        maxWidth: `calc(100vw - ${rect.right + GAP + MARGIN}px)`,
      };
    default:
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: TOOLTIP_W,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      };
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

  // Measure target element after render (small delay to let DOM settle)
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
  const tooltipStyle = getTooltipStyle(spotRect, step.position);

  return (
    <div className="tutorial-root">
      {/* Dark backdrop — fills when no spotlight, otherwise covered by box-shadow */}
      <div className="tutorial-backdrop" />

      {/* Spotlight cutout via large box-shadow */}
      {spotRect && (
        <div
          className="tutorial-spotlight"
          style={{
            top:    spotRect.top    - 6,
            left:   spotRect.left   - 6,
            width:  spotRect.width  + 12,
            height: spotRect.height + 12,
          }}
        />
      )}

      {/* Tooltip card */}
      <div className="tutorial-card" style={tooltipStyle}>
        <div className="tutorial-card__meta">
          <span className="tutorial-card__step">
            Step {stepIdx + 1} of {STEPS.length}
          </span>
          {/* Step pip indicators */}
          <div className="tutorial-pips">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`tutorial-pip${i === stepIdx ? " tutorial-pip--active" : i < stepIdx ? " tutorial-pip--done" : ""}`}
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
    </div>
  );
}
