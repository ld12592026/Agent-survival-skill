import { MockTopUpAdapter, useSurvivalSkill } from "../src/index.js";
import type {
  FallbackPlan,
  SurvivalInput,
  SurvivalPolicy,
  SurvivalRuntimeSkill,
} from "../src/index.js";

class ResearchAgent {
  private model = "gpt-premium";
  private executionMode: "full" | "chunked" = "full";
  private readonly survival: SurvivalRuntimeSkill;

  constructor() {
    this.survival = useSurvivalSkill(
      {
        policy: createSurvivalPolicy(),
        topUpAdapter: new MockTopUpAdapter({
          mode: "deny",
          reason: "demo budget pool depleted",
        }),
      },
      {
        onLog: (line) => console.log(line),
        onFallback: (fallbackPlan) => this.switchToFallback(fallbackPlan),
        onApprovalRequired: () => this.pauseForApproval(),
      },
    );
  }

  async runLongReportTask() {
    this.log("booting research agent");
    this.log(`model selected: ${this.model}`);
    this.log("step 1/3: collect source material");
    this.log("step 2/3: build synthesis outline");
    this.log("preflight: estimate remaining resource budget");

    const decision = await this.survival.guard(this.createRuntimeContext());

    if (decision.action === "approved_topup") {
      this.log("step 3/3: write premium long-form synthesis");
      this.log("final status: completed without interruption");
      return;
    }

    if (decision.action === "downgrade_execution") {
      this.log(`step 3/3: write report with ${this.executionMode} execution`);
      this.log("final status: completed with degraded execution");
      return;
    }

    if (decision.action === "pause_for_approval") {
      this.log("final status: paused for resource approval");
      return;
    }

    this.log("step 3/3: continue normal execution");
    this.log("final status: completed with existing resources");
  }

  switchToFallback(fallbackPlan: FallbackPlan) {
    this.model = fallbackPlan.model;
    this.executionMode = fallbackPlan.chunkedExecution ? "chunked" : "full";
    this.log(`fallback applied: model=${this.model}, mode=${this.executionMode}`);
  }

  pauseForApproval() {
    this.log("approval request emitted to operator queue");
  }

  private createRuntimeContext(): SurvivalInput {
    return {
      agentId: "agent_research_001",
      taskId: "task_long_report_42",
      resourceState: {
        remainingTokens: 80000,
        remainingBudgetUsd: 1.2,
        currentModel: this.model,
        currentModelTier: "premium",
      },
      task: {
        estimatedNextStepTokens: 120000,
        estimatedCompletionTokens: 300000,
        qualityTier: "premium",
        allowDegradedCompletion: true,
      },
    };
  }

  private log(message: string) {
    console.log(`[agent] ${message}`);
  }
}

function createSurvivalPolicy(): SurvivalPolicy {
  return {
    autoTopUpEnabled: true,
    autoApproveTopUpUsd: 5,
    maxTopUpTokens: 300000,
    fallbackModel: "gpt-economy",
    fallbackModelTier: "economy",
    chunkOnLowBudget: true,
    approvalRequiredAboveUsd: 5,
  };
}

const agent = new ResearchAgent();
await agent.runLongReportTask();
