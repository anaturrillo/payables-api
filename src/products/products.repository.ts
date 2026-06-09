import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import db from "../database";
import type { Product, CreateProductDto, UpdateProductDto } from "../models/product.model";

function toRow(row: Record<string, unknown>): Product {
  return {
    id:          row.id as string,
    name:        row.name as string,
    aliases:     JSON.parse(row.aliases as string),
    description: row.description as string,
    status:      row.status as Product["status"],
    createdAt:   row.created_at as string,
  };
}

@Injectable()
export class ProductsRepository {
  findAll(search?: string): Product[] {
    const all = (db.prepare("SELECT * FROM products ORDER BY name").all() as Record<string, unknown>[]).map(toRow);
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(
      (p) => p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }

  findById(id: string): Product | undefined {
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? toRow(row) : undefined;
  }

  create(dto: CreateProductDto): Product {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO products (id, name, aliases, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, dto.name, JSON.stringify(dto.aliases), dto.description, dto.status, createdAt);
    return this.findById(id)!;
  }

  update(id: string, dto: UpdateProductDto): Product | undefined {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);
    const fields = entries.map(([k]) => `${k} = ?`);
    const values = entries.map(([k, v]) => k === "aliases" ? JSON.stringify(v) : v);
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values, id);
    return this.findById(id);
  }

  delete(id: string): boolean {
    return db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0;
  }
}
