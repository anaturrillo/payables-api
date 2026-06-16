import { Injectable } from "@nestjs/common";
import type { ApprovalRule, RuleCondition, ConditionGroup } from "../models/approval-rule.model";

export interface InvoiceData {
  amount: number;
  productIds: string[];
  productCategories: string[];
  itemCount: number;
}

@Injectable()
export class RuleMatcherService {
  findMatchingRule(rules: ApprovalRule[], invoice: InvoiceData): ApprovalRule | null {
    return rules.find((r) => this.ruleMatches(r, invoice)) ?? null;
  }

  findMatchingCostCenter(
    costCenters: { id: string; name: string; rules: ApprovalRule[] }[],
    invoice: InvoiceData,
  ): { costCenterId: string; costCenterName: string; rule: ApprovalRule } | null {
    for (const cc of costCenters) {
      const rule = this.findMatchingRule(cc.rules, invoice);
      if (rule) return { costCenterId: cc.id, costCenterName: cc.name, rule };
    }
    return null;
  }

  private ruleMatches(rule: ApprovalRule, invoice: InvoiceData): boolean {
    if (rule.conditionGroups.length === 0) return true;
    const results = rule.conditionGroups.map((g) => this.groupMatches(g, invoice));
    return rule.groupLogic === "or" ? results.some(Boolean) : results.every(Boolean);
  }

  private groupMatches(group: ConditionGroup, invoice: InvoiceData): boolean {
    if (group.conditions.length === 0) return true;
    const results = group.conditions.map((c) => this.conditionMatches(c, invoice));
    return group.logic === "or" ? results.some(Boolean) : results.every(Boolean);
  }

  private conditionMatches(cond: RuleCondition, invoice: InvoiceData): boolean {
    switch (cond.type) {
      case "product_category": {
        const has = invoice.productCategories.includes(cond.value);
        return cond.operator === "eq" ? has : !has;
      }
      case "product": {
        const has = invoice.productIds.includes(cond.value);
        return cond.operator === "eq" ? has : !has;
      }
      case "amount":
        return this.compareNum(invoice.amount, cond.operator, parseFloat(cond.value));
      case "product_count":
        return this.compareNum(invoice.itemCount, cond.operator, parseFloat(cond.value));
      default:
        return false;
    }
  }

  private compareNum(actual: number, op: string, target: number): boolean {
    switch (op) {
      case "eq":  return actual === target;
      case "neq": return actual !== target;
      case "gt":  return actual >   target;
      case "gte": return actual >=  target;
      case "lt":  return actual <   target;
      case "lte": return actual <=  target;
      default:    return false;
    }
  }
}
