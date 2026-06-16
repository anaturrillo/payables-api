import { Module } from "@nestjs/common";
import { ApproversModule } from "./approvers/approvers.module";
import { CostCentersModule } from "./cost-centers/cost-centers.module";
import { ProductsModule } from "./products/products.module";
import { AuthModule } from "./auth/auth.module";
import { BillsModule } from "./bills/bills.module";

@Module({
  imports: [ApproversModule, CostCentersModule, ProductsModule, AuthModule, BillsModule],
})
export class AppModule {}
