import { describe, it, expect } from "vitest";
import { CostCenterSuggestionService } from "./cost-center-suggestion.service";
import type { CostCenterContext, InvoiceContext } from "./cost-center-suggestion.service";
import type { ApprovalRule, ConditionGroup } from "../models/approval-rule.model";

function group(
  id: string,
  ruleId: string,
  logic: "and" | "or",
  conditions: ConditionGroup["conditions"],
  orderIndex = 0,
): ConditionGroup {
  return {
    id, ruleId, logic, orderIndex,
    conditions: conditions.map((c, i) => ({ ...c, id: `${id}-c${i}`, groupId: id })),
  };
}

function rule(
  id: string,
  ccId: string,
  name: string,
  groupLogic: "and" | "or",
  groups: ConditionGroup[],
): ApprovalRule {
  return {
    id, costCenterId: ccId, name,
    flowType: "parallel", groupLogic,
    requiredApprovals: 1, position: 0,
    conditionGroups: groups,
    approvers: [],
    createdAt: "",
  };
}

const ENGINEERING: CostCenterContext = {
  id: "cc-engineering", name: "Engineering", code: "ENG-001",
  rules: [
    rule("r-eng", "cc-engineering", "Tech Tools", "and", [
      group("g-eng", "r-eng", "or", [
        { id: "", groupId: "", type: "product_category", operator: "eq", value: "software" },
        { id: "", groupId: "", type: "product_category", operator: "eq", value: "infrastructure" },
      ]),
    ]),
  ],
};

const MARKETING: CostCenterContext = {
  id: "cc-marketing", name: "Marketing", code: "MKT-001",
  rules: [
    rule("r-mkt", "cc-marketing", "Marketing Expenses", "and", [
      group("g-mkt", "r-mkt", "and", [
        { id: "", groupId: "", type: "product_category", operator: "eq", value: "marketing" },
      ]),
    ]),
  ],
};

const FINANCE: CostCenterContext = {
  id: "cc-finance", name: "Finance", code: "FIN-001",
  rules: [
    rule("r-fin", "cc-finance", "High Value Approval", "and", [
      group("g-fin", "r-fin", "and", [
        { id: "", groupId: "", type: "amount", operator: "gte", value: "5000" },
      ]),
    ]),
  ],
};

const ENGINEERING_COMPLEX: CostCenterContext = {
  id: "cc-eng-complex", name: "Engineering", code: "ENG-002",
  rules: [
    rule("r-eng-c", "cc-eng-complex", "Tech Tools with Min Amount", "and", [
      group("g1", "r-eng-c", "or", [
        { id: "", groupId: "", type: "product_category", operator: "eq", value: "software" },
        { id: "", groupId: "", type: "product_category", operator: "eq", value: "infrastructure" },
      ]),
      group("g2", "r-eng-c", "and", [
        { id: "", groupId: "", type: "amount", operator: "gt", value: "500" },
      ], 1),
    ]),
  ],
};

const ALL_CCS = [ENGINEERING, MARKETING, FINANCE];

describe.skipIf(!process.env.ANTHROPIC_API_KEY)(
  "CostCenterSuggestionService — cost center assignment",
  () => {
    const service = new CostCenterSuggestionService();

    it("software invoice → Engineering (category rule)", async () => {
      const invoice: InvoiceContext = {
        vendor: "GitHub",
        totalAmount: 800,
        lineItems: [{ description: "GitHub Enterprise license", quantity: 1, total: 800, matchedProductCategory: "software" }],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.costCenterId).toBe("cc-engineering");
    }, 20_000);

    it("infrastructure invoice → Engineering (OR within group)", async () => {
      const invoice: InvoiceContext = {
        vendor: "Amazon Web Services",
        totalAmount: 2400,
        lineItems: [{ description: "AWS EC2 instances", quantity: 1, total: 2400, matchedProductCategory: "infrastructure" }],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.costCenterId).toBe("cc-engineering");
    }, 20_000);

    it("marketing invoice → Marketing", async () => {
      const invoice: InvoiceContext = {
        vendor: "Meta Ads",
        totalAmount: 3000,
        lineItems: [{ description: "Facebook advertising campaign", quantity: 1, total: 3000, matchedProductCategory: "marketing" }],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.costCenterId).toBe("cc-marketing");
    }, 20_000);

    it("high-value office invoice → Finance (amount rule)", async () => {
      const invoice: InvoiceContext = {
        vendor: "Office Depot",
        totalAmount: 8500,
        lineItems: [
          { description: "Ergonomic desk chairs", quantity: 5, total: 7500, matchedProductCategory: "office_supplies" },
          { description: "Monitor stands", quantity: 5, total: 1000, matchedProductCategory: "office_supplies" },
        ],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.costCenterId).toBe("cc-finance");
    }, 20_000);

    it("marketing invoice under Finance threshold → Marketing, not Finance", async () => {
      const invoice: InvoiceContext = {
        vendor: "Mailchimp",
        totalAmount: 1200,
        lineItems: [{ description: "Email marketing subscription", quantity: 1, total: 1200, matchedProductCategory: "marketing" }],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.costCenterId).toBe("cc-marketing");
    }, 20_000);

    it("complex rule: (software OR infra) AND amount > 500 — both groups match", async () => {
      const invoice: InvoiceContext = {
        vendor: "Datadog",
        totalAmount: 1500,
        lineItems: [{ description: "Datadog monitoring", quantity: 1, total: 1500, matchedProductCategory: "infrastructure" }],
      };
      const result = await service.suggest(invoice, [ENGINEERING_COMPLEX, MARKETING, FINANCE]);
      expect(result?.costCenterId).toBe("cc-eng-complex");
    }, 20_000);

    it("complex rule: category matches but amount too low → no match for that rule", async () => {
      const invoice: InvoiceContext = {
        vendor: "GitHub",
        totalAmount: 100,
        lineItems: [{ description: "GitHub personal plan", quantity: 1, total: 100, matchedProductCategory: "software" }],
      };
      const result = await service.suggest(invoice, [ENGINEERING_COMPLEX, FINANCE]);
      expect(result?.costCenterId).toBeNull();
    }, 20_000);

    it("every decision includes reasoning", async () => {
      const invoice: InvoiceContext = {
        vendor: "Slack",
        totalAmount: 500,
        lineItems: [{ description: "Slack Pro", quantity: 1, total: 500, matchedProductCategory: "software" }],
      };
      const result = await service.suggest(invoice, ALL_CCS);
      expect(result?.reasoning).toBeTruthy();
      expect(typeof result?.reasoning).toBe("string");
    }, 20_000);
  },
);
