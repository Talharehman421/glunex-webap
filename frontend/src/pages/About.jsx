import { useNavigate } from 'react-router-dom';
import './About.css';

const models = [
  {
    name: 'Clinical Model', color: '#1565c0', bg: '#e8f0fe', border: '#b8d0f8',
    algorithm: 'XGBoost + Isotonic Calibration', auc: '0.9754', dataset: '99,986 EHR patients',
    features: ['Age, Sex, BMI', 'HbA1c & Blood Glucose', 'Hypertension & Heart Disease', 'Smoking History', 'Clinical Notes (TF-IDF + SVD)'],
    note: 'SMOTE applied during training to handle class imbalance. Clinical notes processed via TF-IDF (167 vocab terms) reduced to 30 SVD components. 54 total features.',
  },
  {
    name: 'Lifestyle Model', color: '#00695c', bg: '#e0f2f1', border: '#80cbc4',
    algorithm: 'LightGBM + Isotonic Calibration', auc: '0.8241', dataset: '253,680 CDC BRFSS respondents',
    features: ['Diet & Physical Activity', 'Smoking & Alcohol consumption', 'Mental & Physical Health days', 'Healthcare access & cost barriers', '8 engineered composite features'],
    note: '19 features including 8 engineered composites (Health Behavior Score, Lifestyle Risk Index, etc.). Pipeline uses identity preprocessor + LightGBM with 400 trees.',
  },
  {
    name: 'Gene Expression Model', color: '#6a1b9a', bg: '#f3e5f5', border: '#ce93d8',
    algorithm: 'XGBoost + Platt Scaling', auc: '0.7679', dataset: '116 blood RNA-seq samples',
    features: ['8 WGCNA module eigengenes', 'MEturquoise, MEblue, MEyellow', 'MEgreen, MEpink, MEgreenyellow', 'MEsalmon, MEmagenta', 'PCA-based eigengene computation from 5,000 genes'],
    note: 'Leave-One-Out Cross-Validation used due to small sample size. Model trained in R (xgb.save) and loaded in Python. Platt scaling applied for calibration.',
  },
];

const limitations = [
  { icon: '🔬', title: 'Synthetic meta-model evaluation', desc: 'The fusion AUC of 0.9897 was evaluated on synthetic test patients constructed by sampling from probability pools — not real patients with all three modalities simultaneously. No real patient in this project has clinical, lifestyle, and gene expression data at the same time.' },
  { icon: '🧬', title: 'Small gene expression cohort', desc: 'The gene model was trained on only 116 RNA-seq samples. The 95% CI for AUC from 116 samples is approximately ±0.09. Results should be interpreted cautiously until replicated on a larger cohort.' },
  { icon: '📊', title: 'Minor data leakage in metabolic index', desc: 'The metabolic index normalisation (min/max values) was computed on the full dataset prior to the train/test split. As this feature is used only as an engineered input and not as the target, the impact on model evaluation is negligible.' },
  { icon: '⚠️', title: 'Not a clinical diagnostic tool', desc: 'This system is a research prototype built for an MSc thesis. It has not been validated in a clinical setting, has not undergone regulatory review, and must not be used to make medical decisions.' },
];

const stack = [
  { layer: 'Backend API',       tech: 'FastAPI (Python)',                    reason: 'Automatic Swagger docs, Pydantic validation, async support' },
  { layer: 'Clinical Model',    tech: 'XGBoost 2.1.1',                       reason: 'Gradient boosted trees for structured + text features' },
  { layer: 'Lifestyle Model',   tech: 'LightGBM 4.5.0',                      reason: 'Fast gradient boosting on tabular CDC survey data' },
  { layer: 'Gene Model',        tech: 'XGBoost (R → Python)',                reason: 'Trained in R via xgb.save(), loaded in Python via xgb.Booster' },
  { layer: 'Calibration',       tech: 'Isotonic Regression + Platt Scaling', reason: 'Converts raw model outputs to calibrated probabilities' },
  { layer: 'Explainability',    tech: 'SHAP 0.46.0',                         reason: 'TreeExplainer for per-feature contribution analysis' },
  { layer: 'Fusion Layer',      tech: 'Logistic Regression (sklearn)',        reason: 'Late fusion meta-model combining normalised modality scores' },
  { layer: 'Frontend',          tech: 'React + React Router',                reason: 'Multi-page SPA with conditional form rendering' },
  { layer: 'Charts',            tech: 'Recharts',                            reason: 'SHAP bar charts with custom tooltips' },
  { layer: 'Containerisation',  tech: 'Docker + Docker Compose',             reason: 'Reproducible one-command deployment' },
];

