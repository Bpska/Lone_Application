import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './financial-guide.css';

type TabKey = 'overview' | 'emi-rules' | 'test' | 'glossary' | 'psychology' | 'calculator-guide';

export default function FinancialGuide() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [copiedPledge, setCopiedPledge] = useState(false);

  // Quick village calculator state for Simple vs Compound interest
  const [calcPrincipal, setCalcPrincipal] = useState<number>(10000);
  const [calcRate, setCalcRate] = useState<number>(2); // 2% per month or annual
  const [calcRateType, setCalcRateType] = useState<'monthly' | 'yearly'>('monthly');
  const [calcMonths, setCalcMonths] = useState<number>(12);

  // Simple Interest calculation
  const effectiveAnnualRate = calcRateType === 'monthly' ? calcRate * 12 : calcRate;
  const simpleInterest = Math.round((calcPrincipal * effectiveAnnualRate * (calcMonths / 12)) / 100);
  const simpleTotal = calcPrincipal + simpleInterest;

  // Compound Interest calculation (compounded monthly)
  const monthlyRateDecimal = (calcRateType === 'monthly' ? calcRate : calcRate / 12) / 100;
  const compoundTotal = Math.round(calcPrincipal * Math.pow(1 + monthlyRateDecimal, calcMonths));
  const compoundInterest = compoundTotal - calcPrincipal;

  const copyPledge = () => {
    navigator.clipboard.writeText(
      'मैं सभी सवालों के सच्चे और सही जवाब दूंगा/दूंगी, ताकि मुझे मेरे वित्तीय व्यवहार के बारे में सही जानकारी मिल सके।'
    );
    setCopiedPledge(true);
    setTimeout(() => setCopiedPledge(false), 2500);
  };

  return (
    <main className="guide-container">
      {/* Hero Header */}
      <header className="guide-hero">
        <div className="guide-badge">
          <span className="badge-dot" /> वित्तीय साक्षरता एवं मार्गदर्शन (Financial Literacy)
        </div>
        <h1 className="guide-title">
          वित्तीय प्रबंधन और समझदारी से लोन की चाबी
        </h1>
        <p className="guide-subtitle">
          वित्त किसी भी व्यवसाय व परिवार की जीवन रेखा है। जानिए EMI के 5 सुनहरे नियम, 30% का सुरक्षित फ़ॉर्मूला, वित्तीय शब्दावली और सही निर्णय लेने का मनोविज्ञान।
        </p>

        {/* Action Quick Links */}
        <div className="guide-quick-bar">
          <a
            href="https://sites.google.com/view/financial-knowledg/financial-health-test?authuser=0"
            target="_blank"
            rel="noopener noreferrer"
            className="guide-cta-btn primary"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>वित्तीय समझ टेस्ट दें (5-7 मिनट)</span>
          </a>
          <NavLink to="/calculator" className="guide-cta-btn secondary">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
            </svg>
            <span>EMI कैलकुलेटर खोलें</span>
          </NavLink>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="guide-tabs" aria-label="Financial Guide Sections">
        <button
          type="button"
          className={`guide-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="tab-num">01</span>
          <span>वित्तीय प्रबंधन व EMI</span>
        </button>
        <button
          type="button"
          className={`guide-tab ${activeTab === 'emi-rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('emi-rules')}
        >
          <span className="tab-num">02</span>
          <span>5 सुनहरे नियम (केस स्टडीज)</span>
        </button>
        <button
          type="button"
          className={`guide-tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <span className="tab-num">03</span>
          <span>आत्म-मूल्यांकन टेस्ट</span>
        </button>
        <button
          type="button"
          className={`guide-tab ${activeTab === 'glossary' ? 'active' : ''}`}
          onClick={() => setActiveTab('glossary')}
        >
          <span className="tab-num">04</span>
          <span>वित्तीय शब्दकोष</span>
        </button>
        <button
          type="button"
          className={`guide-tab ${activeTab === 'psychology' ? 'active' : ''}`}
          onClick={() => setActiveTab('psychology')}
        >
          <span className="tab-num">05</span>
          <span>निर्णय व मनोविज्ञान (Biases)</span>
        </button>
        <button
          type="button"
          className={`guide-tab ${activeTab === 'calculator-guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator-guide')}
        >
          <span className="tab-num">06</span>
          <span>SIP व ग्रामीण ब्याज हिसाब</span>
        </button>
      </nav>

      {/* TAB 1: OVERVIEW & BASIC EMI CONCEPTS */}
      {activeTab === 'overview' && (
        <section className="guide-section">
          <div className="section-intro-card">
            <h2>वित्तीय प्रबंधन (Financial Management) क्या है?</h2>
            <p className="lead-text">
              वित्त किसी भी व्यवसाय की जीवन रेखा है। हालाँकि, अधिकांश अन्य संसाधनों की तरह, वित्त हमेशा <strong>सीमित</strong> होता है। दूसरी ओर, इच्छाएँ हमेशा <strong>असीमित</strong> होती हैं। इसलिए, किसी भी व्यक्ति या व्यवसाय के लिए अपने वित्त को कुशलतापूर्वक प्रबंधित करना अति-महत्वपूर्ण है।
            </p>

            <div className="definitions-grid">
              <div className="quote-box">
                <span className="quote-mark">“</span>
                <p>वित्तीय प्रबंधन वह गतिविधि है जो व्यवसाय में उपयोग किए जाने वाले धन की योजना बनाने, जुटाने, नियंत्रण और प्रशासन से संबंधित है।</p>
                <strong>— गुथमैन और डगल (Guthmann &amp; Dougall)</strong>
              </div>
              <div className="quote-box">
                <span className="quote-mark">“</span>
                <p>वित्तीय प्रबंधन व्यवसाय प्रबंधन का वह क्षेत्र है जो पूंजी के विवेकपूर्ण उपयोग और पूंजी के स्रोत के सावधानीपूर्वक चयन के लिए समर्पित है ताकि एक व्यय इकाई को लक्ष्यों तक पहुंचने की दिशा में आगे बढ़ने में सक्षम बनाया जा सके।</p>
                <strong>— जे.एफ़. ब्रैंडले (J.F. Bradley)</strong>
              </div>
            </div>
          </div>

          <div className="guide-card primary-border">
            <div className="card-badge">सच्ची सीख</div>
            <h3>EMI लोन: समझदारी से लिया गया फ़ैसला, सुरक्षित भविष्य की चाबी</h3>
            <p>
              गाँव और मध्यमवर्गीय परिवारों में EMI (क़िस्त) आज ज़रूरत बन चुकी है। लेकिन EMI तभी फायदेमंद होती है, जब उसे समझदारी, योजना और अनुशासन के साथ लिया जाए। बिना समझे ली गई EMI अक्सर तनाव, बदनामी और आर्थिक नुकसान का कारण बन जाती है।
            </p>
            <div className="highlight-callout">
              <strong>💡 इस पेज का उद्देश्य आपको डराना नहीं, बल्कि जागरूक बनाना है — ताकि EMI आपके लिए समस्या नहीं, समाधान बने।</strong>
            </div>

            <div className="question-banner">
              <h4>EMI लोन लेने से पहले यह सवाल खुद से ज़रूर पूछें:</h4>
              <p className="big-question">“इस EMI से मेरी ज़िंदगी में क्या अच्छा बदलेगा?”</p>
              <div className="criteria-list">
                <div className="crit-item">
                  <span className="check-icon">✓</span>
                  <span>आपकी कमाई बढ़ेगी</span>
                </div>
                <div className="crit-item">
                  <span className="check-icon">✓</span>
                  <span>आपकी सुरक्षा बनेगी</span>
                </div>
                <div className="crit-item">
                  <span className="check-icon">✓</span>
                  <span>आपके परिवार का भविष्य मजबूत होगा</span>
                </div>
              </div>
              <p className="crit-verdict">अगर इन सवालों का जवाब ‘हाँ’ है, <strong>तो EMI सही निर्णय है।</strong></p>
            </div>

            <div className="example-box">
              <div className="example-badge">सजीव उदाहरण</div>
              <h4>सिलाई मशीन का उदाहरण</h4>
              <p>
                अगर आप <strong>₹40,000 की सिलाई मशीन</strong> EMI पर लेते हैं और उससे हर महीने <strong>₹4,000–₹5,000 अतिरिक्त कमाई</strong> होती है, तो EMI आपके लिए कमाई का ज़रिया बन जाती है, बोझ नहीं।
              </p>
            </div>
          </div>

          <div className="grid-2col">
            {/* When EMI is beneficial */}
            <div className="guide-card">
              <h3>EMI कब लेना आपके लिए फायदेमंद है?</h3>
              <p>EMI केवल तीन मुख्य परिस्थितियों में आपके हित में होती है:</p>
              <ul className="styled-list">
                <li>
                  <strong>1. कमाई बढ़ाने के लिए:</strong>
                  <span>जैसे – ठेला, दुकान, गाय-भैंस, मशीन, छोटा व्यापार।</span>
                </li>
                <li>
                  <strong>2. ज़रूरी संपत्ति बनाने के लिए:</strong>
                  <span>जैसे – घर, दुकान, पक्की ज़मीन।</span>
                </li>
                <li>
                  <strong>3. अत्यावश्यक ज़रूरत में:</strong>
                  <span>जैसे – आकस्मिक इलाज, बच्चों की उच्च शिक्षा।</span>
                </li>
              </ul>
              <div className="alert-box warn">
                ⚠️ अगर EMI लेने से आपकी आमदनी या सुरक्षा नहीं बढ़ रही, तो वह EMI आपके लिए सही नहीं है।
              </div>
            </div>

            {/* 30% rule */}
            <div className="guide-card accent-card">
              <h3>EMI कितनी लें – ताकि कभी परेशानी न हो?</h3>
              <div className="rule-highlight">
                <span className="rule-tag">सबसे बड़ा नियम</span>
                <p className="rule-text">आपकी सभी EMI मिलाकर आपकी <strong>मासिक आमदनी के 30% से ज़्यादा</strong> नहीं होनी चाहिए।</p>
              </div>
              <div className="example-box">
                <div className="example-badge">हिसाब समझें</div>
                <p>अगर आपकी मासिक आमदनी <strong>₹15,000</strong> है, तो आपकी कुल EMI <strong>₹4,000–₹4,500</strong> तक ही सुरक्षित मानी जाती है।</p>
              </div>
              <p>इससे ज़्यादा EMI लेने पर:</p>
              <ul className="bullet-list">
                <li>घर का जरूरी खर्च बिगड़ता है</li>
                <li>परिवार में मानसिक तनाव बढ़ता है</li>
                <li>EMI छूटने और पेनल्टी का खतरा रहता है</li>
              </ul>
              <div className="golden-saying">
                “सही EMI वही है जो रात की नींद खराब न करे।”
              </div>
            </div>
          </div>

          <div className="grid-2col">
            {/* Why people fail to pay */}
            <div className="guide-card">
              <h3>लोग EMI क्यों नहीं भर पाते? (कड़वी सच्चाई)</h3>
              <p>अधिकतर लोग EMI इसलिए नहीं चूकते क्योंकि पैसा नहीं होता, बल्कि इसलिए चूकते हैं क्योंकि <strong>योजना नहीं होती।</strong></p>
              <div className="reasons-list">
                <div className="reason-item">❌ एक से ज़्यादा EMI बिना सोचे ले लेना</div>
                <div className="reason-item">❌ आमदनी और खर्च का सही हिसाब न रखना</div>
                <div className="reason-item">❌ समस्या होने पर संस्था या बैंक को बताने से डरना</div>
                <div className="reason-item">❌ यह सोचना – “अगले महीने देखेंगे”</div>
              </div>
              <div className="danger-quote">
                “EMI में सबसे बड़ा नुकसान चुप रहना और बात न करना होता है।”
              </div>
            </div>

            {/* Consequences vs Benefits */}
            <div className="guide-card">
              <h3>EMI न भरने के नुकसान vs समय पर भरने के फायदे</h3>
              <div className="compare-table">
                <div className="compare-col bad">
                  <h4>EMI चूकने पर नुकसान</h4>
                  <ul>
                    <li>भविष्य में कहीं भी लोन मिलना मुश्किल</li>
                    <li>गाँव और बाजार में साख व भरोसा कम होना</li>
                    <li>मानसिक तनाव और पारिवारिक झगड़ा</li>
                    <li>ज़रूरत के समय कोई साथ नहीं देता</li>
                  </ul>
                  <small className="crit-note">एक EMI की गलती, 5 साल का भरोसा तोड़ सकती है।</small>
                </div>
                <div className="compare-col good">
                  <h4>समय पर EMI भरने के फायदे</h4>
                  <ul>
                    <li>कंपनी व बैंक आप पर पूरा भरोसा करते हैं</li>
                    <li>अगली बार तुरंत और कम ब्याज पर लोन मिलता है</li>
                    <li>मुश्किल समय में बात सुनी जाती है</li>
                    <li>समाज में आपकी प्रतिष्ठा मज़बूत होती है</li>
                  </ul>
                  <small className="crit-note">EMI समय पर भरना = अपनी Financial Reputation मजबूत करना।</small>
                </div>
              </div>
            </div>
          </div>

          {/* What to do when problem occurs */}
          <div className="guide-card emergency-card">
            <h3>अगर किसी महीने परेशानी आए तो क्या करें?</h3>
            <p>अगर किसी महीने EMI देना मुश्किल हो जाए, तो घबराएँ नहीं:</p>
            <div className="emergency-steps">
              <div className="step-card">
                <span className="step-num">1</span>
                <strong>छुपाएँ नहीं, पहले बताएं</strong>
                <p>किस्त की तारीख आने से 4-5 दिन पहले अपने लोन अधिकारी या साथी सपोर्ट को सूचित करें।</p>
              </div>
              <div className="step-card">
                <span className="step-num">2</span>
                <strong>थोड़ा समय माँगें</strong>
                <p>अपनी वास्तविक समस्या बताकर उचित समय की मांग करें ताकि पेनल्टी से बचा जा सके।</p>
              </div>
              <div className="step-card">
                <span className="step-num">3</span>
                <strong>बातचीत से रास्ता निकालें</strong>
                <p>ईमानदारी से की गई बातचीत से हमेशा समाधान निकलता है।</p>
              </div>
            </div>
            <div className="safe-verdict">
              “जो ग्राहक ईमानदारी से बात करता है, उसके लिए रास्ता हमेशा निकलता है।”
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: 5 GOLDEN RULES WITH REAL LIFE EXAMPLES */}
      {activeTab === 'emi-rules' && (
        <section className="guide-section">
          <div className="section-intro-card">
            <h2>EMI को आसान बनाने के 5 छोटे नियम — उदाहरण के साथ</h2>
            <p className="lead-text">
              ये नियम किताबी नहीं, बल्कि हमारे समाज के आम परिवारों — रामू जी, श्याम, सीमा जी, मोहन और रमेश के जीवन से लिए गए वास्तविक सबक हैं।
            </p>
          </div>

          <div className="rules-cards-stack">
            {/* Rule 1 */}
            <article className="rule-card">
              <div className="rule-header">
                <span className="rule-badge">नियम 1️⃣</span>
                <h3>आमदनी आते ही EMI अलग रखें</h3>
              </div>
              <div className="rule-mindset">
                <strong>सोच बदलो:</strong> EMI <em>“बचा तो देंगे”</em> वाली चीज़ नहीं है, EMI <em>“पहले निकालो, फिर खर्च करो”</em> वाली चीज़ है।
              </div>
              <div className="case-study">
                <h4>रामू जी का उदाहरण (मज़दूरी व बचत)</h4>
                <p>
                  रामू जी रोज़ मज़दूरी करते हैं। जैसे ही हफ्ते के <strong>₹3,500</strong> मिले, उन्होंने तुरंत <strong>₹800 EMI के लिए अलग</strong> रख दिए। बाकी बचे पैसों से घर चलाया।
                </p>
                <div className="results-chips">
                  <span>✅ EMI कभी लेट नहीं हुई</span>
                  <span>✅ कोई मानसिक तनाव नहीं आया</span>
                  <span>✅ कंपनी का भरोसा बना रहा</span>
                </div>
                <div className="case-lesson">
                  💡 <strong>सीख:</strong> जो EMI को पहले निकालता है, वही आख़िर में चैन से सोता है।
                </div>
              </div>
            </article>

            {/* Rule 2 */}
            <article className="rule-card">
              <div className="rule-header">
                <span className="rule-badge">नियम 2️⃣</span>
                <h3>एक EMI खत्म हो, तभी दूसरी लें</h3>
              </div>
              <div className="rule-mindset">
                <strong>गलती कहाँ होती है?</strong> एक EMI चल रही होती है और लोग सोचते हैं – <em>“थोड़ा और ले लेते हैं, मैनेज हो जाएगा।”</em>
              </div>
              <div className="case-study">
                <h4>श्याम का उदाहरण (ओवर-बर्डन का शिकार)</h4>
                <div className="case-calc">
                  <p>श्याम के पास पहले से:</p>
                  <ul>
                    <li>बाइक EMI: ₹1,500</li>
                    <li>मोबाइल EMI: ₹800</li>
                    <li>फिर ₹2,000 की नई EMI और ले ली</li>
                  </ul>
                  <div className="calc-alert">
                    कुल EMI = <strong>₹4,300</strong> | जबकि मासिक आमदनी सिर्फ <strong>₹12,000</strong> थी (35% से अधिक)।
                  </div>
                </div>
                <div className="results-chips negative">
                  <span>❌ घर का सामान्य खर्च बिगड़ा</span>
                  <span>❌ दोनों EMI लेट हुईं</span>
                  <span>❌ मानसिक तनाव और समाज में बदनामी</span>
                </div>
                <div className="case-lesson">
                  💡 <strong>सीख:</strong> एक नाव में क्षमता से ज़्यादा बोझ डालोगे, तो नाव डूबेगी ही।
                </div>
              </div>
            </article>

            {/* Rule 3 */}
            <article className="rule-card">
              <div className="rule-header">
                <span className="rule-badge">नियम 3️⃣</span>
                <h3>EMI तारीख को सबसे ऊपर रखें</h3>
              </div>
              <div className="rule-mindset">
                <strong>याद रखें:</strong> EMI तारीख = ज़िम्मेदारी की तारीख।
              </div>
              <div className="case-study">
                <h4>सीमा जी का उदाहरण (अनुशासन की ताकत)</h4>
                <p>
                  सीमा जी को EMI हर महीने की <strong>10 तारीख</strong> को देनी होती है। वो हमेशा <strong>9 तारीख को ही पैसे तैयार</strong> रखती हैं। भले ही सब्ज़ी या बाज़ार का सामान अगले दिन लें, लेकिन EMI की तारीख कभी नहीं टालतीं।
                </p>
                <div className="results-chips">
                  <span>✅ कभी रिकवरी कॉल नहीं आया</span>
                  <span>✅ 100% साफ सिबिल रिकॉर्ड रहा</span>
                  <span>✅ अगली बार बिना झंझट लोन मिला</span>
                </div>
                <div className="case-lesson">
                  💡 <strong>सीख:</strong> जो EMI तारीख का सम्मान करता है, बाज़ार और संस्थाएं उसका सम्मान करती हैं।
                </div>
              </div>
            </article>

            {/* Rule 4 */}
            <article className="rule-card">
              <div className="rule-header">
                <span className="rule-badge">नियम 4️⃣</span>
                <h3>बिना ज़रूरत नई EMI न लें (दिखावे से बचें)</h3>
              </div>
              <div className="rule-mindset">
                <strong>सच्चाई:</strong> ज़रूरत (Need) और चाहत (Want) में फर्क समझिए।
              </div>
              <div className="case-study">
                <h4>मोहन का उदाहरण (दिखावे का नुकसान)</h4>
                <p>
                  मोहन का पुराना मोबाइल बिल्कुल ठीक चल रहा था। फिर भी उसने सिर्फ दोस्तों में दिखावे के लिए महंगा स्मार्टफोन EMI पर ले लिया।
                </p>
                <div className="results-chips negative">
                  <span>❌ 2 महीने बाद EMI भारी लगने लगी</span>
                  <span>❌ घर में रोज झगड़ा होने लगा</span>
                  <span>❌ मानसिक तनाव चरम पर पहुँचा</span>
                </div>
                <div className="case-lesson">
                  💡 <strong>सही सोच:</strong> EMI ज़रूरत के लिए हो, दिखावे के लिए नहीं।
                </div>
              </div>
            </article>

            {/* Rule 5 */}
            <article className="rule-card">
              <div className="rule-header">
                <span className="rule-badge">नियम 5️⃣</span>
                <h3>EMI को बोझ नहीं, जिम्मेदारी समझें</h3>
              </div>
              <div className="rule-mindset">
                <strong>सच्चाई:</strong> सही उद्देश्य से ली गई EMI दुश्मन नहीं, आपकी उन्नति का साधन है।
              </div>
              <div className="case-study">
                <h4>रमेश का उदाहरण (कमाई में तरक्की)</h4>
                <p>
                  रमेश ने EMI से सिलाई मशीन ली। हर महीने समय पर किस्त दी। 6 महीने के अंदर उसकी सिलाई से कमाई बढ़ गई। आज वही EMI उसकी तरक्की की सबसे बड़ी वजह बनी।
                </p>
                <div className="results-chips">
                  <span>✅ आत्मविश्वास कई गुना बढ़ा</span>
                  <span>✅ परिवार आर्थिक रूप से सुरक्षित हुआ</span>
                  <span>✅ समाज में इज़्ज़त और प्रतिष्ठा बनी</span>
                </div>
                <div className="case-lesson">
                  💡 <strong>सीख:</strong> EMI अगर जिम्मेदारी बन जाए, तो वही EMI आपके सुरक्षित भविष्य की सीढ़ी बन जाती है।
                </div>
              </div>
            </article>
          </div>

          <div className="guide-card final-words-card">
            <div className="final-badge">अंतिम बात — आपके लिए सबसे ज़रूरी</div>
            <p className="final-quote">
              “EMI आपके खिलाफ नहीं है। गलत EMI आपके खिलाफ होती है। सही EMI आपको आगे बढ़ाती है, आपकी इज़्ज़त बनाती है और आपके भविष्य को सुरक्षित करती है। और यही साथी का मकसद है — <strong>आपका फायदा, आपकी सुरक्षा, आपका भविष्य।</strong>”
            </p>
          </div>
        </section>
      )}

      {/* TAB 3: SELF-ASSESSMENT TEST */}
      {activeTab === 'test' && (
        <section className="guide-section">
          <div className="test-hero-card">
            <span className="test-badge">आत्म-मूल्यांकन (Self Assessment)</span>
            <h2>अपनी वित्तीय समझ को जानें, बेहतर भविष्य बनाएं</h2>
            <p className="lead-text">
              प्रिय उपयोगकर्ता, यह छोटा सा टेस्ट आपकी पैसों की समझ, ईमानदारी और कर्ज लेने की क्षमता को मापने में मदद करेगा। आपके सही जवाब आपको बैंकों और उधारदाताओं के साथ बेहतर संबंध बनाने में मदद करेंगे।
            </p>

            <div className="test-reasons-grid">
              <div className="reason-box">
                <span className="icon">📉</span>
                <h4>कम ब्याज दर</h4>
                <p>अगर आप कभी लोन लेना चाहेंगे, तो अच्छी वित्तीय आदतें आपको कम ब्याज दर पाने में मदद करेंगी।</p>
              </div>
              <div className="reason-box">
                <span className="icon">🤝</span>
                <h4>सटीक वित्तीय सलाह</h4>
                <p>ईमानदारी से दिए गए जवाब आपको वो वित्तीय सलाह दिलाएंगे जो आपके परिवार के लिए वास्तव में उपयोगी होगी।</p>
              </div>
              <div className="reason-box">
                <span className="icon">⏱️</span>
                <h4>केवल 5-7 मिनट</h4>
                <p>यह टेस्ट सिर्फ 5-7 मिनट का है, पर इसके परिणाम आपके लिए लंबे समय तक फायदेमंद साबित होंगे।</p>
              </div>
            </div>

            {/* The Pledge */}
            <div className="pledge-card">
              <div className="pledge-header">
                <span className="pledge-icon">✋</span>
                <h3>टेस्ट से पहले एक ईमानदार वादा करें</h3>
              </div>
              <blockquote className="pledge-quote">
                “मैं सभी सवालों के सच्चे और सही जवाब दूंगा/दूंगी, ताकि मुझे मेरे वित्तीय व्यवहार के बारे में सही जानकारी मिल सके।”
              </blockquote>
              <div className="pledge-actions">
                <button type="button" className="copy-btn" onClick={copyPledge}>
                  {copiedPledge ? '✓ वादा कॉपी हो गया' : '📋 वादा कॉपी करें'}
                </button>
                <span className="pledge-sub">आपका एक सही कदम आपके भविष्य को सुरक्षित बना सकता है!</span>
              </div>
            </div>

            {/* Honest Mirror */}
            <div className="mirror-card">
              <h3>अपने जीवन की सच्ची तस्वीर जानें — खुद से एक ईमानदार मुलाक़ात करें</h3>
              <p>
                यह परीक्षण सिर्फ सवालों का एक समूह नहीं है, यह एक आइना है — जो आपकी आर्थिक स्थिति और मानसिक सोच को दर्शाता है। जीवन की दौड़ में हम अक्सर खुद को समझना भूल जाते हैं। यह मूल्यांकन आपको अवसर देता है कि आप अपनी वर्तमान स्थिति को गहराई से समझें, अपनी मजबूती और कमज़ोरियों को पहचानें, और बेहतर भविष्य की ओर एक ठोस कदम बढ़ाएँ।
              </p>
              <div className="privacy-reassurance">
                🔒 <strong>पूर्ण गोपनीयता:</strong> आपके उत्तर आपको ही दिखाई देंगे। आपके आत्म मूल्यांकन के टेस्ट पूरा होने के बाद वास्तविक दर्पण आपके सामने होगा। निःसंकोच, निडर होकर, और सच्चे मन से उत्तर दें — क्योंकि सच्चाई ही बदलाव की पहली सीढ़ी है।
              </div>
              <div className="test-action-wrap">
                <a
                  href="https://sites.google.com/view/financial-knowledg/financial-health-test?authuser=0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="test-link-btn"
                >
                  <span>वित्तीय और मानसिक स्वास्थ्य मूल्यांकन परीक्षा शुरू करें →</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: FINANCIAL WORDS (GLOSSARY) */}
      {activeTab === 'glossary' && (
        <section className="guide-section">
          <div className="section-intro-card">
            <h2>वित्तीय शब्दकोष (Financial Words &amp; Terms)</h2>
            <p className="lead-text">
              निवेश, शेयर बाज़ार और कंपनी विश्लेषण के मुख्य शब्दों को सरल हिंदी भाषा में समझें:
            </p>
          </div>

          <div className="glossary-grid">
            {/* Market Cap */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">Market Cap</span>
                <span className="term-hi">मार्केट कैप</span>
              </div>
              <p>
                मार्केट कैप किसी कंपनी की <strong>कुल संपत्ति (बाज़ारी मूल्य)</strong> को दर्शाता है। यह जितना ज़्यादा होता है, निवेशकों (Investors) के लिए कंपनी उतनी ही स्थिर और सुरक्षित मानी जाती है।
              </p>
            </div>

            {/* ROE */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">ROE (Return on Equity)</span>
                <span className="term-hi">रिटर्न ऑन इक्विटी</span>
              </div>
              <p>
                रिटर्न ऑन इक्विटी का मतलब होता है कि आपने जो पैसा लगाया है, उस पर <strong>वार्षिक आधार (Annual base)</strong> पर कंपनी कितना प्रतिशत मुनाफ़ा या ब्याज कमा कर दे रही है।
              </p>
              <div className="term-tip">
                🇮🇳 भारत में <strong>20% से 25%</strong> का ROE बहुत अच्छा माना जाता है।
              </div>
            </div>

            {/* EPS */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">EPS (Earnings Per Share)</span>
                <span className="term-hi">अर्निंग पर शेयर</span>
              </div>
              <p>
                अर्निंग पर शेयर का मतलब होता है कि कंपनी आपको <strong>प्रति शेयर</strong> पर कितना मुनाफ़ा कमा कर दे रही है। यह अंक जितना ज्यादा होगा, शेयरधारक के लिए उतना ही अच्छा होता है।
              </p>
            </div>

            {/* Book Value */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">Book Value</span>
                <span className="term-hi">बुक वैल्यू</span>
              </div>
              <p>
                बुक वैल्यू का मतलब होता है कि अगर <strong>आज ही कंपनी बंद हो जाती है</strong>, तो सारी देनदारियाँ चुकाने के बाद आपको एक शेयर के बदले में कितना पैसा मिलेगा?
              </p>
              <div className="term-example">
                <strong>उदाहरण:</strong> अगर एक स्टॉक का बाज़ार मूल्य ₹500 है और उसकी बुक वैल्यू ₹300 है, तो कंपनी बंद होने पर प्रति शेयर ₹300 के हिसाब से आपको प्राप्त होगा।
              </div>
            </div>

            {/* P/B Ratio */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">P/B Ratio (Price-to-Book)</span>
                <span className="term-hi">प्राइस-टू-बुक रेशियो</span>
              </div>
              <p>
                P/B रेशियो का सीधा मतलब होता है कि आप ₹1 की वास्तविक संपत्ति के लिए बाज़ार में कितना गुना पैसा दे रहे हैं?
              </p>
              <div className="term-formula">
                <strong>गणना:</strong> शेयर का वर्तमान मूल्य ÷ बुक वैल्यू (Price / Book Value)
              </div>
              <div className="term-tip">
                👍 अगर यह अनुपात <strong>1 से 2 के बीच</strong> हो, तो इसे निवेश के लिए उचित और अच्छा माना जाता है।
              </div>
            </div>

            {/* P/E Ratio */}
            <div className="glossary-card">
              <div className="glossary-head">
                <span className="term-en">P/E Ratio (Price-to-Earnings)</span>
                <span className="term-hi">प्राइस-टू-अर्निंग रेशियो</span>
              </div>
              <p>
                P/E रेशियो का मतलब होता है कि कंपनी में <strong>₹1 का मुनाफ़ा कमाने के लिए</strong> आपको बाज़ार में कितने रुपये इन्वेस्ट करने होंगे।
              </p>
              <div className="term-formula">
                <strong>गणना:</strong> स्टॉक की कीमत ÷ प्रति शेयर आय (EPS)
              </div>
              <div className="term-example">
                <strong>उदाहरण:</strong> यदि किसी शेयर का भाव ₹50 है और EPS ₹10 है, तो P/E = 50 ÷ 10 = <strong>5</strong>।<br />
                अगर एक कंपनी का P/E 10 है और दूसरी का 30, तो 10 वाली कंपनी सस्ती लग सकती है, परंतु हमेशा <strong>सेक्टर-वाइज तुलना</strong> करनी चाहिए।
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: DECISION MAKING & PSYCHOLOGY (BIASES) */}
      {activeTab === 'psychology' && (
        <section className="guide-section">
          {/* Need vs Want & 3 Questions */}
          <div className="guide-card primary-border">
            <div className="card-badge">निर्णय का स्वर्णिम नियम</div>
            <h3>Need (ज़रूरत) बनाम Want (चाहत) में भेद करें</h3>
            <p>
              किसी भी व्यक्ति को कुछ भी खरीदने या नया कर्ज लेने से पहले इस बात पर गहरा मंथन करना चाहिए कि यह मेरी <strong>Need (ज़रूरत)</strong> है या केवल <strong>Want (चाहत)</strong> है। दोनों में अंतर पहचानना बहुत आवश्यक है।
            </p>
            <p className="muted-italic">
              ऐसा न हो कि भावनात्मक व मानसिक भटकाव (Emotional &amp; Mental Disorientation) के कारण आप गलत और भारी आर्थिक निर्णय ले बैठें।
            </p>

            <div className="subconscious-test">
              <h4>खुद से यह 3 सवाल अवश्य पूछें:</h4>
              <div className="three-questions-grid">
                <div className="q-card">
                  <span className="q-num">1</span>
                  <strong>I can deserve it</strong>
                  <p>क्या मैं इसके योग्य पात्र हूँ?</p>
                </div>
                <div className="q-card">
                  <span className="q-num">2</span>
                  <strong>I can achieve it</strong>
                  <p>क्या मैं इसको प्राप्त कर सकता हूँ?</p>
                </div>
                <div className="q-card">
                  <span className="q-num">3</span>
                  <strong>I can do it</strong>
                  <p>क्या मैं इसको पूर्ण कर सकता हूँ?</p>
                </div>
              </div>
              <div className="subconscious-note">
                💡 <strong>अंतिम कसौटी:</strong> अगर इन तीनों सवालों का जवाब आपके <em>Subconscious Mind (अंतर्मन)</em> से दृढ़तापूर्वक "हाँ" में आता है, तभी वह कदम उठाना चाहिए, अन्यथा रुक जाना ही समझदारी है।
              </div>
            </div>
          </div>

          {/* 4 Pillars of Rational Decision Making */}
          <div className="guide-card">
            <h3>कोई भी महत्वपूर्ण निर्णय या विचार लेने के 4 वैज्ञानिक आधार</h3>
            <div className="pillars-grid">
              <div className="pillar-item">
                <span className="pillar-badge">01</span>
                <h4>Scientific Reasoning</h4>
                <small>वैज्ञानिक तर्क</small>
                <p>तथ्यों और कार्य-कारण के आधार पर सोचना, बिना किसी अंधविश्वास के।</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-badge">02</span>
                <h4>Empirical Evidence</h4>
                <small>अनुभवजन्य साक्ष्य</small>
                <p>ऐसी कोई प्राकृतिक या वास्तविक जीवन में देखी गई घटना जिससे सीधा सीखने को मिलता हो।</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-badge">03</span>
                <h4>Rational Thought</h4>
                <small>तर्क संगत विचार</small>
                <p>किताबों के अध्ययन, प्रमाणिक डेटा और निष्पक्ष विश्लेषण के आधार पर लिया गया निर्णय।</p>
              </div>
              <div className="pillar-item">
                <span className="pillar-badge">04</span>
                <h4>Perpetual Feeling</h4>
                <small>शाश्वत भावना</small>
                <p>ऐसा गहरा और सच्चा भाव जो कभी समाप्त नहीं होता और अंतरआत्मा को शांति देता है।</p>
              </div>
            </div>
          </div>

          {/* Cognitive Biases Section */}
          <div className="guide-card">
            <div className="card-badge">मस्तिष्क की समझ</div>
            <h3>Cognitive Biases (संज्ञानात्मक पूर्वाग्रह) क्या होते हैं?</h3>
            <p>
              संज्ञानात्मक पूर्वाग्रह एक व्यवस्थित विचार प्रक्रिया है जो मानव मस्तिष्क की व्यक्तिगत अनुभव और वरीयताओं के फ़िल्टर के माध्यम से सूचना प्रसंस्करण को सरल बनाने की प्रवृत्ति के कारण होती है। यह मस्तिष्क का शॉर्टकट तंत्र है, परंतु इसकी सीमाएँ हमारे निर्णयों में भारी त्रुटियाँ पैदा कर सकती हैं।
            </p>

            <div className="biases-stack">
              {/* Bias 1: Hindsight */}
              <div className="bias-card">
                <div className="bias-header">
                  <span className="bias-tag">A</span>
                  <h4>Hindsight Bias (हिंडसाइट पूर्वाग्रह)</h4>
                </div>
                <p>
                  यह एक ऐसी मनोवैज्ञानिक घटना है जहाँ किसी घटना के घटित होने के बाद व्यक्ति को लगता है कि उसे तो पहले से ही सब पता था (<em>"यह तो मुझे पहले से ही पता था"</em>)।
                </p>
                <div className="bias-example">
                  <strong>उदाहरण:</strong> जब शेयर मार्केट गिर जाता है या कोई क्रिकेट टीम जीत जाती है, तो लोग कहते हैं — <em>"मुझे तो पहले से ही पता था कि यही होगा।"</em> निवेश में यह पूर्वाग्रह व्यक्ति को गलत ओवर-कॉन्फिडेंस या पछतावे (Remorse) में धकेल देता है।
                </div>
              </div>

              {/* Bias 2: Halo Effect */}
              <div className="bias-card">
                <div className="bias-header">
                  <span className="bias-tag">B</span>
                  <h4>Halo Effect (हैलो इफेक्ट)</h4>
                </div>
                <p>
                  किसी व्यक्ति या वस्तु के केवल एक गुण के आधार पर उसे सर्वगुण सम्पन्न मान लेना, अथवा एक कमी के कारण उसे पूरी तरह बेकार मान लेना — ये दोनों ही विचार गलत हैं।
                </p>
                <div className="bias-example">
                  <strong>उदाहरण:</strong> अगर कोई व्यक्ति सूट-बूट पहनकर अच्छी तरह बातचीत कर रहा है, तो ज़रूरी नहीं कि वह बुद्धिमान या ईमानदार ही हो। इसी प्रकार, एक छोटी बच्ची अपने पिता की हर बात को बिना परखे सही मान लेती है।
                </div>
              </div>

              {/* Bias 3: Fundamental Attribution Error */}
              <div className="bias-card">
                <div className="bias-header">
                  <span className="bias-tag">C</span>
                  <h4>Fundamental Attribution Error (मौलिक गुणारोपण त्रुटि)</h4>
                </div>
                <p>
                  जब हम किसी कारण और कार्य के बीच गलत संबंध (Attribution) बैठाने लगते हैं, तो यह त्रुटि होती है।
                </p>
                <div className="bias-example">
                  <strong>उदाहरण:</strong> जैसे कोई क्रिकेट मैच देखते समय टॉयलेट जाता है और उसी समय विकेट गिर जाता है। बार-बार ऐसा होने पर दिमाग यह मान लेता है कि <em>"मेरे उठते ही अशुभ हो जाता है।"</em> इसी प्रकार, किसी व्यक्ति के व्यवहार या असफलता को उसकी जाति, धर्म या क्षेत्र से जोड़ना अथवा उसकी सामाजिक व आर्थिक परिस्थितियों को अनदेखा करके केवल उस पर दोष मढ़ना एक गंभीर भूल है।
                </div>
              </div>

              {/* Bias 4: Placebo Effect */}
              <div className="bias-card">
                <div className="bias-header">
                  <span className="bias-tag">D</span>
                  <h4>Placebo Effect (प्लेसिबो प्रभाव)</h4>
                </div>
                <p>
                  प्लेसिबो इलाज का एक ऐसा जरिया है जो दिखने में तो वास्तविक लगता है पर वास्तव में कोई सक्रिय रासायनिक दवा नहीं होती। यह मरीज के मस्तिष्क पर सकारात्मक प्रभाव डालता है और मरीज सोचता है कि वह दवा से ठीक हो रहा है।
                </p>
                <div className="bias-example">
                  <strong>हार्वर्ड रिसर्च:</strong> अमेरिका के बेथ इज़राइल डेकोनेस मेडिकल सेंटर के प्रोफेसर टेड कप्तचुक (Ted Kaptchuk) ने हार्वर्ड हेल्थ को बताया कि प्लेसिबो का प्रभाव एक सकारात्मक सोच है जो यह भरोसा दिलाती है कि यह काम करेगा। यह मस्तिष्क और शरीर के बीच गहरा संबंध बनाता है।
                </div>
              </div>

              {/* Bias 5: Domino Effect */}
              <div className="bias-card">
                <div className="bias-header">
                  <span className="bias-tag">E</span>
                  <h4>Domino Effect (डोमिनो प्रभाव / श्रृंखला प्रतिक्रिया)</h4>
                </div>
                <p>
                  डोमिनो प्रभाव एक ऐसी श्रृंखला प्रतिक्रिया (Chain Reaction) है जहाँ एक छोटी घटना अपने से जुड़ी अन्य घटनाओं की पूरी श्रृंखला को जन्म दे देती है।
                </p>
                <div className="bias-example">
                  <strong>जीवन में लाभ:</strong> यदि आप अपने जीवन में सिर्फ एक अच्छी आदत (जैसे समय पर EMI अलग रखना या नियमित बचत) विकसित कर लेते हैं, तो डोमिनो प्रभाव के कारण आपके जीवन में <strong>10x (दस गुना) लाभ</strong> और सकारात्मक परिवर्तन देखने को मिलते हैं।
                </div>
              </div>
            </div>
          </div>

          {/* Social & Relationship Dynamics Note */}
          <div className="guide-card">
            <h3>सामाजिक संबंध और विवाह का दृष्टिकोण (Social Dynamics)</h3>
            <p>
              विवाह को देखने का हर व्यक्ति और समाज का अपना नज़रिया होता है:
            </p>
            <div className="marriage-views-grid">
              <div className="view-card">
                <strong>1. Social Contract &amp; Obligation</strong>
                <p>सामाजिक अनुबंध और दायित्व के रूप में देखना।</p>
              </div>
              <div className="view-card">
                <strong>2. Love &amp; Mutual Respect</strong>
                <p>प्रेम और परस्पर सम्मान के आधार पर खड़ा आजीवन संबंध।</p>
              </div>
              <div className="view-card">
                <strong>3. Holy Alliance</strong>
                <p>पवित्र धार्मिक गठबंधन के रूप में स्वीकारना।</p>
              </div>
              <div className="view-card">
                <strong>4. Transitory Nature</strong>
                <p>समय के साथ बदलने वाले व्यवहारिक संबंध के रूप में देखना।</p>
              </div>
            </div>
            <div className="survey-note">
              📊 <strong>सर्वेक्षण तथ्य:</strong> एक प्रसिद्ध डेटिंग सर्वे (Gleeden) के अनुसार वैवाहिक संबंधों में पिछले 5 वर्षों में 2.5 गुना बदलाव और नए खाते देखे गए हैं। किसी भी देश व समाज में जटिल मानवीय भावनाओं और सामाजिक नियमों के आधार पर इसे विभिन्न दृष्टिकोणों व कानूनी दायरों में देखा जाता है। अतः व्यक्तिगत जीवन में भावनात्मक संतुलन व स्थिरता रखना अत्यंत महत्वपूर्ण है।
            </div>
          </div>
        </section>
      )}

      {/* TAB 6: CALCULATOR GUIDE & RURAL INTEREST CALCULATOR */}
      {activeTab === 'calculator-guide' && (
        <section className="guide-section">
          <div className="section-intro-card">
            <h2>कैलकुलेटर गाइड एवं ग्रामीण भाइयों-बहनों के लिए ब्याज हिसाब</h2>
            <p className="lead-text">
              अब हिसाब लगाना हुआ आसान! न किसी पर निर्भर रहने की ज़रूरत, न किसी के बहकावे में आने की। खुद समझिए, खुद तय करिए — बिल्कुल आसान और मुफ़्त में।
            </p>
          </div>

          {/* Interactive Village Interest Calculator */}
          <div className="guide-card primary-border">
            <div className="card-badge">इंटरएक्टिव टूल</div>
            <h3>गाँव के भाइयों और बहनों के लिए ब्याज कैलकुलेटर (Interest Calculator)</h3>
            <p>
              यहाँ आप सीधा ब्याज (Simple Interest) और चक्रवृद्धि ब्याज (Compound Interest) दोनों का अंतर सीधे देख सकते हैं:
            </p>

            <div className="calc-inputs-grid">
              <label>
                <span>मूलधन (Principal Amount ₹):</span>
                <input
                  type="number"
                  value={calcPrincipal}
                  step="1000"
                  min="500"
                  onChange={e => setCalcPrincipal(Math.max(0, Number(e.target.value)))}
                />
              </label>

              <label>
                <span>ब्याज दर ({calcRateType === 'monthly' ? '% प्रति महीना (सैकड़ा)' : '% प्रति वर्ष'}):</span>
                <div className="rate-input-wrap">
                  <input
                    type="number"
                    value={calcRate}
                    step="0.25"
                    min="0"
                    onChange={e => setCalcRate(Math.max(0, Number(e.target.value)))}
                  />
                  <select
                    value={calcRateType}
                    onChange={e => setCalcRateType(e.target.value as any)}
                  >
                    <option value="monthly">% प्रति महीना (गाँव का ₹2 सैकड़ा आदि)</option>
                    <option value="yearly">% वार्षिक (बैंक दर)</option>
                  </select>
                </div>
              </label>

              <label>
                <span>समय अवधि (महीनों में):</span>
                <input
                  type="number"
                  value={calcMonths}
                  min="1"
                  max="120"
                  onChange={e => setCalcMonths(Math.max(1, Number(e.target.value)))}
                />
              </label>
            </div>

            <div className="calc-output-cards">
              <div className="calc-res-card simple">
                <small>सीधा ब्याज (Simple Interest)</small>
                <h3>₹{simpleInterest.toLocaleString('en-IN')}</h3>
                <p>कुल चुकाने योग्य राशि: <strong>₹{simpleTotal.toLocaleString('en-IN')}</strong></p>
                <span className="res-note">मूलधन पर सीधा तय दर से ब्याज जुड़ता है।</span>
              </div>

              <div className="calc-res-card compound">
                <small>चक्रवृद्धि ब्याज (Compound Interest)</small>
                <h3>₹{compoundInterest.toLocaleString('en-IN')}</h3>
                <p>कुल चुकाने योग्य राशि: <strong>₹{compoundTotal.toLocaleString('en-IN')}</strong></p>
                <span className="res-note">ब्याज पर भी ब्याज जुड़ता है।</span>
              </div>
            </div>
            <div className="calc-difference">
              💡 चक्रवृद्धि और सीधे ब्याज में अंतर: <strong>₹{Math.abs(compoundInterest - simpleInterest).toLocaleString('en-IN')}</strong> का है।
            </div>
          </div>

          {/* EMI Calculator Explanation */}
          <div className="guide-card">
            <h3>EMI पर लोन अब आसान!</h3>
            <p>
              हम आपके लिए लाए हैं आसान और सुविधाजनक EMI पर लोन की सुविधा, ताकि आप अपनी ज़रूरतों को बिना किसी अतिरिक्त बोझ के पूरा कर सकें। अब आप हमारे EMI कैलकुलेटर की मदद से पहले से जान सकते हैं कि हर महीने कितनी किस्त देनी होगी। इससे आप अपने बजट को बेहतर तरीके से प्लान कर सकते हैं और बिना किसी चिंता के लोन ले सकते हैं।
            </p>
            <div className="calc-redirect-box">
              <NavLink to="/calculator" className="guide-cta-btn primary">
                EMI कैलकुलेटर पर जाएँ और अपनी किस्त निकालें →
              </NavLink>
            </div>
          </div>

          {/* SIP Return Calculator Benefits */}
          <div className="guide-card">
            <div className="card-badge">भविष्य की बचत</div>
            <h3>SIP रिटर्न कैलकुलेटर क्या है और इसके फायदे</h3>
            <p>
              SIP रिटर्न कैलकुलेटर एक ऑनलाइन टूल है जो आपको सिस्टेमैटिक इन्वेस्टमेंट प्लान (SIP) के माध्यम से म्यूचुअल फंड में निवेश करने पर संभावित रिटर्न का अनुमान लगाने में मदद करता है। यह आपके मासिक निवेश, निवेश की अवधि और अनुमानित रिटर्न दर के आधार पर भविष्य में आपके निवेश की संभावित वैल्यू की गणना करता है।
            </p>

            <div className="sip-benefits-grid">
              <div className="sip-benefit-item">
                <span className="benefit-icon">📝</span>
                <div>
                  <strong>1. निवेश योजना बनाना आसान:</strong>
                  <p>यह अनुमान लगाने में मदद करता है कि वित्तीय लक्ष्यों को प्राप्त करने के लिए कितनी राशि निवेश करनी होगी।</p>
                </div>
              </div>

              <div className="sip-benefit-item">
                <span className="benefit-icon">📈</span>
                <div>
                  <strong>2. भविष्य की वैल्यू का अनुमान:</strong>
                  <p>इससे पता चलता है कि लंबी अवधि में आपका पैसा कितना रिटर्न दे सकता है।</p>
                </div>
              </div>

              <div className="sip-benefit-item">
                <span className="benefit-icon">🚀</span>
                <div>
                  <strong>3. निवेश की शुरुआत में मदद:</strong>
                  <p>आप छोटी मासिक बचत (जैसे ₹500 या ₹1,000) से शुरुआत करके बड़ा फंड बना सकते हैं।</p>
                </div>
              </div>

              <div className="sip-benefit-item">
                <span className="benefit-icon">🎯</span>
                <div>
                  <strong>4. निवेश की प्रगति का ट्रैक:</strong>
                  <p>आप देख सकते हैं कि रिटर्न कैसे बढ़ रहा है और समय के साथ संपत्ति कैसे निर्मित हो रही है।</p>
                </div>
              </div>

              <div className="sip-benefit-item">
                <span className="benefit-icon">🎓</span>
                <div>
                  <strong>5. वित्तीय लक्ष्यों को प्राप्त करना:</strong>
                  <p>बच्चों की उच्च शिक्षा, शादी, मकान या रिटायरमेंट के लिए धन जमा करने में मदद करता है।</p>
                </div>
              </div>

              <div className="sip-benefit-item">
                <span className="benefit-icon">💡</span>
                <div>
                  <strong>6. अनुमानित रिटर्न का सटीक पता:</strong>
                  <p>बाज़ार की औसत वृद्धि दर के आधार पर आपकी बचत को सही दिशा देता है।</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
