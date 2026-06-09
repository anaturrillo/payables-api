export type CostCenterStatus = "active" | "inactive";

export interface CostCenter {
  id: string;
  name: string;
  code: string;
  description: string;
  status: CostCenterStatus;
  createdAt: string;
}

export type CreateCostCenterDto = Omit<CostCenter, "id" | "createdAt">;
export type UpdateCostCenterDto = Partial<CreateCostCenterDto>;
