import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { agentsApi } from "../api/agents";
import { approvalsApi } from "../api/approvals";
import { dashboardApi } from "../api/dashboard";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { buildWorkspaceData } from "../features/operator-workspace/model";
import { OperatorWorkspace } from "../features/operator-workspace/Workspace";

const RECENT_TASK_LIMIT = 100;

/** Read-only orientation layer; governed actions stay on their existing detail pages. */
export function OperatorWorkspacePage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const companyId = selectedCompanyId ?? "";
  const enabled = Boolean(companyId);
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard(companyId),
    queryFn: () => dashboardApi.summary(companyId),
    enabled,
  });
  const agents = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled,
  });
  const tasks = useQuery({
    queryKey: [
      ...queryKeys.issues.list(companyId),
      { operatorRecentTasks: RECENT_TASK_LIMIT },
    ],
    queryFn: () =>
      issuesApi.list(companyId, {
        limit: RECENT_TASK_LIMIT,
        sortField: "updated",
        sortDir: "desc",
      }),
    enabled,
  });
  const approvals = useQuery({
    queryKey: queryKeys.approvals.list(companyId),
    queryFn: () => approvalsApi.list(companyId),
    enabled,
  });
  const projects = useQuery({
    queryKey: queryKeys.projects.list(companyId),
    queryFn: () => projectsApi.list(companyId),
    enabled,
  });
  const queries = [dashboard, agents, tasks, approvals, projects];

  useEffect(() => setBreadcrumbs([{ label: "Overview" }]), [setBreadcrumbs]);

  const projection = useMemo(() => {
    if (
      !selectedCompany ||
      selectedCompany.id !== companyId ||
      !dashboard.data ||
      !agents.data ||
      !tasks.data ||
      !approvals.data ||
      !projects.data
    ) {
      return { data: null, error: null };
    }
    try {
      return {
        data: buildWorkspaceData({
          company: selectedCompany,
          dashboard: dashboard.data,
          agents: agents.data,
          issues: tasks.data,
          approvals: approvals.data,
          projects: projects.data,
          // The oldest successful response is the honest freshness bound for this composite view.
          updatedAt: new Date(
            Math.min(
              dashboard.dataUpdatedAt,
              agents.dataUpdatedAt,
              tasks.dataUpdatedAt,
              approvals.dataUpdatedAt,
              projects.dataUpdatedAt,
            ),
          ).toISOString(),
          taskLimit: RECENT_TASK_LIMIT,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "The overview could not be prepared.",
      };
    }
  }, [
    selectedCompany,
    companyId,
    dashboard.data,
    dashboard.dataUpdatedAt,
    agents.data,
    agents.dataUpdatedAt,
    tasks.data,
    tasks.dataUpdatedAt,
    approvals.data,
    approvals.dataUpdatedAt,
    projects.data,
    projects.dataUpdatedAt,
  ]);

  const failedQuery = queries.find((query) => query.error);
  const error = !companyId
    ? null
    : (projection.error ??
      (failedQuery?.error
        ? `Overview data could not be loaded: ${failedQuery.error.message}. Refresh to try again.`
        : null));

  return (
    <OperatorWorkspace
      key={companyId}
      data={projection.data}
      mode="live"
      loading={
        enabled &&
        !error &&
        queries.some((query) => query.isPending || query.isFetching)
      }
      error={error}
      onOpenTask={(id) => navigate(`/issues/${encodeURIComponent(id)}`)}
      onOpenApproval={(id) => navigate(`/approvals/${encodeURIComponent(id)}`)}
      onOpenAgent={(id) => navigate(`/agents/${encodeURIComponent(id)}`)}
      onOpenBudget={() => navigate("/costs")}
      onRefresh={() => {
        void Promise.all(queries.map((query) => query.refetch()));
      }}
    />
  );
}
