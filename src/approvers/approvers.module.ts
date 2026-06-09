import { Module } from "@nestjs/common";
import { ApproversController } from "./approvers.controller";
import { ApproversService } from "./approvers.service";
import { ApproversRepository } from "./approvers.repository";

@Module({
  controllers: [ApproversController],
  providers: [ApproversService, ApproversRepository],
  exports: [ApproversService],
})
export class ApproversModule {}
