import { useNavigate } from 'react-router-dom';
import './Home.css';

const modalities = [
  {
    id: 'clinical', color: '#1565c0', lightBg: '#e8f0fe', auc: '0.9754', label: 'Clinical',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M11 9 C11 6,15 6,15 9 L15 16" stroke="#1565c0" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M25 9 C25 6,29 6,29 9 L29 16" stroke="#1565c0" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M15 16 C15 22,29 22,29 16" stroke="#1565c0" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <path d="M22 22 L22 33 C22 37,27 39,31 36 C35 33,35 27,31 25 C27 23,25 26,25 29 C25 32,28 33,30 31" stroke="#1565c0" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        <circle cx="30" cy="31" r="5" stroke="#1565c0" strokeWidth="1.8" fill="#e8f0fe"/>
        <line x1="30" y1="28.5" x2="30" y2="33.5" stroke="#1565c0" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="27.5" y1="31" x2="32.5" y2="31" stroke="#1565c0" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    dataset: '99,986 EHR patients', algorithm: 'XGBoost + Isotonic Calibration',
    features: ['Age, Sex, BMI', 'HbA1c & Blood Glucose', 'Hypertension & Heart Disease', 'Smoking History'],
  },
  {
    id: 'lifestyle', color: '#00695c', lightBg: '#e0f2f1', auc: '0.8241', label: 'Lifestyle',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="32" cy="9" r="4.5" stroke="#00695c" strokeWidth="1.8" fill="#e0f2f1"/>
        <path d="M30 14 L26 26" stroke="#00695c" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M29 17 L18 14.5" stroke="#00695c" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M28 20 L36 23" stroke="#00695c" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M26 26 L17 34 L14 42" stroke="#00695c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M26 26 L32 35 L38 40" stroke="#00695c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="7" y1="23" x2="15" y2="23" stroke="#00695c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="5" y1="28" x2="12" y2="28" stroke="#00695c" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
        <line x1="8" y1="33" x2="13" y2="33" stroke="#00695c" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
      </svg>
    ),
    dataset: '253,680 CDC BRFSS respondents', algorithm: 'LightGBM + Isotonic Calibration',
    features: ['Diet & Physical Activity', 'Smoking & Alcohol', 'Mental & Physical Health', 'Healthcare Access'],
  },
  {
    id: 'gene', color: '#6a1b9a', lightBg: '#f3e5f5', auc: '0.7679', label: 'Gene Expression',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M16 3 C21 11,29 11,33 19 C29 27,21 27,16 35 C21 43,29 43,33 48" stroke="#6a1b9a" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M33 3 C29 11,21 11,16 19 C21 27,29 27,33 35 C29 43,21 43,16 48" stroke="#9c27b0" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.6"/>
        <line x1="18" y1="10" x2="31" y2="10" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="15.5" y1="19" x2="33.5" y2="19" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="18" y1="28" x2="31" y2="28" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="15.5" y1="37" x2="33.5" y2="37" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="16" cy="19" r="2.5" fill="#f3e5f5" stroke="#6a1b9a" strokeWidth="1.5"/>
        <circle cx="33" cy="19" r="2.5" fill="#f3e5f5" stroke="#9c27b0" strokeWidth="1.5"/>
        <circle cx="16" cy="35" r="2.5" fill="#f3e5f5" stroke="#6a1b9a" strokeWidth="1.5"/>
        <circle cx="33" cy="35" r="2.5" fill="#f3e5f5" stroke="#9c27b0" strokeWidth="1.5"/>
      </svg>
    ),
    dataset: '116 blood RNA-seq samples', algorithm: 'XGBoost + Platt Scaling + WGCNA',
    features: ['8 WGCNA module eigengenes', 'Uploaded as CSV file', 'PCA-based computation', 'Turquoise, Blue, Yellow…'],
  },
];

