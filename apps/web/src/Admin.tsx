import './admin.css';
import './admin-applications.css';
import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { money, request, type User } from './App';

/* ── Tiny utilities ── */
const today = () => new Date().toISOString().slice(0, 10);
const idempotency = () => crypto.randomUUID();
const fmt = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d: string | Date) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function Notice({ value, type = 'warn' }: { value: string; type?: 'warn' | 'ok' }) {
  if (!value) return null;
  return (
    <div className="alert" style={type === 'ok' ? { background: '#e8f5ee', color: '#1f6e40' } : undefined}>
      {value}
    </div>
  );
}

function Spinner() {
  return <div className="empty" style={{ padding: '60px', color: 'var(--muted)', textAlign: 'center' }}>Loading…</div>;
}

/* ═══════════════════════════════════════════════════
   1. DASHBOARD
   ═══════════════════════════════════════════════════ */
export function AdminDashboard() {
  const [d, setD] = useState<any>({});
  const [report, setReport] = useState<any>({});
  const [error, setError] = useState('');

  useEffect(() => {
    request('/admin/dashboard').then(setD).catch(e => setError(e.message));
    request('/admin/report-summary').then(setReport).catch(() => {});
  }, []);

  const stats = [
    { label: 'New Applications', value: d.new_applications ?? 0, hint: 'Awaiting first review', icon: '📋', cls: 'info' },
    { label: 'Pending Reviews', value: d.pending_reviews ?? 0, hint: 'Currently under review', icon: '🔍', cls: '' },
    { label: 'Awaiting Transfer', value: d.awaiting_disbursement ?? 0, hint: 'Record after bank confirms', icon: '🏦', cls: 'good' },
    { label: 'Overdue EMIs', value: d.overdue_emis ?? 0, hint: 'Needs immediate attention', icon: '⚠️', cls: 'warn' },
  ];

  const quickActions = [
    { to: '/admin/applications?status=submitted', icon: '📋', title: 'Review applications', desc: 'New submissions awaiting verification' },
    { to: '/admin/loans?status=awaiting_disbursement', icon: '🏦', title: 'Record disbursements', desc: 'Loans waiting for bank transfer record' },
    { to: '/admin/payments', icon: '💳', title: 'Reconcile payments', desc: 'Confirm or review pending payments' },
  ];

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">PILOT OPERATIONS</span>
          <h1>Operations overview</h1>
          <p>Live tasks requiring admin attention.</p>
        </div>
        <span className="date">LIVE</span>
      </div>
      <Notice value={error} />

      {/* Stats */}
      <div className="dash-stats">
        {stats.map(s => (
          <div key={s.label} className={`dash-stat ${s.cls}`}>
            <span className="stat-icon">{s.icon}</span>
            <label>{s.label}</label>
            <div className="stat-value">{s.value}</div>
            <small>{s.hint}</small>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="quick-actions">
        {quickActions.map(qa => (
          <Link key={qa.to} to={qa.to} className="qa-card">
            <div className="qa-icon">{qa.icon}</div>
            <div>
              <h3>{qa.title}</h3>
              <p>{qa.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Portfolio totals */}
      <div className="page-section">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2>Portfolio summary</h2>
          <Link to="/admin/reports" style={{ color: '#8b611e', fontSize: 13 }}>Full reports →</Link>
        </div>
        <div className="dash-stats" style={{ marginBottom: 0 }}>
          <div className="dash-stat">
            <label>Total applications</label>
            <div className="stat-value" style={{ fontSize: 36 }}>{report.applications ?? '—'}</div>
          </div>
          <div className="dash-stat">
            <label>Active loans</label>
            <div className="stat-value" style={{ fontSize: 36 }}>{report.loans ?? '—'}</div>
          </div>
          <div className="dash-stat good">
            <label>Total disbursed</label>
            <div className="stat-value" style={{ fontSize: 26 }}>{money(report.disbursed_paise ?? 0)}</div>
          </div>
          <div className="dash-stat">
            <label>Confirmed collected</label>
            <div className="stat-value" style={{ fontSize: 26 }}>{money(report.collected_paise ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* Workflow guide */}
      <div className="page-section">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <h2>Required workflow sequence</h2>
          <Link to="/admin/applications" style={{ color: '#8b611e', fontSize: 13 }}>Open applications →</Link>
        </div>
        <div className="action-grid">
          <div><b>01</b><h3>Review the application</h3><p>Verify profile, witnesses, bank details, and documents. Request corrections if needed.</p></div>
          <div><b>02</b><h3>Approve and present offer</h3><p>Set exact terms, preview full EMI schedule, and let the customer accept.</p></div>
          <div><b>03</b><h3>Record confirmed disbursement</h3><p>Only after funds actually leave your bank. This software never sends money automatically.</p></div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   2. APPLICATION LIST — UPGRADED PIPELINE QUEUE
   ═══════════════════════════════════════════════════ */
export function AdminApplications() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [amountRange, setAmountRange] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [drawerApp, setDrawerApp] = useState<any | null>(null);

  const loadData = () => {
    setLoading(true);
    request('/applications?limit=50' + (status && status !== 'action_needed' ? `&status=${status}` : ''))
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setPage(1);
  }, [status]);

  // Overall metric counters from fetched rows
  const counts = useMemo(() => {
    const total = rows.length;
    let submitted = 0;
    let underReview = 0;
    let infoRequested = 0;
    let approved = 0;
    let rejected = 0;
    let draft = 0;
    let totalDemandPaise = 0;

    for (const r of rows) {
      totalDemandPaise += Number(r.requested_amount_paise || 0);
      if (r.status === 'submitted') submitted++;
      else if (r.status === 'under_review') underReview++;
      else if (r.status === 'information_requested') infoRequested++;
      else if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
      else if (r.status === 'draft') draft++;
    }

    return {
      total,
      actionNeeded: submitted + underReview,
      submitted,
      underReview,
      infoRequested,
      approved,
      rejected,
      draft,
      totalDemandPaise,
    };
  }, [rows]);

  // Search & Filter & Sort Pipeline
  const filtered = useMemo(() => {
    let list = [...rows];

    // Status tab filter
    if (status === 'action_needed') {
      list = list.filter(r => r.status === 'submitted' || r.status === 'under_review');
    } else if (status) {
      list = list.filter(r => r.status === status);
    }

    // Amount range filter
    if (amountRange === 'under_25k') {
      list = list.filter(r => Number(r.requested_amount_paise || 0) <= 2500000);
    } else if (amountRange === '25k_100k') {
      list = list.filter(r => {
        const amt = Number(r.requested_amount_paise || 0);
        return amt > 2500000 && amt <= 10000000;
      });
    } else if (amountRange === 'above_100k') {
      list = list.filter(r => Number(r.requested_amount_paise || 0) > 10000000);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        `${r.name ?? ''} ${r.mobile ?? ''} ${r.id ?? ''} ${r.purpose ?? ''}`.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'amount_desc') return (Number(b.requested_amount_paise) || 0) - (Number(a.requested_amount_paise) || 0);
      if (sortBy === 'amount_asc') return (Number(a.requested_amount_paise) || 0) - (Number(b.requested_amount_paise) || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return list;
  }, [rows, status, amountRange, search, sortBy]);

  // Total requested in currently filtered set
  const filteredTotalDemand = useMemo(() => {
    return filtered.reduce((acc, r) => acc + Number(r.requested_amount_paise || 0), 0);
  }, [filtered]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Copy ID utility
  const copyId = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to CSV
  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Application ID', 'Applicant Name', 'Mobile', 'Requested Amount (INR)', 'Monthly Income (INR)', 'Loan Purpose', 'Status', 'Date Received'];
    const csvRows = filtered.map(r => [
      `"${r.id}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.mobile || ''}"`,
      r.requested_amount_paise ? (r.requested_amount_paise / 100) : 0,
      r.monthly_income_paise ? (r.monthly_income_paise / 100) : 0,
      `"${(r.purpose || 'General').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `applications-queue-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRelativeTime = (d: string | Date) => {
    const diff = Date.now() - new Date(d).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return fmt(d);
  };

  return (
    <div className="app-queue-container">
      {/* ── Page Header ── */}
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow">APPLICATION QUEUE</span>
          <h1>Applications</h1>
          <p>Review incoming credit requests, verify documentation, and prepare structured offers.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="app-btn-secondary" onClick={exportCSV} title="Export current list to CSV spreadsheet">
            📥 Export CSV
          </button>
          <button type="button" className="app-btn-secondary" onClick={loadData} title="Refresh application list">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Top KPI Stat Cards ── */}
      <div className="app-kpi-grid">
        <div
          className={`app-kpi-card ${status === '' ? 'active' : ''}`}
          onClick={() => setStatus('')}
          title="View all applications"
        >
          <div className="app-kpi-icon">📋</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Total Queue</span>
            <span className="app-kpi-value">{counts.total}</span>
            <span className="app-kpi-sub">{money(counts.totalDemandPaise)} requested</span>
          </div>
        </div>

        <div
          className={`app-kpi-card warn ${status === 'action_needed' ? 'active' : ''}`}
          onClick={() => setStatus(status === 'action_needed' ? '' : 'action_needed')}
          title="Filter cases requiring action"
        >
          <div className="app-kpi-icon">⚡</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Action Needed</span>
            <span className="app-kpi-value">{counts.actionNeeded}</span>
            <span className="app-kpi-sub">{counts.submitted} submitted • {counts.underReview} in review</span>
          </div>
        </div>

        <div
          className={`app-kpi-card info ${status === 'under_review' ? 'active' : ''}`}
          onClick={() => setStatus(status === 'under_review' ? '' : 'under_review')}
          title="Filter cases under review"
        >
          <div className="app-kpi-icon">🔍</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Under Review</span>
            <span className="app-kpi-value">{counts.underReview}</span>
            <span className="app-kpi-sub">Pending credit decision</span>
          </div>
        </div>

        <div
          className={`app-kpi-card purple ${status === 'information_requested' ? 'active' : ''}`}
          onClick={() => setStatus(status === 'information_requested' ? '' : 'information_requested')}
          title="Filter cases with information requested"
        >
          <div className="app-kpi-icon">✍️</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Info Requested</span>
            <span className="app-kpi-value">{counts.infoRequested}</span>
            <span className="app-kpi-sub">Awaiting applicant update</span>
          </div>
        </div>

        <div
          className={`app-kpi-card good ${status === 'approved' ? 'active' : ''}`}
          onClick={() => setStatus(status === 'approved' ? '' : 'approved')}
          title="Filter approved applications"
        >
          <div className="app-kpi-icon">✅</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Approved</span>
            <span className="app-kpi-value">{counts.approved}</span>
            <span className="app-kpi-sub">Offers ready or accepted</span>
          </div>
        </div>
      </div>

      {/* ── Status Tab Chips ── */}
      <div className="app-tabs-wrapper">
        <button
          type="button"
          className={`app-tab-btn ${status === '' ? 'active' : ''}`}
          onClick={() => setStatus('')}
        >
          All Applications
          <span className="app-tab-count">{counts.total}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn has-action ${status === 'action_needed' ? 'active' : ''}`}
          onClick={() => setStatus('action_needed')}
        >
          ⚡ Action Needed
          <span className="app-tab-count">{counts.actionNeeded}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'submitted' ? 'active' : ''}`}
          onClick={() => setStatus('submitted')}
        >
          Submitted
          <span className="app-tab-count">{counts.submitted}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'under_review' ? 'active' : ''}`}
          onClick={() => setStatus('under_review')}
        >
          Under Review
          <span className="app-tab-count">{counts.underReview}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'information_requested' ? 'active' : ''}`}
          onClick={() => setStatus('information_requested')}
        >
          Info Requested
          <span className="app-tab-count">{counts.infoRequested}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'approved' ? 'active' : ''}`}
          onClick={() => setStatus('approved')}
        >
          Approved
          <span className="app-tab-count">{counts.approved}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatus('rejected')}
        >
          Rejected
          <span className="app-tab-count">{counts.rejected}</span>
        </button>

        <button
          type="button"
          className={`app-tab-btn ${status === 'draft' ? 'active' : ''}`}
          onClick={() => setStatus('draft')}
        >
          Draft
          <span className="app-tab-count">{counts.draft}</span>
        </button>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="app-toolbar">
        <div className="app-search-wrap">
          <span className="app-search-icon">🔍</span>
          <input
            className="app-search-input"
            placeholder="Search by name, phone, purpose, or ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button type="button" className="app-search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>

        <div className="app-toolbar-controls">
          {/* Amount Range Filter */}
          <select
            className="app-select"
            value={amountRange}
            onChange={e => { setAmountRange(e.target.value); setPage(1); }}
          >
            <option value="all">All Amounts</option>
            <option value="under_25k">Under ₹25,000</option>
            <option value="25k_100k">₹25,000 – ₹1,00,000</option>
            <option value="above_100k">Above ₹1,00,000</option>
          </select>

          {/* Sorting */}
          <select
            className="app-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="amount_desc">Sort: Highest Requested</option>
            <option value="amount_asc">Sort: Lowest Requested</option>
            <option value="name_asc">Sort: Name (A–Z)</option>
          </select>

          {/* Reset Filters button if modified */}
          {(status || search || amountRange !== 'all') && (
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => { setStatus(''); setSearch(''); setAmountRange('all'); setPage(1); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <Notice value={error} />

      {/* ── Queue Table ── */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="app-table-card">
          <div className="app-table-head">
            <span>Applicant & Contact</span>
            <span>Purpose & Income</span>
            <span>Requested</span>
            <span>Status</span>
            <span>Received</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {paginatedRows.map(r => (
            <div className="app-table-row" key={r.id}>
              {/* Applicant Cell */}
              <div className="app-applicant-cell">
                <div className="app-avatar">{getInitials(r.name)}</div>
                <div className="app-applicant-meta">
                  <Link
                    to={`/admin/applications/${r.id}`}
                    className="app-applicant-name"
                    title="Click to open case file"
                  >
                    {r.name || 'Anonymous Applicant'}
                  </Link>
                  <div className="app-applicant-sub">
                    <span>{r.mobile || '—'}</span>
                    {r.mobile && (
                      <a
                        href={`https://wa.me/${String(r.mobile).replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        style={{ color: '#25D366', textDecoration: 'none', fontSize: 13 }}
                        onClick={e => e.stopPropagation()}
                      >
                        💬
                      </a>
                    )}
                    <span
                      className="app-id-pill"
                      onClick={e => copyId(e, r.id)}
                      title="Click to copy full application ID"
                    >
                      {copiedId === r.id ? '✓ Copied' : `#${String(r.id).slice(0, 8)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purpose & Income Cell */}
              <div className="app-purpose-cell">
                <span className="app-purpose-badge" title={r.purpose || 'General loan request'}>
                  {r.purpose || 'General Loan'}
                </span>
                {r.monthly_income_paise ? (
                  <span className="app-income-label">
                    Income: {money(r.monthly_income_paise)}/mo
                  </span>
                ) : (
                  <span className="app-income-label" style={{ opacity: 0.5 }}>Income: Unverified</span>
                )}
              </div>

              {/* Requested Amount Cell */}
              <div className="app-amount-cell">
                {money(r.requested_amount_paise)}
              </div>

              {/* Status Cell */}
              <div>
                <span className={`app-status-badge ${r.status}`}>
                  <span className="app-status-dot" />
                  {r.status.replaceAll('_', ' ')}
                </span>
              </div>

              {/* Date Received Cell */}
              <div className="app-date-cell">
                <span className="app-date-main">{fmt(r.created_at)}</span>
                <span className="app-date-rel">{getRelativeTime(r.created_at)}</span>
              </div>

              {/* Actions Cell */}
              <div className="app-actions-cell">
                <button
                  type="button"
                  className="app-btn-action"
                  onClick={() => setDrawerApp(r)}
                  title="Quick preview details in side drawer"
                >
                  👁️ Preview
                </button>
                <Link
                  className="app-btn-action primary"
                  to={`/admin/applications/${r.id}`}
                  title="Open full application workflow"
                >
                  Review →
                </Link>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {!filtered.length && (
            <div className="app-empty-state">
              <span className="app-empty-icon">📂</span>
              <h3>No applications match the current criteria</h3>
              <p>Try clearing your search terms or selecting a different status filter.</p>
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => { setStatus(''); setSearch(''); setAmountRange('all'); }}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Pagination Footer */}
          {filtered.length > 0 && (
            <div className="app-pagination">
              <div>
                Showing <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> of{' '}
                <strong>{filtered.length}</strong> applications • Total pipeline:{' '}
                <strong>{money(filteredTotalDemand)}</strong>
              </div>

              <div className="app-page-controls">
                <span style={{ fontSize: 12, marginRight: 6 }}>Rows per page:</span>
                <select
                  className="app-select"
                  style={{ minWidth: 64, padding: '4px 8px', fontSize: 12 }}
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>

                <button
                  type="button"
                  className="app-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>

                <span style={{ margin: '0 6px', fontSize: 12, fontWeight: 700 }}>
                  {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  className="app-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Slide-over Quick View Drawer ── */}
      {drawerApp && (
        <div className="app-drawer-backdrop" onClick={() => setDrawerApp(null)}>
          <div className="app-drawer" onClick={e => e.stopPropagation()}>
            <div className="app-drawer-head">
              <div>
                <h2>{drawerApp.name || 'Application Details'}</h2>
                <p>Case ID: #{drawerApp.id}</p>
              </div>
              <button
                type="button"
                className="app-drawer-close"
                onClick={() => setDrawerApp(null)}
              >
                ✕
              </button>
            </div>

            <div className="app-drawer-body">
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#647580', textTransform: 'uppercase', fontWeight: 700 }}>
                  Current Status
                </span>
                <span className={`app-status-badge ${drawerApp.status}`}>
                  <span className="app-status-dot" />
                  {drawerApp.status.replaceAll('_', ' ')}
                </span>
              </div>

              {/* Loan Demand Card */}
              <div className="app-drawer-card">
                <div className="app-drawer-card-title">💰 Credit Request</div>
                <dl className="app-drawer-dl">
                  <dt>Requested Amount</dt>
                  <dd style={{ fontSize: 16, color: '#087f8c', fontWeight: 800 }}>
                    {money(drawerApp.requested_amount_paise)}
                  </dd>
                  <dt>Declared Income</dt>
                  <dd>{drawerApp.monthly_income_paise ? money(drawerApp.monthly_income_paise) + ' / mo' : '—'}</dd>
                  <dt>Loan Purpose</dt>
                  <dd>{drawerApp.purpose || 'Not specified'}</dd>
                  <dt>Date Submitted</dt>
                  <dd>{fmt(drawerApp.created_at)}</dd>
                </dl>
              </div>

              {/* Applicant Profile Card */}
              <div className="app-drawer-card">
                <div className="app-drawer-card-title">👤 Applicant Info</div>
                <dl className="app-drawer-dl">
                  <dt>Full Name</dt>
                  <dd>{drawerApp.name || '—'}</dd>
                  <dt>Mobile Number</dt>
                  <dd>{drawerApp.mobile || '—'}</dd>
                  <dt>Customer ID</dt>
                  <dd style={{ fontFamily: 'monospace', fontSize: 11 }}>{drawerApp.customer_id}</dd>
                </dl>
              </div>

              {/* Next of Kin Card if available */}
              {drawerApp.next_of_kin && (
                <div className="app-drawer-card">
                  <div className="app-drawer-card-title">🤝 Next of Kin</div>
                  <dl className="app-drawer-dl">
                    <dt>Name</dt>
                    <dd>{drawerApp.next_of_kin.name || '—'}</dd>
                    <dt>Relationship</dt>
                    <dd>{drawerApp.next_of_kin.relationship || '—'}</dd>
                  </dl>
                </div>
              )}

              {/* Bank Snapshot if available */}
              {drawerApp.bank_snapshot && (
                <div className="app-drawer-card">
                  <div className="app-drawer-card-title">🏦 Disbursement Bank Account</div>
                  <dl className="app-drawer-dl">
                    <dt>Bank Name</dt>
                    <dd>{drawerApp.bank_snapshot.bankName || '—'}</dd>
                    <dt>Account Number</dt>
                    <dd style={{ fontFamily: 'monospace' }}>{drawerApp.bank_snapshot.accountNumber || '—'}</dd>
                    <dt>IFSC Code</dt>
                    <dd style={{ fontFamily: 'monospace' }}>{drawerApp.bank_snapshot.ifsc || '—'}</dd>
                  </dl>
                </div>
              )}
            </div>

            <div className="app-drawer-foot">
              <button
                type="button"
                className="app-btn-secondary"
                onClick={() => setDrawerApp(null)}
              >
                Close Preview
              </button>
              <Link
                className="app-btn-action primary"
                to={`/admin/applications/${drawerApp.id}`}
                style={{ padding: '10px 18px' }}
              >
                Open Full Review File →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Status action widget ── */
function StatusAction({ id, status, onDone }: { id: string; status: string; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const allowed: Record<string, string[]> = {
    submitted: ['under_review'],
    under_review: ['approved', 'information_requested', 'rejected'],
    information_requested: ['under_review', 'rejected'],
  };
  const labels: Record<string, string> = {
    under_review: 'Start review',
    approved: 'Approve application',
    information_requested: 'Request more information',
    rejected: 'Reject application',
  };

  const act = async (next: string) => {
    if (!reason.trim()) { setError('A recorded reason is required for the audit log.'); return; }
    if (next === 'information_requested' && !message.trim()) { setError('Enter a message explaining what the customer must correct.'); return; }
    setBusy(true); setError('');
    try {
      await request(`/admin/applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next, reason, message }) });
      setReason(''); setMessage('');
      await onDone();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!allowed[status]?.length) return null;
  return (
    <div className="page-section">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Application decision</h2>
        <span className={`pill ${status}`}>{status.replaceAll('_', ' ')}</span>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 18px' }}>
        Every decision is permanently written to the audit history and requires a recorded reason.
      </p>
      <div className="form-grid">
        <label>
          Decision reason (required for audit)
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="E.g. Income verified, documents complete" />
        </label>
        <label>
          Message to customer
          <input value={message} onChange={e => setMessage(e.target.value)} placeholder={status === 'under_review' ? 'Required when requesting information' : 'Optional note visible to applicant'} />
        </label>
      </div>
      <Notice value={error} />
      <div className="actions">
        {allowed[status].map((next: string) => (
          <button
            type="button"
            key={next}
            disabled={busy}
            className={next === 'rejected' ? 'danger' : next === 'information_requested' ? 'secondary' : 'primary'}
            onClick={() => act(next)}
          >
            {busy ? 'Saving…' : labels[next]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Offer editor widget ── */
function OfferEditor({ application, onDone }: { application: any; onDone: () => void }) {
  const defaults = {
    principal: String(Number(application.requested_amount_paise) / 100),
    rate: '12', ratePeriod: 'annual', method: 'reducing',
    instalments: '12', firstDueDate: today(),
    processingFee: '0', otherCharges: '0', rounding: 'nearest',
  };
  const [f, setF] = useState(defaults);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const payload = () => ({
    principalPaise: Math.round(Number(f.principal) * 100),
    rate: Number(f.rate), ratePeriod: f.ratePeriod, method: f.method,
    instalments: Number(f.instalments), frequency: 'monthly',
    firstDueDate: f.firstDueDate,
    processingFeePaise: Math.round(Number(f.processingFee) * 100),
    otherChargesPaise: Math.round(Number(f.otherCharges) * 100),
    rounding: f.rounding, currency: 'INR',
  });

  const calcPreview = async () => {
    try { setPreview(await request('/admin/offers/preview', { method: 'POST', body: JSON.stringify(payload()) })); setError(''); }
    catch (e) { setError((e as Error).message); }
  };

  const present = async () => {
    if (!preview) { setError('Calculate and review the schedule before presenting the offer.'); return; }
    setBusy(true); setError('');
    try { await request(`/admin/applications/${application.id}/offers`, { method: 'POST', body: JSON.stringify(payload()) }); await onDone(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const hasActiveOffer = application.offers?.some((o: any) => ['presented', 'accepted'].includes(o.status));
  if (application.status !== 'approved' || hasActiveOffer) return null;

  return (
    <div className="page-section">
      <span className="eyebrow" style={{ color: '#4caf7a' }}>APPROVED APPLICATION</span>
      <h2 style={{ marginTop: 6 }}>Prepare loan offer</h2>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        Set the final approved terms. The full EMI schedule is calculated server-side and shown before you present the offer.
        The customer must explicitly accept before any disbursement can be recorded.
      </p>

      <div className="form-grid">
        <label>Approved principal (₹)
          <input required min="1" type="number" value={f.principal}
            onChange={e => { setF({ ...f, principal: e.target.value }); setPreview(null); }} />
        </label>
        <label>Interest rate (%)
          <input required min="0.01" max="100" type="number" step="0.01" value={f.rate}
            onChange={e => { setF({ ...f, rate: e.target.value }); setPreview(null); }} />
        </label>
        <label>Rate period
          <select value={f.ratePeriod} onChange={e => { setF({ ...f, ratePeriod: e.target.value }); setPreview(null); }}>
            <option value="annual">Annual</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>Calculation method
          <select value={f.method} onChange={e => { setF({ ...f, method: e.target.value }); setPreview(null); }}>
            <option value="reducing">Reducing balance</option>
            <option value="flat">Flat interest</option>
          </select>
        </label>
        <label>Number of instalments
          <input required min="1" max="120" type="number" value={f.instalments}
            onChange={e => { setF({ ...f, instalments: e.target.value }); setPreview(null); }} />
        </label>
        <label>First due date
          <input required type="date" value={f.firstDueDate}
            onChange={e => { setF({ ...f, firstDueDate: e.target.value }); setPreview(null); }} />
        </label>
        <label>Processing fee (₹)
          <input min="0" type="number" value={f.processingFee}
            onChange={e => { setF({ ...f, processingFee: e.target.value }); setPreview(null); }} />
        </label>
        <label>Other permitted charges (₹)
          <input min="0" type="number" value={f.otherCharges}
            onChange={e => { setF({ ...f, otherCharges: e.target.value }); setPreview(null); }} />
        </label>
      </div>

      {preview && (
        <>
          <div className="schedule-summary">
            <div className="sum-box"><label>Principal</label><strong>{money(Math.round(Number(f.principal) * 100))}</strong></div>
            <div className="sum-box"><label>Total interest</label><strong>{money(preview.totalInterestPaise)}</strong></div>
            <div className="sum-box"><label>Total fees</label><strong>{money(Math.round((Number(f.processingFee || 0) + Number(f.otherCharges || 0)) * 100))}</strong></div>
            <div className="sum-box"><label>Total payable</label><strong>{money(preview.totalPayablePaise)}</strong></div>
            <div className="sum-box">
              <label>Monthly EMI</label>
              <strong>{money(preview.schedule?.[preview.schedule.length > 1 ? 1 : 0]?.principalPaise + preview.schedule?.[preview.schedule.length > 1 ? 1 : 0]?.interestPaise)}</strong>
            </div>
          </div>
          <div className="flex-between" style={{ marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Full EMI schedule ({preview.schedule?.length} instalments)</h3>
            <button className="secondary btn-sm" type="button" onClick={() => setShowSchedule(s => !s)}>
              {showSchedule ? 'Hide schedule' : 'Show full schedule'}
            </button>
          </div>
          {showSchedule && (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="schedule-table">
                <thead>
                  <tr><th>#</th><th>Due date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total EMI</th></tr>
                </thead>
                <tbody>
                  {preview.schedule?.map((row: any) => (
                    <tr key={row.number}>
                      <td>{row.number}</td>
                      <td>{row.dueDate}</td>
                      <td>{money(row.principalPaise)}</td>
                      <td>{money(row.interestPaise)}</td>
                      <td>{money(row.feesPaise)}</td>
                      <td><strong>{money(row.totalDuePaise)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Notice value={error} />
      <div className="actions">
        <button type="button" className="secondary" disabled={busy} onClick={calcPreview}>Calculate schedule</button>
        <button type="button" className="primary" disabled={busy || !preview} onClick={present}>
          {busy ? 'Presenting…' : 'Present offer to customer'}
        </button>
      </div>
    </div>
  );
}

/* ── Admin notes widget ── */
function NotesPanel({ entityId, entityType, initialNotes = [] }: { entityId: string; entityType: 'application' | 'loan'; initialNotes?: any[] }) {
  const [notes, setNotes] = useState<any[]>(initialNotes);
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const basePath = `/admin/${entityType === 'application' ? 'applications' : 'loans'}/${entityId}/notes`;

  useEffect(() => setNotes(initialNotes), [initialNotes]);

  const addNote = async () => {
    if (!note.trim()) { setError('Note text is required.'); return; }
    setBusy(true); setError('');
    try {
      await request(basePath, { method: 'POST', body: JSON.stringify({ note, contactChannel: channel || undefined }) });
      setNote(''); setChannel('');
      setNotes(n => [{ note, contact_channel: channel, created_at: new Date().toISOString(), admin_name: 'You' }, ...n]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="page-section">
      <h2>Internal notes</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        Notes are for internal use only. Do not record harassing or misleading collection messages.
      </p>
      {notes.length > 0 && (
        <div className="notes-list">
          {notes.map((n, i) => (
            <div className="note-item" key={i}>
              <div className="note-header">
                <span className="note-admin">{n.admin_name || 'Admin'}</span>
                <span className="note-time">{fmtTime(n.created_at)}</span>
              </div>
              <div>{n.note}</div>
              {n.contact_channel && <div className="note-channel">via {n.contact_channel}</div>}
            </div>
          ))}
        </div>
      )}
      <Notice value={error} />
      <div style={{ display: 'grid', gap: 10 }}>
        <label style={{ marginBottom: 0 }}>Note
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add an internal note or contact log entry" />
        </label>
        <label style={{ marginBottom: 0 }}>Contact channel (optional)
          <input value={channel} onChange={e => setChannel(e.target.value)} placeholder="E.g. phone, WhatsApp" />
        </label>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="secondary btn-sm" type="button" disabled={busy} onClick={addNote}>
            {busy ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   3. APPLICATION DETAIL
   ═══════════════════════════════════════════════════ */
export function AdminApplicationDetail() {
  const { id } = useParams();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);

  const load = () => request(`/admin/applications/${id}`).then(setA).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (!a) return error ? <Notice value={error} /> : <Spinner />;

  const bank = a.bank_snapshot || {};
  const activeOffer = a.offers?.find((o: any) => o.status === 'accepted') || a.offers?.[0];

  return (
    <>
      <div className="pagehead">
        <div>
          <Link to="/admin/applications" className="back">← Applications</Link>
          <h1>{a.name}</h1>
          <p>{a.email} · {a.mobile}</p>
        </div>
        <span className={`pill ${a.status}`}>{a.status.replaceAll('_', ' ')}</span>
      </div>
      <Notice value={error} />

      {/* Top meta cards */}
      <div className="app-meta-grid">
        <div className="meta-card">
          <div className="meta-label">Requested amount</div>
          <div className="meta-value">{money(a.requested_amount_paise)}</div>
        </div>
        <div className="meta-card">
          <div className="meta-label">Monthly income</div>
          <div className="meta-value">{money(a.monthly_income_paise)}</div>
        </div>
        <div className="meta-card">
          <div className="meta-label">Loan purpose</div>
          <div className="meta-value" style={{ fontSize: 15 }}>{a.purpose}</div>
        </div>
      </div>

      {/* Personal info + bank */}
      <div className="detail-grid">
        <div className="page-section" style={{ marginBottom: 0 }}>
          <h2>Applicant profile</h2>
          <dl>
            <dt>Full name</dt><dd>{a.name}</dd>
            <dt>Email</dt><dd>{a.email}</dd>
            <dt>Mobile</dt><dd>{a.mobile}</dd>
            {a.whatsapp && <><dt>WhatsApp</dt><dd>{a.whatsapp}</dd></>}
            <dt>Date of birth</dt><dd>{a.date_of_birth || '—'}</dd>
            <dt>Guardian name</dt><dd>{a.guardian_name || '—'}</dd>
            <dt>Address</dt><dd>{a.address || '—'}</dd>
            <dt>Next of kin</dt><dd>{a.next_of_kin?.name} ({a.next_of_kin?.relationship})</dd>
            <dt>Applied on</dt><dd>{fmt(a.created_at)}</dd>
          </dl>
        </div>

        <div className="page-section" style={{ marginBottom: 0 }}>
          <h2>Bank destination</h2>
          <div className="money-form-warning">
            <span className="warn-icon">🔒</span>
            <div>Account numbers are masked by default. Only reveal for active verification.</div>
          </div>
          <dl>
            <dt>Bank name</dt><dd>{bank.bankName}</dd>
            <dt>Account holder</dt><dd>{bank.accountHolderName}</dd>
            <dt>IFSC</dt><dd className="bank-masked">{bank.ifsc}</dd>
            <dt>Account no.</dt>
            <dd className="bank-masked">
              {reveal ? bank.accountNumber : `••••${String(bank.accountNumber || '').slice(-4)}`}
            </dd>
          </dl>
          <button className="secondary btn-sm" style={{ marginTop: 14 }} onClick={() => setReveal(!reveal)}>
            {reveal ? '🔒 Mask account number' : '👁 Reveal for verification'}
          </button>
        </div>
      </div>

      {/* Witnesses */}
      <div className="page-section section-gap">
        <h2>Witnesses</h2>
        <div className="witness-grid">
          {a.witnesses.map((w: any) => (
            <div key={w.position}>
              <span className="eyebrow">WITNESS {w.position}</span>
              <h3 style={{ margin: '8px 0 4px' }}>{w.details.name}</h3>
              <dl>
                <dt>Father's name</dt><dd>{w.details.guardianName || '—'}</dd>
                <dt>Mobile</dt><dd>{w.details.mobile}</dd>
                <dt>Address</dt><dd>{w.details.address}</dd>
              </dl>
              <small className="muted" style={{ display: 'block', marginTop: 10 }}>
                ⚠ Witnesses are not automatically guarantors or financially liable.
              </small>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="page-section section-gap">
        <h2>Documents</h2>
        {a.documents.length ? (
          <div className="doc-list">
            {a.documents.map((d: any) => (
              <div className="doc-row" key={d.id}>
                <div className="doc-icon">
                  {d.mime_type === 'application/pdf' ? '📄' : '🖼'}
                </div>
                <div className="doc-info">
                  <strong>{d.kind.replaceAll('_', ' ')}</strong>
                  <small>{d.mime_type} · {(d.size_bytes / 1024).toFixed(0)} KB · uploaded {fmt(d.created_at)}</small>
                </div>
                <span className={`pill ${d.scan_status === 'clean' ? 'confirmed' : d.scan_status === 'flagged' ? 'rejected' : ''}`}>
                  {d.scan_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No documents uploaded yet.</p>
        )}
      </div>

      {/* Review history */}
      {a.reviews?.length > 0 && (
        <div className="page-section section-gap">
          <h2>Review history</h2>
          <div className="review-timeline">
            {a.reviews.map((r: any, i: number) => (
              <div className="review-event" key={i}>
                <div className={`review-marker ${r.action}`}>
                  {r.action === 'approved' ? '✓' : r.action === 'rejected' ? '✗' : '→'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="rev-action">{r.action.replaceAll('_', ' ')}</div>
                  {r.reason && <div className="rev-reason">Reason: {r.reason}</div>}
                  {r.message && <div className="rev-message">Message to customer: {r.message}</div>}
                </div>
                <div className="rev-time">{fmtTime(r.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Offer history */}
      {a.offers?.length > 0 && (
        <div className="page-section section-gap">
          <h2>Offer history</h2>
          {a.offers.map((o: any) => (
            <div className="offer-row" key={o.id}>
              <div className="offer-terms">
                <strong>{money(o.terms.principalPaise)} · {o.terms.rate}% {o.terms.ratePeriod} · {o.terms.instalments} instalments · {o.terms.method}</strong>
                <small>Total payable: {money(o.total_payable_paise)} · Interest: {money(o.total_interest_paise)} · Prepared {fmt(o.created_at)}</small>
              </div>
              <span className={`pill ${o.status}`}>{o.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Linked loan */}
      {a.loan && (
        <div className="page-section section-gap">
          <div className="flex-between">
            <h2 style={{ margin: 0 }}>Linked loan</h2>
            <Link to={`/admin/loans/${a.loan.id}`} className="secondary btn-sm" style={{ textDecoration: 'none', padding: '9px 14px', borderRadius: 8, background: '#eef1ed', color: 'var(--green)', fontWeight: 700 }}>
              View loan details →
            </Link>
          </div>
          <div className="app-meta-grid" style={{ marginTop: 16, marginBottom: 0 }}>
            <div className="meta-card"><div className="meta-label">Loan status</div><div className={`pill ${a.loan.status}`}>{a.loan.status.replaceAll('_', ' ')}</div></div>
            <div className="meta-card"><div className="meta-label">Activated on</div><div className="meta-value" style={{ fontSize: 15 }}>{a.loan.activated_at ? fmt(a.loan.activated_at) : '—'}</div></div>
            <div className="meta-card"><div className="meta-label">Created on</div><div className="meta-value" style={{ fontSize: 15 }}>{fmt(a.loan.created_at)}</div></div>
          </div>
        </div>
      )}

      {/* Status actions */}
      <StatusAction id={a.id} status={a.status} onDone={load} />

      {/* Offer editor */}
      <OfferEditor application={a} onDone={load} />

      {/* Notes */}
      <NotesPanel entityId={a.id} entityType="application" initialNotes={a.notes} />
    </>
  );
}

/* ═══════════════════════════════════════════════════
   4. LOAN BOOK — UPGRADED WITH DIRECT TRANSACTIONS
   ═══════════════════════════════════════════════════ */
export function AdminLoans() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('highest_balance');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cash Collection Modal State
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashRef, setCashRef] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [cashBusy, setCashBusy] = useState(false);
  const [cashError, setCashError] = useState('');
  const [cashReceipt, setCashReceipt] = useState<any>(null);

  const loadData = () => {
    setLoading(true);
    request('/admin/loans' + (status && status !== 'overdue' ? `?status=${status}` : ''))
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setPage(1);
  }, [status]);

  // Overall metric counters
  const metrics = useMemo(() => {
    const total = rows.length;
    let active = 0;
    let awaitingDisbursement = 0;
    let completed = 0;
    let overdue = 0;
    let totalPayablePaise = 0;
    let totalPaidPaise = 0;
    const now = new Date();

    for (const l of rows) {
      totalPayablePaise += Number(l.total_payable_paise || 0);
      totalPaidPaise += Number(l.paid_paise || 0);

      if (l.status === 'active') {
        active++;
        if (l.next_due_date && new Date(l.next_due_date) < now) {
          overdue++;
        }
      } else if (l.status === 'awaiting_disbursement') {
        awaitingDisbursement++;
      } else if (l.status === 'completed') {
        completed++;
      }
    }

    const outstandingPaise = Math.max(0, totalPayablePaise - totalPaidPaise);

    return {
      total,
      active,
      awaitingDisbursement,
      completed,
      overdue,
      totalPayablePaise,
      totalPaidPaise,
      outstandingPaise,
    };
  }, [rows]);

  // Open Cash Modal for specific loan
  const openCashModal = (loan?: any) => {
    setCashError('');
    setCashReceipt(null);
    setCashDate(new Date().toISOString().slice(0, 10));
    setCashNotes('');
    setCashRef(`CASH-${Date.now().toString().slice(-6)}`);

    if (loan) {
      setSelectedLoan(loan);
      const outstanding = Number(loan.total_payable_paise || 0) - Number(loan.paid_paise || 0);
      const defAmt = Math.max(0, Math.round(outstanding / 100));
      setCashAmount(defAmt ? String(defAmt) : '');
    } else {
      setSelectedLoan(rows.find(x => x.status === 'active') || null);
      setCashAmount('');
    }
    setCashModalOpen(true);
  };

  // Submit Cash Payment
  const submitCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) {
      setCashError('Please select a borrower account.');
      return;
    }
    const amt = Number(cashAmount);
    if (!amt || amt <= 0) {
      setCashError('Enter a valid cash payment amount greater than ₹0.');
      return;
    }
    setCashBusy(true);
    setCashError('');
    try {
      const res = await request('/admin/quick-cash-payment', {
        method: 'POST',
        body: JSON.stringify({
          loanId: selectedLoan.id,
          amountPaise: Math.round(amt * 100),
          paymentDate: cashDate,
          reference: cashRef,
          notes: cashNotes,
        }),
      });
      setCashReceipt(res.receipt);
      loadData();
    } catch (err) {
      setCashError((err as Error).message);
    } finally {
      setCashBusy(false);
    }
  };

  // Filter & Search
  const filtered = useMemo(() => {
    let list = [...rows];
    const now = new Date();

    if (status === 'overdue') {
      list = list.filter(l => l.status === 'active' && l.next_due_date && new Date(l.next_due_date) < now);
    } else if (status) {
      list = list.filter(l => l.status === status);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        `${r.name ?? ''} ${r.mobile ?? ''} ${r.id ?? ''}`.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const balA = Number(a.total_payable_paise || 0) - Number(a.paid_paise || 0);
      const balB = Number(b.total_payable_paise || 0) - Number(b.paid_paise || 0);
      if (sortBy === 'highest_balance') return balB - balA;
      if (sortBy === 'lowest_balance') return balA - balB;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return list;
  }, [rows, status, search, sortBy]);

  // Export Loans CSV
  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Loan ID', 'Borrower Name', 'Mobile', 'Total Payable (INR)', 'Paid (INR)', 'Outstanding (INR)', 'Status', 'Date Activated'];
    const csvRows = filtered.map(l => {
      const outstanding = (Number(l.total_payable_paise || 0) - Number(l.paid_paise || 0)) / 100;
      return [
        `"${l.id}"`,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${l.mobile || ''}"`,
        Number(l.total_payable_paise || 0) / 100,
        Number(l.paid_paise || 0) / 100,
        Math.max(0, outstanding),
        `"${l.status}"`,
        `"${l.activated_at ? new Date(l.activated_at).toISOString().slice(0, 10) : ''}"`
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `loans-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyId = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="app-queue-container">
      {/* ── Page Header ── */}
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow">LOAN BOOK</span>
          <h1>Loans</h1>
          <p>All active borrower cases, disbursements, balances, and collection status.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="app-btn-cash"
            onClick={() => openCashModal()}
            title="Record direct cash EMI collection receipt"
          >
            💰 + Collect Cash
          </button>
          <button type="button" className="app-btn-secondary" onClick={exportCSV} title="Export loan book to CSV">
            📥 Export CSV
          </button>
          <button type="button" className="app-btn-secondary" onClick={loadData} title="Refresh loan book">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Top KPI Stat Cards ── */}
      <div className="app-kpi-grid">
        <div className={`app-kpi-card ${status === '' ? 'active' : ''}`} onClick={() => setStatus('')}>
          <div className="app-kpi-icon">📚</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Total Portfolio</span>
            <span className="app-kpi-value">{metrics.total}</span>
            <span className="app-kpi-sub">{money(metrics.totalPayablePaise)} total book</span>
          </div>
        </div>

        <div className={`app-kpi-card info ${status === 'active' ? 'active' : ''}`} onClick={() => setStatus(status === 'active' ? '' : 'active')}>
          <div className="app-kpi-icon">⚡</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Active Cases</span>
            <span className="app-kpi-value">{metrics.active}</span>
            <span className="app-kpi-sub">{money(metrics.outstandingPaise)} remaining balance</span>
          </div>
        </div>

        <div className="app-kpi-card good">
          <div className="app-kpi-icon">💸</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Total Collected</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(metrics.totalPaidPaise)}</span>
            <span className="app-kpi-sub">
              {metrics.totalPayablePaise
                ? `${((metrics.totalPaidPaise / metrics.totalPayablePaise) * 100).toFixed(1)}% recovery`
                : '0% recovery'}
            </span>
          </div>
        </div>

        <div className={`app-kpi-card warn ${status === 'overdue' ? 'active' : ''}`} onClick={() => setStatus(status === 'overdue' ? '' : 'overdue')}>
          <div className="app-kpi-icon">⚠️</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Overdue EMIs</span>
            <span className="app-kpi-value">{metrics.overdue}</span>
            <span className="app-kpi-sub">Requires follow-up</span>
          </div>
        </div>

        <div className={`app-kpi-card purple ${status === 'awaiting_disbursement' ? 'active' : ''}`} onClick={() => setStatus(status === 'awaiting_disbursement' ? '' : 'awaiting_disbursement')}>
          <div className="app-kpi-icon">🏦</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Awaiting Transfer</span>
            <span className="app-kpi-value">{metrics.awaitingDisbursement}</span>
            <span className="app-kpi-sub">Ready for disbursement</span>
          </div>
        </div>
      </div>

      {/* ── Status Tab Chips ── */}
      <div className="app-tabs-wrapper">
        <button type="button" className={`app-tab-btn ${status === '' ? 'active' : ''}`} onClick={() => setStatus('')}>
          All Loans <span className="app-tab-count">{metrics.total}</span>
        </button>
        <button type="button" className={`app-tab-btn ${status === 'active' ? 'active' : ''}`} onClick={() => setStatus('active')}>
          Active Cases <span className="app-tab-count">{metrics.active}</span>
        </button>
        <button type="button" className={`app-tab-btn has-action ${status === 'overdue' ? 'active' : ''}`} onClick={() => setStatus('overdue')}>
          ⚠️ Overdue Attention <span className="app-tab-count">{metrics.overdue}</span>
        </button>
        <button type="button" className={`app-tab-btn ${status === 'awaiting_disbursement' ? 'active' : ''}`} onClick={() => setStatus('awaiting_disbursement')}>
          Awaiting Disbursement <span className="app-tab-count">{metrics.awaitingDisbursement}</span>
        </button>
        <button type="button" className={`app-tab-btn ${status === 'completed' ? 'active' : ''}`} onClick={() => setStatus('completed')}>
          Completed <span className="app-tab-count">{metrics.completed}</span>
        </button>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="app-toolbar">
        <div className="app-search-wrap">
          <span className="app-search-icon">🔍</span>
          <input
            className="app-search-input"
            placeholder="Search borrower name, phone, or loan ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button type="button" className="app-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="app-toolbar-controls">
          <select className="app-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="highest_balance">Sort: Highest Outstanding Balance</option>
            <option value="lowest_balance">Sort: Lowest Balance</option>
            <option value="newest">Sort: Newest First</option>
            <option value="name_asc">Sort: Borrower (A–Z)</option>
          </select>

          {(status || search) && (
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <Notice value={error} />

      {/* ── Loans Table ── */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="app-table-card">
          <div className="app-table-head" style={{ gridTemplateColumns: '2.4fr 1.3fr 1.8fr 1.3fr 1.2fr 1.4fr' }}>
            <span>Borrower & Case ID</span>
            <span>Total Payable</span>
            <span>Repayment Progress</span>
            <span>Outstanding</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {paginatedRows.map(l => {
            const total = Number(l.total_payable_paise || 0);
            const paid = Number(l.paid_paise || 0);
            const outstanding = Math.max(0, total - paid);
            const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0;
            const isOverdue = l.status === 'active' && l.next_due_date && new Date(l.next_due_date) < new Date();

            return (
              <div className="app-table-row" key={l.id} style={{ gridTemplateColumns: '2.4fr 1.3fr 1.8fr 1.3fr 1.2fr 1.4fr' }}>
                {/* Borrower Cell */}
                <div className="app-applicant-cell">
                  <div className="app-avatar">{getInitials(l.name)}</div>
                  <div className="app-applicant-meta">
                    <Link to={`/admin/loans/${l.id}`} className="app-applicant-name">
                      {l.name || 'Anonymous Borrower'}
                    </Link>
                    <div className="app-applicant-sub">
                      <span>{l.mobile || '—'}</span>
                      {l.mobile && (
                        <a
                          href={`https://wa.me/${String(l.mobile).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Chat on WhatsApp"
                          style={{ color: '#25D366', textDecoration: 'none', fontSize: 13 }}
                          onClick={e => e.stopPropagation()}
                        >
                          💬
                        </a>
                      )}
                      <span className="app-id-pill" onClick={e => copyId(e, l.id)} title="Copy Loan ID">
                        {copiedId === l.id ? '✓ Copied' : `#${String(l.id).slice(0, 8)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Payable */}
                <div className="app-amount-cell">
                  {money(l.total_payable_paise)}
                </div>

                {/* Repayment Progress */}
                <div className="app-progress-wrap">
                  <div className="app-progress-meta">
                    <strong>{money(l.paid_paise)}</strong>
                    <span>{pct}% paid</span>
                  </div>
                  <div className="app-progress-track">
                    <div className="app-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Outstanding Balance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong style={{ color: isOverdue ? '#dc3545' : '#172b35', fontSize: 14 }}>
                    {money(outstanding)}
                  </strong>
                  {isOverdue && <span style={{ fontSize: 11, color: '#dc3545', fontWeight: 700 }}>⚠️ Overdue</span>}
                </div>

                {/* Status */}
                <div>
                  <span className={`app-status-badge ${l.status}`}>
                    <span className="app-status-dot" />
                    {l.status.replaceAll('_', ' ')}
                  </span>
                </div>

                {/* Actions */}
                <div className="app-actions-cell">
                  {l.status === 'active' && (
                    <button
                      type="button"
                      className="app-btn-action"
                      style={{ background: '#eef8f2', borderColor: '#bbf7d0', color: '#168052' }}
                      onClick={() => openCashModal(l)}
                      title="Collect direct cash EMI payment"
                    >
                      💰 Collect
                    </button>
                  )}
                  <Link className="app-btn-action primary" to={`/admin/loans/${l.id}`}>
                    Details →
                  </Link>
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="app-empty-state">
              <span className="app-empty-icon">📂</span>
              <h3>No loan records match this filter</h3>
              <p>Try clearing your search terms or selecting a different status filter.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="app-pagination">
              <div>
                Showing <strong>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                <strong>{Math.min(filtered.length, currentPage * pageSize)}</strong> of{' '}
                <strong>{filtered.length}</strong> loans
              </div>
              <div className="app-page-controls">
                <span style={{ fontSize: 12, marginRight: 6 }}>Rows per page:</span>
                <select
                  className="app-select"
                  style={{ minWidth: 64, padding: '4px 8px', fontSize: 12 }}
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <button
                  type="button"
                  className="app-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </button>
                <span style={{ margin: '0 6px', fontSize: 12, fontWeight: 700 }}>
                  {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="app-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Cash Collection Modal ── */}
      {cashModalOpen && (
        <div className="app-modal-backdrop" onClick={() => setCashModalOpen(false)}>
          <div className="app-modal-card" onClick={e => e.stopPropagation()}>
            <div className="app-modal-head">
              <div>
                <h2>Direct Cash EMI Collection</h2>
                <p>Record verified cash collected directly from the borrower.</p>
              </div>
              <button
                type="button"
                className="app-drawer-close"
                onClick={() => setCashModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {cashReceipt ? (
              <div className="app-modal-body">
                <div className="app-receipt-box">
                  <div className="app-receipt-header">
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#087f8c' }}>
                      SAATHI FINANCE • OFFICIAL CASH RECEIPT
                    </span>
                    <h3 style={{ margin: '6px 0 2px' }}>Cash Collection Confirmed</h3>
                    <small style={{ color: '#647580' }}>Receipt #{cashReceipt.receiptNumber}</small>
                  </div>

                  <div className="app-receipt-amount">
                    {money(cashReceipt.amountPaise)}
                  </div>

                  <dl className="app-drawer-dl" style={{ borderTop: '1px solid #e1e9eb', paddingTop: 12 }}>
                    <dt>Borrower</dt>
                    <dd>{cashReceipt.customerName} ({cashReceipt.customerMobile})</dd>
                    <dt>Payment Date</dt>
                    <dd>{fmt(cashReceipt.paymentDate)}</dd>
                    <dt>New Outstanding</dt>
                    <dd style={{ color: '#087f8c', fontWeight: 800 }}>{money(cashReceipt.newOutstandingPaise)}</dd>
                    <dt>Next Due Date</dt>
                    <dd>{cashReceipt.nextDueDate ? fmt(cashReceipt.nextDueDate) : 'Fully Paid'}</dd>
                  </dl>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      className="app-btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => window.print()}
                    >
                      🖨️ Print Receipt
                    </button>
                    <button
                      type="button"
                      className="app-btn-action primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setCashModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={submitCashPayment}>
                <div className="app-modal-body">
                  {/* Select Borrower */}
                  <label>
                    Select Borrower Account
                    <select
                      className="app-select"
                      style={{ width: '100%', marginTop: 4 }}
                      value={selectedLoan?.id || ''}
                      onChange={e => {
                        const l = rows.find(x => x.id === e.target.value);
                        if (l) {
                          setSelectedLoan(l);
                          const bal = Number(l.total_payable_paise || 0) - Number(l.paid_paise || 0);
                          setCashAmount(bal > 0 ? String(Math.round(bal / 100)) : '');
                        }
                      }}
                    >
                      {rows.filter(x => x.status === 'active').map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} — Balance: {money(Number(l.total_payable_paise || 0) - Number(l.paid_paise || 0))}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="form-grid">
                    <label>
                      Cash Amount (₹)
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 5000"
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                      />
                    </label>

                    <label>
                      Payment Date
                      <input
                        type="date"
                        required
                        value={cashDate}
                        onChange={e => setCashDate(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Receipt Reference
                      <input
                        type="text"
                        value={cashRef}
                        onChange={e => setCashRef(e.target.value)}
                        placeholder="CASH-xxxxxx"
                      />
                    </label>

                    <label>
                      Agent / Collection Notes
                      <input
                        type="text"
                        value={cashNotes}
                        onChange={e => setCashNotes(e.target.value)}
                        placeholder="e.g. Received in cash at borrower shop"
                      />
                    </label>
                  </div>

                  {cashError && <Notice value={cashError} />}
                </div>

                <div className="app-modal-foot">
                  <button type="button" className="app-btn-secondary" onClick={() => setCashModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="app-btn-cash" disabled={cashBusy}>
                    {cashBusy ? 'Recording…' : `✓ Confirm & Record ₹${cashAmount || 0} Cash`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Money recording form (disbursement + payment) ── */
function MoneyForm({ loan, onDone }: { loan: any; onDone: () => void }) {
  const isDisbursement = loan.status === 'awaiting_disbursement';
  const [type, setType] = useState<'disbursement' | 'payment'>(isDisbursement ? 'disbursement' : 'payment');
  const [amount, setAmount] = useState(isDisbursement ? String(Number(loan.terms_snapshot?.principalPaise) / 100) : '');
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [txnStatus, setTxnStatus] = useState('confirmed');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setOk('');
    try {
      const path = type === 'disbursement'
        ? `/admin/loans/${loan.id}/disbursements`
        : `/admin/loans/${loan.id}/payments`;
      const body = type === 'disbursement'
        ? { amountPaise: Math.round(Number(amount) * 100), transferDate: date, bankReference: reference, status: txnStatus }
        : { amountPaise: Math.round(Number(amount) * 100), paymentDate: date, method, reference, status: txnStatus };
      await request(path, { method: 'POST', headers: { 'Idempotency-Key': idempotency() }, body: JSON.stringify(body) });
      setReference('');
      setOk('Record saved successfully. The loan status has been updated.');
      onDone();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!['awaiting_disbursement', 'active'].includes(loan.status)) return null;

  return (
    <div className="page-section section-gap">
      <h2>Record financial transaction</h2>

      {/* Tab switcher */}
      {loan.status === 'active' && (
        <div className="money-form-tabs">
          <button type="button" className={type === 'payment' ? 'active' : ''} onClick={() => setType('payment')}>
            💳 Record payment
          </button>
          <button type="button" className={type === 'disbursement' ? 'active' : ''} onClick={() => setType('disbursement')} disabled>
            🏦 Disbursement (already done)
          </button>
        </div>
      )}

      <div className="money-form-warning">
        <span className="warn-icon">⚠️</span>
        <div>
          {type === 'disbursement'
            ? 'Only confirm after the actual bank transfer has succeeded. This software does NOT send money. Record the real UTR/reference from your bank statement.'
            : 'Only record confirmed, cleared payments. Pending payments must not be recorded as confirmed. Each record is idempotency-protected against double-entry.'}
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="form-grid">
          <label>Amount (₹)
            <input required type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </label>
          <label>{type === 'disbursement' ? 'Transfer date' : 'Payment date'}
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label>{type === 'disbursement' ? 'Bank reference / UTR' : 'Payment reference'}
            <input required value={reference} onChange={e => setReference(e.target.value)}
              placeholder={type === 'disbursement' ? 'UTR from bank statement' : 'Transaction ID or receipt no.'} />
          </label>
          {type === 'payment' && (
            <label>Payment method
              <select value={method} onChange={e => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer / NEFT / RTGS</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
          )}
          <label>Status
            <select value={txnStatus} onChange={e => setTxnStatus(e.target.value)}>
              <option value="confirmed">Confirmed</option>
              <option value="pending_verification">Pending verification</option>
              <option value="rejected">Rejected / failed</option>
            </select>
          </label>
        </div>
        <Notice value={error} />
        <Notice value={ok} type="ok" />
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : type === 'disbursement' ? '✓ Record disbursement' : '✓ Record payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   5. LOAN DETAIL
   ═══════════════════════════════════════════════════ */
function AuditAction({ endpoint, label, onDone, warning }: { endpoint: string; label: string; onDone: () => void; warning: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { setError('Enter a reason for the audit history.'); return; }
    setBusy(true); setError('');
    try {
      await request(endpoint, { method: 'PATCH', body: JSON.stringify({ reason, status: 'cancelled' }) });
      setOpen(false); setReason(''); await onDone();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!open) return <button type="button" className="danger btn-sm" onClick={() => setOpen(true)}>{label}</button>;
  return <div className="audit-action-box">
    <strong>{warning}</strong>
    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Required audit reason" autoFocus />
    {error && <small className="text-danger">{error}</small>}
    <div className="audit-action-buttons">
      <button type="button" className="danger btn-sm" disabled={busy} onClick={submit}>{busy ? 'Saving...' : `Confirm ${label.toLowerCase()}`}</button>
      <button type="button" className="secondary btn-sm" disabled={busy} onClick={() => { setOpen(false); setError(''); }}>Keep unchanged</button>
    </div>
  </div>;
}
export function AdminLoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'transactions' | 'terms' | 'notes'>('schedule');
  const [copiedId, setCopiedId] = useState(false);

  // Quick Cash Collection Modal state
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashDate, setCashDate] = useState(today());
  const [cashRef, setCashRef] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [cashBusy, setCashBusy] = useState(false);
  const [cashError, setCashError] = useState('');
  const [cashReceipt, setCashReceipt] = useState<any>(null);

  // Receipt Modal for existing payments
  const [viewReceipt, setViewReceipt] = useState<any>(null);

  const load = () => request(`/admin/loans/${id}`).then(setLoan).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (!loan) return error ? <Notice value={error} /> : <Spinner />;

  const total = Number(loan.total_payable_paise || 0);
  const paid = (loan.schedule || []).reduce((s: number, x: any) => s + Number(x.paid_paise || 0), 0);
  const outstanding = Math.max(0, total - paid);
  const pct = total > 0 ? (paid / total * 100) : 0;
  const terms = loan.terms_snapshot || {};
  const cleanPhone = (loan.mobile || '').replace(/\D/g, '');

  const initials = (loan.name || 'Borrower')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const nextUnpaid = (loan.schedule || []).find((s: any) => Number(s.paid_paise || 0) < Number(s.total_due_paise || 0));
  const isOverdueLoan = (loan.schedule || []).some(
    (s: any) => Number(s.paid_paise || 0) < Number(s.total_due_paise || 0) && new Date(s.due_date) < new Date()
  );

  const txns = [
    ...(loan.disbursements || []).map((x: any) => ({ ...x, type: 'disbursement', date: x.transfer_date, ref: x.bank_reference })),
    ...(loan.payments || []).map((x: any) => ({ ...x, type: 'payment', date: x.payment_date, ref: x.reference })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const handleCopyId = () => {
    if (loan?.id) {
      navigator.clipboard.writeText(loan.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const openCashCollection = (suggestedAmountPaise?: number, defaultNote?: string) => {
    if (suggestedAmountPaise && suggestedAmountPaise > 0) {
      setCashAmount(String(Math.round(suggestedAmountPaise / 100)));
    } else if (nextUnpaid) {
      const due = Number(nextUnpaid.total_due_paise || 0) - Number(nextUnpaid.paid_paise || 0);
      setCashAmount(due > 0 ? String(Math.round(due / 100)) : '');
    } else if (outstanding > 0) {
      setCashAmount(String(Math.round(outstanding / 100)));
    } else {
      setCashAmount('');
    }

    setCashDate(today());
    setCashRef(`CASH-${Date.now().toString().slice(-6)}`);
    setCashNotes(defaultNote || (nextUnpaid ? `Cash collection for EMI #${nextUnpaid.number}` : 'Cash collection for loan repayment'));
    setCashError('');
    setCashReceipt(null);
    setCashModalOpen(true);
  };

  const submitCashPayment = async (e: FormEvent) => {
    e.preventDefault();
    const amt = Number(cashAmount);
    if (!amt || amt <= 0) {
      setCashError('Enter a valid payment amount greater than ₹0.');
      return;
    }
    setCashBusy(true);
    setCashError('');
    try {
      const res = await request('/admin/quick-cash-payment', {
        method: 'POST',
        body: JSON.stringify({
          loanId: loan.id,
          amountPaise: Math.round(amt * 100),
          paymentDate: cashDate,
          reference: cashRef,
          notes: cashNotes,
        }),
      });
      setCashReceipt(res.receipt);
      load();
    } catch (err) {
      setCashError((err as Error).message);
    } finally {
      setCashBusy(false);
    }
  };

  return (
    <>
      {/* ── Executive Header ── */}
      <div className="loan-header-flex">
        <div className="loan-borrower-profile">
          <div className="loan-avatar-circle">{initials}</div>
          <div className="loan-borrower-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link className="back" to="/admin/loans" style={{ margin: 0, textDecoration: 'none' }}>← Loans</Link>
              <span className={`pill ${loan.status}`}>{loan.status.replaceAll('_', ' ')}</span>
            </div>
            <h1>{loan.name}</h1>
            <div className="loan-borrower-sub">
              {loan.mobile && (
                <a
                  className="loan-contact-badge whatsapp"
                  href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(loan.name)},%20regarding%20your%20Saathi%20loan%20account.`}
                  target="_blank"
                  rel="noreferrer"
                  title="Direct WhatsApp Chat"
                >
                  💬 {loan.mobile}
                </a>
              )}
              {loan.email && (
                <span className="loan-contact-badge">✉️ {loan.email}</span>
              )}
              <button
                type="button"
                className="loan-id-copy-btn"
                onClick={handleCopyId}
                title="Click to copy Loan ID"
              >
                📋 {loan.id.slice(0, 8)}… {copiedId ? '✓ Copied' : ''}
              </button>
            </div>
          </div>
        </div>

        <div className="loan-header-actions">
          {loan.status === 'active' && (
            <button
              type="button"
              className="app-btn-cash"
              onClick={() => openCashCollection()}
            >
              💰 + Collect Cash EMI
            </button>
          )}
          <button
            type="button"
            className="app-btn-action"
            onClick={() => window.print()}
          >
            🖨️ Statement
          </button>
          <Link
            to={`/admin/applications/${loan.application_id}`}
            className="loan-dossier-link"
          >
            📂 Application Dossier →
          </Link>
        </div>
      </div>

      <Notice value={error} />

      {/* ── Cockpit Hero Banner ── */}
      <div className="loan-cockpit-hero">
        <div className="loan-hero-left">
          <div className="loan-hero-badge-row">
            <span className="loan-term-chip">📅 {terms.instalments || loan.schedule.length} EMIs</span>
            <span className="loan-term-chip">📈 {terms.rate}% {terms.ratePeriod}</span>
            <span className="loan-term-chip">📐 {terms.method === 'reducing' ? 'Reducing balance' : 'Flat interest'}</span>
            {isOverdueLoan && (
              <span className="loan-term-chip" style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fca5a5' }}>
                ⚠️ Payment Overdue
              </span>
            )}
          </div>
          <h2 className="loan-hero-title">Loan Servicing Cockpit</h2>
          <div className="loan-hero-progress-box">
            <div className="loan-hero-progress-track">
              <div className="loan-hero-progress-bar" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </div>
            <div className="loan-hero-progress-meta">
              <span>{pct.toFixed(1)}% repaid</span>
              <span>{money(paid)} of {money(total)} cleared</span>
            </div>
          </div>
        </div>

        <div className="loan-hero-right">
          <div className="loan-hero-balance-label">Outstanding Balance</div>
          <div className="loan-hero-balance-amount">{money(outstanding)}</div>
          <div className="loan-hero-balance-sub">Total contract payable: {money(total)}</div>
        </div>
      </div>

      {/* ── 4 KPI Stats Row ── */}
      <div className="dash-stats">
        <div className="dash-stat">
          <label>Total Contract Payable</label>
          <div className="stat-value" style={{ fontSize: 26 }}>{money(total)}</div>
          <small>Approved principal + interest snapshot</small>
        </div>
        <div className="dash-stat good">
          <label>Confirmed Paid</label>
          <div className="stat-value" style={{ fontSize: 26, color: '#10b981' }}>{money(paid)}</div>
          <small>{loan.payments?.filter((p: any) => p.status === 'confirmed').length || 0} transaction(s) cleared</small>
        </div>
        <div className="dash-stat warn">
          <label>Current Outstanding</label>
          <div className="stat-value" style={{ fontSize: 26, color: outstanding > 0 ? '#ea580c' : '#10b981' }}>
            {money(outstanding)}
          </div>
          <small>{outstanding === 0 ? '✓ Loan fully paid off' : 'Derived remaining balance'}</small>
        </div>
        <div className="dash-stat">
          <label>Next Due Instalment</label>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {nextUnpaid ? `EMI #${nextUnpaid.number}` : 'Portfolio Cleared'}
          </div>
          <small>
            {nextUnpaid
              ? `Due ${fmt(nextUnpaid.due_date)} · ${money(Number(nextUnpaid.total_due_paise) - Number(nextUnpaid.paid_paise))}`
              : 'All 12 instalments settled'}
          </small>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="loan-cockpit-tabs">
        <button
          type="button"
          className={`loan-cockpit-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          📅 EMI Schedule ({loan.schedule?.length || 0})
        </button>
        <button
          type="button"
          className={`loan-cockpit-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          💳 Transactions & Ledger ({txns.length})
        </button>
        <button
          type="button"
          className={`loan-cockpit-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveTab('terms')}
        >
          🏦 Contract Terms & Bank Dossier
        </button>
        <button
          type="button"
          className={`loan-cockpit-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Servicing Notes ({loan.notes?.length || 0})
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: EMI SCHEDULE MATRIX
          ══════════════════════════════════════════════ */}
      {activeTab === 'schedule' && (
        <div className="page-section section-gap">
          <div className="flex-between" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0 }}>Repayment Schedule Matrix</h2>
              <p style={{ margin: '4px 0 0', color: '#647580', fontSize: 13 }}>
                Complete calendar breakdown. Overdue EMIs are highlighted with immediate cash collection options.
              </p>
            </div>
            {loan.status === 'active' && nextUnpaid && (
              <button
                type="button"
                className="app-btn-cash"
                onClick={() => openCashCollection(Number(nextUnpaid.total_due_paise) - Number(nextUnpaid.paid_paise), `Collection for EMI #${nextUnpaid.number}`)}
              >
                💰 Pay Next Due EMI (#{nextUnpaid.number})
              </button>
            )}
          </div>

          <div className="loan-schedule-card">
            <table className="loan-schedule-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Fees</th>
                  <th>Total Due</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Quick Collection</th>
                </tr>
              </thead>
              <tbody>
                {loan.schedule.map((x: any) => {
                  const duePaise = Number(x.total_due_paise || 0);
                  const paidPaise = Number(x.paid_paise || 0);
                  const remainingPaise = Math.max(0, duePaise - paidPaise);
                  const isPaid = paidPaise >= duePaise;
                  const isOverdue = !isPaid && new Date(x.due_date) < new Date();

                  return (
                    <tr
                      key={x.id}
                      className={isPaid ? 'paid-row' : isOverdue ? 'overdue-row' : ''}
                    >
                      <td><b>{x.number}</b></td>
                      <td>
                        <strong>{fmt(x.due_date)}</strong>
                        {isOverdue && <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}>OVERDUE</div>}
                      </td>
                      <td>{money(x.principal_paise)}</td>
                      <td>{money(x.interest_paise)}</td>
                      <td>{money(x.fees_paise || 0)}</td>
                      <td><strong>{money(duePaise)}</strong></td>
                      <td>
                        <span style={{ color: paidPaise > 0 ? '#10b981' : '#647580', fontWeight: 600 }}>
                          {money(paidPaise)}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: remainingPaise > 0 ? (isOverdue ? '#ef4444' : '#172b35') : '#10b981' }}>
                          {money(remainingPaise)}
                        </strong>
                      </td>
                      <td>
                        <span className={`pill ${isPaid ? 'confirmed' : isOverdue ? 'rejected' : 'pending_verification'}`}>
                          {isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!isPaid && loan.status === 'active' ? (
                          <button
                            type="button"
                            className="loan-pay-emi-btn"
                            onClick={() => openCashCollection(remainingPaise, `EMI #${x.number} (${fmt(x.due_date)}) Cash Collection`)}
                          >
                            💰 Pay EMI
                          </button>
                        ) : isPaid ? (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 12 }}>✓ Cleared</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: TRANSACTIONS & RECORDING LEDGER
          ══════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <>
          <div className="page-section section-gap">
            <div className="flex-between" style={{ marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0 }}>Unified Transaction Ledger ({txns.length})</h2>
                <p style={{ margin: '4px 0 0', color: '#647580', fontSize: 13 }}>
                  All bank disbursements and customer repayment allocations. Includes receipt printing and reversal audits.
                </p>
              </div>
              {loan.status === 'active' && (
                <button
                  type="button"
                  className="app-btn-cash"
                  onClick={() => openCashCollection()}
                >
                  💰 Record Direct Cash Collection
                </button>
              )}
            </div>

            {txns.length > 0 ? (
              <div className="txn-list">
                {txns.map((t: any) => {
                  const isPayment = t.type === 'payment';
                  return (
                    <div className="txn-row" key={t.id}>
                      <span className={`txn-type-badge ${isPayment ? 'payment' : 'disbursement'}`}>
                        {isPayment ? 'Borrower Payment' : 'Loan Disbursement'}
                      </span>
                      <div className="txn-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: 16 }}>
                            {isPayment ? '+' : '-'}{money(t.amount_paise)}
                          </strong>
                          <span className={`pill ${t.status}`}>{t.status.replaceAll('_', ' ')}</span>
                          {t.method && (
                            <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                              {t.method}
                            </span>
                          )}
                        </div>
                        <div className="txn-ref">
                          Ref: {t.ref} · Date: {fmt(t.date)} · Recorded: {fmtTime(t.created_at)}
                        </div>
                      </div>

                      <div className="txn-actions">
                        {isPayment && (
                          <button
                            type="button"
                            className="app-btn-secondary btn-sm"
                            onClick={() => setViewReceipt({
                              ...t,
                              customer_name: loan.name,
                              reference: t.ref,
                              amount_paise: t.amount_paise,
                              payment_date: t.date,
                            })}
                          >
                            🖨️ Receipt
                          </button>
                        )}
                        {t.status === 'confirmed' && (
                          <AuditAction
                            endpoint={isPayment ? `/admin/payments/${t.id}/reverse` : `/admin/disbursements/${t.id}/reverse`}
                            label="Reverse"
                            warning={isPayment ? 'This removes the payment from EMI balances.' : 'Use only when the bank transfer was actually reversed.'}
                            onDone={load}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted">No disbursements or payment records logged yet.</p>
            )}
          </div>

          {/* Standard Transaction Recorder Form */}
          <MoneyForm loan={loan} onDone={load} />
        </>
      )}

      {/* ══════════════════════════════════════════════
          TAB 3: CONTRACT TERMS & BANK DOSSIER
          ══════════════════════════════════════════════ */}
      {activeTab === 'terms' && (
        <div className="page-section section-gap">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Approved Contract Snapshot</h2>
              <p style={{ margin: '4px 0 0', color: '#647580', fontSize: 13 }}>
                Underwritten parameters, pricing method, and destination bank account.
              </p>
            </div>
            <Link
              to={`/admin/applications/${loan.application_id}`}
              className="loan-dossier-link"
            >
              📂 Original Application Dossier →
            </Link>
          </div>

          <div className="loan-terms-grid">
            <div className="loan-term-card">
              <label>Approved Principal</label>
              <strong>{money(terms.principalPaise)}</strong>
              <small>Sanctioned disbursal amount</small>
            </div>
            <div className="loan-term-card">
              <label>Interest Rate</label>
              <strong>{terms.rate}% {terms.ratePeriod}</strong>
              <small>Fixed contract interest rate</small>
            </div>
            <div className="loan-term-card">
              <label>Pricing Method</label>
              <strong style={{ fontSize: 16 }}>
                {terms.method === 'reducing' ? 'Reducing Balance' : 'Flat Interest'}
              </strong>
              <small>Amortization formula</small>
            </div>
            <div className="loan-term-card">
              <label>Contract Tenor</label>
              <strong>{terms.instalments || loan.schedule.length} Instalments</strong>
              <small>Monthly repayment cycle</small>
            </div>
            <div className="loan-term-card">
              <label>Regular Monthly EMI</label>
              <strong>
                {loan.schedule?.length ? money(loan.schedule[0].total_due_paise) : '—'}
              </strong>
              <small>Calculated per schedule</small>
            </div>
            <div className="loan-term-card">
              <label>Total Interest Payable</label>
              <strong>
                {money(Math.max(0, total - Number(terms.principalPaise || 0)))}
              </strong>
              <small>Over full repayment tenure</small>
            </div>
          </div>

          {/* Bank Details */}
          {loan.bank_snapshot && (
            <div style={{ marginTop: 24, background: '#ffffff', border: '1px solid #dfe7e9', borderRadius: 12, padding: 18 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Disbursement Bank Destination</h3>
              <dl className="app-drawer-dl" style={{ margin: 0 }}>
                <dt>Account Holder</dt>
                <dd>{loan.bank_snapshot.accountHolder || loan.name}</dd>
                <dt>Bank Name</dt>
                <dd>{loan.bank_snapshot.bankName || 'Standard Bank'}</dd>
                <dt>Account Number</dt>
                <dd style={{ fontFamily: 'monospace', fontWeight: 700 }}>{loan.bank_snapshot.accountNumber || '—'}</dd>
                <dt>IFSC Code</dt>
                <dd style={{ fontFamily: 'monospace', fontWeight: 700 }}>{loan.bank_snapshot.ifsc || '—'}</dd>
              </dl>
            </div>
          )}

          {/* Loan Controls */}
          {loan.status === 'awaiting_disbursement' && (
            <div className="loan-control-center" style={{ marginTop: 24 }}>
              <div>
                <h2>Loan Controls</h2>
                <p>Cancel only when this accepted loan will not be disbursed. The record remains in audit history.</p>
              </div>
              <AuditAction
                endpoint={`/admin/loans/${loan.id}/status`}
                label="Cancel Loan"
                warning="This prevents future disbursement for this loan."
                onDone={load}
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 4: SERVICING NOTES & AUDIT
          ══════════════════════════════════════════════ */}
      {activeTab === 'notes' && (
        <div className="page-section section-gap">
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Case Servicing Notes & Interactions ({loan.notes?.length || 0})</h2>
            <p style={{ margin: '4px 0 0', color: '#647580', fontSize: 13 }}>
              Internal collection calls, field visits, follow-up logs, and borrower interactions.
            </p>
          </div>

          {loan.notes?.length > 0 && (
            <div className="notes-list" style={{ marginBottom: 20 }}>
              {loan.notes.map((n: any, i: number) => (
                <div className="note-item" key={i}>
                  <div className="note-header">
                    <span className="note-admin">{n.admin_name || 'Admin'}</span>
                    <span className="note-time">{fmtTime(n.created_at)}</span>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 14 }}>{n.note}</div>
                  {n.contact_channel && <div className="note-channel">via {n.contact_channel}</div>}
                </div>
              ))}
            </div>
          )}

          <NotesPanel entityId={loan.id} entityType="loan" initialNotes={loan.notes} />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          QUICK CASH COLLECTION MODAL & RECEIPT
          ══════════════════════════════════════════════ */}
      {cashModalOpen && (
        <div className="app-modal-backdrop" onClick={() => setCashModalOpen(false)}>
          <div className="app-modal-card" onClick={e => e.stopPropagation()}>
            <div className="app-modal-head">
              <div>
                <h2>Collect Cash Payment</h2>
                <p>{loan.name} · Loan ID: {loan.id.slice(0, 8)}…</p>
              </div>
              <button
                type="button"
                className="app-drawer-close"
                onClick={() => setCashModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {cashReceipt ? (
              <div className="app-modal-body">
                <div className="app-receipt-box">
                  <div className="app-receipt-header">
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#087f8c' }}>
                      SAATHI FINANCE • OFFICIAL CASH RECEIPT
                    </span>
                    <h3 style={{ margin: '6px 0 2px' }}>Cash Collection Cleared</h3>
                    <small style={{ color: '#647580' }}>Receipt No: {cashReceipt.receiptNumber}</small>
                  </div>

                  <div className="app-receipt-amount">
                    {money(cashReceipt.amountPaise)}
                  </div>

                  <dl className="app-drawer-dl" style={{ borderTop: '1px solid #e1e9eb', paddingTop: 12 }}>
                    <dt>Customer</dt>
                    <dd>{cashReceipt.customerName}</dd>
                    <dt>Phone</dt>
                    <dd>{loan.mobile}</dd>
                    <dt>Date & Time</dt>
                    <dd>{fmtTime(cashReceipt.timestamp)}</dd>
                    <dt>Remaining Balance</dt>
                    <dd style={{ fontWeight: 800, color: '#ea580c' }}>{money(cashReceipt.remainingBalancePaise)}</dd>
                    <dt>Next Due Date</dt>
                    <dd>{cashReceipt.nextDueDate ? fmt(cashReceipt.nextDueDate) : 'Fully Settled'}</dd>
                    <dt>Collector</dt>
                    <dd>{cashReceipt.collector}</dd>
                  </dl>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button
                      type="button"
                      className="app-btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => window.print()}
                    >
                      🖨️ Print Receipt
                    </button>
                    <button
                      type="button"
                      className="app-btn-action primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setCashModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={submitCashPayment}>
                <div className="app-modal-body">
                  <div style={{ background: '#f8fafb', border: '1px solid #dfe7e9', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#647580', textTransform: 'uppercase', fontWeight: 700 }}>
                      Current Outstanding
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#172b35' }}>
                      {money(outstanding)}
                    </div>
                    {nextUnpaid && (
                      <div style={{ fontSize: 12, color: '#087f8c', marginTop: 4 }}>
                        Next due: EMI #{nextUnpaid.number} on {fmt(nextUnpaid.due_date)} ({money(Number(nextUnpaid.total_due_paise) - Number(nextUnpaid.paid_paise))})
                      </div>
                    )}
                  </div>

                  <div className="form-grid">
                    <label>
                      Cash Amount (₹)
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="e.g. 5000"
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        autoFocus
                      />
                    </label>

                    <label>
                      Collection Date
                      <input
                        type="date"
                        required
                        value={cashDate}
                        onChange={e => setCashDate(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Receipt Reference
                      <input
                        type="text"
                        value={cashRef}
                        onChange={e => setCashRef(e.target.value)}
                        placeholder="CASH-xxxxxx"
                      />
                    </label>

                    <label>
                      Collection / Field Notes
                      <input
                        type="text"
                        value={cashNotes}
                        onChange={e => setCashNotes(e.target.value)}
                        placeholder="e.g. Received cash at borrower residence"
                      />
                    </label>
                  </div>

                  {cashError && <Notice value={cashError} />}
                </div>

                <div className="app-modal-foot">
                  <button
                    type="button"
                    className="app-btn-secondary"
                    onClick={() => setCashModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="app-btn-cash"
                    disabled={cashBusy}
                  >
                    {cashBusy ? 'Recording…' : `✓ Confirm & Record ₹${cashAmount || 0} Cash`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          STANDALONE PAYMENT RECEIPT MODAL
          ══════════════════════════════════════════════ */}
      {viewReceipt && (
        <div className="app-modal-backdrop" onClick={() => setViewReceipt(null)}>
          <div className="app-modal-card" onClick={e => e.stopPropagation()}>
            <div className="app-modal-head">
              <div>
                <h2>Payment Receipt</h2>
                <p>Transaction #{viewReceipt.reference}</p>
              </div>
              <button
                type="button"
                className="app-drawer-close"
                onClick={() => setViewReceipt(null)}
              >
                ✕
              </button>
            </div>
            <div className="app-modal-body">
              <div className="app-receipt-box">
                <div className="app-receipt-header">
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#087f8c' }}>
                    SAATHI FINANCE • OFFICIAL PAYMENT RECEIPT
                  </span>
                  <h3 style={{ margin: '6px 0 2px' }}>Verified Transaction</h3>
                  <small style={{ color: '#647580' }}>Reference: {viewReceipt.reference}</small>
                </div>
                <div className="app-receipt-amount">
                  {money(viewReceipt.amount_paise)}
                </div>
                <dl className="app-drawer-dl" style={{ borderTop: '1px solid #e1e9eb', paddingTop: 12 }}>
                  <dt>Customer</dt>
                  <dd>{viewReceipt.customer_name || loan.name}</dd>
                  <dt>Payment Method</dt>
                  <dd style={{ textTransform: 'uppercase', fontWeight: 700 }}>{viewReceipt.method || 'CASH'}</dd>
                  <dt>Payment Date</dt>
                  <dd>{fmt(viewReceipt.payment_date || viewReceipt.date)}</dd>
                  <dt>Transaction Status</dt>
                  <dd style={{ color: '#168052', fontWeight: 800 }}>CONFIRMED & ALLOCATED</dd>
                </dl>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="app-btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => window.print()}
                  >
                    🖨️ Print Receipt
                  </button>
                  <button
                    type="button"
                    className="app-btn-action primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setViewReceipt(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   6. PAYMENTS & RECONCILIATION — UPGRADED TRANSACTIONS
   ═══════════════════════════════════════════════════ */
export function AdminPayments() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [decisionId, setDecisionId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);

  // Direct Cash Collection Modal
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [loansList, setLoansList] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashDate, setCashDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashRef, setCashRef] = useState('');
  const [cashNotes, setCashNotes] = useState('');
  const [cashError, setCashError] = useState('');
  const [cashBusy, setCashBusy] = useState(false);

  const load = () => {
    setLoading(true);
    request('/admin/payments')
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    request('/admin/loans?status=active').then(setLoansList).catch(() => {});
  }, []);

  const reconcile = async (id: string, status: 'confirmed' | 'rejected') => {
    if (!reason.trim()) {
      setError('Enter an audit reason before confirming or rejecting this payment.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await request(`/admin/payments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      setDecisionId('');
      setReason('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Open Direct Cash modal
  const openCashModal = () => {
    setCashError('');
    setCashDate(new Date().toISOString().slice(0, 10));
    setCashNotes('');
    setCashRef(`CASH-${Date.now().toString().slice(-6)}`);
    if (loansList.length > 0) {
      setSelectedLoanId(loansList[0].id);
      const bal = Number(loansList[0].total_payable_paise || 0) - Number(loansList[0].paid_paise || 0);
      setCashAmount(bal > 0 ? String(Math.round(bal / 100)) : '');
    } else {
      setSelectedLoanId('');
      setCashAmount('');
    }
    setCashModalOpen(true);
  };

  // Submit Cash Payment
  const submitCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) {
      setCashError('Please select a borrower account.');
      return;
    }
    const amt = Number(cashAmount);
    if (!amt || amt <= 0) {
      setCashError('Enter a valid cash payment amount greater than ₹0.');
      return;
    }
    setCashBusy(true);
    setCashError('');
    try {
      const res = await request('/admin/quick-cash-payment', {
        method: 'POST',
        body: JSON.stringify({
          loanId: selectedLoanId,
          amountPaise: Math.round(amt * 100),
          paymentDate: cashDate,
          reference: cashRef,
          notes: cashNotes,
        }),
      });
      setCashModalOpen(false);
      setReceiptPayment(res.payment || {
        customer_name: res.receipt.customerName,
        amount_paise: res.receipt.amountPaise,
        reference: res.receipt.receiptNumber,
        method: 'cash',
        payment_date: res.receipt.paymentDate,
        status: 'confirmed',
      });
      load();
    } catch (err) {
      setCashError((err as Error).message);
    } finally {
      setCashBusy(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    let confirmedPaise = 0;
    let pendingCount = 0;
    let pendingPaise = 0;
    let cashPaise = 0;
    let onlinePaise = 0;

    for (const r of rows) {
      const amt = Number(r.amount_paise || 0);
      if (r.status === 'confirmed') {
        confirmedPaise += amt;
        if (r.method === 'cash') cashPaise += amt;
        else onlinePaise += amt;
      } else if (r.status === 'pending_verification') {
        pendingCount++;
        pendingPaise += amt;
      }
    }

    return {
      totalRecords: rows.length,
      confirmedPaise,
      pendingCount,
      pendingPaise,
      cashPaise,
      onlinePaise,
    };
  }, [rows]);

  // Filtering
  const filtered = useMemo(() => {
    return rows.filter(x => {
      // Tab filter
      let matchFilter = true;
      if (filter === 'pending_verification') matchFilter = x.status === 'pending_verification';
      else if (filter === 'confirmed') matchFilter = x.status === 'confirmed';
      else if (filter === 'rejected') matchFilter = x.status === 'rejected' || x.status === 'reversed';
      else if (filter === 'cash') matchFilter = x.method === 'cash';
      else if (filter === 'online') matchFilter = x.method !== 'cash';

      // Method dropdown filter
      const matchMethod = methodFilter === 'all' || x.method === methodFilter;

      // Search query
      const matchSearch = `${x.customer_name ?? ''} ${x.reference ?? ''} ${x.id ?? ''}`.toLowerCase().includes(search.toLowerCase());

      return matchFilter && matchMethod && matchSearch;
    });
  }, [rows, filter, methodFilter, search]);

  const filteredTotal = filtered.reduce((s, x) => s + Number(x.amount_paise || 0), 0);

  // Export to CSV
  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Payment ID', 'Borrower', 'Amount (INR)', 'Payment Date', 'Method', 'Reference Number', 'Target EMI', 'Status', 'Logged At'];
    const csvRows = filtered.map(x => [
      `"${x.id}"`,
      `"${(x.customer_name || '').replace(/"/g, '""')}"`,
      Number(x.amount_paise || 0) / 100,
      `"${x.payment_date ? new Date(x.payment_date).toISOString().slice(0, 10) : ''}"`,
      `"${x.method}"`,
      `"${(x.reference || '').replace(/"/g, '""')}"`,
      x.target_instalment_number ? `EMI ${x.target_instalment_number}` : 'General',
      `"${x.status}"`,
      `"${x.created_at ? new Date(x.created_at).toISOString() : ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `payments-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="app-queue-container">
      {/* ── Page Header ── */}
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow">RECONCILIATION</span>
          <h1>Payments & Cash Collections</h1>
          <p>Verify incoming repayments, reconcile UPI & bank transfers, and record direct cash deposits.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="app-btn-cash"
            onClick={openCashModal}
            title="Record direct cash deposit"
          >
            💰 + Record Cash
          </button>
          <button type="button" className="app-btn-secondary" onClick={exportCSV} title="Export transactions to CSV">
            📥 Export CSV
          </button>
          <button type="button" className="app-btn-secondary" onClick={load} title="Refresh transaction list">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="app-kpi-grid">
        <div className={`app-kpi-card ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>
          <div className="app-kpi-icon">🧾</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Total Transactions</span>
            <span className="app-kpi-value">{metrics.totalRecords}</span>
            <span className="app-kpi-sub">{money(filteredTotal)} displayed</span>
          </div>
        </div>

        <div className="app-kpi-card good">
          <div className="app-kpi-icon">✅</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Total Confirmed</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(metrics.confirmedPaise)}</span>
            <span className="app-kpi-sub">Verified & credited to EMIs</span>
          </div>
        </div>

        <div
          className={`app-kpi-card warn ${filter === 'pending_verification' ? 'active' : ''}`}
          onClick={() => setFilter(filter === 'pending_verification' ? '' : 'pending_verification')}
        >
          <div className="app-kpi-icon">⏳</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Pending Verification</span>
            <span className="app-kpi-value">{metrics.pendingCount}</span>
            <span className="app-kpi-sub">{money(metrics.pendingPaise)} awaiting approval</span>
          </div>
        </div>

        <div className={`app-kpi-card info ${filter === 'cash' ? 'active' : ''}`} onClick={() => setFilter(filter === 'cash' ? '' : 'cash')}>
          <div className="app-kpi-icon">💵</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Direct Cash Collections</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(metrics.cashPaise)}</span>
            <span className="app-kpi-sub">Cash received in person</span>
          </div>
        </div>

        <div className={`app-kpi-card purple ${filter === 'online' ? 'active' : ''}`} onClick={() => setFilter(filter === 'online' ? '' : 'online')}>
          <div className="app-kpi-icon">📱</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">UPI & Bank Transfers</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(metrics.onlinePaise)}</span>
            <span className="app-kpi-sub">Digital collections</span>
          </div>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="app-tabs-wrapper">
        <button type="button" className={`app-tab-btn ${filter === '' ? 'active' : ''}`} onClick={() => setFilter('')}>
          All Payments <span className="app-tab-count">{metrics.totalRecords}</span>
        </button>
        <button
          type="button"
          className={`app-tab-btn has-action ${filter === 'pending_verification' ? 'active' : ''}`}
          onClick={() => setFilter('pending_verification')}
        >
          ⏳ Pending Review <span className="app-tab-count">{metrics.pendingCount}</span>
        </button>
        <button type="button" className={`app-tab-btn ${filter === 'confirmed' ? 'active' : ''}`} onClick={() => setFilter('confirmed')}>
          Confirmed <span className="app-tab-count">{rows.filter(x => x.status === 'confirmed').length}</span>
        </button>
        <button type="button" className={`app-tab-btn ${filter === 'cash' ? 'active' : ''}`} onClick={() => setFilter('cash')}>
          💵 Cash Collections <span className="app-tab-count">{rows.filter(x => x.method === 'cash').length}</span>
        </button>
        <button type="button" className={`app-tab-btn ${filter === 'online' ? 'active' : ''}`} onClick={() => setFilter('online')}>
          📱 Digital (UPI / Bank) <span className="app-tab-count">{rows.filter(x => x.method !== 'cash').length}</span>
        </button>
        <button type="button" className={`app-tab-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>
          Rejected <span className="app-tab-count">{rows.filter(x => x.status === 'rejected' || x.status === 'reversed').length}</span>
        </button>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="app-toolbar">
        <div className="app-search-wrap">
          <span className="app-search-icon">🔍</span>
          <input
            className="app-search-input"
            placeholder="Search by customer, transaction reference, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="app-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="app-toolbar-controls">
          <select className="app-select" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
            <option value="bank_transfer">Bank Transfer Only</option>
          </select>

          {(filter || search || methodFilter !== 'all') && (
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => { setFilter(''); setSearch(''); setMethodFilter('all'); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <Notice value={error} />

      {/* ── Table ── */}
      {loading ? (
        <Spinner />
      ) : (
        <div className="app-table-card">
          <div className="app-table-head" style={{ gridTemplateColumns: '2.4fr 1.2fr 1.3fr 1.3fr 1.2fr 1.4fr' }}>
            <span>Borrower & Reference</span>
            <span>Method</span>
            <span>Amount</span>
            <span>Date Submitted</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {filtered.map(x => (
            <div className="app-table-row" key={x.id} style={{ gridTemplateColumns: '2.4fr 1.2fr 1.3fr 1.3fr 1.2fr 1.4fr' }}>
              {/* Borrower & Ref */}
              <div className="app-applicant-cell">
                <div className="app-avatar">{getInitials(x.customer_name)}</div>
                <div className="app-applicant-meta">
                  <Link to={`/admin/loans/${x.loan_id}`} className="app-applicant-name">
                    {x.customer_name || 'Anonymous Customer'}
                  </Link>
                  <div className="app-applicant-sub">
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{x.reference}</span>
                    {x.target_instalment_number && (
                      <span className="app-purpose-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        EMI #{x.target_instalment_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Method Tag */}
              <div>
                <span className={`app-method-tag ${x.method}`}>
                  {x.method === 'cash' ? '💵 Cash' : x.method === 'upi' ? '📱 UPI' : '🏦 Bank Transfer'}
                </span>
              </div>

              {/* Amount */}
              <div className="app-amount-cell">
                {money(x.amount_paise)}
              </div>

              {/* Date */}
              <div className="app-date-cell">
                <span className="app-date-main">{fmt(x.payment_date)}</span>
                <span className="app-date-rel">{fmtTime(x.created_at)}</span>
              </div>

              {/* Status */}
              <div>
                <span className={`app-status-badge ${x.status}`}>
                  <span className="app-status-dot" />
                  {x.status.replaceAll('_', ' ')}
                </span>
              </div>

              {/* Actions & Inline Reconciliation */}
              <div className="app-actions-cell">
                {x.status === 'pending_verification' && decisionId !== x.id && (
                  <button
                    type="button"
                    className="app-btn-action primary"
                    onClick={() => { setDecisionId(x.id); setReason('Payment verified with bank statement'); }}
                  >
                    ⚡ Review
                  </button>
                )}

                {x.status === 'confirmed' && (
                  <button
                    type="button"
                    className="app-btn-action"
                    onClick={() => setReceiptPayment(x)}
                    title="View official payment receipt"
                  >
                    📄 Receipt
                  </button>
                )}

                <Link className="app-btn-action" to={`/admin/loans/${x.loan_id}`}>
                  Loan →
                </Link>
              </div>

              {/* Inline Review Drawer row if selected */}
              {decisionId === x.id && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="app-review-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: '#92400e' }}>
                        Confirm or Reject Repayment of {money(x.amount_paise)}
                      </strong>
                      <small style={{ color: '#647580' }}>Audit reason is required for permanent compliance ledger</small>
                    </div>
                    <input
                      className="app-review-input"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Audit reason (e.g. Bank credit verified in statement or Cash received in person)"
                    />
                    <div className="app-review-actions">
                      <button
                        type="button"
                        className="app-btn-secondary"
                        onClick={() => { setDecisionId(''); setReason(''); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="app-btn-action"
                        style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                        disabled={busy}
                        onClick={() => reconcile(x.id, 'rejected')}
                      >
                        ✕ Reject Payment
                      </button>
                      <button
                        type="button"
                        className="app-btn-action primary"
                        disabled={busy}
                        onClick={() => reconcile(x.id, 'confirmed')}
                      >
                        {busy ? 'Saving…' : '✓ Confirm & Allocate to EMI'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {!filtered.length && (
            <div className="app-empty-state">
              <span className="app-empty-icon">🧾</span>
              <h3>No payment records match the current filters</h3>
              <p>Try clearing your search terms or selecting a different status filter.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Receipt View Modal ── */}
      {receiptPayment && (
        <div className="app-modal-backdrop" onClick={() => setReceiptPayment(null)}>
          <div className="app-modal-card" onClick={e => e.stopPropagation()}>
            <div className="app-modal-head">
              <div>
                <h2>Payment Receipt</h2>
                <p>Transaction #{receiptPayment.reference}</p>
              </div>
              <button type="button" className="app-drawer-close" onClick={() => setReceiptPayment(null)}>✕</button>
            </div>
            <div className="app-modal-body">
              <div className="app-receipt-box">
                <div className="app-receipt-header">
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: '#087f8c' }}>
                    SAATHI FINANCE • OFFICIAL PAYMENT RECEIPT
                  </span>
                  <h3 style={{ margin: '6px 0 2px' }}>Verified Transaction</h3>
                  <small style={{ color: '#647580' }}>Reference: {receiptPayment.reference}</small>
                </div>
                <div className="app-receipt-amount">
                  {money(receiptPayment.amount_paise)}
                </div>
                <dl className="app-drawer-dl" style={{ borderTop: '1px solid #e1e9eb', paddingTop: 12 }}>
                  <dt>Customer</dt>
                  <dd>{receiptPayment.customer_name || 'Borrower'}</dd>
                  <dt>Payment Method</dt>
                  <dd style={{ textTransform: 'uppercase', fontWeight: 700 }}>{receiptPayment.method}</dd>
                  <dt>Payment Date</dt>
                  <dd>{fmt(receiptPayment.payment_date)}</dd>
                  <dt>Transaction Status</dt>
                  <dd style={{ color: '#168052', fontWeight: 800 }}>CONFIRMED & ALLOCATED</dd>
                </dl>
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="app-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.print()}>
                    🖨️ Print Receipt
                  </button>
                  <button type="button" className="app-btn-action primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setReceiptPayment(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cash Collection Modal from Payments Page ── */}
      {cashModalOpen && (
        <div className="app-modal-backdrop" onClick={() => setCashModalOpen(false)}>
          <div className="app-modal-card" onClick={e => e.stopPropagation()}>
            <div className="app-modal-head">
              <div>
                <h2>Direct Cash Collection</h2>
                <p>Record in-person cash repayment collected from borrower.</p>
              </div>
              <button type="button" className="app-drawer-close" onClick={() => setCashModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={submitCashPayment}>
              <div className="app-modal-body">
                <label>
                  Select Active Borrower Account
                  <select
                    className="app-select"
                    style={{ width: '100%', marginTop: 4 }}
                    value={selectedLoanId}
                    onChange={e => {
                      setSelectedLoanId(e.target.value);
                      const l = loansList.find(x => x.id === e.target.value);
                      if (l) {
                        const bal = Number(l.total_payable_paise || 0) - Number(l.paid_paise || 0);
                        setCashAmount(bal > 0 ? String(Math.round(bal / 100)) : '');
                      }
                    }}
                  >
                    {loansList.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} — Outstanding: {money(Number(l.total_payable_paise || 0) - Number(l.paid_paise || 0))}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid">
                  <label>
                    Cash Amount (₹)
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 5000"
                      value={cashAmount}
                      onChange={e => setCashAmount(e.target.value)}
                    />
                  </label>
                  <label>
                    Collection Date
                    <input
                      type="date"
                      required
                      value={cashDate}
                      onChange={e => setCashDate(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Receipt Reference
                    <input
                      type="text"
                      value={cashRef}
                      onChange={e => setCashRef(e.target.value)}
                      placeholder="CASH-xxxxxx"
                    />
                  </label>
                  <label>
                    Agent / Collection Notes
                    <input
                      type="text"
                      value={cashNotes}
                      onChange={e => setCashNotes(e.target.value)}
                      placeholder="e.g. Cash collected in field"
                    />
                  </label>
                </div>

                {cashError && <Notice value={cashError} />}
              </div>
              <div className="app-modal-foot">
                <button type="button" className="app-btn-secondary" onClick={() => setCashModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="app-btn-cash" disabled={cashBusy}>
                  {cashBusy ? 'Recording…' : `✓ Confirm & Record ₹${cashAmount || 0} Cash`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   7. REPORTS & EXPORTS — UPGRADED ANALYTICS
   ═══════════════════════════════════════════════════ */
export function AdminReports() {
  const [d, setD] = useState<any>({});
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [ok, setOk] = useState('');

  const loadData = () => {
    request('/admin/report-summary').then(setD).catch(e => setError(e.message));
  };

  useEffect(() => {
    loadData();
  }, []);

  const download = async (name: string, path: string) => {
    setDownloading(true);
    setOk('');
    setError('');
    try {
      const r = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:4000/api') + path,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!r.ok) throw new Error('Export failed — check your permissions.');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      setOk(`${name} downloaded successfully.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const disbursed = Number(d.disbursed_paise || 0);
  const collected = Number(d.collected_paise || 0);
  const recoveryRate = disbursed > 0 ? ((collected / disbursed) * 100).toFixed(1) : '0.0';
  const outstandingPaise = Math.max(0, disbursed - collected);
  const avgLoanSize = d.loans > 0 ? Math.round(disbursed / d.loans) : 0;

  return (
    <div className="app-queue-container">
      {/* ── Page Header ── */}
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow">REPORTING & ANALYTICS</span>
          <h1>Reports & Portfolio Intelligence</h1>
          <p>Operational financial totals, recovery health metrics, and automated CSV data exports.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="app-btn-secondary" onClick={loadData} title="Refresh report metrics">
            🔄 Refresh
          </button>
        </div>
      </div>

      <Notice value={error} />
      <Notice value={ok} type="ok" />

      {/* ── Summary KPI Cards ── */}
      <div className="app-kpi-grid">
        <div className="app-kpi-card info">
          <div className="app-kpi-icon">🏦</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Disbursed Principal</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(disbursed)}</span>
            <span className="app-kpi-sub">Across {d.loans ?? 0} active loans</span>
          </div>
        </div>

        <div className="app-kpi-card good">
          <div className="app-kpi-icon">💰</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Confirmed Collections</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(collected)}</span>
            <span className="app-kpi-sub">{recoveryRate}% of disbursed principal</span>
          </div>
        </div>

        <div className="app-kpi-card warn">
          <div className="app-kpi-icon">📊</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Outstanding Capital</span>
            <span className="app-kpi-value" style={{ fontSize: 20 }}>{money(outstandingPaise)}</span>
            <span className="app-kpi-sub">Portfolio at collection</span>
          </div>
        </div>

        <div className="app-kpi-card purple">
          <div className="app-kpi-icon">📋</div>
          <div className="app-kpi-info">
            <span className="app-kpi-label">Applications</span>
            <span className="app-kpi-value">{d.applications ?? 0}</span>
            <span className="app-kpi-sub">Total credit requests</span>
          </div>
        </div>
      </div>

      {/* ── Analytics & Export Hub ── */}
      <div className="app-analytics-grid">
        {/* Portfolio Health Card */}
        <div className="app-analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Portfolio Health & Repayment Velocity</h3>
            <span className="app-purpose-badge" style={{ background: '#dcfce7', color: '#15803d' }}>
              {recoveryRate}% Recovery Rate
            </span>
          </div>

          <div className="app-progress-wrap" style={{ margin: '8px 0' }}>
            <div className="app-progress-meta">
              <span>Capital Recovered: <strong>{money(collected)}</strong></span>
              <span>Disbursed: <strong>{money(disbursed)}</strong></span>
            </div>
            <div className="app-progress-track" style={{ height: 10 }}>
              <div
                className="app-progress-fill"
                style={{ width: `${Math.min(100, Number(recoveryRate))}%` }}
              />
            </div>
          </div>

          <dl className="app-drawer-dl" style={{ borderTop: '1px solid #edf2f4', paddingTop: 14 }}>
            <dt>Total Loans Active</dt>
            <dd><strong>{d.loans ?? 0} borrower accounts</strong></dd>
            <dt>Average Loan Value</dt>
            <dd><strong>{money(avgLoanSize)}</strong></dd>
            <dt>Pending Verification</dt>
            <dd style={{ color: '#d97706', fontWeight: 700 }}>
              {d.pending_payments ?? 0} repayments awaiting audit
            </dd>
            <dt>Audit Compliance</dt>
            <dd style={{ color: '#168052', fontWeight: 700 }}>100% Immutable Event Ledger</dd>
          </dl>
        </div>

        {/* Export Center Card */}
        <div className="app-analytics-card">
          <div>
            <h3>One-Click Data Exports Hub</h3>
            <p style={{ fontSize: 13, color: '#647580', margin: '4px 0 0' }}>
              Download complete, sanitized CSV reports for compliance, accounting, and loan servicing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="app-export-btn"
              disabled={downloading}
              onClick={() => download('loans.csv', '/admin/reports/loans.csv')}
            >
              <div>
                <strong>📥 Loans Portfolio Ledger</strong>
                <small style={{ display: 'block', color: '#647580' }}>All borrower accounts, principals, and balances</small>
              </div>
              <span>CSV →</span>
            </button>

            <button
              type="button"
              className="app-export-btn"
              disabled={downloading}
              onClick={() => download('applications.csv', '/admin/reports/applications.csv')}
            >
              <div>
                <strong>📥 Credit Application Pipeline</strong>
                <small style={{ display: 'block', color: '#647580' }}>All borrower submissions, statuses, and requested amounts</small>
              </div>
              <span>CSV →</span>
            </button>

            <button
              type="button"
              className="app-export-btn"
              disabled={downloading}
              onClick={() => download('payments.csv', '/admin/reports/payments.csv')}
            >
              <div>
                <strong>📥 Repayment Transactions Ledger</strong>
                <small style={{ display: 'block', color: '#647580' }}>All confirmed and pending cash, UPI, and bank receipts</small>
              </div>
              <span>CSV →</span>
            </button>
          </div>

          <div className="note" style={{ margin: 0, fontSize: 12 }}>
            🔒 Role-based access is strictly enforced. Full banking account details and unencrypted IDs are masked for privacy compliance.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   8. SETTINGS — UPGRADED WITH LIVE EMI SIMULATOR
   ═══════════════════════════════════════════════════ */
export function AdminSettings({ user }: { user: User }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const isSuperAdmin = user.role === 'super_admin';

  useEffect(() => {
    request('/admin/settings').then(setData).catch(e => setError(e.message));
  }, []);

  if (!data) return error ? <Notice value={error} /> : <Spinner />;

  const update = (section: string, key: string, value: any) =>
    setData({ ...data, [section]: { ...data[section], [key]: value } });

  const save = async (section: string) => {
    try {
      await request('/admin/settings/' + section, { method: 'PUT', body: JSON.stringify(data[section]) });
      setSaved(`${section.replaceAll('_', ' ')} settings saved. Changes apply to future loan offers — existing contracts remain intact.`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Live EMI calculation preview for sample ₹50,000 loan
  const sampleP = 50000;
  const sampleRate = Number(data.offer_defaults?.rate || 12);
  const sampleN = Number(data.offer_defaults?.instalments || 12);
  const isMonthly = data.offer_defaults?.ratePeriod === 'monthly';
  const r = (isMonthly ? sampleRate : sampleRate / 12) / 100;
  const isReducing = data.offer_defaults?.method !== 'flat';

  let sampleEmi = 0;
  let sampleTotalInterest = 0;
  if (isReducing && r > 0) {
    const factor = Math.pow(1 + r, sampleN);
    sampleEmi = Math.round((sampleP * r * factor) / (factor - 1));
    sampleTotalInterest = Math.round(sampleEmi * sampleN - sampleP);
  } else {
    sampleTotalInterest = Math.round(sampleP * r * sampleN);
    sampleEmi = Math.round((sampleP + sampleTotalInterest) / sampleN);
  }
  const sampleTotalPayable = sampleP + sampleTotalInterest;

  return (
    <div className="app-queue-container">
      {/* ── Page Header ── */}
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <div>
          <span className="eyebrow">CONFIGURATION</span>
          <h1>System Settings & Lending Rules</h1>
          <p>Global lending defaults, support contacts, and compliance privacy policies.</p>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="note">
          🔒 Only a Super Administrator can modify system configuration. You are currently in view-only mode.
        </div>
      )}

      <Notice value={error} />
      <Notice value={saved} type="ok" />

      <div className="app-settings-grid">
        {/* Support & Grievance Contact */}
        <div className="app-settings-card">
          <h2>Support and Grievance Contacts</h2>
          <p>These contact details are shown to borrowers on their mobile portal and support pages.</p>
          <div className="form-grid">
            {[
              { k: 'phone', label: 'Support Phone Number', placeholder: '+91 98765 43210' },
              { k: 'email', label: 'Support Email Address', placeholder: 'support@example.com' },
              { k: 'grievance', label: 'Grievance Officer Email', placeholder: 'grievance@example.com' },
            ].map(({ k, label, placeholder }) => (
              <label key={k}>
                {label}
                <input
                  disabled={!isSuperAdmin}
                  value={data.support?.[k] || ''}
                  onChange={e => update('support', k, e.target.value)}
                  placeholder={placeholder}
                />
              </label>
            ))}
          </div>
          {isSuperAdmin && (
            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="app-btn-action primary" onClick={() => save('support')}>
                Save Support Contacts
              </button>
            </div>
          )}
        </div>

        {/* Future Offer Defaults with Live Simulator */}
        <div className="app-settings-card">
          <h2>Credit Offer Defaults & Terms Engine</h2>
          <p>These default values pre-fill the offer preparation calculator when approving borrower cases.</p>
          <div className="form-grid">
            <label>
              Default Interest Rate (%)
              <input
                disabled={!isSuperAdmin}
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={data.offer_defaults?.rate || ''}
                onChange={e => update('offer_defaults', 'rate', Number(e.target.value))}
              />
            </label>
            <label>
              Default Number of EMIs (Tenure)
              <input
                disabled={!isSuperAdmin}
                type="number"
                min="1"
                max="120"
                value={data.offer_defaults?.instalments || ''}
                onChange={e => update('offer_defaults', 'instalments', Number(e.target.value))}
              />
            </label>
            <label>
              Rate Calculation Period
              <select
                disabled={!isSuperAdmin}
                className="app-select"
                style={{ width: '100%' }}
                value={data.offer_defaults?.ratePeriod || 'annual'}
                onChange={e => update('offer_defaults', 'ratePeriod', e.target.value)}
              >
                <option value="annual">Annual Rate (% p.a.)</option>
                <option value="monthly">Monthly Rate (% p.m.)</option>
              </select>
            </label>
            <label>
              Interest Method
              <select
                disabled={!isSuperAdmin}
                className="app-select"
                style={{ width: '100%' }}
                value={data.offer_defaults?.method || 'reducing'}
                onChange={e => update('offer_defaults', 'method', e.target.value)}
              >
                <option value="reducing">Reducing Balance (Standard)</option>
                <option value="flat">Flat Interest Rate</option>
              </select>
            </label>
          </div>

          {/* Live Simulator Preview */}
          <div className="app-calc-preview">
            <div>
              <strong style={{ fontSize: 13, color: '#087f8c' }}>
                💡 Live Simulation Preview for ₹50,000 Loan
              </strong>
              <div style={{ fontSize: 12, color: '#647580', marginTop: 2 }}>
                Monthly EMI: <strong>₹{sampleEmi.toLocaleString('en-IN')}</strong> • Total Interest: <strong>₹{sampleTotalInterest.toLocaleString('en-IN')}</strong> • Total Payable: <strong>₹{sampleTotalPayable.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <span className="app-purpose-badge">
              {sampleN} months @ {sampleRate}% {data.offer_defaults?.method || 'reducing'}
            </span>
          </div>

          {isSuperAdmin && (
            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="app-btn-action primary" onClick={() => save('offer_defaults')}>
                Save Offer Defaults
              </button>
            </div>
          )}
        </div>

        {/* Privacy & Compliance */}
        <div className="app-settings-card">
          <h2>Privacy, Aadhaar & KYC Policies</h2>
          <p>
            Configure document collection compliance and data retention lifecycles according to regulatory guidelines.
          </p>

          <div className="setting-row">
            <div className="setting-label">
              <strong>Enable Aadhaar Document Upload</strong>
              <small>Allow borrowers to upload Aadhaar card documents under certified compliance safeguards.</small>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                disabled={!isSuperAdmin}
                checked={!!data.privacy?.collectAadhaar}
                onChange={e => update('privacy', 'collectAadhaar', e.target.checked)}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <div style={{ marginTop: 16 }}>
            <label>
              Data Retention Period (Days)
              <input
                disabled={!isSuperAdmin}
                type="number"
                min="365"
                value={data.privacy?.retentionDays || 2555}
                onChange={e => update('privacy', 'retentionDays', Number(e.target.value))}
              />
            </label>
          </div>

          {isSuperAdmin && (
            <div className="actions" style={{ marginTop: 16 }}>
              <button type="button" className="app-btn-action primary" onClick={() => save('privacy')}>
                Save Privacy Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   9. ADMIN USER MANAGEMENT
   ═══════════════════════════════════════════════════ */
export function AdminUsers({ user }: { user: User }) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => request('/admin/users').then(setRows).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setCreating(true); setError(''); setOk('');
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await request('/admin/users', { method: 'POST', body: JSON.stringify(d) });
      (e.currentTarget as HTMLFormElement).reset();
      setOk('Admin account created. Notify them to change the temporary password immediately.');
      load();
    } catch (x) { setError((x as Error).message); }
    finally { setCreating(false); }
  };

  const toggle = async (x: any) => {
    setError('');
    try {
      await request(`/admin/users/${x.id}`, { method: 'PATCH', body: JSON.stringify({ active: !x.active }) });
      load();
    } catch (e) { setError((e as Error).message); }
  };

  if (user.role !== 'super_admin') {
    return <div className="empty">🔒 Super-admin access is required to manage admin accounts.</div>;
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">ACCESS CONTROL</span>
          <h1>Admin accounts</h1>
          <p>Create new privileged accounts or deactivate existing ones.</p>
        </div>
      </div>
      <Notice value={error} />
      <Notice value={ok} type="ok" />

      <div className="detail-grid">
        {/* Create form */}
        <div className="page-section" style={{ marginBottom: 0 }}>
          <h2>Create admin account</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Admin accounts are created by super admins only — never through public registration.
            Notify the new admin to change their temporary password immediately.
          </p>
          <form onSubmit={create}>
            <div className="form-grid">
              <label>Full name<input name="name" required placeholder="Admin's name" /></label>
              <label>Email address<input name="email" type="email" required placeholder="admin@example.com" /></label>
              <label>Mobile number<input name="mobile" required placeholder="+91 98765 43210" /></label>
              <label>Role
                <select name="role">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Temporary password (minimum 8 characters)
                <input name="password" type="password" minLength={8} required placeholder="Temporary password" />
              </label>
            </div>
            <div className="actions">
              <button className="primary" disabled={creating}>{creating ? 'Creating…' : 'Create admin account'}</button>
            </div>
          </form>
        </div>

        {/* User list */}
        <div>
          <h2 style={{ margin: '0 0 16px' }}>Existing admin accounts ({rows.length})</h2>
          {rows.map(x => (
            <div className="user-card" key={x.id}>
              <div className="user-avatar">{(x.name || x.email)[0].toUpperCase()}</div>
              <div className="user-info">
                <strong>{x.name}</strong>
                <small>{x.email}</small>
                <small>Created {fmt(x.created_at)}</small>
              </div>
              <div className="user-actions">
                <span className={`role-badge ${x.role}`}>{x.role.replace('_', ' ')}</span>
                {!x.active && <span className="inactive-tag">INACTIVE</span>}
                <button
                  className="secondary btn-sm"
                  disabled={x.id === user.id}
                  onClick={() => toggle(x)}
                  title={x.id === user.id ? 'Cannot deactivate your own account' : ''}
                >
                  {x.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {!rows.length && <div className="empty">No admin accounts found.</div>}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   10. AUDIT LOG
   ═══════════════════════════════════════════════════ */
export function AdminAudit({ user }: { user: User }) {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role === 'super_admin') {
      request('/admin/audit').then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [user.role]);

  if (user.role !== 'super_admin') {
    return <div className="empty">🔒 Super-admin access is required to view the audit log.</div>;
  }

  const entityTypes = [...new Set(rows.map(x => x.entity_type))];

  const filtered = rows.filter(x => {
    const matchSearch = `${x.entity_type} ${x.entity_id} ${x.action} ${x.reason || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchEntity = !entityFilter || x.entity_type === entityFilter;
    return matchSearch && matchEntity;
  });

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">IMMUTABLE HISTORY</span>
          <h1>Audit log</h1>
          <p>Every important operational and configuration change, permanently recorded.</p>
        </div>
        <span className="date">{rows.length} EVENTS</span>
      </div>

      <div className="filters">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by entity, action, ID, or reason" />
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All entity types</option>
          {entityTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <Notice value={error} />

      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e1e5dd', borderRadius: 14, overflow: 'hidden' }}>
          <div className="audit-header">
            <span>Entity</span>
            <span>Action</span>
            <span>Reason</span>
            <span>Time</span>
          </div>
          {filtered.map(x => (
            <div className="audit-row" key={x.id}>
              <span>
                <span className="audit-entity-type">{x.entity_type}</span>
                <small style={{ display: 'block', color: 'var(--muted)', fontSize: 10, marginTop: 3, fontFamily: 'monospace' }}>
                  {String(x.entity_id).slice(0, 8)}…
                </small>
              </span>
              <span className="audit-action">{x.action.replaceAll('_', ' ')}</span>
              <span className="audit-reason">{x.reason || '—'}</span>
              <span className="audit-time">{fmtTime(x.created_at)}</span>
            </div>
          ))}
          {!filtered.length && !error && <div className="empty">No audit events match this search.</div>}
        </div>
      )}
    </>
  );
}
