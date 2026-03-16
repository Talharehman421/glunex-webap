import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import './Results.css';

const RISK_CONFIG = {
  LOW:      { color: '#276749', bg: '#f0fff4', border: '#9ae6b4', label: 'Low Risk',      desc: 'The model predicts a low probability of Type 2 Diabetes based on the data provided.' },
  MODERATE: { color: '#b7791f', bg: '#fffbeb', border: '#f6e05e', label: 'Moderate Risk', desc: 'The model detects moderate risk indicators. Consider discussing these results with a healthcare provider.' },
  HIGH:     { color: '#c53030', bg: '#fff5f5', border: '#feb2b2', label: 'High Risk',     desc: 'The model detects significant risk indicators. This does not constitute a diagnosis — consult a qualified clinician.' },
};

const MODALITY_META = {
  clinical:  { label: 'Clinical Model',         color: '#1565c0', bg: '#e8f0fe', key: 'p_clinical' },
  lifestyle: { label: 'Lifestyle Model',         color: '#00695c', bg: '#e0f2f1', key: 'p_lifestyle' },
  gene:      { label: 'Gene Expression Model',   color: '#6a1b9a', bg: '#f3e5f5', key: 'p_gene' },
};

const VARIANT_LABELS = {
  clin_only:  'Clinical only',
  life_only:  'Lifestyle only',
  clin_life:  'Clinical + Lifestyle',
  all3:       'Clinical + Lifestyle + Gene',
};

const WELLNESS_GUIDELINES = [
  {
    category: 'Diet & Nutrition',
    color: '#00695c',
    bg: '#e0f2f1',
    icon: '🥗',
    tips: [
      'Choose whole grains (brown rice, oats, wholemeal bread) over refined carbohydrates',
      'Fill half your plate with non-starchy vegetables at every meal',
      'Limit added sugars — avoid sugary drinks, sweets, and processed foods',
      'Include healthy fats from nuts, seeds, avocado, and olive oil',
      'Eat regular meals at consistent times to help stabilise blood sugar',
    ],
  },
  {
    category: 'Physical Activity',
    color: '#1565c0',
    bg: '#e8f0fe',
    icon: '🏃',
    tips: [
      'Aim for at least 150 minutes of moderate aerobic activity per week (e.g. brisk walking)',
      'Include resistance/strength training at least twice a week',
      'Break up long periods of sitting — stand or walk briefly every 30–60 minutes',
      'Even short walks after meals can help manage blood glucose levels',
      'Find activities you enjoy — consistency matters more than intensity',
    ],
  },
  {
    category: 'Weight Management',
    color: '#b7791f',
    bg: '#fffbeb',
    icon: '⚖️',
    tips: [
      'A modest weight loss of 5–10% of body weight can significantly reduce diabetes risk',
      'Focus on gradual, sustainable changes rather than rapid weight loss',
      'Monitor portion sizes — use smaller plates and bowls',
      'Avoid skipping meals, which can lead to overeating later',
    ],
  },
  {
    category: 'Lifestyle Habits',
    color: '#6a1b9a',
    bg: '#f3e5f5',
    icon: '💤',
    tips: [
      'Aim for 7–9 hours of quality sleep per night — poor sleep affects insulin sensitivity',
      'Manage stress through relaxation techniques, mindfulness, or regular exercise',
      'Avoid or limit alcohol consumption',
      'If you smoke, seek support to quit — smoking significantly increases diabetes risk',
      'Stay well hydrated — prefer water over sugary or caffeinated drinks',
    ],
  },
  {
    category: 'Health Monitoring',
    color: '#c53030',
    bg: '#fff5f5',
    icon: '🩺',
    tips: [
      'Have your blood glucose (HbA1c) checked regularly if you are at risk',
      'Monitor blood pressure and cholesterol levels annually',
      'Attend regular health check-ups even if you feel well',
      'Know the symptoms of high blood sugar: increased thirst, frequent urination, fatigue',
      'Keep a record of your health metrics over time to spot trends',
    ],
  },
];

