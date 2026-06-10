import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { CostCenterApproversRepository } from "./cost-center-approvers.repository";
import type { CostCenterApprover, CreateCostCenterApproverDto, UpdateCostCenterApproverDto } from "../models/cost-center-approver.model";

@Injectable()
export class CostCenterApproversService {
  constructor(private readonly repo: CostCenterApproversRepository) {}

  list(costCenterId: string): CostCenterApprover[] {
    return this.repo.findByCostCenter(costCenterId);
  }

  create(costCenterId: string, dto: CreateCostCenterApproverDto): CostCenterApprover {
    const existing = this.repo.findOne(costCenterId, dto.approverId);
    if (existing) throw new ConflictException("Approver already assigned to this cost center");
    return this.repo.create(costCenterId, dto);
  }

  update(costCenterId: string, approverId: string, dto: UpdateCostCenterApproverDto): CostCenterApprover {
    const result = this.repo.update(costCenterId, approverId, dto);
    if (!result) throw new NotFoundException("Assignment not found");
    return result;
  }

  delete(costCenterId: string, approverId: string): void {
    if (!this.repo.delete(costCenterId, approverId)) throw new NotFoundException("Assignment not found");
  }
}
