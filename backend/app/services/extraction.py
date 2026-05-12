"""
ExtractionService — run_triage()

Reads a company's PDF financial statement from the configured PDF_FOLDER_PATH,
sends the extracted text to Claude (claude-sonnet-4-6) via the Anthropic API,
and returns all financial line items required to calculate the 12 target KPIs.

KPIs this extraction supports:
  Current Ratio, Quick Ratio, Debt-to-Equity Ratio, Debt-to-Asset Ratio,
  Debt-to-Equity YoY Change, Debt Service Coverage Ratio, Return on Assets,
  Asset Turnover Ratio, Degree of Operating Leverage, COGS to Revenue YoY Change,
  Revenue Growth Rate, Operating Expense Ratio YoY Change.

This function does NOT calculate any KPIs — only extracts and flags.
"""

from pathlib import Path
from typing import Optional

import pdfplumber
import anthropic

from app.core.config import settings


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _line_item(
    current_value: Optional[float],
    prior_year_value: Optional[float],
    source_label: str,
    status: str,
    flag_reason: Optional[str] = None,
) -> dict:
    return {
        "current_value": current_value,
        "prior_year_value": prior_year_value,
        "source_label": source_label,
        "status": status,
        "flag_reason": flag_reason,
    }


# ---------------------------------------------------------------------------
# Placeholder — returned when ANTHROPIC_API_KEY is blank
# ---------------------------------------------------------------------------

def _placeholder_response(company_filename: str) -> dict:
    stub = _line_item(
        current_value=None,
        prior_year_value=None,
        source_label="PLACEHOLDER — API key not set",
        status="flagged",
        flag_reason="ANTHROPIC_API_KEY is blank in .env. Set it to run a real extraction.",
    )
    return {
        "meta": {
            "company_filename": company_filename,
            "company_name": None,
            "fiscal_year_end": None,
            "reporting_currency": None,
            "reporting_unit": None,
            "source": "placeholder",
        },
        "balance_sheet": {
            "current_assets": stub,
            "inventory": stub,
            "current_liabilities": stub,
            "total_assets": stub,
            "total_debt": stub,
            "total_equity": stub,
        },
        "income_statement": {
            "revenue": stub,
            "cost_of_goods_sold": stub,
            "operating_income": stub,
            "operating_expenses": stub,
            "interest_expense": stub,
            "net_income": stub,
        },
        "cash_flow": {
            "operating_cash_flow": stub,
            "total_debt_service": stub,
        },
    }


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------

# ~120 k chars ≈ 30 k tokens — sufficient for a full financial statement
# while staying well under claude-sonnet-4-6's 200 k-token context window.
_MAX_CHARS = 120_000


def _extract_pdf_text(pdf_path: Path) -> str:
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=3, y_tolerance=3)
            if text:
                pages.append(text)
    full_text = "\n\n".join(pages)
    if len(full_text) > _MAX_CHARS:
        full_text = full_text[:_MAX_CHARS]
    return full_text


# ---------------------------------------------------------------------------
# Claude tool schema
# ---------------------------------------------------------------------------

# Reused shape for every line item in the tool's input_schema.
_LINE_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "current_value": {
            "type": ["number", "null"],
            "description": (
                "Value for the most recent fiscal year in the document's reporting unit "
                "(e.g. millions). Null if not found."
            ),
        },
        "prior_year_value": {
            "type": ["number", "null"],
            "description": (
                "Value for the prior fiscal year in the same unit. "
                "Null if not found or if a prior-year figure is not present in the document."
            ),
        },
        "source_label": {
            "type": "string",
            "description": "The exact label as it appears in the document.",
        },
        "status": {
            "type": "string",
            "enum": ["clean", "flagged"],
        },
        "flag_reason": {
            "type": ["string", "null"],
            "description": "Plain-English explanation if flagged; null when status is clean.",
        },
    },
    "required": [
        "current_value",
        "prior_year_value",
        "source_label",
        "status",
        "flag_reason",
    ],
}

