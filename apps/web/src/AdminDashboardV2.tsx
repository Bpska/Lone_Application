import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { money, request } from './App';
import './admin-dashboard-v2.css';

const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const N = (v: any) => Number(v || 0);
const D = (v: any) =>
  v ? new Date(String(v).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [d, setD] = useState<any>();
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | 'overdue' | 'due_soon' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'outstanding' | 'name' | 'recent'>('due_date');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

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
  const [selectLoanSearch, setSelectLoanSearch] = useState('');

  const loadData = () => {
    request('/admin/dashboard-v2?year=' + year)
      .then(setD)
      .catch(e => setErr(e.message));
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const openCashCollection = (loan?: any) => {
    setCashError('');
    setCashReceipt(null);
    setCashDate(new Date().toISOString().slice(0, 10));
    setCashNotes('');
    setSelectLoanSearch('');

    if (loan) {
      setSelectedLoan(loan);
      const defaultAmount = loan.next_due_amount_paise
        ? Number(loan.next_due_amount_paise) / 100
        : loan.emi_paise
        ? Number(loan.emi_paise) / 100
        : '';
      setCashAmount(defaultAmount ? String(defaultAmount) : '');
      setCashRef(`CASH-${Date.now().toString().slice(-6)}`);
    } else {
      setSelectedLoan(null);
      setCashAmount('');
      setCashRef(`CASH-${Date.now().toString().slice(-6)}`);
    }
    setCashModalOpen(true);
  };

  const handleSelectLoan = (loan: any) => {
    setSelectedLoan(loan);
    const defaultAmount = loan.next_due_amount_paise
      ? Number(loan.next_due_amount_paise) / 100
      : loan.emi_paise
      ? Number(loan.emi_paise) / 100
      : '';
    setCashAmount(defaultAmount ? String(defaultAmount) : '');
    setCashRef(`CASH-${Date.now().toString().slice(-6)}`);
  };

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
          notes: cashNotes
        })
      });
      setCashReceipt(res.receipt);
      // Immediately refresh the dashboard statistics and account state!
      loadData();
    } catch (e) {
      setCashError((e as Error).message);
    } finally {
      setCashBusy(false);
    }
  };

  // 200+ Accounts Filtering & Sorting
  const filteredAccounts = useMemo(() => {
    if (!d?.accounts) return [];
    let list = [...d.accounts];

    // Status tabs
    if (statusTab === 'overdue') {
      list = list.filter((x: any) => x.is_overdue || (x.status === 'active' && x.next_due_date && new Date(x.next_due_date) < new Date()));
    } else if (statusTab === 'due_soon') {
      const today = new Date();
      const in7Days = new Date();
      in7Days.setDate(today.getDate() + 7);
      list = list.filter((x: any) => {
        if (x.status !== 'active' || !x.next_due_date) return false;
        const dDate = new Date(x.next_due_date);
        return dDate >= today && dDate <= in7Days;
      });
    } else if (statusTab === 'active') {
      list = list.filter((x: any) => x.status === 'active');
    } else if (statusTab === 'completed') {
      list = list.filter((x: any) => x.status === 'completed');
    }

    // Search query
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((x: any) =>
        `${x.name} ${x.mobile} ${x.id} ${x.application_id}`.toLowerCase().includes(term)
      );
    }

    // Sort order
    list.sort((a: any, b: any) => {
      if (sortBy === 'due_date') {
        if (!a.next_due_date) return 1;
        if (!b.next_due_date) return -1;
        return String(a.next_due_date).localeCompare(String(b.next_due_date));
      }
      if (sortBy === 'outstanding') {
        const outA = N(a.total_payable_paise) - N(a.paid_paise);
        const outB = N(b.total_payable_paise) - N(b.paid_paise);
        return outB - outA;
      }
      if (sortBy === 'name') {
        return String(a.name).localeCompare(String(b.name));
      }
      // recent
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

    return list;
  }, [d?.accounts, statusTab, q, sortBy]);

  // Pagination for 200+ accounts
  const totalCount = filteredAccounts.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return filteredAccounts;
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    if (!d?.accounts) return { all: 0, overdue: 0, due_soon: 0, active: 0, completed: 0 };
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    return {
      all: d.accounts.length,
      overdue: d.accounts.filter((x: any) => x.is_overdue || (x.status === 'active' && x.next_due_date && new Date(x.next_due_date) < today)).length,
      due_soon: d.accounts.filter((x: any) => {
        if (x.status !== 'active' || !x.next_due_date) return false;
        const dt = new Date(x.next_due_date);
        return dt >= today && dt <= in7Days;
      }).length,
      active: d.accounts.filter((x: any) => x.status === 'active').length,
      completed: d.accounts.filter((x: any) => x.status === 'completed').length
    };
  }, [d?.accounts]);

  if (!d) return <div className="v2-state">{err || 'Loading live portfolio data...'}</div>;

  const s = d.summary;
  const max = Math.max(1, ...d.monthly.flatMap((x: any) => [N(x.expected_paise), N(x.actual_paise)]));
  const total = N(s.paid_accounts) + N(s.active_accounts) + N(s.overdue_accounts);
  const rate = N(s.total_payable_paise) ? Math.round((N(s.paid_paise) / N(s.total_payable_paise)) * 100) : 0;

  return (
    <main className="admin-v2">
      {/* Top Header */}
      <header className="v2-title">
        <div>
          <small>PORTFOLIO OVERVIEW</small>
          <h1>Operations Dashboard</h1>
          <p>Live lending, 200+ borrower tracking, and instant cash EMI reconciliation.</p>
        </div>
        <div className="v2-head-actions">
          <button type="button" className="v2-btn-cash-main" onClick={() => openCashCollection()}>
            <span>💵</span> <strong>Collect Cash EMI</strong>
          </button>
          <b>{now.toLocaleDateString('en-IN', { dateStyle: 'full' })}</b>
        </div>
      </header>

      {/* KPI Stats */}
      <section className="v2-kpis">
        {[
          ['Borrowers', s.borrowers, 'Total unique borrowers', '👥'],
          ['Loan amount', money(s.loan_amount_paise), 'Disbursed principal', '₹'],
          ['Monthly EMI', money(s.monthly_emi_paise), 'Average scheduled', '📅'],
          ['Paid till date', money(s.paid_paise), 'Confirmed cash received', '✓'],
          ['Collection rate', rate + '%', 'Paid / total payable', '📈']
        ].map((x, i) => (
          <Link to={i === 3 ? '/admin/payments' : '/admin/loans'} key={x[0]}>
            <i>{x[3]}</i>
            <span>
              <small>{x[0]}</small>
              <strong>{x[1]}</strong>
              <em>{x[2]}</em>
            </span>
          </Link>
        ))}
      </section>

      {/* Layout Grid */}
      <div className="v2-layout">
        <div className="v2-main">
          {/* Charts & Loan Status (with fixed Donut and typography) */}
          <Charts d={d} s={s} year={year} setYear={setYear} max={max} total={total} />

          {/* Quick Actions Bar */}
          <nav className="v2-quick">
            <b>Quick actions</b>
            <button type="button" className="v2-quick-cash-btn" onClick={() => openCashCollection()}>
              💵 Direct Cash EMI
            </button>
            <Link to="/admin/applications">+ New application</Link>
            <Link to="/admin/loans?status=awaiting_disbursement">Record transfer</Link>
            <Link to="/admin/payments">Reconcile payments</Link>
            <Link to="/admin/reports">CSV Reports</Link>
          </nav>
        </div>

        {/* Sidebar Reminders & Recent Transactions */}
        <Side d={d} onCashClick={(loanId: string) => {
          const loan = d.accounts?.find((a: any) => a.id === loanId);
          if (loan) openCashCollection(loan);
        }} />
      </div>

      {/* 200+ Accounts Management Section */}
      <section className="v2-card v2-accounts">
        <header className="v2-acc-header">
          <div className="v2-acc-title">
            <h2>Borrower &amp; Loan Accounts ({totalCount})</h2>
            <p>Manage and collect EMI from all 200+ active borrowers in one unified ledger.</p>
          </div>

          {/* Search & Sort Controls */}
          <div className="v2-acc-controls">
            <input
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="🔍 Search borrower name, mobile, Account ID…"
            />
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              aria-label="Sort accounts"
            >
              <option value="due_date">Sort: Next Due Date</option>
              <option value="outstanding">Sort: Highest Outstanding</option>
              <option value="name">Sort: Borrower Name (A-Z)</option>
              <option value="recent">Sort: Recently Added</option>
            </select>
          </div>
        </header>

        {/* Quick Filter Tabs */}
        <div className="v2-filter-tabs">
          <button
            type="button"
            className={`tab-btn ${statusTab === 'all' ? 'active' : ''}`}
            onClick={() => {
              setStatusTab('all');
              setPage(1);
            }}
          >
            All Accounts <b>{tabCounts.all}</b>
          </button>
          <button
            type="button"
            className={`tab-btn tab-warn ${statusTab === 'overdue' ? 'active' : ''}`}
            onClick={() => {
              setStatusTab('overdue');
              setPage(1);
            }}
          >
            🔴 Overdue <b>{tabCounts.overdue}</b>
          </button>
          <button
            type="button"
            className={`tab-btn tab-soon ${statusTab === 'due_soon' ? 'active' : ''}`}
            onClick={() => {
              setStatusTab('due_soon');
              setPage(1);
            }}
          >
            🟡 Due in 7 Days <b>{tabCounts.due_soon}</b>
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'active' ? 'active' : ''}`}
            onClick={() => {
              setStatusTab('active');
              setPage(1);
            }}
          >
            🟢 Active <b>{tabCounts.active}</b>
          </button>
          <button
            type="button"
            className={`tab-btn ${statusTab === 'completed' ? 'active' : ''}`}
            onClick={() => {
              setStatusTab('completed');
              setPage(1);
            }}
          >
            ⚪ Completed <b>{tabCounts.completed}</b>
          </button>
        </div>

        {/* Table */}
        <div className="v2-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Borrower</th>
                <th>Loan Amount</th>
                <th>EMI / Month</th>
                <th>Total Payable</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Next Due</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((x: any, i: number) => {
                const rowIdx = pageSize === -1 ? i + 1 : (page - 1) * pageSize + i + 1;
                const outstanding = N(x.total_payable_paise) - N(x.paid_paise);
                const isOverdue = x.is_overdue || (x.status === 'active' && x.next_due_date && new Date(x.next_due_date) < new Date());

                return (
                  <tr key={x.id} className={isOverdue ? 'row-overdue' : ''}>
                    <td>{rowIdx}</td>
                    <td>
                      <b>{x.name}</b>
                      <small>
                        📞 {x.mobile} · AC: {x.id.slice(0, 8).toUpperCase()}
                      </small>
                    </td>
                    <td>{money(x.loan_amount_paise)}</td>
                    <td>
                      <strong>{money(x.emi_paise)}</strong>
                    </td>
                    <td>{money(x.total_payable_paise)}</td>
                    <td className="green">{money(x.paid_paise)}</td>
                    <td className={outstanding > 0 ? 'text-outstanding' : 'green'}>
                      <b>{money(outstanding)}</b>
                    </td>
                    <td>
                      {x.next_due_date ? (
                        <span className={isOverdue ? 'badge-due overdue' : 'badge-due'}>
                          {isOverdue && '⚠️ '}
                          {D(x.next_due_date)}
                        </span>
                      ) : (
                        <span className="muted-dash">—</span>
                      )}
                    </td>
                    <td>
                      <em className={`status-pill ${x.status}`}>
                        {isOverdue ? 'overdue' : String(x.status).replaceAll('_', ' ')}
                      </em>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="row-actions">
                        {x.status === 'active' && (
                          <button
                            type="button"
                            className="btn-table-cash"
                            title="Collect cash EMI right now"
                            onClick={() => openCashCollection(x)}
                          >
                            💵 Cash
                          </button>
                        )}
                        <Link to={'/admin/loans/' + x.id} className="btn-table-view">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!paginatedRows.length && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--m)' }}>
                    No borrower accounts match the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls for 200+ users */}
        <footer className="v2-pagination">
          <div className="page-size-selector">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All ({totalCount})</option>
            </select>
            <small>
              Showing {pageSize === -1 ? `1–${totalCount}` : `${Math.min(totalCount, (page - 1) * pageSize + 1)}–${Math.min(totalCount, page * pageSize)}`} of {totalCount} accounts
            </small>
          </div>

          {pageSize !== -1 && totalPages > 1 && (
            <div className="page-nav">
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                ← Previous
              </button>
              <span>
                Page <b>{page}</b> of {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next →
              </button>
            </div>
          )}
        </footer>
      </section>

      {/* Bottom KPI summary */}
      <section className="v2-summary">
        {[
          ['Unique borrowers', s.borrowers],
          ['Total loan book', money(s.loan_amount_paise)],
          ['Total cash collected', money(s.paid_paise)],
          ['Current outstanding', money(s.outstanding_paise)],
          ['This month cash', money(s.current_month_collection_paise)]
        ].map(x => (
          <span key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1]}</b>
          </span>
        ))}
      </section>

      {/* =========================================================================
          QUICK CASH COLLECTION MODAL & RECEIPT
          ========================================================================= */}
      {cashModalOpen && (
        <div className="v2-modal-backdrop" onClick={() => !cashBusy && setCashModalOpen(false)}>
          <div className="v2-modal-card" onClick={e => e.stopPropagation()}>
            <header className="v2-modal-head">
              <div>
                <span className="modal-tag">CASH EMI DESK</span>
                <h2>{cashReceipt ? 'Cash Collection Receipt' : 'Record Cash EMI Payment'}</h2>
              </div>
              {!cashBusy && (
                <button type="button" className="v2-modal-close" onClick={() => setCashModalOpen(false)}>
                  ✕
                </button>
              )}
            </header>

            {cashReceipt ? (
              /* Receipt View */
              <div className="v2-receipt-wrap">
                <div className="v2-receipt-box">
                  <div className="receipt-brand">
                    <strong>SAATHI FINANCE</strong>
                    <span>OFFICIAL CASH RECEIPT</span>
                  </div>
                  <div className="receipt-num">
                    Receipt #{cashReceipt.receiptNumber} · {D(cashReceipt.paymentDate)}
                  </div>

                  <div className="receipt-grid">
                    <div>
                      <small>BORROWER</small>
                      <strong>{cashReceipt.customerName}</strong>
                      <span>📞 {cashReceipt.customerMobile}</span>
                    </div>
                    <div>
                      <small>LOAN ACCOUNT</small>
                      <strong>AC: {cashReceipt.loanId.slice(0, 8).toUpperCase()}</strong>
                      <span>Status: {cashReceipt.status}</span>
                    </div>
                  </div>

                  <div className="receipt-amount-block">
                    <small>CASH AMOUNT RECEIVED</small>
                    <h3>{money(cashReceipt.amountPaise)}</h3>
                    <span>Allocated automatically to pending instalments</span>
                  </div>

                  <div className="receipt-balance-grid">
                    <div>
                      <small>Remaining Outstanding</small>
                      <b>{money(cashReceipt.newOutstandingPaise)}</b>
                    </div>
                    <div>
                      <small>Next Due Date</small>
                      <b>{cashReceipt.nextDueDate ? D(cashReceipt.nextDueDate) : 'Fully Paid Off ✓'}</b>
                    </div>
                  </div>

                  <div className="receipt-footer">
                    <span>✓ Transaction recorded and confirmed automatically in system ledger.</span>
                  </div>
                </div>

                <div className="receipt-actions">
                  <button type="button" className="btn-print" onClick={() => window.print()}>
                    🖨️ Print Receipt
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setCashReceipt(null);
                      setCashModalOpen(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Payment Form */
              <form onSubmit={submitCashPayment} className="v2-cash-form">
                {/* Borrower Selector if not already picked */}
                {!selectedLoan ? (
                  <div className="form-group">
                    <label>Select borrower (200+ accounts)</label>
                    <input
                      type="text"
                      placeholder="Type name, mobile, or loan ID…"
                      value={selectLoanSearch}
                      onChange={e => setSelectLoanSearch(e.target.value)}
                    />
                    <div className="borrower-picker-list">
                      {d.accounts
                        ?.filter((x: any) =>
                          x.status === 'active' &&
                          `${x.name} ${x.mobile} ${x.id}`.toLowerCase().includes(selectLoanSearch.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((x: any) => (
                          <div key={x.id} className="picker-item" onClick={() => handleSelectLoan(x)}>
                            <div>
                              <strong>{x.name}</strong>
                              <small>📞 {x.mobile} · AC: {x.id.slice(0, 8).toUpperCase()}</small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <b>{money(x.next_due_amount_paise || x.emi_paise)}</b>
                              <small>Due: {D(x.next_due_date)}</small>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="selected-borrower-banner">
                    <div>
                      <span className="sub-tag">SELECTED BORROWER</span>
                      <h3>{selectedLoan.name}</h3>
                      <p>📞 {selectedLoan.mobile} · AC: {selectedLoan.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button type="button" className="btn-change" onClick={() => setSelectedLoan(null)}>
                      Change
                    </button>
                  </div>
                )}

                {selectedLoan && (
                  <>
                    <div className="borrower-quick-info">
                      <div>
                        <small>Monthly EMI</small>
                        <strong>{money(selectedLoan.emi_paise)}</strong>
                      </div>
                      <div>
                        <small>Next Due Amount</small>
                        <strong className="text-warn">{money(selectedLoan.next_due_amount_paise || selectedLoan.emi_paise)}</strong>
                      </div>
                      <div>
                        <small>Total Outstanding</small>
                        <strong>{money(N(selectedLoan.total_payable_paise) - N(selectedLoan.paid_paise))}</strong>
                      </div>
                    </div>

                    <div className="form-grid">
                      <label>
                        <span>Cash Amount Received (₹) *</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={cashAmount}
                          onChange={e => setCashAmount(e.target.value)}
                          placeholder="e.g. 2000"
                        />
                      </label>

                      <label>
                        <span>Collection Date *</span>
                        <input
                          type="date"
                          required
                          value={cashDate}
                          onChange={e => setCashDate(e.target.value)}
                        />
                      </label>
                    </div>

                    {/* Fast Fill Presets */}
                    <div className="quick-amount-presets">
                      <span>Quick Fill:</span>
                      {selectedLoan.next_due_amount_paise > 0 && (
                        <button
                          type="button"
                          onClick={() => setCashAmount(String(Number(selectedLoan.next_due_amount_paise) / 100))}
                        >
                          Exact Due ({money(selectedLoan.next_due_amount_paise)})
                        </button>
                      )}
                      {selectedLoan.emi_paise > 0 && (
                        <button
                          type="button"
                          onClick={() => setCashAmount(String(Number(selectedLoan.emi_paise) / 100))}
                        >
                          1 EMI ({money(selectedLoan.emi_paise)})
                        </button>
                      )}
                      {selectedLoan.emi_paise > 0 && (
                        <button
                          type="button"
                          onClick={() => setCashAmount(String((Number(selectedLoan.emi_paise) * 2) / 100))}
                        >
                          2 EMIs ({money(Number(selectedLoan.emi_paise) * 2)})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCashAmount(String((N(selectedLoan.total_payable_paise) - N(selectedLoan.paid_paise)) / 100))
                        }
                      >
                        Full Balance
                      </button>
                    </div>

                    <div className="form-grid">
                      <label>
                        <span>Receipt / Reference Number</span>
                        <input
                          type="text"
                          value={cashRef}
                          onChange={e => setCashRef(e.target.value)}
                          placeholder="CASH-xxxxxx"
                        />
                      </label>

                      <label>
                        <span>Agent / Notes</span>
                        <input
                          type="text"
                          value={cashNotes}
                          onChange={e => setCashNotes(e.target.value)}
                          placeholder="e.g. Received in cash by collection agent"
                        />
                      </label>
                    </div>

                    {cashError && <div className="alert-box-warn">{cashError}</div>}

                    <div className="modal-actions">
                      <button type="button" className="secondary" onClick={() => setCashModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary btn-submit-cash" disabled={cashBusy}>
                        {cashBusy ? 'Recording…' : `✓ Confirm & Record ₹${cashAmount || 0} Cash`}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* Charts & Donut with dynamic conic gradient and zero-overlap layout */
function Charts({ d, s, year, setYear, max, total }: any) {
  const paid = N(s.paid_accounts);
  const active = N(s.active_accounts);
  const overdue = N(s.overdue_accounts);
  const sum = Math.max(1, paid + active + overdue);

  const pDeg = (paid / sum) * 360;
  const aDeg = pDeg + (active / sum) * 360;
  const conicStyle = {
    background: `conic-gradient(#168052 0deg ${pDeg}deg, #087f8c ${pDeg}deg ${aDeg}deg, #dc3545 ${aDeg}deg 360deg)`
  };

  return (
    <div className="v2-charts">
      {/* Monthly Collection Bars */}
      <section className="v2-card">
        <header>
          <span>
            <h2>Monthly Collection Overview</h2>
            <p>Expected scheduled EMI vs confirmed cash received</p>
          </span>
          <select value={year} onChange={e => setYear(+e.target.value)}>
            <option>{year - 1}</option>
            <option>{year}</option>
            <option>{year + 1}</option>
          </select>
        </header>
        <div className="v2-bars-wrap">
          <div className="v2-bars">
            {d.monthly.map((x: any, i: number) => (
              <div title={`Expected ${money(x.expected_paise)} / Actual ${money(x.actual_paise)}`} key={i}>
                <span>
                  <i style={{ height: (N(x.expected_paise) / max) * 100 + '%' }} />
                  <b style={{ height: (N(x.actual_paise) / max) * 100 + '%' }} />
                </span>
                <small>{M[i]}</small>
              </div>
            ))}
          </div>
        </div>
        <footer>Actual collection: {d.actualCollectionDefinition}</footer>
      </section>

      {/* Loan Status Donut - Completely fixed layout & zero text overwrite */}
      <section className="v2-card status-card">
        <h2>Loan Status</h2>
        <p className="card-subhead">Portfolio health breakdown</p>

        <div className="v2-donut-container">
          <div className="v2-donut" style={conicStyle}>
            <div className="v2-donut-inner">
              <strong className="v2-donut-num">{total}</strong>
              <span className="v2-donut-lbl">Eligible Loans</span>
            </div>
          </div>
        </div>

        <div className="v2-donut-legend">
          <div className="legend-chip paid">
            <span className="dot" />
            <small>Paid</small>
            <b>{paid}</b>
          </div>
          <div className="legend-chip active">
            <span className="dot" />
            <small>Active</small>
            <b>{active}</b>
          </div>
          <div className="legend-chip overdue">
            <span className="dot" />
            <small>Overdue</small>
            <b>{overdue}</b>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Sidebar with Reminders & Cash Trigger */
function Side({ d, onCashClick }: any) {
  return (
    <div className="v2-side">
      <section>
        <header>
          <h2>Due Reminders (Immediate)</h2>
          <Link to="/admin/loans">View all</Link>
        </header>
        {d.reminders.slice(0, 7).map((x: any) => (
          <div className="v2-item" key={x.loan_id + x.due_date}>
            <i>{x.name[0]}</i>
            <span>
              <b>{x.name}</b>
              <small>Due: {D(x.due_date)} · {money(x.amount_due_paise)}</small>
            </span>
            <button
              type="button"
              className="side-cash-btn"
              title="Collect cash"
              onClick={() => onCashClick(x.loan_id)}
            >
              💵 Collect
            </button>
          </div>
        ))}
      </section>

      <section>
        <header>
          <h2>Recent Cash Receipts</h2>
          <Link to="/admin/payments">View all</Link>
        </header>
        {d.recent.map((x: any) => (
          <Link className="v2-item" to={'/admin/loans/' + x.loan_id} key={x.id}>
            <i className="ok-badge">✓</i>
            <span>
              <b>{x.name}</b>
              <small>{D(x.payment_date)} · {x.method.replaceAll('_', ' ')} · {x.reference}</small>
            </span>
            <strong>{money(x.amount_paise)}</strong>
          </Link>
        ))}
      </section>
    </div>
  );
}
