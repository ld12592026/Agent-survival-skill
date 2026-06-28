# Agent Survival Skill

Keep your agent running when token or budget capacity runs out.

Most agents fail hard when they hit a resource limit. This skill turns that failure point into a runtime decision:

**The agent did not crash. It adapted.**

## What It Does

- Detects predicted token deficits before the agent gets stuck.
- Requests a top-up when policy allows it.
- Pauses for approval when a request crosses budget policy.
- Falls back to a cheaper model when top-up is denied.
- Enables chunked execution so the task can still finish.
- Returns a structured decision that an agent runtime can act on.

## Why This Is Different

This is not a wallet, checkout page, or payment dashboard.

It is an agent-native survival skill. The first job is execution continuity: when resources are low, the agent gets a decision instead of a crash.

## Quick Start

```bash
npm install
npm run build
npm run selftest
npm run demo
```

## Demo

The CLI demo behaves like a tiny agent runtime:

```bash
npm run demo
```

It shows two paths:

- top-up approved -> task resumes normally
- top-up denied -> agent switches to a cheaper model, enables chunked execution, and completes the task

For a more integration-style example:

```bash
npm run example:runtime
```

## Self-Test

```bash
npm run selftest
```

Covered paths:

- enough resources -> `continue`
- approved top-up -> `approved_topup`
- denied top-up -> `downgrade_execution`
- over approval limit -> `pause_for_approval`
- runtime hook execution

## Runtime Integration

Use `useSurvivalSkill()` when you want the skill to behave like middleware inside an agent runtime.

```ts
import { MockTopUpAdapter, useSurvivalSkill } from "agent-survival-skill";

const survival = useSurvivalSkill(
  {
    policy: {
      autoTopUpEnabled: true,
      autoApproveTopUpUsd: 5,
      maxTopUpTokens: 300000,
      fallbackModel: "gpt-economy",
      fallbackModelTier: "economy",
      chunkOnLowBudget: true,
      approvalRequiredAboveUsd: 5
    },
    topUpAdapter: new MockTopUpAdapter({ mode: "deny" })
  },
  {
    onLog: (line) => console.log(line),
    onFallback: (fallbackPlan) => agent.switchToFallback(fallbackPlan),
    onApprovalRequired: (decision) => agent.pauseForApproval(decision),
    onTopUpApproved: (decision) => agent.resumeWithBudget(decision)
  }
);

const decision = await survival.guard(runtimeContext);
```

A runnable version lives in `examples/runtime-agent.ts`.

## Core Decision Actions

| Action | Meaning |
| --- | --- |
| `continue` | Existing resources are enough. |
| `approved_topup` | More resource was approved and the task can resume normally. |
| `downgrade_execution` | Top-up failed or was disallowed, so the agent should use a fallback plan. |
| `pause_for_approval` | The request exceeded policy and needs a human or operator approval step. |

## Launch Assets

Useful files for making the project presentable:

- `docs/launch/demo-script.md`: recording flow and voiceover notes
- `docs/launch/demo-output.txt`: generated terminal transcript
- `docs/launch/forum-post.md`: launch post draft for forums or social posts

Regenerate the transcript with:

```bash
npm run record:demo
```

## Project Structure

- `src/skill.ts`: core decision engine
- `src/runtime.ts`: embeddable runtime wrapper with hooks
- `src/selftest.ts`: self-test scenarios for survival paths
- `src/types.ts`: skill contracts and decision types
- `src/adapters.ts`: mock top-up adapter
- `src/demo.ts`: runtime-style CLI demo
- `examples/runtime-agent.ts`: runnable agent integration example

## Next Build Steps

- Replace `MockTopUpAdapter` with a real quota or budget service.
- Feed actual token telemetry into shortage prediction.
- Add provider switching instead of a single fallback model.
- Package the skill as an MCP tool, plugin, or runtime extension.
