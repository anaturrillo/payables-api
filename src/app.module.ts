import { Module } from "@nestjs/common";
import { ApproversModule } from "./approvers/approvers.module";
import { CostCentersModule } from "./cost-centers/cost-centers.module";
import { ProductsModule } from "./products/products.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [ApproversModule, CostCentersModule, ProductsModule, AuthModule],
})
export class AppModule {}
