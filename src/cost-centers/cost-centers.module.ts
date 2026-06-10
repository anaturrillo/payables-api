import { Module } from "@nestjs/common";
import { CostCentersController } from "./cost-centers.controller";
import { CostCentersService } from "./cost-centers.service";
import { CostCentersRepository } from "./cost-centers.repository";
import { ApprovalRulesController } from "./approval-rules.controller";
import { ApprovalRulesService } from "./approval-rules.service";
import { ApprovalRulesRepository } from "./approval-rules.repository";

@Module({
  controllers: [CostCentersController, ApprovalRulesController],
  providers: [CostCentersService, CostCentersRepository, ApprovalRulesService, ApprovalRulesRepository],
})
export class CostCentersModule {}
