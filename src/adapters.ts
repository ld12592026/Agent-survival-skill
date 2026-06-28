import type { TopUpAdapter, TopUpRequest, TopUpResult } from "./types.js";

export class MockTopUpAdapter implements TopUpAdapter {
  constructor(
    private readonly behavior:
      | { mode: "approve"; provider?: string; costMultiplier?: number }
      | { mode: "approval_required" }
      | { mode: "deny"; reason?: string },
  ) {}

  async requestTopUp(input: TopUpRequest): Promise<TopUpResult> {
    if (this.behavior.mode === "approve") {
      const costMultiplier = this.behavior.costMultiplier ?? 0.000008;
      return {
        approved: true,
        grantedTokens: input.requestedTokens,
        costUsd: Number((input.requestedTokens * costMultiplier).toFixed(2)),
        provider: this.behavior.provider ?? "mock-provider",
      };
    }

    if (this.behavior.mode === "approval_required") {
      return {
        approved: false,
        requiresApproval: true,
        denialReason: "top-up exceeds the current auto-approval threshold",
      };
    }

    return {
      approved: false,
      denialReason: this.behavior.reason ?? "top-up denied by policy",
    };
  }
}
