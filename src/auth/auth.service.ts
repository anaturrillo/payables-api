import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { ApproversService } from "../approvers/approvers.service";
import type { Approver } from "../models/approver.model";

@Injectable()
export class AuthService {
  constructor(private readonly approversService: ApproversService) {}

  async login(email: string, password: string): Promise<Approver> {
    const record = this.approversService.findByEmailWithHash(email);
    if (!record) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, record.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const { passwordHash: _, ...user } = record;
    return user;
  }
}
