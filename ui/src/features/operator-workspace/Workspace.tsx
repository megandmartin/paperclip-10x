import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleHelp,
  Clock3,
  Columns3,
  FileCheck2,
  LayoutList,
  LoaderCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import {
  getBudgetState,
  type WorkspaceData,
  type WorkspaceTask,
  type WorkspaceApproval,
} from "./model";
import "./styles.css";

export type WorkspaceDirection =
  | "optimizer"
  | "reimaginer"
  | "converter"
  | "winner";
export interface OperatorWorkspaceProps {
  data: WorkspaceData | null;
  mode: "live" | "demo";
  loading?: boolean;
  error?: string | null;
  direction?: WorkspaceDirection;
  initialView?: "overview" | "board" | "team";
  onViewChange?: (view: "overview" | "board" | "team") => void;
  onRefresh: () => void;
  onOpenTask: (id: string) => void;
  onOpenApproval: (id: string) => void;
  onOpenAgent: (id: string) => void;
  onOpenBudget: () => void;
}
const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
  running: "Working",
  active: "Available",
  idle: "Idle",
  paused: "Paused",
  error: "Needs attention",
  terminated: "Terminated",
  pending_approval: "Awaiting approval",
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
const label = (status: string) =>
  statusLabels[status] ?? status.replaceAll("_", " ");
