import "reflect-metadata";
import { CostCentersRepository } from "./cost-centers/cost-centers.repository";
import { ApproversRepository } from "./approvers/approvers.repository";
import { ProductsRepository } from "./products/products.repository";
import { ApprovalRulesRepository } from "./cost-centers/approval-rules.repository";

async function seed() {
  const costCenters = new CostCentersRepository();
  const approvers = new ApproversRepository();
  const products = new ProductsRepository();
  const rules = new ApprovalRulesRepository();

  if (costCenters.findAll().length > 0) {
    console.log("Database already has data — skipping.");
    return;
  }

  const cc = [
    costCenters.create({ name: "Marketing",      code: "MKT-001", description: "Brand, campaigns and growth",    status: "active" }),
    costCenters.create({ name: "Engineering",     code: "ENG-001", description: "Product and infrastructure",     status: "active" }),
    costCenters.create({ name: "Finance",         code: "FIN-001", description: "Accounting and treasury",        status: "active" }),
    costCenters.create({ name: "Human Resources", code: "HR-001",  description: "Talent and people ops",          status: "active" }),
    costCenters.create({ name: "Operations",      code: "OPS-001", description: "Logistics and facilities",       status: "inactive" }),
  ];

  const ap = [
    await approvers.create({ name: "Ana Torres",     email: "ana.torres@company.com",     password: "password123", status: "active" }),
    await approvers.create({ name: "Juan Pérez",     email: "juan.perez@company.com",     password: "password123", status: "active" }),
    await approvers.create({ name: "María González", email: "maria.gonzalez@company.com", password: "password123", status: "active" }),
    await approvers.create({ name: "Carlos Ramírez", email: "carlos.ramirez@company.com", password: "password123", status: "active" }),
    await approvers.create({ name: "Laura Martínez", email: "laura.martinez@company.com", password: "password123", status: "inactive" }),
  ];

  // Marketing rules
  rules.create(cc[0].id, {
    name: "Small purchases",
    flowType: "parallel",
    conditionLogic: "and",
    requiredApprovals: 1,
    conditions: [{ type: "amount", operator: "lt", value: "1000" }],
    approvers: [{ approverId: ap[0].id, orderIndex: 0 }],
  });
  rules.create(cc[0].id, {
    name: "Large purchases",
    flowType: "sequential",
    conditionLogic: "and",
    requiredApprovals: 2,
    conditions: [{ type: "amount", operator: "gte", value: "1000" }],
    approvers: [
      { approverId: ap[0].id, orderIndex: 0 },
      { approverId: ap[3].id, orderIndex: 1 },
    ],
  });

  // Engineering rules
  rules.create(cc[1].id, {
    name: "Software & tools",
    flowType: "parallel",
    conditionLogic: "and",
    requiredApprovals: 1,
    conditions: [{ type: "product_category", operator: "eq", value: "software" }],
    approvers: [{ approverId: ap[1].id, orderIndex: 0 }],
  });
  rules.create(cc[1].id, {
    name: "High-value purchases",
    flowType: "sequential",
    conditionLogic: "and",
    requiredApprovals: 2,
    conditions: [{ type: "amount", operator: "gt", value: "10000" }],
    approvers: [
      { approverId: ap[1].id, orderIndex: 0 },
      { approverId: ap[2].id, orderIndex: 1 },
    ],
  });

  // Finance rules
  rules.create(cc[2].id, {
    name: "Standard approval",
    flowType: "parallel",
    conditionLogic: "and",
    requiredApprovals: 1,
    conditions: [{ type: "amount", operator: "lte", value: "50000" }],
    approvers: [{ approverId: ap[2].id, orderIndex: 0 }],
  });
  rules.create(cc[2].id, {
    name: "Executive approval",
    flowType: "sequential",
    conditionLogic: "and",
    requiredApprovals: 2,
    conditions: [{ type: "amount", operator: "gt", value: "50000" }],
    approvers: [
      { approverId: ap[2].id, orderIndex: 0 },
      { approverId: ap[1].id, orderIndex: 1 },
    ],
  });

  products.create({ name: "MacBook Pro 14\"",   category: "hardware",        aliases: ["MBP14", "Apple Laptop"],                          description: "Apple M3 Pro, 18GB RAM, 512GB SSD",         status: "active" });
  products.create({ name: "Standing Desk",       category: "office_supplies", aliases: ["Sit-Stand Desk", "Adjustable Desk"],             description: "Electric height-adjustable desk, 160x80cm", status: "active" });
  products.create({ name: "Office Chair",        category: "office_supplies", aliases: ["Ergonomic Chair", "Herman Miller"],              description: "Lumbar support, adjustable armrests",        status: "active" });
  products.create({ name: "Slack Pro",           category: "software",        aliases: ["Slack", "Team Chat"],                            description: "Annual per-seat subscription",               status: "active" });
  products.create({ name: "GitHub Enterprise",   category: "software",        aliases: ["GHE", "GitHub"],                                 description: "Source control and CI/CD platform",          status: "active" });
  products.create({ name: "Figma Organization",  category: "software",        aliases: ["Figma", "Design Tool"],                          description: "Annual design platform license",             status: "active" });
  products.create({ name: "AWS Credits",         category: "infrastructure",  aliases: ["Amazon Web Services", "Cloud Credits", "AWS"],   description: "Monthly cloud infrastructure spend",         status: "active" });
  products.create({ name: "Catering Services",   category: "services",        aliases: ["Food", "Lunch", "Team Lunch"],                   description: "Office catering and team meals",             status: "inactive" });

  console.log("Database seeded.");
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
