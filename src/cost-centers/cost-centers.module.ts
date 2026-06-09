import { Module } from "@nestjs/common";
import { CostCentersController } from "./cost-centers.controller";
import { CostCentersService } from "./cost-centers.service";
import { CostCentersRepository } from "./cost-centers.repository";

@Module({
  controllers: [CostCentersController],
  providers: [CostCentersService, CostCentersRepository],
})
export class CostCentersModule {}
