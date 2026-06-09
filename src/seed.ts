import "reflect-metadata";
import { CostCentersRepository } from "./cost-centers/cost-centers.repository";
import { ApproversRepository } from "./approvers/approvers.repository";
import { ProductsRepository } from "./products/products.repository";

async function seed() {
  const costCenters = new CostCentersRepository();
  const approvers = new ApproversRepository();
  const products = new ProductsRepository();

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

  await approvers.create({ name: "Ana Torres",     email: "ana.torres@company.com",     password: "password123", approvalLimit: 10000, status: "active" });
  await approvers.create({ name: "Juan Pérez",     email: "juan.perez@company.com",     password: "password123", approvalLimit: 50000, status: "active" });
  await approvers.create({ name: "María González", email: "maria.gonzalez@company.com", password: "password123", approvalLimit: null,  status: "active" });
  await approvers.create({ name: "Carlos Ramírez", email: "carlos.ramirez@company.com", password: "password123", approvalLimit: 5000,  status: "active" });
  await approvers.create({ name: "Laura Martínez", email: "laura.martinez@company.com", password: "password123", approvalLimit: 25000, status: "inactive" });

  cc; // cost centers available if needed for future relations

  products.create({ name: "MacBook Pro 14\"",   aliases: ["MBP14", "Apple Laptop", "Mac Pro"],               description: "Apple M3 Pro, 18GB RAM, 512GB SSD",          status: "active" });
  products.create({ name: "Standing Desk",       aliases: ["Sit-Stand Desk", "Adjustable Desk"],              description: "Electric height-adjustable desk, 160x80cm",  status: "active" });
  products.create({ name: "Office Chair",        aliases: ["Ergonomic Chair", "Desk Chair", "Herman Miller"], description: "Lumbar support, adjustable armrests",         status: "active" });
  products.create({ name: "Slack Pro",           aliases: ["Slack", "Team Chat"],                             description: "Annual per-seat subscription",                status: "active" });
  products.create({ name: "GitHub Enterprise",   aliases: ["GHE", "GitHub", "Git Enterprise"],               description: "Source control and CI/CD platform",           status: "active" });
  products.create({ name: "Figma Organization",  aliases: ["Figma", "Design Tool"],                          description: "Annual design platform license",              status: "active" });
  products.create({ name: "AWS Credits",         aliases: ["Amazon Web Services", "Cloud Credits", "AWS"],   description: "Monthly cloud infrastructure spend",          status: "active" });
  products.create({ name: "Catering Services",   aliases: ["Food", "Lunch", "Team Lunch"],                   description: "Office catering and team meals",              status: "inactive" });

  console.log("Database seeded.");
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
