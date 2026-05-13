import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ── Step definitions ─────────────────────────────────────────────────────────
// Spotlight (selector + position) is only used for steps on the company
// selection page where it reliably works. All triage and KPI page steps
// use selector:null so they always render as centered cards with a full
// backdrop — no element measurement, no positioning math, no failure modes.

const STEPS = [
  {
    page: "/",
    selector: null,          // centered welcome card
    content:
      "Welcome to KPI-AI. This platform automates the extraction and calculation of financial KPIs from audited annual financial statements. Select a company to begin.",
  },
  {
    page: "/",
    selector: ".company-row", // spotlight the first company row
    position: "bottom",
    content:
      "Each company is listed by its legal filing name. Click the pencil icon to set a preferred display name — for example Empire Company Limited can be saved as Sobeys. This is stored for future sessions.",
  },
  {
    page: "/triage",
    selector: null,
    content:
      "After selecting a company, KPI-AI reads the entire financial filing in a single pass and extracts all required line items automatically. No manual searching required.",
  },
  {
    page: "/triage",
    selector: null,
    content:
      "Complete means the value was clearly labelled in the document and only needs a quick confirmation. Needs Review means Claude made an assumption or could not find a standard label — the detailed explanation tells you exactly what was found and why, so you can make an informed decision.",
  },
  {
    page: "/triage",
    selector: null,
    content:
      "Every value is editable. Click any number to type a correction. The value will be used in all KPI calculations. You can also accept Claude's assumption as-is using the checkbox in the Verification column.",
  },
  {
    page: "/triage",
    selector: null,
    content:
      "Once all items are Accepted, Manually Adjusted, or Verified the Proceed button activates. The footer shows exactly what still needs attention.",
  },
  {
    page: "/kpis",
    selector: null,
    content:
      "Toggle one or as many KPIs as you need and click Calculate. You only calculate what is relevant to your review.",
  },
  {
    page: "/kpis",
    selector: null,
    content:
      "Each result card shows the calculated value and the formula used. That is it — your analysis is complete.",
  },
];

// ── Centered card style (always used when selector is null) ───────────────────
const CENTERED_STYLE = {
  position: "fixed",
  top:      "50%",
  left:     "50%",
  transform: "translate(-50%, -50%)",
  width:    380,
  maxWidth: "calc(100vw - 40px)",
  zIndex:   9002,
};

// ── Spotlight positioning (only used when selector is non-null) ───────────────
const TOOLTIP_W = 380;
const GAP       = 16;
const MARGIN    = 20;

function spotlightTooltipStyle(rect) {
  if (!rect || rect.width === 0 || rect.height === 0) return CENTERED_STYLE;
  const left = Math.max(
    MARGIN,
    Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - MARGIN)
  );
  const top = rect.bottom + GAP;
  // If the card would go off the bottom, flip above
  if (top + 220 > window.innerHeight) {
    const bottom = window.innerHeight - rect.top + GAP;
    return { position: "fixed", bottom, left, width: TOOLTIP_W, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, zIndex: 9002 };
  }
  return { position: "fixed", top, left, width: TOOLTIP_W, maxWidth: `calc(100vw - ${MARGIN * 2}px)`, zIndex: 9002 };
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

  const step          = stepIdx >= 0 && stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const onCorrectPage = step?.page === location.pathname;

  // Measure spotlight element when a selector is present.
  // Logs what it finds so the browser console makes the behaviour transparent.
  useEffect(() => {
    if (!onCorrectPage || !step?.selector) {
      setSpotRect(null);
      return;
    }
    const id = setTimeout(() => {
      const el = document.querySelector(step.selector);
      if (!el) {
        console.warn(`[Tutorial] step ${stepIdx + 1}: selector "${step.selector}" — element NOT found, falling back to centered card`);
        setSpotRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      console.log(`[Tutorial] step ${stepIdx + 1}: selector "${step.selector}" — rect`, rect);
      if (rect.width === 0 || rect.height === 0) {
        console.warn(`[Tutorial] step ${stepIdx + 1}: rect has no area (hidden?), falling back to centered card`);
        setSpotRect(null);
      } else {
        setSpotRect(rect);
      }
    }, 100);
    return () => clearTimeout(id);
  }, [onCorrectPage, step?.selector, stepIdx, location.pathname]);

  const dismiss = useCallback(() => {
    localStorage.setItem("kpiai_tutorial_done", "true");
    localStorage.removeItem("kpiai_tutorial_step");
    setStepIdx(-1);
  }, []);

  // Escape key dismisses at any step
  useEffect(() => {
    if (!onCorrectPage) return;
    const onKey = (e) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const isFirst    = stepIdx === 0;
  const isLast     = stepIdx === STEPS.length - 1;
  const hasSpot    = Boolean(step?.selector);           // spotlight requested
  const validRect  = hasSpot && spotRect?.width > 0 && spotRect?.height > 0 ? spotRect : null;
  const cardStyle  = validRect ? spotlightTooltipStyle(validRect) : CENTERED_STYLE;

  return (
    <>
      {/* ── Dark overlay ─────────────────────────────────────────────────── */}
      {validRect ? (
        // Spotlight: transparent div whose box-shadow creates the dark surround
        <div
          style={{
            position:     "fixed",
            zIndex:       9000,
            top:          validRect.top    - 6,
            left:         validRect.left   - 6,
            width:        validRect.width  + 12,
            height:       validRect.height + 12,
            borderRadius: 8,
            boxShadow:    "0 0 0 9999px rgba(17,24,39,0.62)",
            pointerEvents: "none",
          }}
        />
      ) : (
        // Full backdrop when no spotlight
        <div
          style={{
            position:      "fixed",
            zIndex:        9000,
            inset:         0,
            background:    "rgba(17,24,39,0.62)",
            pointerEvents: "all",
          }}
        />
      )}

      {/* ── Tooltip card — always above the overlay ───────────────────────── */}
      <div className="tutorial-card" style={cardStyle}>
        {/* X close button */}
        <button
          className="tutorial-close"
          onClick={dismiss}
          title="Close tutorial (Esc)"
          aria-label="Close tutorial"
        >
          ×
        </button>

        {/* Step label + pip indicators */}
        <div className="tutorial-card__meta">
          <span className="tutorial-card__step">
            Step {stepIdx + 1} of {STEPS.length}
          </span>
          <div className="tutorial-pips">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`tutorial-pip${
                  i === stepIdx ? " tutorial-pip--active"
                  : i < stepIdx ? " tutorial-pip--done"
                  : ""
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
