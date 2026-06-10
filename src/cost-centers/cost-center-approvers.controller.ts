import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, BadRequestException } from "@nestjs/common";
import { CostCenterApproversService } from "./cost-center-approvers.service";
import type { CreateCostCenterApproverDto, UpdateCostCenterApproverDto } from "../models/cost-center-approver.model";

@Controller("cost-centers/:costCenterId/approvers")
export class CostCenterApproversController {
  constructor(private readonly service: CostCenterApproversService) {}

  @Get()
  list(@Param("costCenterId") costCenterId: string) {
    return this.service.list(costCenterId);
  }

  @Post()
  create(@Param("costCenterId") costCenterId: string, @Body() body: CreateCostCenterApproverDto) {
    if (!body.approverId) throw new BadRequestException("approverId is required");
    return this.service.create(costCenterId, body);
  }

  @Put(":approverId")
  update(
    @Param("costCenterId") costCenterId: string,
    @Param("approverId") approverId: string,
    @Body() body: UpdateCostCenterApproverDto,
  ) {
    return this.service.update(costCenterId, approverId, body);
  }

  @Delete(":approverId")
  @HttpCode(204)
  remove(@Param("costCenterId") costCenterId: string, @Param("approverId") approverId: string) {
    this.service.delete(costCenterId, approverId);
  }
}
