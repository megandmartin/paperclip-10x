# Verification record

Checked 3 November 2026 (Singapore time). Evidence covers this fork’s local implementation and synthetic browser fixtures. It does not establish production readiness, current-upstream compatibility, physical-device behavior or a measured productivity improvement.

## Results

| Check | Result | Meaning |
| --- | --- | --- |
| `corepack pnpm -r typecheck` | Passed, 28 workspace packages | The full fork’s types compile |
| `corepack pnpm build` | Passed | Full fork production build; existing large UI bundle warning remains |
| `corepack pnpm --dir ui exec vitest run src/features/operator-workspace/model.test.ts src/features/operator-workspace/Workspace.test.tsx src/components/KanbanBoard.test.tsx` | 27 passed across 3 files | Company projection, budget meaning, component interactions and existing board regressions |
| Complete UI suite (`corepack pnpm --dir ui exec vitest run`) | Passed: 232 files, 1,641 tests | Broad UI regression coverage |
| Final UI typecheck | Passed | Includes the final component tests |
| `pnpm test:operator:browser` | 13 scenarios passed | Offline exported previews, interactions, desktop/phone layouts and appearance |
| [GitHub-hosted UI workflow](https://github.com/megandmartin/paperclip-10x/actions/runs/41503875003) | Passed on implementation commit `5ad1e054` | Fresh Linux install, UI typecheck, complete UI suite and all 13 offline-preview browser scenarios |
| Existing Kanban component in isolated browser fixture | Passed | Sticky headers, bounded scroll, last-card access, keyboard scroll and drag callback |
| `corepack pnpm test:run` | Not green: 1,687 passed, 5 failed, 1 skipped | Runner stopped after the first server group; subsequent groups were not reached |

The full test failures are in unchanged `server/src/__tests__/workspace-runtime.test.ts`. Four provisioning cases invoke a globally installed Paperclip CLI that is missing its `dist/migrations` directory. One Git fixture pushes both `main` and `master` although this host’s `init.defaultBranch` is `main`, leaving no `master` ref. Server source, package dependencies, lockfile and test runner were unchanged. These environment-linked failures were recorded rather than hidden or patched through unrelated global settings.

## Inspectable browser evidence

- [Operator check record](assets/operator-browser-check.json): 13 scenarios, zero page errors and zero external requests. Tests open the generated HTML directly from disk. Search/status filters, dialog focus trapping and Escape restoration, arrow-key tabs, navigation synchronization, genuine error/retry, empty/loading states, 122% budget usage and all three alternative exports are exercised.
- [Board geometry and behavior record](assets/board-scroll-check.json): 24 synthetic tasks per status, real `KanbanBoard` and production CSS, with only router links replaced by ordinary anchors. At 1280 × 900, the scroll viewport was 630px high while content was 2,198px high. Normal headings retained y=152 after 500px scrolling; collapsed heading movement was within 1px. The final card remained reachable at the bottom/right. Keyboard and cross-column pointer drag behavior also passed. A 390 × 844 viewport was checked separately.
- [Desktop](assets/operator-workspace-desktop.png), [phone](assets/operator-workspace-mobile.png), [dark appearance](assets/operator-workspace-dark.png), [board before scrolling](assets/board-before-scroll.png), and [board after scrolling](assets/board-after-scroll.png) were visually inspected for hierarchy, layout and legibility. “Before/after” here describes scroll positions, not an upstream application comparison.

## Repeat the preview checks

```sh
corepack pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:operator:browser
```

`OPERATOR_PLAYWRIGHT_MODULE` can point to an already installed Playwright module to reuse an existing browser/runtime; the recorded run used the workstation’s shared toolkit. The script rebuilds the four self-contained previews before testing and regenerates screenshots and its JSON record. It does not contact a Paperclip server or a model provider.

## Fork automation

Inherited release, container/runtime-image publishing and lockfile-bot jobs are restricted to `paperclipai/paperclip`. The fork has a dedicated read-only `Operator workspace` workflow for UI typecheck, the UI test suite and exported-preview browser checks. Workflow YAML was parsed locally. The hosted Operator workspace run passed; inherited publishing and lockfile jobs correctly skipped the fork.

## Remaining limits

The live route compiles and its company-scoped projection and explicit navigation are tested. An authenticated server-backed journey, real provider execution and real-user preference are still unverified. Native scrollbar painting depends on the operating system. Browser checks used Chromium, not Safari, Firefox or a physical phone. The fork has not been synchronized with current upstream; no upstream PR or adoption is implied.
