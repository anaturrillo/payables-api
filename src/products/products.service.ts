import { Injectable } from "@nestjs/common";
import { ProductsRepository } from "./products.repository";
import type { Product, CreateProductDto, UpdateProductDto } from "../models/product.model";

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  list(search?: string): Product[] { return this.repo.findAll(search); }
  create(dto: CreateProductDto): Product { return this.repo.create(dto); }
  update(id: string, dto: UpdateProductDto): Product | null { return this.repo.update(id, dto) ?? null; }
  delete(id: string): boolean { return this.repo.delete(id); }
}