function Status({ status }: { status: string }) {
  return (
    <span className={`ow-status ow-status-${status}`}>
      <span aria-hidden="true" />
      {label(status)}
    </span>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ow-empty">
      <CheckCheck size={25} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function OperatorWorkspace({
  data,
  mode,
  loading,
  error,
  direction = "winner",
  initialView,
  onViewChange,
  onRefresh,
  onOpenTask,
  onOpenApproval,
  onOpenAgent,
  onOpenBudget,
}: OperatorWorkspaceProps) {
  const [view, setView] = useState<"overview" | "board" | "team">(
    initialView ?? (direction === "reimaginer" ? "board" : "overview"),
  );
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    type: "task" | "approval" | "agent" | "budget";
    id: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const panelTitle = useId();
  const tabId = useId();
  const tasks = data?.tasks ?? [];
  const agents = data?.agents ?? [];
  const team = agents.filter((agent) => agent.status !== "terminated");
  const [focusedDecision, setFocusedDecision] = useState<string | null>(null);
  const approvals = data?.approvals ?? [];
  const pending = approvals.filter(
    (item) => item.status === "pending" || item.status === "revision_requested",
  );
  const blocked = tasks.filter((item) => item.status === "blocked");
  const reviews = tasks.filter((item) => item.status === "in_review");
  const running = agents.filter((item) => item.status === "running");
  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const agent = agents.find((item) => item.id === task.agentId);
        const matches =
          `${task.title} ${task.identifier} ${task.projectName ?? ""} ${agent?.name ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase().trim());
        return (
          matches &&
          (filter === "all" ||
            task.status === filter ||
            (filter === "attention" &&
              ["in_review", "blocked"].includes(task.status)))
        );
      }),
    [tasks, agents, filter, search],
  );
  const spent = data?.budget.spentCents ?? 0;
  const limit = data?.budget.limitCents ?? 0;
  const budget = getBudgetState({ spentCents: spent, limitCents: limit });
  const ratio = budget.utilizationPercent;
  const attention =
    pending.length + (data?.totals?.blocked ?? blocked.length) + reviews.length;

  useEffect(() => {
    setSelected(null);
    setSearch("");
    setFilter("all");
  }, [data?.company.id]);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  const taskDetail =
    selected?.type === "task"
      ? tasks.find((task) => task.id === selected.id)
      : undefined;
  const approvalDetail =
    selected?.type === "approval"
      ? approvals.find((item) => item.id === selected.id)
      : undefined;
  const agentDetail =
    selected?.type === "agent"
      ? agents.find((item) => item.id === selected.id)
      : undefined;
  const focusedApproval =
    pending.find((item) => item.id === focusedDecision) ?? pending[0];
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);
  useEffect(() => {
    if (!selected || !data) return;
    if (
      (selected.type === "task" && !taskDetail) ||
      (selected.type === "approval" && !approvalDetail) ||
      (selected.type === "agent" && !agentDetail)
    )
      setSelected(null);
  }, [selected, data, loading, taskDetail, approvalDetail, agentDetail]);
  function showTask(task: WorkspaceTask) {
    setSelected({ type: "task", id: task.id });
  }
  function showApproval(approval: WorkspaceApproval) {
    setSelected({ type: "approval", id: approval.id });
  }
  function changeView(next: typeof view) {
    setView(next);
    onViewChange?.(next);
    setFilter("all");
    setSearch("");
  }
  function reviewAttention() {
    changeView("overview");
    setFilter("attention");
    document
      .getElementById(`${tabId}-work`)
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  const budgetAction = () =>
    mode === "live"
      ? onOpenBudget()
      : setSelected({ type: "budget", id: "budget" });

  if (loading && !data)
    return (
      <section
        className="ow-root"
        aria-busy="true"
        aria-label="Loading company overview"
      >
        <div className="ow-loading">
          <LoaderCircle aria-hidden="true" />
          <h2>Loading your company</h2>
          <p>Bringing the work, team and budget together.</p>
        </div>
      </section>
    );
  if (error)
    return (
      <section className="ow-root">
        <div className="ow-error" role="alert">
          <CircleHelp size={28} aria-hidden="true" />
          <h2>We couldn’t load this overview.</h2>
          <p>{error}</p>
          <button className="ow-button ow-primary" onClick={onRefresh}>
            Try again <RefreshCw size={14} />
          </button>
        </div>
      </section>
    );
  if (!data)
    return (
      <section className="ow-root">
        <Empty title="Choose a company to begin">
          Select a company in the sidebar to see its work, team and budget.
        </Empty>
      </section>
    );

  const taskRow = (task: WorkspaceTask) => {
    const agent = agents.find((item) => item.id === task.agentId);
    return (
      <button
        key={task.id}
        className="ow-task-row"
        onClick={() => showTask(task)}
      >
        <span
          className={`ow-task-icon ow-task-icon-${task.status}`}
          aria-hidden="true"
        >
          {task.status === "done" ? (
            <Check size={16} />
          ) : task.status === "in_review" ? (
            <FileCheck2 size={16} />
          ) : task.status === "blocked" ? (
            <CircleHelp size={16} />
          ) : (
            <Circle size={15} />
          )}
        </span>
        <span className="ow-task-copy">
          <span className="ow-task-meta">
            {task.identifier}
            {task.projectName && (
              <>
                <span aria-hidden="true">/</span>
                {task.projectName}
              </>
            )}
          </span>
          <strong>{task.title}</strong>
          <span className="ow-task-owner">{agent?.name ?? "Unassigned"}</span>
        </span>
        <Status status={task.status} />
        <ChevronRight
          className="ow-task-chevron"
          size={16}
          aria-hidden="true"
        />
      </button>
    );
  };
  return (
    <section className={`ow-root ow-direction-${direction}`}>
      <header className="ow-page-heading">
        <div>
          <p className="ow-date">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(new Date(data.updatedAt))}
          </p>
          <h1>
            {direction === "converter"
              ? "One decision at a time."
              : "Your company, in focus."}
          </h1>
          <p>See what’s moving. Make the decisions that matter.</p>
        </div>
        <button
          className="ow-button ow-refresh"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh overview"
        >
          <RefreshCw size={15} className={loading ? "ow-spin" : ""} />
          <span>Refresh</span>
        </button>
      </header>

      {direction === "converter" && (
        <section className="ow-focus-desk">
          <div className="ow-focus-copy">
            <span className="ow-focus-label">Your decision desk</span>
            <h2>{focusedApproval?.title ?? "No approvals waiting."}</h2>
            <p>
              {focusedApproval?.description ||
                "Review the work below or take a moment to check in with your team."}
            </p>
            {focusedApproval && (
              <button
                className="ow-button ow-primary"
                onClick={() => showApproval(focusedApproval)}
              >
                Inspect this request <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          <nav aria-label="Choose a decision">
            {pending.map((approval, index) => (
              <button
                key={approval.id}
                aria-pressed={focusedApproval?.id === approval.id}
                onClick={() => setFocusedDecision(approval.id)}
              >
                <span>{index + 1}</span>
                {approval.title}
                <ChevronRight size={15} />
              </button>
            ))}
          </nav>
        </section>
      )}
      <div className="ow-brief-grid">
        <section className="ow-brief">
          <div className="ow-brief-kicker">
            <span className="ow-signal" aria-hidden="true" />
            The big picture
          </div>
          <h2>
            {attention === 0
              ? "Room to move forward."
              : `${attention} ${attention === 1 ? "thing needs" : "things need"} your attention.`}
          </h2>
          <p>
            {pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? "approval is" : "approvals are"} waiting`
              : "No approvals waiting"}
            {(data.totals?.blocked ?? blocked.length) > 0
              ? ` and ${data.totals?.blocked ?? blocked.length} ${(data.totals?.blocked ?? blocked.length) === 1 ? "task is" : "tasks are"} blocked.`
              : "."}{" "}
            {reviews.length > 0
              ? ` ${reviews.length} recent ${reviews.length === 1 ? "task is" : "tasks are"} ready for review.`
              : ""}{" "}
            Your team’s work and decisions are collected below.
          </p>
          <button className="ow-button ow-primary" onClick={reviewAttention}>
            Review what needs you <ArrowRight size={15} aria-hidden="true" />
          </button>
          <div className="ow-brief-decoration" aria-hidden="true">
            <div className="ow-paper ow-paper-back" />
            <div className="ow-paper ow-paper-front">
              <CheckCheck size={30} strokeWidth={1.35} />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
        <section className="ow-budget">
          <div className="ow-section-heading">
            <h2>Monthly spend</h2>
            <button
              className="ow-icon-button"
              aria-label="View budget details"
              onClick={budgetAction}
            >
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="ow-budget-main">
            <div>
              <strong>{money(spent)}</strong>
              <p>
                {limit > 0
                  ? `of ${money(limit)} budget`
                  : "No monthly limit set"}
              </p>
            </div>
            <svg
              className="ow-budget-ring"
              viewBox="0 0 72 72"
              role="img"
              aria-label={
                ratio === null
                  ? "No budget limit"
                  : `${Math.round(ratio)} percent of budget used`
              }
            >
              <circle cx="36" cy="36" r="29" className="ow-ring-track" />
              <circle
                cx="36"
                cy="36"
                r="29"
                className="ow-ring-value"
                strokeDasharray={`${budget.progressPercent * 1.822} 182.2`}
              />
              <text x="36" y="40">
                {ratio === null ? "—" : `${Math.round(ratio)}%`}
              </text>
            </svg>
          </div>
          <div className="ow-budget-foot">
            <span
              className={`ow-budget-dot ${limit > 0 && spent >= limit ? "ow-budget-over" : ""}`}
            />
            {limit > 0
              ? spent >= limit
                ? "At or above monthly limit"
                : `${money(limit - spent)} remaining`
              : "Set a budget in company settings"}
          </div>
        </section>
      </div>

      <div className="ow-metrics">
        <div>
          <span>
            <span className="ow-indicator ow-indicator-working" />
            Agents working
          </span>
          <strong>
            {data.totals?.runningAgents ?? running.length}
            <small>/ {team.length} on the team</small>
          </strong>
        </div>
        <div>
          <span>
            <LayoutList size={14} />
            Tasks in progress
          </span>
          <strong>
            {data.totals?.inProgress ??
              tasks.filter((task) => task.status === "in_progress").length}
            <small>moving forward</small>
          </strong>
        </div>
        <div>
          <span>
            <FileCheck2 size={14} />
            Ready for review
          </span>
          <strong>
            {reviews.length}
            <small>in recent tasks</small>
          </strong>
        </div>
        <div>
          <span>
            <CheckCheck size={14} />
            Completed tasks
          </span>
          <strong>
            {data.totals?.done ??
              tasks.filter((task) => task.status === "done").length}
            <small>company total</small>
          </strong>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="ow-mobile-decisions">
          <div className="ow-section-heading">
            <h2>Decisions waiting</h2>
            <span className="ow-count">{pending.length}</span>
          </div>
          {pending.map((approval) => (
            <button
              className="ow-approval"
              key={approval.id}
              onClick={() => showApproval(approval)}
            >
              <span className="ow-approval-icon">
                <ArrowDownLeft size={16} />
              </span>
              <span>
                <strong>{approval.title}</strong>
                <small>Review approval</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
      )}
      <div className="ow-work-layout">
        <div className="ow-work-main" id={`${tabId}-work`}>
          <div
            className="ow-work-nav"
            role="tablist"
            aria-label="Company views"
          >
            {(
              [
                { id: "overview", title: "Overview", icon: LayoutList },
                { id: "board", title: "Work board", icon: Columns3 },
                { id: "team", title: "Team", icon: UsersRound },
              ] as const
            ).map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                id={`${tabId}-${id}`}
                aria-controls={`${tabId}-panel`}
                aria-selected={view === id}
                tabIndex={view === id ? 0 : -1}
                onClick={() => changeView(id)}
                onKeyDown={(event) => {
                  const tabs = ["overview", "board", "team"] as const;
                  const index = tabs.indexOf(id);
                  const next =
                    event.key === "ArrowRight"
                      ? tabs[(index + 1) % 3]
                      : event.key === "ArrowLeft"
                        ? tabs[(index + 2) % 3]
                        : event.key === "Home"
                          ? tabs[0]
                          : event.key === "End"
                            ? tabs[2]
                            : null;
                  if (next) {
                    event.preventDefault();
                    changeView(next);
                    document.getElementById(`${tabId}-${next}`)?.focus();
                  }
                }}
              >
                <Icon size={15} aria-hidden="true" />
                {title}
              </button>
            ))}
          </div>
          <div
            className="ow-tab-panel"
            role="tabpanel"
            id={`${tabId}-panel`}
            aria-labelledby={`${tabId}-${view}`}
            tabIndex={0}
          >
            {view === "team" ? (
              <div className="ow-team-grid">
                {team.length === 0 ? (
                  <Empty title="Your team starts here">
                    Add your first agent from Paperclip’s team controls.
                  </Empty>
                ) : (
                  team.map((agent, index) => (
                    <button
                      key={agent.id}
                      className="ow-team-card"
                      onClick={() =>
                        setSelected({ type: "agent", id: agent.id })
                      }
                    >
                      <span className={`ow-avatar ow-avatar-${index % 4}`}>
                        {initials(agent.name)}
                      </span>
                      <strong>{agent.name}</strong>
                      <span>{agent.role}</span>
                      <Status status={agent.status} />
                      <small>{money(agent.spentCents)} this month</small>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="ow-list-tools">
                  <label className="ow-search">
                    <Search size={15} aria-hidden="true" />
                    <input
                      ref={searchInput}
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search recent work…"
                      aria-label="Search recent tasks"
                    />
                  </label>
                  <label className="ow-filter">
                    <SlidersHorizontal size={14} aria-hidden="true" />
                    <select
                      aria-label="Filter tasks by status"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="all">All statuses</option>
                      <option value="attention">Needs attention</option>
                      <option value="in_progress">In progress</option>
                      <option value="in_review">In review</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                    </select>
                  </label>
                </div>
                {view === "overview" &&
                  filter === "attention" &&
                  !search &&
                  pending.length > 0 && (
                    <section className="ow-pending-inline">
                      <h3>Approvals to review</h3>
                      {pending.map((approval) => (
                        <button
                          key={approval.id}
                          onClick={() => showApproval(approval)}
                        >
                          <span>
                            <strong>{approval.title}</strong>
                            <small>Review the request before deciding</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    </section>
                  )}
                <div className="ow-list-label">
                  <span>
                    {filter === "attention"
                      ? "Tasks needing attention"
                      : "Recent work"}
                  </span>
                  <span aria-live="polite">
                    {visibleTasks.length}{" "}
                    {visibleTasks.length === 1 ? "task" : "tasks"}
                  </span>
                </div>
                {visibleTasks.length === 0 ? (
                  <Empty
                    title={
                      search || filter !== "all"
                        ? "No tasks match this view"
                        : "A clean slate"
                    }
                  >
                    {search || filter !== "all" ? (
                      <>
                        <span>Try a different search or status.</span>
                        <button
                          className="ow-text-button"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                            searchInput.current?.focus();
                          }}
                        >
                          Clear filters
                        </button>
                      </>
                    ) : (
                      "Create your first task in Paperclip to give the team something to work on."
                    )}
                  </Empty>
                ) : view === "board" ? (
                  <div
                    className="ow-board"
                    role="region"
                    aria-label="Recent work board"
                    tabIndex={0}
                  >
                    {[
                      {
                        status: "todo",
                        name: "To do",
                        match: ["todo", "backlog"],
                      },
                      {
                        status: "in_progress",
                        name: "In progress",
                        match: ["in_progress"],
                      },
                      {
                        status: "in_review",
                        name: "In review",
                        match: ["in_review"],
                      },
                      {
                        status: "blocked",
                        name: "Blocked",
                        match: ["blocked"],
                      },
                      {
                        status: "done",
                        name: "Closed",
                        match: ["done", "cancelled"],
                      },
                    ].map((column) => (
                      <section
                        className={`ow-board-column ow-column-${column.status}`}
                        key={column.status}
                      >
                        <h3>
                          <span className="ow-indicator" />
                          {column.name}
                          <small>
                            {
                              visibleTasks.filter((task) =>
                                column.match.includes(task.status),
                              ).length
                            }
                          </small>
                        </h3>
                        {visibleTasks
                          .filter((task) => column.match.includes(task.status))
                          .map((task) => (
                            <button
                              key={task.id}
                              className="ow-board-task"
                              onClick={() => showTask(task)}
                            >
                              <span className="ow-task-meta">
                                {task.identifier}
                              </span>
                              <strong>{task.title}</strong>
                              <span className="ow-board-owner">
                                {agents.find(
                                  (agent) => agent.id === task.agentId,
                                )?.name ?? "Unassigned"}
                              </span>
                            </button>
                          ))}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="ow-task-list">
                    {visibleTasks.map(taskRow)}
                  </div>
                )}
                {data.taskCoverage?.isLimited && (
                  <p className="ow-coverage">
                    Showing up to {data.taskCoverage.limit} recent tasks. Open
                    Tasks in Paperclip for the full company history.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <aside className="ow-aside">
          <section className="ow-attention-panel">
            <div className="ow-section-heading">
              <h2>Decisions waiting</h2>
              <span className="ow-count">{pending.length}</span>
            </div>
            {pending.length === 0 ? (
              <p className="ow-side-empty">
                No approvals waiting. You’re up to date.
              </p>
            ) : (
              pending.slice(0, 3).map((approval) => (
                <button
                  className="ow-approval"
                  key={approval.id}
                  onClick={() => showApproval(approval)}
                >
                  <span className="ow-approval-icon">
                    <ArrowDownLeft size={16} />
                  </span>
                  <span>
                    <strong>{approval.title}</strong>
                    <small>Approval requested</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))
            )}
          </section>
          <section className="ow-team-pulse">
            <div className="ow-section-heading">
              <h2>Team pulse</h2>
              <button
                className="ow-text-button"
                onClick={() => changeView("team")}
              >
                View team <ArrowUpRight size={13} />
              </button>
            </div>
            {team.length === 0 ? (
              <p className="ow-side-empty">Your agents will appear here.</p>
            ) : (
              team.slice(0, 5).map((agent, index) => (
                <button
                  key={agent.id}
                  className="ow-agent-row"
                  onClick={() => setSelected({ type: "agent", id: agent.id })}
                >
                  <span className={`ow-avatar ow-avatar-${index % 4}`}>
                    {initials(agent.name)}
                  </span>
                  <span>
                    <strong>{agent.name}</strong>
                    <small>{agent.role}</small>
                  </span>
                  <span
                    className={`ow-agent-state ow-agent-state-${agent.status}`}
                  >
                    {label(agent.status)}
                  </span>
                </button>
              ))
            )}
          </section>
          <div className="ow-note">
            <Clock3 size={15} aria-hidden="true" />
            <p>
              {mode === "demo"
                ? "A working preview with sample data. Explore freely; no agents or accounts are connected."
                : "An overview of your company. Review and manage work in Paperclip’s existing controls."}
            </p>
          </div>
        </aside>
      </div>
      <footer className="ow-footer">
        <span>{mode === "demo" ? "Sample company" : data.company.name}</span>
        <span>
          Snapshot{" "}
          {new Intl.DateTimeFormat("en", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
          }).format(new Date(data.updatedAt))}{" "}
          UTC
        </span>
      </footer>

      <dialog
        ref={dialog}
        className="ow-dialog"
        aria-labelledby={panelTitle}
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setSelected(null);
          }
        }}
      >
        <div className="ow-dialog-top">
          <span>
            {taskDetail?.identifier ??
              (approvalDetail
                ? "Approval request"
                : agentDetail
                  ? "Team member"
                  : "Company budget")}
          </span>
          <button
            className="ow-icon-button"
            onClick={() => setSelected(null)}
            aria-label="Close details"
            autoFocus
          >
            <X size={19} />
          </button>
        </div>
        <h2 id={panelTitle}>
          {taskDetail?.title ??
            approvalDetail?.title ??
            agentDetail?.name ??
            "A clear view of spending"}
        </h2>
        {(taskDetail || agentDetail) && (
          <Status status={taskDetail?.status ?? agentDetail!.status} />
        )}
        <p className="ow-detail-description">
          {taskDetail
            ? taskDetail.description ||
              "No description has been added to this task."
            : approvalDetail
              ? approvalDetail.description ||
                "Open the full request in Paperclip to review its details."
              : agentDetail
                ? `${agentDetail.role} · ${agentDetail.adapter}`
                : `${money(spent)} spent this month. ${limit > 0 ? `Monthly budget: ${money(limit)}.` : "No monthly limit is configured."}`}
        </p>
        {taskDetail && (
          <dl className="ow-detail-facts">
            <div>
              <dt>Assigned to</dt>
              <dd>
                {agents.find((agent) => agent.id === taskDetail.agentId)
                  ?.name ?? "Unassigned"}
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{label(taskDetail.priority)}</dd>
            </div>
            {taskDetail.projectName && (
              <div>
                <dt>Project</dt>
                <dd>{taskDetail.projectName}</dd>
              </div>
            )}
          </dl>
        )}
        {approvalDetail && (
          <div className="ow-detail-notice">
            <CircleHelp size={18} />
            <p>
              Review the full request and its impact in Paperclip before
              approving or rejecting it.
            </p>
          </div>
        )}
        {agentDetail && (
          <dl className="ow-detail-facts">
            <div>
              <dt>Monthly spend</dt>
              <dd>{money(agentDetail.spentCents)}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{agentDetail.adapter}</dd>
            </div>
          </dl>
        )}
        <div className="ow-detail-footer">
          {mode === "live" ? (
            <button
              className="ow-button ow-primary"
              onClick={() => {
                if (taskDetail) onOpenTask(taskDetail.id);
                else if (approvalDetail) onOpenApproval(approvalDetail.id);
                else if (agentDetail) onOpenAgent(agentDetail.id);
                else onOpenBudget();
                setSelected(null);
              }}
            >
              Open{" "}
              {taskDetail
                ? "task"
                : approvalDetail
                  ? "approval"
                  : agentDetail
                    ? "agent"
                    : "budget"}{" "}
              in Paperclip <ArrowUpRight size={15} />
            </button>
          ) : (
            <>
              <span className="ow-demo-label">Sample data</span>
              <p>
                This preview shows the experience. Live decisions stay in your
                connected Paperclip company.
              </p>
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
