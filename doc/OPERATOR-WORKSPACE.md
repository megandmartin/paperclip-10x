# Operator workspace

The workspace is an additive UI for understanding the selected company’s work and deciding where to look next. It combines task, approval, agent and budget information while using Paperclip’s existing execution and approval system.

## Try it

From the repository root:

```sh
corepack pnpm install --frozen-lockfile
pnpm demo:operator
```

Open [the local demo](http://127.0.0.1:4178/operator-demo.html). The standalone demo uses synthetic records. It needs no database or agent credentials and makes no provider calls. `pnpm build:operator` creates self-contained HTML files under `ui/dist-operator/`: the merged `Paperclip-Workspace-10x-Winner.html` and the three `Paperclip-Workspace-V-A-Optimizer.html`, `Paperclip-Workspace-V-B-Reimaginer.html` and `Paperclip-Workspace-V-C-Converter.html` alternatives. Open these files directly to compare the interfaces.

Compare the approaches with these query strings:

| Direction | Query | Question it prioritizes |
| --- | --- | --- |
| Optimizer | `?direction=optimizer` | What work needs attention across the company? |
| Reimaginer | `?direction=reimaginer` | How is work moving between stages? |
| Converter: decision desk | `?direction=converter` | Which pending approval should I inspect next? |
| Merged workspace | No direction query | What needs attention, and what is happening around it? |

The decision desk gives one pending approval a full context area, lets you switch the selected request, and opens its inspectable detail. The merged workspace balances company context with the task list, board and contextual detail. These alternatives share one data model; no productivity improvement has been measured.

## Live mode

Run `pnpm dev`, select a company, then open **Overview** (`/:companyPrefix/operator`). The page reads the existing dashboard summary, agents, the 100 most recently updated tasks, approvals and project names for that company. Data normalization also filters records by company as a defensive UI measure; server authorization remains the access boundary.

Open a task, approval, agent or budget detail to continue in the existing Paperclip flow. This workspace does not approve requests, reassign work, wake agents or change budgets. Those actions retain their existing permissions and audit behavior.

## Data meaning

- Spend is the reported monthly total in cents, displayed as currency. It is not a forecast or a cost estimate.
- A zero budget is shown as no configured limit, rather than an exhausted budget.
- Agent state describes the reported agent status; a running agent is not proof of successful output.
- Company totals such as running agents, in-progress tasks and completed tasks come from the dashboard summary. “Ready for review,” search and status filters cover the loaded recent-task window. A full window carries a coverage notice; use the existing Tasks screen for the complete history. These counts are not a quality score.
- The sample company, task text and financial values in demo mode are illustrative.
- Live loading and request failures must remain visible. A failed request must not silently show sample data.

## Implementation boundary

The feature stays in `ui/src/features/operator-workspace/`; `OperatorWorkspacePage.tsx` connects it to company context and existing API clients. The page is additive to the current application and retains the original dashboard.

The contribution includes responsive styling, text equivalents for statuses, keyboard focus states and reduced-motion behavior. See [verification](VERIFICATION.md) for the exact checks and limits, [offline preview results](assets/operator-browser-check.json) for the 13 browser scenarios, and [board geometry results](assets/board-scroll-check.json) for the existing Kanban component. These checks do not establish physical-device acceptance, user preference or authenticated production behavior.

Current upstream contains more advanced decisions, recovery and output workflows than this fork’s base. The workspace should be adapted to those existing primitives before an upstream proposal. See [the review](UPSTREAM-REVIEW.md) and [contribution record](CONTRIBUTIONS.md).
