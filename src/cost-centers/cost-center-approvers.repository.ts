import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type { CostCenterApprover, CreateCostCenterApproverDto, UpdateCostCenterApproverDto } from "../models/cost-center-approver.model";

function toRow(row: Record<string, unknown>): CostCenterApprover {
  return {
    id:            row.id as string,
    costCenterId:  row.cost_center_id as string,
    approverId:    row.approver_id as string,
    approverName:  row.approver_name as string,
    approverEmail: row.approver_email as string,
    minAmount:     row.min_amount as number | null,
    maxAmount:     row.max_amount as number | null,
  };
}

@Injectable()
export class CostCenterApproversRepository {
  findByCostCenter(costCenterId: string): CostCenterApprover[] {
    const rows = db.prepare(`
      SELECT cca.*, a.name AS approver_name, a.email AS approver_email
      FROM cost_center_approvers cca
      JOIN approvers a ON a.id = cca.approver_id
      WHERE cca.cost_center_id = ?
      ORDER BY a.name
    `).all(costCenterId) as Record<string, unknown>[];
    return rows.map(toRow);
  }

  findOne(costCenterId: string, approverId: string): CostCenterApprover | undefined {
    const row = db.prepare(`
      SELECT cca.*, a.name AS approver_name, a.email AS approver_email
      FROM cost_center_approvers cca
      JOIN approvers a ON a.id = cca.approver_id
      WHERE cca.cost_center_id = ? AND cca.approver_id = ?
    `).get(costCenterId, approverId) as Record<string, unknown> | undefined;
    return row ? toRow(row) : undefined;
  }

  create(costCenterId: string, dto: CreateCostCenterApproverDto): CostCenterApprover {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO cost_center_approvers (id, cost_center_id, approver_id, min_amount, max_amount) VALUES (?, ?, ?, ?, ?)"
    ).run(id, costCenterId, dto.approverId, dto.minAmount ?? null, dto.maxAmount ?? null);
    return this.findOne(costCenterId, dto.approverId)!;
  }

  update(costCenterId: string, approverId: string, dto: UpdateCostCenterApproverDto): CostCenterApprover | undefined {
    db.prepare(
      "UPDATE cost_center_approvers SET min_amount = ?, max_amount = ? WHERE cost_center_id = ? AND approver_id = ?"
    ).run(dto.minAmount ?? null, dto.maxAmount ?? null, costCenterId, approverId);
    return this.findOne(costCenterId, approverId);
  }

  delete(costCenterId: string, approverId: string): boolean {
    return db.prepare(
      "DELETE FROM cost_center_approvers WHERE cost_center_id = ? AND approver_id = ?"
    ).run(costCenterId, approverId).changes > 0;
  }
}
