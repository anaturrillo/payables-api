import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type { Bill, BillApprover, BillItem, CreateBillDto, UpdateBillDto } from "../models/bill.model";

function toItem(row: Record<string, unknown>): BillItem {
  return {
    id:          row.id as string,
    billId:      row.bill_id as string,
    productId:   (row.product_id as string | null) ?? null,
    description: row.description as string,
    quantity:    row.quantity as number,
    unitPrice:   row.unit_price as number,
    total:       row.total as number,
    orderIndex:  row.order_index as number,
  };
}

function loadBillApprovers(billId: string, ruleId: string | null): BillApprover[] {
  // Prefer explicitly stored bill_approvers
  const rows = db.prepare(`
    SELECT ba.approver_id, a.name AS approver_name, a.email AS approver_email, ba.order_index
    FROM bill_approvers ba
    JOIN approvers a ON ba.approver_id = a.id
    WHERE ba.bill_id = ?
    ORDER BY ba.order_index
  `).all(billId) as Record<string, unknown>[];

  if (rows.length > 0) {
    return rows.map((r) => ({
      approverId:    r.approver_id as string,
      approverName:  r.approver_name as string,
      approverEmail: r.approver_email as string,
      orderIndex:    r.order_index as number,
    }));
  }

  // Fallback: load from rule for bills that pre-date the bill_approvers table
  if (!ruleId) return [];
  return (db.prepare(`
    SELECT ra.approver_id, a.name AS approver_name, a.email AS approver_email, ra.order_index
    FROM rule_approvers ra
    JOIN approvers a ON ra.approver_id = a.id
    WHERE ra.rule_id = ?
    ORDER BY ra.order_index
  `).all(ruleId) as Record<string, unknown>[]).map((r) => ({
    approverId:    r.approver_id as string,
    approverName:  r.approver_name as string,
    approverEmail: r.approver_email as string,
    orderIndex:    r.order_index as number,
  }));
}

