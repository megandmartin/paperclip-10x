import type {
  Agent,
  Approval,
  Company,
  DashboardSummary,
  Issue,
  Project,
} from "@paperclipai/shared";

export interface WorkspaceAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  adapter: string;
  spentCents: number;
}

export interface WorkspaceTask {
  id: string;
  identifier: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agentId: string | null;
  projectName?: string;
  updatedAt: string;
}

export interface WorkspaceApproval {
  id: string;
  title: string;
  description: string;
  status: string;
  requestedByAgentId: string | null;
  createdAt: string;
}

export interface WorkspaceData {
  company: { id: string; name: string; description: string };
  budget: { spentCents: number; limitCents: number };
  agents: WorkspaceAgent[];
  tasks: WorkspaceTask[];
  approvals: WorkspaceApproval[];
  updatedAt: string;
  /** Company totals from the dashboard endpoint, independent of the loaded task window. */
  totals?: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
    pendingApprovals: number;
    runningAgents: number;
  };
  /** True means the recent task window may omit older work. */
  taskCoverage?: { limit: number; isLimited: boolean };
}

export interface BudgetState {
  spentCents: number;
  limitCents: number;
  remainingCents: number | null;
  utilizationPercent: number | null;
  progressPercent: number;
  status: "uncapped" | "within_budget" | "near_limit" | "over_limit";
}

const priorityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
const statusOrder: Record<string, number> = {
  blocked: 0,
  in_review: 1,
  in_progress: 2,
  todo: 3,
  backlog: 4,
  done: 5,
  cancelled: 6,
};
const adapterLabels: Record<string, string> = {
  claude_local: "Claude Code",
  codex_local: "Codex",
  cursor: "Cursor",
  cursor_cloud: "Cursor Cloud",
  gemini_local: "Gemini",
  openclaw_gateway: "OpenClaw",
  opencode_local: "OpenCode",
  pi_local: "Pi",
  acpx_local: "ACP",
  process: "Process",
  http: "HTTP",
};
const approvalLabels: Record<string, string> = {
  hire_agent: "Review proposed agent",
  approve_ceo_strategy: "Review company strategy",
  budget_override_required: "Review budget request",
  request_board_approval: "Review board approval",
};

function finiteCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function isoDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function payloadText(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Budget 0 means no company limit; it never means spend is free or exhausted. */
export function getBudgetState(budget: WorkspaceData["budget"]): BudgetState {
  const spentCents = finiteCents(budget.spentCents);
  const limitCents = finiteCents(budget.limitCents);
  if (limitCents === 0) {
    return {
      spentCents,
      limitCents,
      remainingCents: null,
      utilizationPercent: null,
      progressPercent: 0,
      status: "uncapped",
    };
  }
  const utilizationPercent = (spentCents / limitCents) * 100;
  return {
    spentCents,
    limitCents,
    remainingCents: Math.max(0, limitCents - spentCents),
    utilizationPercent,
    progressPercent: Math.min(100, utilizationPercent),
    status:
      spentCents >= limitCents
        ? "over_limit"
        : utilizationPercent >= 80
          ? "near_limit"
          : "within_budget",
  };
}

/** Surface blocked/review work first without mutating the query cache. */
export function sortWorkspaceTasks(tasks: WorkspaceTask[]): WorkspaceTask[] {
  return [...tasks].sort(
    (a, b) =>
      (statusOrder[a.status] ?? 7) - (statusOrder[b.status] ?? 7) ||
      (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4) ||
      (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) ||
      a.id.localeCompare(b.id),
  );
}

export interface WorkspaceSource {
  company: Pick<Company, "id" | "name" | "description">;
  dashboard: DashboardSummary;
  agents: Array<
    Pick<
      Agent,
      | "id"
      | "companyId"
      | "name"
      | "title"
      | "role"
      | "status"
      | "adapterType"
      | "spentMonthlyCents"
    >
  >;
  issues: Array<
    Pick<
      Issue,
      | "id"
      | "companyId"
      | "identifier"
      | "title"
      | "description"
      | "status"
      | "priority"
      | "assigneeAgentId"
      | "projectId"
      | "updatedAt"
    >
  >;
  approvals: Array<
    Pick<
      Approval,
      | "id"
      | "companyId"
      | "type"
      | "status"
      | "payload"
      | "requestedByAgentId"
      | "createdAt"
    >
  >;
  projects: Array<Pick<Project, "id" | "companyId" | "name">>;
  updatedAt: string;
  taskLimit?: number;
}

/** A presentation projection. Authorization remains enforced by the existing server. */
export function buildWorkspaceData(source: WorkspaceSource): WorkspaceData {
  const companyId = source.company.id;
  if (source.dashboard.companyId !== companyId)
    throw new Error(
      "The dashboard belongs to another company. Refresh this overview.",
    );
  const agents = source.agents.filter((agent) => agent.companyId === companyId);
  const agentIds = new Set(agents.map((agent) => agent.id));
  const projects = new Map(
    source.projects
      .filter((project) => project.companyId === companyId)
      .map((project) => [project.id, project.name]),
  );
  const tasks = source.issues
    .filter((issue) => issue.companyId === companyId)
    .map(
      (issue): WorkspaceTask => ({
        id: issue.id,
        identifier: issue.identifier ?? issue.id.slice(0, 8),
        title: issue.title,
        description: issue.description ?? "",
        status: issue.status,
        priority: issue.priority,
        agentId:
          issue.assigneeAgentId && agentIds.has(issue.assigneeAgentId)
            ? issue.assigneeAgentId
            : null,
        projectName: issue.projectId
          ? projects.get(issue.projectId)
          : undefined,
        updatedAt: isoDate(issue.updatedAt),
      }),
    );
  return {
    company: {
      ...source.company,
      description: source.company.description ?? "",
    },
    budget: {
      spentCents: finiteCents(source.dashboard.costs.monthSpendCents),
      limitCents: finiteCents(source.dashboard.costs.monthBudgetCents),
    },
    agents: agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.title || agent.role,
      status: agent.status,
      adapter: adapterLabels[agent.adapterType] ?? agent.adapterType,
      spentCents: finiteCents(agent.spentMonthlyCents),
    })),
    tasks: sortWorkspaceTasks(tasks),
    approvals: source.approvals
      .filter((approval) => approval.companyId === companyId)
      .map((approval) => ({
        id: approval.id,
        title:
          payloadText(approval.payload, ["title", "name", "subject"]) ||
          approvalLabels[approval.type] ||
          "Review approval",
        description: payloadText(approval.payload, [
          "description",
          "reason",
          "summary",
        ]),
        status: approval.status,
        requestedByAgentId:
          approval.requestedByAgentId &&
          agentIds.has(approval.requestedByAgentId)
            ? approval.requestedByAgentId
            : null,
        createdAt: isoDate(approval.createdAt),
      }))
      .sort(
        (a, b) =>
          (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0) ||
          a.id.localeCompare(b.id),
      ),
    updatedAt: isoDate(source.updatedAt),
    totals: {
      open: source.dashboard.tasks.open,
      inProgress: source.dashboard.tasks.inProgress,
      blocked: source.dashboard.tasks.blocked,
      done: source.dashboard.tasks.done,
      pendingApprovals: source.dashboard.pendingApprovals,
      runningAgents: source.dashboard.agents.running,
    },
    taskCoverage:
      source.taskLimit === undefined
        ? undefined
        : {
            limit: source.taskLimit,
            isLimited: source.issues.length >= source.taskLimit,
          },
  };
}
