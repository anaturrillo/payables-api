export type ApproverStatus = "active" | "inactive";

export interface Approver {
  id: string;
  name: string;
  email: string;
  status: ApproverStatus;
  createdAt: string;
}

export type CreateApproverDto = Omit<Approver, "id" | "createdAt"> & { password: string };
export type UpdateApproverDto = Partial<CreateApproverDto>;
