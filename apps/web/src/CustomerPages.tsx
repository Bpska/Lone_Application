import {useEffect,useState,type FormEvent} from 'react';
import {Link,useParams} from 'react-router-dom';
import {money,request,type User} from './App';

const Message=({value}:{value:string})=>value?<div className="alert" role="status">{value}</div>:null;

export function CustomerLoans(){const[rows,setRows]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{request('/loans').then(setRows).catch(e=>setError(e.message))},[]);return <><div className="pagehead"><div><span className="eyebrow">REPAYMENT</span><h1>My loans</h1><p>Confirmed balances, transfer details, and upcoming dates.</p></div></div><Message value={error}/><div className="cards">{rows.map(l=><Link className="loan-card customer-loan-link" to={`/loans/${l.id}`} key={l.id}><span className="pill">{l.status.replaceAll('_',' ')}</span><h2>{money(Number(l.total_due_paise)-Number(l.paid_paise))}</h2><p>Outstanding · {money(l.paid_paise)} confirmed paid</p><div className="meter"><i style={{width:`${Number(l.total_due_paise)?Math.min(100,Number(l.paid_paise)/Number(l.total_due_paise)*100):0}%`}}/></div><small>Next due: {l.next_due_date||'All paid'} · View full details →</small></Link>)}{!rows.length&&!error&&<div className="empty">You do not have a disbursed loan yet.</div>}</div></>}

export function CustomerLoanDetail(){const{id}=useParams(),[loan,setLoan]=useState<any>(null),[error,setError]=useState('');useEffect(()=>{request(`/loans/${id}`).then(setLoan).catch(e=>setError(e.message))},[id]);if(!loan)return <div className="empty">{error||'Loading loan…'}</div>;const paid=loan.schedule.reduce((sum:number,row:any)=>sum+Number(row.paid_paise),0),total=Number(loan.total_payable_paise),transfer=loan.disbursements[0];return <><div className="pagehead"><div><Link className="back" to="/loans">← My loans</Link><h1>Loan details</h1><p>Only confirmed transfers and payments are reflected here.</p></div><i className="pill">{loan.status.replaceAll('_',' ')}</i></div><div className="stats"><article><span>Total payable</span><strong>{money(total)}</strong><small>Accepted terms</small></article><article><span>Confirmed paid</span><strong>{money(paid)}</strong><small>Allocated to EMIs</small></article><article><span>Outstanding</span><strong>{money(total-paid)}</strong><small>Derived balance</small></article><article><span>Next due</span><strong className="date-value">{loan.schedule.find((x:any)=>Number(x.paid_paise)<Number(x.total_due_paise))?.due_date||'All paid'}</strong><small>Monthly schedule</small></article></div>{transfer&&<section className="panel"><h2>Disbursement</h2><dl><dt>Amount transferred</dt><dd>{money(transfer.amount_paise)}</dd><dt>Transfer date</dt><dd>{transfer.transfer_date}</dd><dt>Bank reference / UTR</dt><dd>{transfer.bank_reference}</dd></dl></section>}<section className="panel admin-section"><h2>EMI schedule</h2><div className="schedule"><div className="schedule-row head"><span># / Due</span><span>Principal</span><span>Interest + fees</span><span>Paid / due</span></div>{loan.schedule.map((x:any)=><div className="schedule-row" key={x.id}><span><b>{x.number}</b><small>{x.due_date}</small></span><span>{money(x.principal_paise)}</span><span>{money(Number(x.interest_paise)+Number(x.fees_paise))}</span><span>{money(x.paid_paise)} / {money(x.total_due_paise)}</span></div>)}</div></section><section className="panel admin-section"><h2>Payment history</h2>{loan.payments.map((x:any)=><div className="line" key={x.id}><span><strong>{x.payment_date}</strong><small>{x.method.replaceAll('_',' ')} · {x.reference}</small></span><span>{money(x.amount_paise)} <i className="pill">{x.status.replaceAll('_',' ')}</i></span></div>)}{!loan.payments.length&&<p className="muted">No payments have been recorded.</p>}</section></>}

export function CustomerPayments(){const[rows,setRows]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{request('/payments').then(setRows).catch(e=>setError(e.message))},[]);return <><div className="pagehead"><div><span className="eyebrow">PAYMENT HISTORY</span><h1>Payments</h1><p>Only confirmed payments reduce your outstanding balance.</p></div></div><Message value={error}/><div className="table"><div className="tr th"><span>Date / reference</span><span>Amount</span><span>Method</span><span>Status</span></div>{rows.map(x=><Link to={`/loans/${x.loan_id}`} className="tr row-link" key={x.id}><span><strong>{x.payment_date}</strong><small>{x.reference}</small></span><span>{money(x.amount_paise)}</span><span>{x.method.replaceAll('_',' ')}</span><span><i className="pill">{x.status.replaceAll('_',' ')}</i></span></Link>)}{!rows.length&&!error&&<div className="empty">No payments have been recorded yet.</div>}</div></>}