_EXTRACTION_TOOL: dict = {
    "name": "extract_financial_line_items",
    "description": (
        "Extract the required financial line items from the audited annual financial "
        "statements and return them in a structured format. Flag any items that are "
        "missing, ambiguous, inconsistent, or otherwise require attention."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "company_name": {"type": "string"},
            "fiscal_year_end": {
                "type": "string",
                "description": "e.g. 'March 31, 2025'",
            },
            "reporting_currency": {
                "type": "string",
                "description": "e.g. 'CAD', 'USD'",
            },
            "reporting_unit": {
                "type": "string",
                "description": "e.g. 'millions', 'thousands', 'dollars'",
            },
            # ---- Balance Sheet ----
            "balance_sheet": {
                "type": "object",
                "description": "Line items from the Consolidated Balance Sheet (Statement of Financial Position).",
                "properties": {
                    "current_assets":      _LINE_ITEM_SCHEMA,
                    "inventory":           _LINE_ITEM_SCHEMA,
                    "current_liabilities": _LINE_ITEM_SCHEMA,
                    "total_assets":        _LINE_ITEM_SCHEMA,
                    "total_debt":          _LINE_ITEM_SCHEMA,
                    "total_equity":        _LINE_ITEM_SCHEMA,
                },
                "required": [
                    "current_assets",
                    "inventory",
                    "current_liabilities",
                    "total_assets",
                    "total_debt",
                    "total_equity",
                ],
            },
            # ---- Income Statement ----
            "income_statement": {
                "type": "object",
                "description": "Line items from the Consolidated Income Statement (Statement of Earnings / Operations).",
                "properties": {
                    "revenue":            _LINE_ITEM_SCHEMA,
                    "cost_of_goods_sold": _LINE_ITEM_SCHEMA,
                    "operating_income":   _LINE_ITEM_SCHEMA,
                    "operating_expenses": _LINE_ITEM_SCHEMA,
                    "interest_expense":   _LINE_ITEM_SCHEMA,
                    "net_income":         _LINE_ITEM_SCHEMA,
                },
                "required": [
                    "revenue",
                    "cost_of_goods_sold",
                    "operating_income",
                    "operating_expenses",
                    "interest_expense",
                    "net_income",
                ],
            },
            # ---- Cash Flow ----
            "cash_flow": {
                "type": "object",
                "description": "Line items from the Consolidated Statement of Cash Flows.",
                "properties": {
                    "operating_cash_flow": _LINE_ITEM_SCHEMA,
                    "total_debt_service":  _LINE_ITEM_SCHEMA,
                },
                "required": ["operating_cash_flow", "total_debt_service"],
            },
        },
        "required": [
            "company_name",
            "fiscal_year_end",
            "reporting_currency",
            "reporting_unit",
            "balance_sheet",
            "income_statement",
            "cash_flow",
        ],
    },
}


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a financial analyst assistant specialising in audited annual financial \
statements of Canadian public companies. Your task is to locate and extract \
specific financial line items for a Commercial Account Manager (CAM).

EXTRACTION RULES
================
1. Extract values exactly as reported. Do not estimate, interpolate, or infer.
2. Record the exact source label from the document as source_label
   (e.g. "Cost of Sales", not your normalised name "COGS").
3. All numeric values must be in the document's stated reporting unit
   (millions, thousands, etc.). Do NOT convert or scale.
4. Every statement in a Canadian public company filing shows two years
   side by side. Always populate prior_year_value when the prior-year
   column is present. Set to null only if it is genuinely absent.

ACCEPTED LABEL VARIATIONS
==========================
- Revenue           : Net Revenue, Net Sales, Total Revenue, Sales, Revenues
- COGS              : Cost of Sales, Cost of Goods Sold, Cost of Products Sold,
                      Cost of Merchandise Sold, Direct Costs
- Operating Income  : Operating Earnings, Income from Operations, Profit from Operations,
                      Operating Profit (do NOT use EBITDA unless it is the only figure)
- Operating Expenses: Total Operating Expenses; if not a single line, sum all operating
                      cost lines above Operating Income
- Total Debt        : Sum of (Long-term Debt + Current portion of long-term debt +
                      Short-term borrowings / bank indebtedness). If only one long-term
                      debt line exists, use it. Flag if you had to sum sub-items.
