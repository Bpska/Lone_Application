import { Decimal } from 'decimal.js';
import { z } from 'zod';

export const roles = ['customer', 'admin', 'super_admin'] as const;
export type Role = typeof roles[number];
export const applicationStatuses = ['draft','submitted','under_review','information_requested','approved','rejected','withdrawn'] as const;
export const offerStatuses = ['prepared','presented','accepted','declined','expired'] as const;

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.'), password: z.string().min(8, 'Password must be at least 8 characters.').max(128) });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2).max(120), mobile: z.preprocess((value) => typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value, z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid 10–15 digit mobile number.')) });
export const applicationSchema = z.object({
  customer: z.object({ name:z.string().min(2), dateOfBirth:z.string().date(), guardianName:z.string().min(2), mobile:z.string().min(10), whatsapp:z.string().min(10), address:z.string().min(10), identifierType:z.enum(['pan','other','none']).default('none'), identifierValue:z.string().max(30).optional() }),
  witnesses: z.array(z.object({ name:z.string().min(2), guardianName:z.string().min(2), mobile:z.string().min(10), address:z.string().min(10), identityInfo:z.string().max(100).optional() })).length(2),
  loan: z.object({ monthlyIncomePaise:z.number().int().nonnegative(), purpose:z.string().min(3), requestedAmountPaise:z.number().int().positive(), nextOfKinName:z.string().min(2), nextOfKinRelationship:z.string().min(2) }),
  bank: z.object({ bankName:z.string().min(2), accountHolderName:z.string().min(2), ifsc:z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/), accountNumber:z.string().min(6).max(24) }),
  consent: z.literal(true)
});
export const offerSchema = z.object({ principalPaise:z.number().int().positive(), rate:z.number().positive().max(100), ratePeriod:z.enum(['annual','monthly']), method:z.enum(['flat','reducing']), instalments:z.number().int().min(1).max(120), frequency:z.enum(['monthly']).default('monthly'), firstDueDate:z.string().date(), processingFeePaise:z.number().int().nonnegative().default(0), otherChargesPaise:z.number().int().nonnegative().default(0), rounding:z.enum(['nearest','up','down']).default('nearest'), currency:z.literal('INR').default('INR') });
export type OfferInput = z.infer<typeof offerSchema>;
export type ScheduleRow = { number:number; dueDate:string; principalPaise:number; interestPaise:number; feesPaise:number; totalDuePaise:number };

const round = (v: Decimal, mode: OfferInput['rounding']) => v.toDecimalPlaces(0, mode === 'up' ? Decimal.ROUND_CEIL : mode === 'down' ? Decimal.ROUND_FLOOR : Decimal.ROUND_HALF_UP).toNumber();
export const addMonthsClamped = (iso:string, months:number) => {
  const [y,m,d] = iso.split('-').map(Number) as [number,number,number];
  const target = new Date(Date.UTC(y,m-1+months,1));
  const last = new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
};
export function calculateSchedule(raw: OfferInput): { schedule:ScheduleRow[]; totalInterestPaise:number; totalPayablePaise:number } {
  const o=offerSchema.parse(raw), p=new Decimal(o.principalPaise), n=o.instalments;
  const monthlyRate=new Decimal(o.rate).div(100).div(o.ratePeriod==='annual'?12:1);
  const fees=o.processingFeePaise+o.otherChargesPaise;
  const schedule:ScheduleRow[]=[];
  if(o.method==='flat') {
    const interestTotal=p.mul(monthlyRate).mul(n); let allocatedP=0, allocatedI=0;
    for(let i=1;i<=n;i++){const principal=i===n?o.principalPaise-allocatedP:round(p.div(n),o.rounding);const interest=i===n?round(interestTotal,o.rounding)-allocatedI:round(interestTotal.div(n),o.rounding);allocatedP+=principal;allocatedI+=interest;schedule.push({number:i,dueDate:addMonthsClamped(o.firstDueDate,i-1),principalPaise:principal,interestPaise:interest,feesPaise:i===1?fees:0,totalDuePaise:principal+interest+(i===1?fees:0)});}
  } else {
    const emi=monthlyRate.isZero()?p.div(n):p.mul(monthlyRate).mul(new Decimal(1).add(monthlyRate).pow(n)).div(new Decimal(1).add(monthlyRate).pow(n).minus(1));let balance=o.principalPaise, allocatedP=0;
    for(let i=1;i<=n;i++){const interest=round(new Decimal(balance).mul(monthlyRate),o.rounding);const principal=i===n?o.principalPaise-allocatedP:Math.min(balance,round(emi.minus(interest),o.rounding));allocatedP+=principal;balance-=principal;schedule.push({number:i,dueDate:addMonthsClamped(o.firstDueDate,i-1),principalPaise:principal,interestPaise:interest,feesPaise:i===1?fees:0,totalDuePaise:principal+interest+(i===1?fees:0)});}
  }
  const totalInterestPaise=schedule.reduce((s,r)=>s+r.interestPaise,0);return {schedule,totalInterestPaise,totalPayablePaise:o.principalPaise+totalInterestPaise+fees};
}
export const maskAccount=(v:string)=>v.length<5?'â€¢â€¢â€¢â€¢':`â€¢â€¢â€¢â€¢${v.slice(-4)}`;
