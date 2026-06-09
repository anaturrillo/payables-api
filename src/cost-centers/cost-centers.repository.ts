import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type { CostCenter, CreateCostCenterDto, UpdateCostCenterDto } from "../models/cost-center.model";

function toRow(row: Record<string, unknown>): CostCenter {
  return {
    id:          row.id as string,
    name:        row.name as string,
    code:        row.code as string,
    description: row.description as string,
    status:      row.status as CostCenter["status"],
    createdAt:   row.created_at as string,
  };
}

@Injectable()
export class CostCentersRepository {
  findAll(): CostCenter[] {
    return (db.prepare("SELECT * FROM cost_centers ORDER BY name").all() as Record<string, unknown>[]).map(toRow);
  }

  findById(id: string): CostCenter | undefined {
    const row = db.prepare("SELECT * FROM cost_centers WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? toRow(row) : undefined;
  }

  create(dto: CreateCostCenterDto): CostCenter {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO cost_centers (id, name, code, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, dto.name, dto.code, dto.description, dto.status, createdAt);
    return this.findById(id)!;
  }

  update(id: string, dto: UpdateCostCenterDto): CostCenter | undefined {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);
    const fields = entries.map(([k]) => `${k.replace(/([A-Z])/g, "_$1").toLowerCase()} = ?`);
    const values = entries.map(([, v]) => v);
    db.prepare(`UPDATE cost_centers SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
    return this.findById(id);
  }

  delete(id: string): boolean {
    return db.prepare("DELETE FROM cost_centers WHERE id = ?").run(id).changes > 0;
  }
}
