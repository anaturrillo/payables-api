import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, NotFoundException, BadRequestException } from "@nestjs/common";
import { ApproversService } from "./approvers.service";
import type { CreateApproverDto, UpdateApproverDto } from "../models/approver.model";

@Controller("approvers")
export class ApproversController {
  constructor(private readonly service: ApproversService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: CreateApproverDto) {
    if (!body.name || !body.email || !body.password || !body.status) {
      throw new BadRequestException("name, email, password and status are required");
    }
    return this.service.create({ name: body.name, email: body.email, password: body.password, status: body.status });
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: UpdateApproverDto) {
    const approver = await this.service.update(id, body);
    if (!approver) throw new NotFoundException("Approver not found");
    return approver;
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    if (!this.service.delete(id)) throw new NotFoundException("Approver not found");
  }
}
