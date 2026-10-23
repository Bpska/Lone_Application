import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateSchedule } from '@saathi/shared';
import { request } from './App';
import './emi-calculator.css';

interface EmiCalculatorProps {
  isPublic?: boolean;
  onBack?: () => void;
  onApply?: () => void;
}

const inr = (p: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(p / 100));

const formatNum = (v: number) =>
  new Intl.NumberFormat('en-IN').format(v);

// Safe first due date that never rolls over on 29/30/31st of the month
const getSafeFirstDueDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const nextMonth = now.getMonth() + 1;
  const targetYear = nextMonth > 11 ? year + 1 : year;
  const targetMonth = nextMonth > 11 ? 0 : nextMonth;
  const safeDay = Math.min(now.getDate(), 28);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
};

const AMOUNT_PRESETS = [
  { label: '₹50K', value: 50000 },
  { label: '₹1 Lakh', value: 100000 },
  { label: '₹2 Lakh', value: 200000 },
  { label: '₹5 Lakh', value: 500000 },
  { label: '₹10 Lakh', value: 1000000 },
  { label: '₹25 Lakh', value: 2500000 }
];

const TENURE_PRESETS = [
  { label: '6 Mos', value: 6 },
  { label: '1 Year', value: 12 },
  { label: '2 Years', value: 24 },
  { label: '3 Years', value: 36 },
  { label: '5 Years', value: 60 }
];

const RATE_PRESETS = [
  { label: '8.5% (Home/Gold)', value: 8.5 },
  { label: '10.5% (Vehicle)', value: 10.5 },
  { label: '12% (Standard)', value: 12 },
  { label: '14% (Business)', value: 14 },
  { label: '18% (Micro/Personal)', value: 18 }
];

