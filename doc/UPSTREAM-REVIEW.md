# Paperclip upstream review

Reviewed 3 November 2026. This is a source and issue review, not a production deployment audit or a claim of user testing.

## Recommendation

Make this fork a focused exploration of the operator experience: help a person understand what needs attention, inspect the work behind it, and reach the existing control safely. Pair the larger design exploration with small, reviewable usability fixes. Retain Paperclip's company, agent, task, budget and approval model.

“10x” is the ambition behind the fork's name. No tenfold improvement in speed, output or usability has been measured.

## Versions and scope

| Source | Reviewed revision | What it establishes |
| --- | --- | --- |
| Current upstream | [`a92f616cd0a457c8ba85d994b24e1f92c2e4d1de`](https://github.com/paperclipai/paperclip/tree/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de), committed 2 November 2026 | Current source, roadmap and contributor requirements |
| Fork before this work | [`5c117257845a832c94311422d53a1026c05b806a`](https://github.com/megandmartin/paperclip-10x/tree/5c117257845a832c94311422d53a1026c05b806a) | The implementation baseline for this contribution |
| GitHub comparison at review start | 0 commits ahead; 3,383 behind upstream `master` | The public fork did not yet contain distinct commits beyond its upstream ancestor |

The fork is a substantially older snapshot. Improvements implemented against it need a separate compatibility review before proposing an upstream pull request. A successful local build of the fork does not establish compatibility with current upstream.

This review read current Dashboard, WhatNeedsMe, Sidebar, Costs, Approvals, OnboardingWizard, AgentActionButtons and KanbanBoard source; the upstream roadmap and contributor guidance; and relevant public issues and pull requests. It did not run the current upstream application or validate its hosted services.

## Capabilities already present

These should be credited to Paperclip rather than presented as inventions of this fork:

| Existing capability | Current primary source |
| --- | --- |
| A Decisions desk with search, filters, grouping, inline resolution, keyboard navigation, snooze, dismiss/undo and decision history | [`WhatNeedsMe.tsx`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/pages/WhatNeedsMe.tsx) |
| Dashboard agent status, task counts, spending, pending approvals, active budget incidents, run charts, activity and recent tasks | [`Dashboard.tsx`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/pages/Dashboard.tsx#L381-L479) |
| Company, agent and project budget policies, budget incidents and explicit operator resolutions | [`Costs.tsx`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/pages/Costs.tsx) |
| Organization and agent onboarding, provider connections, saved drafts and contextual re-entry | [`OnboardingWizard.tsx`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/components/OnboardingWizard.tsx) |
| Artifacts/work products, enforced outcomes, planning approvals, bounded recovery, connected apps, company-wide search and multi-user support are marked complete in the roadmap | [`ROADMAP.md`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ROADMAP.md#L41-L115) |

“Marked complete” reports upstream's roadmap status. It does not imply this review independently verified every feature end to end.

## Where the experience can improve

### 1. Keep the task board usable when it grows

A current user reports that the horizontal scrollbar is below the longest column and headers disappear during vertical scrolling: [issue #18613](https://github.com/paperclipai/paperclip/issues/18613). Current source places all columns inside a horizontal scroll owner and renders ordinary column headers; the fork has the same structural pattern. See current [`KanbanBoard.tsx`, headers](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/components/KanbanBoard.tsx#L221-L237) and [scroll owner](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/ui/src/components/KanbanBoard.tsx#L488-L497).

The fork patch bounds the board viewport, gives both axes one scroll owner, keeps column headings and collapsed-rail identities sticky, and provides a named focusable region for keyboard access. Pagination, drag/drop target resolution and mutation callbacks keep their existing behavior.

Acceptance requires browser evidence: with long, wide columns, scroll vertically and horizontally, retain column orientation, reach the last cards, and enter/leave the region with a keyboard. A DOM test cannot prove sticky positioning. Native scrollbar visibility also follows operating-system settings. This local patch is not an upstream resolution of #18613.

A GitHub pull-request search for `18613` returned no matches during review. Search again before opening an upstream PR; this is not proof that no overlapping implementation exists.

Local component verification on 3 November used the real `KanbanBoard` and production stylesheet with synthetic tasks, replacing only the router Link as in the existing unit test. Chromium at 1280 × 900 measured a 630px board containing 2,198px of vertical content; Todo and In Progress headers stayed at y=152 after 500px of board scrolling. The last card was reachable at bottom/right, the collapsed label remained within 1px of its initial position, keyboard arrows scrolled the region, and a cross-column pointer drag reported the expected status-update callback. A 390 × 844 viewport also retained a bounded board and reachable final card. No browser page errors occurred. See [recorded geometry and scope](assets/board-scroll-check.json). This is component evidence with fixtures, not backend mutation, physical-device or upstream-master acceptance.

### 2. Make the overview answer the operator's next question

The dashboard shows useful measures, charts and recency. Those are not the same as an ordered explanation of what a person should inspect next. An additive operator workspace can bring attention items, relevant work and budget context into one calm reading order, then deep-link to existing controls.

This is an information-architecture proposal, not a claim that upstream lacks triage. Upstream already has a sophisticated Decisions desk. Explain the difference as composition and orientation, and link through to the canonical work objects rather than creating a second decision system.

For an upstream implementation, use bounded company-scoped queries or an existing summary endpoint. Avoid fetching every issue merely to compute a small overview, synthesizing stale approval authority in the browser, or presenting unavailable data as zero.

Validate with a short comparative task: can a new operator find the most consequential pending item, explain why it matters and open the correct work object? Record time, errors and comprehension before claiming an improvement.

### 3. Make destructive controls explicit

[Issue #18601](https://github.com/paperclipai/paperclip/issues/18601) describes people reading agent-level “Terminate” as a run control. However, [PR #18618](https://github.com/paperclipai/paperclip/pull/18618) already addresses confirmation and run-inspection exposure. Review or build upon that work rather than submitting a duplicate.

The general design lesson applies to this fork: name the target and consequence, distinguish an agent from a run, retain cancellation where possible, and show mutation failures visibly.

### 4. Prefer recognizable work and actor identities

[Issue #18583](https://github.com/paperclipai/paperclip/issues/18583) concerns plugin actors shown as raw UUIDs; [PR #18600](https://github.com/paperclipai/paperclip/pull/18600) is already addressing dashboard activity names. [Issue #18567](https://github.com/paperclipai/paperclip/issues/18567) reports shortened task UUIDs in comment toasts.

Use an issue identifier plus title and a recognizable actor name wherever the source supplies them. Retain a truthful fallback for deleted or unavailable objects. Check for overlapping PRs before selecting a follow-up patch.

## Design directions considered

| Direction | Useful quality | Trade-off |
| --- | --- | --- |
| Refine the existing dashboard | Familiar navigation and low migration cost | Charts and counts can still dominate attention |
| Add an operator workspace | A clear starting point for attention, team activity and work context | Must avoid becoming a second inbox or decision system |
| Replace the dashboard with an outcome briefing | Strong connection between goals and visible deliverables | Greater scope and overlap with upstream work |

The additive workspace is the recommended exploration for this fork. Keep the existing application accessible. Treat outcome-first briefing as later work after reviewing [open PR #16452, goal progress and owner briefs](https://github.com/paperclipai/paperclip/pull/16452).

The visual direction should derive from Paperclip's work-management purpose: clear typography, purposeful spacing, quiet surfaces, readable task identities, restrained status color and progressive detail. Light and dark themes need equivalent hierarchy. Show missing data, failures, loading, emptiness and filtered results as deliberate states. Respect reduced motion and make keyboard focus visible.

Current upstream's [`DESIGN.md`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/DESIGN.md) and [`AGENTS.md`](https://github.com/paperclipai/paperclip/blob/a92f616cd0a457c8ba85d994b24e1f92c2e4d1de/AGENTS.md) require token-based UI values and `pnpm check:token-gates`. Those current-upstream gates differ from the older fork. A port must follow the current upstream design system rather than paste arbitrary values from a fork prototype.

## Present the contribution honestly

The repository front page should state that Paperclip supplies the orchestration platform, identify the fork's specific UX additions, and show screenshots of working code with a reproducible preview command. Separate demo fixtures from company data, implemented features from proposals, and local verification from deployed behavior.

Preserve the upstream MIT license and attribution. Credit older adapter and quality-of-life work to its existing authors. Do not reattribute inherited changes, invent traction, imply upstream adoption, or label a concept as production-ready. A useful public contribution is inspectable code and evidence, not a rewritten origin story.
