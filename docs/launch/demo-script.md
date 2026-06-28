# Demo Script

Use this when recording a short terminal demo for a forum post, X thread, or README GIF.

## Recording Flow

1. Start with a clean terminal at the project root.
2. Run `npm run selftest`.
3. Run `npm run demo`.
4. Run `npm run example:runtime`.
5. End on the line: `final status: completed with degraded execution`.

## Voiceover

Most agents stop when they hit a budget or token limit. This skill turns that failure into a runtime decision.

In the first path, the agent predicts a token deficit, requests a top-up, receives budget, and keeps going.

In the second path, top-up is denied. Instead of crashing, the agent switches to a cheaper model, enables chunked execution, and still completes the task.

The point is not payment. The point is execution continuity.

## Screenshot Lines

Use these lines as screenshot anchors:

```text
[survival] predicted deficit: 220000 tokens
[survival] top-up approved: +220000 tokens
[survival] top-up denied under current policy
[survival] task resumed with degraded execution plan
[runtime] takeaway: the agent did not crash. It adapted under constraint.
```
