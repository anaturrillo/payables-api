export interface CostCenterApprover {
  id: string;
  costCenterId: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  minAmount: number | null;
  maxAmount: number | null;
}

export interface CreateCostCenterApproverDto {
  approverId: string;
  minAmount?: number | null;
  maxAmount?: number | null;
}

export interface UpdateCostCenterApproverDto {
  minAmount?: number | null;
  maxAmount?: number | null;
}
