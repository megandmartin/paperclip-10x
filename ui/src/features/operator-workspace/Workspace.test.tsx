// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoWorkspaceData } from "./fixtures";
import type { WorkspaceData } from "./model";
import { OperatorWorkspace, type OperatorWorkspaceProps } from "./Workspace";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mountedRoots: Root[] = [];
const dialogPrototype = HTMLDialogElement.prototype;
const originalShowModal = Object.getOwnPropertyDescriptor(
  dialogPrototype,
  "showModal",
);
const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, "close");

function sampleData(): WorkspaceData {
  return structuredClone(demoWorkspaceData);
}

function click(button: HTMLButtonElement) {
  act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

function buttonContaining(
  container: ParentNode,
  text: string,
): HTMLButtonElement {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent?.includes(text),
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

function tabNamed(container: ParentNode, name: string): HTMLButtonElement {
  const matches = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
  ).filter((tab) => tab.textContent?.trim() === name);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function metricValue(container: ParentNode, title: string): string {
  const metric = Array.from(
    container.querySelectorAll(".ow-metrics > div"),
  ).find((item) => item.textContent?.includes(title));
  expect(metric).toBeDefined();
  return metric?.querySelector("strong")?.firstChild?.textContent ?? "";
}

function renderWorkspace(overrides: Partial<OperatorWorkspaceProps> = {}) {
  const callbacks = {
    onRefresh: vi.fn(),
    onOpenTask: vi.fn(),
    onOpenApproval: vi.fn(),
    onOpenAgent: vi.fn(),
    onOpenBudget: vi.fn(),
    onViewChange: vi.fn(),
  };
  let props: OperatorWorkspaceProps = {
    data: sampleData(),
    mode: "live",
    ...callbacks,
    ...overrides,
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  function render(nextProps: Partial<OperatorWorkspaceProps> = {}) {
    props = { ...props, ...nextProps };
    act(() => root.render(<OperatorWorkspace {...props} />));
  }

  render();
  return { container, render, callbacks };
}

beforeEach(() => {
  // jsdom has no native dialog lifecycle. Model only the open/close contract;
  // actual focus trapping, Escape and pointer behavior are browser checks.
  Object.defineProperty(dialogPrototype, "showModal", {
    configurable: true,
    value: function showModal(this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(dialogPrototype, "close", {
    configurable: true,
    value: function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  if (originalShowModal)
    Object.defineProperty(dialogPrototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(dialogPrototype, "showModal");
  if (originalClose)
    Object.defineProperty(dialogPrototype, "close", originalClose);
  else Reflect.deleteProperty(dialogPrototype, "close");
});

describe("OperatorWorkspace behavior", () => {
  it("shows a task-specific empty description and navigates only after the explicit detail action", () => {
    const data = sampleData();
    data.tasks[0].description = "";
    const { container, callbacks } = renderWorkspace({ data });
    click(buttonContaining(container, data.tasks[0].identifier));

    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".ow-detail-description")?.textContent).toBe(
      "No description has been added to this task.",
    );
    expect(dialog.textContent).not.toContain("spent this month");
    expect(callbacks.onOpenTask).not.toHaveBeenCalled();
    expect(callbacks.onOpenBudget).not.toHaveBeenCalled();

    click(buttonContaining(dialog, "Open task in Paperclip"));
    expect(callbacks.onOpenTask).toHaveBeenCalledExactlyOnceWith(
      data.tasks[0].id,
    );
    expect(callbacks.onOpenApproval).not.toHaveBeenCalled();
    expect(callbacks.onOpenBudget).not.toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  it("keeps an approval without a description distinct from the company budget", () => {
    const data = sampleData();
    data.approvals[0].description = "";
    const { container, callbacks } = renderWorkspace({ data });
    const decisions = container.querySelector(".ow-attention-panel")!;
    click(buttonContaining(decisions, data.approvals[0].title));

    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector(".ow-detail-description")?.textContent).toBe(
      "Open the full request in Paperclip to review its details.",
    );
    expect(callbacks.onOpenApproval).not.toHaveBeenCalled();
    click(buttonContaining(dialog, "Open approval in Paperclip"));
    expect(callbacks.onOpenApproval).toHaveBeenCalledExactlyOnceWith(
      data.approvals[0].id,
    );
    expect(callbacks.onOpenBudget).not.toHaveBeenCalled();
  });

  it("offers a useful empty team state when all returned agents are terminated", () => {
    const data = sampleData();
    data.agents = data.agents.map((agent) => ({
      ...agent,
      status: "terminated",
    }));
    data.totals = { ...data.totals!, runningAgents: 0 };
    const { container } = renderWorkspace({ data, initialView: "team" });

    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain(
      "Your team starts here",
    );
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain(
      "Add your first agent",
    );
    expect(container.querySelectorAll(".ow-team-card")).toHaveLength(0);
    expect(container.querySelector(".ow-team-pulse")?.textContent).toContain(
      "Your agents will appear here.",
    );
  });

  it.each(["task", "approval", "agent"] as const)(
    "closes a selected %s if it disappears from a refreshed snapshot",
    (kind) => {
      const data = sampleData();
      const { container, render, callbacks } = renderWorkspace({ data });
      if (kind === "task")
        click(buttonContaining(container, data.tasks[0].identifier));
      if (kind === "approval")
        click(
          buttonContaining(
            container.querySelector(".ow-attention-panel")!,
            data.approvals[0].title,
          ),
        );
      if (kind === "agent")
        click(
          buttonContaining(
            container.querySelector(".ow-team-pulse")!,
            data.agents[0].name,
          ),
        );
      const dialog = container.querySelector("dialog")!;
      expect(dialog.open).toBe(true);

      render({
        data: {
          ...data,
          tasks: kind === "task" ? data.tasks.slice(1) : data.tasks,
          approvals:
            kind === "approval" ? data.approvals.slice(1) : data.approvals,
          agents: kind === "agent" ? data.agents.slice(1) : data.agents,
        },
      });

      expect(dialog.open).toBe(false);
      expect(callbacks.onOpenTask).not.toHaveBeenCalled();
      expect(callbacks.onOpenApproval).not.toHaveBeenCalled();
      expect(callbacks.onOpenAgent).not.toHaveBeenCalled();
      expect(callbacks.onOpenBudget).not.toHaveBeenCalled();
    },
  );

  it("closes a removed task while other background queries are still refreshing", () => {
    const data = sampleData();
    const { container, render, callbacks } = renderWorkspace({ data });
    click(buttonContaining(container, data.tasks[0].identifier));
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);

    render({ data: { ...data, tasks: data.tasks.slice(1) }, loading: true });

    expect(dialog.open).toBe(false);
    expect(callbacks.onOpenBudget).not.toHaveBeenCalled();
  });

  it("keeps company totals unchanged when a status filter narrows the recent task list", () => {
    const data = sampleData();
    data.totals = { ...data.totals!, inProgress: 27, done: 612 };
    data.taskCoverage = { limit: 100, isLimited: true };
    const { container } = renderWorkspace({ data });
    const filter = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Filter tasks by status"]',
    )!;
    expect(metricValue(container, "Tasks in progress")).toBe("27");
    expect(metricValue(container, "Completed tasks")).toBe("612");

    act(() => {
      filter.value = "done";
      filter.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(
      container.querySelector(".ow-list-label [aria-live]")?.textContent,
    ).toBe("3 tasks");
    expect(container.querySelectorAll(".ow-task-row")).toHaveLength(3);
    expect(metricValue(container, "Tasks in progress")).toBe("27");
    expect(metricValue(container, "Completed tasks")).toBe("612");
    expect(container.textContent).toContain("Showing up to 100 recent tasks");
  });

  it("counts revision requests as waiting decisions even when the dashboard counts only pending approvals", () => {
    const data = sampleData();
    data.tasks = [];
    data.approvals[1].status = "approved";
    data.totals = { ...data.totals!, pendingApprovals: 1, blocked: 0 };
    const { container, render } = renderWorkspace({ data });
    expect(container.querySelector(".ow-brief h2")?.textContent).toBe(
      "1 thing needs your attention.",
    );

    render({
      data: {
        ...data,
        approvals: data.approvals.map((approval, index) =>
          index === 1
            ? { ...approval, status: "revision_requested" }
            : approval,
        ),
      },
    });

    expect(container.querySelector(".ow-brief h2")?.textContent).toBe(
      "2 things need your attention.",
    );
    expect(container.querySelector(".ow-brief p")?.textContent).toContain(
      "2 approvals are waiting",
    );
    expect(
      container.querySelector(".ow-attention-panel .ow-count")?.textContent,
    ).toBe("2");
  });

  it("reports user navigation and follows a later externally selected view", () => {
    const { container, render, callbacks } = renderWorkspace({
      initialView: "overview",
    });
    click(tabNamed(container, "Work board"));
    expect(callbacks.onViewChange).toHaveBeenCalledExactlyOnceWith("board");
    expect(
      tabNamed(container, "Work board").getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      container.querySelector(
        '[role="region"][aria-label="Recent work board"]',
      ),
    ).not.toBeNull();

    render({ initialView: "team" });
    expect(tabNamed(container, "Team").getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(container.querySelectorAll(".ow-team-card")).toHaveLength(6);
    expect(callbacks.onViewChange).toHaveBeenCalledTimes(1);
  });

  it("shows the actual failure and retry without replacing missing live data with samples or zero metrics", () => {
    const { container, render, callbacks } = renderWorkspace({
      data: null,
      error: "Company access was denied.",
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Company access was denied.",
    );
    expect(container.textContent).not.toContain("Forma Studio");
    expect(container.textContent).not.toContain("Avery");
    expect(container.querySelector(".ow-metrics")).toBeNull();
    expect(container.querySelectorAll(".ow-task-row")).toHaveLength(0);
    click(buttonContaining(container, "Try again"));
    expect(callbacks.onRefresh).toHaveBeenCalledOnce();

    // A stale cache also stays hidden while access/data loading is failing.
    render({ data: sampleData() });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Company access was denied.",
    );
    expect(container.querySelector(".ow-metrics")).toBeNull();
    expect(container.textContent).not.toContain("Forma Studio");
  });
});
