import { useState, useEffect, useRef } from 'react';
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

/* ─── Python snippet shown inside the modal ─────────────────────────────── */
const PYTHON_CODE = `"""
Glunex — Gene Expression CSV Maker
====================================
Reads two files downloaded from NCBI GEO and outputs a
single-sample CSV ready to upload to Glunex.

Requirements:  pip install pandas
Place this script in the same folder as your .gz files, then run:
    python make_gene_csv.py
"""
import os, gzip, pandas as pd
from io import StringIO

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
SOFT_FILE   = os.path.join(SCRIPT_DIR, "GSE9006_family.soft.gz")
MATRIX_FILE = os.path.join(SCRIPT_DIR, "GSE9006-GPL96_series_matrix.txt.gz")

# ── Step 1: Parse probe → gene symbol from SOFT file ──────────────────────
with gzip.open(SOFT_FILE, "rt", errors="ignore") as f:
    soft_lines = f.readlines()

in_gpl96, in_table, table_lines = False, False, []
for line in soft_lines:
    line = line.rstrip("\\n")
    if line.startswith("^PLATFORM = GPL96"):
        in_gpl96 = True; continue
    if in_gpl96 and line.startswith("^PLATFORM") and "GPL96" not in line:
        break
    if in_gpl96:
        if line == "!platform_table_begin": in_table = True; continue
        if line == "!platform_table_end":   in_table = False; continue
        if in_table: table_lines.append(line)

annot = pd.read_csv(StringIO("\\n".join(table_lines)), sep="\\t",
                    low_memory=False, quoting=3)
id_col     = annot.columns[0]
symbol_col = next(c for c in annot.columns
                  if "gene" in c.lower() and "symbol" in c.lower())
probe_gene = annot[[id_col, symbol_col]].copy()
probe_gene.columns = ["ProbeID", "GeneSymbol"]
probe_gene = probe_gene.dropna()
probe_gene["GeneSymbol"] = (probe_gene["GeneSymbol"]
                            .str.split(" /// ").str[0].str.strip())
probe_gene = probe_gene[probe_gene["GeneSymbol"] != ""]

# ── Step 2: Parse expression matrix ───────────────────────────────────────
with gzip.open(MATRIX_FILE, "rt", errors="ignore") as f:
    matrix_lines = f.readlines()

tbl_begin = next(i for i,l in enumerate(matrix_lines)
                 if "series_matrix_table_begin" in l)
tbl_end   = next(i for i,l in enumerate(matrix_lines)
                 if "series_matrix_table_end" in l)
expr = pd.read_csv(StringIO("".join(matrix_lines[tbl_begin+1:tbl_end])),
                   sep="\\t", low_memory=False, quoting=3)
expr.columns   = [c.strip('"') for c in expr.columns]
expr.rename(columns={expr.columns[0]: "ProbeID"}, inplace=True)
expr["ProbeID"] = expr["ProbeID"].astype(str).str.strip('"')

# ── Step 3: Map probes → genes, keep best probe per gene ─────────────────
merged = probe_gene.merge(expr, on="ProbeID", how="inner")
sample_cols = [c for c in merged.columns if c.startswith("GSM")]
for col in sample_cols:
    merged[col] = pd.to_numeric(merged[col], errors="coerce")
merged["mean_expr"] = merged[sample_cols].mean(axis=1)
merged = (merged.sort_values("mean_expr", ascending=False)
                .drop_duplicates("GeneSymbol")
                .drop(columns=["ProbeID","mean_expr"]))

# ── Step 4: Save one CSV per sample ───────────────────────────────────────
for gsm in sample_cols[:1]:          # change [:1] to save more samples
    out = merged[["GeneSymbol", gsm]].dropna()
    out.columns = ["Gene", gsm]
    out.to_csv(os.path.join(SCRIPT_DIR, f"{gsm}_expression.csv"), index=False)
    print(f"Saved: {gsm}_expression.csv  ({len(out):,} genes)")
`;

