import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Filter,
  LayoutDashboard,
  MapPin,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const filters = ["All", "High", "Medium", "Low"];

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Something went wrong. Please try again.");
  }
  return response.json();
}

function App() {
  const [activeTab, setActiveTab] = useState("report");
  const [issues, setIssues] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", location: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedIssue, setSubmittedIssue] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const refreshIssues = useCallback(async () => {
    setLoadingIssues(true);
    setLoadError("");
    try {
      setIssues(await apiRequest("/issues"));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoadingIssues(false);
    }
  }, []);

  useEffect(() => {
    refreshIssues();
  }, [refreshIssues]);

  const stats = useMemo(
    () => ({
      total: issues.length,
      high: issues.filter((issue) => issue.priority === "High").length,
      open: issues.filter((issue) => issue.status === "Open").length,
      resolved: issues.filter((issue) => issue.status === "Resolved").length,
    }),
    [issues],
  );

  const visibleIssues = useMemo(
    () =>
      issues.filter(
        (issue) => priorityFilter === "All" || issue.priority === priorityFilter,
      ),
    [issues, priorityFilter],
  );

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitIssue(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    setSubmittedIssue(null);
    try {
      const created = await apiRequest("/issues", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSubmittedIssue(created);
      setForm({ title: "", description: "", location: "" });
      await refreshIssues();
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resolveIssue(issueId) {
    setResolvingId(issueId);
    try {
      const updated = await apiRequest(`/issues/${issueId}/resolve`, {
        method: "PATCH",
      });
      setIssues((current) =>
        current.map((issue) => (issue.id === updated.id ? updated : issue)),
      );
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="CampusFix AI home">
          <span className="brand-mark"><Wrench size={19} strokeWidth={2.4} /></span>
          <span className="brand-name">Campus<span>Fix</span></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button
            className={`nav-item ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            <Plus size={18} /><span>Report an issue</span>
          </button>
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} /><span>Admin dashboard</span>
            {stats.open > 0 && <span className="nav-count">{stats.open}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="campus-card">
            <span className="campus-dot" />
            <div><strong>Campus operations</strong><span>Facilities portal</span></div>
          </div>
          <div className="sidebar-foot">CAMPUSFIX AI <span>•</span> MVP 1.0</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <ChevronRight size={14} /> <strong>{activeTab === "report" ? "Report an issue" : "Admin dashboard"}</strong></div>
          <div className="topbar-right"><span className="system-status"><span /> System operational</span><span className="avatar">CF</span></div>
        </header>

        {activeTab === "report" ? (
          <section className="page-content report-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">CAMPUS CARE, MADE SIMPLE</div>
                <h1>Report an issue</h1>
                <p>Tell us what needs attention. We’ll route it to the right team.</p>
              </div>
              <div className="heading-icon"><ClipboardList size={23} /></div>
            </div>
            <div className="report-layout">
              <section className="panel form-panel">
                <div className="panel-heading">
                  <div><h2>Issue details</h2><p>Provide a few details to help us get started.</p></div>
                  <span className="required-note"><i /> Required fields</span>
                </div>
                <form onSubmit={submitIssue}>
                  <label className="field-label" htmlFor="title">Issue title <span>*</span></label>
                  <input id="title" name="title" value={form.title} onChange={updateField} placeholder="e.g. Wi-Fi not working in Lab 3" maxLength={160} required />

                  <label className="field-label" htmlFor="description">Description <span>*</span></label>
                  <textarea id="description" name="description" value={form.description} onChange={updateField} placeholder="Describe what happened and how it’s affecting you…" rows={5} maxLength={4000} required />
                  <div className="field-hint">Include any helpful details, like when it started or who is affected.</div>

                  <label className="field-label location-label" htmlFor="location">Location <span>*</span></label>
                  <div className="input-with-icon"><MapPin size={17} /><input id="location" name="location" value={form.location} onChange={updateField} placeholder="e.g. Computer Lab 3, Block A" maxLength={200} required /></div>

                  {submitError && <div className="alert error-alert" role="alert">{submitError}</div>}
                  <button className="primary-button submit-button" type="submit" disabled={submitting}>
                    <Sparkles size={17} />{submitting ? "Analyzing & submitting…" : "Analyze & Submit"}<ChevronRight size={17} className="button-chevron" />
                  </button>
                  <div className="privacy-note"><span className="shield-icon">✓</span> Your report will be shared with the campus facilities team.</div>
                </form>
              </section>
              <aside className="report-aside">
                {submittedIssue ? (
                  <section className="panel result-panel">
                    <div className="result-icon"><Check size={19} /></div>
                    <div className="result-kicker">REPORT SUBMITTED</div>
                    <h2>You’re all set.</h2>
                    <p>Your issue is in the queue. Here’s how our analyzer classified it.</p>
                    <div className="result-detail"><span>Category</span><strong>{submittedIssue.category}</strong></div>
                    <div className="result-detail"><span>Priority</span><PriorityBadge priority={submittedIssue.priority} /></div>
                    <div className="result-summary"><span>AI SUMMARY</span><p>{submittedIssue.summary}</p></div>
                    <button className="text-button" onClick={() => setActiveTab("dashboard")}>View dashboard <ArrowUpRight size={15} /></button>
                  </section>
                ) : (
                  <section className="how-card">
                    <div className="how-icon"><Sparkles size={18} /></div>
                    <h3>Smarter issue routing</h3>
                    <p>Each report is automatically categorized and prioritized, so the right team can respond sooner.</p>
                    <div className="how-step"><span>01</span><div><strong>Describe</strong><small>Share the issue and location</small></div></div>
                    <div className="how-step"><span>02</span><div><strong>Analyze</strong><small>AI sorts category and urgency</small></div></div>
                    <div className="how-step"><span>03</span><div><strong>Resolve</strong><small>Facilities team takes it from here</small></div></div>
                  </section>
                )}
                <div className="aside-tip"><span>💡</span><p><strong>Help us help you.</strong> Specific locations and clear descriptions make reports easier to resolve.</p></div>
              </aside>
            </div>
          </section>
        ) : (
          <section className="page-content dashboard-page">
            <div className="page-heading dashboard-heading">
              <div>
                <div className="eyebrow">CAMPUS OPERATIONS</div>
                <h1>Issue dashboard</h1>
                <p>A live view of reports submitted across your campus.</p>
              </div>
              <button className="outline-button" onClick={refreshIssues} disabled={loadingIssues}><Clock3 size={16} /> Refresh</button>
            </div>
            <div className="stats-grid">
              <StatCard label="Total issues" value={stats.total} icon={<ClipboardList size={18} />} tone="blue" note="All reported issues" />
              <StatCard label="High priority" value={stats.high} icon={<ArrowUpRight size={18} />} tone="red" note="Needs prompt attention" />
              <StatCard label="Open" value={stats.open} icon={<Clock3 size={18} />} tone="amber" note="Awaiting resolution" />
              <StatCard label="Resolved" value={stats.resolved} icon={<Check size={18} />} tone="green" note="Successfully closed" />
            </div>
            <section className="panel issues-panel">
              <div className="issues-toolbar">
                <div><h2>All reports <span className="total-pill">{stats.total}</span></h2><p>Review and manage campus maintenance reports.</p></div>
                <div className="filter-wrap"><Filter size={15} /><span>Priority</span>{filters.map((filter) => <button key={filter} className={`filter-button ${priorityFilter === filter ? "selected" : ""}`} onClick={() => setPriorityFilter(filter)}>{filter}</button>)}</div>
              </div>
              {loadError && <div className="alert error-alert" role="alert">{loadError}</div>}
              {loadingIssues ? <div className="empty-state">Loading reports…</div> : visibleIssues.length === 0 ? (
                <div className="empty-state"><div className="empty-icon"><ClipboardList size={21} /></div><strong>No reports found</strong><span>{priorityFilter === "All" ? "There are no issues to display yet." : `No ${priorityFilter.toLowerCase()} priority issues right now.`}</span></div>
              ) : (
                <div className="issue-list">
                  {visibleIssues.map((issue) => (
                    <article className="issue-row" key={issue.id}>
                      <div className="issue-main">
                        <div className="issue-title-line"><h3>{issue.title}</h3><PriorityBadge priority={issue.priority} /></div>
                        <p className="issue-summary">{issue.summary}</p>
                        <div className="issue-meta"><span><MapPin size={14} />{issue.location}</span><span className="meta-divider" /><span className="category-label">{issue.category}</span><span className="meta-divider" /><span className="status-label"><span className={`status-dot ${issue.status.toLowerCase()}`} />{issue.status}</span></div>
                      </div>
                      {issue.status === "Open" ? (
                        <button className="resolve-button" onClick={() => resolveIssue(issue.id)} disabled={resolvingId === issue.id}>
                          <Check size={15} />{resolvingId === issue.id ? "Saving…" : "Mark resolved"}
                        </button>
                      ) : <span className="resolved-mark"><Check size={15} /> Resolved</span>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}
        <footer className="page-footer"><span>CampusFix AI</span><span>Helping your campus run better, together.</span><span>Made for campus communities <span className="footer-heart">♥</span></span></footer>
      </main>
    </div>
  );
}

function PriorityBadge({ priority }) {
  return <span className={`priority-badge ${priority.toLowerCase()}`}><i />{priority}</span>;
}

function StatCard({ label, value, icon, tone, note }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-note ${tone === "red" ? "urgent-note" : ""}`}>{tone === "red" ? <ArrowUpRight size={13} /> : tone === "green" ? <Check size={13} /> : <ArrowDownRight size={13} />}{note}</div>
    </div>
  );
}

export default App;
