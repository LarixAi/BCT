"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type View =
  | "overview"
  | "branches"
  | "budget"
  | "records"
  | "policies"
  | "company"
  | "organisation"
  | "governance"
  | "decisions"
  | "applications"
  | "security";

type DocumentKind = "records" | "policies";

type OpenDocument = {
  kind: DocumentKind;
  returnTo: View;
  item: Record<string, unknown>;
};

type ExecutiveIdentity = {
  displayName: string;
  role: string;
  companyName: string;
};

const primaryNav: Array<{ id: View; label: string; mark: string }> = [
  { id: "overview", label: "Today", mark: "T" },
  { id: "branches", label: "Branches & performance", mark: "B" },
  { id: "budget", label: "Budget & authority", mark: "£" },
  { id: "decisions", label: "Decisions", mark: "D" },
  { id: "records", label: "Company records", mark: "R" },
  { id: "policies", label: "Policies & controls", mark: "P" },
  { id: "organisation", label: "Organisation", mark: "O" },
  { id: "governance", label: "Governance & board", mark: "G" },
  { id: "company", label: "Company setup", mark: "C" },
];

const systemNav: Array<{ id: View; label: string; mark: string }> = [
  { id: "applications", label: "Applications & access", mark: "A" },
  { id: "security", label: "Security", mark: "S" },
];

function initialsFor(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  return initials || "VE";
}

