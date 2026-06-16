export type FlowType = "parallel" | "sequential";
export type ConditionType = "product_category" | "product" | "amount" | "product_count";
export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
export type ConditionLogic = "and" | "or";

export interface RuleCondition {
  id: string;
  groupId: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: string;
}

export interface ConditionGroup {
  id: string;
  ruleId: string;
  logic: ConditionLogic;
  orderIndex: number;
  conditions: RuleCondition[];
}

export interface RuleApprover {
  id: string;
  ruleId: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  orderIndex: number;
}

export interface ApprovalRule {
  id: string;
  costCenterId: string;
  name: string;
  flowType: FlowType;
  groupLogic: ConditionLogic;
  requiredApprovals: number;
  position: number;
  conditionGroups: ConditionGroup[];
  approvers: RuleApprover[];
  createdAt: string;
}

export interface ConditionDto {
  type: ConditionType;
  operator: ConditionOperator;
  value: string;
}

export interface ConditionGroupDto {
  logic: ConditionLogic;
  conditions: ConditionDto[];
}

export interface RuleApproverDto {
  approverId: string;
  orderIndex: number;
}

export interface SaveApprovalRuleDto {
  name: string;
  flowType: FlowType;
  groupLogic: ConditionLogic;
  requiredApprovals: number;
  conditionGroups: ConditionGroupDto[];
  approvers: RuleApproverDto[];
}
