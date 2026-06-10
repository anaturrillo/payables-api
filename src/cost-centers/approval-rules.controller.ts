import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from "@nestjs/common";
import { ApprovalRulesService } from "./approval-rules.service";
import type { SaveApprovalRuleDto } from "../models/approval-rule.model";

@Controller("cost-centers/:costCenterId/rules")
export class ApprovalRulesController {
  constructor(private readonly service: ApprovalRulesService) {}

  @Get()
  list(@Param("costCenterId") costCenterId: string) {
    return this.service.list(costCenterId);
  }

  @Post()
  create(@Param("costCenterId") costCenterId: string, @Body() body: SaveApprovalRuleDto) {
    return this.service.create(costCenterId, body);
  }

  @Put(":ruleId")
  update(
    @Param("costCenterId") costCenterId: string,
    @Param("ruleId") ruleId: string,
    @Body() body: SaveApprovalRuleDto,
  ) {
    return this.service.update(costCenterId, ruleId, body);
  }

  @Delete(":ruleId")
  @HttpCode(204)
  remove(@Param("costCenterId") costCenterId: string, @Param("ruleId") ruleId: string) {
    this.service.delete(costCenterId, ruleId);
  }
}