function formatDate(value: unknown, fallback = "No date") {
  if (!value || typeof value !== "string") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(value: unknown) {
  if (!value || typeof value !== "string") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    : [];
}

/** Human labels for Executive / board-facing roles (not raw snake_case keys). */
const ROLE_LABELS: Record<string, string> = {
  company_owner: "Chief Executive",
  company_administrator: "Company administrator",
  director: "Director",
  board_member: "Board member",
  executive_reader: "Board reader",
  transport_manager: "Transport manager",
  operations_manager: "Operations manager",
  dispatcher: "Dispatcher",
  finance_director: "Finance director",
  finance_manager: "Finance manager",
  hr_director: "HR director",
  hr_manager: "HR manager",
  yard_manager: "Yard manager",
  yard_operative: "Yard operative",
  driver: "Driver",
  escort: "Passenger assistant",
};

const BOARD_ROLE_PRIORITY = [
  "company_owner",
  "director",
  "board_member",
  "company_administrator",
  "executive_reader",
] as const;

function formatRoleLabel(role: string): string {
  const key = String(role ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  return ROLE_LABELS[key] ?? key.replaceAll("_", " ");
}

function formatRoleList(roles: unknown): string {
  const list = Array.isArray(roles) ? roles.map(String) : [];
  const labels = list.map(formatRoleLabel).filter(Boolean);
  return labels.join(" · ") || "No role assigned";
}

/** Board office shown on Governance — prefers board titles over raw role keys. */
function boardOfficeLabel(roles: unknown, options?: { secondaryOwner?: boolean }): string {
  const list = (Array.isArray(roles) ? roles.map(String) : []).map((role) =>
    role.trim().toLowerCase(),
  );
  if (options?.secondaryOwner && list.includes("company_owner")) {
    return "Company owner";
  }
  for (const key of BOARD_ROLE_PRIORITY) {
    if (list.includes(key)) return ROLE_LABELS[key] ?? formatRoleLabel(key);
  }
  return formatRoleList(roles) || "Board member";
}

function boardRolesForDisplay(roles: unknown): string {
  const list = (Array.isArray(roles) ? roles.map(String) : [])
    .map((role) => role.trim().toLowerCase())
    .filter((role) =>
      (BOARD_ROLE_PRIORITY as readonly string[]).includes(role),
    );
  const ordered = BOARD_ROLE_PRIORITY.filter((role) => list.includes(role));
  return ordered.map((role) => ROLE_LABELS[role] ?? formatRoleLabel(role)).join(" · ");
}

function useExecutivePage(page: View) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const cacheRef = useRef(new Map<View, Record<string, unknown>>());

  useEffect(() => {
    let cancelled = false;
    const cached = cacheRef.current.get(page) ?? null;
    setData(cached);
    setLoading(!cached);
    setError("");

    const started = performance.now();
    fetch(`/api/executive/pages/${page}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!response.ok) {
          throw new Error(
            String(payload.message ?? "This Executive page could not be loaded."),
          );
        }
        if (!cancelled) {
          cacheRef.current.set(page, payload);
          setData(payload);
          if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
            console.debug(
              `[executive] ${page} loaded in ${Math.round(performance.now() - started)}ms`,
            );
          }
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          if (!cached) setData(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "This Executive page could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  return {
    data,
    error,
    loading,
    refresh: (target?: View) => {
      cacheRef.current.delete(target ?? page);
      setReloadToken((value) => value + 1);
    },
  };
}

export default function ExecutiveApp({
  identity,
}: {
  identity: ExecutiveIdentity;
}) {
  const [view, setView] = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [openDocument, setOpenDocument] = useState<OpenDocument | null>(null);
  const { data, error, loading, refresh } = useExecutivePage(
    openDocument ? openDocument.returnTo : view,
  );

  const firstName = identity.displayName.trim().split(/\s+/)[0] || "Executive";
  const title = openDocument
    ? String(openDocument.item.title ?? "Document")
    : ([...primaryNav, ...systemNav].find((item) => item.id === view)?.label ??
      "Executive overview");
  const topbarEyebrow = openDocument
    ? `${identity.companyName} · ${
        openDocument.kind === "records" ? "Company records" : "Policies"
      }`
    : `${identity.companyName} · signed in as ${firstName}`;
  const profileInitials = initialsFor(identity.displayName);
  const attentionCount = useMemo(() => {
    if ((openDocument ? openDocument.returnTo : view) !== "overview" || !data) {
      return undefined;
    }
    const attention = asRows(data.attention);
    return attention.length || undefined;
  }, [data, openDocument, view]);

  function navigate(next: View) {
    setOpenDocument(null);
    setView(next);
    setSidebarOpen(false);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDoc(kind: DocumentKind, item: Record<string, unknown>) {
    setOpenDocument({
      kind,
      returnTo: kind === "records" ? "records" : "policies",
      item,
    });
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="executive-shell">
      <button
        className="mobile-menu"
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        ☰
      </button>

      {sidebarOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            V
          </div>
          <div>
            <strong>Veyvio</strong>
            <span>Executive</span>
          </div>
        </div>

        <nav aria-label="Executive">
          {primaryNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                (openDocument?.returnTo ?? view) === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => navigate(item.id)}
            >
              <span className="nav-mark" aria-hidden>
                {item.mark}
              </span>
              <span>{item.label}</span>
              {item.id === "overview" && attentionCount ? (
                <span className="nav-badge">{attentionCount}</span>
              ) : null}
            </button>
          ))}
          <div className="nav-divider" role="separator" aria-hidden />
          {systemNav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                (openDocument?.returnTo ?? view) === item.id
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => navigate(item.id)}
            >
              <span className="nav-mark" aria-hidden>
                {item.mark}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="profile-avatar">{profileInitials}</span>
            <div>
              <strong>{identity.displayName}</strong>
              <small>{formatRoleLabel(identity.role) || identity.role}</small>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="signout-form">
            <input type="hidden" name="return_to" value="/" />
            <button className="signout-button" type="submit">
              Sign out
            </button>
          </form>
          <div className="secure-label">
            <span aria-hidden>✓</span>
            <span>Authenticated Executive session</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="live-banner" role="status">
          Live company data · empty panels mean no records yet
        </div>

        <header className="topbar">
          <div>
            <span className="eyebrow">
              {topbarEyebrow}
            </span>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="app-launcher-button"
              type="button"
              onClick={() => navigate("applications")}
            >
              <span className="launcher-grid" aria-hidden>
                ⠿
              </span>
              Open a Veyvio app
            </button>
          </div>
        </header>

        {notice ? (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
              ×
            </button>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="page">
            <p className="loading-copy">Loading live Executive records…</p>
          </div>
        ) : null}
        {loading && data ? (
          <div className="live-banner refreshing" role="status">
            Refreshing…
          </div>
        ) : null}
        {error && !data ? (
          <div className="page">
            <p className="auth-error" role="alert">
              {error}
            </p>
          </div>
        ) : null}
        {data && openDocument ? (
          <DocumentPage
            document={openDocument}
            onBack={() => {
              setOpenDocument(null);
              setView(openDocument.returnTo);
            }}
            onNavigate={navigate}
            onSaved={(item) => {
              setOpenDocument({ ...openDocument, item });
              setNotice(`${String(item.title ?? "Document")} saved.`);
              refresh(openDocument.returnTo);
            }}
            setNotice={setNotice}
          />
        ) : null}
        {data && !openDocument ? (
          <PageBody
            view={view}
            data={data}
            identity={identity}
            firstName={firstName}
            onNavigate={navigate}
            onOpenDocument={openDoc}
            onRefresh={() => refresh(view)}
            setNotice={setNotice}
          />
        ) : null}
      </main>
    </div>
  );
}

function PageBody({
  view,
  data,
  identity,
  firstName,
  onNavigate,
  onOpenDocument,
  onRefresh,
  setNotice,
}: {
  view: View;
  data: Record<string, unknown>;
  identity: ExecutiveIdentity;
  firstName: string;
  onNavigate: (view: View) => void;
  onOpenDocument: (kind: DocumentKind, item: Record<string, unknown>) => void;
  onRefresh: () => void;
  setNotice: (message: string) => void;
}) {
  switch (view) {
    case "overview":
      return (
        <OverviewPage
          data={data}
          firstName={firstName}
          companyName={identity.companyName}
          onNavigate={onNavigate}
        />
      );
    case "branches":
      return <BranchesPage data={data} onNavigate={onNavigate} setNotice={setNotice} />;
    case "budget":
      return (
        <BudgetPage
          data={data}
          onRefresh={onRefresh}
          setNotice={setNotice}
        />
      );
    case "records":
      return <RecordsPage data={data} onOpenDocument={onOpenDocument} />;
    case "policies":
      return <PoliciesPage data={data} onOpenDocument={onOpenDocument} />;
    case "company":
      return <CompanyPage data={data} />;
    case "organisation":
      return <OrganisationPage data={data} setNotice={setNotice} />;
    case "governance":
      return <GovernancePage data={data} setNotice={setNotice} />;
    case "decisions":
      return <DecisionsPage data={data} setNotice={setNotice} />;
    case "applications":
      return (
        <ApplicationsPage data={data} onRefresh={onRefresh} setNotice={setNotice} />
      );
    case "security":
      return <SecurityPage data={data} setNotice={setNotice} />;
    default:
      return null;
  }
}

function PageIntro({
  kicker,
  title,
  copy,
  action,
  onAction,
}: {
  kicker: string;
  title: string;
  copy: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="page-intro">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      {action ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DailyCheck({
  label,
  value,
  detail,
  state,
}: {
  label: string;
  value: string;
  detail: string;
  state: "healthy" | "attention" | "critical";
}) {
  return (
    <article className={`daily-check ${state}`}>
      <div>
        <i className={`status-light ${state}`} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DecisionRow({
  priority,
  title,
  detail,
  owner,
  due,
}: {
  priority: string;
  title: string;
  detail: string;
  owner: string;
  due: string;
}) {
  return (
    <article className="decision-row">
      <span className={`priority priority-${priority.toLowerCase()}`}>{priority}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <span>{owner}</span>
      <span>{due}</span>
    </article>
  );
}

function Timeline({
  date,
  title,
  meta,
}: {
  date: string;
  title: string;
  meta: string;
}) {
  return (
    <article className="timeline-item">
      <span>{date}</span>
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
    </article>
  );
}

function NoDataRow({ label }: { label: string }) {
  return (
    <article className="empty-row">
      <strong>No data</strong>
      <small>{label}</small>
    </article>
  );
}

function OverviewPage({
  data,
  firstName,
  companyName,
  onNavigate,
}: {
  data: Record<string, unknown>;
  firstName: string;
  companyName: string;
  onNavigate: (view: View) => void;
}) {
  const metrics = (data.metrics ?? {}) as Record<string, number>;
  const attention = asRows(data.attention);
  const decisions = asRows(data.pendingDecisions);
  const meetings = asRows(data.upcomingMeetings);
  const company = (data.company ?? {}) as Record<string, unknown>;
  const openIssues =
    Number(metrics.openIncidents ?? 0) +
    Number(metrics.openDefects ?? 0) +
    decisions.length +
    attention.length;
  const healthyAreas = Math.max(0, 7 - Math.min(7, openIssues));

  return (
    <div className="page">
      <section className="welcome executive-welcome">
        <div>
          <span className="section-kicker">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <h2>Good day, {firstName}.</h2>
          <p>
            Live company position for {String(company.tradingName ?? companyName)}. Protect
            people, keep the company lawful, and stay on top of exceptions across every
            branch.
          </p>
          <div className="welcome-status">
            <span>
              <i
                className={`status-light ${openIssues > 0 ? "attention" : "healthy"}`}
              />{" "}
              {openIssues > 0
                ? "Company requires attention"
                : "No open Executive exceptions"}
            </span>
            <button type="button" onClick={() => onNavigate("decisions")}>
              {decisions.length} decision{decisions.length === 1 ? "" : "s"} need you →
            </button>
          </div>
        </div>
        <div className="ceo-pulse">
          <span>CEO daily check</span>
          <strong>
            {healthyAreas} of 7
          </strong>
          <small>areas healthy</small>
        </div>
      </section>

      <section className="daily-check-grid" aria-label="Daily company position">
        <DailyCheck
          label="Open incidents"
          value={String(metrics.openIncidents ?? 0)}
          detail={
            Number(metrics.openIncidents ?? 0) === 0
              ? "No data / none open"
              : "Requires leadership visibility"
          }
          state={Number(metrics.openIncidents ?? 0) > 0 ? "critical" : "healthy"}
        />
        <DailyCheck
          label="Open defects"
          value={String(metrics.openDefects ?? 0)}
          detail={
            Number(metrics.openDefects ?? 0) === 0
              ? "No data / none open"
              : "Fleet attention required"
          }
          state={Number(metrics.openDefects ?? 0) > 0 ? "attention" : "healthy"}
        />
        <DailyCheck
          label="Active duties"
          value={String(metrics.activeDuties ?? 0)}
          detail={
            Number(metrics.activeDuties ?? 0) === 0
              ? "No data / none active"
              : "Live operating duties"
          }
          state="healthy"
        />
        <DailyCheck
          label="Vehicles"
          value={String(metrics.vehicles ?? 0)}
          detail={
            Number(metrics.vehicles ?? 0) === 0 ? "No fleet records yet" : "On company register"
          }
          state="healthy"
        />
        <DailyCheck
          label="Pending decisions"
          value={String(metrics.pendingDecisions ?? 0)}
          detail={
            Number(metrics.pendingDecisions ?? 0) === 0
              ? "No data / none pending"
              : "Awaiting Executive authority"
          }
          state={Number(metrics.pendingDecisions ?? 0) > 0 ? "attention" : "healthy"}
        />
        <DailyCheck
          label="People"
          value={String(metrics.members ?? 0)}
          detail={
            Number(metrics.members ?? 0) === 0
              ? "No members yet"
              : `${metrics.openInvitations ?? 0} open invitation(s)`
          }
          state="healthy"
        />
      </section>

      {attention.length > 0 ? (
        <section className="critical-strip">
          <div className="critical-icon" aria-hidden>
            !
          </div>
          <div>
            <strong>{String(attention[0].label)}</strong>
            <span>
              Live exception from company operations or Executive queues. Review the
              owning register before approving related decisions.
            </span>
          </div>
          <button type="button" onClick={() => onNavigate("security")}>
            Review now
          </button>
        </section>
      ) : null}

      <div className="content-grid">
        <section className="panel span-2">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Leadership attention</span>
              <h3>Decisions requiring CEO or board authority</h3>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate("decisions")}
            >
              View all decisions →
            </button>
          </div>
          <div className="decision-list">
            {decisions.length === 0 ? (
              <NoDataRow label="No pending Executive decisions have been recorded yet." />
            ) : (
              decisions.map((row) => (
                <DecisionRow
                  key={String(row.id)}
                  priority={String(row.decisionType ?? "Attention")}
                  title={String(row.title ?? "Untitled decision")}
                  detail={String(row.summary ?? "No supporting summary yet")}
                  owner={String(row.status ?? "pending")}
                  due={formatDate(row.dueAt, "No due date")}
                />
              ))
            )}
          </div>
        </section>

        <section className="panel ceo-question-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Decision discipline</span>
              <h3>Before you approve</h3>
            </div>
          </div>
          <div className="question-list">
            <span>Is it safe and lawful?</span>
            <span>Can the company afford it?</span>
            <span>Is it within my delegated authority?</span>
            <span>What evidence supports the decision?</span>
          </div>
          <small className="authority-note">
            Safety decisions remain with the accountable safety or transport officer.
            Board-reserved matters cannot be self-approved by the CEO.
          </small>
        </section>

        <section className="panel span-2">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Needs attention</span>
              <h3>Live exceptions</h3>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate("branches")}
            >
              Open branch view →
            </button>
          </div>
          <div className="branch-summary-list">
            {attention.length === 0 ? (
              <NoDataRow label="No live exceptions. Company queues are clear." />
            ) : (
              attention.map((row) => (
                <button
                  key={String(row.code)}
                  type="button"
                  onClick={() => onNavigate("security")}
                >
                  <span className="branch-code">!</span>
                  <span>
                    <strong>{String(row.label)}</strong>
                    <small>{String(row.severity ?? "attention")}</small>
                  </span>
                  <span className={`status ${String(row.severity) === "critical" ? "critical" : "attention"}`}>
                    {String(row.severity ?? "attention")}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Board and governance</span>
              <h3>Next key dates</h3>
            </div>
          </div>
          <div className="timeline">
            {meetings.length === 0 ? (
              <NoDataRow label="No board meetings scheduled yet." />
            ) : (
              meetings.map((row) => (
                <Timeline
                  key={String(row.id)}
                  date={formatDay(row.scheduledAt)}
                  title={String(row.title ?? "Untitled meeting")}
                  meta={String(row.status ?? "planned")}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function BranchesPage({
  data,
  onNavigate,
  setNotice,
}: {
  data: Record<string, unknown>;
  onNavigate: (view: View) => void;
  setNotice: (message: string) => void;
}) {
  const branches = asRows(data.branches);
  const ops = (data.companyOps ?? {}) as Record<string, number>;

  return (
    <div className="page">
      <PageIntro
        kicker="One company, locally accountable"
        title="Branches and performance"
        copy="Each operating branch has a named manager, budget, fleet, people, compliance record and escalation path. The CEO sees exceptions across the whole legal entity."
        action="Refresh branch view"
        onAction={() => onNavigate("branches")}
      />

      <section className="metric-grid governance-metrics">
        <Metric
          label="Operating branches"
          value={String(branches.length)}
          detail={branches.length === 0 ? "No data yet" : "Live depots"}
          tone="navy"
        />
        <Metric
          label="Active duties"
          value={String(ops.activeDuties ?? 0)}
          detail={Number(ops.activeDuties ?? 0) === 0 ? "No data / none active" : "Company-wide"}
          tone="teal"
        />
        <Metric
          label="Open defects"
          value={String(ops.openDefects ?? 0)}
          detail={Number(ops.openDefects ?? 0) === 0 ? "No data / none open" : "Needs review"}
          tone="amber"
        />
        <Metric
          label="Vehicles"
          value={String(ops.vehicles ?? 0)}
          detail={Number(ops.vehicles ?? 0) === 0 ? "No data yet" : "On register"}
          tone="green"
        />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">CEO branch scorecard</span>
            <h3>Performance, control and accountability</h3>
          </div>
          <span className="data-stamp">Live depot register</span>
        </div>
        <div className="branch-table">
          <div className="branch-table-head">
            <span>Branch and manager</span>
            <span>Services</span>
            <span>Fleet ready</span>
            <span>Annual budget</span>
            <span>Forecast variance</span>
            <span>Risks</span>
            <span>Status</span>
            <span />
          </div>
          {branches.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No depots have been created for this company yet.</small>
            </article>
          ) : (
            branches.map((branch) => (
              <article key={String(branch.id)}>
                <div>
                  <span className="branch-code">{String(branch.code ?? "—")}</span>
                  <span>
                    <strong>{String(branch.name)}</strong>
                    <small>Depot</small>
                  </span>
                </div>
                <strong>—</strong>
                <strong>—</strong>
                <button
                  className="branch-budget-link"
                  type="button"
                  onClick={() => {
                    setNotice("Detailed branch budgets remain in Finance / Cost Control.");
                    onNavigate("budget");
                  }}
                >
                  <strong>No data</strong>
                  <small>View authority →</small>
                </button>
                <span className="variance">No data</span>
                <span>—</span>
                <span className="status healthy">{String(branch.status ?? "active")}</span>
                <button
                  type="button"
                  onClick={() =>
                    setNotice(`${String(branch.name)} opened from the live depot register.`)
                  }
                >
                  Open →
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="content-grid branch-lower-grid">
        <section className="panel span-2">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Escalation</span>
              <h3>Branch interventions</h3>
            </div>
            <span className="status attention">
              {Number(ops.openIncidents ?? 0) + Number(ops.openDefects ?? 0)} actions
            </span>
          </div>
          <div className="branch-exceptions">
            {Number(ops.openIncidents ?? 0) === 0 && Number(ops.openDefects ?? 0) === 0 ? (
              <NoDataRow label="No branch escalations recorded." />
            ) : (
              <>
                {Number(ops.openIncidents ?? 0) > 0 ? (
                  <article>
                    <span className="priority priority-attention">Incidents</span>
                    <div>
                      <strong>{ops.openIncidents} open incident(s)</strong>
                      <small>Visible from live operations data.</small>
                    </div>
                    <button type="button" onClick={() => setNotice("Open Command for incident detail.")}>
                      Open Command
                    </button>
                  </article>
                ) : null}
                {Number(ops.openDefects ?? 0) > 0 ? (
                  <article>
                    <span className="priority priority-board">Fleet</span>
                    <div>
                      <strong>{ops.openDefects} open defect(s)</strong>
                      <small>Visible from live fleet data.</small>
                    </div>
                    <button type="button" onClick={() => setNotice("Open Command for defect detail.")}>
                      Open Command
                    </button>
                  </article>
                ) : null}
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Branch control model</span>
              <h3>Minimum local controls</h3>
            </div>
          </div>
          <div className="question-list compact">
            <span>Named accountable manager</span>
            <span>Approved cost centre and spending limit</span>
            <span>Local risk and incident register</span>
            <span>Monthly performance review</span>
            <span>Central document and audit evidence</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function BudgetPage({
  data,
  onRefresh,
  setNotice,
}: {
  data: Record<string, unknown>;
  onRefresh: () => void;
  setNotice: (message: string) => void;
}) {
  const mandates = asRows(data.mandates);
  const annualBudgets = asRows(data.annualBudgets);
  const approvedBudgets = asRows(data.approvedBudgets);
  const pendingApprovals = asRows(data.pendingBudgetApprovals);
  const permissions = (data.permissions ?? {}) as Record<string, unknown>;
  const subscription = (data.subscription ?? null) as Record<string, unknown> | null;
  const company = (data.company ?? {}) as Record<string, unknown>;
  const approvedBudget = approvedBudgets[0] ?? null;
  const [showProposal, setShowProposal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [financialYear, setFinancialYear] = useState("2026/27");
  const [title, setTitle] = useState("Veyvio annual company budget");
  const [budgetCode, setBudgetCode] = useState("VEY-FY27");
  const [financeReference, setFinanceReference] = useState("");
  const [totalIncome, setTotalIncome] = useState("");
  const [contingency, setContingency] = useState("0.00");
  const [linesText, setLinesText] = useState(
    "WAGES | Driver and staff wages | People | 0.00\nFUEL | Fuel and AdBlue | Fleet | 0.00\nMAINT | Maintenance and MOT | Fleet | 0.00\nOVERHEAD | Premises and overhead | Operating | 0.00",
  );
  const [proposalReason, setProposalReason] = useState("");
  const [evidenceText, setEvidenceText] = useState("");

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/executive/annual-budgets/proposals", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialYear,
          title,
          budgetCode,
          financeBudgetReference: financeReference,
          currency: "GBP",
          totalIncomeMinor: moneyInputToMinor(totalIncome, "Total income"),
          contingencyMinor: moneyInputToMinor(contingency, "Contingency"),
          lineItems: parseBudgetLines(linesText),
          reason: proposalReason,
          evidenceReferences: evidenceText
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(
          String(payload.message ?? "The annual budget proposal could not be submitted."),
        );
      }
      setShowProposal(false);
      setProposalReason("");
      setEvidenceText("");
      setNotice("Budget proposal recorded and sent for independent approval.");
      onRefresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The annual budget proposal could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function decideBudget(
    requestId: string,
    decision: "approved" | "rejected",
  ) {
    if (decisionReason.trim().length < 5) {
      setNotice("Add a decision reason of at least five characters.");
      return;
    }
    setDecisionBusy(true);
    try {
      const response = await fetch(
        `/api/executive/annual-budgets/proposals/${encodeURIComponent(requestId)}/decision`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reason: decisionReason }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(
          String(payload.message ?? "The annual budget decision could not be recorded."),
        );
      }
      setReviewingRequestId(null);
      setDecisionReason("");
      setNotice(
        decision === "approved"
          ? "Budget independently approved and activated."
          : "Budget proposal rejected with a permanent audit record.",
      );
      onRefresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The annual budget decision could not be recorded.",
      );
    } finally {
      setDecisionBusy(false);
    }
  }

  return (
    <div className="page">
      <PageIntro
        kicker="Board-approved financial control"
        title="Annual budget and authority"
        copy={String(
          data.note ??
            "Finance prepares the detailed annual cost budget. Executive records the formal independent approval and preserves every version.",
        )}
        action={permissions.canPropose ? "Propose annual budget" : undefined}
        onAction={() => setShowProposal((value) => !value)}
      />

      <section className="metric-grid">
        <Metric
          label="Approved expenditure"
          value={
            approvedBudget
              ? formatMinorMoney(approvedBudget.totalExpenditureMinor)
              : "Not approved"
          }
          detail={
            approvedBudget
              ? `${String(approvedBudget.financialYear)} · version ${String(approvedBudget.version)}`
              : "A Board-approved version is required"
          }
          tone="navy"
        />
        <Metric
          label="Approved income"
          value={
            approvedBudget
              ? formatMinorMoney(approvedBudget.totalIncomeMinor)
              : "—"
          }
          detail={
            approvedBudget
              ? `Reference ${String(approvedBudget.financeBudgetReference)}`
              : "No active annual budget"
          }
          tone="teal"
        />
        <Metric
          label="Awaiting decision"
          value={String(pendingApprovals.length)}
          detail={
            pendingApprovals.length === 0
              ? "No Board decisions waiting"
              : "Independent reviewer required"
          }
          tone="amber"
        />
        <Metric
          label="Preserved versions"
          value={String(annualBudgets.length)}
          detail="Approved versions never change"
          tone="green"
        />
      </section>

      {showProposal && permissions.canPropose ? (
        <section className="panel annual-budget-form-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Formal proposal</span>
              <h3>Send an exact Finance snapshot for Board approval</h3>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => setShowProposal(false)}
            >
              Close
            </button>
          </div>
          <form className="annual-budget-form" onSubmit={submitProposal}>
            <div className="annual-budget-field-grid">
              <label>
                <span>Financial year</span>
                <input
                  required
                  pattern="[0-9]{4}/[0-9]{2}"
                  value={financialYear}
                  onChange={(event) => setFinancialYear(event.target.value)}
                  placeholder="2026/27"
                />
              </label>
              <label>
                <span>Budget code</span>
                <input
                  required
                  value={budgetCode}
                  onChange={(event) => setBudgetCode(event.target.value)}
                  placeholder="VEY-FY27"
                />
              </label>
              <label className="wide">
                <span>Budget title</span>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="wide">
                <span>Finance / Cost Control reference</span>
                <input
                  required
                  value={financeReference}
                  onChange={(event) => setFinanceReference(event.target.value)}
                  placeholder="CEC-FY27 approved draft"
                />
              </label>
              <label>
                <span>Total income (£)</span>
                <input
                  required
                  inputMode="decimal"
                  value={totalIncome}
                  onChange={(event) => setTotalIncome(event.target.value)}
                  placeholder="1,250,000.00"
                />
              </label>
              <label>
                <span>Contingency (£)</span>
                <input
                  required
                  inputMode="decimal"
                  value={contingency}
                  onChange={(event) => setContingency(event.target.value)}
                />
              </label>
              <label className="wide">
                <span>Expenditure lines</span>
                <textarea
                  required
                  rows={7}
                  value={linesText}
                  onChange={(event) => setLinesText(event.target.value)}
                  aria-describedby="budget-line-help"
                />
                <small id="budget-line-help">
                  One line each: Code | Description | Category | £ amount.
                  Contingency is added separately.
                </small>
              </label>
              <label className="wide">
                <span>Why this budget should be approved</span>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={proposalReason}
                  onChange={(event) => setProposalReason(event.target.value)}
                />
              </label>
              <label className="wide">
                <span>Evidence references</span>
                <textarea
                  required
                  rows={3}
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  placeholder={"Board paper reference\nFinance workbook reference"}
                />
                <small>Enter one controlled document reference per line.</small>
              </label>
            </div>
            <div className="annual-budget-submit-row">
              <p>
                Submission creates a locked version. A different Director or Board
                Member must approve it using recent MFA.
              </p>
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit for independent approval"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Board decision queue</span>
            <h3>
              {pendingApprovals.length} proposal
              {pendingApprovals.length === 1 ? "" : "s"} awaiting decision
            </h3>
          </div>
          <span className="status attention">Recent MFA required</span>
        </div>
        <div className="annual-budget-list">
          {pendingApprovals.length === 0 ? (
            <article className="empty-row-span">
              <strong>No annual budget decisions are waiting</strong>
              <small>New Finance snapshots will appear here after submission.</small>
            </article>
          ) : (
            pendingApprovals.map((row) => {
              const approval = (row.approval ?? {}) as Record<string, unknown>;
              const requestId = String(approval.id ?? "");
              const isReviewing = reviewingRequestId === requestId;
              return (
                <article key={String(row.id)} className="annual-budget-row">
                  <div className="annual-budget-row-main">
                    <span className="priority priority-board">Awaiting Board</span>
                    <strong>{String(row.title)}</strong>
                    <small>
                      {String(row.financialYear)} · version {String(row.version)} ·{" "}
                      {String(row.budgetCode)}
                    </small>
                  </div>
                  <div>
                    <span>Expenditure</span>
                    <strong>{formatMinorMoney(row.totalExpenditureMinor)}</strong>
                  </div>
                  <div>
                    <span>Finance reference</span>
                    <strong>{String(row.financeBudgetReference)}</strong>
                  </div>
                  {row.canCurrentUserApprove ? (
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => {
                        setReviewingRequestId(isReviewing ? null : requestId);
                        setDecisionReason("");
                      }}
                    >
                      {isReviewing ? "Close review" : "Review decision"}
                    </button>
                  ) : (
                    <span className="status neutral">Independent reviewer only</span>
                  )}
                  {isReviewing ? (
                    <div className="annual-budget-decision">
                      <label>
                        <span>Decision reason</span>
                        <textarea
                          rows={3}
                          value={decisionReason}
                          onChange={(event) => setDecisionReason(event.target.value)}
                          placeholder="Record the Board’s reason and material considerations."
                        />
                      </label>
                      <div>
                        <button
                          type="button"
                          className="danger-button"
                          disabled={decisionBusy}
                          onClick={() => void decideBudget(requestId, "rejected")}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={decisionBusy}
                          onClick={() => void decideBudget(requestId, "approved")}
                        >
                          {decisionBusy ? "Recording…" : "Approve and activate"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Controlled history</span>
            <h3>Annual budget versions</h3>
          </div>
          <span className="data-stamp">
            {String(company.tradingName ?? "Company")} ·{" "}
            {String(subscription?.status ?? company.tenantStatus ?? "active")}
          </span>
        </div>
        <div className="annual-budget-history">
          {annualBudgets.length === 0 ? (
            <article className="empty-row-span">
              <strong>No annual budget snapshot has been recorded</strong>
              <small>
                The first submitted version will appear here with its content hash
                and approval status.
              </small>
            </article>
          ) : (
            annualBudgets.map((row) => (
              <article key={String(row.id)}>
                <div>
                  <span
                    className={`status ${
                      row.status === "approved"
                        ? "healthy"
                        : row.status === "rejected"
                          ? "critical"
                          : "attention"
                    }`}
                  >
                    {String(row.status ?? "proposed")}
                  </span>
                  <strong>{String(row.title)}</strong>
                  <small>
                    {String(row.financialYear)} · version {String(row.version)} ·{" "}
                    {formatDate(row.createdAt)}
                  </small>
                </div>
                <div>
                  <span>Income</span>
                  <strong>{formatMinorMoney(row.totalIncomeMinor)}</strong>
                </div>
                <div>
                  <span>Expenditure</span>
                  <strong>{formatMinorMoney(row.totalExpenditureMinor)}</strong>
                </div>
                <div>
                  <span>Snapshot proof</span>
                  <code>{String(row.contentHash ?? "pending").slice(0, 12)}…</code>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Spending authority</span>
            <h3>Delegated limits</h3>
          </div>
        </div>
        <div className="decision-table">
          {mandates.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No Executive spending mandates have been recorded yet.</small>
            </article>
          ) : (
            mandates.map((row) => (
              <article key={String(row.id)}>
                <span className="priority priority-board">{String(row.status ?? "active")}</span>
                <div>
                  <strong>{String(row.title)}</strong>
                  <small>{String(row.authorityRole)}</small>
                </div>
                <strong>
                  {row.limitAmountMinor == null
                    ? "No limit set"
                    : `£${(Number(row.limitAmountMinor) / 100).toLocaleString("en-GB")}`}
                </strong>
                <span>{String(row.currency ?? "GBP")}</span>
                <button type="button" onClick={() => setNotice(`${String(row.title)} opened.`)}>
                  Review →
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function formatMinorMoney(value: unknown, currency = "GBP") {
  const amountMinor = Number(value);
  if (!Number.isSafeInteger(amountMinor)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function moneyInputToMinor(value: string, label: string) {
  const normalized = value.trim().replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative amount with no more than two decimals.`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  const amount =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${label} is too large.`);
  }
  return Number(amount);
}

function parseBudgetLines(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("Add at least one expenditure line.");
  }
  const codes = new Set<string>();
  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length !== 4 || parts.some((part) => !part)) {
      throw new Error(
        `Expenditure line ${index + 1} must contain code, description, category and amount.`,
      );
    }
    const [code, label, category, amount] = parts;
    const normalizedCode = code.toLowerCase();
    if (codes.has(normalizedCode)) {
      throw new Error(`Expenditure line code ${code} is duplicated.`);
    }
    codes.add(normalizedCode);
    return {
      code,
      label,
      category,
      amountMinor: moneyInputToMinor(amount.replace(/^£/, ""), `Line ${index + 1}`),
      costCentreId: null,
    };
  });
}

function RecordsPage({
  data,
  onOpenDocument,
}: {
  data: Record<string, unknown>;
  onOpenDocument: (kind: DocumentKind, item: Record<string, unknown>) => void;
}) {
  const records = asRows(data.records);

  return (
    <div className="page">
      <PageIntro
        kicker="Controlled evidence"
        title="Company records"
        copy="Legal identifiers and controlled company records for leadership assurance. Open a record to read the document."
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Register</span>
            <h3>{records.length} record{records.length === 1 ? "" : "s"}</h3>
          </div>
        </div>
        <div className="decision-table">
          {records.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No company records have been recorded yet.</small>
            </article>
          ) : (
            records.map((row) => (
              <article key={String(row.id)} className="record-row">
                <span className="priority priority-board">
                  {String(row.recordType ?? "record")}
                </span>
                <button
                  type="button"
                  className="record-row-main"
                  onClick={() => onOpenDocument("records", row)}
                >
                  <strong>{String(row.title)}</strong>
                  <small>{String(row.reference ?? "No reference")}</small>
                </button>
                <strong>{String(row.status ?? "current")}</strong>
                <span>{formatDay(row.effectiveTo)}</span>
                <button type="button" onClick={() => onOpenDocument("records", row)}>
                  Open →
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PoliciesPage({
  data,
  onOpenDocument,
}: {
  data: Record<string, unknown>;
  onOpenDocument: (kind: DocumentKind, item: Record<string, unknown>) => void;
}) {
  const policies = asRows(data.policies);

  return (
    <div className="page">
      <PageIntro
        kicker="Controlled standards"
        title="Policies and controls"
        copy="Company policies owned by Executive governance. Open a policy to read it. Draft policies can be edited; approved policies stay read-only."
      />
      <section className="panel">
        <div className="filter-row">
          <button className="filter active" type="button">
            All <span>{policies.length}</span>
          </button>
          <button className="filter" type="button">
            Draft <span>{policies.filter((p) => p.status === "draft").length}</span>
          </button>
          <button className="filter" type="button">
            Approved <span>{policies.filter((p) => p.status === "approved").length}</span>
          </button>
        </div>
        <div className="decision-table">
          {policies.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No policies have been recorded yet.</small>
            </article>
          ) : (
            policies.map((row) => (
              <article key={String(row.id)}>
                <span className="priority priority-board">{String(row.category ?? "policy")}</span>
                <button
                  type="button"
                  className="record-row-main"
                  onClick={() => onOpenDocument("policies", row)}
                >
                  <strong>{String(row.title)}</strong>
                  <small>{String(row.summary ?? "No summary yet")}</small>
                </button>
                <strong>{String(row.versionLabel ?? "v1")}</strong>
                <span>{String(row.status ?? "draft")}</span>
                <button type="button" onClick={() => onOpenDocument("policies", row)}>
                  Open →
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DocumentPage({
  document,
  onBack,
  onNavigate,
  onSaved,
  setNotice,
}: {
  document: OpenDocument;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onSaved: (item: Record<string, unknown>) => void;
  setNotice: (message: string) => void;
}) {
  const item = document.item;
  const derived = String(item.id).startsWith("derived-");
  const derivedValue = String(item.value ?? item.reference ?? "").trim();
  const canEdit =
    !derived &&
    (document.kind === "policies"
      ? item.editable === true ||
        item.status === "draft" ||
        item.status === "in_review"
      : item.editable !== false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(String(item.title ?? ""));
  const [summary, setSummary] = useState(String(item.summary ?? item.reference ?? ""));
  const [bodyText, setBodyText] = useState(String(item.bodyText ?? ""));

  useEffect(() => {
    setEditing(false);
    setTitle(String(item.title ?? ""));
    setSummary(String(item.summary ?? item.reference ?? ""));
    setBodyText(String(item.bodyText ?? ""));
  }, [item]);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/executive/documents/${document.kind}/${encodeURIComponent(String(item.id))}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            document.kind === "policies"
              ? { title, summary, bodyText }
              : { title, reference: summary, notes: summary, bodyText },
          ),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(String(payload.message ?? "Document could not be saved."));
      }
      const saved = (payload.document ?? payload) as Record<string, unknown>;
      onSaved({
        ...item,
        ...saved,
        title: saved.title ?? title,
        summary: saved.summary ?? summary,
        reference: saved.reference ?? summary,
        bodyText: saved.bodyText ?? bodyText,
        editable: true,
      });
      setEditing(false);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Document could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (derived) {
    return (
      <div className="page document-page fact-page">
        <div className="document-toolbar">
          <button type="button" className="text-button" onClick={onBack}>
            ← Back to company records
          </button>
          <div className="document-toolbar-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => onNavigate("company")}
            >
              Edit in Company setup
            </button>
          </div>
        </div>

        <section className="panel fact-sheet" aria-labelledby="fact-sheet-heading">
          <div className="fact-sheet-meta">
            <span className="section-kicker">
              {String(item.recordType ?? "record").replaceAll("_", " ")}
              {" · "}
              {String(item.status ?? "current")}
            </span>
            <span className="data-stamp">Company profile</span>
          </div>

          <h2 id="fact-sheet-heading" className="visually-hidden">
            {String(item.title ?? "Company record")}
          </h2>

          <p className="fact-sheet-value">
            {derivedValue || "No value recorded"}
          </p>

          <p className="fact-sheet-note">
            Kept in Company setup so this company has one operational truth.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page document-page">
      <div className="document-toolbar">
        <button type="button" className="text-button" onClick={onBack}>
          ← Back to {document.kind === "records" ? "company records" : "policies"}
        </button>
        <div className="document-toolbar-actions">
          {canEdit && !editing ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => setEditing(true)}
            >
              Edit document
            </button>
          ) : null}
          {canEdit && editing ? (
            <>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEditing(false);
                  setTitle(String(item.title ?? ""));
                  setSummary(String(item.summary ?? item.reference ?? ""));
                  setBodyText(String(item.bodyText ?? ""));
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void save()}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : null}
          {!canEdit ? <span className="status healthy">Read only</span> : null}
        </div>
      </div>

      <section className="panel document-reader">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">
              {document.kind === "policies"
                ? String(item.category ?? "policy")
                : String(item.recordType ?? "record")}
              {" · "}
              {String(item.status ?? "current")}
            </span>
            {editing ? (
              <input
                className="document-title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Document title"
              />
            ) : (
              <h2 className="visually-hidden">{String(item.title)}</h2>
            )}
          </div>
          <span className="data-stamp">
            {document.kind === "policies"
              ? String(item.versionLabel ?? "v1")
              : String(item.source ?? "executive record").replaceAll("_", " ")}
          </span>
        </div>

        {editing ? (
          <label className="document-field">
            <span>
              {document.kind === "policies" ? "Summary" : "Reference"}
            </span>
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
        ) : document.kind === "policies" ? (
          <p className="document-meta">{String(item.summary ?? "No summary")}</p>
        ) : null}

        {editing ? (
          <label className="document-field">
            <span>Document body</span>
            <textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              rows={18}
            />
          </label>
        ) : (
          <article className="document-body" aria-label="Document content">
            {String(item.bodyText ?? "")
              .split("\n")
              .map((line, index) => (
                <p key={`${index}-${line.slice(0, 12)}`}>{line || "\u00A0"}</p>
              ))}
          </article>
        )}

        {!canEdit ? (
          <p className="authority-note">
            Approved or retired documents are read-only. Propose a new version if
            changes are required.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function CompanyPage({ data }: { data: Record<string, unknown> }) {
  const company = (data.company ?? {}) as Record<string, unknown>;
  const setup = (data.setup ?? {}) as {
    items?: Array<{ id: string; label: string; complete: boolean }>;
    percentComplete?: number;
    completeCount?: number;
    totalCount?: number;
  };
  const items = setup.items ?? [];
  const remaining = items.filter((item) => !item.complete).length;

  return (
    <div className="page">
      <PageIntro
        kicker="Legal entity foundation"
        title="Complete your company setup"
        copy="Confirm the legal profile and foundation controls for this Veyvio company."
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Company setup</span>
            <h3>
              {remaining} foundation action{remaining === 1 ? "" : "s"} remaining
            </h3>
          </div>
          <span className="setup-percentage">{setup.percentComplete ?? 0}% complete</span>
        </div>
        <div className="progress-track">
          <span style={{ width: `${setup.percentComplete ?? 0}%` }} />
        </div>
        <div className="task-list horizontal">
          {items.length === 0 ? (
            <NoDataRow label="No setup checklist available." />
          ) : (
            items.map((item) => (
              <label key={item.id} className={item.complete ? "task done" : "task"}>
                <input type="checkbox" checked={item.complete} readOnly />
                <span>{item.label}</span>
              </label>
            ))
          )}
        </div>
      </section>

      <div className="content-grid">
        <section className="panel span-2">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Legal profile</span>
              <h3>{String(company.tradingName ?? company.legalName ?? "Company profile")}</h3>
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Legal name</dt>
              <dd>{String(company.legalName ?? "No data")}</dd>
            </div>
            <div>
              <dt>Trading name</dt>
              <dd>{String(company.tradingName ?? "No data")}</dd>
            </div>
            <div>
              <dt>Companies House number</dt>
              <dd>{String(company.companyNumber ?? "No data")}</dd>
            </div>
            <div>
              <dt>Operator licence</dt>
              <dd>{String(company.operatorLicenceNumber ?? "No data")}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{String(company.phone ?? "No data")}</dd>
            </div>
            <div>
              <dt>Tenant status</dt>
              <dd>{String(company.tenantStatus ?? "No data")}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function OrganisationPage({
  data,
  setNotice,
}: {
  data: Record<string, unknown>;
  setNotice: (message: string) => void;
}) {
  const members = asRows(data.members).filter((row) => row.status !== "suspended");
  const invitations = asRows(data.invitations);

  return (
    <div className="page page-stack">
      <PageIntro
        kicker="People and authority"
        title="Organisation and reporting lines"
        copy="Live memberships, roles and invitations for this company."
        action="Invite department lead"
        onAction={() =>
          setNotice(
            "Open Applications & access to invite a Command, Finance or HR lead. Driver and Yard invites stay in Command.",
          )
        }
      />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Memberships</span>
            <h3>{members.length} people</h3>
          </div>
        </div>
        <div className="people-table">
          {members.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No organisation members have been recorded yet.</small>
            </article>
          ) : (
            members.map((row) => (
              <article key={String(row.membershipId)}>
                <span className="person-avatar">{String(row.initials ?? "VE")}</span>
                <div>
                  <strong>{String(row.displayName)}</strong>
                  <small>{formatRoleList(row.roles)}</small>
                </div>
                <span className={`status ${row.mfaEnabled ? "healthy" : "attention"}`}>
                  {row.mfaEnabled ? "MFA active" : "MFA required"}
                </span>
                <button type="button" onClick={() => setNotice(`${String(row.displayName)} opened.`)}>
                  →
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Invitations</span>
            <h3>Outstanding invites</h3>
          </div>
        </div>
        <div className="decision-table">
          {invitations.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No invitations have been sent yet.</small>
            </article>
          ) : (
            invitations.map((row) => (
              <article key={String(row.id)}>
                <span className="priority priority-access">{String(row.appType ?? "app")}</span>
                <div>
                  <strong>{String(row.email)}</strong>
                  <small>{String(row.status ?? "pending")}</small>
                </div>
                <strong>—</strong>
                <span>{formatDay(row.createdAt)}</span>
                <button type="button" onClick={() => setNotice(`Invitation for ${String(row.email)} opened.`)}>
                  Review →
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function GovernancePage({
  data,
  setNotice,
}: {
  data: Record<string, unknown>;
  setNotice: (message: string) => void;
}) {
  const meetings = asRows(data.meetings);
  const conflicts = asRows(data.conflicts);
  const directors = asRows(data.directors)
    .filter((row) => row.status !== "suspended")
    .slice()
    .sort((a, b) => {
      const aOwner = (Array.isArray(a.roles) ? a.roles : [])
        .map(String)
        .includes("company_owner");
      const bOwner = (Array.isArray(b.roles) ? b.roles : [])
        .map(String)
        .includes("company_owner");
      if (aOwner !== bOwner) return aOwner ? -1 : 1;
      const aTime = String(a.acceptedAt ?? a.createdAt ?? "");
      const bTime = String(b.acceptedAt ?? b.createdAt ?? "");
      return aTime.localeCompare(bTime);
    });

  const primaryOwnerMembershipId = directors.find((row) =>
    (Array.isArray(row.roles) ? row.roles : []).map(String).includes("company_owner"),
  )?.membershipId;

  return (
    <div className="page page-stack">
      <PageIntro
        kicker="Board assurance"
        title="Board, members and assurance"
        copy="Live board meetings, director memberships and conflicts of interest."
      />

      <section className="metric-grid governance-metrics">
        <Metric
          label="Board officers"
          value={String(directors.length)}
          detail={directors.length === 0 ? "No data yet" : "CEO, directors and board"}
          tone="navy"
        />
        <Metric
          label="Meetings"
          value={String(meetings.length)}
          detail={meetings.length === 0 ? "No data yet" : "Board calendar"}
          tone="teal"
        />
        <Metric
          label="Conflicts"
          value={String(conflicts.length)}
          detail={conflicts.length === 0 ? "No data yet" : "Declared interests"}
          tone="amber"
        />
        <Metric
          label="Open conflicts"
          value={String(conflicts.filter((row) => row.status === "open").length)}
          detail="Require management"
          tone="green"
        />
      </section>

      <div className="governance-board-grid">
        <section className="panel governance-directors">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Board</span>
              <h3>Board members and officers</h3>
            </div>
          </div>
          <div className="people-table">
            {directors.length === 0 ? (
              <article className="empty-row-span">
                <strong>No data</strong>
                <small>No director, board member or chief executive is assigned yet.</small>
              </article>
            ) : (
              directors.map((row) => {
                const roles = Array.isArray(row.roles) ? row.roles.map(String) : [];
                const secondaryOwner =
                  roles.includes("company_owner") &&
                  String(row.membershipId) !== String(primaryOwnerMembershipId);
                const office =
                  typeof row.boardTitle === "string" && row.boardTitle.trim()
                    ? String(row.boardTitle)
                    : boardOfficeLabel(roles, { secondaryOwner });
                const detail = secondaryOwner
                  ? ""
                  : typeof row.boardRoles === "string" && row.boardRoles.trim()
                    ? String(row.boardRoles)
                    : boardRolesForDisplay(roles);
                return (
                  <article key={String(row.membershipId)}>
                    <span className="person-avatar">{String(row.initials ?? "VE")}</span>
                    <div>
                      <strong>{String(row.displayName)}</strong>
                      <small>
                        {office}
                        {detail && detail !== office ? ` · ${detail}` : ""}
                      </small>
                    </div>
                    <span className="status healthy">Active</span>
                    <button
                      type="button"
                      onClick={() => setNotice(`${String(row.displayName)} · ${office}`)}
                    >
                      →
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="panel governance-calendar">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Calendar</span>
              <h3>Board meetings</h3>
            </div>
          </div>
          <div className="timeline">
            {meetings.length === 0 ? (
              <NoDataRow label="No board meetings recorded yet." />
            ) : (
              meetings.map((row) => (
                <Timeline
                  key={String(row.id)}
                  date={formatDay(row.scheduledAt)}
                  title={String(row.title)}
                  meta={String(row.status ?? "planned")}
                />
              ))
            )}
          </div>
        </section>

        <section className="panel governance-conflicts">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Conflicts register</span>
              <h3>Declared interests</h3>
            </div>
          </div>
          <div className="decision-table">
            {conflicts.length === 0 ? (
              <article className="empty-row-span">
                <strong>No data</strong>
                <small>No conflicts of interest have been declared yet.</small>
              </article>
            ) : (
              conflicts.map((row) => (
                <article key={String(row.id)}>
                  <span className="priority priority-attention">{String(row.status)}</span>
                  <div>
                    <strong>{String(row.personName)}</strong>
                    <small>{String(row.declaration)}</small>
                  </div>
                  <strong>—</strong>
                  <span>{formatDay(row.declaredAt)}</span>
                  <button type="button" onClick={() => setNotice("Conflict declaration opened.")}>
                    Review →
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DecisionsPage({
  data,
  setNotice,
}: {
  data: Record<string, unknown>;
  setNotice: (message: string) => void;
}) {
  const decisions = asRows(data.decisions);
  const pending = decisions.filter((row) => row.status === "pending");

  return (
    <div className="page">
      <PageIntro
        kicker="Reserved authority"
        title="Executive decisions"
        copy="Only decisions requiring CEO, director or board authority appear here. Operational work remains in its owning application."
      />
      <section className="panel">
        <div className="filter-row">
          <button className="filter active" type="button">
            Open <span>{pending.length}</span>
          </button>
          <button className="filter" type="button">
            All <span>{decisions.length}</span>
          </button>
          <button className="filter" type="button">
            Completed <span>{decisions.filter((row) => row.status === "approved").length}</span>
          </button>
        </div>
        <div className="decision-table">
          {decisions.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No Executive decisions have been recorded yet.</small>
            </article>
          ) : (
            decisions.map((row) => (
              <article key={String(row.id)}>
                <span className="priority priority-board">
                  {String(row.decisionType ?? "decision")}
                </span>
                <div>
                  <strong>{String(row.title)}</strong>
                  <small>{String(row.summary ?? "No supporting summary")}</small>
                </div>
                <strong>{String(row.status ?? "pending")}</strong>
                <span>{formatDay(row.dueAt)}</span>
                <button
                  type="button"
                  onClick={() => setNotice(`${String(row.title)} opened with its evidence trail.`)}
                >
                  Review →
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const EXECUTIVE_INVITE_ROLES: Record<string, Array<{ value: string; label: string }>> = {
  COMMAND: [
    { value: "transport_manager", label: "Transport manager" },
    { value: "operations_manager", label: "Operations manager" },
    { value: "dispatcher", label: "Dispatcher" },
    { value: "compliance_manager", label: "Compliance manager" },
    { value: "safeguarding_lead", label: "Safeguarding lead" },
    { value: "read_only_auditor", label: "Read-only auditor" },
  ],
  FINANCE: [
    { value: "finance_director", label: "Finance director" },
    { value: "finance_manager", label: "Finance manager" },
    { value: "finance_officer", label: "Finance officer" },
    { value: "cost_approver", label: "Cost approver" },
    { value: "auditor", label: "Auditor" },
  ],
  HR: [
    { value: "hr_director", label: "HR director" },
    { value: "hr_manager", label: "HR manager" },
    { value: "hr_officer", label: "HR officer" },
    { value: "people_administrator", label: "People administrator" },
  ],
};

const DEFAULT_INVITE_ROLE: Record<string, string> = {
  COMMAND: "transport_manager",
  FINANCE: "finance_director",
  HR: "hr_manager",
};

function ApplicationsPage({
  data,
  onRefresh,
  setNotice,
}: {
  data: Record<string, unknown>;
  onRefresh: () => void;
  setNotice: (message: string) => void;
}) {
  const applications = asRows(data.applications);
  const invitations = asRows(data.invitations);
  const invitePolicy = (data.invitePolicy ?? {}) as Record<string, unknown>;
  const departmentInviteApps = new Set(
    (Array.isArray(invitePolicy.departmentApps)
      ? invitePolicy.departmentApps
      : ["COMMAND", "FINANCE", "HR"]
    ).map(String),
  );
  const members = asRows(data.members);
  const admins = members.filter((row) => {
    const roles = Array.isArray(row.roles) ? row.roles.map(String) : [];
    return roles.some((role) =>
      ["company_owner", "company_administrator", "director"].includes(role),
    );
  });

  const invitableApps = applications.filter((app) => {
    const appType = String(app.appType ?? "");
    if (typeof app.inviteFromExecutive === "boolean") return app.inviteFromExecutive;
    return departmentInviteApps.has(appType);
  });

  const [showInvite, setShowInvite] = useState(false);
  const [inviteApp, setInviteApp] = useState("COMMAND");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(DEFAULT_INVITE_ROLE.COMMAND);
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    acceptUrl: string | null;
    emailDelivered: boolean;
    emailError: string | null;
  } | null>(null);

  const openInvite = (appType?: string) => {
    const nextApp =
      appType && departmentInviteApps.has(appType)
        ? appType
        : String(invitableApps[0]?.appType ?? "COMMAND");
    setInviteApp(nextApp);
    setInviteRole(DEFAULT_INVITE_ROLE[nextApp] ?? "transport_manager");
    setInviteEmail("");
    setInviteResult(null);
    setShowInvite(true);
  };

  const onAppAction = (app: Record<string, unknown>) => {
    const appType = String(app.appType ?? "");
    const name = String(app.name ?? appType);
    const inviteAllowed =
      typeof app.inviteFromExecutive === "boolean"
        ? app.inviteFromExecutive
        : departmentInviteApps.has(appType);
    const managedIn = String(app.managedIn ?? (inviteAllowed ? "EXECUTIVE" : "COMMAND"));

    if (appType === "EXECUTIVE") {
      setNotice(
        "Executive access is limited to company administrators. Use Privileged access below for a second administrator.",
      );
      return;
    }

    if (!inviteAllowed || managedIn === "COMMAND") {
      setNotice(
        `${name} accounts are created in Command by an authorised transport or operations manager — not from Executive.`,
      );
      return;
    }

    openInvite(appType);
  };

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setInviteResult(null);
    try {
      const response = await fetch("/api/executive/invitations", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          appType: inviteApp,
          roleName: inviteRole,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        const code = String(payload.code ?? "");
        if (code === "executive_step_up_required" || code === "executive_aal2_required") {
          throw new Error(
            "Sign in again with multi-factor authentication, then send the invitation.",
          );
        }
        throw new Error(
          String(payload.message ?? "The invitation could not be created."),
        );
      }
      const acceptUrl =
        typeof payload.acceptUrl === "string" ? payload.acceptUrl : null;
      const emailDelivered = Boolean(payload.emailDelivered);
      const emailError =
        typeof payload.emailError === "string" ? payload.emailError : null;
      setInviteResult({ acceptUrl, emailDelivered, emailError });
      setNotice(
        emailDelivered
          ? `Invitation email sent to ${inviteEmail.trim()} for Veyvio ${inviteApp.charAt(0)}${inviteApp.slice(1).toLowerCase()}.`
          : `Invitation created for ${inviteEmail.trim()}, but the email was not sent. Use the accept link below.`,
      );
      setInviteEmail("");
      onRefresh();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The invitation could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const roleOptions = EXECUTIVE_INVITE_ROLES[inviteApp] ?? EXECUTIVE_INVITE_ROLES.COMMAND;

  return (
    <div className="page">
      <PageIntro
        kicker="One account, controlled access"
        title="Applications and company access"
        copy="From Executive you invite people to Command, Finance or HR. Driver and Yard accounts are created in Command."
        action={showInvite ? "Close invite" : "Invite department lead"}
        onAction={() => {
          if (showInvite) {
            setShowInvite(false);
            return;
          }
          if (invitableApps.length === 0) {
            setNotice(
              "From Executive you can invite people to Command, Finance or HR once those applications are listed.",
            );
            return;
          }
          openInvite();
        }}
      />

      {showInvite ? (
        <section className="panel annual-budget-form-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Department invitation</span>
              <h3>Invite to Command, Finance or HR</h3>
            </div>
          </div>
          <form className="annual-budget-form" onSubmit={submitInvite}>
            <div className="annual-budget-field-grid">
              <label>
                Application
                <select
                  value={inviteApp}
                  onChange={(event) => {
                    const next = event.target.value;
                    setInviteApp(next);
                    setInviteRole(DEFAULT_INVITE_ROLE[next] ?? "transport_manager");
                  }}
                >
                  {["COMMAND", "FINANCE", "HR"].map((app) => (
                    <option key={app} value={app} disabled={!departmentInviteApps.has(app)}>
                      Veyvio {app.charAt(0)}
                      {app.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Role
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Work email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="name@company.co.uk"
                />
                <small>
                  Sends a single-use link that expires in seven days. Driver and Yard
                  invites stay in Command.
                </small>
              </label>
            </div>
            <div className="annual-budget-submit-row">
              <button
                type="button"
                className="secondary-action"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button" disabled={submitting}>
                {submitting ? "Sending…" : "Send invitation"}
              </button>
            </div>
            {inviteResult ? (
              <div className="invite-dev-token">
                {inviteResult.emailDelivered ? (
                  <p>
                    Email sent from <code>Veyvio &lt;info@veyvio.co.uk&gt;</code> via Resend
                    (or your configured <code>INVITE_FROM_EMAIL</code>).
                  </p>
                ) : (
                  <p>
                    Invitation was saved, but email was not delivered
                    {inviteResult.emailError ? `: ${inviteResult.emailError}` : "."}
                  </p>
                )}
                {inviteResult.acceptUrl ? (
                  <p>
                    Accept link:{" "}
                    <a href={inviteResult.acceptUrl} target="_blank" rel="noreferrer">
                      {inviteResult.acceptUrl}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <div className="application-admin-grid">
        {applications.length === 0 ? (
          <section className="application-admin-card command">
            <div className="application-admin-head">
              <span className="app-monogram">—</span>
              <span className="status attention">No data</span>
            </div>
            <h3>No applications yet</h3>
            <p>Application grants will appear here once memberships are created.</p>
          </section>
        ) : (
          applications.map((app) => {
            const appType = String(app.appType ?? "");
            const inviteAllowed =
              typeof app.inviteFromExecutive === "boolean"
                ? Boolean(app.inviteFromExecutive)
                : departmentInviteApps.has(appType);
            const managedInCommand =
              String(app.managedIn ?? "") === "COMMAND" ||
              ["YARD", "DRIVER"].includes(appType);

            return (
              <section
                className={`application-admin-card ${String(app.appType ?? "command").toLowerCase()}`}
                key={appType}
              >
                <div className="application-admin-head">
                  <span className="app-monogram">{String(app.name ?? "?").charAt(0)}</span>
                  <span
                    className={`status ${app.status === "active" ? "healthy" : "attention"}`}
                  >
                    {String(app.status ?? "not_activated").replaceAll("_", " ")}
                  </span>
                </div>
                <h3>Veyvio {String(app.name)}</h3>
                <p>{String(app.description)}</p>
                <dl>
                  <div>
                    <dt>Active members</dt>
                    <dd>{Number(app.activeMembers ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>{managedInCommand ? "Accounts" : "Invite from Executive"}</dt>
                    <dd>
                      {managedInCommand
                        ? "Managed in Command"
                        : inviteAllowed
                          ? "Command · Finance · HR only"
                          : appType === "EXECUTIVE"
                            ? "Privileged admins"
                            : "Not available"}
                    </dd>
                  </div>
                </dl>
                {inviteAllowed ? (
                  <div className="application-admin-actions">
                    <button type="button" onClick={() => onAppAction(app)}>
                      Invite
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() =>
                        setNotice(`Review who has access to Veyvio ${String(app.name)}.`)
                      }
                    >
                      Manage access
                    </button>
                  </div>
                ) : managedInCommand ? (
                  <button type="button" className="secondary-action" onClick={() => onAppAction(app)}>
                    View in Command
                  </button>
                ) : (
                  <button type="button" onClick={() => onAppAction(app)}>
                    Manage access
                  </button>
                )}
              </section>
            );
          })
        )}
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Outstanding invites</span>
            <h3>Pending department invitations</h3>
          </div>
        </div>
        <div className="people-table">
          {invitations.length === 0 ? (
            <article className="empty-row-span">
              <strong>No pending invitations</strong>
              <small>Invites you send for Command, Finance or HR will appear here.</small>
            </article>
          ) : (
            invitations.slice(0, 12).map((row) => (
              <article key={String(row.id ?? row.email)}>
                <span className="person-avatar">
                  {String(row.email ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{String(row.email ?? "Unknown")}</strong>
                  <small>
                    {String(row.appType ?? "COMMAND")} · {String(row.status ?? "pending")}
                  </small>
                </div>
                <span className="status attention">
                  {row.expiresAt
                    ? `Expires ${formatDay(row.expiresAt)}`
                    : "Awaiting acceptance"}
                </span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Privileged access</span>
            <h3>Company administrators</h3>
          </div>
          <button className="text-button" type="button">
            Review permissions →
          </button>
        </div>
        <div className="people-table">
          {admins.length === 0 ? (
            <article className="empty-row-span">
              <strong>No data</strong>
              <small>No privileged Executive administrators are assigned yet.</small>
            </article>
          ) : (
            admins.map((row) => (
              <article key={String(row.membershipId)}>
                <span className="person-avatar">{String(row.initials ?? "VE")}</span>
                <div>
                  <strong>{String(row.displayName)}</strong>
                  <small>{formatRoleList(row.roles)}</small>
                </div>
                <span className={`status ${row.mfaEnabled ? "healthy" : "attention"}`}>
                  {row.mfaEnabled ? "MFA active" : "MFA required"}
                </span>
                <button type="button" aria-label="Open administrator">
                  →
                </button>
              </article>
            ))
          )}
          {admins.length === 1 ? (
            <article>
              <span className="person-avatar empty">+</span>
              <div>
                <strong>Second administrator required</strong>
                <small>Required for account recovery and business continuity</small>
              </div>
              <span className="status critical">Control open</span>
              <button
                type="button"
                className="people-text-action"
                onClick={() =>
                  setNotice(
                    "Invite a second Executive company administrator for recovery and continuity.",
                  )
                }
              >
                Invite
              </button>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SecurityPage({
  data,
  setNotice,
}: {
  data: Record<string, unknown>;
  setNotice: (message: string) => void;
}) {
  const coverage = (data.coverage ?? {}) as Record<string, unknown>;
  const gaps = asRows(coverage.gaps);
  const events = asRows(data.recentEvents);
  const mfaPercent = Number(coverage.mfaPercent ?? 0);
  const score = Math.max(40, Math.min(100, 60 + Math.round(mfaPercent * 0.4)));

  const controls = [
    [
      "Multi-factor authentication",
      gaps.length === 0
        ? "All active members protected"
        : `${Number(coverage.mfaEnabled ?? 0)} of ${Number(coverage.activeMembers ?? 0)} members protected`,
      gaps.length === 0 ? "Healthy" : "Attention",
    ],
    [
      "Company administrators",
      Number(coverage.activeMembers ?? 0) === 0
        ? "No data yet"
        : `${Number(coverage.activeMembers ?? 0)} active member(s)`,
      Number(coverage.activeMembers ?? 0) > 1 ? "Healthy" : "Critical",
    ],
    [
      "Security events",
      events.length === 0 ? "No data yet" : `${events.length} recent event(s)`,
      events.length === 0 ? "Attention" : "Healthy",
    ],
    [
      "Support access",
      "No active Veyvio support sessions",
      "Healthy",
    ],
  ] as const;

  return (
    <div className="page">
      <PageIntro
        kicker="Company assurance"
        title="Security and privileged access"
        copy="Executive security shows company-level controls. Each operational application still enforces its own detailed permissions."
        action="Start access review"
        onAction={() => setNotice("Access review opened.")}
      />

      <section className="security-score panel">
        <div className="security-score-ring">
          <strong>{score}</strong>
          <span>out of 100</span>
        </div>
        <div>
          <span className="section-kicker">Security posture</span>
          <h3>
            {gaps.length === 0
              ? "Good standing"
              : "Good, with actions required"}
          </h3>
          <p>
            {gaps.length === 0
              ? "MFA coverage is complete for active members."
              : "Complete MFA coverage before enabling further live integrations."}
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="control-list">
          {controls.map(([name, detail, state]) => (
            <article key={name}>
              <span className={`control-dot ${state.toLowerCase()}`} />
              <div>
                <strong>{name}</strong>
                <small>{detail}</small>
              </div>
              <span
                className={`status ${
                  state === "Healthy"
                    ? "healthy"
                    : state === "Critical"
                      ? "critical"
                      : "attention"
                }`}
              >
                {state}
              </span>
              <button type="button">→</button>
            </article>
          ))}
        </div>
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">MFA gaps</span>
              <h3>Members without MFA</h3>
            </div>
          </div>
          <div className="people-table">
            {gaps.length === 0 ? (
              <article className="empty-row-span">
                <strong>No data / none</strong>
                <small>Every active member currently has MFA enabled.</small>
              </article>
            ) : (
              gaps.map((row) => (
                <article key={String(row.membershipId)}>
                  <span className="person-avatar">
                    {initialsFor(String(row.displayName ?? "VE"))}
                  </span>
                  <div>
                    <strong>{String(row.displayName)}</strong>
                    <small>{String(row.email)}</small>
                  </div>
                  <span className="status attention">MFA required</span>
                  <button type="button">→</button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">Recent events</span>
              <h3>Security timeline</h3>
            </div>
          </div>
          <div className="timeline">
            {events.length === 0 ? (
              <NoDataRow label="No security events have been recorded yet." />
            ) : (
              events.slice(0, 8).map((row) => (
                <Timeline
                  key={String(row.id)}
                  date={formatDay(row.occurredAt)}
                  title={String(row.eventType ?? "security.event")}
                  meta={String(row.message ?? "")}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
