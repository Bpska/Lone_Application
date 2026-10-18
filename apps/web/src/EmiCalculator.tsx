import{useEffect,useMemo,useState}from'react';import{useNavigate}from'react-router-dom';import{calculateSchedule}from'@saathi/shared';import{request}from'./App';import'./emi-calculator.css';
const inr=(p:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(p/100);
const iso=()=>{const d=new Date();d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10)};
export default function EmiCalculator(){
  const nav=useNavigate(),[principal,setPrincipal]=useState(500000),[tenure,setTenure]=useState(12),[config,setConfig]=useState<any>(),[error,setError]=useState('');
  useEffect(()=>{request('/calculator-config').then(setConfig).catch(e=>setError(e.message))},[]);
  const result=useMemo(()=>{
    if(!config||principal<=0||tenure<1)return null;
    try{
      return calculateSchedule({principalPaise:Math.round(principal*100),rate:config.rate,ratePeriod:config.ratePeriod,method:config.method,instalments:tenure,frequency:'monthly',firstDueDate:iso(),processingFeePaise:0,otherChargesPaise:0,rounding:'nearest',currency:'INR'});
    }catch{return null}
  },[principal,tenure,config]);
  const apply=()=>{
    const old=JSON.parse(localStorage.getItem('loan-draft')||'{}');
    localStorage.setItem('loan-draft',JSON.stringify({...old,amount:String(principal)}));
    localStorage.setItem('loan-calculator-plan',JSON.stringify({principal,tenure,frequency:'monthly',rate:config.rate,method:config.method}));
    nav('/apply');
  };
  if(error)return <div className="calc-state">Calculator unavailable: {error}</div>;
  if(!config)return <div className="calc-state">Loading calculator settings…</div>;
  const first=result?.schedule[0],total=result?.totalPayablePaise||0;
  return <main className="calc-page">
    <header className="calc-header">
      <div>
        <span>PLAN BEFORE YOU APPLY</span>
        <h1>EMI Calculator</h1>
        <p>Estimate repayments using the lender’s currently configured calculation method.</p>
      </div>
      <button type="button" className="calc-print-btn" onClick={()=>window.print()}>Download PDF report</button>
    </header>
    <div style={{
      background: '#f3f8f5',
      border: '1px solid #c7e3d6',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem'
    }}>
      <div>
        <strong style={{ display: 'block', color: '#123d35', fontSize: '0.96rem' }}>
          💡 EMI का 30% नियम: समझदारी से लिया गया फ़ैसला, सुरक्षित भविष्य की चाबी
        </strong>
        <span style={{ fontSize: '0.85rem', color: '#4a645d' }}>
          आपकी सभी EMI मासिक आमदनी के 30% से अधिक नहीं होनी चाहिए। जानिए रामू, श्याम व सीमा के 5 नियम।
        </span>
      </div>
      <button
        type="button"
        onClick={()=>nav('/guide')}
        style={{
          background: '#123d35',
          color: '#ffffff',
          border: 'none',
          padding: '0.55rem 1.1rem',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}
      >
        वित्तीय समझ एवं 5 नियम पढ़ें →
      </button>
    </div>
    <section className="calc-form">
      <label>
        <span>Principal amount (₹)</span>
        <input type="number" min="1000" step="1000" inputMode="numeric" value={principal} onChange={e=>setPrincipal(Number(e.target.value))}/>
      </label>
      <label>
        <span>Loan tenure (months)</span>
        <input type="number" min={config.minTenure} max={config.maxTenure} inputMode="numeric" value={tenure} onChange={e=>setTenure(Number(e.target.value))}/>
      </label>
      <label>
        <span>Payment frequency</span>
        <select value="monthly" disabled><option>Monthly</option></select>
      </label>
      <button type="button" className="calc-submit-btn" onClick={()=>document.querySelector('.calc-results')?.scrollIntoView({behavior:'smooth',block:'start'})}>Calculate EMI</button>
    </section>
    {result&&<>
      <section className="calc-results">
        {[
          ['Principal',inr(principal*100)],
          ['Tenure',`${tenure} months`],
          ['Payment frequency','Monthly'],
          ['Monthly instalment',inr(first?.totalDuePaise||0)],
          ['Total payments',result.schedule.length],
          ['Total interest',inr(result.totalInterestPaise)],
          ['Total payout',inr(total)]
        ].map(x=>(
          <article key={String(x[0])}>
            <small>{x[0]}</small>
            <strong>{x[1]}</strong>
          </article>
        ))}
      </section>
      <section className="calc-card">
        <div className="calc-card-title">
          <div>
            <span>LOAN SUMMARY</span>
            <h2>Your estimated plan</h2>
          </div>
          <button type="button" className="calc-apply-btn" onClick={apply}>Apply with this amount →</button>
        </div>
        <div className="calc-summary">
          <span><small>Principal</small><b>{inr(principal*100)}</b></span>
          <span><small>Tenure</small><b>{tenure} months</b></span>
          <span><small>Frequency</small><b>Monthly</b></span>
          <span><small>Instalment</small><b>{inr(first?.totalDuePaise||0)}</b></span>
        </div>
      </section>
      <section className="calc-card schedule">
        <div className="calc-card-title">
          <div>
            <span>MONTH-WISE REPAYMENT</span>
            <h2>Monthly payment schedule</h2>
          </div>
          <small className="calc-rate-badge">Rate: {config.rate}% {config.ratePeriod} · {config.method} balance</small>
        </div>
        <div className="calc-table-wrap">
          <div className="calc-table">
            <table>
              <thead>
                <tr>
                  <th># Month</th>
                  <th>Due date</th>
                  <th>Instalment</th>
                  <th>Principal paid</th>
                  <th>Interest paid</th>
                  <th>Remaining balance</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((x:any,i:number)=>{
                  const remaining=result.schedule.slice(i+1).reduce((s:number,r:any)=>s+r.principalPaise,0);
                  return <tr key={x.number}>
                    <td className="col-sticky"><strong>{x.number}</strong></td>
                    <td>{new Date(x.dueDate+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                    <td className="col-val">{inr(x.totalDuePaise)}</td>
                    <td>{inr(x.principalPaise)}</td>
                    <td>{inr(x.interestPaise)}</td>
                    <td>{inr(remaining)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <p className="calc-note">This is an estimate, not a loan offer. Final approved amount, charges, rate, dates and EMI schedule are shown for acceptance after review.</p>
    </>}
  </main>;
}

