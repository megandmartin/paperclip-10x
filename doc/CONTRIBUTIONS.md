# Contribution record

Date: 3 November 2026. Project: `megandmartin/paperclip-10x`.

This record makes the fork’s additions inspectable and separates them from inherited Paperclip software.

## This contribution

| Deliverable | Inspectable source | Purpose |
| --- | --- | --- |
| Existing board usability fix | [`KanbanBoard.tsx`](../ui/src/components/KanbanBoard.tsx) and [`KanbanBoard.test.tsx`](../ui/src/components/KanbanBoard.test.tsx) | Bound the scroll area, keep stage headers visible and provide a keyboard-accessible region; relates to [upstream #18613](https://github.com/paperclipai/paperclip/issues/18613) |
| Operator workspace | [`ui/src/features/operator-workspace/`](../ui/src/features/operator-workspace/) | A coherent view of work, approvals, agents and monthly spend |
| Company integration | [`OperatorWorkspacePage.tsx`](../ui/src/pages/OperatorWorkspacePage.tsx) | Connect the workspace to existing company-scoped read APIs and detail routes |
| Standalone demo | [`ui/operator-demo.html`](../ui/operator-demo.html) | Let people evaluate the interface without starting a database or connecting agents; source: [`Demo.tsx`](../ui/src/features/operator-workspace/Demo.tsx) |
| Alternatives and rationale | [Design comparison](plans/2026-11-03-operator-workspace.md) | Explain the tradeoffs behind three approaches and the merged result |
| Source-grounded assessment | [Upstream review](UPSTREAM-REVIEW.md) | Identify useful next work while accounting for current upstream capabilities |
| Fork automation | [Operator workspace CI](../.github/workflows/operator-workspace.yml) | Check this contribution without running inherited upstream publishing jobs |
| Repository presentation | [`README.md`](../README.md) | Explain the fork’s value with a real screenshot and reproducible entry point |

Megan (@megandmartin) supplied the product ambition and design direction: make Paperclip more usable, pleasant and presentable. Implementation, documentation and review were AI-assisted through Codex. This record does not attribute manual authorship of every line to Megan or imply that upstream maintainers accepted the contribution.

## Inherited work

Paperclip’s orchestration engine, backend, schema, adapters, application and existing workflows belong to Paperclip Labs and the upstream contributors under the [MIT license](../LICENSE).

The starting fork commit is `5c117257`. At the initial 3 November 2026 review, GitHub reported this fork as 0 commits ahead and 3,383 behind upstream. This is a dated discovery snapshot, not a persistent synchronization guarantee.

The [historical upstream README](UPSTREAM-README.md) is preserved with source attribution. Existing decision triage, recovery, work products and budget enforcement are upstream capabilities; this contribution reorganizes how a subset of company information is presented.

## Validation boundary

The standalone demo and local implementation can demonstrate the UI and its tested behavior. They do not prove production readiness, current-upstream compatibility, a speed improvement or customer adoption. The final local check passed 27 focused tests, 13 offline browser scenarios, repository-wide type checking and the full build. The repository-wide test run is not green: it stops at five server-test failures. See [verification](VERIFICATION.md) for exact commands, failure details and validation limits. The [preview results](assets/operator-browser-check.json) and [Kanban geometry results](assets/board-scroll-check.json) record the browser evidence.
