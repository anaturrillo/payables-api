export type BillStatus = "initiated" | "approved" | "rejected" | "paid";

export interface BillItem {
  id: string;
  billId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderIndex: number;
}

export interface BillApprover {
  approverId: string;
  approverName: string;
  approverEmail: string;
  orderIndex: number;
}

export interface Bill {
  id: string;
  number: string | null;
  supplier: string;
  amount: number;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  status: BillStatus;
  imagePath: string | null;
  costCenterId: string | null;
  costCenterName: string | null;
  ruleId: string | null;
  approvalRuleName: string | null;
  approvalFlowType: "parallel" | "sequential" | null;
  approvalReasoning: string | null;
  approvers: BillApprover[];
  items: BillItem[];
  createdAt: string;
}

export interface CreateBillItemDto {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BillApproverDto {
  approverId: string;
  orderIndex: number;
}

export interface CreateBillDto {
  number?: string | null;
  supplier: string;
  amount: number;
  invoiceDate?: string | null;
  dueDate?: string | null;
  paymentDate?: string | null;
  status?: BillStatus;
  imagePath?: string | null;
  costCenterId?: string | null;
  ruleId?: string | null;
  approvalReasoning?: string | null;
  approvers?: BillApproverDto[];
  items?: CreateBillItemDto[];
}

export type UpdateBillDto = Partial<CreateBillDto>;
