import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Assess.css';
import './Results.css';
import API_URL from '../api';
const AGE_CATEGORIES = [
  { value: 1, label: '18 – 24' }, { value: 2, label: '25 – 29' },
  { value: 3, label: '30 – 34' }, { value: 4, label: '35 – 39' },
  { value: 5, label: '40 – 44' }, { value: 6, label: '45 – 49' },
  { value: 7, label: '50 – 54' }, { value: 8, label: '55 – 59' },
  { value: 9, label: '60 – 64' }, { value: 10, label: '65 – 69' },
  { value: 11, label: '70 – 74' }, { value: 12, label: '75 – 79' },
  { value: 13, label: '80 or older' },
];

const defaultClinical = {
  age: '', sex: '', bmi: '', hba1c: '', blood_glucose: '',
  hypertension: '', heart_disease: '', smoking_history: '',
};

const defaultLifestyle = {
  chol_check: '', general_health: '', bmi: '', high_bp: '',
  high_chol: '', smoker: '', phys_activity: '', fruits: '',
  veggies: '', hvy_alcohol: '', ment_hlth: '', phys_hlth: '',
  diff_walk: '', any_healthcare: '', no_doc_cost: '',
  heart_disease: '', stroke: '', sex: '', age: '',
  education: '', income: '',
};

function SectionHeader({ num, color, title, subtitle, icon }) {
  return (
    <div className="section-hdr" style={{ '--sec-color': color }}>
      <div className="sec-icon">{icon}</div>
      <div>
        <div className="sec-num">Section {num} of 3</div>
        <h2 className="sec-title">{title}</h2>
        <p className="sec-sub">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div className="toggle-group">
      {[0, 1].map(v => (
        <button key={v} type="button"
          className={`toggle-btn${value === v ? ' active' : ''}`}
          onClick={() => onChange(v)}>
          {v === 0 ? 'No' : 'Yes'}
        </button>
      ))}
    </div>
  );
}

