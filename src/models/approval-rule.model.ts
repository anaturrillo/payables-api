export type FlowType = "parallel" | "sequential";
export type ConditionType = "product_category" | "amount" | "product_count";
export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export interface RuleCondition {
  id: string;
  ruleId: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: string;
}

export interface RuleApprover {
  id: string;
  ruleId: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  orderIndex: number;
}

export type ConditionLogic = "and" | "or";

export interface ApprovalRule {
  id: string;
  costCenterId: string;
  name: string;
  flowType: FlowType;
  conditionLogic: ConditionLogic;
  requiredApprovals: number;
  position: number;
  conditions: RuleCondition[];
  approvers: RuleApprover[];
  createdAt: string;
}

export interface ConditionDto {
  type: ConditionType;
  operator: ConditionOperator;
  value: string;
}

export interface RuleApproverDto {
  approverId: string;
  orderIndex: number;
}

export interface SaveApprovalRuleDto {
  name: string;
  flowType: FlowType;
  conditionLogic: ConditionLogic;
  requiredApprovals: number;
  conditions: ConditionDto[];
  approvers: RuleApproverDto[];
}
