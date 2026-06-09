import { Injectable } from "@nestjs/common";
import { CostCentersRepository } from "./cost-centers.repository";
import type { CostCenter, CreateCostCenterDto, UpdateCostCenterDto } from "../models/cost-center.model";

@Injectable()
export class CostCentersService {
  constructor(private readonly repo: CostCentersRepository) {}

  list(): CostCenter[] { return this.repo.findAll(); }
  create(dto: CreateCostCenterDto): CostCenter { return this.repo.create(dto); }
  update(id: string, dto: UpdateCostCenterDto): CostCenter | null { return this.repo.update(id, dto) ?? null; }
  delete(id: string): boolean { return this.repo.delete(id); }
}
