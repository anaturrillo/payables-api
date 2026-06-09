import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ApproversModule } from "../approvers/approvers.module";

@Module({
  imports: [ApproversModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