function syncBillApprovers(billId: string, dto: { ruleId?: string | null; approvers?: { approverId: string; orderIndex: number }[] }) {
  db.prepare("DELETE FROM bill_approvers WHERE bill_id = ?").run(billId);

  if (dto.approvers && dto.approvers.length > 0) {
    for (const a of dto.approvers) {
      db.prepare("INSERT INTO bill_approvers (id, bill_id, approver_id, order_index) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), billId, a.approverId, a.orderIndex);
    }
  } else if (dto.ruleId) {
    const ruleApprovers = db.prepare(
      "SELECT approver_id, order_index FROM rule_approvers WHERE rule_id = ? ORDER BY order_index"
    ).all(dto.ruleId) as Record<string, unknown>[];
    for (const a of ruleApprovers) {
      db.prepare("INSERT INTO bill_approvers (id, bill_id, approver_id, order_index) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), billId, a.approver_id, a.order_index);
    }
  }
}

function toBill(row: Record<string, unknown>, items: BillItem[]): Bill {
  const ruleId = (row.rule_id as string | null) ?? null;
  const billId = row.id as string;
  return {
    id:                billId,
    number:            (row.number as string | null) ?? null,
    supplier:          row.supplier as string,
    amount:            row.amount as number,
    invoiceDate:       (row.invoice_date as string | null) ?? null,
    dueDate:           (row.due_date as string | null) ?? null,
    paymentDate:       (row.payment_date as string | null) ?? null,
    status:            row.status as Bill["status"],
    imagePath:         (row.image_path as string | null) ?? null,
    costCenterId:      (row.cost_center_id as string | null) ?? null,
    costCenterName:    (row.cost_center_name as string | null) ?? null,
    ruleId,
    approvalRuleName:  (row.approval_rule_name as string | null) ?? null,
    approvalFlowType:  (row.approval_flow_type as "parallel" | "sequential" | null) ?? null,
    approvalReasoning: (row.approval_reasoning as string | null) ?? null,
    approvers:         loadBillApprovers(billId, ruleId),
    items,
    createdAt:         row.created_at as string,
  };
}

@Injectable()
export class BillsRepository {
  findAll(): Bill[] {
    const rows = db.prepare(`
      SELECT b.*, cc.name AS cost_center_name,
             ar.name AS approval_rule_name, ar.flow_type AS approval_flow_type
      FROM bills b
      LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
      LEFT JOIN approval_rules ar ON b.rule_id = ar.id
      ORDER BY b.created_at DESC
    `).all() as Record<string, unknown>[];

    return rows.map((row) => {
      const items = (db.prepare("SELECT * FROM bill_items WHERE bill_id = ? ORDER BY order_index").all(row.id) as Record<string, unknown>[]).map(toItem);
      return toBill(row, items);
    });
  }

  findById(id: string): Bill | undefined {
    const row = db.prepare(`
      SELECT b.*, cc.name AS cost_center_name,
             ar.name AS approval_rule_name, ar.flow_type AS approval_flow_type
      FROM bills b
      LEFT JOIN cost_centers cc ON b.cost_center_id = cc.id
      LEFT JOIN approval_rules ar ON b.rule_id = ar.id
      WHERE b.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const items = (db.prepare("SELECT * FROM bill_items WHERE bill_id = ? ORDER BY order_index").all(id) as Record<string, unknown>[]).map(toItem);
    return toBill(row, items);
  }

  create(dto: CreateBillDto): Bill {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO bills (id, number, supplier, amount, invoice_date, due_date, payment_date, status, image_path, cost_center_id, rule_id, approval_reasoning, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        dto.number ?? null,
        dto.supplier,
        dto.amount,
        dto.invoiceDate ?? null,
        dto.dueDate ?? null,
        dto.paymentDate ?? null,
        dto.status ?? "initiated",
        dto.imagePath ?? null,
        dto.costCenterId ?? null,
        dto.ruleId ?? null,
        dto.approvalReasoning ?? null,
        createdAt,
      );

      syncBillApprovers(id, { ruleId: dto.ruleId, approvers: dto.approvers });

      (dto.items ?? []).forEach((item, idx) => {
        db.prepare(`
          INSERT INTO bill_items (id, bill_id, product_id, description, quantity, unit_price, total, order_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), id, item.productId ?? null, item.description, item.quantity, item.unitPrice, item.total, idx);
      });
    })();

    return this.findById(id)!;
  }

  update(id: string, dto: UpdateBillDto): Bill | undefined {
    const bill = this.findById(id);
    if (!bill) return undefined;

    db.transaction(() => {
      const fields: string[] = [];
      const values: unknown[] = [];

      const map: [keyof UpdateBillDto, string][] = [
        ["number",            "number"],
        ["supplier",          "supplier"],
        ["amount",            "amount"],
        ["invoiceDate",       "invoice_date"],
        ["dueDate",           "due_date"],
        ["paymentDate",       "payment_date"],
        ["status",            "status"],
        ["imagePath",         "image_path"],
        ["costCenterId",      "cost_center_id"],
        ["ruleId",            "rule_id"],
        ["approvalReasoning", "approval_reasoning"],
      ];

      for (const [key, col] of map) {
        if (dto[key] !== undefined) {
          fields.push(`${col} = ?`);
          values.push((dto[key] as unknown) ?? null);
        }
      }

      if (fields.length > 0) {
        db.prepare(`UPDATE bills SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
      }

      if (dto.ruleId !== undefined || dto.approvers !== undefined) {
        const effectiveRuleId = dto.ruleId !== undefined ? dto.ruleId : bill.ruleId;
        syncBillApprovers(id, { ruleId: effectiveRuleId, approvers: dto.approvers });
      }

      if (dto.items !== undefined) {
        db.prepare("DELETE FROM bill_items WHERE bill_id = ?").run(id);
        dto.items.forEach((item, idx) => {
          db.prepare(`
            INSERT INTO bill_items (id, bill_id, product_id, description, quantity, unit_price, total, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(randomUUID(), id, item.productId ?? null, item.description, item.quantity, item.unitPrice, item.total, idx);
        });
      }
    })();

    return this.findById(id);
  }

  delete(id: string): boolean {
    return db.prepare("DELETE FROM bills WHERE id = ?").run(id).changes > 0;
  }
}
