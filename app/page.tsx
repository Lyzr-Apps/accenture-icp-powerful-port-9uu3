'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useRAGKnowledgeBase, uploadAndTrainDocument, getDocuments, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { FiHome, FiBook, FiUsers, FiSettings, FiChevronDown, FiChevronRight, FiCheck, FiAlertTriangle, FiDownload, FiCopy, FiExternalLink, FiSearch, FiUpload, FiTrash2, FiMail, FiUser, FiFileText, FiBookOpen, FiX, FiMenu, FiLoader, FiTarget, FiActivity, FiShield, FiClock, FiZap, FiGlobe, FiDatabase, FiLayers } from 'react-icons/fi'

// ─── Constants ───────────────────────────────────────────────────────────────
const MANAGER_AGENT_ID = '699ee645c0628a36907949b8'
const RAG_ID = '699ee578c9ac7bb71c08b9cc'

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
interface KeyClaim {
  claim: string
  citation_ref: string
  page_section: string
  confidence_score: number
  industry_relevance: string[]
}

interface IndustryRelevance {
  industry: string
  relevance_score: number
  key_themes: string[]
}

interface Signal {
  signal_type: string
  description: string
  source_ref: string
}

interface Persona {
  role_title: string
  seniority_level: string
  kpis: string[]
  pain_points: string[]
  buying_triggers: string[]
  objections: string[]
  committee_neighbors: string[]
  report_fit_score: number
}

interface ICPSummary {
  industry_segments: string[]
  company_size_bands: string[]
  tech_stack_hints: string[]
  geographic_focus: string[]
}

interface EnrichedContact {
  full_name: string
  job_title: string
  company: string
  org_unit: string
  location: string
  linkedin_url: string
  email: string
  confidence: string
  needs_review: boolean
  source_reports: string[]
  persona_tags: string[]
}

interface EmailVariant {
  variant_type: string
  subject_line: string
  body: string
  cta: string
  cited_claims: string[]
  compliance_footer: string
}

interface EmailSequence {
  contact_name: string
  persona_tag: string
  emails: EmailVariant[]
}

interface QualityGates {
  groundedness_pass: boolean
  dedup_pass: boolean
  confidence_threshold_met: boolean
  issues_flagged: string[]
}

interface PlaybookData {
  playbook_id: string
  report_title: string
  generation_date: string
  pipeline_status: string
  executive_summary: string
  key_claims: KeyClaim[]
  industry_relevance_map: IndustryRelevance[]
  signals: Signal[]
  personas: Persona[]
  icp_summary: ICPSummary
  enriched_contacts: EnrichedContact[]
  email_sequences: EmailSequence[]
  quality_gates: QualityGates
  total_contacts: number
  total_emails: number
  artifact_files?: { file_url: string; name?: string; format_type?: string }[]
}

type ActiveSection = 'dashboard' | 'playbooks' | 'contacts' | 'settings'

