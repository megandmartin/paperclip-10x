# Operator workspace: design comparison

Date: 3 November 2026. Audience: the person supervising a company of AI agents.

## Brief and acceptance

Make it easier to answer four questions: what needs my attention, what is the team doing, what can I inspect, and what has it cost? Preserve Paperclip’s company scope and established governance flows. Give the fork a visible contribution that can be opened, used and reviewed.

Acceptance requires a runnable standalone demo, an additive live data adapter, useful filtering and detail behavior, readable desktop and mobile layouts, clear sample-data labeling, accessible focus/status states and inspectable test evidence. A successful build alone does not establish usability.

The hardest assumption is whether a composed overview helps users orient themselves without duplicating the decisions and task screens. The demo makes that assumption inspectable; user observation is still needed to validate it.

## Three directions

| Direction | Strength | Tradeoff | Runnable view | Preview |
| --- | --- | --- | --- | --- |
| Optimizer: structured overview | Fast scanning with familiar task rows and clear priority | Less spatial sense of work stages | `/operator-demo.html?direction=optimizer` | [Screenshot](../assets/operator-optimizer.png) |
| Reimaginer: work board | Makes queue and stage differences visible | More horizontal space; denser on mobile | `/operator-demo.html?direction=reimaginer` | [Screenshot](../assets/operator-reimaginer.png) |
| Converter: decision desk | Gives one selected approval room for context and a switchable request queue | Monthly budget and broader company context are less prominent | `/operator-demo.html?direction=converter` | [Screenshot](../assets/operator-converter.png) |

The merged workspace uses the overview’s hierarchy, the board’s grouping and the focus direction’s contextual detail. See the merged [desktop](../assets/operator-workspace-desktop.png), [mobile](../assets/operator-workspace-mobile.png) and [dark](../assets/operator-workspace-dark.png) views. This is a design recommendation based on those tradeoffs, not a winner established through user testing or expert endorsement.

## Visual direction

Keep Paperclip’s paper-and-ink identity: a quiet light canvas, readable dark type and precise periwinkle accents for selection. Use a medium-weight grotesk hierarchy; reserve tactile depth for the main control or selected item. Let content, spacing and alignment carry the composition. Avoid filling every surface with decorative cards.

Use color to explain state alongside a text label. Preserve the task’s identity as detail opens. Short transitions should explain the selection without delaying input; reduced motion must retain the same information.

## Scope and next proof

This iteration adds an operator surface and demo; it does not replace agent orchestration or invent a second governance model. Current upstream already provides decisions, recovery, search, outputs and budget controls. An upstream adaptation should connect to those primitives.

Local implementation and browser evidence are recorded in [verification](../VERIFICATION.md). Next useful validation: observe new and returning operators locating a blocked task, opening its context and finding the relevant decision. Record task success, hesitation and navigation errors before claiming improved usability.
