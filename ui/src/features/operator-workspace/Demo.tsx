import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Bot,
  CheckCheck,
  ChevronDown,
  CircleDot,
  Columns3,
  DollarSign,
  FolderOpen,
  LayoutGrid,
  Moon,
  Paperclip,
  Sun,
  UsersRound,
} from "lucide-react";
import { OperatorWorkspace, type WorkspaceDirection } from "./Workspace";
import { demoWorkspaceData } from "./fixtures";
import "./demo.css";

declare global {
  interface Window {
    __OPERATOR_DIRECTION__?: WorkspaceDirection;
  }
}
const validDirections: WorkspaceDirection[] = [
  "winner",
  "optimizer",
  "reimaginer",
  "converter",
];
const fromQuery = new URLSearchParams(window.location.search).get(
  "direction",
) as WorkspaceDirection;
const direction = validDirections.includes(fromQuery)
  ? fromQuery
  : (window.__OPERATOR_DIRECTION__ ?? "winner");
const directionNames: Record<WorkspaceDirection, string> = {
  winner: "Combined workspace",
  optimizer: "A · The optimizer",
  reimaginer: "B · The work board",
  converter: "C · The decision desk",
};
function Demo() {
  const [dark, setDark] = useState(false);
  const [scenario, setScenario] = useState("populated");
  const [section, setSection] = useState(
    direction === "reimaginer" ? "board" : "overview",
  );
  const [revision, setRevision] = useState(0);
  const data =
    scenario === "empty"
      ? {
          ...demoWorkspaceData,
          agents: [],
          tasks: [],
          approvals: [],
          budget: { spentCents: 0, limitCents: 0 },
          totals: {
            open: 0,
            inProgress: 0,
            blocked: 0,
            done: 0,
            pendingApprovals: 0,
            runningAgents: 0,
          },
        }
      : scenario === "over-budget"
        ? {
            ...demoWorkspaceData,
            budget: { spentCents: 61234, limitCents: 50000 },
          }
        : demoWorkspaceData;
  const attention =
    data.approvals.filter((item) =>
      ["pending", "revision_requested"].includes(item.status),
    ).length +
    data.tasks.filter((task) => ["blocked", "in_review"].includes(task.status))
      .length;
  const links = [
    { id: "overview", title: "Overview", icon: LayoutGrid },
    { id: "board", title: "Work board", icon: Columns3 },
    { id: "team", title: "Team", icon: UsersRound },
  ];
  function navigate(next: string) {
    setSection(next);
  }
  return (
    <div className={`ow-demo ${dark ? "dark" : ""}`}>
      <a className="ow-skip" href="#workspace-main">
        Skip to company overview
      </a>
      <div className="ow-demo-toolbar">
        <span>
          <span className="ow-demo-marker" />
          Paperclip 10x{" "}
          <span className="ow-demo-toolbar-note">
            / design & interaction preview
          </span>
        </span>
        <div>
          <label>
            <span className="ow-sr-only">Design direction</span>
            <select
              value={direction}
              onChange={(event) => {
                const next = new URL(window.location.href);
                next.searchParams.set("direction", event.target.value);
                window.location.href = next.href;
              }}
            >
              <option value="winner">Combined workspace</option>
              <option value="optimizer">A · The optimizer</option>
              <option value="reimaginer">B · The work board</option>
              <option value="converter">C · The decision desk</option>
            </select>
          </label>
          <label>
            <span className="ow-sr-only">Preview state</span>
            <select
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              <option value="populated">Sample company</option>
              <option value="empty">Empty state</option>
              <option value="loading">Loading state</option>
              <option value="error">Error state</option>
              <option value="over-budget">Over budget</option>
            </select>
          </label>
          <button
            className="ow-demo-theme"
            onClick={() => setDark(!dark)}
            aria-label={dark ? "Use light appearance" : "Use dark appearance"}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
      <div className="ow-demo-shell">
        <aside className="ow-demo-sidebar">
          <a
            href="https://github.com/megandmartin/paperclip-10x"
            className="ow-demo-brand"
          >
            <Paperclip size={23} strokeWidth={1.75} />
            <span>
              paperclip<span className="ow-brand-ten">10x</span>
            </span>
          </a>
          <div className="ow-company-chip">
            <span className="ow-company-monogram">f.</span>
            <span>
              <strong>Forma Studio</strong>
              <small>Sample company</small>
            </span>
          </div>
          <p className="ow-sidebar-label">Workspace</p>
          <nav aria-label="Demo navigation">
            {links.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                className={section === id ? "is-active" : ""}
                onClick={() => navigate(id)}
                aria-current={section === id ? "page" : undefined}
              >
                <Icon size={16} />
                {title}
                {id === "overview" &&
                  attention > 0 &&
                  !["loading", "error"].includes(scenario) && (
                    <span>{attention}</span>
                  )}
              </button>
            ))}
          </nav>
          <div className="ow-sidebar-spacer" />
          <div className="ow-demo-sidebar-note">
            <Bot size={19} />
            <strong>Big ideas. Small team.</strong>
            <p>One place to see the work your agents are doing.</p>
          </div>
          <a
            className="ow-demo-source"
            href="https://github.com/megandmartin/paperclip-10x"
          >
            Explore the source
            <ArrowUpRight size={14} />
          </a>
          <div className="ow-demo-profile">
            <span>M</span>
            <div>
              <strong>Megan</strong>
              <small>Product & design direction</small>
            </div>
          </div>
        </aside>
        <div className="ow-demo-main">
          <header className="ow-demo-topbar">
            <span>
              <FolderOpen size={14} />
              <strong>Forma Studio</strong>
              <span>/</span>
              {section === "team"
                ? "Team"
                : section === "board"
                  ? "Work board"
                  : "Overview"}
            </span>
            <span className="ow-demo-safe">
              <span />
              Interactive demo
            </span>
          </header>
          <main id="workspace-main" className="ow-demo-content" tabIndex={-1}>
            <OperatorWorkspace
              key={revision}
              data={scenario === "loading" ? null : data}
              loading={scenario === "loading"}
              error={
                scenario === "error"
                  ? "The company data is unavailable. Check the connection and try again."
                  : null
              }
              mode="demo"
              direction={direction}
              initialView={
                section === "team"
                  ? "team"
                  : section === "board"
                    ? "board"
                    : "overview"
              }
              onViewChange={setSection}
              onRefresh={() => {
                setScenario("populated");
                setRevision((value) => value + 1);
              }}
              onOpenTask={() => {}}
              onOpenApproval={() => {}}
              onOpenAgent={() => {}}
              onOpenBudget={() => {}}
            />
          </main>
          <div className="ow-demo-credit">
            An independent interface exploration by Megan (@megandmartin), built
            on <a href="https://github.com/paperclipai/paperclip">Paperclip</a>.{" "}
            {directionNames[direction]}.
          </div>
        </div>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