// ─── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_PLAYBOOK: PlaybookData = {
  playbook_id: 'PB-2025-0147',
  report_title: 'Accenture Cloud-First Strategy for Financial Services 2025',
  generation_date: '2025-02-24T14:30:00Z',
  pipeline_status: 'completed',
  executive_summary: 'This comprehensive playbook synthesizes insights from Accenture\'s latest research on cloud-first transformation in financial services. The report identifies critical inflection points where legacy institutions must accelerate migration to remain competitive. Key findings include a 40% cost reduction potential through intelligent cloud orchestration, emergence of AI-native banking platforms, and regulatory shifts favoring cloud-native compliance frameworks. The analysis covers 12 major banking institutions across North America and EMEA, revealing consistent patterns in digital transformation readiness and technology adoption curves.',
  key_claims: [
    { claim: '73% of banking executives plan to increase cloud spending by 30%+ in 2025', citation_ref: 'ACN-FS-2025-pg12', page_section: 'Executive Overview, p.12', confidence_score: 0.92, industry_relevance: ['Banking', 'Financial Services'] },
    { claim: 'AI-native platforms reduce operational costs by 40% within 18 months of deployment', citation_ref: 'ACN-FS-2025-pg28', page_section: 'Cost Analysis, p.28', confidence_score: 0.85, industry_relevance: ['Banking', 'Insurance', 'Capital Markets'] },
    { claim: 'Regulatory compliance automation delivers 60% faster audit cycles', citation_ref: 'ACN-FS-2025-pg45', page_section: 'Compliance Framework, p.45', confidence_score: 0.78, industry_relevance: ['Banking', 'Insurance'] },
    { claim: 'Multi-cloud strategies outperform single-vendor approaches by 2.3x on resilience metrics', citation_ref: 'ACN-FS-2025-pg33', page_section: 'Architecture Patterns, p.33', confidence_score: 0.88, industry_relevance: ['Financial Services', 'Capital Markets'] },
  ],
  industry_relevance_map: [
    { industry: 'Banking', relevance_score: 0.95, key_themes: ['Cloud Migration', 'AI-Native Platforms', 'Cost Optimization'] },
    { industry: 'Insurance', relevance_score: 0.82, key_themes: ['Claims Automation', 'Risk Modeling', 'Compliance'] },
    { industry: 'Capital Markets', relevance_score: 0.76, key_themes: ['Real-time Analytics', 'Multi-cloud', 'Trading Infrastructure'] },
  ],
  signals: [
    { signal_type: 'Technology Adoption', description: 'Rapid adoption of Kubernetes-native banking platforms across tier-1 institutions', source_ref: 'ACN-FS-2025-pg18' },
    { signal_type: 'Regulatory Change', description: 'OCC and FCA issuing new guidance on cloud-native compliance frameworks', source_ref: 'ACN-FS-2025-pg42' },
    { signal_type: 'Market Shift', description: 'Fintech challengers capturing 15% market share through cloud-first approaches', source_ref: 'ACN-FS-2025-pg7' },
    { signal_type: 'Budget Reallocation', description: 'IT budgets shifting from maintenance (60/40) to innovation (40/60) ratios', source_ref: 'ACN-FS-2025-pg22' },
  ],
  personas: [
    { role_title: 'Chief Technology Officer', seniority_level: 'C-Suite', kpis: ['System uptime 99.99%', 'Time-to-market reduction', 'Technical debt ratio'], pain_points: ['Legacy system integration complexity', 'Talent shortage for cloud-native development', 'Multi-vendor orchestration overhead'], buying_triggers: ['Board mandate for digital transformation', 'Competitive pressure from fintechs', 'Regulatory compliance deadlines'], objections: ['Migration risk to production systems', 'Total cost of ownership concerns', 'Vendor lock-in fears'], committee_neighbors: ['CIO', 'CISO', 'CFO'], report_fit_score: 94 },
    { role_title: 'VP of Digital Transformation', seniority_level: 'VP/Director', kpis: ['Digital revenue percentage', 'Customer digital adoption rate', 'Process automation coverage'], pain_points: ['Organizational resistance to change', 'Siloed technology decisions', 'Measuring transformation ROI'], buying_triggers: ['CEO strategic vision alignment', 'Customer experience benchmarking gaps', 'Operational efficiency targets'], objections: ['Timeline uncertainty', 'Resource allocation conflicts', 'Change management complexity'], committee_neighbors: ['CTO', 'COO', 'Head of Product'], report_fit_score: 87 },
    { role_title: 'Head of Infrastructure', seniority_level: 'VP/Director', kpis: ['Infrastructure cost per transaction', 'Deployment frequency', 'Mean time to recovery'], pain_points: ['Hybrid cloud complexity', 'Security posture management', 'Capacity planning accuracy'], buying_triggers: ['Data center contract renewals', 'Performance SLA breaches', 'Scalability limitations'], objections: ['Team retraining requirements', 'Operational continuity during migration', 'Compliance certification timelines'], committee_neighbors: ['CTO', 'CISO', 'VP Engineering'], report_fit_score: 81 },
  ],
  icp_summary: {
    industry_segments: ['Banking', 'Insurance', 'Capital Markets', 'Wealth Management'],
    company_size_bands: ['Enterprise (10,000+ employees)', 'Large (5,000-10,000)', 'Mid-Market (1,000-5,000)'],
    tech_stack_hints: ['AWS', 'Azure', 'Kubernetes', 'Terraform', 'Snowflake', 'Databricks'],
    geographic_focus: ['North America', 'United Kingdom', 'Western Europe', 'Singapore'],
  },
  enriched_contacts: [
    { full_name: 'Sarah Chen', job_title: 'Chief Technology Officer', company: 'Global Trust Bank', org_unit: 'Technology & Innovation', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/sarahchen-cto', email: 'schen@globaltrustbank.com', confidence: 'high', needs_review: false, source_reports: ['ACN-FS-2025'], persona_tags: ['CTO', 'C-Suite'] },
    { full_name: 'James Rodriguez', job_title: 'VP Digital Transformation', company: 'Atlantic Financial Group', org_unit: 'Digital Strategy', location: 'London, UK', linkedin_url: 'https://linkedin.com/in/jrodriguez-digital', email: 'j.rodriguez@atlanticfg.co.uk', confidence: 'high', needs_review: false, source_reports: ['ACN-FS-2025'], persona_tags: ['VP Digital', 'VP/Director'] },
    { full_name: 'Priya Sharma', job_title: 'Head of Cloud Infrastructure', company: 'Pacific Insurance Corp', org_unit: 'IT Operations', location: 'Singapore', linkedin_url: 'https://linkedin.com/in/priyasharma-infra', email: 'p.sharma@pacificins.sg', confidence: 'medium', needs_review: true, source_reports: ['ACN-FS-2025'], persona_tags: ['Infrastructure', 'VP/Director'] },
    { full_name: 'Michael Torres', job_title: 'CIO', company: 'Meridian Capital Markets', org_unit: 'Information Technology', location: 'Chicago, IL', linkedin_url: 'https://linkedin.com/in/mtorres-cio', email: 'mtorres@meridiancm.com', confidence: 'high', needs_review: false, source_reports: ['ACN-FS-2025'], persona_tags: ['CIO', 'C-Suite'] },
    { full_name: 'Elena Vogt', job_title: 'Director of Compliance Technology', company: 'NordBank AG', org_unit: 'Risk & Compliance', location: 'Frankfurt, DE', linkedin_url: 'https://linkedin.com/in/elenavogt-compliance', email: 'e.vogt@nordbank.de', confidence: 'medium', needs_review: true, source_reports: ['ACN-FS-2025'], persona_tags: ['Compliance', 'Director'] },
  ],
  email_sequences: [
    {
      contact_name: 'Sarah Chen',
      persona_tag: 'CTO',
      emails: [
        { variant_type: 'Report-Led', subject_line: 'Accenture\'s Cloud-First Blueprint for Banking CTOs', body: 'Dear Sarah,\n\nAccenture\'s latest research reveals that 73% of banking executives are planning to increase cloud spending by 30%+ this year. As CTO of Global Trust Bank, your perspective on cloud-native transformation is uniquely valuable.\n\nThe report highlights how AI-native platforms are delivering 40% operational cost reductions within 18 months -- a metric directly aligned with your infrastructure modernization priorities.\n\nI\'d welcome the opportunity to share the full findings and discuss how these insights map to your strategic roadmap.', cta: 'Schedule a 20-minute briefing to review the key findings', cited_claims: ['73% cloud spending increase', '40% cost reduction via AI-native platforms'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Contributor-Led', subject_line: 'Your expertise cited in Accenture\'s FS Cloud Strategy report', body: 'Dear Sarah,\n\nYour contributions to the discourse on cloud-native banking have been noted in Accenture\'s latest Financial Services research. The report specifically references infrastructure patterns that align with Global Trust Bank\'s published transformation methodology.\n\nWe believe your firsthand experience navigating multi-cloud orchestration at scale would enrich the conversation around the report\'s findings on resilience metrics.', cta: 'Join an exclusive roundtable discussion with peer CTOs', cited_claims: ['Multi-cloud resilience 2.3x outperformance'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Pain-Point-Led', subject_line: 'Solving the legacy integration challenge for banking CTOs', body: 'Dear Sarah,\n\nThe complexity of legacy system integration remains the top barrier for banking CTOs pursuing cloud transformation. Accenture\'s latest research quantifies this challenge and, more importantly, outlines proven approaches that have delivered results at tier-1 institutions.\n\nThe findings suggest that targeted migration strategies can reduce integration overhead by 55% while maintaining regulatory compliance -- addressing two of the most critical concerns we hear from technology leaders like you.', cta: 'Access the executive summary and integration framework', cited_claims: ['Legacy integration complexity', 'Compliance automation 60% faster audits'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
      ],
    },
    {
      contact_name: 'James Rodriguez',
      persona_tag: 'VP Digital',
      emails: [
        { variant_type: 'Report-Led', subject_line: 'Digital transformation benchmarks from Accenture\'s FS research', body: 'Dear James,\n\nAccenture\'s 2025 Financial Services Cloud Strategy report reveals critical benchmarks for digital transformation leaders. The research shows that organizations with cloud-first strategies are achieving 2.3x better resilience metrics and significantly faster time-to-market.\n\nAs VP of Digital Transformation at Atlantic Financial Group, these findings directly relate to your mandate for accelerating digital revenue growth.', cta: 'Download the digital transformation benchmark report', cited_claims: ['2.3x resilience improvement', 'Cloud-first strategy advantages'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'CTA-Led', subject_line: 'Exclusive briefing: Cloud strategy for FS digital leaders', body: 'Dear James,\n\nWe are hosting an exclusive virtual briefing for digital transformation leaders in financial services, featuring insights from Accenture\'s latest cloud strategy research.\n\nThe session will cover practical frameworks for measuring transformation ROI, overcoming organizational resistance, and aligning technology decisions with strategic vision -- all areas critical to your role at Atlantic Financial Group.', cta: 'Reserve your spot for the executive briefing', cited_claims: ['Transformation ROI measurement', 'Organizational change management'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
      ],
    },
  ],
  quality_gates: {
    groundedness_pass: true,
    dedup_pass: true,
    confidence_threshold_met: true,
    issues_flagged: [],
  },
  total_contacts: 5,
  total_emails: 5,
}

// ─── Pipeline Steps ──────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  'Discovering Sources',
  'Acquiring Documents',
  'Parsing Content',
  'Summarizing Reports',
  'Extracting Personas',
  'Extracting Contributors',
  'Enriching Contacts',
  'Generating Emails',
]

// ─── Parse Agent Response ────────────────────────────────────────────────────
function parseAgentResponse(result: any): PlaybookData | null {
  if (!result || !result.success) return null

  let data = result?.response?.result
  if (!data && result?.response?.message) {
    try { data = JSON.parse(result.response.message) } catch { /* ignore */ }
  }
  if (!data && typeof result?.raw_response === 'string') {
    try { data = JSON.parse(result.raw_response) } catch { /* ignore */ }
  }
  if (!data) return null

  const artifactFiles = Array.isArray(result?.module_outputs?.artifact_files)
    ? result.module_outputs.artifact_files
    : []

  return {
    playbook_id: data.playbook_id || '',
    report_title: data.report_title || '',
    generation_date: data.generation_date || new Date().toISOString(),
    pipeline_status: data.pipeline_status || 'completed',
    executive_summary: data.executive_summary || '',
    key_claims: Array.isArray(data.key_claims) ? data.key_claims : [],
    industry_relevance_map: Array.isArray(data.industry_relevance_map) ? data.industry_relevance_map : [],
    signals: Array.isArray(data.signals) ? data.signals : [],
    personas: Array.isArray(data.personas) ? data.personas : [],
    icp_summary: data.icp_summary || { industry_segments: [], company_size_bands: [], tech_stack_hints: [], geographic_focus: [] },
    enriched_contacts: Array.isArray(data.enriched_contacts) ? data.enriched_contacts : [],
    email_sequences: Array.isArray(data.email_sequences) ? data.email_sequences : [],
    quality_gates: data.quality_gates || { groundedness_pass: false, dedup_pass: false, confidence_threshold_met: false, issues_flagged: [] },
    total_contacts: data.total_contacts || 0,
    total_emails: data.total_emails || 0,
    artifact_files: artifactFiles,
  }
}

// ─── Utility Functions ───────────────────────────────────────────────────────
function exportContactsCSV(contacts: EnrichedContact[]) {
  const headers = ['Name', 'Title', 'Company', 'Org Unit', 'Location', 'LinkedIn', 'Email', 'Confidence', 'Needs Review', 'Source Reports', 'Persona Tags']
  const rows = contacts.map(c => [
    c.full_name, c.job_title, c.company, c.org_unit, c.location,
    c.linkedin_url, c.email, c.confidence, c.needs_review ? 'Yes' : 'No',
    Array.isArray(c.source_reports) ? c.source_reports.join('; ') : '',
    Array.isArray(c.persona_tags) ? c.persona_tags.join('; ') : '',
  ])
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'contacts.csv'; a.click()
  URL.revokeObjectURL(url)
}

function exportEmailsMD(sequences: EmailSequence[]) {
  let md = '# ABM Email Sequences\n\n'
  if (!Array.isArray(sequences)) return
  sequences.forEach(seq => {
    md += `## ${seq.contact_name ?? 'Unknown'} (${seq.persona_tag ?? ''})\n\n`
    if (Array.isArray(seq.emails)) {
      seq.emails.forEach((email, idx) => {
        md += `### Email ${idx + 1}: ${email.variant_type ?? ''}\n\n`
        md += `**Subject:** ${email.subject_line ?? ''}\n\n`
        md += `${email.body ?? ''}\n\n`
        md += `**CTA:** ${email.cta ?? ''}\n\n`
        md += `---\n\n`
      })
    }
  })
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'email_sequences.md'; a.click()
  URL.revokeObjectURL(url)
}

function copyToClipboard(text: string, setCopiedId: (id: string) => void, id: string) {
  navigator.clipboard.writeText(text).catch(() => { /* fallback silent */ })
  setCopiedId(id)
  setTimeout(() => setCopiedId(''), 2000)
}

function confidenceColor(c: string | number): string {
  if (typeof c === 'number') {
    if (c >= 0.8) return 'text-green-400 border-green-400/30 bg-green-400/10'
    if (c >= 0.5) return 'text-amber-400 border-amber-400/30 bg-amber-400/10'
    return 'text-red-400 border-red-400/30 bg-red-400/10'
  }
  const s = String(c).toLowerCase()
  if (s === 'high') return 'text-green-400 border-green-400/30 bg-green-400/10'
  if (s === 'medium') return 'text-amber-400 border-amber-400/30 bg-amber-400/10'
  return 'text-red-400 border-red-400/30 bg-red-400/10'
}

function confidenceBarColor(score: number): string {
  if (score >= 0.8) return 'bg-green-400'
  if (score >= 0.5) return 'bg-amber-400'
  return 'bg-red-400'
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

// ─── ErrorBoundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Sidebar Navigation ─────────────────────────────────────────────────────
function Sidebar({ activeSection, setActiveSection, collapsed, setCollapsed }: {
  activeSection: ActiveSection
  setActiveSection: (s: ActiveSection) => void
  collapsed: boolean
  setCollapsed: (c: boolean) => void
}) {
  const navItems: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome size={18} /> },
    { id: 'playbooks', label: 'Playbooks', icon: <FiBook size={18} /> },
    { id: 'contacts', label: 'Contacts', icon: <FiUsers size={18} /> },
    { id: 'settings', label: 'Settings', icon: <FiSettings size={18} /> },
  ]

  return (
    <div className={`fixed left-0 top-0 h-full bg-card border-r border-border z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex items-center justify-between p-4 border-b border-border min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <FiTarget className="text-primary" size={20} />
            <span className="font-serif text-sm tracking-widest uppercase text-primary">ABM Intel</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <FiMenu size={18} />
        </button>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm tracking-wider transition-all duration-200 ${activeSection === item.id ? 'text-primary bg-primary/10 border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="uppercase text-xs font-serif">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className={`p-4 border-t border-border ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          {!collapsed && <span className="text-xs text-muted-foreground tracking-wider">SYSTEM ONLINE</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Stepper ────────────────────────────────────────────────────────
function PipelineStepper({ currentStep, isGenerating, stepTimes }: {
  currentStep: number
  isGenerating: boolean
  stepTimes: number[]
}) {
  return (
    <div className="space-y-1">
      {PIPELINE_STEPS.map((step, idx) => {
        const isComplete = idx < currentStep
        const isCurrent = idx === currentStep && isGenerating
        return (
          <div key={idx} className={`flex items-center gap-3 py-2 px-3 transition-all duration-300 ${isCurrent ? 'bg-primary/5 border border-primary/20' : ''}`}>
            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
              {isComplete ? (
                <FiCheck className="text-primary" size={14} />
              ) : isCurrent ? (
                <FiLoader className="text-primary animate-spin" size={14} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              )}
            </div>
            <span className={`text-xs tracking-wider uppercase flex-1 ${isComplete ? 'text-primary' : isCurrent ? 'text-foreground' : 'text-muted-foreground/50'}`}>
              {step}
            </span>
            {isComplete && (stepTimes[idx] ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">{stepTimes[idx]}s</span>
            )}
            {isCurrent && <span className="text-xs text-primary animate-pulse">Processing</span>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Dashboard Screen ────────────────────────────────────────────────────────
function DashboardScreen({ onGenerate, isGenerating, currentStep, stepTimes, savedPlaybooks, setActiveSection, setCurrentPlaybook, showSample, errorMsg }: {
  onGenerate: (urls: string, industry: string, region: string, persona: string, keywords: string) => void
  isGenerating: boolean
  currentStep: number
  stepTimes: number[]
  savedPlaybooks: PlaybookData[]
  setActiveSection: (s: ActiveSection) => void
  setCurrentPlaybook: (p: PlaybookData) => void
  showSample: boolean
  errorMsg: string
}) {
  const [urls, setUrls] = useState(showSample ? 'https://www.accenture.com/us-en/insights/cloud/cloud-first-strategy\nhttps://www.accenture.com/us-en/insights/banking/future-banking' : '')
  const [industry, setIndustry] = useState(showSample ? 'Banking' : 'All')
  const [region, setRegion] = useState(showSample ? 'NA' : 'Global')
  const [persona, setPersona] = useState(showSample ? 'C-Suite' : 'All')
  const [keywords, setKeywords] = useState(showSample ? 'cloud migration, AI platforms, cost optimization' : '')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left Column: Input Form */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2 className="font-serif text-2xl tracking-wider mb-1">Generate Playbook</h2>
          <p className="text-muted-foreground text-xs tracking-wider uppercase">Provide seed URLs and parameters to generate a targeted ABM playbook</p>
        </div>

        <div className="bg-card border border-border p-6 space-y-5">
          <div>
            <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Seed URLs</label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="Enter report URLs, one per line..."
              rows={4}
              className="w-full bg-secondary/50 border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary">
                <option value="All">All Industries</option>
                <option value="Banking">Banking</option>
                <option value="Insurance">Insurance</option>
                <option value="Capital Markets">Capital Markets</option>
                <option value="Wealth Management">Wealth Management</option>
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary">
                <option value="Global">Global</option>
                <option value="NA">North America</option>
                <option value="EMEA">EMEA</option>
                <option value="APAC">APAC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Persona Focus</label>
              <select value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary">
                <option value="All">All Personas</option>
                <option value="C-Suite">C-Suite</option>
                <option value="VP/Director">VP / Director</option>
                <option value="Practitioner">Practitioner</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Additional Keywords</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. cloud migration, cost optimization, AI"
              className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            onClick={() => onGenerate(urls, industry, region, persona, keywords)}
            disabled={isGenerating || !urls.trim()}
            className="w-full bg-primary text-primary-foreground py-3 text-xs tracking-widest uppercase font-serif hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <FiLoader className="animate-spin" size={14} />
                <span>Generating Playbook</span>
              </>
            ) : (
              <>
                <FiZap size={14} />
                <span>Generate Playbook</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Pipeline Stepper */}
        {isGenerating && (
          <div className="bg-card border border-border p-6">
            <h3 className="font-serif text-sm tracking-widest uppercase text-muted-foreground mb-4">Pipeline Progress</h3>
            <PipelineStepper currentStep={currentStep} isGenerating={isGenerating} stepTimes={stepTimes} />
          </div>
        )}
      </div>

      {/* Right Column: Recent Playbooks */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-serif text-sm tracking-widest uppercase text-muted-foreground">Recent Playbooks</h3>
        {savedPlaybooks.length === 0 ? (
          <div className="bg-card border border-border p-8 text-center">
            <FiBookOpen className="mx-auto text-muted-foreground/30 mb-3" size={32} />
            <p className="text-sm text-muted-foreground">No playbooks generated yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Generate your first playbook to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedPlaybooks.map((pb, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentPlaybook(pb); setActiveSection('playbooks') }}
                className="w-full text-left bg-card border border-border p-4 hover:border-primary/30 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-serif tracking-wider group-hover:text-primary transition-colors line-clamp-2">{pb.report_title || 'Untitled Playbook'}</h4>
                  <span className={`text-xs tracking-widest uppercase px-2 py-0.5 border flex-shrink-0 ${pb.pipeline_status === 'completed' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'}`}>
                    {pb.pipeline_status || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FiUsers size={11} /> {pb.total_contacts ?? 0} contacts</span>
                  <span className="flex items-center gap-1"><FiMail size={11} /> {pb.total_emails ?? 0} emails</span>
                  <span className="flex items-center gap-1"><FiClock size={11} /> {pb.generation_date ? new Date(pb.generation_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Agent Info */}
        <div className="bg-card border border-border p-4 mt-6">
          <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Pipeline Agents</h3>
          <div className="space-y-2">
            {[
              { name: 'Playbook Orchestrator', desc: 'Manager Agent', icon: <FiLayers size={12} /> },
              { name: 'Source Discovery', desc: 'URL & Report Finder', icon: <FiSearch size={12} /> },
              { name: 'Document Acquisition', desc: 'Content Retrieval', icon: <FiDownload size={12} /> },
              { name: 'Document Parsing', desc: 'Content Extraction', icon: <FiFileText size={12} /> },
              { name: 'Report Summarizer', desc: 'Key Insight Synthesis', icon: <FiBookOpen size={12} /> },
              { name: 'Persona Extraction', desc: 'ICP & Buyer Profiles', icon: <FiUser size={12} /> },
              { name: 'Contributor Extraction', desc: 'Contact Discovery', icon: <FiUsers size={12} /> },
              { name: 'Contact Enrichment', desc: 'Data Validation', icon: <FiDatabase size={12} /> },
              { name: 'ABM Email Generator', desc: 'Personalized Outreach', icon: <FiMail size={12} /> },
            ].map((agent, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-primary">{agent.icon}</span>
                <span className="text-foreground/80">{agent.name}</span>
                <span className="text-muted-foreground/50 ml-auto">{agent.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Playbook Results Screen ─────────────────────────────────────────────────
function PlaybookResultsScreen({ playbook, copiedId, setCopiedId }: {
  playbook: PlaybookData
  copiedId: string
  setCopiedId: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [expandedPersona, setExpandedPersona] = useState<number | null>(null)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set())

  const tabs = ['Report Brief', 'Personas & ICPs', 'Enriched Contacts', 'ABM Emails']

  const filteredContacts = (Array.isArray(playbook?.enriched_contacts) ? playbook.enriched_contacts : []).filter(c => {
    const matchesSearch = !contactFilter || (c.full_name?.toLowerCase().includes(contactFilter.toLowerCase()) || c.company?.toLowerCase().includes(contactFilter.toLowerCase()) || c.job_title?.toLowerCase().includes(contactFilter.toLowerCase()))
    const matchesConfidence = confidenceFilter === 'all' || c.confidence === confidenceFilter
    return matchesSearch && matchesConfidence
  })

  const toggleContactSelection = (idx: number) => {
    setSelectedContacts(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(filteredContacts.map((_, i) => i)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl tracking-wider">{playbook?.report_title || 'Playbook Results'}</h2>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground tracking-wider">
            <span>{playbook?.playbook_id || ''}</span>
            <span>{playbook?.generation_date ? new Date(playbook.generation_date).toLocaleDateString() : ''}</span>
            <span className={`uppercase px-2 py-0.5 border ${playbook?.pipeline_status === 'completed' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'}`}>
              {playbook?.pipeline_status || 'Unknown'}
            </span>
          </div>
        </div>
        {/* Quality Gates */}
        <div className="flex items-center gap-3">
          {playbook?.quality_gates?.groundedness_pass && <span className="flex items-center gap-1 text-xs text-green-400"><FiShield size={12} /> Grounded</span>}
          {playbook?.quality_gates?.dedup_pass && <span className="flex items-center gap-1 text-xs text-green-400"><FiCheck size={12} /> Deduped</span>}
          {playbook?.quality_gates?.confidence_threshold_met && <span className="flex items-center gap-1 text-xs text-green-400"><FiActivity size={12} /> Confidence Met</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-3 text-xs tracking-widest uppercase font-serif transition-all ${activeTab === idx ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {/* Tab 0: Report Brief */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div className="bg-card border border-border p-6">
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Executive Summary</h3>
              <div className="text-sm leading-relaxed text-foreground/90">
                {renderMarkdown(playbook?.executive_summary || '')}
              </div>
            </div>

            {/* Key Claims */}
            <div>
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Key Claims</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(playbook?.key_claims) && playbook.key_claims.map((claim, idx) => (
                  <div key={idx} className="bg-card border border-border p-4 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm flex-1">{claim.claim ?? ''}</p>
                      <span className={`text-xs tracking-wider uppercase px-2 py-0.5 border flex-shrink-0 ${confidenceColor(claim.confidence_score ?? 0)}`}>
                        {((claim.confidence_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <FiFileText size={10} />
                      <span>{claim.citation_ref ?? ''}</span>
                      <span className="text-muted-foreground/30">|</span>
                      <span>{claim.page_section ?? ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(claim.industry_relevance) && claim.industry_relevance.map((ind, i) => (
                        <span key={i} className="text-xs uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5">{ind}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Industry Relevance */}
            <div>
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Industry Relevance Map</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.isArray(playbook?.industry_relevance_map) && playbook.industry_relevance_map.map((ind, idx) => (
                  <div key={idx} className="bg-card border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-serif text-sm tracking-wider">{ind.industry ?? ''}</span>
                      <span className={`text-xs tracking-wider uppercase px-2 py-0.5 border ${confidenceColor(ind.relevance_score ?? 0)}`}>
                        {((ind.relevance_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted h-1 mb-3">
                      <div className={`h-full ${confidenceBarColor(ind.relevance_score ?? 0)} transition-all duration-500`} style={{ width: `${(ind.relevance_score ?? 0) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(ind.key_themes) && ind.key_themes.map((theme, i) => (
                        <span key={i} className="text-xs text-muted-foreground border border-border px-2 py-0.5">{theme}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signals */}
            <div>
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Market Signals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.isArray(playbook?.signals) && playbook.signals.map((signal, idx) => (
                  <div key={idx} className="bg-card border border-border p-4 flex gap-3">
                    <span className="text-xs uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 h-fit flex-shrink-0">{signal.signal_type ?? ''}</span>
                    <div className="flex-1">
                      <p className="text-sm">{signal.description ?? ''}</p>
                      <p className="text-xs text-muted-foreground mt-1">{signal.source_ref ?? ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Personas & ICPs */}
        {activeTab === 1 && (
          <div className="space-y-6">
            {/* ICP Summary */}
            <div className="bg-card border border-border p-6">
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-4">Ideal Customer Profile Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Industry Segments</label>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(playbook?.icp_summary?.industry_segments) && playbook.icp_summary.industry_segments.map((s, i) => (
                      <span key={i} className="text-xs uppercase tracking-wider text-primary border border-primary/20 px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Company Size</label>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(playbook?.icp_summary?.company_size_bands) && playbook.icp_summary.company_size_bands.map((s, i) => (
                      <span key={i} className="text-xs border border-border px-2 py-0.5 text-foreground/70">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Tech Stack</label>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(playbook?.icp_summary?.tech_stack_hints) && playbook.icp_summary.tech_stack_hints.map((s, i) => (
                      <span key={i} className="text-xs border border-border px-2 py-0.5 text-foreground/70">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Geographic Focus</label>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(playbook?.icp_summary?.geographic_focus) && playbook.icp_summary.geographic_focus.map((s, i) => (
                      <span key={i} className="text-xs border border-border px-2 py-0.5 text-foreground/70 flex items-center gap-1"><FiGlobe size={10} />{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Personas */}
            <div>
              <h3 className="font-serif text-xs tracking-widest uppercase text-muted-foreground mb-3">Buyer Personas</h3>
              <div className="space-y-3">
                {Array.isArray(playbook?.personas) && playbook.personas.map((persona, idx) => (
                  <div key={idx} className="bg-card border border-border hover:border-primary/20 transition-colors">
                    <button
                      onClick={() => setExpandedPersona(expandedPersona === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
                          <FiUser className="text-primary" size={16} />
                        </div>
                        <div>
                          <h4 className="font-serif text-sm tracking-wider">{persona.role_title ?? ''}</h4>
                          <span className="text-xs text-muted-foreground uppercase tracking-widest">{persona.seniority_level ?? ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <div className="text-xs text-muted-foreground mb-1">Fit Score</div>
                          <div className="w-24 bg-muted h-1.5">
                            <div className={`h-full ${confidenceBarColor((persona.report_fit_score ?? 0) / 100)} transition-all duration-500`} style={{ width: `${persona.report_fit_score ?? 0}%` }} />
                          </div>
                          <div className="text-xs text-primary mt-0.5">{persona.report_fit_score ?? 0}%</div>
                        </div>
                        {expandedPersona === idx ? <FiChevronDown size={16} className="text-muted-foreground" /> : <FiChevronRight size={16} className="text-muted-foreground" />}
                      </div>
                    </button>
                    {expandedPersona === idx && (
                      <div className="p-4 pt-0 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">KPIs</label>
                          <ul className="space-y-1">
                            {Array.isArray(persona.kpis) && persona.kpis.map((k, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2"><FiTarget size={10} className="text-primary mt-1.5 flex-shrink-0" />{k}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Pain Points</label>
                          <ul className="space-y-1">
                            {Array.isArray(persona.pain_points) && persona.pain_points.map((p, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2"><FiAlertTriangle size={10} className="text-amber-400 mt-1.5 flex-shrink-0" />{p}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Buying Triggers</label>
                          <ul className="space-y-1">
                            {Array.isArray(persona.buying_triggers) && persona.buying_triggers.map((b, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2"><FiZap size={10} className="text-green-400 mt-1.5 flex-shrink-0" />{b}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Objections</label>
                          <ul className="space-y-1">
                            {Array.isArray(persona.objections) && persona.objections.map((o, i) => (
                              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2"><FiX size={10} className="text-red-400 mt-1.5 flex-shrink-0" />{o}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-2">Committee Neighbors</label>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(persona.committee_neighbors) && persona.committee_neighbors.map((cn, i) => (
                              <span key={i} className="text-xs border border-border px-2 py-0.5 text-foreground/70">{cn}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Enriched Contacts */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)} className="bg-secondary/50 border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary">
                <option value="all">All Confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={() => {
                  const toExport = selectedContacts.size > 0 ? filteredContacts.filter((_, i) => selectedContacts.has(i)) : filteredContacts
                  exportContactsCSV(toExport)
                }}
                className="flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <FiDownload size={12} /> Export CSV
              </button>
            </div>

            <div className="bg-card border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">
                      <input type="checkbox" checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0} onChange={toggleAll} className="accent-primary" />
                    </th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Name</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Title</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Company</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Org Unit</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">Li</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Email</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Confidence</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, idx) => (
                    <tr key={idx} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${contact.needs_review ? 'bg-amber-400/5' : ''}`}>
                      <td className="p-3">
                        <input type="checkbox" checked={selectedContacts.has(idx)} onChange={() => toggleContactSelection(idx)} className="accent-primary" />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {contact.needs_review && <FiAlertTriangle size={12} className="text-amber-400 flex-shrink-0" />}
                          <span className="font-serif tracking-wider">{contact.full_name ?? ''}</span>
                        </div>
                      </td>
                      <td className="p-3 text-foreground/70">{contact.job_title ?? ''}</td>
                      <td className="p-3 text-foreground/70">{contact.company ?? ''}</td>
                      <td className="p-3 text-foreground/70">{contact.org_unit ?? ''}</td>
                      <td className="p-3">
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                            <FiExternalLink size={13} />
                          </a>
                        )}
                      </td>
                      <td className="p-3 text-foreground/70 text-xs">{contact.email ?? ''}</td>
                      <td className="p-3">
                        <span className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${confidenceColor(contact.confidence ?? 'low')}`}>
                          {contact.confidence ?? 'N/A'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(contact.persona_tags) && contact.persona_tags.map((tag, i) => (
                            <span key={i} className="text-xs border border-border px-1.5 py-0.5 text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredContacts.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">No contacts found</div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: ABM Emails */}
        {activeTab === 3 && (
          <div className="space-y-6">
            {Array.isArray(playbook?.email_sequences) && playbook.email_sequences.map((seq, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <div className="flex items-center gap-3">
                  <FiMail className="text-primary" size={14} />
                  <h3 className="font-serif text-sm tracking-wider">{seq.contact_name ?? 'Unknown Contact'}</h3>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">{seq.persona_tag ?? ''}</span>
                </div>
                <div className="space-y-2">
                  {Array.isArray(seq.emails) && seq.emails.map((email, eIdx) => {
                    const emailId = `${sIdx}-${eIdx}`
                    const isExpanded = expandedEmail === emailId
                    return (
                      <div key={eIdx} className="bg-card border border-border hover:border-primary/20 transition-colors">
                        <button
                          onClick={() => setExpandedEmail(isExpanded ? null : emailId)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-xs uppercase tracking-widest text-primary border border-primary/20 px-2 py-0.5 flex-shrink-0">{email.variant_type ?? ''}</span>
                            <span className="text-sm truncate">{email.subject_line ?? ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const fullEmail = `Subject: ${email.subject_line ?? ''}\n\n${email.body ?? ''}\n\nCTA: ${email.cta ?? ''}\n\n${email.compliance_footer ?? ''}`
                                copyToClipboard(fullEmail, setCopiedId, emailId)
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors p-1"
                            >
                              {copiedId === emailId ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
                            </button>
                            {isExpanded ? <FiChevronDown size={14} className="text-muted-foreground" /> : <FiChevronRight size={14} className="text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-border/50 space-y-3">
                            <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{email.body ?? ''}</div>
                            <div className="bg-primary/5 border border-primary/20 p-3">
                              <label className="text-xs tracking-widest uppercase text-primary block mb-1">Call to Action</label>
                              <p className="text-sm">{email.cta ?? ''}</p>
                            </div>
                            {Array.isArray(email.cited_claims) && email.cited_claims.length > 0 && (
                              <div>
                                <label className="text-xs tracking-widest uppercase text-muted-foreground/60 block mb-1">Cited Claims</label>
                                <div className="flex flex-wrap gap-1">
                                  {email.cited_claims.map((cc, i) => (
                                    <span key={i} className="text-xs border border-border px-2 py-0.5 text-foreground/70">{cc}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground/50 border-t border-border/30 pt-2">{email.compliance_footer ?? ''}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {(!Array.isArray(playbook?.email_sequences) || playbook.email_sequences.length === 0) && (
              <div className="bg-card border border-border p-8 text-center text-muted-foreground">
                <FiMail className="mx-auto mb-3" size={24} />
                <p className="text-sm">No email sequences generated</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Bar */}
      <div className="sticky bottom-0 bg-card border border-border p-4 flex items-center justify-between gap-4 mt-6">
        <div className="text-xs text-muted-foreground tracking-wider">
          {playbook?.total_contacts ?? 0} contacts | {playbook?.total_emails ?? 0} emails
          {Array.isArray(playbook?.quality_gates?.issues_flagged) && (playbook?.quality_gates?.issues_flagged?.length ?? 0) > 0 && (
            <span className="ml-2 text-amber-400">| {playbook.quality_gates.issues_flagged.length} issue(s) flagged</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {Array.isArray(playbook?.artifact_files) && playbook.artifact_files.map((file, i) => (
            <a
              key={i}
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <FiDownload size={12} /> {file.name || `Download ${file.format_type || 'File'}`}
            </a>
          ))}
          <button
            onClick={() => exportContactsCSV(Array.isArray(playbook?.enriched_contacts) ? playbook.enriched_contacts : [])}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground text-xs tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
          >
            <FiDownload size={12} /> Contacts CSV
          </button>
          <button
            onClick={() => exportEmailsMD(Array.isArray(playbook?.email_sequences) ? playbook.email_sequences : [])}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground text-xs tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
          >
            <FiDownload size={12} /> Emails MD
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contacts Library Screen ─────────────────────────────────────────────────
function ContactsLibraryScreen({ allContacts, copiedId, setCopiedId }: {
  allContacts: EnrichedContact[]
  copiedId: string
  setCopiedId: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [confFilter, setConfFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const filtered = allContacts.filter(c => {
    const matchSearch = !search || (c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase()) || c.job_title?.toLowerCase().includes(search.toLowerCase()))
    const matchConf = confFilter === 'all' || c.confidence === confFilter
    const matchReview = !reviewFilter || c.needs_review
    return matchSearch && matchConf && matchReview
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl tracking-wider">Contacts Library</h2>
          <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">{allContacts.length} total contacts across all playbooks</p>
        </div>
        <button
          onClick={() => exportContactsCSV(selectedRows.size > 0 ? filtered.filter((_, i) => selectedRows.has(i)) : filtered)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
        >
          <FiDownload size={12} /> Export {selectedRows.size > 0 ? `(${selectedRows.size})` : 'All'}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, title..."
            className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
          />
        </div>
        <select value={confFilter} onChange={(e) => setConfFilter(e.target.value)} className="bg-secondary/50 border border-border text-sm text-foreground px-3 py-2 focus:outline-none focus:border-primary">
          <option value="all">All Confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={() => setReviewFilter(!reviewFilter)}
          className={`flex items-center gap-2 px-3 py-2 border text-xs tracking-widest uppercase transition-colors ${reviewFilter ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-border text-muted-foreground hover:border-primary'}`}
        >
          <FiAlertTriangle size={12} /> Needs Review
        </button>
      </div>

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filtered.length && filtered.length > 0}
                  onChange={() => {
                    if (selectedRows.size === filtered.length) setSelectedRows(new Set())
                    else setSelectedRows(new Set(filtered.map((_, i) => i)))
                  }}
                  className="accent-primary"
                />
              </th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Name</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Title</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Company</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Location</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">Li</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Email</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Confidence</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Sources</th>
              <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact, idx) => (
              <React.Fragment key={idx}>
                <tr
                  className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${contact.needs_review ? 'bg-amber-400/5' : ''} ${expandedRow === idx ? 'bg-muted/20' : ''}`}
                  onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => {
                        setSelectedRows(prev => {
                          const next = new Set(prev)
                          if (next.has(idx)) next.delete(idx)
                          else next.add(idx)
                          return next
                        })
                      }}
                      className="accent-primary"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {contact.needs_review && <FiAlertTriangle size={12} className="text-amber-400 flex-shrink-0" />}
                      <span className="font-serif tracking-wider">{contact.full_name ?? ''}</span>
                    </div>
                  </td>
                  <td className="p-3 text-foreground/70">{contact.job_title ?? ''}</td>
                  <td className="p-3 text-foreground/70">{contact.company ?? ''}</td>
                  <td className="p-3 text-foreground/70 text-xs">{contact.location ?? ''}</td>
                  <td className="p-3">
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <FiExternalLink size={13} />
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-foreground/70 text-xs">{contact.email ?? ''}</td>
                  <td className="p-3">
                    <span className={`text-xs uppercase tracking-widest px-2 py-0.5 border ${confidenceColor(contact.confidence ?? 'low')}`}>
                      {contact.confidence ?? 'N/A'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(contact.source_reports) && contact.source_reports.map((sr, i) => (
                        <span key={i} className="text-xs border border-border px-1.5 py-0.5 text-muted-foreground">{sr}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(contact.persona_tags) && contact.persona_tags.map((tag, i) => (
                        <span key={i} className="text-xs border border-primary/20 px-1.5 py-0.5 text-primary">{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
                {expandedRow === idx && (
                  <tr className="bg-muted/10">
                    <td colSpan={10} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <label className="tracking-widest uppercase text-muted-foreground/60 block mb-1">Org Unit</label>
                          <span className="text-foreground/80">{contact.org_unit ?? 'N/A'}</span>
                        </div>
                        <div>
                          <label className="tracking-widest uppercase text-muted-foreground/60 block mb-1">Full Email</label>
                          <button
                            onClick={() => copyToClipboard(contact.email ?? '', setCopiedId, `contact-${idx}`)}
                            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                          >
                            {contact.email ?? ''} {copiedId === `contact-${idx}` ? <FiCheck size={10} /> : <FiCopy size={10} />}
                          </button>
                        </div>
                        <div>
                          <label className="tracking-widest uppercase text-muted-foreground/60 block mb-1">Review Status</label>
                          <span className={contact.needs_review ? 'text-amber-400' : 'text-green-400'}>
                            {contact.needs_review ? 'Needs Review' : 'Verified'}
                          </span>
                        </div>
                        <div>
                          <label className="tracking-widest uppercase text-muted-foreground/60 block mb-1">LinkedIn</label>
                          {contact.linkedin_url ? (
                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                              View Profile <FiExternalLink size={10} />
                            </a>
                          ) : <span className="text-muted-foreground">N/A</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {allContacts.length === 0 ? 'No contacts available. Generate a playbook first.' : 'No contacts match your filters.'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Settings Screen ─────────────────────────────────────────────────────────
function SettingsScreen() {
  const { documents, loading: ragLoading, error: ragError, fetchDocuments, uploadDocument, removeDocuments } = useRAGKnowledgeBase()
  const [uploadStatus, setUploadStatus] = useState('')
  const [deleteStatus, setDeleteStatus] = useState('')
  const [apolloConnected] = useState(true)
  const [lyzrContext, setLyzrContext] = useState('Lyzr is an AI agent development platform enabling enterprises to build, deploy, and manage autonomous AI agents at scale. Key capabilities include multi-agent orchestration, RAG-based knowledge management, and enterprise-grade security compliance.')
  const [complianceRegion, setComplianceRegion] = useState<string[]>(['NA', 'EMEA'])
  const [optOutText, setOptOutText] = useState('You are receiving this email based on your professional role. Reply STOP to opt out.')
  const [confidenceThreshold, setConfidenceThreshold] = useState(70)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments(RAG_ID)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus('Uploading and training...')
    const result = await uploadDocument(RAG_ID, file)
    if (result.success) {
      setUploadStatus('Document uploaded and trained successfully')
    } else {
      setUploadStatus(`Upload failed: ${result.error || 'Unknown error'}`)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setUploadStatus(''), 4000)
  }

  const handleDelete = async (fileName: string) => {
    setDeleteStatus(`Deleting ${fileName}...`)
    const result = await removeDocuments(RAG_ID, [fileName])
    if (result.success) {
      setDeleteStatus('Document deleted successfully')
    } else {
      setDeleteStatus(`Delete failed: ${result.error || 'Unknown error'}`)
    }
    setTimeout(() => setDeleteStatus(''), 4000)
  }

  const toggleRegion = (region: string) => {
    setComplianceRegion(prev => prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region])
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="font-serif text-2xl tracking-wider">Settings</h2>
        <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">Configure knowledge base, integrations, and compliance</p>
      </div>

      {/* Knowledge Base */}
      <div className="bg-card border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm tracking-widest uppercase">Knowledge Base</h3>
          <span className="text-xs text-muted-foreground">RAG ID: {RAG_ID}</span>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
            id="kb-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ragLoading}
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
          >
            {ragLoading ? <FiLoader className="animate-spin" size={12} /> : <FiUpload size={12} />}
            Upload Document
          </button>
          <button
            onClick={() => fetchDocuments(RAG_ID)}
            disabled={ragLoading}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground text-xs tracking-widest uppercase hover:border-primary transition-colors disabled:opacity-40"
          >
            <FiLoader size={12} className={ragLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {uploadStatus && (
          <div className={`text-xs p-2 border ${uploadStatus.includes('failed') ? 'text-destructive border-destructive/20 bg-destructive/5' : 'text-green-400 border-green-400/20 bg-green-400/5'}`}>
            {uploadStatus}
          </div>
        )}
        {deleteStatus && (
          <div className={`text-xs p-2 border ${deleteStatus.includes('failed') ? 'text-destructive border-destructive/20 bg-destructive/5' : 'text-green-400 border-green-400/20 bg-green-400/5'}`}>
            {deleteStatus}
          </div>
        )}
        {ragError && (
          <div className="text-xs p-2 border text-destructive border-destructive/20 bg-destructive/5">{ragError}</div>
        )}

        <div className="space-y-1">
          {Array.isArray(documents) && documents.length > 0 ? documents.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 px-3 bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3">
                <FiFileText size={14} className="text-muted-foreground" />
                <span className="text-sm">{doc.fileName ?? 'Unknown'}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{doc.fileType ?? ''}</span>
                {doc.status && (
                  <span className={`text-xs uppercase tracking-widest px-1.5 py-0.5 border ${doc.status === 'active' ? 'text-green-400 border-green-400/20' : doc.status === 'processing' ? 'text-amber-400 border-amber-400/20' : 'text-red-400 border-red-400/20'}`}>
                    {doc.status}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(doc.fileName)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          )) : (
            <div className="p-4 text-center text-muted-foreground text-xs">
              {ragLoading ? 'Loading documents...' : 'No documents in knowledge base'}
            </div>
          )}
        </div>
      </div>

      {/* Apollo Integration */}
      <div className="bg-card border border-border p-6">
        <h3 className="font-serif text-sm tracking-widest uppercase mb-4">Apollo Integration</h3>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${apolloConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm">{apolloConnected ? 'Connected' : 'Disconnected'}</span>
          <span className="text-xs text-muted-foreground ml-auto">Apollo.io API for contact enrichment</span>
        </div>
      </div>

      {/* Lyzr Capability Matrix */}
      <div className="bg-card border border-border p-6 space-y-3">
        <h3 className="font-serif text-sm tracking-widest uppercase">Lyzr Capability Matrix</h3>
        <p className="text-xs text-muted-foreground">Positioning context for email personalization</p>
        <textarea
          value={lyzrContext}
          onChange={(e) => setLyzrContext(e.target.value)}
          rows={4}
          className="w-full bg-secondary/50 border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary resize-none"
        />
      </div>

      {/* Compliance Settings */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h3 className="font-serif text-sm tracking-widest uppercase">Compliance Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-3">Active Regions</label>
            <div className="flex gap-2">
              {['NA', 'EMEA', 'APAC'].map(r => (
                <button
                  key={r}
                  onClick={() => toggleRegion(r)}
                  className={`px-4 py-2 text-xs tracking-widest uppercase border transition-colors ${complianceRegion.includes(r) ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-3">Confidence Threshold: {confidenceThreshold}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs tracking-widest uppercase text-muted-foreground block mb-2">Opt-out Footer Template</label>
          <textarea
            value={optOutText}
            onChange={(e) => setOptOutText(e.target.value)}
            rows={2}
            className="w-full bg-secondary/50 border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function Page() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [playbookData, setPlaybookData] = useState<PlaybookData | null>(null)
  const [savedPlaybooks, setSavedPlaybooks] = useState<PlaybookData[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepTimes, setStepTimes] = useState<number[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [showSample, setShowSample] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState('')
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved playbooks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('abm_playbooks')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setSavedPlaybooks(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  // Save playbooks to localStorage
  useEffect(() => {
    if (savedPlaybooks.length > 0) {
      try {
        localStorage.setItem('abm_playbooks', JSON.stringify(savedPlaybooks))
      } catch { /* ignore */ }
    }
  }, [savedPlaybooks])

  // Toggle sample data
  useEffect(() => {
    if (showSample && !playbookData) {
      setPlaybookData(SAMPLE_PLAYBOOK)
      if (!savedPlaybooks.some(p => p.playbook_id === SAMPLE_PLAYBOOK.playbook_id)) {
        setSavedPlaybooks(prev => [SAMPLE_PLAYBOOK, ...prev])
      }
    } else if (!showSample && playbookData?.playbook_id === SAMPLE_PLAYBOOK.playbook_id) {
      setPlaybookData(null)
    }
  }, [showSample]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async (urls: string, industry: string, region: string, persona: string, keywords: string) => {
    if (!urls.trim()) return

    setIsGenerating(true)
    setErrorMsg('')
    setCurrentStep(0)
    setStepTimes([])
    setActiveAgentId(MANAGER_AGENT_ID)

    // Simulate pipeline progress
    let step = 0
    const times: number[] = []
    const startTime = Date.now()
    stepIntervalRef.current = setInterval(() => {
      step += 1
      if (step <= 7) {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        times.push(Math.max(8, Math.round(elapsed / (step + 1))))
        setStepTimes([...times])
        setCurrentStep(step)
      }
    }, 10000)

    try {
      const message = `Generate an ABM playbook from the following seed URLs:\n${urls}\n\nFilters:\n- Industry: ${industry}\n- Region: ${region}\n- Persona Focus: ${persona}\n${keywords ? `- Keywords: ${keywords}` : ''}\n\nPlease run the full pipeline: discover sources, acquire documents, parse content, summarize reports, extract personas, extract contributors, enrich contacts, and generate personalized ABM emails.`

      const result = await callAIAgent(message, MANAGER_AGENT_ID)

      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      setCurrentStep(8)
      const finalTimes = PIPELINE_STEPS.map((_, i) => times[i] || Math.round((Date.now() - startTime) / 1000 / 8))
      setStepTimes(finalTimes)

      const parsed = parseAgentResponse(result)
      if (parsed) {
        setPlaybookData(parsed)
        setSavedPlaybooks(prev => [parsed, ...prev.slice(0, 9)])
        setActiveSection('playbooks')
      } else {
        setErrorMsg('Failed to parse playbook response. The agent may have returned an unexpected format.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while generating the playbook.')
    } finally {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      setIsGenerating(false)
      setActiveAgentId('')
    }
  }, [])

  // Aggregate all contacts from saved playbooks
  const allContacts: EnrichedContact[] = savedPlaybooks.reduce<EnrichedContact[]>((acc, pb) => {
    if (Array.isArray(pb?.enriched_contacts)) {
      pb.enriched_contacts.forEach(c => {
        if (!acc.some(existing => existing.email === c.email && existing.full_name === c.full_name)) {
          acc.push(c)
        }
      })
    }
    return acc
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <h1 className="font-serif text-lg tracking-widest uppercase">Accenture ABM Intelligence Platform</h1>
                <p className="text-xs text-muted-foreground tracking-wider">Powered by Lyzr Agent Orchestration</p>
              </div>
              <div className="flex items-center gap-4">
                {activeAgentId && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <FiLoader className="animate-spin" size={12} />
                    <span className="tracking-wider">Agent Processing</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-xs tracking-widest uppercase text-muted-foreground cursor-pointer select-none" htmlFor="sample-toggle">
                    Sample Data
                  </label>
                  <button
                    id="sample-toggle"
                    onClick={() => setShowSample(!showSample)}
                    className={`relative inline-flex h-5 w-9 items-center transition-colors ${showSample ? 'bg-primary' : 'bg-muted'}`}
                    role="switch"
                    aria-checked={showSample}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform transition-transform bg-background ${showSample ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: showSample ? 'translateX(18px)' : 'translateX(2px)' }} />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-8">
            {activeSection === 'dashboard' && (
              <DashboardScreen
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                currentStep={currentStep}
                stepTimes={stepTimes}
                savedPlaybooks={savedPlaybooks}
                setActiveSection={setActiveSection}
                setCurrentPlaybook={setPlaybookData}
                showSample={showSample}
                errorMsg={errorMsg}
              />
            )}

            {activeSection === 'playbooks' && (
              playbookData ? (
                <PlaybookResultsScreen
                  playbook={playbookData}
                  copiedId={copiedId}
                  setCopiedId={setCopiedId}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                  <FiBookOpen className="text-muted-foreground/20 mb-4" size={48} />
                  <h2 className="font-serif text-xl tracking-wider mb-2">No Playbook Selected</h2>
                  <p className="text-sm text-muted-foreground mb-6">Generate a new playbook or select one from the dashboard</p>
                  <button
                    onClick={() => setActiveSection('dashboard')}
                    className="px-6 py-2 bg-primary text-primary-foreground text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )
            )}

            {activeSection === 'contacts' && (
              <ContactsLibraryScreen
                allContacts={allContacts}
                copiedId={copiedId}
                setCopiedId={setCopiedId}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsScreen />
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
