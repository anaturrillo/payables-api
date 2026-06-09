export type ApproverStatus = "active" | "inactive";

export interface Approver {
  id: string;
  name: string;
  email: string;
  approvalLimit: number | null;
  status: ApproverStatus;
  createdAt: string;
}

export type CreateApproverDto = Omit<Approver, "id" | "createdAt"> & { password: string };
export type UpdateApproverDto = Partial<CreateApproverDto>;