export default function About() {
  const navigate = useNavigate();
  return (
    <div className="about-page">

      <section className="about-hero">
        <div className="about-hero-glow" />
        <div className="about-hero-inner">
          <div className="about-badge">Master's Project · Multimodal ML System</div>
          <h1>About This Project</h1>
          <p>A multimodal machine learning system for Type 2 Diabetes risk prediction, combining clinical records, lifestyle survey data, and gene expression profiles through a late fusion architecture.</p>
        </div>
      </section>

      <div className="about-body">

        {/* OVERVIEW */}
        <section className="about-section">
          <h2>Project Overview</h2>
          <div className="overview-grid">
            <div className="overview-text">
              <p>This webapp is the practical component of an MSc thesis investigating whether multimodal data fusion improves Type 2 Diabetes risk prediction over single-modality approaches.</p>
              <p>The core hypothesis is that clinical biomarkers, lifestyle behaviours, and molecular gene expression profiles each capture a distinct dimension of diabetes risk — and that combining their outputs via a meta-model produces a more accurate and robust prediction than any single modality alone.</p>
              <p>The system uses <strong>late fusion</strong>: three completely independent models are trained on three separate real-world datasets, and only their final calibrated probability outputs are combined. This mirrors the clinical reality that no single patient exists in all three datasets simultaneously.</p>
              <p>The fusion meta-model achieves an AUC of <strong>0.9897</strong> on a held-out synthetic test set — an improvement of +0.0138 over the clinical model alone, with a Brier Score of 0.0272 (8.8× better than a weighted average baseline).</p>
            </div>
            <div className="overview-stats">
              {[
                { val: '0.9897', label: 'Fusion AUC' },
                { val: '0.0272', label: 'Brier Score' },
                { val: '353K+', label: 'Training samples' },
                { val: '19',    label: 'Model files' },
                { val: '3',     label: 'ML algorithms' },
                { val: '4',     label: 'Fusion variants' },
              ].map(s => (
                <div className="os-card" key={s.label}>
                  <span className="os-val">{s.val}</span>
                  <span className="os-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MODELS */}
        <section className="about-section">
          <h2>The Three Base Models</h2>
          <p className="section-sub">Each model is trained independently on its own dataset. Only the final calibrated probabilities are passed to the fusion layer.</p>
          <div className="models-list">
            {models.map(m => (
              <div className="model-card" key={m.name} style={{ '--mc': m.color, '--mcbg': m.bg, '--mcb': m.border }}>
                <div className="model-card-header">
                  <div>
                    <div className="model-name">{m.name}</div>
                    <div className="model-algo">{m.algorithm}</div>
                  </div>
                  <div className="model-auc-badge">AUC {m.auc}</div>
                </div>
                <div className="model-dataset">Dataset: <strong>{m.dataset}</strong></div>
                <div className="model-body">
                  <div className="model-features">
                    <div className="mf-label">Key features</div>
                    <ul>{m.features.map(f => <li key={f}>{f}</li>)}</ul>
                  </div>
                  <div className="model-note">{m.note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FUSION */}
        <section className="about-section">
          <h2>Late Fusion Methodology</h2>
          <div className="fusion-layout">
            <div className="fusion-text">
              <p>Late fusion was chosen because no single real patient exists simultaneously in all three training datasets. Training a joint model would require fabricating missing modalities or drastically reducing dataset size.</p>
              <p>Each model produces a calibrated probability independently. Before fusion, each probability is <strong>percentile-rank normalised</strong> against its training distribution — converting it to the question: "what fraction of the training population had a lower probability than this patient?"</p>
              <p>This normalisation is critical because a p_clinical of 0.5 and a p_lifestyle of 0.5 do not represent equivalent risk levels — the models were trained on entirely different populations with different base rates.</p>
              <p>The fusion meta-model (Logistic Regression, C=5.0) is trained on synthetic patients sampling from the three probability pools. SHAP attribution reveals the relative contribution of each modality to the final prediction:</p>
            </div>
            <div className="fusion-weights-card">
              <div className="fw-card-title">Fusion SHAP weights</div>
              {[
                { label: 'Clinical', pct: 62.7, color: '#1565c0' },
                { label: 'Lifestyle', pct: 22.4, color: '#00695c' },
                { label: 'Gene Expression', pct: 14.9, color: '#6a1b9a' },
              ].map(w => (
                <div className="fw-row" key={w.label}>
                  <span className="fw-label">{w.label}</span>
                  <div className="fw-bar-bg"><div className="fw-bar-fill" style={{ width: `${w.pct}%`, background: w.color }} /></div>
                  <span className="fw-pct">{w.pct}%</span>
                </div>
              ))}
              <div className="fw-variants">
                <div className="fv-title">Auto-selected fusion variants</div>
                {[
                  { inputs: 'Clinical + Lifestyle + Gene', variant: 'all3' },
                  { inputs: 'Clinical + Lifestyle', variant: 'clin_life' },
                  { inputs: 'Clinical only', variant: 'clin_only (passthrough)' },
                  { inputs: 'Lifestyle only', variant: 'life_only (passthrough)' },
                ].map(v => (
                  <div className="fv-row" key={v.variant}>
                    <span className="fv-inputs">{v.inputs}</span>
                    <span className="fv-variant">{v.variant}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* LIMITATIONS */}
        <section className="about-section">
          <h2>Known Limitations</h2>
          <p className="section-sub">Acknowledged in the thesis for scientific transparency.</p>
          <div className="limitations-list">
            {limitations.map((l, i) => (
              <div className="lim-item" key={i}>
                <span className="lim-icon">{l.icon}</span>
                <div>
                  <div className="lim-title">{l.title}</div>
                  <div className="lim-desc">{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TECH STACK */}
        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="stack-table">
            <div className="st-header">
              <span>Layer</span><span>Technology</span><span>Reason</span>
            </div>
            {stack.map((s, i) => (
              <div className="st-row" key={i}>
                <span className="st-layer">{s.layer}</span>
                <span className="st-tech">{s.tech}</span>
                <span className="st-reason">{s.reason}</span>
              </div>
            ))}
          </div>
        </section>

        {/* DEVELOPER */}
        <section className="about-section">
          <h2>Developer</h2>
          <div className="developer-card">
            <div className="dev-avatar">TR</div>
            <div className="dev-info">
              <div className="dev-name">Talha Rehman</div>
              <div className="dev-role">MSc Student · Developer &amp; Researcher</div>
              <p className="dev-desc">This project was designed, developed, and evaluated as part of an MSc thesis. All three machine learning models were trained from scratch on real-world datasets. The full-stack web application — including the FastAPI backend, React frontend, and Docker deployment — was built independently.</p>
              <div className="dev-contact">
                <a href="mailto:talharehmanhcs@gmail.com" className="contact-btn">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  talharehmanhcs@gmail.com
                </a>
                <span className="contact-note">For questions, feedback, or support regarding this project</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="about-cta">
          <button className="cta-btn" onClick={() => navigate('/assess')}>
            Try the Assessment
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <p>Use all three modalities for the most comprehensive prediction.</p>
        </div>

      </div>

      <footer className="about-footer">
        <p>T2D Multimodal Risk Prediction · Master's Project · 2026</p>
        <p>Built with FastAPI · React · XGBoost · LightGBM · SHAP · Docker</p>
      </footer>

    </div>
  );
}
