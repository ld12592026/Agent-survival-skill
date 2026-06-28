import { createSurvivalSkill, type CreateSurvivalSkillOptions } from "./skill.js";
import type {
  FallbackPlan,
  SurvivalDecision,
  SurvivalInput,
} from "./types.js";

export interface SurvivalRuntimeHooks {
  onLog?: (line: string) => void;
  onDecision?: (decision: SurvivalDecision) => void | Promise<void>;
  onTopUpApproved?: (decision: SurvivalDecision) => void | Promise<void>;
  onFallback?: (fallbackPlan: FallbackPlan, decision: SurvivalDecision) => void | Promise<void>;
  onApprovalRequired?: (decision: SurvivalDecision) => void | Promise<void>;
}

export interface SurvivalRuntimeSkill {
  handleResourcePressure(input: SurvivalInput): Promise<SurvivalDecision>;
  guard(input: SurvivalInput): Promise<SurvivalDecision>;
}

export function useSurvivalSkill(
  options: CreateSurvivalSkillOptions,
  hooks: SurvivalRuntimeHooks = {},
): SurvivalRuntimeSkill {
  const skill = createSurvivalSkill(options);

  async function handleResourcePressure(
    input: SurvivalInput,
  ): Promise<SurvivalDecision> {
    const decision = await skill.handle(input);

    for (const line of decision.logs) {
      hooks.onLog?.(line);
    }

    await hooks.onDecision?.(decision);

    if (decision.action === "approved_topup") {
      await hooks.onTopUpApproved?.(decision);
    }

    if (decision.action === "downgrade_execution" && decision.fallbackPlan) {
      await hooks.onFallback?.(decision.fallbackPlan, decision);
    }

    if (decision.action === "pause_for_approval") {
      await hooks.onApprovalRequired?.(decision);
    }

    return decision;
  }

  return {
    handleResourcePressure,
    guard: handleResourcePressure,
  };
}
