import { describe, expect, it } from "vitest";
import { buildWorkspaceData, getBudgetState, sortWorkspaceTasks, type WorkspaceSource, type WorkspaceTask } from "./model";

function source(): WorkspaceSource {
  return {
    company: { id: "c-one", name: "Company one", description: null },
    dashboard: {
      companyId: "c-one",
      agents: { active: 3, running: 2, paused: 1, error: 0 },
      tasks: { open: 603, inProgress: 23, blocked: 8, done: 492 },
      costs: { monthSpendCents: 12530, monthBudgetCents: 50000, monthUtilizationPercent: 25.06 },
      pendingApprovals: 4,
      budgets: { activeIncidents: 0, pendingApprovals: 0, pausedAgents: 0, pausedProjects: 0 },
      runActivity: [],
    },
    agents: [
      { id: "a-one", companyId: "c-one", name: "Iris", title: "Product designer", role: "designer", status: "idle", adapterType: "claude_local", spentMonthlyCents: 1240 },
    ],
    issues: [{ id: "t-one", companyId: "c-one", identifier: "ONE-1", title: "Review interface", description: null, status: "in_review", priority: "high", assigneeAgentId: "a-one", projectId: "pr-one", updatedAt: new Date("2026-11-03T08:00:00Z") }],
    approvals: [{ id: "p-one", companyId: "c-one", type: "hire_agent", status: "pending", payload: { name: "Review proposed engineer", reason: "Cover the frontend work", apiKey: "DO_NOT_DISPLAY" }, requestedByAgentId: "a-one", createdAt: new Date("2026-11-03T07:00:00Z") }],
    projects: [{ id: "pr-one", companyId: "c-one", name: "Product beta" }],
    updatedAt: "2026-11-03T08:42:00Z",
    taskLimit: 100,
  };
}

function task(id: string, status: string, priority: string, updatedAt = "2026-11-03T08:00:00.000Z"): WorkspaceTask {
  return { id, identifier: id, title: id, description: "", status, priority, agentId: null, updatedAt };
}

describe("operator workspace projection", () => {
  it("drops cross-company rows and does not resolve foreign agent or project names", () => {
    const input = source();
    input.agents.push({ ...input.agents[0], id: "foreign-agent", companyId: "c-two", name: "Secret agent" });
    input.projects.push({ id: "foreign-project", companyId: "c-two", name: "Secret project" });
    input.issues.push({ ...input.issues[0], id: "foreign-task", companyId: "c-two", title: "Secret task" });
    input.approvals.push({ ...input.approvals[0], id: "foreign-approval", companyId: "c-two" });
    input.issues[0].assigneeAgentId = "foreign-agent";
    input.issues[0].projectId = "foreign-project";
    input.approvals[0].requestedByAgentId = "foreign-agent";
    const data = buildWorkspaceData(input);
    expect(data.agents).toHaveLength(1);
    expect(data.tasks).toHaveLength(1);
    expect(data.approvals).toHaveLength(1);
    expect(data.tasks[0].agentId).toBeNull();
    expect(data.tasks[0].projectName).toBeUndefined();
    expect(data.approvals[0].requestedByAgentId).toBeNull();
    expect(JSON.stringify(data)).not.toContain("Secret");
  });

  it("rejects a dashboard from a different selected company", () => {
    const input = source();
    input.dashboard.companyId = "c-two";
    expect(() => buildWorkspaceData(input)).toThrow("another company");
  });

  it("preserves company totals independently of a small recent task window", () => {
    const data = buildWorkspaceData(source());
    expect(data.tasks).toHaveLength(1);
    expect(data.totals).toEqual({ open: 603, inProgress: 23, blocked: 8, done: 492, pendingApprovals: 4, runningAgents: 2 });
    expect(data.taskCoverage).toEqual({ limit: 100, isLimited: false });
  });

  it("marks a full page as potentially incomplete even when dashboard totals differ", () => {
    const input = source();
    input.taskLimit = 1;
    expect(buildWorkspaceData(input).taskCoverage).toEqual({ limit: 1, isLimited: true });
  });

  it("selects human-readable approval fields without serializing sensitive payloads", () => {
    const data = buildWorkspaceData(source());
    expect(data.approvals[0].title).toBe("Review proposed engineer");
    expect(data.approvals[0].description).toBe("Cover the frontend work");
    expect(JSON.stringify(data)).not.toContain("DO_NOT_DISPLAY");
    expect(data.tasks[0].projectName).toBe("Product beta");
    expect(data.agents[0].adapter).toBe("Claude Code");
  });

  it("handles missing copy and unknown plugin adapters without fabricating results", () => {
    const input = source();
    input.agents[0].adapterType = "example_external";
    input.approvals[0].payload = { config: { token: "do-not-display" } };
    const data = buildWorkspaceData(input);
    expect(data.company.description).toBe("");
    expect(data.tasks[0].description).toBe("");
    expect(data.approvals[0].description).toBe("");
    expect(data.approvals[0].title).toBe("Review proposed agent");
    expect(data.agents[0].adapter).toBe("example_external");
    expect(data.updatedAt).toBe("2026-11-03T08:42:00.000Z");
  });
});

describe("budget presentation semantics", () => {
  it("treats zero company budget as uncapped and retains the actual spend", () => {
    expect(getBudgetState({ spentCents: 12530, limitCents: 0 })).toEqual({ spentCents: 12530, limitCents: 0, remainingCents: null, utilizationPercent: null, progressPercent: 0, status: "uncapped" });
  });

  it("caps the bar but retains overspend in the numerical utilization", () => {
    const budget = getBudgetState({ spentCents: 62500, limitCents: 50000 });
    expect(budget.progressPercent).toBe(100);
    expect(budget.utilizationPercent).toBe(125);
    expect(budget.remainingCents).toBe(0);
    expect(budget.status).toBe("over_limit");
  });

  it("distinguishes a warning from a limit reached without claiming server enforcement", () => {
    expect(getBudgetState({ spentCents: 39999, limitCents: 50000 }).status).toBe("within_budget");
    expect(getBudgetState({ spentCents: 40000, limitCents: 50000 }).status).toBe("near_limit");
    expect(getBudgetState({ spentCents: 50000, limitCents: 50000 }).status).toBe("over_limit");
  });
});

describe("work ordering", () => {
  it("puts intervention work before active work, then orders by priority and recency", () => {
    const input = [task("running", "in_progress", "critical"), task("old-blocked", "blocked", "high", "2026-11-02T08:00:00Z"), task("review", "in_review", "critical"), task("new-blocked", "blocked", "high"), task("critical-blocked", "blocked", "critical")];
    const originalIds = input.map((item) => item.id);
    expect(sortWorkspaceTasks(input).map((item) => item.id)).toEqual(["critical-blocked", "new-blocked", "old-blocked", "review", "running"]);
    expect(input.map((item) => item.id)).toEqual(originalIds);
  });
});
