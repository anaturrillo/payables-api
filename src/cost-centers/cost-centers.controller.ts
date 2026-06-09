import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, NotFoundException, BadRequestException } from "@nestjs/common";
import { CostCentersService } from "./cost-centers.service";
import type { CreateCostCenterDto, UpdateCostCenterDto } from "../models/cost-center.model";

@Controller("cost-centers")
export class CostCentersController {
  constructor(private readonly service: CostCentersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: CreateCostCenterDto) {
    if (!body.name || !body.code || !body.status) {
      throw new BadRequestException("name, code and status are required");
    }
    return this.service.create({
      name: body.name,
      code: body.code,
      description: body.description ?? "",
      status: body.status,
    });
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: UpdateCostCenterDto) {
    const item = this.service.update(id, body);
    if (!item) throw new NotFoundException("Cost center not found");
    return item;
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    if (!this.service.delete(id)) throw new NotFoundException("Cost center not found");
  }
}
