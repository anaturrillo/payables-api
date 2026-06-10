export type ProductStatus = "active" | "inactive";

export const PRODUCT_CATEGORIES = [
  "software", "hardware", "services", "office_supplies",
  "travel", "marketing", "infrastructure", "other",
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  software:       "Software",
  hardware:       "Hardware",
  services:       "Services",
  office_supplies:"Office Supplies",
  travel:         "Travel & Expenses",
  marketing:      "Marketing",
  infrastructure: "Infrastructure",
  other:          "Other",
};

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  createdAt: string;
}

export type CreateProductDto = Omit<Product, "id" | "createdAt">;
export type UpdateProductDto = Partial<CreateProductDto>;
