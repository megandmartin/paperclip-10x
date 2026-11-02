/** Browser regression checks for the self-contained public preview.
 * First run: pnpm exec playwright install chromium
 * A preinstalled Playwright may be reused with OPERATOR_PLAYWRIGHT_MODULE.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const { chromium } = await import(
  process.env.OPERATOR_PLAYWRIGHT_MODULE || "@playwright/test"
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "doc/assets");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1120 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
const externalRequests = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (/^https?:/.test(request.url())) externalRequests.push(request.url());
});
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log(`PASS ${name}`);
};
const open = async (file = "Paperclip-Workspace-10x-Winner") => {
  await page.goto(
    pathToFileURL(path.join(root, `ui/dist-operator/${file}.html`)).href,
  );
  await page.locator(".ow-root h1").waitFor();
};
const countRows = async (expected) =>
  assert.equal(await page.locator(".ow-task-row").count(), expected);
try {
  await open();
  await check(
    "Offline standalone preview renders without API calls",
    async () => {
      assert.match(await page.locator(".ow-brief h2").innerText(), /^4 things/);
      await countRows(10);
      assert.equal(externalRequests.length, 0);
    },
  );
  await page.screenshot({
    path: path.join(output, "operator-workspace-desktop.png"),
  });
  await check(
    "Search finds task by title and clear filters restores recent work",
    async () => {
      await page
        .getByRole("searchbox", { name: "Search recent tasks" })
        .fill("staging");
      await countRows(1);
      await page
        .getByRole("searchbox", { name: "Search recent tasks" })
        .fill("no-such-task");
      assert.equal(
        await page
          .getByRole("heading", { name: "No tasks match this view" })
          .count(),
        1,
      );
      await page.getByRole("button", { name: "Clear filters" }).click();
      await countRows(10);
    },
  );
  await check("Status filtering preserves company totals", async () => {
    await page
      .getByRole("combobox", { name: "Filter tasks by status" })
      .selectOption("blocked");
    await countRows(1);
    assert.match(
      await page.locator(".ow-metrics").innerText(),
      /3\s*\/ 6 on the team/,
    );
    await page
      .getByRole("combobox", { name: "Filter tasks by status" })
      .selectOption("all");
  });
  await check(
    "Task detail opens, traps keyboard focus and returns focus on Escape",
    async () => {
      const row = page.getByRole("button", {
        name: /FRM-42.*Choose the visual direction/,
      });
      await row.click();
      const dialog = page.getByRole("dialog");
      assert.equal(await dialog.isVisible(), true);
      assert.equal(
        await dialog
          .getByRole("heading", {
            name: "Choose the visual direction for launch",
          })
          .count(),
        1,
      );
      for (let index = 0; index < 8; index++) await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document.querySelector("dialog").contains(document.activeElement),
        ),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(await dialog.isVisible(), false);
      assert.equal(
        await row.evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check(
    "Attention review exposes approvals and review/blocked tasks",
    async () => {
      await page.getByRole("button", { name: "Review what needs you" }).click();
      await countRows(2);
      assert.equal(
        await page
          .getByRole("heading", { name: "Approvals to review" })
          .count(),
        1,
      );
      await page
        .locator(".ow-pending-inline")
        .getByRole("button", { name: /Add a frontend engineer/ })
        .click();
      assert.equal(
        await page
          .getByRole("dialog")
          .getByRole("heading", { name: "Add a frontend engineer to the team" })
          .count(),
        1,
      );
      assert.equal(
        await page
          .getByRole("dialog")
          .getByRole("button", { name: /Approve|Reject/ })
          .count(),
        0,
      );
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Tabs support arrow keys and synchronize navigation",
    async () => {
      await page.getByRole("tab", { name: "Overview", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page
          .getByRole("tab", { name: "Work board", exact: true })
          .getAttribute("aria-selected"),
        "true",
      );
      assert.equal(
        await page
          .locator(".ow-demo-sidebar button[aria-current=page]")
          .innerText(),
        "Work board",
      );
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.locator(".ow-team-card").count(), 6);
      assert.equal(
        await page
          .locator(".ow-demo-sidebar button[aria-current=page]")
          .innerText(),
        "Team",
      );
    },
  );
  await check(
    "Empty, loading, error/retry and overspend states remain truthful",
    async () => {
      await page
        .getByRole("combobox", { name: "Preview state" })
        .selectOption("empty");
      assert.equal(
        await page
          .getByRole("heading", { name: "Your team starts here" })
          .count(),
        1,
      );
      assert.equal(
        await page.locator(".ow-demo-sidebar button.is-active>span").count(),
        0,
      );
      await page
        .getByRole("combobox", { name: "Preview state" })
        .selectOption("loading");
      assert.equal(
        await page
          .getByRole("heading", { name: "Loading your company" })
          .count(),
        1,
      );
      await page
        .getByRole("combobox", { name: "Preview state" })
        .selectOption("error");
      assert.equal(await page.getByRole("alert").count(), 1);
      await page.getByRole("button", { name: "Try again" }).click();
      await page
        .getByRole("combobox", { name: "Preview state" })
        .selectOption("over-budget");
      assert.match(await page.locator(".ow-budget").innerText(), /122%/);
      assert.match(
        await page.locator(".ow-budget").innerText(),
        /At or above monthly limit/,
      );
    },
  );
  await open();
  await page.setViewportSize({ width: 390, height: 844 });
  await check(
    "Phone layout has no page overflow and decisions precede task list",
    async () => {
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        decisions: document
          .querySelector(".ow-mobile-decisions")
          .getBoundingClientRect().top,
        list: document.querySelector(".ow-work-layout").getBoundingClientRect()
          .top,
      }));
      assert.equal(geometry.width, geometry.scroll);
      assert.ok(geometry.decisions < geometry.list);
    },
  );
  await page.screenshot({
    path: path.join(output, "operator-workspace-mobile.png"),
    fullPage: true,
  });
  await check(
    "Phone board scrolls within its region without page overflow",
    async () => {
      await page.getByRole("tab", { name: "Work board", exact: true }).click();
      const dimensions = await page
        .locator(".ow-board")
        .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
      assert.ok(dimensions.scroll > dimensions.client);
      assert.equal(
        await page.evaluate(
          () => innerWidth === document.documentElement.scrollWidth,
        ),
        true,
      );
    },
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await open();
  await page.getByRole("button", { name: "Use dark appearance" }).click();
  await page.screenshot({
    path: path.join(output, "operator-workspace-dark.png"),
  });
  await check(
    "Dark appearance and reduced motion preserve the workspace",
    async () => {
      assert.equal(await page.locator(".ow-demo.dark").count(), 1);
      assert.equal(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
        true,
      );
    },
  );
  for (const [file, name] of [
    ["Paperclip-Workspace-V-A-Optimizer", "optimizer"],
    ["Paperclip-Workspace-V-B-Reimaginer", "reimaginer"],
    ["Paperclip-Workspace-V-C-Converter", "converter"],
  ]) {
    await open(file);
    await check(`Exported ${name} direction works offline`, async () => {
      assert.equal(await page.locator(`.ow-direction-${name}`).count(), 1);
      if (name === "reimaginer")
        assert.equal(
          await page
            .getByRole("tab", { name: "Work board", exact: true })
            .getAttribute("aria-selected"),
          "true",
        );
      if (name === "converter") {
        assert.equal(
          await page
            .getByRole("heading", { name: "One decision at a time." })
            .count(),
          1,
        );
        await page
          .getByRole("navigation", { name: "Choose a decision" })
          .getByRole("button", { name: /Review the beta launch plan/ })
          .click();
        assert.equal(
          await page.locator(".ow-focus-copy h2").innerText(),
          "Review the beta launch plan",
        );
      }
    });
    await page.screenshot({ path: path.join(output, `operator-${name}.png`) });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  await writeFile(
    path.join(output, "operator-browser-check.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        scope:
          "Self-contained fixture preview, not authenticated server/device acceptance",
        browser: "Chromium",
        checks,
        consoleErrors: errors,
        externalRequests,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `${checks.length} browser checks passed; no page errors or external requests.`,
  );
} finally {
  await browser.close();
}
