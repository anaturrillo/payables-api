export type ProductStatus = "active" | "inactive";

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  status: ProductStatus;
  createdAt: string;
}

export type CreateProductDto = Omit<Product, "id" | "createdAt">;
export type UpdateProductDto = Partial<CreateProductDto>;
