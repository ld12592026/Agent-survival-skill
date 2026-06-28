export type SurvivalAction =
  | "continue"
  | "approved_topup"
  | "downgrade_execution"
  | "pause_for_approval"
  | "deny";

export interface ResourceState {
  remainingTokens: number;
  remainingBudgetUsd: number;
  currentModel: string;
  currentModelTier: "premium" | "standard" | "economy";
}

export interface TaskRequirements {
  estimatedNextStepTokens: number;
  estimatedCompletionTokens: number;
  qualityTier: "premium" | "standard" | "economy";
  allowDegradedCompletion: boolean;
}

export interface SurvivalPolicy {
  autoTopUpEnabled: boolean;
  autoApproveTopUpUsd: number;
  maxTopUpTokens: number;
  fallbackModel: string;
  fallbackModelTier: "standard" | "economy";
  chunkOnLowBudget: boolean;
  approvalRequiredAboveUsd: number;
}

export interface TopUpRequest {
  requestedTokens: number;
  maxCostUsd: number;
  reason: string;
}

export interface TopUpResult {
  approved: boolean;
  grantedTokens?: number;
  costUsd?: number;
  provider?: string;
  requiresApproval?: boolean;
  denialReason?: string;
}

export interface TopUpAdapter {
  requestTopUp(input: TopUpRequest): Promise<TopUpResult>;
}

export interface SurvivalInput {
  agentId: string;
  taskId: string;
  resourceState: ResourceState;
  task: TaskRequirements;
}

export interface FallbackPlan {
  model: string;
  modelTier: "standard" | "economy";
  chunkedExecution: boolean;
  maxOutputTokens: number;
  note: string;
}

export interface SurvivalDecision {
  action: SurvivalAction;
  reason: string;
  predictedDeficitTokens: number;
  estimatedTopUpCostUsd: number;
  grantedTokens?: number;
  provider?: string;
  resumeMessage: string;
  fallbackPlan?: FallbackPlan;
  logs: string[];
}