- Total Equity      : Shareholders' Equity, Stockholders' Equity, Total Equity,
                      Equity attributable to common shareholders (use total equity
                      including non-controlling interests where applicable)
- Operating CF      : Cash from Operations, Net Cash from Operating Activities,
                      Cash Generated from Operations
- Total Debt Service: Principal repayments + Interest paid (from cash flow statement
                      or financing activities note). Flag if constructed from sub-items.
- Inventory         : Inventories, Merchandise Inventories, Finished Goods

FLAGGING RULES
==============
Flag (status = "flagged") if ANY of the following apply — be specific in flag_reason:
- The item cannot be found anywhere in the document                    → "Not found in document"
- The label is ambiguous or matches more than one line                 → describe the ambiguity
- The value had to be computed as a sum of sub-items                   → list what was summed
- Current Assets exceed Total Assets                                   → note the inconsistency
- Revenue, Total Assets, or Total Equity is negative                   → note unexpected sign
- The prior_year_value is null for any item that requires a YoY figure → "Prior year value not found"
- The reporting unit appears mixed or inconsistent across statements    → describe the mismatch

Always set flag_reason to null (not an empty string) when status is "clean".\
"""


def _user_prompt(pdf_text: str) -> str:
    return (
        "Below is the full text extracted from an audited annual financial statement. "
        "Use the extract_financial_line_items tool to return the required line items.\n\n"
        "FINANCIAL STATEMENT TEXT\n"
        "========================\n"
        f"{pdf_text}"
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_triage(company_filename: str) -> dict:
    """
    Extract financial line items from a company's PDF filing.

    Args:
        company_filename: Exact PDF filename as listed in companies.py,
                          e.g. 'SuncorEnergyInc._AuditedAFS_2025.pdf'

    Returns:
        A dict with the following top-level keys:
          - meta            : company name, fiscal year end, currency, unit, source
          - balance_sheet   : current_assets, inventory, current_liabilities,
                              total_assets, total_debt, total_equity
          - income_statement: revenue, cost_of_goods_sold, operating_income,
                              operating_expenses, interest_expense, net_income
          - cash_flow       : operating_cash_flow, total_debt_service

        Each line item is a dict with:
          current_value, prior_year_value, source_label, status, flag_reason

    Raises:
        FileNotFoundError: If the PDF is not present at PDF_FOLDER_PATH.
        ValueError:        If no text can be extracted from the PDF.
        RuntimeError:      If Claude returns an unexpected response format.
    """
    if not settings.anthropic_api_key:
        return _placeholder_response(company_filename)

    if not settings.pdf_folder_path:
        raise ValueError("PDF_FOLDER_PATH is not set in .env")

    folder = Path(settings.pdf_folder_path)
    pdf_path = folder / company_filename
    if not pdf_path.exists():
        # PDFs may be nested in batch subdirectories — search recursively
        matches = list(folder.rglob(company_filename))
        if not matches:
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        pdf_path = matches[0]

    pdf_text = _extract_pdf_text(pdf_path)
    if not pdf_text.strip():
        raise ValueError(f"No extractable text found in: {company_filename}")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=_SYSTEM_PROMPT,
        tools=[_EXTRACTION_TOOL],
        tool_choice={"type": "tool", "name": "extract_financial_line_items"},
        messages=[
            {"role": "user", "content": _user_prompt(pdf_text)},
        ],
    )

    tool_block = next(
        (block for block in response.content if block.type == "tool_use"),
        None,
    )
    if tool_block is None:
        raise RuntimeError(
            "Claude did not return a tool_use block. "
            f"Stop reason: {response.stop_reason}. "
            f"Content: {response.content}"
        )

    extracted: dict = tool_block.input

    return {
        "meta": {
            "company_filename":   company_filename,
            "company_name":       extracted.get("company_name"),
            "fiscal_year_end":    extracted.get("fiscal_year_end"),
            "reporting_currency": extracted.get("reporting_currency"),
            "reporting_unit":     extracted.get("reporting_unit"),
            "source":             "claude-sonnet-4-6",
        },
        "balance_sheet":    extracted["balance_sheet"],
        "income_statement": extracted["income_statement"],
        "cash_flow":        extracted["cash_flow"],
    }
