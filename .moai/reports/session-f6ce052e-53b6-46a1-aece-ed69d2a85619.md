# Session Summary: f6ce052e-53b6-46a1-aece-ed69d2a85619

**Total Hook Invocations:** 57

**Session Duration:** 12m17.347s

## Event Breakdown

- **InstructionsLoaded**: 2
- **PermissionRequest**: 3
- **PostToolUse**: 3
- **PostToolUseFailure**: 1
- **PreToolUse**: 37
- **Stop**: 5
- **SubagentStop**: 2
- **UserPromptSubmit**: 4

## Decision Breakdown

- **allow**: 37

## Top 5 Slowest Hook Executions

| # | Event | Handler | Tool | Duration (ms) |
|---|-------|---------|------|---------------|
| 1 | PostToolUse | *hook.postToolHandler | Edit | 21 |
| 2 | PostToolUse | *hook.postToolHandler | Write | 17 |
| 3 | PostToolUse | *hook.postToolHandler | Edit | 12 |
| 4 | Stop | *hook.stopHandler |  | 11 |
| 5 | Stop | *hook.stopHandler |  | 10 |

## Errors (0)

_No errors recorded._

