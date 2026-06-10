import { Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalRulesRepository } from "./approval-rules.repository";
import type { ApprovalRule, SaveApprovalRuleDto } from "../models/approval-rule.model";

@Injectable()
export class ApprovalRulesService {
  constructor(private readonly repo: ApprovalRulesRepository) {}

  list(costCenterId: string): ApprovalRule[] {
    return this.repo.findAll(costCenterId);
  }

  create(costCenterId: string, dto: SaveApprovalRuleDto): ApprovalRule {
    return this.repo.create(costCenterId, dto);
  }

  update(costCenterId: string, ruleId: string, dto: SaveApprovalRuleDto): ApprovalRule {
    const updated = this.repo.update(costCenterId, ruleId, dto);
    if (!updated) throw new NotFoundException("Rule not found");
    return updated;
  }

  delete(costCenterId: string, ruleId: string): void {
    const deleted = this.repo.delete(costCenterId, ruleId);
    if (!deleted) throw new NotFoundException("Rule not found");
  }
}
