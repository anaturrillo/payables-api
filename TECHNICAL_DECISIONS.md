# Technical Decisions

## Reference and scope

This project is based on the Bill Pay module from Ramp provided as the reference for this exercise. Ramp's Bill Pay is a full-featured enterprise accounts payable platform covering the complete invoice lifecycle (draft → approval → payment), ERP integrations, multiple payment methods, and automatic reconciliation with card transactions.

For this MVP, the scope was narrowed to **a single slice of that cycle**: capturing an invoice, classifying it into a cost center, and determining who needs to approve it. Everything related to actual payments, accounting integrations, and reconciliation was intentionally left out.

---

## Primary flow

The core flow is:

1. The user uploads an invoice image
2. The system automatically extracts the relevant data (vendor, amount, dates, line items)
3. The system assigns the invoice to a cost center and determines the approvers
4. The user reviews the pre-filled data, corrects if needed, and saves the bill

This flow was chosen because it represents the highest-friction point in accounts payable: **manual data entry** and **the decision of who should approve each invoice**. Automating both delivers immediate, concrete value with a contained scope.

---

## MVP scope

| Module | Description |
|---|---|
| **Products** | CRUD with name, category, and aliases for line-item matching |
| **Approvers** | CRUD of people authorized to approve bills |
| **Cost centers** | CRUD with configurable approval rules (conditions, approvers, flow type) |
| **Bills** | CRUD with manual entry or OCR upload, automatic cost center and rule assignment |

---

## Core technical decision: deterministic rule matching + AI fallback

Assigning an invoice to a cost center and an approval rule has two layers:

### 1. Deterministic rule engine (`RuleMatcherService`)

Evaluates user-configured conditions against the invoice data: amount, linked products, product categories, and line item count. Conditions are grouped with configurable AND/OR logic at both the condition level and the group level. If a rule matches, it is applied directly — the result is fully predictable and requires no AI tokens.

This works well when the products on the invoice are registered in the system and matched to the invoice's line items.

### 2. AI fallback (`CostCenterSuggestionService`)

When the deterministic matcher finds no matching rule — for example because the invoice's products aren't in the database or the line item descriptions don't match exactly — the system falls back to Claude. The model receives the full invoice description along with all cost centers and their rules, and returns the most appropriate cost center and the specific rule ID that justifies the assignment.

This two-layer approach resolves the tension between **predictability** (configured rules are always respected when they match) and **resilience** (when data is imperfect, the model can interpret the semantic context of descriptions that the rule engine cannot).

---

## Other decisions

**Two-step OCR**: Invoice image processing is split into upload (fast, returns a filename) and processing (slow, calls the Anthropic API). This allows the flow to recover if the mobile browser reloads mid-process — the filename is stored in `sessionStorage` so processing can resume on the next page load without re-uploading.

**Single-server production setup**: The React frontend is compiled and served as static files directly from the NestJS backend. All API routes are prefixed with `/api`, and everything else falls back to `index.html` for client-side routing. This means a single Node.js process handles both the API and the frontend in production, simplifying deployment.

**Stack**: React 19 + Vite (frontend), NestJS + SQLite (backend). SQLite was chosen to eliminate the need for an external database service, keeping the deployment footprint minimal for an MVP.

---

## What's missing

**Sequential approval flow**: Approval rules support a `sequential` flow type in the data model, and the UI displays it as a label on the bill. However, the enforcement logic is not implemented — all approvals currently behave as parallel regardless of the configured type. A proper sequential flow would require tracking which approvers have signed off and in what order, unlocking each subsequent approver only after the previous one approves, and only marking the bill as fully approved once the last approver in the chain has signed.

**Paid status**: Bills currently move from `initiated` to `approved`, but there is no `paid` status. Marking a bill as paid — and the workflow around it (who can mark it, when, and what that triggers) — was out of scope for this MVP but would be the natural next step before the product is usable end-to-end.