/* ─── Gene Instructions Modal ─────────────────────────────────────────────── */
function GeneInstructionsModal({ onClose }) {
  const overlayRef = useRef(null);
  const [activeTab, setActiveTab] = useState('format');

  /* Close on Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  /* Close on backdrop click */
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const tabs = [
    { id: 'format',   label: 'File Format' },
    { id: 'geo',      label: 'GEO Walkthrough' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'code',     label: 'Python Script' },
    { id: 'faq',      label: 'FAQ' },
  ];

  return (
    <div className="gim-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="gim-panel" role="dialog" aria-modal="true"
           aria-label="Gene expression upload instructions">

        {/* Header */}
        <div className="gim-header">
          <div className="gim-header-left">
            <div className="gim-header-icon">
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M8 3c0 3.5 5 3.5 5 7s-5 3.5-5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M16 3c0 3.5-5 3.5-5 7s5 3.5 5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                <line x1="6" y1="8" x2="18" y2="8" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="6" y1="13" x2="18" y2="13" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="6" y1="18" x2="18" y2="18" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="gim-title">Gene Expression Upload Guide</h2>
              <p className="gim-subtitle">Everything you need to prepare and upload your file</p>
            </div>
          </div>
          <button className="gim-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="gim-tabs">
          {tabs.map(t => (
            <button key={t.id}
              className={`gim-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="gim-body">

          {/* ── FORMAT ─────────────────────────────────────────────────── */}
          {activeTab === 'format' && (
            <div className="gim-content">
              <div className="gim-callout gim-callout-purple">
                <strong>Summary:</strong> A plain <code>.csv</code> file where the first column
                contains gene symbols and the second column contains expression values for one sample.
              </div>

              <h3 className="gim-h3">Required structure</h3>
              <div className="gim-table-wrap">
                <table className="gim-table">
                  <thead>
                    <tr><th>Gene</th><th>SAMPLE_01</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>GAPDH</td><td>8.42</td></tr>
                    <tr><td>TP53</td><td>6.17</td></tr>
                    <tr><td>INS</td><td>9.83</td></tr>
                    <tr><td>ACTB</td><td>10.21</td></tr>
                    <tr><td className="gim-muted" colSpan={2}>… (any number of additional genes)</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="gim-h3">Rules</h3>
              <div className="gim-rules-grid">
                {[
                  { icon: '①', title: 'Column 1 — Gene identifiers', body: 'Use HGNC gene symbols (e.g. GAPDH, TP53). Ensembl IDs are not supported. The header label does not matter.' },
                  { icon: '②', title: 'Column 2 — Expression values', body: 'Real numbers, typically log2-normalised in the range 6–12. Raw linear counts from MAS5.0 or similar are also accepted.' },
                  { icon: '③', title: 'Multi-sample files are fine', body: 'If your file has multiple sample columns, the pipeline uses only the first data column automatically.' },
                  { icon: '④', title: 'Minimum 10 genes required', body: 'Files with fewer than 10 genes will be rejected. For best results provide as many genes as your platform captures.' },
                  { icon: '⑤', title: '70% module coverage threshold', body: 'The model groups genes into 8 WGCNA modules. If fewer than 70% of a module\'s hub genes are present, an amber warning appears on your results.' },
                  { icon: '⑥', title: 'No normalisation needed from you', body: 'Upload the raw output from DESeq2, edgeR, limma, or GEO2R. The pipeline handles PCA compression internally.' },
                ].map(r => (
                  <div className="gim-rule-card" key={r.icon}>
                    <span className="gim-rule-num">{r.icon}</span>
                    <div>
                      <strong>{r.title}</strong>
                      <p>{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── GEO WALKTHROUGH ────────────────────────────────────────── */}
          {activeTab === 'geo' && (
            <div className="gim-content">
              <div className="gim-callout gim-callout-blue">
                <strong>NCBI GEO</strong> (Gene Expression Omnibus) is the free public database
                where thousands of blood RNA-seq and microarray datasets are deposited. This is
                the most realistic source of real patient gene expression data.
              </div>

              <h3 className="gim-h3">Step-by-step: download GSE9006 (recommended)</h3>
              <p className="gim-p">GSE9006 is the exact dataset used to validate this model — it contains blood microarray data from T2D patients and healthy controls on the Affymetrix GPL96 platform.</p>

              <div className="gim-steps">
                {[
                  {
                    n: '1',
                    title: 'Go to the GEO page',
                    body: <>Visit <a className="gim-link" href="https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE9006" target="_blank" rel="noreferrer">ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE9006</a></>,
                  },
                  {
                    n: '2',
                    title: 'Download the series matrix file',
                    body: 'Scroll to the bottom of the page. Under "Download family", click the link for GSE9006-GPL96_series_matrix.txt.gz and save it to your working folder.',
                  },
                  {
                    n: '3',
                    title: 'Download the SOFT annotation file',
                    body: 'On the same page, also download GSE9006_family.soft.gz — this maps probe IDs to gene symbols.',
                  },
                  {
                    n: '4',
                    title: 'Run the Python script',
                    body: 'Place both .gz files and the Python script (see "Python Script" tab) in the same folder. Run: python make_gene_csv.py',
                  },
                  {
                    n: '5',
                    title: 'Upload the output CSV',
                    body: 'The script produces one CSV per sample. Upload any of them here. The T2D sample (GSM228667–GSM228678) should score higher risk than the control samples.',
                  },
                ].map(s => (
                  <div className="gim-step" key={s.n}>
                    <div className="gim-step-num">{s.n}</div>
                    <div className="gim-step-body">
                      <strong>{s.title}</strong>
                      <p>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="gim-h3">Other GEO datasets that work</h3>
              <p className="gim-p">Any blood microarray or RNA-seq dataset using HGNC gene symbols will work. Good search terms on GEO: <em>"type 2 diabetes blood expression"</em> or <em>"T2D peripheral blood mononuclear cells"</em>.</p>

              <div className="gim-callout gim-callout-amber">
                <strong>Research context only.</strong> In a future clinical pipeline, a hospital lab would run a blood RNA panel and export normalised expression values directly. This is not yet standard clinical practice.
              </div>
            </div>
          )}

          {/* ── PLATFORMS ──────────────────────────────────────────────── */}
          {activeTab === 'platforms' && (
            <div className="gim-content">
              <p className="gim-p">The gene expression model was trained and validated on blood microarray data. The table below shows which platforms produce compatible files and what post-processing is needed before uploading.</p>

              <div className="gim-table-wrap">
                <table className="gim-table">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Type</th>
                      <th>Compatible</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Affymetrix HG-U133A (GPL96)', 'Microarray', '✓ Best', 'Exact platform of training & validation datasets (GSE184050, GSE9006). Use as-is after MAS5.0 normalisation.'],
                      ['Affymetrix HG-U133 Plus 2.0 (GPL570)', 'Microarray', '✓ Good', 'Superset of GPL96 probes. Subset overlaps training platform — expect high module coverage.'],
                      ['Illumina HiSeq (RNA-seq)', 'RNA-seq', '✓ Good', 'Export TPM or log2(TPM+1) values with HGNC gene symbols. Use DESeq2 or edgeR for normalisation.'],
                      ['Illumina NovaSeq (RNA-seq)', 'RNA-seq', '✓ Good', 'Same as HiSeq — export normalised counts with gene symbols.'],
                      ['Affymetrix Exon ST arrays', 'Microarray', '⚠ Partial', 'Probe-to-gene mapping differs. Module coverage may be lower; amber warnings likely.'],
                      ['Single-cell RNA-seq (scRNA-seq)', 'scRNA-seq', '⚠ Not ideal', 'Aggregate to pseudo-bulk per sample first, then export gene-level mean expression.'],
                      ['Whole genome sequencing (WGS)', 'DNA-seq', '✗ No', 'WGS measures DNA variants, not gene expression. This model requires RNA-level data.'],
                    ].map(([platform, type, compat, notes]) => (
                      <tr key={platform}>
                        <td><strong>{platform}</strong></td>
                        <td><span className="gim-badge">{type}</span></td>
                        <td className={
                          compat.startsWith('✓ Best') ? 'gim-compat-best' :
                          compat.startsWith('✓') ? 'gim-compat-good' :
                          compat.startsWith('⚠') ? 'gim-compat-warn' : 'gim-compat-no'
                        }>{compat}</td>
                        <td className="gim-notes">{notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="gim-callout gim-callout-blue" style={{ marginTop: 24 }}>
                <strong>Why does platform matter?</strong> The model's 8 WGCNA modules were built
                from 5,000 specific genes present in the GPL96 Affymetrix array. Platforms that
                cover more of those 5,000 genes will produce more reliable eigengene estimates.
              </div>
            </div>
          )}

          {/* ── PYTHON CODE ────────────────────────────────────────────── */}
          {activeTab === 'code' && (
            <div className="gim-content">
              <p className="gim-p">This script reads the two GEO files you downloaded and outputs one upload-ready CSV per sample. No internet connection required — it works entirely from the local files.</p>

              <div className="gim-callout gim-callout-purple">
                <strong>Requirements:</strong> Python 3.8+ with <code>pandas</code> installed.
                Run <code>pip install pandas</code> if needed. No other dependencies.
              </div>

              <div className="gim-code-block">
                <div className="gim-code-header">
                  <span>make_gene_csv.py</span>
                  <button className="gim-copy-btn"
                    onClick={() => { navigator.clipboard.writeText(PYTHON_CODE); }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M3 11V3a2 2 0 012-2h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Copy
                  </button>
                </div>
                <pre className="gim-code">{PYTHON_CODE}</pre>
              </div>

              <h3 className="gim-h3" style={{ marginTop: 24 }}>How to run it</h3>
              <div className="gim-steps">
                {[
                  { n: '1', title: 'Place files in the same folder', body: 'Put make_gene_csv.py, GSE9006_family.soft.gz, and GSE9006-GPL96_series_matrix.txt.gz all in the same directory.' },
                  { n: '2', title: 'Open WSL or terminal', body: 'Navigate to the folder: cd "/mnt/c/Users/talha/Desktop/webapp tes"' },
                  { n: '3', title: 'Run the script', body: 'python make_gene_csv.py' },
                  { n: '4', title: 'Check output', body: 'You will get GSM228667_expression.csv (T2D patient) and GSM228562_expression.csv (healthy control) in the same folder.' },
                ].map(s => (
                  <div className="gim-step" key={s.n}>
                    <div className="gim-step-num">{s.n}</div>
                    <div className="gim-step-body">
                      <strong>{s.title}</strong>
                      <p>{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FAQ ─────────────────────────────────────────────────────── */}
          {activeTab === 'faq' && (
            <div className="gim-content">
              <div className="gim-faq-list">
                {[
                  {
                    q: 'My file has 20,000+ genes — is that too many?',
                    a: 'No. The pipeline looks up the 5,000 specific hub genes it needs and ignores the rest. More genes = better coverage, never a problem.',
                  },
                  {
                    q: 'I only have 3,000 genes. Will it still work?',
                    a: 'Yes, but module coverage may be lower. If any module falls below 70% of its hub genes, you will see an amber warning on the results page. The prediction still runs — the warning just flags reduced reliability for that module.',
                  },
                  {
                    q: 'What does the amber coverage warning mean?',
                    a: 'It means one or more WGCNA modules had fewer than 70% of their expected hub genes present in your file. The eigengene for that module was computed from partial data and may be less accurate. The overall p_gene score is still shown, but interpret it with caution.',
                  },
                  {
                    q: 'My expression values are raw counts (not log2). Is that OK?',
                    a: 'The model performs best with log2-normalised values (range ~6–12). Raw counts from RNA-seq can have very large values (e.g. 10,000+) which may shift eigengene estimates. We recommend normalising with DESeq2 or edgeR before uploading if possible.',
                  },
                  {
                    q: 'Can I use Ensembl IDs instead of gene symbols?',
                    a: 'No — the gene module assignments file uses HGNC gene symbols (e.g. GAPDH, TP53). Ensembl IDs like ENSG00000111640 will not match. Convert them using biomaRt in R or MyGene.info in Python before uploading.',
                  },
                  {
                    q: 'My file has multiple samples. Which one gets used?',
                    a: 'The pipeline automatically uses the first data column (column 2) and ignores all others. To run predictions on multiple samples, create separate single-sample CSV files and upload them one at a time.',
                  },
                  {
                    q: 'Can a real patient use this in a clinic?',
                    a: 'Not yet. This is a research tool. In a future clinical pipeline, a hospital lab would run a blood RNA panel and export normalised expression values in CSV format. The direction of the field is moving towards this, but it is not yet standard clinical practice.',
                  },
                  {
                    q: 'Why is my gene expression result weighted only 14.9%?',
                    a: 'The gene model was trained on only 116 samples — the smallest of the three training sets. The fusion meta-model learned that the clinical model (99,986 samples, AUC 0.975) is more reliable and assigned it higher weight (62.7%). The gene contribution will increase as larger blood RNA-seq datasets become available.',
                  },
                ].map((item, i) => (
                  <FAQItem key={i} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="gim-footer">
          <span className="gim-footer-note">
            Research tool only · Not a clinical diagnostic device
          </span>
          <button className="gim-close-btn" onClick={onClose}>Close</button>
        </div>

      </div>
    </div>
  );
}

/* ─── FAQ accordion item ─────────────────────────────────────────────────── */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`gim-faq-item${open ? ' open' : ''}`}>
      <button className="gim-faq-q" onClick={() => setOpen(v => !v)}>
        <span>{question}</span>
        <svg className="gim-faq-chevron" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M5 7l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <p className="gim-faq-a">{answer}</p>}
    </div>
  );
}

/* ─── Existing components ────────────────────────────────────────────────── */
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

/* ─── Main page ──────────────────────────────────────────────────────────── */
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
  const [showGeneModal, setShowGeneModal] = useState(false);
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

      {/* Gene instructions modal */}
      {showGeneModal && (
        <GeneInstructionsModal onClose={() => setShowGeneModal(false)} />
      )}

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
              { key: 'clinical',   label: 'Clinical',        color: '#1565c0', state: useClinical,  set: setUseClinical },
              { key: 'lifestyle',  label: 'Lifestyle',       color: '#00695c', state: useLifestyle, set: setUseLifestyle },
              { key: 'gene',       label: 'Gene Expression', color: '#6a1b9a', state: useGene,      set: setUseGene },
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
                    <button type="button" className="dz-remove"
                      onClick={e => { e.stopPropagation(); setGeneFile(null); }}>
                      Remove file
                    </button>
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

              {/* ── Instructions button ── */}
              <button
                type="button"
                className="gene-instructions-btn"
                onClick={() => setShowGeneModal(true)}
              >
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M9 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="9" cy="5.5" r="0.9" fill="currentColor"/>
                </svg>
                How to prepare and upload a gene expression file
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto' }}>
                  <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className="gene-info-box">
                <p><strong>Expected format:</strong> First column = gene symbols (e.g. GAPDH, TP53). Second column = expression values, typically log2-normalised (range 6–12).</p>
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
