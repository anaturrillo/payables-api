import { Injectable } from "@nestjs/common";
import { ApproversRepository } from "./approvers.repository";
import type { Approver, CreateApproverDto, UpdateApproverDto } from "../models/approver.model";

@Injectable()
export class ApproversService {
  constructor(private readonly repo: ApproversRepository) {}

  list(): Approver[] { return this.repo.findAll(); }
  async create(dto: CreateApproverDto): Promise<Approver> { return this.repo.create(dto); }
  async update(id: string, dto: UpdateApproverDto): Promise<Approver | null> { return (await this.repo.update(id, dto)) ?? null; }
  delete(id: string): boolean { return this.repo.delete(id); }
  findByEmailWithHash(email: string) { return this.repo.findByEmailWithHash(email); }
}
