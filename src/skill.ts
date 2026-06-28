import type {
  FallbackPlan,
  SurvivalDecision,
  SurvivalInput,
  SurvivalPolicy,
  TopUpAdapter,
} from "./types.js";

export interface CreateSurvivalSkillOptions {
  policy: SurvivalPolicy;
  topUpAdapter: TopUpAdapter;
  tokenCostPerUnitUsd?: number;
}

export class AgentSurvivalSkill {
  private readonly tokenCostPerUnitUsd: number;

  constructor(private readonly options: CreateSurvivalSkillOptions) {
    this.tokenCostPerUnitUsd = options.tokenCostPerUnitUsd ?? 0.000008;
  }

  async handle(input: SurvivalInput): Promise<SurvivalDecision> {
    const logs: string[] = [];
    const predictedDeficitTokens = Math.max(
      0,
      input.task.estimatedCompletionTokens - input.resourceState.remainingTokens,
    );

    if (predictedDeficitTokens === 0) {
      logs.push("[survival] resources look healthy for task completion");
      return {
        action: "continue",
        reason: "sufficient_resources",
        predictedDeficitTokens,
        estimatedTopUpCostUsd: 0,
        resumeMessage: "Continue with the current plan.",
        logs,
      };
    }

    logs.push("[survival] remaining budget too low for full task completion");
    logs.push(`[survival] predicted deficit: ${predictedDeficitTokens} tokens`);

    const estimatedTopUpCostUsd = Number(
      (predictedDeficitTokens * this.tokenCostPerUnitUsd).toFixed(2),
    );
    logs.push(`[survival] estimated top-up cost: $${estimatedTopUpCostUsd}`);

    const policy = this.options.policy;
    const autoApprovalLimitUsd = Math.min(
      policy.autoApproveTopUpUsd,
      policy.approvalRequiredAboveUsd,
    );
    const withinTopUpTokenLimit = predictedDeficitTokens <= policy.maxTopUpTokens;
    const withinAutoApprovalLimit = estimatedTopUpCostUsd <= autoApprovalLimitUsd;
    const canAttemptTopUp =
      policy.autoTopUpEnabled &&
      withinTopUpTokenLimit &&
      withinAutoApprovalLimit;

    if (canAttemptTopUp) {
      logs.push("[survival] checking policy...");
      logs.push("[survival] attempting top-up...");
      const topUp = await this.options.topUpAdapter.requestTopUp({
        requestedTokens: predictedDeficitTokens,
        maxCostUsd: estimatedTopUpCostUsd,
        reason: "predicted budget exhaustion before task completion",
      });

      if (topUp.approved) {
        logs.push(`[survival] top-up approved: +${topUp.grantedTokens} tokens`);
        logs.push("[survival] resuming task");
        return {
          action: "approved_topup",
          reason: "topup_approved",
          predictedDeficitTokens,
          estimatedTopUpCostUsd,
          grantedTokens: topUp.grantedTokens,
          provider: topUp.provider,
          resumeMessage: "Top-up granted. Resume the task using the existing plan.",
          logs,
        };
      }

      if (topUp.requiresApproval) {
        logs.push("[survival] top-up requires human approval");
        return {
          action: "pause_for_approval",
          reason: "topup_requires_approval",
          predictedDeficitTokens,
          estimatedTopUpCostUsd,
          resumeMessage: "Pause execution and request approval for additional resources.",
          logs,
        };
      }

      logs.push("[survival] top-up denied under current policy");
    } else if (
      policy.autoTopUpEnabled &&
      withinTopUpTokenLimit &&
      !withinAutoApprovalLimit
    ) {
      logs.push("[survival] top-up exceeds auto-approval limit");
      logs.push("[survival] pausing for approval");
      return {
        action: "pause_for_approval",
        reason: "topup_exceeds_auto_approval_limit",
        predictedDeficitTokens,
        estimatedTopUpCostUsd,
        resumeMessage: "Pause execution and request approval for additional resources.",
        logs,
      };
    } else {
      logs.push("[survival] top-up not allowed under current policy");
    }

    const fallbackPlan = this.createFallbackPlan(input, policy, predictedDeficitTokens);
    logs.push("[survival] generating fallback plan...");
    logs.push(`[survival] switching to ${fallbackPlan.model}`);
    if (fallbackPlan.chunkedExecution) {
      logs.push("[survival] enabling chunked execution");
    }
    logs.push("[survival] task resumed with degraded execution plan");

    return {
      action: "downgrade_execution",
      reason: "fallback_required",
      predictedDeficitTokens,
      estimatedTopUpCostUsd,
      resumeMessage: "Resume the task with a degraded but completion-oriented plan.",
      fallbackPlan,
      logs,
    };
  }

  private createFallbackPlan(
    input: SurvivalInput,
    policy: SurvivalPolicy,
    predictedDeficitTokens: number,
  ): FallbackPlan {
    const safeOutputBudget = Math.max(
      800,
      Math.floor(input.resourceState.remainingTokens * 0.35),
    );
    const note = input.task.allowDegradedCompletion
      ? `Use a cheaper path to absorb a deficit of ${predictedDeficitTokens} tokens.`
      : "Degraded completion is restricted; produce a partial output and request intervention.";

    return {
      model: policy.fallbackModel,
      modelTier: policy.fallbackModelTier,
      chunkedExecution: policy.chunkOnLowBudget,
      maxOutputTokens: safeOutputBudget,
      note,
    };
  }
}

export function createSurvivalSkill(
  options: CreateSurvivalSkillOptions,
): AgentSurvivalSkill {
  return new AgentSurvivalSkill(options);
}