export default function EmiCalculator({ isPublic = false, onBack, onApply }: EmiCalculatorProps) {
  const nav = useNavigate();

  // Primary user adjustable parameters
  const [principal, setPrincipal] = useState<number>(200000);
  const [tenure, setTenure] = useState<number>(24);
  const [rate, setRate] = useState<number>(12);
  const [method, setMethod] = useState<'reducing' | 'flat'>('reducing');
  const [ratePeriod, setRatePeriod] = useState<'annual' | 'monthly'>('annual');

  // Optional 30% income rule evaluator
  const [monthlyIncome, setMonthlyIncome] = useState<string>('40000');

  // Table pagination toggle
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(false);

  // Background config sync from server defaults if available
  useEffect(() => {
    request('/calculator-config')
      .then((cfg) => {
        if (cfg) {
          if (cfg.rate && typeof cfg.rate === 'number') setRate(cfg.rate);
          if (cfg.method && (cfg.method === 'flat' || cfg.method === 'reducing')) setMethod(cfg.method);
          if (cfg.ratePeriod && (cfg.ratePeriod === 'annual' || cfg.ratePeriod === 'monthly')) setRatePeriod(cfg.ratePeriod);
        }
      })
      .catch(() => {
        // Fallback gracefully to default numbers, no crash or blocking state
      });
  }, []);

  // Compute schedule and totals
  const result = useMemo(() => {
    const validP = Math.max(1000, Number(principal) || 0);
    const validT = Math.max(1, Math.min(120, Number(tenure) || 12));
    const validR = Math.max(0.1, Math.min(100, Number(rate) || 12));

    try {
      return calculateSchedule({
        principalPaise: Math.round(validP * 100),
        rate: validR,
        ratePeriod,
        method,
        instalments: validT,
        frequency: 'monthly',
        firstDueDate: getSafeFirstDueDate(),
        processingFeePaise: 0,
        otherChargesPaise: 0,
        rounding: 'nearest',
        currency: 'INR'
      });
    } catch {
      return null;
    }
  }, [principal, tenure, rate, method, ratePeriod]);

  const handleApply = () => {
    try {
      const old = JSON.parse(localStorage.getItem('loan-draft') || '{}');
      localStorage.setItem('loan-draft', JSON.stringify({ ...old, amount: String(principal) }));
      localStorage.setItem(
        'loan-calculator-plan',
        JSON.stringify({ principal, tenure, frequency: 'monthly', rate, method, ratePeriod })
      );
    } catch {
      // storage unavailable
    }

    if (onApply) {
      onApply();
    } else {
      nav('/apply');
    }
  };

  const firstInstallment = result?.schedule[0];
  const monthlyEmiPaise = firstInstallment?.totalDuePaise || 0;
  const totalInterestPaise = result?.totalInterestPaise || 0;
  const totalPayablePaise = result?.totalPayablePaise || 0;

  const principalRatio = totalPayablePaise > 0
    ? Math.round(((principal * 100) / totalPayablePaise) * 100)
    : 70;
  const interestRatio = Math.max(0, 100 - principalRatio);

  // Income rule calculations
  const parsedIncome = Number(monthlyIncome) || 0;
  const emiRupees = Math.round(monthlyEmiPaise / 100);
  const incomeRatio = parsedIncome > 0 ? Math.round((emiRupees / parsedIncome) * 100) : 0;
  const isIncomeSafe = incomeRatio > 0 && incomeRatio <= 30;

  const displayedSchedule = showFullSchedule
    ? (result?.schedule || [])
    : (result?.schedule || []).slice(0, 12);

  return (
    <main className="calc-page">
      <header className="calc-header">
        <div>
          <span>SMART FINANCIAL PLANNING</span>
          <h1>Loan & EMI Calculator</h1>
          <p>Instantly estimate your monthly EMI, total interest, and complete repayment schedule.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isPublic && onBack && (
            <button type="button" className="calc-print-btn" onClick={onBack}>
              ← Back to Home
            </button>
          )}
          <button type="button" className="calc-print-btn" onClick={() => window.print()}>
            🖨️ Download PDF / Print
          </button>
        </div>
      </header>

      {/* 30% Financial Rule Promo Banner */}
      <div className="calc-tip-banner">
        <div>
          <strong>💡 EMI का 30% सुनहरी नियम (Safe Borrowing)</strong>
          <span>
            आपकी सभी EMI का कुल जोड़ मासिक आय के 30% से अधिक नहीं होना चाहिए।
          </span>
        </div>
        <button
          type="button"
          className="calc-tip-btn"
          onClick={() => {
            if (isPublic && onBack) {
              window.location.href = '/guide';
            } else {
              nav('/guide');
            }
          }}
        >
          वित्तीय समझ एवं 5 नियम पढ़ें →
        </button>
      </div>

      <div className="calc-main-grid">
        {/* Left Column: Interactive Inputs & Sliders */}
        <div className="calc-controls-card">
          {/* Method Selector */}
          <div className="calc-group">
            <div className="calc-group-head">
              <label>Calculation Method</label>
              <span style={{ fontSize: '11px', color: '#687771', fontWeight: 600 }}>
                {method === 'reducing' ? 'Diminishing Balance (Standard)' : 'Flat Rate Interest'}
              </span>
            </div>
            <div className="calc-switch-row">
              <button
                type="button"
                className={`calc-switch-btn ${method === 'reducing' ? 'active' : ''}`}
                onClick={() => setMethod('reducing')}
              >
                <span>📉 Reducing Balance</span>
              </button>
              <button
                type="button"
                className={`calc-switch-btn ${method === 'flat' ? 'active' : ''}`}
                onClick={() => setMethod('flat')}
              >
                <span>📊 Flat Rate</span>
              </button>
            </div>
          </div>

          {/* Principal Amount Control */}
          <div className="calc-group">
            <div className="calc-group-head">
              <label htmlFor="calc-principal">Loan Amount</label>
              <div className="calc-input-box">
                <span>₹</span>
                <input
                  id="calc-principal"
                  type="number"
                  min="5000"
                  max="5000000"
                  step="5000"
                  value={principal || ''}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                />
              </div>
            </div>
            <input
              type="range"
              min="10000"
              max="5000000"
              step="5000"
              className="calc-slider"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
            />
            <div className="calc-chips">
              {AMOUNT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`calc-chip ${principal === p.value ? 'active' : ''}`}
                  onClick={() => setPrincipal(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tenure Control */}
          <div className="calc-group">
            <div className="calc-group-head">
              <label htmlFor="calc-tenure">Loan Tenure</label>
              <div className="calc-input-box">
                <input
                  id="calc-tenure"
                  type="number"
                  min="1"
                  max="120"
                  value={tenure || ''}
                  onChange={(e) => setTenure(Number(e.target.value))}
                />
                <span style={{ marginLeft: '6px' }}>Months</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="120"
              step="1"
              className="calc-slider"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
            />
            <div className="calc-chips">
              {TENURE_PRESETS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={`calc-chip ${tenure === t.value ? 'active' : ''}`}
                  onClick={() => setTenure(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interest Rate Control */}
          <div className="calc-group">
            <div className="calc-group-head">
              <label htmlFor="calc-rate">Interest Rate</label>
              <div className="calc-input-box">
                <input
                  id="calc-rate"
                  type="number"
                  min="1"
                  max="40"
                  step="0.1"
                  value={rate || ''}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
                <span style={{ marginLeft: '4px' }}>% p.a.</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="36"
              step="0.25"
              className="calc-slider"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <div className="calc-chips">
              {RATE_PRESETS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  className={`calc-chip ${rate === r.value ? 'active' : ''}`}
                  onClick={() => setRate(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: High Impact Results Card */}
        <div className="calc-summary-hero">
          <div className="calc-emi-display">
            <span>ESTIMATED MONTHLY PAYMENT</span>
            <h2>{inr(monthlyEmiPaise)}</h2>
            <small>for {tenure} months at {rate}% {ratePeriod === 'annual' ? 'p.a.' : 'p.m.'}</small>
          </div>

          {/* Visual Ratio Bar */}
          <div className="calc-ratio-box">
            <div className="calc-ratio-bar">
              <div
                className="calc-ratio-bar-principal"
                style={{ width: `${principalRatio}%` }}
                title={`Principal: ${principalRatio}%`}
              />
            </div>
            <div className="calc-ratio-legend">
              <span>
                <i style={{ background: '#42b883' }} /> Principal ({principalRatio}%)
              </span>
              <span>
                <i style={{ background: '#e8b55e' }} /> Interest ({interestRatio}%)
              </span>
            </div>
          </div>

          {/* Breakdown Numbers */}
          <div className="calc-breakdown-list">
            <div className="calc-breakdown-row">
              <span>Principal Loan Amount:</span>
              <strong>{inr(principal * 100)}</strong>
            </div>
            <div className="calc-breakdown-row">
              <span>Total Interest Charges:</span>
              <strong style={{ color: '#e8b55e' }}>{inr(totalInterestPaise)}</strong>
            </div>
            <div className="calc-breakdown-row">
              <span>Total Payable Amount:</span>
              <strong style={{ fontSize: '18px' }}>{inr(totalPayablePaise)}</strong>
            </div>
          </div>

          {/* 30% Income Rule Checker */}
          <div className="calc-income-widget">
            <div className="calc-income-head">
              <span>🛡️ 30% Income Safety Check</span>
            </div>
            <div className="calc-income-row">
              <span style={{ fontSize: '12px', color: '#52665f', whiteSpace: 'nowrap' }}>Your monthly income: ₹</span>
              <input
                type="number"
                placeholder="40000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
              />
            </div>
            {parsedIncome > 0 && (
              <div className={`calc-income-badge ${isIncomeSafe ? 'safe' : 'warning'}`}>
                {isIncomeSafe ? (
                  <>
                    ✓ <strong>Safe:</strong> This EMI is <strong>{incomeRatio}%</strong> of your monthly income (within the safe 30% threshold).
                  </>
                ) : (
                  <>
                    ⚠️ <strong>Caution:</strong> This EMI is <strong>{incomeRatio}%</strong> of your monthly income. Consider extending the tenure to reduce monthly pressure.
                  </>
                )}
              </div>
            )}
          </div>

          <button type="button" className="calc-hero-apply-btn" onClick={handleApply}>
            Apply for {inr(principal * 100)} Loan →
          </button>
        </div>
      </div>

      {/* Month-wise Amortization Table */}
      {result && result.schedule.length > 0 && (
        <section className="calc-card">
          <div className="calc-card-title">
            <div>
              <span>REPAYMENT BREAKDOWN</span>
              <h2>Detailed Monthly Schedule</h2>
            </div>
            <span style={{ fontSize: '12px', color: '#556660', fontWeight: 600 }}>
              Showing {displayedSchedule.length} of {result.schedule.length} instalments
            </span>
          </div>

          <div className="calc-table-wrap">
            <div className="calc-table">
              <table>
                <thead>
                  <tr>
                    <th># Month</th>
                    <th>Due Date</th>
                    <th>Instalment (EMI)</th>
                    <th>Principal Paid</th>
                    <th>Interest Paid</th>
                    <th>Remaining Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSchedule.map((row: any, i: number) => {
                    const remainingPaise = result.schedule
                      .slice(i + 1)
                      .reduce((sum: number, r: any) => sum + r.principalPaise, 0);

                    return (
                      <tr key={row.number}>
                        <td className="col-sticky">
                          <strong>Month {row.number}</strong>
                        </td>
                        <td>
                          {new Date(row.dueDate + 'T00:00:00').toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="col-val">{inr(row.totalDuePaise)}</td>
                        <td>{inr(row.principalPaise)}</td>
                        <td>{inr(row.interestPaise)}</td>
                        <td>{inr(remainingPaise)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {result.schedule.length > 12 && (
              <button
                type="button"
                className="calc-view-more-btn"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
              >
                {showFullSchedule
                  ? 'Show fewer instalments (first 12 months)'
                  : `View all ${result.schedule.length} months schedule ↓`}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
