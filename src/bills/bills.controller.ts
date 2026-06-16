import {
  Body, Controller, Delete, Get, HttpCode,
  NotFoundException, Param, Post, Put,
  UploadedFile, UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { existsSync } from "fs";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { BillsRepository } from "./bills.repository";
import { OcrService } from "./ocr.service";
import { BillsService } from "./bills.service";
import { CostCenterSuggestionService } from "./cost-center-suggestion.service";
import { RuleMatcherService } from "./rule-matcher.service";
import { ProductsRepository } from "../products/products.repository";
import { CostCentersRepository } from "../cost-centers/cost-centers.repository";
import { ApprovalRulesRepository } from "../cost-centers/approval-rules.repository";
import type { CreateBillDto, UpdateBillDto } from "../models/bill.model";

interface SuggestRuleBody {
  costCenterId: string;
  amount: number;
  productIds: string[];
  productCategories: string[];
  itemCount: number;
}

interface SuggestCostCenterBody {
  amount: number;
  productIds: string[];
  productCategories: string[];
  itemCount: number;
}

@Controller("bills")
export class BillsController {
  constructor(
    private readonly repo: BillsRepository,
    private readonly ocrService: OcrService,
    private readonly billsService: BillsService,
    private readonly suggestionService: CostCenterSuggestionService,
    private readonly ruleMatcher: RuleMatcherService,
    private readonly productsRepo: ProductsRepository,
    private readonly costCentersRepo: CostCentersRepository,
    private readonly rulesRepo: ApprovalRulesRepository,
  ) {}

  private multerOptions = {
    storage: diskStorage({
      destination: join(process.cwd(), "uploads"),
      filename: (_req: unknown, file: Express.Multer.File, cb: (e: null, n: string) => void) => {
        const ext = extname(file.originalname) || ".jpg";
        cb(null, `invoice-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: null, ok: boolean) => void) => {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  };

  private async processOcrFromPath(filePath: string, filename: string) {
    const extracted = await this.ocrService.extractInvoice(filePath);
    const products = this.productsRepo.findAll();
    const lineItems = extracted?.lineItems
      ? this.billsService.matchProducts(extracted.lineItems, products)
      : [];

    const costCenters = this.costCentersRepo.findAll().map((cc) => ({
      ...cc,
      rules: this.rulesRepo.findAll(cc.id),
    }));

    const invoiceData = {
      amount:            extracted?.totalAmount ?? 0,
      productIds:        lineItems.map((li) => li.matchedProductId).filter((id): id is string => !!id),
      productCategories: lineItems.map((li) => li.matchedProductCategory).filter((c): c is string => !!c),
      itemCount:         lineItems.length,
    };

    const deterministicMatch = this.ruleMatcher.findMatchingCostCenter(costCenters, invoiceData);

    let suggestedCostCenterId:   string | null = null;
    let suggestedCostCenterName: string | null = null;
    let suggestedRuleId:         string | null = null;
    let suggestedRuleName:       string | null = null;
    let suggestedApprovers:      unknown[]     = [];
    let suggestionReasoning:     string | null = null;

    if (deterministicMatch) {
      suggestedCostCenterId   = deterministicMatch.costCenterId;
      suggestedCostCenterName = deterministicMatch.costCenterName;
      suggestedRuleId         = deterministicMatch.rule.id;
      suggestedRuleName       = deterministicMatch.rule.name;
      suggestedApprovers      = deterministicMatch.rule.approvers;
      suggestionReasoning     = `Matched rule: ${deterministicMatch.rule.name}`;
    } else if (extracted) {
      const suggestion = await this.suggestionService.suggest(
        { vendor: extracted.vendor, totalAmount: extracted.totalAmount, lineItems },
        costCenters,
        products.map((p) => ({ id: p.id, name: p.name })),
      );
      if (suggestion) {
        suggestedCostCenterId   = suggestion.costCenterId;
        suggestedCostCenterName = suggestion.costCenterName;
        suggestionReasoning     = suggestion.reasoning;
        if (suggestion.costCenterId) {
          const ccRules = costCenters.find((cc) => cc.id === suggestion.costCenterId)?.rules ?? [];
          const rule = this.ruleMatcher.findMatchingRule(ccRules, invoiceData);
          if (rule) {
            suggestedRuleId     = rule.id;
            suggestedRuleName   = rule.name;
            suggestedApprovers  = rule.approvers;
          }
        }
      }
    }

    return {
      imageFilename: filename,
      extracted: extracted ? { ...extracted, lineItems } : null,
      suggestedCostCenterId,
      suggestedCostCenterName,
      suggestedRuleId,
      suggestedRuleName,
      suggestedApprovers,
      suggestionReasoning,
    };
  }

  @Post("upload-image")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: join(process.cwd(), "uploads"),
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname) || ".jpg";
        cb(null, `invoice-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("No valid image file uploaded (jpeg/png/gif/webp, max 10MB)");
    return { filename: file.filename };
  }

  @Post("process-ocr")
  async processOcr(@Body() body: { filename: string }) {
    if (!body.filename) throw new BadRequestException("filename required");
    const filePath = join(process.cwd(), "uploads", body.filename);
    if (!existsSync(filePath)) throw new BadRequestException("File not found");
    return this.processOcrFromPath(filePath, body.filename);
  }

  @Post("ocr")
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: join(process.cwd(), "uploads"),
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname) || ".jpg";
        cb(null, `invoice-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async ocr(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException("No valid image file uploaded (jpeg/png/gif/webp, max 10MB)");
    return this.processOcrFromPath(file.path, file.filename);
  }

  @Post("suggest-cost-center")
  suggestCostCenter(@Body() body: SuggestCostCenterBody) {
    const costCenters = this.costCentersRepo.findAll().map((cc) => ({
      ...cc,
      rules: this.rulesRepo.findAll(cc.id),
    }));
    const invoice = {
      amount:            body.amount            ?? 0,
      productIds:        body.productIds        ?? [],
      productCategories: body.productCategories ?? [],
      itemCount:         body.itemCount         ?? 0,
    };
    const match = this.ruleMatcher.findMatchingCostCenter(costCenters, invoice);
    if (!match) return { costCenterId: null, costCenterName: null, ruleId: null, ruleName: null, approvers: [] };
    return {
      costCenterId:   match.costCenterId,
      costCenterName: match.costCenterName,
      ruleId:         match.rule.id,
      ruleName:       match.rule.name,
      approvers:      match.rule.approvers,
    };
  }

  @Post("suggest-rule")
  suggestRule(@Body() body: SuggestRuleBody) {
    if (!body.costCenterId) return { ruleId: null, ruleName: null, approvers: [] };
    const rules = this.rulesRepo.findAll(body.costCenterId);
    const matched = this.ruleMatcher.findMatchingRule(rules, {
      amount:            body.amount            ?? 0,
      productIds:        body.productIds        ?? [],
      productCategories: body.productCategories ?? [],
      itemCount:         body.itemCount         ?? 0,
    });
    if (!matched) return { ruleId: null, ruleName: null, approvers: [] };
    return { ruleId: matched.id, ruleName: matched.name, approvers: matched.approvers };
  }

  @Get()
  list() {
    return this.repo.findAll();
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    const bill = this.repo.findById(id);
    if (!bill) throw new NotFoundException();
    return bill;
  }

  @Post()
  create(@Body() body: CreateBillDto) {
    return this.repo.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: UpdateBillDto) {
    const bill = this.repo.update(id, body);
    if (!bill) throw new NotFoundException();
    return bill;
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    const deleted = this.repo.delete(id);
    if (!deleted) throw new NotFoundException();
  }
}