const steps = [
  { n: '01', title: 'Choose your data', desc: 'Select which modalities you have available — clinical records, lifestyle survey, or gene expression file.' },
  { n: '02', title: 'Fill in the forms', desc: 'Complete the relevant sections. You can use any combination — even just one modality gives a valid prediction.' },
  { n: '03', title: 'Get your result', desc: 'Receive a calibrated risk probability with a full SHAP explanation of which factors drove the prediction.' },
];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="home">

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow-2" />
        <div className="hero-inner">
          <div className="hero-badge">Master's Project · Multimodal ML System</div>
          <h1 className="hero-title">
            Type 2 Diabetes<br />
            <span className="hero-accent">Risk Prediction</span>
          </h1>
          <p className="hero-subtitle">
            A late-fusion machine learning system that combines clinical records,
            lifestyle data, and gene expression to deliver a calibrated, explainable
            diabetes risk score.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/assess')}>
              Start Assessment
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button className="btn-secondary" onClick={() => navigate('/about')}>About the Project</button>
          </div>
          <div className="hero-stats">
            <div className="stat"><span className="stat-value">0.9897</span><span className="stat-label">Fusion AUC</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-value">3</span><span className="stat-label">ML Models</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-value">353K+</span><span className="stat-label">Training samples</span></div>
            <div className="stat-divider" />
            <div className="stat"><span className="stat-value">4</span><span className="stat-label">Input scenarios</span></div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="fusion-diagram">
            <div className="fd-node fd-clinical">Clinical<br/><small>p = 0.97</small></div>
            <div className="fd-node fd-lifestyle">Lifestyle<br/><small>p = 0.33</small></div>
            <div className="fd-node fd-gene">Gene<br/><small>p = 0.61</small></div>
            <div className="fd-center">
              <div className="fd-ring" />
              <div className="fd-label">Fusion<br/><strong>0.94</strong><br/><span>HIGH</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* DISCLAIMER */}
      <div className="disclaimer">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#b45309" strokeWidth="1.4"/><line x1="8" y1="5" x2="8" y2="9" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#b45309"/></svg>
        <strong>Research tool only.</strong> This system is NOT a medical diagnostic device and must not be used for clinical decision-making. Always consult a qualified healthcare professional.
      </div>

      {/* MODALITIES */}
      <section className="section">
        <div className="section-inner">
          <div className="section-header">
            <h2>Three independent models,<br/>one fused prediction</h2>
            <p>Each model is trained on a separate real-world dataset. Late fusion combines their outputs — like three specialist doctors each giving an independent opinion.</p>
          </div>
          <div className="modality-grid">
            {modalities.map((m) => (
              <div className="modality-card" key={m.id} style={{ '--accent': m.color, '--accent-bg': m.lightBg }}>
                <div className="mc-header">
                  <div className="mc-icon">{m.icon}</div>
                  <div>
                    <div className="mc-label">{m.label} Model</div>
                    <div className="mc-auc">AUC <strong>{m.auc}</strong></div>
                  </div>
                </div>
                <div className="mc-meta">
                  <span className="mc-tag">{m.dataset}</span>
                  <span className="mc-algo">{m.algorithm}</span>
                </div>
                <ul className="mc-features">{m.features.map(f => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="section-header">
            <h2>How it works</h2>
            <p>Provide whatever data you have — the system automatically selects the right fusion variant.</p>
          </div>
          <div className="steps-row">
            {steps.map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-num">{s.n}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUSION EXPLAINER */}
      <section className="section">
        <div className="section-inner fusion-explainer">
          <div className="fe-text">
            <h2>Why late fusion?</h2>
            <p>No single real patient exists simultaneously in all three datasets. Each model is trained independently on its own data — only the final calibrated probabilities are combined.</p>
            <p>The fusion meta-model (Logistic Regression) weights the modalities by their predictive power: Clinical contributes <strong>62.7%</strong>, Lifestyle <strong>22.4%</strong>, and Gene Expression <strong>14.9%</strong>.</p>
            <p>If you only have one or two modalities, the system falls back gracefully — clinical-only or lifestyle-only predictions use the raw calibrated probability directly.</p>
            <button className="btn-primary" onClick={() => navigate('/assess')}>
              Try the Assessment
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="fe-weights">
            <div className="fw-title">Fusion SHAP weights</div>
            {[
              { label: 'Clinical', pct: 62.7, color: '#1976d2' },
              { label: 'Lifestyle', pct: 22.4, color: '#00897b' },
              { label: 'Gene Expr.', pct: 14.9, color: '#8e24aa' },
            ].map(w => (
              <div className="fw-row" key={w.label}>
                <span className="fw-label">{w.label}</span>
                <div className="fw-bar-bg"><div className="fw-bar-fill" style={{ width: `${w.pct}%`, background: w.color }} /></div>
                <span className="fw-pct">{w.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>Glunex · T2D Multimodal Risk Prediction · MSc Thesis Project</p>
        <p className="footer-sub">Built with FastAPI · React · XGBoost · LightGBM · SHAP</p>
      </footer>

    </div>
  );
}
