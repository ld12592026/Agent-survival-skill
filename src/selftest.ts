import { MockTopUpAdapter } from "./adapters.js";
import { createSurvivalSkill } from "./skill.js";
import { useSurvivalSkill } from "./runtime.js";
import type {
  SurvivalAction,
  SurvivalInput,
  SurvivalPolicy,
} from "./types.js";

const basePolicy: SurvivalPolicy = {
  autoTopUpEnabled: true,
  autoApproveTopUpUsd: 5,
  maxTopUpTokens: 300000,
  fallbackModel: "gpt-economy",
  fallbackModelTier: "economy",
  chunkOnLowBudget: true,
  approvalRequiredAboveUsd: 5,
};

const shortageScenario: SurvivalInput = {
  agentId: "agent_research_001",
  taskId: "task_long_report_42",
  resourceState: {
    remainingTokens: 80000,
    remainingBudgetUsd: 1.2,
    currentModel: "gpt-premium",
    currentModelTier: "premium",
  },
  task: {
    estimatedNextStepTokens: 120000,
    estimatedCompletionTokens: 300000,
    qualityTier: "premium",
    allowDegradedCompletion: true,
  },
};

const healthyScenario: SurvivalInput = {
  ...shortageScenario,
  resourceState: {
    ...shortageScenario.resourceState,
    remainingTokens: 400000,
  },
};

async function runSelfTest() {
  const results = [
    await scenario("continues when resources are sufficient", "continue", async () => {
      const skill = createSurvivalSkill({
        policy: basePolicy,
        topUpAdapter: new MockTopUpAdapter({ mode: "approve" }),
      });
      return skill.handle(healthyScenario);
    }),
    await scenario("approves top-up inside policy limits", "approved_topup", async () => {
      const skill = createSurvivalSkill({
        policy: basePolicy,
        topUpAdapter: new MockTopUpAdapter({ mode: "approve", provider: "selftest-provider" }),
      });
      return skill.handle(shortageScenario);
    }),
    await scenario("falls back when top-up is denied", "downgrade_execution", async () => {
      const skill = createSurvivalSkill({
        policy: basePolicy,
        topUpAdapter: new MockTopUpAdapter({ mode: "deny", reason: "budget pool depleted" }),
      });
      return skill.handle(shortageScenario);
    }),
    await scenario("pauses when top-up exceeds approval limit", "pause_for_approval", async () => {
      const skill = createSurvivalSkill({
        policy: {
          ...basePolicy,
          autoApproveTopUpUsd: 1,
          approvalRequiredAboveUsd: 1,
        },
        topUpAdapter: new MockTopUpAdapter({ mode: "approve" }),
      });
      return skill.handle(shortageScenario);
    }),
    await scenario("runs through embeddable runtime hooks", "downgrade_execution", async () => {
      let fallbackCalled = false;
      const runtimeSkill = useSurvivalSkill(
        {
          policy: basePolicy,
          topUpAdapter: new MockTopUpAdapter({ mode: "deny" }),
        },
        {
          onFallback: () => {
            fallbackCalled = true;
          },
        },
      );

      const decision = await runtimeSkill.guard(shortageScenario);
      assert(fallbackCalled, "expected onFallback hook to be called");
      return decision;
    }),
  ];

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    console.error(`\n[selftest] ${failed.length} scenario(s) failed`);
    process.exitCode = 1;
    return;
  }

  console.log("\n[selftest] all survival scenarios passed");
}

async function scenario(
  name: string,
  expectedAction: SurvivalAction,
  run: () => Promise<{ action: SurvivalAction }>,
) {
  try {
    const decision = await run();
    assertEqual(decision.action, expectedAction, name);
    console.log(`[selftest] PASS ${name}`);
    return { name, passed: true };
  } catch (error) {
    console.error(`[selftest] FAIL ${name}`);
    console.error(error);
    return { name, passed: false };
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}

runSelfTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
