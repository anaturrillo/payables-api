import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import type { ApprovalRule, RuleCondition } from "../models/approval-rule.model";

export interface InvoiceContext {
  vendor: string | null;
  totalAmount: number | null;
  lineItems: {
    description: string;
    quantity: number;
    total: number;
    matchedProductCategory: string | null;
  }[];
}

export interface CostCenterContext {
  id: string;
  name: string;
  code: string;
  rules: ApprovalRule[];
}

export interface SuggestionResult {
  costCenterId: string | null;
  costCenterName: string | null;
  ruleId: string | null;
  reasoning: string;
}

type ProductMap = Record<string, string>; // id → name

function describeCondition(cond: RuleCondition, productMap: ProductMap): string {
  const OPERATORS: Record<string, string> = {
    eq: "is", neq: "is not",
    gt: "greater than", gte: "at least",
    lt: "less than", lte: "at most",
  };
  const op = OPERATORS[cond.operator] ?? cond.operator;

  if (cond.type === "product_category") return `product category ${op} "${cond.value}"`;
  if (cond.type === "product") return `product ${op} "${productMap[cond.value] ?? cond.value}"`;
  if (cond.type === "amount") return `total amount ${op} $${cond.value}`;
  if (cond.type === "product_count") return `number of line items ${op} ${cond.value}`;
  return `${cond.type} ${op} ${cond.value}`;
}

function describeRule(rule: ApprovalRule, productMap: ProductMap): string {
  if (rule.conditionGroups.length === 0) return `  Rule id="${rule.id}" name="${rule.name}": (no conditions — always applies)`;

  const groupLines = rule.conditionGroups.map((group) => {
    const condParts = group.conditions.map((c) => describeCondition(c, productMap)).join(` ${group.logic.toUpperCase()} `);
    return `(${condParts})`;
  }).join(` ${rule.groupLogic.toUpperCase()} `);

  return `  Rule id="${rule.id}" name="${rule.name}" triggers when: ${groupLines}`;
}

@Injectable()
export class CostCenterSuggestionService {
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async suggest(
    invoice: InvoiceContext,
    costCenters: CostCenterContext[],
    products: { id: string; name: string }[] = [],
  ): Promise<SuggestionResult | null> {
    if (costCenters.length === 0) return null;

    const productMap: ProductMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    const itemLines = invoice.lineItems.map((item) => {
      const cat = item.matchedProductCategory ? ` [category: ${item.matchedProductCategory}]` : "";
      return `  - ${item.description}${cat}: qty ${item.quantity}, subtotal $${item.total}`;
    }).join("\n");

    const ccLines = costCenters.map((cc) => {
      const ruleLines = cc.rules.length === 0
        ? "  (no rules configured)"
        : cc.rules.map((r) => describeRule(r, productMap)).join("\n");
      return `Cost center: ${cc.name} (id: "${cc.id}", code: ${cc.code})\n${ruleLines}`;
    }).join("\n\n");

    const prompt = `You are a financial routing assistant. Given an invoice and a list of cost centers with their approval rules, decide which cost center this invoice should be assigned to.

INVOICE:
- Vendor: ${invoice.vendor ?? "unknown"}
- Total amount: $${invoice.totalAmount ?? 0}
- Line items:
${itemLines || "  (none)"}

COST CENTERS:
${ccLines}

INSTRUCTIONS:
- A cost center matches if the invoice satisfies at least one of its rules.
- Within a rule, conditions with AND logic must ALL be true; conditions with OR logic require ANY to be true.
- If multiple cost centers match, prefer the one whose conditions are most specific to this invoice.
- If no cost center clearly matches, return null for costCenterId and ruleId.

Respond with ONLY a valid JSON object — no markdown, no explanation:
{"costCenterId": "<id or null>", "costCenterName": "<name or null>", "ruleId": "<rule id or null>", "reasoning": "<one sentence>"}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      return JSON.parse(match[0]) as SuggestionResult;
    } catch {
      return null;
    }
  }
}
