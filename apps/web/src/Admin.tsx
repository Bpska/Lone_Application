import './admin.css';
import { useEffect, useState, type FormEvent } from 'react';
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
   2. APPLICATION LIST
   ═══════════════════════════════════════════════════ */
export function AdminApplications() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    request('/applications' + (status ? `?status=${status}` : ''))
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = rows.filter(r =>
    `${r.name} ${r.mobile} ${r.id} ${r.purpose ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">APPLICATION QUEUE</span>
          <h1>Applications</h1>
          <p>Open a case to review, verify, and take action.</p>
        </div>
      </div>
      <div className="filters">
        <input
          placeholder="Search by name, mobile, or application ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['draft', 'submitted', 'under_review', 'information_requested', 'approved', 'rejected', 'withdrawn'].map(x => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <Notice value={error} />
      {loading ? <Spinner /> : (
        <div className="table">
          <div className="tr th">
            <span>Applicant</span>
            <span>Requested</span>
            <span>Status</span>
            <span>Received</span>
          </div>
          {filtered.map(r => (
            <Link className="tr row-link" to={`/admin/applications/${r.id}`} key={r.id}>
              <span>
                <strong>{r.name}</strong>
                <small>{r.mobile}</small>
              </span>
              <span>{money(r.requested_amount_paise)}</span>
              <span><i className={`pill ${r.status}`}>{r.status.replaceAll('_', ' ')}</i></span>
              <span>{fmt(r.created_at)}</span>
            </Link>
          ))}
          {!filtered.length && <div className="empty">No applications match the current filters.</div>}
        </div>
      )}
    </>
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
   4. LOAN LIST
   ═══════════════════════════════════════════════════ */
export function AdminLoans() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    request('/admin/loans' + (status ? `?status=${status}` : ''))
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  const filtered = rows.filter(r =>
    `${r.name} ${r.mobile} ${r.id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">LOAN BOOK</span>
          <h1>Loans</h1>
          <p>All disbursements, balances, and repayment activity.</p>
        </div>
      </div>
      <div className="filters">
        <input placeholder="Search by name or mobile" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['awaiting_disbursement', 'active', 'completed', 'cancelled'].map(x => <option key={x}>{x}</option>)}
        </select>
      </div>
      <Notice value={error} />
      {loading ? <Spinner /> : (
        <div className="table">
          <div className="tr th">
            <span>Customer</span>
            <span>Total payable</span>
            <span>Paid</span>
            <span>Status</span>
          </div>
          {filtered.map(l => {
            const pct = Number(l.total_payable_paise) ? (Number(l.paid_paise) / Number(l.total_payable_paise) * 100) : 0;
            return (
              <Link className="tr row-link" to={`/admin/loans/${l.id}`} key={l.id}>
                <span><strong>{l.name}</strong><small>{l.mobile}</small></span>
                <span>{money(l.total_payable_paise)}</span>
                <span>
                  {money(l.paid_paise)}
                  <div className="meter" style={{ margin: '6px 0 0', height: 5 }}>
                    <i style={{ width: `${pct}%` }} />
                  </div>
                </span>
                <span><i className={`pill ${l.status}`}>{l.status.replaceAll('_', ' ')}</i></span>
              </Link>
            );
          })}
          {!filtered.length && <div className="empty">No loans match this filter.</div>}
        </div>
      )}
    </>
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
  const [showNotes, setShowNotes] = useState(false);

  const load = () => request(`/admin/loans/${id}`).then(setLoan).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (!loan) return error ? <Notice value={error} /> : <Spinner />;

  const total = Number(loan.total_payable_paise);
  const paid = loan.schedule.reduce((s: number, x: any) => s + Number(x.paid_paise), 0);
  const outstanding = total - paid;
  const pct = total ? (paid / total * 100) : 0;
  const terms = loan.terms_snapshot || {};

  const txns = [
    ...loan.disbursements.map((x: any) => ({ ...x, type: 'disbursement', date: x.transfer_date, ref: x.bank_reference })),
    ...loan.payments.map((x: any) => ({ ...x, type: 'payment', date: x.payment_date, ref: x.reference })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <>
      <div className="pagehead">
        <div>
          <Link className="back" to="/admin/loans">← Loans</Link>
          <h1>{loan.name}</h1>
          <p>{loan.mobile} · {loan.email}</p>
        </div>
        <i className={`pill ${loan.status}`}>{loan.status.replaceAll('_', ' ')}</i>
      </div>
      <Notice value={error} />

      {/* Header bar */}
      <div className="loan-header-bar">
        <div>
          <h2>Loan account</h2>
          <p>{terms.instalments} instalments · {terms.rate}% {terms.ratePeriod} · {terms.method === 'reducing' ? 'Reducing balance' : 'Flat interest'}</p>
          <div className="loan-progress-bar"><i style={{ width: `${pct}%` }} /></div>
          <small style={{ color: '#94b5aa' }}>{pct.toFixed(1)}% repaid</small>
        </div>
        <div className="lh-amount">
          <small>Outstanding balance</small>
          <big>{money(outstanding)}</big>
          <small>of {money(total)} total payable</small>
        </div>
      </div>

      {/* Stats row */}
      <div className="dash-stats">
        <div className="dash-stat">
          <label>Total payable</label>
          <div className="stat-value" style={{ fontSize: 28 }}>{money(total)}</div>
          <small>Accepted terms snapshot</small>
        </div>
        <div className="dash-stat good">
          <label>Confirmed paid</label>
          <div className="stat-value" style={{ fontSize: 28 }}>{money(paid)}</div>
          <small>From allocated payments</small>
        </div>
        <div className="dash-stat warn">
          <label>Outstanding</label>
          <div className="stat-value" style={{ fontSize: 28 }}>{money(outstanding)}</div>
          <small>Derived balance</small>
        </div>
        <div className="dash-stat">
          <label>Total EMIs</label>
          <div className="stat-value" style={{ fontSize: 28 }}>{loan.schedule.length}</div>
          <small>Full schedule</small>
        </div>
      </div>

      {/* Loan terms */}
      <div className="page-section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Accepted loan terms</h2>
          <Link to={`/admin/applications/${loan.application_id}`} style={{ color: '#8b611e', fontSize: 13, textDecoration: 'none' }}>
            View application →
          </Link>
        </div>
        <div className="app-meta-grid">
          <div className="meta-card"><div className="meta-label">Approved principal</div><div className="meta-value">{money(terms.principalPaise)}</div></div>
          <div className="meta-card"><div className="meta-label">Interest rate</div><div className="meta-value">{terms.rate}% {terms.ratePeriod}</div></div>
          <div className="meta-card"><div className="meta-label">Method</div><div className="meta-value" style={{ fontSize: 15 }}>{terms.method === 'reducing' ? 'Reducing balance' : 'Flat interest'}</div></div>
        </div>
      </div>

      {/* Money form */}
      <MoneyForm loan={loan} onDone={load} />

      {loan.status === 'awaiting_disbursement' && <div className="page-section section-gap loan-control-center">
        <div><h2>Loan controls</h2><p>Cancel only when this accepted loan will not be disbursed. The record remains in history.</p></div>
        <AuditAction endpoint={`/admin/loans/${loan.id}/status`} label="Cancel loan" warning="This prevents future disbursement for this loan." onDone={load} />
      </div>}

      {/* EMI Schedule */}
      <div className="page-section section-gap">
        <h2>EMI schedule</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="schedule-table">
            <thead>
              <tr><th>#</th><th>Due date</th><th>Principal</th><th>Interest</th><th>Fees</th><th>Total due</th><th>Paid</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loan.schedule.map((x: any) => {
                const isPaid = Number(x.paid_paise) >= Number(x.total_due_paise);
                const isOverdue = !isPaid && new Date(x.due_date) < new Date();
                return (
                  <tr key={x.id} style={isOverdue ? { background: '#fff8f8' } : isPaid ? { background: '#f4fbf7' } : {}}>
                    <td><b>{x.number}</b></td>
                    <td>{x.due_date}</td>
                    <td>{money(x.principal_paise)}</td>
                    <td>{money(x.interest_paise)}</td>
                    <td>{money(x.fees_paise)}</td>
                    <td><strong>{money(x.total_due_paise)}</strong></td>
                    <td>{money(x.paid_paise)}</td>
                    <td>
                      <span className={`pill ${isPaid ? 'confirmed' : isOverdue ? 'rejected' : 'pending_verification'}`}>
                        {isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disbursements */}
      {loan.disbursements.length > 0 && (
        <div className="page-section section-gap">
          <h2>Disbursement records</h2>
          <div className="txn-list">
            {loan.disbursements.map((d: any) => (
              <div className="txn-row" key={d.id}>
                <span className="txn-type-badge disbursement">Disbursement</span>
                <div className="txn-info">
                  <strong>{money(d.amount_paise)}</strong>
                  <div className="txn-ref">UTR: {d.bank_reference} · Transfer {fmt(d.transfer_date)} · Recorded {fmtTime(d.created_at)}</div>
                </div>
                <div className="txn-actions"><span className={`pill ${d.status}`}>{d.status.replaceAll('_', ' ')}</span>{d.status === 'confirmed' && <AuditAction endpoint={`/admin/disbursements/${d.id}/reverse`} label="Reverse" warning="Use only when the bank transfer was actually reversed." onDone={load} />}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All payments */}
      <div className="page-section section-gap">
        <h2>Payment records ({loan.payments.length})</h2>
        {loan.payments.length ? (
          <div className="txn-list">
            {loan.payments.map((p: any) => (
              <div className="txn-row" key={p.id}>
                <span className="txn-type-badge payment">Payment</span>
                <div className="txn-info">
                  <strong>{money(p.amount_paise)}</strong>
                  <div className="txn-ref">{p.method} · Ref: {p.reference} · Paid {fmt(p.payment_date)} · Recorded {fmtTime(p.created_at)}</div>
                </div>
                <div className="txn-actions"><span className={`pill ${p.status}`}>{p.status.replaceAll('_', ' ')}</span>{p.status === 'confirmed' && <AuditAction endpoint={`/admin/payments/${p.id}/reverse`} label="Reverse" warning="This removes the payment from EMI balances and reopens a completed loan." onDone={load} />}</div>
              </div>
            ))}
          </div>
        ) : <p className="muted">No payment records yet.</p>}
      </div>

      {/* Notes */}
      {loan.notes?.length > 0 && (
        <div className="page-section section-gap">
          <h2>Internal notes ({loan.notes.length})</h2>
          <div className="notes-list">
            {loan.notes.map((n: any, i: number) => (
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
        </div>
      )}
      <NotesPanel entityId={loan.id} entityType="loan" initialNotes={loan.notes} />
    </>
  );
}

/* ═══════════════════════════════════════════════════
   6. PAYMENTS (RECONCILIATION)
   ═══════════════════════════════════════════════════ */
export function AdminPayments() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [decisionId, setDecisionId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    request('/admin/payments').then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const reconcile = async (id: string, status: 'confirmed' | 'rejected') => {
    if (!reason.trim()) { setError('Enter a reason before confirming or rejecting this payment.'); return; }
    setBusy(true); setError('');
    try {
      await request(`/admin/payments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) });
      setDecisionId(''); setReason(''); load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const filtered = rows.filter(x => {
    const matchFilter = !filter || x.status === filter;
    const matchSearch = `${x.customer_name} ${x.reference}`.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const total = filtered.reduce((s, x) => s + Number(x.amount_paise), 0);
  const confirmed = filtered.filter(x => x.status === 'confirmed').reduce((s, x) => s + Number(x.amount_paise), 0);

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">RECONCILIATION</span>
          <h1>Payments</h1>
          <p>All confirmed, pending, rejected, and reversed payment records.</p>
        </div>
      </div>
      <div className="dash-stats" style={{ marginBottom: 24 }}>
        <div className="dash-stat"><label>Total records</label><div className="stat-value" style={{ fontSize: 36 }}>{rows.length}</div></div>
        <div className="dash-stat good"><label>Total confirmed</label><div className="stat-value" style={{ fontSize: 26 }}>{money(confirmed)}</div></div>
        <div className="dash-stat info"><label>Shown total</label><div className="stat-value" style={{ fontSize: 26 }}>{money(total)}</div></div>
        <div className="dash-stat warn"><label>Pending verification</label><div className="stat-value" style={{ fontSize: 36 }}>{rows.filter(x => x.status === 'pending_verification').length}</div></div>
      </div>
      <div className="filters">
        <input placeholder="Search by customer name or reference" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['confirmed', 'pending_verification', 'rejected', 'reversed'].map(x => <option key={x}>{x}</option>)}
        </select>
      </div>
      <Notice value={error} />
      {loading ? <Spinner /> : (
        <div className="table">
          <div className="tr th">
            <span>Customer / Reference</span>
            <span>Amount</span>
            <span>Date</span>
            <span>Status</span>
          </div>
          {filtered.map(x => (
            <div className="tr row-link payment-admin-row" key={x.id}>
              <span><Link to={`/admin/loans/${x.loan_id}`}><strong>{x.customer_name}</strong></Link><small>{x.reference} · {x.method}{x.target_instalment_number ? ` · EMI ${x.target_instalment_number}` : ''}</small></span>
              <span>{money(x.amount_paise)}</span>
              <span>{fmt(x.payment_date)}<small>Submitted {fmtTime(x.created_at)}</small></span>
              <span>
                <i className={`pill ${x.status}`}>{x.status.replaceAll('_', ' ')}</i>
                {x.status === 'pending_verification' && decisionId !== x.id && <button type="button" className="secondary btn-sm" onClick={e => { e.preventDefault(); setDecisionId(x.id); }}>Review</button>}
                {decisionId === x.id && <div className="payment-decision" onClick={e => e.preventDefault()}>
                  <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Audit reason" />
                  <button type="button" disabled={busy} className="primary btn-sm" onClick={() => reconcile(x.id, 'confirmed')}>Confirm</button>
                  <button type="button" disabled={busy} className="danger btn-sm" onClick={() => reconcile(x.id, 'rejected')}>Reject</button>
                  <button type="button" disabled={busy} className="secondary btn-sm" onClick={() => { setDecisionId(''); setReason(''); }}>Cancel</button>
                </div>}
              </span>
            </div>
          ))}
          {!filtered.length && <div className="empty">No payment records match the current filters.</div>}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════
   7. REPORTS & EXPORTS
   ═══════════════════════════════════════════════════ */
export function AdminReports() {
  const [d, setD] = useState<any>({});
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [ok, setOk] = useState('');

  useEffect(() => { request('/admin/report-summary').then(setD).catch(e => setError(e.message)); }, []);

  const download = async (name: string, path: string) => {
    setDownloading(true); setOk(''); setError('');
    try {
      const r = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:4000/api') + path,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!r.ok) throw new Error('Export failed — check your permissions.');
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement('a'); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      setOk(`${name} downloaded successfully.`);
    } catch (e) { setError((e as Error).message); }
    finally { setDownloading(false); }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">REPORTING</span>
          <h1>Reports</h1>
          <p>Operational totals and CSV data exports with masked sensitive fields.</p>
        </div>
      </div>
      <Notice value={error} />
      <Notice value={ok} type="ok" />

      {/* Summary stats */}
      <div className="dash-stats">
        <div className="dash-stat"><label>Total applications</label><div className="stat-value" style={{ fontSize: 36 }}>{d.applications ?? '—'}</div></div>
        <div className="dash-stat"><label>Total loans</label><div className="stat-value" style={{ fontSize: 36 }}>{d.loans ?? '—'}</div></div>
        <div className="dash-stat good"><label>Disbursed principal</label><div className="stat-value" style={{ fontSize: 24 }}>{money(d.disbursed_paise ?? 0)}</div></div>
        <div className="dash-stat info"><label>Confirmed collections</label><div className="stat-value" style={{ fontSize: 24 }}>{money(d.collected_paise ?? 0)}</div></div>
      </div>

      <div className="report-grid">
        <div className="report-card">
          <h3>Portfolio health</h3>
          <div className="report-stat"><label>Total disbursed</label><strong>{money(d.disbursed_paise ?? 0)}</strong></div>
          <div className="report-stat"><label>Total collected</label><strong>{money(d.collected_paise ?? 0)}</strong></div>
          <div className="report-stat">
            <label>Collection rate</label>
            <strong>
              {d.disbursed_paise
                ? `${((d.collected_paise / d.disbursed_paise) * 100).toFixed(1)}%`
                : '—'}
            </strong>
          </div>
          <div className="report-stat"><label>Pending verification</label><strong>{d.pending_payments ?? 0} payments</strong></div>
        </div>

        <div className="report-card">
          <h3>Data exports</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            All exports mask full account and identity numbers. Role-based access is enforced on every export endpoint.
          </p>
          <div className="export-row" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="primary btn-sm" disabled={downloading} onClick={() => download('loans.csv', '/admin/reports/loans.csv')}>
              📥 Download loans CSV
            </button>
            <button className="secondary btn-sm" disabled={downloading} onClick={() => download('applications.csv', '/admin/reports/applications.csv')}>
              📥 Download applications CSV
            </button>
            <button className="secondary btn-sm" disabled={downloading} onClick={() => download('payments.csv', '/admin/reports/payments.csv')}>
              📥 Download payments CSV
            </button>
          </div>
          <div className="note" style={{ marginTop: 16 }}>
            Exports contain loan/application IDs, customer names, status, amounts, and dates. Sensitive full account numbers are never included in exports.
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   8. SETTINGS
   ═══════════════════════════════════════════════════ */
export function AdminSettings({ user }: { user: User }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const isSuperAdmin = user.role === 'super_admin';

  useEffect(() => { request('/admin/settings').then(setData).catch(e => setError(e.message)); }, []);

  if (!data) return error ? <Notice value={error} /> : <Spinner />;

  const update = (section: string, key: string, value: any) =>
    setData({ ...data, [section]: { ...data[section], [key]: value } });

  const save = async (section: string) => {
    try {
      await request('/admin/settings/' + section, { method: 'PUT', body: JSON.stringify(data[section]) });
      setSaved(`${section} settings saved. Changes apply to future activity only — no existing loans are affected.`);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <span className="eyebrow">CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Defaults for future offers and contact information. Changing these never alters accepted loans.</p>
        </div>
      </div>
      {!isSuperAdmin && (
        <div className="note">🔒 Only a super admin can modify configuration. You can view current settings.</div>
      )}
      <Notice value={error} />
      <Notice value={saved} type="ok" />

      <div className="settings-grid">
        {/* Support contact */}
        <div className="settings-section">
          <h2>Support and grievance contacts</h2>
          <p>These details are shown to customers on the support page and are configurable without a code change.</p>
          <div className="form-grid">
            {[
              { k: 'phone', label: 'Support phone number', placeholder: '+91 98765 43210' },
              { k: 'email', label: 'Support email address', placeholder: 'support@example.com' },
              { k: 'grievance', label: 'Grievance email address', placeholder: 'grievance@example.com' },
            ].map(({ k, label, placeholder }) => (
              <label key={k}>{label}
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
            <div className="actions"><button className="primary" onClick={() => save('support')}>Save support settings</button></div>
          )}
        </div>

        {/* Offer defaults */}
        <div className="settings-section">
          <h2>Future offer defaults</h2>
          <p>These values pre-fill the offer editor for new loans. They do not change any existing accepted loan terms.</p>
          <div className="form-grid">
            <label>Default interest rate (%)
              <input
                disabled={!isSuperAdmin}
                type="number" min="0.01" max="100" step="0.01"
                value={data.offer_defaults?.rate || ''}
                onChange={e => update('offer_defaults', 'rate', Number(e.target.value))}
              />
            </label>
            <label>Default number of instalments
              <input
                disabled={!isSuperAdmin}
                type="number" min="1" max="120"
                value={data.offer_defaults?.instalments || ''}
                onChange={e => update('offer_defaults', 'instalments', Number(e.target.value))}
              />
            </label>
            <label>Default rate period
              <select
                disabled={!isSuperAdmin}
                value={data.offer_defaults?.ratePeriod || 'annual'}
                onChange={e => update('offer_defaults', 'ratePeriod', e.target.value)}
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>Default method
              <select
                disabled={!isSuperAdmin}
                value={data.offer_defaults?.method || 'reducing'}
                onChange={e => update('offer_defaults', 'method', e.target.value)}
              >
                <option value="reducing">Reducing balance</option>
                <option value="flat">Flat interest</option>
              </select>
            </label>
          </div>
          {isSuperAdmin && (
            <div className="actions"><button className="primary" onClick={() => save('offer_defaults')}>Save offer defaults</button></div>
          )}
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <h2>Privacy and document policy</h2>
          <p>
            Aadhaar collection is disabled by default. Enable only after completing the required legal and compliance review.
            Retention period controls when inactive customer data may be purged.
          </p>
          <div className="setting-row">
            <div className="setting-label">
              <strong>Allow Aadhaar card upload</strong>
              <small>Requires a completed legal and compliance review before enabling</small>
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
          <hr className="divider" />
          <label>Data retention period (days)
            <input
              disabled={!isSuperAdmin}
              type="number"
              min="365"
              value={data.privacy?.retentionDays || 2555}
              onChange={e => update('privacy', 'retentionDays', Number(e.target.value))}
            />
          </label>
          {isSuperAdmin && (
            <div className="actions"><button className="primary" onClick={() => save('privacy')}>Save privacy settings</button></div>
          )}
          <div className="note" style={{ marginTop: 16 }}>
            ⚖ Aadhaar collection, KYC process, and retention/deletion workflows require a client and legal decision before production use.
            These settings are marked for review.
          </div>
        </div>
      </div>
    </>
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
