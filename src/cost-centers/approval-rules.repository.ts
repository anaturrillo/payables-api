import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type {
  ApprovalRule, RuleCondition, RuleApprover, SaveApprovalRuleDto,
} from "../models/approval-rule.model";

function toCondition(row: Record<string, unknown>): RuleCondition {
  return {
    id:       row.id as string,
    ruleId:   row.rule_id as string,
    type:     row.type as RuleCondition["type"],
    operator: row.operator as RuleCondition["operator"],
    value:    row.value as string,
  };
}

function toRuleApprover(row: Record<string, unknown>): RuleApprover {
  return {
    id:            row.id as string,
    ruleId:        row.rule_id as string,
    approverId:    row.approver_id as string,
    approverName:  row.approver_name as string,
    approverEmail: row.approver_email as string,
    orderIndex:    row.order_index as number,
  };
}

function toRule(
  row: Record<string, unknown>,
  conditions: RuleCondition[],
  approvers: RuleApprover[],
): ApprovalRule {
  return {
    id:                row.id as string,
    costCenterId:      row.cost_center_id as string,
    name:              row.name as string,
    flowType:          row.flow_type as ApprovalRule["flowType"],
    conditionLogic:    (row.condition_logic ?? "and") as ApprovalRule["conditionLogic"],
    requiredApprovals: row.required_approvals as number,
    position:          row.position as number,
    conditions,
    approvers,
    createdAt:         row.created_at as string,
  };
}

@Injectable()
export class ApprovalRulesRepository {
  findAll(costCenterId: string): ApprovalRule[] {
    const rows = db
      .prepare("SELECT * FROM approval_rules WHERE cost_center_id = ? ORDER BY position")
      .all(costCenterId) as Record<string, unknown>[];

    return rows.map((r) => {
      const conditions = (db
        .prepare("SELECT * FROM rule_conditions WHERE rule_id = ?")
        .all(r.id) as Record<string, unknown>[]).map(toCondition);

      const approvers = (db
        .prepare(`
          SELECT ra.*, a.name AS approver_name, a.email AS approver_email
          FROM rule_approvers ra
          JOIN approvers a ON a.id = ra.approver_id
          WHERE ra.rule_id = ?
          ORDER BY ra.order_index
        `)
        .all(r.id) as Record<string, unknown>[]).map(toRuleApprover);

      return toRule(r, conditions, approvers);
    });
  }

  findOne(id: string): ApprovalRule | undefined {
    const row = db.prepare("SELECT * FROM approval_rules WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;

    const conditions = (db
      .prepare("SELECT * FROM rule_conditions WHERE rule_id = ?")
      .all(id) as Record<string, unknown>[]).map(toCondition);

    const approvers = (db
      .prepare(`
        SELECT ra.*, a.name AS approver_name, a.email AS approver_email
        FROM rule_approvers ra
        JOIN approvers a ON a.id = ra.approver_id
        WHERE ra.rule_id = ?
        ORDER BY ra.order_index
      `)
      .all(id) as Record<string, unknown>[]).map(toRuleApprover);

    return toRule(row, conditions, approvers);
  }

  create(costCenterId: string, dto: SaveApprovalRuleDto): ApprovalRule {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const doCreate = db.transaction(() => {
      const maxPos = (db
        .prepare("SELECT MAX(position) AS pos FROM approval_rules WHERE cost_center_id = ?")
        .get(costCenterId) as { pos: number | null }).pos;
      const position = (maxPos ?? -1) + 1;

      db.prepare(
        "INSERT INTO approval_rules (id, cost_center_id, name, flow_type, condition_logic, required_approvals, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, costCenterId, dto.name, dto.flowType, dto.conditionLogic ?? "and", dto.requiredApprovals, position, createdAt);

      for (const cond of dto.conditions) {
        db.prepare(
          "INSERT INTO rule_conditions (id, rule_id, type, operator, value) VALUES (?, ?, ?, ?, ?)"
        ).run(randomUUID(), id, cond.type, cond.operator, cond.value);
      }

      for (const approver of dto.approvers) {
        db.prepare(
          "INSERT INTO rule_approvers (id, rule_id, approver_id, order_index) VALUES (?, ?, ?, ?)"
        ).run(randomUUID(), id, approver.approverId, approver.orderIndex);
      }
    });

    doCreate();
    return this.findOne(id)!;
  }

  update(costCenterId: string, ruleId: string, dto: SaveApprovalRuleDto): ApprovalRule | undefined {
    const doUpdate = db.transaction(() => {
      db.prepare(
        "UPDATE approval_rules SET name = ?, flow_type = ?, condition_logic = ?, required_approvals = ? WHERE id = ? AND cost_center_id = ?"
      ).run(dto.name, dto.flowType, dto.conditionLogic ?? "and", dto.requiredApprovals, ruleId, costCenterId);

      db.prepare("DELETE FROM rule_conditions WHERE rule_id = ?").run(ruleId);
      for (const cond of dto.conditions) {
        db.prepare(
          "INSERT INTO rule_conditions (id, rule_id, type, operator, value) VALUES (?, ?, ?, ?, ?)"
        ).run(randomUUID(), ruleId, cond.type, cond.operator, cond.value);
      }

      db.prepare("DELETE FROM rule_approvers WHERE rule_id = ?").run(ruleId);
      for (const approver of dto.approvers) {
        db.prepare(
          "INSERT INTO rule_approvers (id, rule_id, approver_id, order_index) VALUES (?, ?, ?, ?)"
        ).run(randomUUID(), ruleId, approver.approverId, approver.orderIndex);
      }
    });

    doUpdate();
    return this.findOne(ruleId);
  }

  delete(costCenterId: string, ruleId: string): boolean {
    return db
      .prepare("DELETE FROM approval_rules WHERE id = ? AND cost_center_id = ?")
      .run(ruleId, costCenterId).changes > 0;
  }
}
