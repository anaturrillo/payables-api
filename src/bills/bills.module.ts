import { Module } from "@nestjs/common";
import { BillsController } from "./bills.controller";
import { BillsRepository } from "./bills.repository";
import { OcrService } from "./ocr.service";
import { BillsService } from "./bills.service";
import { CostCenterSuggestionService } from "./cost-center-suggestion.service";
import { RuleMatcherService } from "./rule-matcher.service";
import { ProductsRepository } from "../products/products.repository";
import { CostCentersRepository } from "../cost-centers/cost-centers.repository";
import { ApprovalRulesRepository } from "../cost-centers/approval-rules.repository";

@Module({
  controllers: [BillsController],
  providers: [
    BillsRepository, OcrService, BillsService, CostCenterSuggestionService, RuleMatcherService,
    ProductsRepository, CostCentersRepository, ApprovalRulesRepository,
  ],
})
export class BillsModule {}
