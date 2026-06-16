import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type {
  ApprovalRule, ConditionGroup, RuleCondition, RuleApprover, SaveApprovalRuleDto,
} from "../models/approval-rule.model";

function toCondition(row: Record<string, unknown>): RuleCondition {
  return {
    id:       row.id as string,
    groupId:  row.group_id as string,
    type:     row.type as RuleCondition["type"],
    operator: row.operator as RuleCondition["operator"],
    value:    row.value as string,
  };
}

function toGroup(row: Record<string, unknown>, conditions: RuleCondition[]): ConditionGroup {
  return {
    id:         row.id as string,
    ruleId:     row.rule_id as string,
    logic:      row.logic as ConditionGroup["logic"],
    orderIndex: row.order_index as number,
    conditions,
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

function loadGroupsForRule(ruleId: string): ConditionGroup[] {
  const groupRows = db.prepare(
    "SELECT * FROM rule_condition_groups WHERE rule_id = ? ORDER BY order_index"
  ).all(ruleId) as Record<string, unknown>[];

  return groupRows.map((gRow) => {
    const conditions = (db.prepare(
      "SELECT * FROM rule_conditions WHERE group_id = ?"
    ).all(gRow.id) as Record<string, unknown>[]).map(toCondition);
    return toGroup(gRow, conditions);
  });
}

function loadApproversForRule(ruleId: string): RuleApprover[] {
  return (db.prepare(`
    SELECT ra.*, a.name AS approver_name, a.email AS approver_email
    FROM rule_approvers ra
    JOIN approvers a ON a.id = ra.approver_id
    WHERE ra.rule_id = ?
    ORDER BY ra.order_index
  `).all(ruleId) as Record<string, unknown>[]).map(toRuleApprover);
}

function toRule(row: Record<string, unknown>): ApprovalRule {
  const ruleId = row.id as string;
  return {
    id:                ruleId,
    costCenterId:      row.cost_center_id as string,
    name:              row.name as string,
    flowType:          row.flow_type as ApprovalRule["flowType"],
    groupLogic:        (row.group_logic ?? "and") as ApprovalRule["groupLogic"],
    requiredApprovals: row.required_approvals as number,
    position:          row.position as number,
    conditionGroups:   loadGroupsForRule(ruleId),
    approvers:         loadApproversForRule(ruleId),
    createdAt:         row.created_at as string,
  };
}

@Injectable()
export class ApprovalRulesRepository {
  findAll(costCenterId: string): ApprovalRule[] {
    const rows = db.prepare(
      "SELECT * FROM approval_rules WHERE cost_center_id = ? ORDER BY position"
    ).all(costCenterId) as Record<string, unknown>[];
    return rows.map(toRule);
  }

  findOne(id: string): ApprovalRule | undefined {
    const row = db.prepare("SELECT * FROM approval_rules WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? toRule(row) : undefined;
  }

  create(costCenterId: string, dto: SaveApprovalRuleDto): ApprovalRule {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.transaction(() => {
      const maxPos = (db.prepare(
        "SELECT MAX(position) AS pos FROM approval_rules WHERE cost_center_id = ?"
      ).get(costCenterId) as { pos: number | null }).pos;

      db.prepare(`
        INSERT INTO approval_rules (id, cost_center_id, name, flow_type, group_logic, required_approvals, position, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, costCenterId, dto.name, dto.flowType, dto.groupLogic ?? "and", dto.requiredApprovals, (maxPos ?? -1) + 1, createdAt);

      dto.conditionGroups.forEach((group, gIdx) => {
        const groupId = randomUUID();
        db.prepare(
          "INSERT INTO rule_condition_groups (id, rule_id, logic, order_index) VALUES (?, ?, ?, ?)"
        ).run(groupId, id, group.logic, gIdx);

        group.conditions.forEach((cond) => {
          db.prepare(
            "INSERT INTO rule_conditions (id, group_id, type, operator, value) VALUES (?, ?, ?, ?, ?)"
          ).run(randomUUID(), groupId, cond.type, cond.operator, cond.value);
        });
      });

      dto.approvers.forEach((approver) => {
        db.prepare(
          "INSERT INTO rule_approvers (id, rule_id, approver_id, order_index) VALUES (?, ?, ?, ?)"
        ).run(randomUUID(), id, approver.approverId, approver.orderIndex);
      });
    })();

    return this.findOne(id)!;
  }

  update(costCenterId: string, ruleId: string, dto: SaveApprovalRuleDto): ApprovalRule | undefined {
    db.transaction(() => {
      db.prepare(`
        UPDATE approval_rules SET name = ?, flow_type = ?, group_logic = ?, required_approvals = ?
        WHERE id = ? AND cost_center_id = ?
      `).run(dto.name, dto.flowType, dto.groupLogic ?? "and", dto.requiredApprovals, ruleId, costCenterId);

      // Replace all groups and conditions
      db.prepare("DELETE FROM rule_condition_groups WHERE rule_id = ?").run(ruleId);

      dto.conditionGroups.forEach((group, gIdx) => {
        const groupId = randomUUID();
        db.prepare(
          "INSERT INTO rule_condition_groups (id, rule_id, logic, order_index) VALUES (?, ?, ?, ?)"
        ).run(groupId, ruleId, group.logic, gIdx);

        group.conditions.forEach((cond) => {
          db.prepare(
            "INSERT INTO rule_conditions (id, group_id, type, operator, value) VALUES (?, ?, ?, ?, ?)"
          ).run(randomUUID(), groupId, cond.type, cond.operator, cond.value);
        });
      });

      db.prepare("DELETE FROM rule_approvers WHERE rule_id = ?").run(ruleId);
      dto.approvers.forEach((approver) => {
        db.prepare(
          "INSERT INTO rule_approvers (id, rule_id, approver_id, order_index) VALUES (?, ?, ?, ?)"
        ).run(randomUUID(), ruleId, approver.approverId, approver.orderIndex);
      });
    })();

    return this.findOne(ruleId);
  }

  delete(costCenterId: string, ruleId: string): boolean {
    return db.prepare(
      "DELETE FROM approval_rules WHERE id = ? AND cost_center_id = ?"
    ).run(ruleId, costCenterId).changes > 0;
  }
}