function WellnessGuidelines() {
  return (
    <div className="wellness-block">
      <div className="wellness-header">
        <h2 className="ms-title">General Wellness Guidelines</h2>
        <div className="wellness-disclaimer">
          ℹ The information below is general health education only — it is not personalised medical advice. Always consult a qualified healthcare professional before making changes to your diet, exercise, or medication.
        </div>
      </div>
      <div className="wellness-grid">
        {WELLNESS_GUIDELINES.map(g => (
          <div className="wellness-card" key={g.category} style={{ '--wc': g.color, '--wcbg': g.bg }}>
            <div className="wc-header">
              <span className="wc-icon">{g.icon}</span>
              <span className="wc-title">{g.category}</span>
            </div>
            <ul className="wc-tips">
              {g.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaugeMeter({ value }) {
  const pct = Math.round(value * 100);
  const angle = -135 + (value * 270);
  const color = value < 0.3 ? '#276749' : value < 0.6 ? '#b7791f' : '#c53030';
  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 200 120" className="gauge-svg">
        {/* Track */}
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"/>
        {/* Fill */}
        <path d="M 20 110 A 80 80 0 1 1 180 110" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${value * 251.2} 251.2`} />
        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 110)`}>
          <line x1="100" y1="110" x2="100" y2="42" stroke="#0f1923" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="100" cy="110" r="5" fill="#0f1923"/>
        </g>
        {/* Labels */}
        <text x="16" y="128" fontSize="10" fill="#a0aec0" textAnchor="middle">0%</text>
        <text x="100" y="28" fontSize="10" fill="#a0aec0" textAnchor="middle">50%</text>
        <text x="184" y="128" fontSize="10" fill="#a0aec0" textAnchor="middle">100%</text>
      </svg>
      <div className="gauge-value" style={{ color }}>{pct}%</div>
      <div className="gauge-label">Final Risk Score</div>
    </div>
  );
}

function ShapChart({ shap_values, color, title }) {
  if (!shap_values) return null;
  const data = Object.entries(shap_values)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const v = payload[0].value;
      return (
        <div className="shap-tooltip">
          <p className="tt-name">{payload[0].payload.name}</p>
          <p className="tt-val" style={{ color: v >= 0 ? '#c53030' : '#276749' }}>
            {v >= 0 ? '+' : ''}{v.toFixed(4)}
          </p>
          <p className="tt-dir">{v >= 0 ? 'Increases risk' : 'Decreases risk'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="shap-section">
      <h3 className="shap-title" style={{ color }}>{title} — Feature Contributions (SHAP)</h3>
      <p className="shap-desc">Positive values push the prediction higher (more risk). Negative values push it lower.</p>
      <div className="shap-chart-wrap">
        <ResponsiveContainer width="100%" height={data.length * 38 + 40}>
          <BarChart data={data} layout="vertical" margin={{ left: 160, right: 60, top: 10, bottom: 10 }}>
            <CartesianGrid horizontal={false} stroke="#f0f4f8" />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#a0aec0' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={155} tick={{ fontSize: 12, fill: '#2d3748', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <ReferenceLine x={0} stroke="#cbd5e0" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.value >= 0 ? '#e53e3e' : '#276749'} fillOpacity={0.75 + Math.min(Math.abs(entry.value) * 0.3, 0.25)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state?.result) {
    return (
      <div className="results-empty">
        <p>No results to display.</p>
        <button className="back-btn" onClick={() => navigate('/assess')}>Go to Assessment</button>
      </div>
    );
  }

  const { result } = state;
  const risk = RISK_CONFIG[result.risk_category] || RISK_CONFIG.MODERATE;

  return (
    <div className="results-page">
      <div className="results-inner">

        {/* TOP BAR */}
        <div className="results-topbar">
          <button className="back-btn" onClick={() => navigate('/assess', { state: { reset: Date.now() } })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            New Assessment
          </button>
          <div className="variant-badge">{VARIANT_LABELS[result.variant_used] || result.variant_used}</div>
        </div>

        {/* RISK HEADER */}
        <div className="risk-header" style={{ '--rcolor': risk.color, '--rbg': risk.bg, '--rborder': risk.border }}>
          <div className="rh-left">
            <div className="risk-pill">{risk.label}</div>
            <h1 className="risk-score">{Math.round(result.p_final * 100)}%</h1>
            <p className="risk-prob">Final fusion probability: <strong>{result.p_final.toFixed(4)}</strong></p>
            <p className="risk-desc">{risk.desc}</p>
            <div className="disclaimer-inline">
              ⚠ Research tool only — not a medical diagnostic device
            </div>
          </div>
          <div className="rh-right">
            <GaugeMeter value={result.p_final} />
          </div>
        </div>

        {/* MODALITY CARDS */}
        <div className="modality-scores">
          <h2 className="ms-title">Per-modality probabilities</h2>
          <div className="ms-grid">
            {['clinical', 'lifestyle', 'gene'].map(key => {
              const data = result[key];
              if (!data) return null;
              const meta = MODALITY_META[key];
              const probVal = data[meta.key];
              return (
                <div className="ms-card" key={key} style={{ '--mc': meta.color, '--mcbg': meta.bg }}>
                  <div className="ms-label">{meta.label}</div>
                  <div className="ms-prob">{Math.round(probVal * 100)}%</div>
                  <div className="ms-bar-bg">
                    <div className="ms-bar-fill" style={{ width: `${probVal * 100}%`, background: meta.color }} />
                  </div>
                  <div className="ms-raw">calibrated: {probVal.toFixed(4)}</div>
                  {data.warnings?.length > 0 && (
                    <div className="ms-warnings">
                      {data.warnings.map((w, i) => <p key={i} className="ms-warn">{w}</p>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* NORMALISED SCORES */}
        {result.normalised_scores && Object.keys(result.normalised_scores).length > 0 && (
          <div className="norm-scores">
            <h2 className="ms-title">Normalised scores (percentile rank)</h2>
            <p className="ns-desc">These are used internally by the fusion model — they represent each probability's percentile rank against the training distribution. They are not shown as the primary score.</p>
            <div className="ns-grid">
              {Object.entries(result.normalised_scores).map(([k, v]) => (
                <div className="ns-item" key={k}>
                  <span className="ns-key">{k}</span>
                  <span className="ns-val">{(v * 100).toFixed(1)}th percentile</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHAP CHARTS */}
        <div className="shap-block">
          <h2 className="ms-title">SHAP Explanations — What drove these predictions?</h2>
          <p className="shap-intro">SHAP (SHapley Additive exPlanations) shows the contribution of each feature to the model's output. Features are shown in order of impact magnitude.</p>

          {result.clinical?.shap_values && (
            <ShapChart shap_values={result.clinical.shap_values} color="#1565c0" title="Clinical Model" />
          )}
          {result.lifestyle?.shap_values && (
            <ShapChart shap_values={result.lifestyle.shap_values} color="#00695c" title="Lifestyle Model" />
          )}
          {result.gene?.shap_values && (
            <ShapChart shap_values={result.gene.shap_values} color="#6a1b9a" title="Gene Expression Model" />
          )}
        </div>

        {/* WELLNESS GUIDELINES */}
        <WellnessGuidelines />

        {/* FOOTER */}
        <div className="results-footer">
          <button className="back-btn large" onClick={() => navigate('/assess', { state: { reset: Date.now() } })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Run Another Assessment
          </button>
          <p className="results-disc">This prediction was generated by a research-grade machine learning system. It does not constitute a medical diagnosis and should not be used for clinical decision-making. Always consult a qualified healthcare professional.</p>
        </div>

      </div>
    </div>
  );
}
