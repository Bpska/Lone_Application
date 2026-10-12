import type { Express } from 'express';
import argon2 from 'argon2';
import { calculateSchedule, offerSchema } from '@saathi/shared';

export function registerAdminRoutes(app: Express, deps: any) {
  const { pool, tx, auth, audit, asyncRoute } = deps;
  const admins = auth(['admin', 'super_admin']);
  const superAdmins = auth(['super_admin']);
  const customers = auth(['customer']);

  app.post('/api/loans/:id/payments', customers, asyncRoute(async(req:any,res:any)=>{
    const {amountPaise,paymentDate,method,reference,instalmentId}=req.body,key=req.headers['idempotency-key'];
    if(!key)return res.status(400).json({error:{code:'IDEMPOTENCY_REQUIRED',message:'Idempotency-Key header is required.'}});
    if(!Number.isInteger(amountPaise)||amountPaise<=0||!/^\d{4}-\d{2}-\d{2}$/.test(String(paymentDate))||!['bank_transfer','upi','cash','other'].includes(method)||String(reference||'').trim().length<3)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Enter a valid amount, date, payment method, and transaction reference.'}});
    const out=await tx(async(c:any)=>{
      const existing=await c.query('SELECT * FROM payments WHERE idempotency_key=$1',[key]);
      if(existing.rowCount)return existing.rows[0];
      const loan=(await c.query('SELECT * FROM loans WHERE id=$1 AND customer_id=$2 FOR UPDATE',[req.params.id,req.user.id])).rows[0];
      if(!loan)return null;
      if(loan.status!=='active')throw Object.assign(new Error('Payments can only be submitted for an active loan'),{status:409});
      const balance=await c.query(`SELECT COALESCE(SUM(i.total_due_paise),0)-COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id JOIN instalments ix ON ix.id=pa.instalment_id WHERE ix.loan_id=$1 AND py.status='confirmed'),0) outstanding FROM instalments i WHERE i.loan_id=$1`,[loan.id]);
      if(Number(amountPaise)>Number(balance.rows[0].outstanding))throw Object.assign(new Error('Payment amount cannot exceed the outstanding balance'),{status:409});
      if(instalmentId){
        const target=(await c.query(`SELECT i.id,i.number,i.total_due_paise-COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id WHERE pa.instalment_id=i.id AND py.status='confirmed'),0) outstanding FROM instalments i WHERE i.id=$1 AND i.loan_id=$2`,[instalmentId,loan.id])).rows[0];
        if(!target)throw Object.assign(new Error('Selected EMI does not belong to this loan'),{status:400});
        const oldest=(await c.query(`SELECT i.id FROM instalments i WHERE i.loan_id=$1 AND i.total_due_paise>COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id WHERE pa.instalment_id=i.id AND py.status='confirmed'),0) ORDER BY i.number LIMIT 1`,[loan.id])).rows[0];
        if(oldest?.id!==target.id)throw Object.assign(new Error('Please pay the oldest outstanding EMI first'),{status:409});
        if(Number(amountPaise)>Number(target.outstanding))throw Object.assign(new Error('Payment amount cannot exceed the selected EMI balance'),{status:409});
      }
      const payment=(await c.query(`INSERT INTO payments(loan_id,status,amount_paise,payment_date,method,reference,recorded_by,idempotency_key,target_instalment_id) VALUES($1,'pending_verification',$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[loan.id,amountPaise,paymentDate,method,String(reference).trim(),req.user.id,key,instalmentId||null])).rows[0];
      await audit(c,req.user.id,'payment',payment.id,'submitted',null,payment,'Customer submitted payment reference for verification');
      return payment;
    });
    if(!out)return res.status(404).json({error:{code:'NOT_FOUND',message:'Active loan not found.'}});
    res.status(201).json({data:out});
  }));

  app.get('/api/admin/applications/:id', admins, asyncRoute(async (req: any, res: any) => {
    const base = await pool.query(`SELECT a.*,p.name,p.mobile,p.whatsapp,p.address,p.date_of_birth,p.guardian_name,u.email
      FROM applications a JOIN customer_profiles p ON p.user_id=a.customer_id JOIN users u ON u.id=a.customer_id WHERE a.id=$1`, [req.params.id]);
    if (!base.rowCount) return res.status(404).json({error:{code:'NOT_FOUND',message:'Application not found.'}});
    const [witnesses, documents, reviews, offers, loan, notes] = await Promise.all([
      pool.query('SELECT id,position,details FROM witnesses WHERE application_id=$1 ORDER BY position', [req.params.id]),
      pool.query('SELECT id,kind,mime_type,size_bytes,scan_status,created_at FROM documents WHERE application_id=$1 ORDER BY created_at DESC', [req.params.id]),
      pool.query(`SELECT r.*,COALESCE(p.name,'Admin') admin_name FROM application_reviews r LEFT JOIN customer_profiles p ON p.user_id=r.admin_id WHERE application_id=$1 ORDER BY r.created_at ASC`, [req.params.id]),
      pool.query('SELECT * FROM offers WHERE application_id=$1 ORDER BY created_at DESC', [req.params.id]),
      pool.query('SELECT * FROM loans WHERE application_id=$1', [req.params.id]),
      pool.query(`SELECT n.*,COALESCE(p.name,'Admin') admin_name FROM admin_notes n LEFT JOIN customer_profiles p ON p.user_id=n.admin_id WHERE n.application_id=$1 ORDER BY n.created_at DESC`, [req.params.id])
    ]);
    res.json({data:{...base.rows[0],witnesses:witnesses.rows,documents:documents.rows,reviews:reviews.rows,offers:offers.rows,loan:loan.rows[0]||null,notes:notes.rows}});
  }));

  app.post('/api/admin/offers/preview', admins, asyncRoute(async (req: any, res: any) => {
    const terms = offerSchema.parse(req.body);
    res.json({data:calculateSchedule(terms)});
  }));

  app.post('/api/admin/applications/:id/notes', admins, asyncRoute(async (req:any,res:any) => {
    const note=String(req.body.note||'').trim(); if(!note)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Note is required.'}});
    const r=await pool.query(`INSERT INTO admin_notes(application_id,admin_id,note,contact_channel) VALUES($1,$2,$3,$4) RETURNING *,
      (SELECT COALESCE(name,'Admin') FROM customer_profiles WHERE user_id=$2) admin_name`,[req.params.id,req.user.id,note,req.body.contactChannel||null]);
    res.status(201).json({data:r.rows[0]});
  }));

  app.get('/api/admin/loans', admins, asyncRoute(async (req:any,res:any) => {
    const values:any[]=[]; let where='TRUE'; if(req.query.status){values.push(req.query.status);where=`l.status=$1`}
    const r=await pool.query(`SELECT l.*,p.name,p.mobile,a.bank_snapshot,o.total_payable_paise,
      COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id JOIN instalments ix ON ix.id=pa.instalment_id WHERE ix.loan_id=l.id AND py.status='confirmed'),0)::bigint paid_paise
      FROM loans l JOIN customer_profiles p ON p.user_id=l.customer_id JOIN applications a ON a.id=l.application_id JOIN offers o ON o.id=l.offer_id WHERE ${where} ORDER BY l.created_at DESC`,values);
    res.json({data:r.rows});
  }));

  app.get('/api/admin/loans/:id', admins, asyncRoute(async (req:any,res:any) => {
    const base=await pool.query(`SELECT l.*,p.name,p.mobile,p.whatsapp,u.email,a.bank_snapshot,o.total_payable_paise,o.total_interest_paise
      FROM loans l JOIN customer_profiles p ON p.user_id=l.customer_id JOIN users u ON u.id=l.customer_id JOIN applications a ON a.id=l.application_id JOIN offers o ON o.id=l.offer_id WHERE l.id=$1`,[req.params.id]);
    if(!base.rowCount)return res.status(404).json({error:{code:'NOT_FOUND',message:'Loan not found.'}});
    const [schedule,payments,disbursements,notes]=await Promise.all([
      pool.query(`SELECT i.*,COALESCE(SUM(pa.amount_paise) FILTER(WHERE p.status='confirmed'),0)::bigint paid_paise FROM instalments i LEFT JOIN payment_allocations pa ON pa.instalment_id=i.id LEFT JOIN payments p ON p.id=pa.payment_id WHERE i.loan_id=$1 GROUP BY i.id ORDER BY i.number`,[req.params.id]),
      pool.query('SELECT * FROM payments WHERE loan_id=$1 ORDER BY payment_date DESC,created_at DESC',[req.params.id]),
      pool.query('SELECT * FROM disbursements WHERE loan_id=$1 ORDER BY created_at DESC',[req.params.id]),
      pool.query(`SELECT n.*,COALESCE(p.name,'Admin') admin_name FROM admin_notes n LEFT JOIN customer_profiles p ON p.user_id=n.admin_id WHERE n.loan_id=$1 ORDER BY n.created_at DESC`,[req.params.id])
    ]);
    res.json({data:{...base.rows[0],schedule:schedule.rows,payments:payments.rows,disbursements:disbursements.rows,notes:notes.rows}});
  }));

  app.post('/api/admin/loans/:id/notes', admins, asyncRoute(async(req:any,res:any)=>{
    const note=String(req.body.note||'').trim();if(!note)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Note is required.'}});
    const r=await pool.query(`INSERT INTO admin_notes(loan_id,admin_id,note,contact_channel) VALUES($1,$2,$3,$4) RETURNING *,
      (SELECT COALESCE(name,'Admin') FROM customer_profiles WHERE user_id=$2) admin_name`,[req.params.id,req.user.id,note,req.body.contactChannel||null]);res.status(201).json({data:r.rows[0]});
  }));

  app.patch('/api/admin/loans/:id/status', admins, asyncRoute(async(req:any,res:any)=>{
    const status=String(req.body.status||''),reason=String(req.body.reason||'').trim();
    if(status!=='cancelled'||!reason)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Cancellation and an audit reason are required.'}});
    const out=await tx(async(c:any)=>{
      const old=(await c.query('SELECT * FROM loans WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!old)return null;
      if(old.status!=='awaiting_disbursement')throw Object.assign(new Error('Only a loan awaiting disbursement can be cancelled'),{status:409});
      const confirmed=await c.query(`SELECT 1 FROM disbursements WHERE loan_id=$1 AND status='confirmed' LIMIT 1`,[old.id]);
      if(confirmed.rowCount)throw Object.assign(new Error('A loan with a confirmed disbursement cannot be cancelled'),{status:409});
      const loan=(await c.query(`UPDATE loans SET status='cancelled' WHERE id=$1 RETURNING *`,[old.id])).rows[0];
      await audit(c,req.user.id,'loan',old.id,'cancelled',old,loan,reason);
      return loan;
    });
    if(!out)return res.status(404).json({error:{code:'NOT_FOUND',message:'Loan not found.'}});
    res.json({data:out});
  }));

  app.patch('/api/admin/payments/:id/reverse', admins, asyncRoute(async(req:any,res:any)=>{
    const reason=String(req.body.reason||'').trim();
    if(!reason)return res.status(400).json({error:{code:'REASON_REQUIRED',message:'An audit reason is required.'}});
    const out=await tx(async(c:any)=>{
      const old=(await c.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!old)return null;
      if(old.status!=='confirmed')throw Object.assign(new Error('Only a confirmed payment can be reversed'),{status:409});
      await c.query('DELETE FROM payment_allocations WHERE payment_id=$1',[old.id]);
      const payment=(await c.query(`UPDATE payments SET status='reversed',confirmed_at=NULL WHERE id=$1 RETURNING *`,[old.id])).rows[0];
      await c.query(`UPDATE loans SET status='active' WHERE id=$1 AND status='completed'`,[old.loan_id]);
      await audit(c,req.user.id,'payment',old.id,'reversed',old,payment,reason);
      return payment;
    });
    if(!out)return res.status(404).json({error:{code:'NOT_FOUND',message:'Payment not found.'}});
    res.json({data:out});
  }));

  app.patch('/api/admin/disbursements/:id/reverse', admins, asyncRoute(async(req:any,res:any)=>{
    const reason=String(req.body.reason||'').trim();
    if(!reason)return res.status(400).json({error:{code:'REASON_REQUIRED',message:'An audit reason is required.'}});
    const out=await tx(async(c:any)=>{
      const old=(await c.query('SELECT * FROM disbursements WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!old)return null;
      if(old.status!=='confirmed')throw Object.assign(new Error('Only a confirmed disbursement can be reversed'),{status:409});
      const payments=await c.query(`SELECT 1 FROM payments WHERE loan_id=$1 AND status='confirmed' LIMIT 1`,[old.loan_id]);
      if(payments.rowCount)throw Object.assign(new Error('Reverse confirmed payments before reversing the disbursement'),{status:409});
      const disbursement=(await c.query(`UPDATE disbursements SET status='reversed' WHERE id=$1 RETURNING *`,[old.id])).rows[0];
      await c.query(`UPDATE loans SET status='awaiting_disbursement',activated_at=NULL WHERE id=$1`,[old.loan_id]);
      await audit(c,req.user.id,'disbursement',old.id,'reversed',old,disbursement,reason);
      return disbursement;
    });
    if(!out)return res.status(404).json({error:{code:'NOT_FOUND',message:'Disbursement not found.'}});
    res.json({data:out});
  }));

  app.get('/api/admin/payments', admins, asyncRoute(async (_req:any,res:any)=>{
    const r=await pool.query(`SELECT py.*,p.name customer_name,i.number target_instalment_number FROM payments py JOIN loans l ON l.id=py.loan_id JOIN customer_profiles p ON p.user_id=l.customer_id LEFT JOIN instalments i ON i.id=py.target_instalment_id ORDER BY py.created_at DESC LIMIT 200`);res.json({data:r.rows});
  }));

  app.patch('/api/admin/payments/:id/status', admins, asyncRoute(async(req:any,res:any)=>{
    const status=String(req.body.status||''),reason=String(req.body.reason||'').trim();
    if(!['confirmed','rejected'].includes(status)||!reason)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'A valid decision and audit reason are required.'}});
    const out=await tx(async(c:any)=>{
      const old=(await c.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
      if(!old)return null;
      if(old.status!=='pending_verification')throw Object.assign(new Error('Only pending payments can be reconciled'),{status:409});
      if(status==='confirmed'){
        let remaining=Number(old.amount_paise);
        const due=await c.query(`SELECT i.id,i.total_due_paise-COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id WHERE pa.instalment_id=i.id AND py.status='confirmed'),0) outstanding FROM instalments i WHERE i.loan_id=$1 ORDER BY i.number FOR UPDATE OF i`,[old.loan_id]);
        for(const row of due.rows){const amount=Math.min(remaining,Number(row.outstanding));if(amount>0){await c.query('INSERT INTO payment_allocations(payment_id,instalment_id,amount_paise) VALUES($1,$2,$3)',[old.id,row.id,amount]);remaining-=amount}if(!remaining)break}
        if(remaining)throw Object.assign(new Error('Payment exceeds the outstanding loan balance'),{status:409});
      }
      const payment=(await c.query(`UPDATE payments SET status=$2::transaction_status,confirmed_at=CASE WHEN $2='confirmed' THEN now() ELSE NULL END WHERE id=$1 RETURNING *`,[old.id,status])).rows[0];
      if(status==='confirmed'){
        const balance=await c.query(`SELECT COALESCE(SUM(i.total_due_paise),0)-COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments py ON py.id=pa.payment_id JOIN instalments ix ON ix.id=pa.instalment_id WHERE ix.loan_id=$1 AND py.status='confirmed'),0) outstanding FROM instalments i WHERE i.loan_id=$1`,[old.loan_id]);
        if(Number(balance.rows[0].outstanding)===0)await c.query(`UPDATE loans SET status='completed' WHERE id=$1`,[old.loan_id]);
      }
      await audit(c,req.user.id,'payment',old.id,status,old,payment,reason);
      return payment;
    });
    if(!out)return res.status(404).json({error:{code:'NOT_FOUND',message:'Payment not found.'}});
    res.json({data:out});
  }));

  app.get('/api/admin/settings', admins, asyncRoute(async (_req:any,res:any)=>{const r=await pool.query('SELECT key,value,updated_at FROM settings ORDER BY key');res.json({data:Object.fromEntries(r.rows.map((x:any)=>[x.key,x.value]))})}));
  app.put('/api/admin/settings/:key', superAdmins, asyncRoute(async(req:any,res:any)=>{
    if(!['support','offer_defaults','privacy'].includes(req.params.key))return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Unknown setting.'}});
    const out=await tx(async(c:any)=>{const old=(await c.query('SELECT value FROM settings WHERE key=$1 FOR UPDATE',[req.params.key])).rows[0]?.value;const row=(await c.query('INSERT INTO settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *',[req.params.key,req.body,req.user.id])).rows[0];await audit(c,req.user.id,'setting',req.params.key,'updated',old,req.body,'Configuration update');return row});res.json({data:out});
  }));

  app.get('/api/admin/users', superAdmins, asyncRoute(async(_req:any,res:any)=>{const r=await pool.query(`SELECT u.id,u.email,u.role,u.active,u.created_at,p.name,p.mobile FROM users u LEFT JOIN customer_profiles p ON p.user_id=u.id WHERE u.role IN ('admin','super_admin') ORDER BY u.created_at`);res.json({data:r.rows})}));
  app.post('/api/admin/users', superAdmins, asyncRoute(async(req:any,res:any)=>{const {email,password,name,mobile,role='admin'}=req.body;if(!email||!password||password.length<8||!['admin','super_admin'].includes(role))return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Valid email, role, and 8-character password are required.'}});const hash=await argon2.hash(password);const out=await tx(async(c:any)=>{const u=(await c.query('INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) RETURNING id,email,role,active,created_at',[String(email).trim().toLowerCase(),hash,role])).rows[0];await c.query('INSERT INTO customer_profiles(user_id,name,mobile) VALUES($1,$2,$3)',[u.id,String(name||'Administrator').trim(),String(mobile||'Not provided')]);await audit(c,req.user.id,'user',u.id,'created',null,u,'Admin account created');return u});res.status(201).json({data:out})}));
  app.patch('/api/admin/users/:id', superAdmins, asyncRoute(async(req:any,res:any)=>{if(req.params.id===req.user.id&&req.body.active===false)return res.status(409).json({error:{code:'INVALID_TRANSITION',message:'You cannot deactivate your own account.'}});const r=await pool.query(`UPDATE users SET active=COALESCE($2,active) WHERE id=$1 AND role IN ('admin','super_admin') RETURNING id,email,role,active`,[req.params.id,req.body.active]);if(!r.rowCount)return res.status(404).json({error:{code:'NOT_FOUND',message:'Admin not found.'}});res.json({data:r.rows[0]})}));

  app.get('/api/admin/report-summary', admins, asyncRoute(async(_req:any,res:any)=>{const r=await pool.query(`SELECT
    (SELECT COUNT(*) FROM applications)::int applications,
    (SELECT COUNT(*) FROM loans)::int loans,
    (SELECT COUNT(*) FROM loans WHERE status='active')::int active_loans,
    (SELECT COUNT(*) FROM loans WHERE status='completed')::int completed_loans,
    (SELECT COALESCE(SUM((terms_snapshot->>'principalPaise')::bigint),0) FROM loans WHERE status IN ('active','completed'))::bigint disbursed_paise,
    (SELECT COALESCE(SUM(amount_paise),0) FROM payments WHERE status='confirmed')::bigint collected_paise,
    (SELECT COUNT(*) FROM payments WHERE status='pending_verification')::int pending_payments,
    (SELECT COALESCE(SUM(i.total_due_paise),0) - COALESCE((SELECT SUM(pa.amount_paise) FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id WHERE p.status='confirmed'),0) FROM instalments i JOIN loans l ON l.id=i.loan_id WHERE l.status='active')::bigint active_outstanding_paise`);res.json({data:r.rows[0]})}));

  app.get('/api/admin/reports/applications.csv', admins, asyncRoute(async(_req:any,res:any)=>{
    const r=await pool.query(`SELECT a.id,p.name,a.status,a.requested_amount_paise,a.purpose,a.created_at FROM applications a JOIN customer_profiles p ON p.user_id=a.customer_id ORDER BY a.created_at DESC`);
    res.type('csv').send('application_id,applicant,status,requested_amount_inr,purpose,created_at\n'+r.rows.map((x:any)=>[x.id,JSON.stringify(x.name),x.status,(x.requested_amount_paise/100).toFixed(2),JSON.stringify(x.purpose||''),x.created_at.toISOString()].join(',')).join('\n'));
  }));

  app.get('/api/admin/reports/payments.csv', admins, asyncRoute(async(_req:any,res:any)=>{
    const r=await pool.query(`SELECT py.id,py.loan_id,p.name customer_name,py.amount_paise,py.payment_date,py.method,py.reference,py.status,py.created_at FROM payments py JOIN loans l ON l.id=py.loan_id JOIN customer_profiles p ON p.user_id=l.customer_id ORDER BY py.payment_date DESC,py.created_at DESC`);
    res.type('csv').send('payment_id,loan_id,customer,amount_inr,payment_date,method,reference,status,created_at\n'+r.rows.map((x:any)=>[x.id,x.loan_id,JSON.stringify(x.customer_name),(x.amount_paise/100).toFixed(2),x.payment_date,x.method,JSON.stringify(x.reference||''),x.status,x.created_at.toISOString()].join(',')).join('\n'));
  }));
}
