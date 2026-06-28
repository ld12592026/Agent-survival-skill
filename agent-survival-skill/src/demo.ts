import { MockTopUpAdapter } from "./adapters.js";
import { createSurvivalSkill } from "./skill.js";
import type { SurvivalDecision, SurvivalInput, SurvivalPolicy } from "./types.js";

const basePolicy: SurvivalPolicy = {
  autoTopUpEnabled: true,
  autoApproveTopUpUsd: 5,
  maxTopUpTokens: 300000,
  fallbackModel: "gpt-economy",
  fallbackModelTier: "economy",
  chunkOnLowBudget: true,
  approvalRequiredAboveUsd: 5,
};

const scenario: SurvivalInput = {
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

async function run() {
  await runScenario("Scenario A: top-up approved", {
    policy: basePolicy,
    topUpAdapter: new MockTopUpAdapter({ mode: "approve", provider: "supply-alpha" }),
  });

  await runScenario("Scenario B: top-up denied, fallback engaged", {
    policy: basePolicy,
    topUpAdapter: new MockTopUpAdapter({ mode: "deny", reason: "budget pool depleted" }),
  });
}

async function runScenario(
  title: string,
  options: Parameters<typeof createSurvivalSkill>[0],
) {
  const skill = createSurvivalSkill(options);
  console.log(`\n=== ${title} ===`);
  await printRuntimePrelude();
  const decision = await skill.handle(scenario);
  printDecision(decision);
  await printRuntimeOutcome(decision);
}

async function printRuntimePrelude() {
  const lines = [
    "[runtime] booting research agent",
    `[runtime] task loaded: ${scenario.taskId}`,
    `[runtime] model selected: ${scenario.resourceState.currentModel}`,
    "[runtime] step 1/3: collecting source material",
    "[runtime] step 2/3: building synthesis outline",
    "[runtime] preflight check: estimating completion budget",
  ];

  for (const line of lines) {
    console.log(line);
    await sleep(60);
  }
}

function printDecision(decision: SurvivalDecision) {
  for (const line of decision.logs) {
    console.log(line);
  }

  console.log("[runtime] survival decision:", {
    action: decision.action,
    reason: decision.reason,
    predictedDeficitTokens: decision.predictedDeficitTokens,
    estimatedTopUpCostUsd: decision.estimatedTopUpCostUsd,
    grantedTokens: decision.grantedTokens,
    provider: decision.provider,
    fallbackPlan: decision.fallbackPlan,
    resumeMessage: decision.resumeMessage,
  });
}

async function printRuntimeOutcome(decision: SurvivalDecision) {
  if (decision.action === "approved_topup") {
    const lines = [
      "[runtime] step 3/3: completing long-form synthesis",
      "[runtime] report quality tier preserved",
      "[runtime] final status: task completed without interruption",
      "[runtime] takeaway: the agent did not crash. It adapted with fresh budget.",
    ];

    for (const line of lines) {
      console.log(line);
      await sleep(60);
    }
    return;
  }

  if (decision.action === "downgrade_execution") {
    const lines = [
      `[runtime] fallback model engaged: ${decision.fallbackPlan?.model}`,
      "[runtime] switching synthesis to chunked mode",
      "[runtime] delivering concise report instead of premium full-length draft",
      "[runtime] final status: task completed with degraded execution",
      "[runtime] takeaway: the agent did not crash. It adapted under constraint.",
    ];

    for (const line of lines) {
      console.log(line);
      await sleep(60);
    }
    return;
  }

  console.log("[runtime] final status: task paused pending approval");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
