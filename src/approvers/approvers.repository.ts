import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import db from "../database";
import type { Approver, CreateApproverDto, UpdateApproverDto } from "../models/approver.model";

const SALT_ROUNDS = 10;

function toRow(row: Record<string, unknown>): Approver {
  return {
    id:            row.id as string,
    name:          row.name as string,
    email:         row.email as string,
    approvalLimit: row.approval_limit as number | null,
    status:        row.status as Approver["status"],
    createdAt:     row.created_at as string,
  };
}

@Injectable()
export class ApproversRepository {
  findAll(): Approver[] {
    return (db.prepare("SELECT * FROM approvers ORDER BY name").all() as Record<string, unknown>[]).map(toRow);
  }

  findById(id: string): Approver | undefined {
    const row = db.prepare("SELECT * FROM approvers WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? toRow(row) : undefined;
  }

  findByEmailWithHash(email: string): (Approver & { passwordHash: string }) | undefined {
    const row = db.prepare("SELECT * FROM approvers WHERE email = ?").get(email) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return { ...toRow(row), passwordHash: row.password_hash as string };
  }

  async create(dto: CreateApproverDto): Promise<Approver> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    db.prepare(
      "INSERT INTO approvers (id, name, email, approval_limit, password_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, dto.name, dto.email, dto.approvalLimit ?? null, passwordHash, dto.status, createdAt);
    return this.findById(id)!;
  }

  async update(id: string, dto: UpdateApproverDto): Promise<Approver | undefined> {
    const { password, ...rest } = dto;
    const updates: Record<string, unknown> = { ...rest };
    if (password) updates.password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const colMap: Record<string, string> = { approvalLimit: "approval_limit" };
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);
    const fields = entries.map(([k]) => `${colMap[k] ?? k} = ?`);
    const values = entries.map(([, v]) => v);
    db.prepare(`UPDATE approvers SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
    return this.findById(id);
  }

  delete(id: string): boolean {
    return db.prepare("DELETE FROM approvers WHERE id = ?").run(id).changes > 0;
  }
}
