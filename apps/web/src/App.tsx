import'./landing.css';import{useEffect,useState,type FormEvent,type ReactNode}from'react';import{Navigate,NavLink,Route,Routes,useNavigate}from'react-router-dom';import{AdminApplicationDetail,AdminApplications,AdminAudit,AdminLoanDetail,AdminLoans,AdminPayments,AdminReports,AdminSettings,AdminUsers}from'./Admin';import AdminDashboard from'./AdminDashboardV2';import CustomerApplication from'./CustomerApplication';import ProfilePage from'./ProfilePage';import EmiCalculator from'./EmiCalculator';import{CustomerLoanDetail,CustomerLoans,CustomerPayments}from'./FinancePages';import{Support}from'./CustomerPages';import FinancialGuide from'./FinancialGuide';
const API=import.meta.env.VITE_API_URL||'http://localhost:4000/api';export type User={id:string;email:string;role:'customer'|'admin'|'super_admin';name?:string;mobile?:string;whatsapp?:string;address?:string};
export async function request(path:string,options:RequestInit={}){const token=localStorage.getItem('token');let r:Response;try{r=await fetch(API+path,{...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{}) as any,...options.headers}})}catch{throw new Error('Cannot connect to the server. Keep npm run dev running and try again.')}const body=await r.json().catch(()=>({}));if(!r.ok){const issue=body.error?.details?.issues?.[0];const field=issue?.path?issue.path.split('.').pop()?.replace(/([A-Z])/g,' $1').toLowerCase():'';throw new Error(issue?(field+': '+issue.message):(body.error?.message||'Request failed'))}return body.data}
export const money=(p:number|string=0)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(p)/100);
function Brand(){return <div className="brand"><span className="brandmark">S</span><span>Saathi<small>FINANCE</small></span></div>}
function Landing({onLogin,onRegister,onGuide}:{onLogin:()=>void;onRegister:()=>void;onGuide:()=>void}){return <main className="landing">
  <header className="landing-nav"><Brand/><nav><a href="#how">How it works</a><a href="#features">Features</a><button type="button" className="landing-text-button" onClick={onGuide} style={{fontWeight:600,color:'#16483d'}}>वित्तीय समझ (Guide)</button><a href="#support">Support</a></nav><div><button type="button" className="landing-text-button" onClick={onLogin}>Sign in</button><button type="button" className="landing-primary" onClick={onRegister}>Apply for a loan</button></div></header>
  <section className="landing-hero"><img src="/saathi-hero.png" alt="Small business owner reviewing her repayment plan"/><div className="landing-shade"/><div className="landing-hero-copy"><span>RESPONSIBLE LENDING, CLEAR REPAYMENTS</span><h1>Saathi Finance</h1><p>Understand your offer, every EMI amount, every due date, and every confirmed payment from one secure mobile account.</p><div><button type="button" className="landing-primary" onClick={onRegister}>Start your application</button><button type="button" className="landing-secondary" onClick={onLogin}>Track my loan</button><button type="button" className="landing-text-button" onClick={onGuide} style={{color:'#fff',marginLeft:'0.5rem',textDecoration:'underline'}}>वित्तीय समझ एवं 5 नियम →</button></div><small>Loan approval is subject to review. The application does not guarantee approval.</small></div></section>
  <section className="landing-guide-promo" style={{maxWidth:'1100px',margin:'2rem auto',padding:'1.5rem',background:'#f4f8f6',border:'1px solid #cfe0d8',borderRadius:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem'}}>
    <div>
      <small style={{background:'#e8b55e',color:'#123d35',padding:'0.2rem 0.5rem',borderRadius:'4px',fontWeight:'bold'}}>जिम्मेदार ऋण (RESPONSIBLE BORROWING)</small>
      <h3 style={{margin:'0.4rem 0 0.2rem',color:'#123d35',fontSize:'1.25rem'}}>EMI लोन: समझदारी से लिया गया फ़ैसला, सुरक्षित भविष्य की चाबी</h3>
      <p style={{margin:0,color:'#3f5851',fontSize:'0.92rem'}}>30% आमदनी का नियम, रामू व श्याम के 5 सुनहरे नियम, और 5-7 मिनट का आत्म-मूल्यांकन टेस्ट।</p>
    </div>
    <button type="button" className="landing-primary" onClick={onGuide} style={{padding:'0.65rem 1.25rem',fontSize:'0.9rem'}}>वित्तीय गाइड पढ़ें →</button>
  </section>
  <section className="landing-process" id="how"><div className="landing-section-head"><span>A SIMPLE, VISIBLE PROCESS</span><h2>Know what happens next.</h2></div><div className="landing-steps"><article><b>01</b><h3>Apply securely</h3><p>Complete your profile, loan request, witnesses, and bank details from your phone.</p></article><article><b>02</b><h3>Review clear terms</h3><p>See principal, interest, fees, total payable, and every EMI date before accepting.</p></article><article><b>03</b><h3>Pay and track</h3><p>Submit each payment reference and follow pending, confirmed, or rejected status.</p></article></div></section>
  <section className="landing-features" id="features"><div><span>BUILT FOR CLARITY</span><h2>Your loan record stays understandable.</h2><p>Balances change only after verified payments. Accepted terms stay preserved, and every important action carries a date, time, and status.</p></div><div className="landing-feature-list"><article><strong>Full EMI schedule</strong><span>Amount, due date, paid amount, and status for every instalment.</span></article><article><strong>Payment verification</strong><span>References remain pending until an administrator verifies receipt.</span></article><article><strong>Mobile account</strong><span>Apply, review offers, submit payments, and get support from any phone.</span></article><article><strong>Human support</strong><span>Clear contact and grievance information when you need assistance.</span></article></div></section>
  <footer className="landing-footer" id="support"><Brand/><p>Transparent loan management for controlled lending operations.</p><button type="button" onClick={onLogin}>Customer and admin sign in</button></footer>
</main>}
function Login({onLogin,initialMode='login',onBack}:{onLogin:(u:User)=>void;initialMode?:'login'|'register';onBack?:()=>void}){const[mode,setMode]=useState<'login'|'register'>(initialMode),[error,setError]=useState(''),[busy,setBusy]=useState(false);const submit=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();setBusy(true);setError('');const fd=new FormData(e.currentTarget),payload=Object.fromEntries(fd);try{const d=await request('/auth/'+mode,{method:'POST',body:JSON.stringify(payload)});localStorage.setItem('token',d.token);onLogin(d.user)}catch(x){setError((x as Error).message)}finally{setBusy(false)}};return <main className="auth"><section className="welcome"><Brand/><div><span className="eyebrow">BORROW WITH CLARITY</span><h1>Small steps.<br/><em>Stronger tomorrows.</em></h1><p>Understand every rupee, every date, and every decision—before you accept a loan.</p><div className="trust"><span>✓ Transparent terms</span><span>✓ Human support</span><span>✓ Your data stays private</span></div></div><footer>Responsible lending for real life.</footer></section><section className="authcard"><div className="mobile-brand"><Brand/></div><div className="card">{onBack&&<button type="button" className="login-back" onClick={onBack}>← Back to home</button>}<span className="eyebrow">WELCOME</span><h2>{mode==='login'?'Good to see you':'Create your account'}</h2><p>{mode==='login'?'Sign in to continue to your account.':'Start a secure loan application in minutes.'}</p><form onSubmit={submit}>{mode==='register'&&<><label>Full name<input name="name" required placeholder="Your name"/></label><label>Mobile number<input name="mobile" required placeholder="+91 98765 43210"/></label></>}<label>Email address<input name="email" type="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters"/></label>{error&&<div className="alert">{error}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in securely':'Create account'}</button></form><button className="text" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'New to Saathi? Create an account':'Already registered? Sign in'}</button><p className="secure">🔒 Protected with secure encryption</p></div></section></main>}

const navIcons:Record<string,ReactNode>={
  Home:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Apply:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>,
  Loans:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h5"/></svg>,
  Payments:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Calculator:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>,
  Guide:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>,
  Profile:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Overview:<span className="admin-icon">⌂</span>,
  Applications:<span className="admin-icon">▤</span>,
  Reports:<span className="admin-icon">▥</span>,
  Settings:<span className="admin-icon">⚙</span>,
  Admins:<span className="admin-icon">♙</span>,
  Audit:<span className="admin-icon">≡</span>
};

function Shell({user,onLogout,children}:{user:User;onLogout:()=>void;children:ReactNode}){
  const admin=user.role!=='customer';
  const [mobileMenu,setMobileMenu]=useState(false);
  const links=admin
    ? [['/admin','Overview','Overview'],['/admin/applications','Applications','Applications'],['/admin/loans','Loans','Loans'],['/admin/payments','Payments','Payments'],['/admin/reports','Reports','Reports'],['/admin/settings','Settings','Settings'],...(user.role==='super_admin'?[['/admin/users','Admins','Admins'],['/admin/audit','Audit','Audit']]:[])]
    : [['/','Home','Home'],['/apply','Apply','Apply'],['/loans','Loans','Loans'],['/payments','Payments','Payments'],['/calculator','Calculator','Calculator'],['/guide','Guide','Guide'],['/profile','Profile','Profile']];
  const navLink=([to,label,iconKey]:string[]) => <NavLink key={to} to={to} end={to==='/'||to==='/admin'} className={({isActive})=>isActive?'active':''} onClick={()=>setMobileMenu(false)}><span className="nav-icon">{navIcons[iconKey]||iconKey}</span><small className="nav-label">{label}</small></NavLink>;
  return <div className={admin?'shell admin-shell':'shell'}>
    <aside><Brand/><nav>{links.map(navLink)}</nav><button className="logout" onClick={onLogout}>Sign out</button></aside>
    <header>
      <Brand/>
      {admin?(
        <button className="mobile-menu-button" type="button" aria-label="Open admin menu" aria-expanded={mobileMenu} onClick={()=>setMobileMenu(true)}>☰</button>
      ):(
        <div className="header-actions">
          <NavLink to="/guide" className="header-support-btn" aria-label="Financial Guide" title="वित्तीय समझ एवं 5 नियम" style={{background:'#f5faf7',border:'1px solid #c8ded5',color:'#16483d'}}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
            <span>वित्तीय समझ</span>
          </NavLink>
          <NavLink to="/support" className="header-support-btn" aria-label="Support" title="Customer Support">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Help</span>
          </NavLink>
          <NavLink to="/profile" className="avatar" title="View profile" aria-label="My profile">{(user.name||user.email)[0].toUpperCase()}</NavLink>
        </div>
      )}
    </header>
    {admin&&mobileMenu&&<div className="mobile-menu-backdrop" onClick={()=>setMobileMenu(false)}>
      <section className="mobile-menu" role="dialog" aria-label="Admin navigation" onClick={e=>e.stopPropagation()}>
        <div className="mobile-menu-head"><div><small>ADMIN PANEL</small><strong>{user.name||user.email}</strong></div><button type="button" aria-label="Close admin menu" onClick={()=>setMobileMenu(false)}>×</button></div>
        <nav>{links.map(navLink)}</nav>
        <button className="mobile-signout" onClick={onLogout}>Sign out</button>
      </section>
    </div>}
    <div className="content">{children}</div>
    <nav className="bottom">{(admin?links.slice(0,4):links).map(navLink)}{admin&&<button type="button" className={mobileMenu?'active':''} onClick={()=>setMobileMenu(true)}><span className="nav-icon">☰</span><small className="nav-label">More</small></button>}</nav>
  </div>
}

function CustomerHome({user}:{user:User}){
  const[apps,setApps]=useState<any[]>([]),[loans,setLoans]=useState<any[]>([]);
  useEffect(()=>{request('/applications').then(setApps);request('/loans').then(setLoans)},[]);
  const active=loans.find((l:any)=>l.status==='active')||loans[0];
  return <>
    <div className="pagehead">
      <div>
        <span className="eyebrow">YOUR FINANCIAL SPACE</span>
        <h1>Hello, {(user.name||'friend').split(' ')[0]}.</h1>
        <p>Here’s where everything stands today.</p>
      </div>
      <NavLink className="primary small new-app-btn" to="/apply">＋ Apply</NavLink>
    </div>
    {active?(
      <NavLink to={`/loans/${active.id}`} className="hero-card hero-card-link" aria-label="View loan repayment schedule">
        <div>
          <span className="status">● {active.status.replace('_',' ')}</span>
          <p>Outstanding balance</p>
          <h2>{money(Number(active.total_due_paise)-Number(active.paid_paise))}</h2>
        </div>
        <div className="due">
          <small>NEXT PAYMENT</small>
          <strong>{active.next_due_date||'All paid'}</strong>
          <span>View repayment schedule →</span>
        </div>
      </NavLink>
    ):(
      <section className="empty-feature">
        <div>
          <span className="eyebrow">A FRESH START</span>
          <h2>A loan you can understand.</h2>
          <p>Clear terms, predictable instalments, and no hidden surprises. Check your options without pressure.</p>
          <NavLink className="primary" to="/apply">Start an application</NavLink>
        </div>
        <div className="sun">₹</div>
      </section>
    )}
    <h3 className="section-title">Your applications</h3>
    <div className="cards">
      {apps.length?apps.map(a=>(
        <NavLink className="list-card" to={`/applications/${a.id}`} key={a.id}>
          <div>
            <span className={`pill ${a.status}`}>{a.status.replace('_',' ')}</span>
            <h3>{money(a.requested_amount_paise)}</h3>
            <p>{a.purpose||'Personal loan'}</p>
          </div>
          <span className="card-arrow">›</span>
        </NavLink>
      )):(
        <div className="empty">No applications yet. Your saved drafts and submitted requests will appear here.</div>
      )}
    </div>
    <section className="financial-guide-promo" style={{
      background: 'linear-gradient(135deg, #123d35 0%, #195247 100%)',
      color: '#ffffff',
      borderRadius: '16px',
      padding: '1.4rem',
      margin: '1.5rem 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div>
        <span style={{
          display: 'inline-block',
          background: 'rgba(232, 181, 94, 0.25)',
          color: '#fce2a6',
          border: '1px solid rgba(232, 181, 94, 0.4)',
          padding: '0.2rem 0.55rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: '700',
          marginBottom: '0.5rem'
        }}>
          वित्तीय समझ एवं मार्गदर्शन
        </span>
        <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', color: '#ffffff' }}>
          EMI लोन: समझदारी से लिया गया फ़ैसला, सुरक्षित भविष्य की चाबी
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#d3e4de', maxWidth: '620px', lineHeight: 1.5 }}>
          गाँव और मध्यमवर्गीय परिवारों के लिए 5 सुनहरे नियम (रामू, श्याम व सीमा के उदाहरण), 30% आमदनी का फ़ॉर्मूला, और आत्म-मूल्यांकन टेस्ट।
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <NavLink
          to="/guide"
          className="primary small"
          style={{
            background: '#e8b55e',
            color: '#123d35',
            fontWeight: '700',
            padding: '0.65rem 1.2rem',
            borderRadius: '8px',
            textDecoration: 'none'
          }}
        >
          गाइड पढ़ें →
        </NavLink>
        <a
          href="https://sites.google.com/view/financial-knowledg/financial-health-test?authuser=0"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.3)',
            fontWeight: '600',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.85rem'
          }}
        >
          मूल्यांकन टेस्ट दें ↗
        </a>
      </div>
    </section>
    <section className="help">
      <span>?</span>
      <div>
        <strong>Need a hand?</strong>
        <p>Our support team can explain the process in Hindi or English.</p>
      </div>
      <NavLink to="/support" className="help-action-btn">Contact support</NavLink>
    </section>
  </>;
}

const initial={name:'',dateOfBirth:'',guardianName:'',mobile:'',whatsapp:'',address:'',monthlyIncome:'',purpose:'',amount:'',kin:'',relationship:'',bank:'',holder:'',ifsc:'',account:'',w1name:'',w1guardian:'',w1mobile:'',w1address:'',w2name:'',w2guardian:'',w2mobile:'',w2address:''};
function Apply(){
  const[step,setStep]=useState(0),[f,setF]=useState<any>(()=>JSON.parse(localStorage.getItem('loan-draft')||JSON.stringify(initial))),[error,setError]=useState(''),nav=useNavigate();
  const set=(k:string,v:string)=>setF({...f,[k]:v});
  const save=()=>{localStorage.setItem('loan-draft',JSON.stringify(f));setError('Draft saved on this device.')};
  const submit=async()=>{
    try{
      const a=await request('/applications',{method:'POST',body:JSON.stringify({
        customer:{name:f.name,dateOfBirth:f.dateOfBirth,guardianName:f.guardianName,mobile:f.mobile,whatsapp:f.whatsapp,address:f.address,identifierType:'none'},
        witnesses:[{name:f.w1name,guardianName:f.w1guardian,mobile:f.w1mobile,address:f.w1address},{name:f.w2name,guardianName:f.w2guardian,mobile:f.w2mobile,address:f.w2address}],
        loan:{monthlyIncomePaise:Math.round(Number(f.monthlyIncome)*100),purpose:f.purpose,requestedAmountPaise:Math.round(Number(f.amount)*100),nextOfKinName:f.kin,nextOfKinRelationship:f.relationship},
        bank:{bankName:f.bank,accountHolderName:f.holder,ifsc:f.ifsc.replace(/\s/g,'').toUpperCase(),accountNumber:f.account},
        consent:true
      })});
      await request(`/applications/${a.id}/submit`,{method:'POST'});
      localStorage.removeItem('loan-draft');
      nav('/');
    }catch(e){setError((e as Error).message)}
  };
  const requiredByStep=[
    ['name','dateOfBirth','guardianName','mobile','whatsapp','address'],
    ['monthlyIncome','amount','purpose','kin','relationship'],
    ['w1name','w1guardian','w1mobile','w1address','w2name','w2guardian','w2mobile','w2address'],
    ['bank','holder','ifsc','account']
  ];
  const next=()=>{
    const missing=(requiredByStep[step]||[]).filter(k=>!String(f[k]||'').trim());
    if(missing.length){setError('Please complete every field on this step before continuing.');return}
    if(step===0&&String(f.address).trim().length<10){setError('Residential address must be at least 10 characters.');return}
    if(step===1&&(Number(f.monthlyIncome)<=0||Number(f.amount)<=0)){setError('Monthly income and requested amount must be greater than zero.');return}
    if(step===2&&(String(f.w1address).trim().length<10||String(f.w2address).trim().length<10)){setError('Both witness addresses must be at least 10 characters.');return}
    if(step===3&&!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(String(f.ifsc).replace(/\s/g,''))){setError('Enter a valid 11-character IFSC, for example SBIN0001234.');return}
    setError('');
    setStep(step+1);
  };
  const fields=(items:[string,string,string?,string?][])=>items.map(([k,l,t='text',mode])=>(
    <label key={k} className="apply-field">
      <span>{l}</span>
      <input type={t} inputMode={mode as any} value={f[k]||''} onChange={e=>set(k,e.target.value)} required/>
    </label>
  ));
  return <>
    <div className="pagehead">
      <div>
        <span className="eyebrow">LOAN APPLICATION</span>
        <h1>Tell us what you need.</h1>
        <p>Step {step+1} of 5 · {['About you','Loan details','Witnesses','Bank details','Review'][step]}</p>
      </div>
    </div>
    <div className="progress" role="progressbar" aria-valuenow={(step+1)*20} aria-valuemin={0} aria-valuemax={100}>
      <i style={{width:`${(step+1)*20}%`}}/>
    </div>
    <section className="form-card">
      <div className="step-label">{['About you','Loan details','Witnesses','Bank details','Review'][step]}</div>
      {step===0&&<div className="form-grid">{fields([['name','Full name'],['dateOfBirth','Date of birth','date'],['guardianName',"Father’s or husband’s name"],['mobile','Mobile number','tel','tel'],['whatsapp','WhatsApp number','tel','tel'],['address','Residential address']])}</div>}
      {step===1&&<div className="form-grid">{fields([['monthlyIncome','Monthly income (₹)','number','numeric'],['amount','Requested amount (₹)','number','numeric'],['purpose','Loan purpose'],['kin','Next-of-kin name'],['relationship','Relationship']])}</div>}
      {step===2&&(
        <div className="witness-step">
          <div className="note">Witnesses confirm familiarity with you. They are not automatically guarantors and are not made liable for repayments.</div>
          <div className="witness-block">
            <h3>Witness 1</h3>
            <div className="form-grid">{fields([['w1name','Full name'],['w1guardian',"Father’s name"],['w1mobile','Mobile / WhatsApp','tel','tel'],['w1address','Residential address']])}</div>
          </div>
          <div className="witness-block">
            <h3>Witness 2</h3>
            <div className="form-grid">{fields([['w2name','Full name'],['w2guardian',"Father’s name"],['w2mobile','Mobile / WhatsApp','tel','tel'],['w2address','Residential address']])}</div>
          </div>
        </div>
      )}
      {step===3&&(
        <>
          <div className="note">Your bank details are encrypted and masked in ordinary views. Transfers are completed manually after approval.</div>
          <div className="form-grid">{fields([['bank','Bank name'],['holder','Account holder name'],['ifsc','IFSC code (e.g. SBIN0001234)'],['account','Account number','text','numeric']])}</div>
        </>
      )}
      {step===4&&(
        <div className="review">
          <h2>Please review carefully</h2>
          <div className="review-cards">
            <div className="review-box">
              <small>BORROWER & LOAN</small>
              <p><strong>{f.name}</strong> is requesting <strong>{money(Number(f.amount)*100)}</strong></p>
              <p>Purpose: <em>{f.purpose}</em></p>
            </div>
            <div className="review-box">
              <small>BANK DETAILS</small>
              <p>{f.bank} · Account ending in <strong>{String(f.account).slice(-4)}</strong></p>
              <p>IFSC: {f.ifsc}</p>
            </div>
            <div className="review-box">
              <small>WITNESSES</small>
              <p>1. {f.w1name} ({f.w1mobile})</p>
              <p>2. {f.w2name} ({f.w2mobile})</p>
            </div>
          </div>
          <div className="note">Submitting confirms the information is accurate. This is an application, not a loan agreement or guarantee of approval.</div>
        </div>
      )}
      {error&&<div className="alert">{error}</div>}
      <div className="actions apply-actions">
        {step<4?<button type="button" className="primary apply-continue-btn" onClick={next}>Continue →</button>:<button type="button" className="primary apply-continue-btn" onClick={submit}>Submit application</button>}
        <div className="apply-sub-actions">
          {step>0&&<button type="button" className="secondary" onClick={()=>setStep(step-1)}>← Back</button>}
          <button type="button" className="secondary" onClick={save}>Save draft</button>
        </div>
      </div>
    </section>
  </>;
}
function Loans(){const[loans,setLoans]=useState<any[]>([]);useEffect(()=>{request('/loans').then(setLoans)},[]);return <><div className="pagehead"><div><span className="eyebrow">REPAYMENT</span><h1>My loans</h1><p>Confirmed balances and upcoming dates.</p></div></div><div className="cards">{loans.map(l=><article className="loan-card" key={l.id}><span className="pill">{l.status}</span><h2>{money(Number(l.total_due_paise)-Number(l.paid_paise))}</h2><p>Outstanding Â· {money(l.paid_paise)} paid</p><div className="meter"><i style={{width:`${Number(l.total_due_paise)?Number(l.paid_paise)/Number(l.total_due_paise)*100:0}%`}}/></div><small>Next due: {l.next_due_date||'â€”'}</small></article>)}{!loans.length&&<div className="empty">You do not have a disbursed loan yet.</div>}</div></>}
function AdminHome(){const[d,setD]=useState<any>({});useEffect(()=>{request('/admin/dashboard').then(setD)},[]);return <><div className="pagehead"><div><span className="eyebrow">PILOT OPERATIONS</span><h1>Good morning.</h1><p>Hereâ€™s what needs attention today.</p></div><span className="date">LIVE OVERVIEW</span></div><div className="stats">{[['New applications',d.new_applications||0,'Review queue'],['Pending reviews',d.pending_reviews||0,'In progress'],['Awaiting transfer',d.awaiting_disbursement||0,'Record manually'],['Overdue EMIs',d.overdue_emis||0,'Needs attention']].map(([l,v,s],i)=><article key={l as string} className={i===3?'warn':''}><span>{l}</span><strong>{v}</strong><small>{s}</small></article>)}</div><section className="panel"><div className="panel-title"><div><span className="eyebrow">NEXT ACTIONS</span><h2>Keep the queue moving</h2></div><NavLink to="/admin/applications">View all applications â†’</NavLink></div><div className="action-grid"><div><b>01</b><h3>Review submitted applications</h3><p>Verify customer, witnesses, documents, and bank details.</p></div><div><b>02</b><h3>Confirm accepted offers</h3><p>Record transfers only after funds actually leave the bank.</p></div><div><b>03</b><h3>Reconcile repayments</h3><p>EMIs update only after payments are confirmed.</p></div></div></section></>}
function Applications(){const[rows,setRows]=useState<any[]>([]),[status,setStatus]=useState('');useEffect(()=>{request('/applications'+(status?`?status=${status}`:'')).then(setRows)},[status]);return <><div className="pagehead"><div><span className="eyebrow">APPLICATION QUEUE</span><h1>Applications</h1><p>Review and move each case deliberately.</p></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>submitted</option><option>under_review</option><option>information_requested</option><option>approved</option><option>rejected</option></select></div><div className="table"><div className="tr th"><span>Applicant</span><span>Requested</span><span>Status</span><span>Received</span></div>{rows.map(r=><div className="tr" key={r.id}><span><strong>{r.name}</strong><small>{r.mobile}</small></span><span>{money(r.requested_amount_paise)}</span><span><i className={`pill ${r.status}`}>{r.status.replace('_',' ')}</i></span><span>{new Date(r.created_at).toLocaleDateString('en-IN')}</span></div>)}{!rows.length&&<div className="empty">No applications match this filter.</div>}</div></>}
function Placeholder({title,text}:{title:string;text:string}){return <div className="empty-page"><span className="eyebrow">SAATHI FINANCE</span><h1>{title}</h1><p>{text}</p></div>}
export default function App(){const[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(!!localStorage.getItem('token')),[publicView,setPublicView]=useState<'landing'|'login'|'register'|'guide'>('landing');useEffect(()=>{if(localStorage.getItem('token'))request('/me').then(setUser).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false))},[]);if(loading)return <div className="splash"><Brand/><span>Loading securely…</span></div>;if(!user){if(publicView==='guide')return <div className="public-guide-wrap"><header style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem 1.5rem',background:'#123d35',color:'#fff'}}><Brand/><div style={{display:'flex',gap:'0.75rem'}}><button type="button" onClick={()=>setPublicView('landing')} style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',fontSize:'0.9rem'}}>← Home</button><button type="button" onClick={()=>setPublicView('login')} style={{background:'#e8b55e',color:'#123d35',border:'none',borderRadius:'8px',padding:'0.5rem 1rem',cursor:'pointer',fontWeight:'700',fontSize:'0.9rem'}}>Sign in</button></div></header><FinancialGuide/></div>;return publicView==='landing'?<Landing onLogin={()=>setPublicView('login')} onRegister={()=>setPublicView('register')} onGuide={()=>setPublicView('guide')}/>:<Login initialMode={publicView} onLogin={setUser} onBack={()=>setPublicView('landing')}/>;}const admin=user.role!=='customer';return <Shell user={user} onLogout={()=>{localStorage.removeItem('token');setUser(null)}}>
<Routes>{admin?<>
<Route path="/admin" element={<AdminDashboard/>}/>
<Route path="/admin/applications" element={<AdminApplications/>}/>
<Route path="/admin/applications/:id" element={<AdminApplicationDetail/>}/>
<Route path="/admin/loans" element={<AdminLoans/>}/>
<Route path="/admin/loans/:id" element={<AdminLoanDetail/>}/>
<Route path="/admin/payments" element={<AdminPayments/>}/>
<Route path="/admin/reports" element={<AdminReports/>}/>
<Route path="/admin/settings" element={<AdminSettings user={user}/>}/>
<Route path="/admin/users" element={<AdminUsers user={user}/>}/>
<Route path="/admin/audit" element={<AdminAudit user={user}/>}/>
<Route path="*" element={<Navigate to="/admin"/>}/></>:<>
<Route path="/" element={<CustomerHome user={user}/>}/>
<Route path="/apply" element={<Apply/>}/>
<Route path="/applications/:id" element={<CustomerApplication/>}/>
<Route path="/loans" element={<CustomerLoans/>}/>
<Route path="/loans/:id" element={<CustomerLoanDetail/>}/>
<Route path="/payments" element={<CustomerPayments/>}/>
<Route path="/calculator" element={<EmiCalculator/>}/>
<Route path="/guide" element={<FinancialGuide/>}/>
<Route path="/profile" element={<ProfilePage user={user} onUpdate={setUser} onLogout={()=>{localStorage.removeItem('token');setUser(null)}}/>}/>
<Route path="/support" element={<Support/>}/>
<Route path="*" element={<Navigate to="/"/>}/></>}</Routes></Shell>}