export function CustomerProfile({user,onUpdate}:{user:User;onUpdate:(user:User)=>void}){const[form,setForm]=useState<any>(user),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');try{const updated=await request('/me',{method:'PATCH',body:JSON.stringify(form)});setForm(updated);onUpdate(updated);setMessage('Profile saved successfully.')}catch(x){setMessage((x as Error).message)}finally{setBusy(false)}};return <><div className="pagehead"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Profile</h1><p>Keep your contact information current.</p></div></div><section className="panel"><form onSubmit={submit}><div className="form-grid"><label>Full name<input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email address<input disabled value={form.email||''}/></label><label>Mobile number<input required value={form.mobile||''} onChange={e=>setForm({...form,mobile:e.target.value})}/></label><label>WhatsApp number<input value={form.whatsapp||''} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></label><label className="wide">Residential address<input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label></div><Message value={message}/><div className="actions"><button className="primary" disabled={busy}>{busy?'Saving…':'Save profile'}</button></div></form></section><section className="panel admin-section"><h2>Privacy</h2><p className="muted">Your application, identity, bank, and witness information is private. Bank account numbers are masked in ordinary views. Contact support for access or deletion requests under the lender’s retention policy.</p></section></>}

export function Support(){
  const[data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{request('/settings/public').then(setData).catch(e=>setError(e.message))},[]);
  return <>
    <div className="pagehead">
      <div>
        <span className="eyebrow">HELP & GRIEVANCE</span>
        <h1>We’re here to help</h1>
        <p>Ask about an application, offer, payment, or privacy request.</p>
      </div>
    </div>
    <Message value={error}/>
    <div className="detail-grid support-grid">
      <section className="panel support-panel">
        <div className="support-card-head">
          <span className="support-tag">DIRECT ASSISTANCE</span>
          <h2>Customer support</h2>
          <p className="muted">Our team can explain the process in Hindi or English. Support cannot promise approval or mark an unconfirmed payment as paid.</p>
        </div>
        <div className="support-actions">
          {data?.phone&&(
            <a href={`tel:${data.phone}`} className="support-action-btn phone">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <div>
                <small>Call our support line</small>
                <strong>{data.phone}</strong>
              </div>
            </a>
          )}
          {data?.email&&(
            <a href={`mailto:${data.email}`} className="support-action-btn email">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <div>
                <small>Email customer care</small>
                <strong>{data.email}</strong>
              </div>
            </a>
          )}
        </div>
        <dl className="support-details">
          <dt>Hours</dt>
          <dd>Monday – Saturday, 9:30 AM to 6:30 PM IST</dd>
          <dt>Languages</dt>
          <dd>Hindi, English</dd>
        </dl>
      </section>

      <section className="panel support-panel">
        <div className="support-card-head">
          <span className="support-tag">OFFICIAL GRIEVANCE</span>
          <h2>Grievance contact</h2>
          <p className="muted">For unresolved complaints, include your application or loan ID, but never send your password or full bank account number.</p>
        </div>
        <div className="support-actions">
          {data?.grievance&&(
            <a href={`mailto:${data.grievance}`} className="support-action-btn email">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <div>
                <small>Grievance Redressal Officer</small>
                <strong>{data.grievance}</strong>
              </div>
            </a>
          )}
        </div>
        <dl className="support-details">
          <dt>Turnaround</dt>
          <dd>Acknowledgement within 24h · Resolution within 7 working days</dd>
        </dl>
      </section>

      <section className="panel support-panel" style={{ gridColumn: '1 / -1' }}>
        <div className="support-card-head">
          <span className="support-tag" style={{ background: '#e8b55e', color: '#173830' }}>वित्तीय समझ एवं मार्गदर्शन</span>
          <h2>अपनी वित्तीय समझ को जानें, बेहतर भविष्य बनाएं</h2>
          <p className="muted">
            यह छोटा सा टेस्ट आपकी पैसों की समझ, ईमानदारी और कर्ज लेने की क्षमता को मापने में मदद करेगा। आपके सही जवाब आपको कम ब्याज दर और बेहतर वित्तीय सलाह पाने में मदद करेंगे।
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <a
            href="https://sites.google.com/view/financial-knowledg/financial-health-test?authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px' }}
          >
            <span>वित्तीय और मानसिक स्वास्थ्य मूल्यांकन परीक्षा दें →</span>
          </a>
          <Link
            to="/guide"
            className="secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px' }}
          >
            <span>संपूर्ण वित्तीय गाइड व EMI के 5 नियम पढ़ें</span>
          </Link>
        </div>
      </section>
    </div>
  </>;
}
