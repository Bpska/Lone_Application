import type { Express } from 'express';
import argon2 from 'argon2';
import { calculateSchedule, offerSchema } from '@saathi/shared';

export function registerAdminRoutes(app: Express, deps: any) {
  const { pool, tx, auth, audit, asyncRoute } = deps;
  const admins = auth(['admin', 'super_admin']);
  const superAdmins = auth(['super_admin']);

  app.get('/api/admin/applications/:id', admins, asyncRoute(async (req: any, res: any) => {
    const base = await pool.query(`SELECT a.*,p.name,p.mobile,p.whatsapp,p.address,p.date_of_birth,p.guardian_name,u.email
      FROM applications a JOIN customer_profiles p ON p.user_id=a.customer_id JOIN users u ON u.id=a.customer_id WHERE a.id=$1`, [req.params.id]);
    if (!base.rowCount) return res.status(404).json({error:{code:'NOT_FOUND',message:'Application not found.'}});
    const [witnesses, documents, reviews, offers, loan] = await Promise.all([
      pool.query('SELECT id,position,details FROM witnesses WHERE application_id=$1 ORDER BY position', [req.params.id]),
      pool.query('SELECT id,kind,mime_type,size_bytes,scan_status,created_at FROM documents WHERE application_id=$1 ORDER BY created_at DESC', [req.params.id]),
      pool.query(`SELECT r.*,p.name admin_name FROM application_reviews r LEFT JOIN customer_profiles p ON p.user_id=r.admin_id WHERE application_id=$1 ORDER BY r.created_at DESC`, [req.params.id]),
      pool.query('SELECT * FROM offers WHERE application_id=$1 ORDER BY created_at DESC', [req.params.id]),
      pool.query('SELECT * FROM loans WHERE application_id=$1', [req.params.id])
    ]);
    res.json({data:{...base.rows[0],witnesses:witnesses.rows,documents:documents.rows,reviews:reviews.rows,offers:offers.rows,loan:loan.rows[0]||null}});
  }));

  app.post('/api/admin/offers/preview', admins, asyncRoute(async (req: any, res: any) => {
    const terms = offerSchema.parse(req.body);
    res.json({data:calculateSchedule(terms)});
  }));

  app.post('/api/admin/applications/:id/notes', admins, asyncRoute(async (req:any,res:any) => {
    const note=String(req.body.note||'').trim(); if(!note)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Note is required.'}});
    const r=await pool.query('INSERT INTO admin_notes(application_id,admin_id,note,contact_channel) VALUES($1,$2,$3,$4) RETURNING *',[req.params.id,req.user.id,note,req.body.contactChannel||null]);
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
      pool.query('SELECT * FROM admin_notes WHERE loan_id=$1 ORDER BY created_at DESC',[req.params.id])
    ]);
    res.json({data:{...base.rows[0],schedule:schedule.rows,payments:payments.rows,disbursements:disbursements.rows,notes:notes.rows}});
  }));

  app.post('/api/admin/loans/:id/notes', admins, asyncRoute(async(req:any,res:any)=>{
    const note=String(req.body.note||'').trim();if(!note)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Note is required.'}});
    const r=await pool.query('INSERT INTO admin_notes(loan_id,admin_id,note,contact_channel) VALUES($1,$2,$3,$4) RETURNING *',[req.params.id,req.user.id,note,req.body.contactChannel||null]);res.status(201).json({data:r.rows[0]});
  }));

  app.get('/api/admin/payments', admins, asyncRoute(async (_req:any,res:any)=>{
    const r=await pool.query(`SELECT py.*,p.name customer_name FROM payments py JOIN loans l ON l.id=py.loan_id JOIN customer_profiles p ON p.user_id=l.customer_id ORDER BY py.created_at DESC LIMIT 200`);res.json({data:r.rows});
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
    (SELECT COALESCE(SUM((terms_snapshot->>'principalPaise')::bigint),0) FROM loans WHERE status IN ('active','completed'))::bigint disbursed_paise,
    (SELECT COALESCE(SUM(amount_paise),0) FROM payments WHERE status='confirmed')::bigint collected_paise,
    (SELECT COUNT(*) FROM payments WHERE status='pending_verification')::int pending_payments`);res.json({data:r.rows[0]})}));
}