export default function Assess() {
  const navigate = useNavigate();
  const [clinical, setClinical] = useState(defaultClinical);
  const [lifestyle, setLifestyle] = useState(defaultLifestyle);
  const [geneFile, setGeneFile] = useState(null);
  const [useClinical, setUseClinical] = useState(true);
  const [useLifestyle, setUseLifestyle] = useState(true);
  const [useGene, setUseGene] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { state } = useLocation();
useEffect(() => {
  setClinical(defaultClinical);
  setLifestyle(defaultLifestyle);
  setGeneFile(null);
  setUseClinical(true);
  setUseLifestyle(true);
  setUseGene(false);
  setError('');
}, [state?.reset]);

  const sc = (f) => (v) => setClinical(p => ({ ...p, [f]: v }));
  const sl = (f) => (v) => setLifestyle(p => ({ ...p, [f]: v }));

  const clinicalDone = !useClinical || Object.values(clinical).every(v => v !== '');
  const lifestyleDone = !useLifestyle || Object.values(lifestyle).every(v => v !== '');
  const geneDone = !useGene || geneFile !== null;
  const anySelected = useClinical || useLifestyle || useGene;
  const canSubmit = anySelected && clinicalDone && lifestyleDone && geneDone;

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      let result;
      if (useGene && geneFile) {
        const fd = new FormData();
fd.append('file', geneFile);
if (useClinical) fd.append('clinical', JSON.stringify(buildClinical()));
if (useLifestyle) fd.append('lifestyle', JSON.stringify(buildLifestyle()));
        const res = await fetch(`${API_URL}/predict/gene`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        result = await res.json();
      } else {
        const body = {};
        if (useClinical) body.clinical = buildClinical();
        if (useLifestyle) body.lifestyle = buildLifestyle();
        const res = await fetch(`${API_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        result = await res.json();
      }
      navigate('/results', { state: { result } });
    } catch (e) {
      setError('Could not reach the backend. Make sure the FastAPI server is running on http://127.0.0.1:8000');
    } finally {
      setLoading(false);
    }
  }

  function buildClinical() {
    return {
      age: Number(clinical.age), sex: clinical.sex,
      bmi: Number(clinical.bmi), hba1c: Number(clinical.hba1c),
      blood_glucose: Number(clinical.blood_glucose),
      hypertension: Number(clinical.hypertension),
      heart_disease: Number(clinical.heart_disease),
      smoking_history: clinical.smoking_history,
      clinical_notes: '',
    };
  }

  function buildLifestyle() {
    return {
      chol_check: Number(lifestyle.chol_check),
      general_health: Number(lifestyle.general_health),
      bmi: Number(lifestyle.bmi),
      high_bp: Number(lifestyle.high_bp),
      high_chol: Number(lifestyle.high_chol),
      smoker: Number(lifestyle.smoker),
      phys_activity: Number(lifestyle.phys_activity),
      fruits: Number(lifestyle.fruits),
      veggies: Number(lifestyle.veggies),
      hvy_alcohol: Number(lifestyle.hvy_alcohol),
      ment_hlth: Number(lifestyle.ment_hlth),
      phys_hlth: Number(lifestyle.phys_hlth),
      diff_walk: Number(lifestyle.diff_walk),
      any_healthcare: Number(lifestyle.any_healthcare),
      no_doc_cost: Number(lifestyle.no_doc_cost),
      heart_disease: Number(lifestyle.heart_disease),
      stroke: Number(lifestyle.stroke),
      sex: Number(lifestyle.sex),
      age: Number(lifestyle.age),
      education: Number(lifestyle.education),
      income: Number(lifestyle.income),
    };
  }

  return (
    <div className="assess-page">

      <div className="assess-header">
        <div className="assess-header-inner">
          <h1>Risk Assessment</h1>
          <p>Fill in the sections below using whatever data you have. The system automatically selects the correct prediction variant based on which modalities you provide.</p>
        </div>
      </div>

      {/* Modality selector */}
      <div className="modality-bar">
        <div className="mb-inner">
          <span className="mb-label">Include modalities:</span>
          <div className="mb-chips">
            {[
              { key: 'clinical', label: 'Clinical', color: '#1565c0', state: useClinical, set: setUseClinical },
              { key: 'lifestyle', label: 'Lifestyle', color: '#00695c', state: useLifestyle, set: setUseLifestyle },
              { key: 'gene', label: 'Gene Expression', color: '#6a1b9a', state: useGene, set: setUseGene },
            ].map(m => (
              <button key={m.key} type="button"
                className={`mb-chip${m.state ? ' on' : ''}`}
                style={{ '--c': m.color }}
                onClick={() => m.set(v => !v)}>
                <span className="chip-dot" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="assess-body">

        {/* CLINICAL */}
        {useClinical && (
          <section className="form-section sec-clinical">
            <SectionHeader num={1} color="#1565c0" title="Clinical Data"
              subtitle="Standard medical record features — from a patient's EHR or recent bloodwork."
              icon={<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="3" y="2" width="20" height="22" rx="3" stroke="#1565c0" strokeWidth="1.6"/><line x1="7" y1="8" x2="19" y2="8" stroke="#1565c0" strokeWidth="1.4" strokeLinecap="round"/><line x1="7" y1="12" x2="19" y2="12" stroke="#1565c0" strokeWidth="1.4" strokeLinecap="round"/><line x1="7" y1="16" x2="14" y2="16" stroke="#1565c0" strokeWidth="1.4" strokeLinecap="round"/></svg>}
            />
            <div className="form-grid">
              <Field label="Age" hint="Years (0–120)">
                <input className="inp" type="number" min="0" max="120" placeholder="e.g. 45"
                  value={clinical.age} onChange={e => sc('age')(e.target.value)} />
              </Field>
              <Field label="Sex">
                <select className="inp" value={clinical.sex} onChange={e => sc('sex')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="BMI" hint="Body Mass Index (10–80)">
                <input className="inp" type="number" step="0.1" min="10" max="80" placeholder="e.g. 28.5"
                  value={clinical.bmi} onChange={e => sc('bmi')(e.target.value)} />
              </Field>
              <Field label="HbA1c Level" hint="Glycated haemoglobin % (3–20)">
                <input className="inp" type="number" step="0.1" min="3" max="20" placeholder="e.g. 6.8"
                  value={clinical.hba1c} onChange={e => sc('hba1c')(e.target.value)} />
              </Field>
              <Field label="Blood Glucose" hint="mg/dL (50–500)">
                <input className="inp" type="number" min="50" max="500" placeholder="e.g. 125"
                  value={clinical.blood_glucose} onChange={e => sc('blood_glucose')(e.target.value)} />
              </Field>
              <Field label="Smoking History">
                <select className="inp" value={clinical.smoking_history} onChange={e => sc('smoking_history')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                  <option value="ever">Ever</option>
                  <option value="not current">Not Current</option>
                  <option value="No Info">No Info</option>
                </select>
              </Field>
              <Field label="Hypertension">
                <Toggle value={clinical.hypertension === '' ? null : Number(clinical.hypertension)} onChange={sc('hypertension')} />
              </Field>
              <Field label="Heart Disease">
                <Toggle value={clinical.heart_disease === '' ? null : Number(clinical.heart_disease)} onChange={sc('heart_disease')} />
              </Field>
            </div>
          </section>
        )}

        {/* LIFESTYLE */}
        {useLifestyle && (
          <section className="form-section sec-lifestyle">
            <SectionHeader num={2} color="#00695c" title="Lifestyle Data"
              subtitle="Based on the CDC BRFSS health survey. Answer as accurately as possible."
              icon={<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="#00695c" strokeWidth="1.6"/><path d="M13 7v6l3.5 2" stroke="#00695c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            />
            <div className="form-grid">
              <Field label="Age Group">
                <select className="inp" value={lifestyle.age} onChange={e => sl('age')(e.target.value)}>
                  <option value="">Select…</option>
                  {AGE_CATEGORIES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>
              <Field label="Sex">
                <select className="inp" value={lifestyle.sex} onChange={e => sl('sex')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="0">Female</option>
                  <option value="1">Male</option>
                </select>
              </Field>
              <Field label="BMI" hint="Body Mass Index (10–80)">
                <input className="inp" type="number" step="0.1" min="10" max="80" placeholder="e.g. 29.2"
                  value={lifestyle.bmi} onChange={e => sl('bmi')(e.target.value)} />
              </Field>
              <Field label="General Health" hint="1 = Excellent · 5 = Poor">
                <select className="inp" value={lifestyle.general_health} onChange={e => sl('general_health')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="1">1 — Excellent</option>
                  <option value="2">2 — Very Good</option>
                  <option value="3">3 — Good</option>
                  <option value="4">4 — Fair</option>
                  <option value="5">5 — Poor</option>
                </select>
              </Field>
              <Field label="Education Level">
                <select className="inp" value={lifestyle.education} onChange={e => sl('education')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="1">1 — Never attended school</option>
                  <option value="2">2 — Elementary</option>
                  <option value="3">3 — Some high school</option>
                  <option value="4">4 — High school graduate</option>
                  <option value="5">5 — Some college</option>
                  <option value="6">6 — College graduate</option>
                </select>
              </Field>
              <Field label="Income Level">
                <select className="inp" value={lifestyle.income} onChange={e => sl('income')(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="1">1 — Less than $10,000</option>
                  <option value="2">2 — $10,000 – $15,000</option>
                  <option value="3">3 — $15,000 – $20,000</option>
                  <option value="4">4 — $20,000 – $25,000</option>
                  <option value="5">5 — $25,000 – $35,000</option>
                  <option value="6">6 — $35,000 – $50,000</option>
                  <option value="7">7 — $50,000 – $75,000</option>
                  <option value="8">8 — $75,000 or more</option>
                </select>
              </Field>
              <Field label="Mental Health Days" hint="Poor mental health days in past 30 (0–30)">
                <input className="inp" type="number" min="0" max="30" placeholder="e.g. 5"
                  value={lifestyle.ment_hlth} onChange={e => sl('ment_hlth')(e.target.value)} />
              </Field>
              <Field label="Physical Health Days" hint="Poor physical health days in past 30 (0–30)">
                <input className="inp" type="number" min="0" max="30" placeholder="e.g. 3"
                  value={lifestyle.phys_hlth} onChange={e => sl('phys_hlth')(e.target.value)} />
              </Field>
              <Field label="High Blood Pressure">
                <Toggle value={lifestyle.high_bp === '' ? null : Number(lifestyle.high_bp)} onChange={sl('high_bp')} />
              </Field>
              <Field label="High Cholesterol">
                <Toggle value={lifestyle.high_chol === '' ? null : Number(lifestyle.high_chol)} onChange={sl('high_chol')} />
              </Field>
              <Field label="Cholesterol Check (past 5 years)">
                <Toggle value={lifestyle.chol_check === '' ? null : Number(lifestyle.chol_check)} onChange={sl('chol_check')} />
              </Field>
              <Field label="Smoker">
                <Toggle value={lifestyle.smoker === '' ? null : Number(lifestyle.smoker)} onChange={sl('smoker')} />
              </Field>
              <Field label="Physical Activity (past 30 days)">
                <Toggle value={lifestyle.phys_activity === '' ? null : Number(lifestyle.phys_activity)} onChange={sl('phys_activity')} />
              </Field>
              <Field label="Fruit Intake (daily)">
                <Toggle value={lifestyle.fruits === '' ? null : Number(lifestyle.fruits)} onChange={sl('fruits')} />
              </Field>
              <Field label="Vegetable Intake (daily)">
                <Toggle value={lifestyle.veggies === '' ? null : Number(lifestyle.veggies)} onChange={sl('veggies')} />
              </Field>
              <Field label="Heavy Alcohol Consumption">
                <Toggle value={lifestyle.hvy_alcohol === '' ? null : Number(lifestyle.hvy_alcohol)} onChange={sl('hvy_alcohol')} />
              </Field>
              <Field label="Any Healthcare Coverage">
                <Toggle value={lifestyle.any_healthcare === '' ? null : Number(lifestyle.any_healthcare)} onChange={sl('any_healthcare')} />
              </Field>
              <Field label="Could Not See Doctor Due to Cost">
                <Toggle value={lifestyle.no_doc_cost === '' ? null : Number(lifestyle.no_doc_cost)} onChange={sl('no_doc_cost')} />
              </Field>
              <Field label="Difficulty Walking">
                <Toggle value={lifestyle.diff_walk === '' ? null : Number(lifestyle.diff_walk)} onChange={sl('diff_walk')} />
              </Field>
              <Field label="Heart Disease or Attack">
                <Toggle value={lifestyle.heart_disease === '' ? null : Number(lifestyle.heart_disease)} onChange={sl('heart_disease')} />
              </Field>
              <Field label="Stroke">
                <Toggle value={lifestyle.stroke === '' ? null : Number(lifestyle.stroke)} onChange={sl('stroke')} />
              </Field>
            </div>
          </section>
        )}

        {/* GENE */}
        {useGene && (
          <section className="form-section sec-gene">
            <SectionHeader num={3} color="#6a1b9a" title="Gene Expression Data"
              subtitle="Upload a blood RNA-seq CSV file. Rows = genes, columns = samples."
              icon={<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M8 3c0 3.5 5 3.5 5 7s-5 3.5-5 7" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/><path d="M16 3c0 3.5-5 3.5-5 7s5 3.5 5 7" stroke="#6a1b9a" strokeWidth="1.6" strokeLinecap="round"/><line x1="6" y1="8" x2="18" y2="8" stroke="#6a1b9a" strokeWidth="1.2" strokeLinecap="round"/><line x1="6" y1="13" x2="18" y2="13" stroke="#6a1b9a" strokeWidth="1.2" strokeLinecap="round"/><line x1="6" y1="18" x2="18" y2="18" stroke="#6a1b9a" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            />
            <div className="gene-upload-area">
              <div className={`drop-zone${geneFile ? ' has-file' : ''}`}
                onClick={() => document.getElementById('gene-input').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setGeneFile(f); }}>
                {geneFile ? (
                  <>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="3" width="22" height="26" rx="3" fill="#f3e5f5" stroke="#9c27b0" strokeWidth="1.5"/><path d="M9 12h14M9 17h14M9 22h9" stroke="#9c27b0" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <p className="dz-filename">{geneFile.name}</p>
                    <p className="dz-size">{(geneFile.size / 1024).toFixed(1)} KB</p>
                    <button type="button" className="dz-remove" onClick={e => { e.stopPropagation(); setGeneFile(null); }}>Remove file</button>
                  </>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 28V14M14 20l6-6 6 6" stroke="#6a1b9a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="4" width="32" height="32" rx="8" stroke="#ce93d8" strokeWidth="1.2" strokeDasharray="4 3"/></svg>
                    <p className="dz-main">Drop CSV here or <span>click to browse</span></p>
                    <p className="dz-sub">Rows = gene identifiers · Columns = samples · Min 10 genes required</p>
                  </>
                )}
              </div>
              <input id="gene-input" type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setGeneFile(e.target.files[0]); }} />
              <div className="gene-info-box">
                <p><strong>Expected format:</strong> First column = gene symbols or Ensembl IDs. Remaining columns = sample expression values.</p>
                <p><strong>Note:</strong> The system uses WGCNA module assignments to compute 8 eigengenes via PCA. A coverage warning will appear if any module has &lt;70% gene coverage.</p>
              </div>
            </div>
          </section>
        )}

        {/* SUBMIT */}
        <div className="submit-area">
          {error && <div className="error-banner">⚠ {error}</div>}
          {!canSubmit && anySelected && (
            <p className="submit-hint">Complete all fields in the selected sections to enable prediction.</p>
          )}
          <button type="button" className={`submit-btn${canSubmit ? ' ready' : ''}`}
            disabled={!canSubmit || loading} onClick={handleSubmit}>
            {loading
              ? <><span className="spinner" /> Running prediction…</>
              : <>Run Prediction <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></>
            }
          </button>
          <p className="submit-disclaimer">Research tool only · Not a medical diagnostic device</p>
        </div>

      </div>
    </div>
  );
}
