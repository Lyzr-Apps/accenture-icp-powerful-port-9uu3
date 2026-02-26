'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useRAGKnowledgeBase, uploadAndTrainDocument, getDocuments, deleteDocuments } from '@/lib/ragKnowledgeBase'
import { FiHome, FiBook, FiUsers, FiSettings, FiChevronDown, FiChevronRight, FiCheck, FiAlertTriangle, FiDownload, FiCopy, FiExternalLink, FiSearch, FiUpload, FiTrash2, FiMail, FiUser, FiFileText, FiBookOpen, FiX, FiMenu, FiLoader, FiTarget, FiActivity, FiShield, FiClock, FiZap, FiGlobe, FiDatabase, FiLayers, FiTag, FiHash, FiBold, FiItalic, FiUnderline, FiLink, FiImage, FiVideo, FiSave, FiEdit, FiMinus, FiSend } from 'react-icons/fi'

// ─── Constants ───────────────────────────────────────────────────────────────
const MANAGER_AGENT_ID = '699ee645c0628a36907949b8'
const RAG_ID = '699ee578c9ac7bb71c08b9cc'
const EMAIL_AGENT_ID = '699ee5d18c35cfd5b5590bf0'

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
interface ReportContributor {
  full_name: string
  report_role: string
  org_unit: string
  job_title: string
  company: string
  email: string
  linkedin_url: string
  confidence: string
}

interface ReportKeyClaim {
  claim: string
  citation_ref: string
  page_section: string
  confidence_score: number
}

interface ReportIndustryRelevance {
  industry: string
  relevance_score: number
}

interface ReportPlaybook {
  report_title: string
  executive_summary: string
  key_claims: ReportKeyClaim[]
  topic_tags: string[]
  industry_relevance: ReportIndustryRelevance[]
  contributors: ReportContributor[]
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
  generation_date: string
  pipeline_status: string
  report_playbooks: ReportPlaybook[]
  personas: Persona[]
  icp_summary: ICPSummary
  enriched_contacts: EnrichedContact[]
  email_sequences: EmailSequence[]
  quality_gates: QualityGates
  total_contacts: number
  total_reports: number
  artifact_files?: { file_url: string; name?: string; format_type?: string }[]
  display_name?: string
}

type ActiveSection = 'dashboard' | 'playbooks' | 'contacts' | 'settings'

// ─── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_PLAYBOOK: PlaybookData = {
  playbook_id: 'PB-2026-0001',
  generation_date: '2026-02-25T14:30:00Z',
  pipeline_status: 'completed',
  report_playbooks: [
    {
      report_title: 'Accenture Technology Vision 2025',
      executive_summary: 'This report explores how technology will reshape industries through the convergence of AI, cloud computing, and digital transformation. It identifies five key trends: the rise of AI agents as digital collaborators, spatial computing transforming physical experiences, the emergence of a new technology fabric, trust architecture evolution, and the human-AI partnership imperative.',
      key_claims: [
        { claim: '95% of executives agree AI will be transformative for their industry within 3 years', citation_ref: 'TV-2025-pg8', page_section: 'Executive Overview, p.8', confidence_score: 0.91 },
        { claim: 'Organizations investing in AI-native platforms see 3.2x faster innovation cycles', citation_ref: 'TV-2025-pg23', page_section: 'Technology Fabric, p.23', confidence_score: 0.85 },
        { claim: 'Cloud-first enterprises achieve 45% better operational resilience', citation_ref: 'TV-2025-pg31', page_section: 'Infrastructure Evolution, p.31', confidence_score: 0.88 },
      ],
      topic_tags: ['AI Transformation', 'Cloud', 'Technology', 'Digital Transformation', 'GenAI'],
      industry_relevance: [
        { industry: 'Financial Services', relevance_score: 0.92 },
        { industry: 'Technology', relevance_score: 0.95 },
        { industry: 'Banking', relevance_score: 0.78 },
      ],
      contributors: [
        { full_name: 'Paul Daugherty', report_role: 'Lead Author', org_unit: 'Accenture Research', job_title: 'Group Chief Executive - Technology & CTO', company: 'Accenture', email: 'paul.daugherty@accenture.com', linkedin_url: 'https://linkedin.com/in/pauldaugherty', confidence: 'high' },
        { full_name: 'Marc Carrel-Billiard', report_role: 'Contributing Author', org_unit: 'Accenture Technology Innovation', job_title: 'Global Technology Innovation Lead', company: 'Accenture', email: 'marc.carrel-billiard@accenture.com', linkedin_url: 'https://linkedin.com/in/marccb', confidence: 'high' },
        { full_name: 'Michael Biltz', report_role: 'Lead Researcher', org_unit: 'Accenture Research', job_title: 'Managing Director - Technology Vision', company: 'Accenture', email: 'michael.biltz@accenture.com', linkedin_url: 'https://linkedin.com/in/michaelbiltz', confidence: 'medium' },
      ],
    },
    {
      report_title: 'The Art of AI Maturity',
      executive_summary: 'This research identifies what separates AI Leaders from AI Achievers across industries. The report quantifies the maturity gap and provides a framework for organizations to advance from experimental AI to enterprise-scale deployment, covering data strategy, talent, governance, and technology infrastructure.',
      key_claims: [
        { claim: 'Only 12% of companies have reached AI maturity sufficient to achieve superior growth', citation_ref: 'AIM-pg5', page_section: 'Key Findings, p.5', confidence_score: 0.93 },
        { claim: 'AI Leaders achieve 2.5x higher revenue growth than AI Experimenters', citation_ref: 'AIM-pg18', page_section: 'Performance Analysis, p.18', confidence_score: 0.89 },
        { claim: 'Responsible AI frameworks correlate with 35% higher stakeholder trust scores', citation_ref: 'AIM-pg42', page_section: 'Governance Impact, p.42', confidence_score: 0.82 },
      ],
      topic_tags: ['AI Transformation', 'Technology', 'Data Analytics', 'Automation'],
      industry_relevance: [
        { industry: 'Banking', relevance_score: 0.88 },
        { industry: 'Insurance', relevance_score: 0.84 },
        { industry: 'Financial Services', relevance_score: 0.91 },
      ],
      contributors: [
        { full_name: 'Lan Guan', report_role: 'Lead Author', org_unit: 'Accenture AI', job_title: 'Chief AI Officer', company: 'Accenture', email: 'lan.guan@accenture.com', linkedin_url: 'https://linkedin.com/in/languanai', confidence: 'high' },
        { full_name: 'Sanjeev Vohra', report_role: 'Contributing Author', org_unit: 'Accenture Technology', job_title: 'Group Technology Officer - Technology', company: 'Accenture', email: 'sanjeev.vohra@accenture.com', linkedin_url: 'https://linkedin.com/in/sanjeevvohra', confidence: 'high' },
      ],
    },
    {
      report_title: 'Making Reinvention Real With Generative AI',
      executive_summary: 'This report examines how organizations are moving beyond GenAI experimentation to enterprise-scale transformation. It provides a practical framework for scaling generative AI across functions, with detailed case studies from financial services, insurance, and technology sectors.',
      key_claims: [
        { claim: '63% of organizations have moved at least one GenAI use case to production', citation_ref: 'MRR-pg11', page_section: 'Adoption Status, p.11', confidence_score: 0.87 },
        { claim: 'GenAI-enabled processes deliver 40-60% efficiency gains in document processing', citation_ref: 'MRR-pg26', page_section: 'Efficiency Impact, p.26', confidence_score: 0.84 },
      ],
      topic_tags: ['GenAI', 'AI Transformation', 'Cloud', 'Financial Services', 'Banking', 'Insurance', 'Automation'],
      industry_relevance: [
        { industry: 'Banking', relevance_score: 0.93 },
        { industry: 'Insurance', relevance_score: 0.89 },
        { industry: 'Financial Services', relevance_score: 0.94 },
      ],
      contributors: [
        { full_name: 'Julie Sweet', report_role: 'Executive Sponsor', org_unit: 'Accenture Executive Office', job_title: 'Chair & Chief Executive Officer', company: 'Accenture', email: 'julie.sweet@accenture.com', linkedin_url: 'https://linkedin.com/in/juliesweet', confidence: 'high' },
        { full_name: 'Jack Azagury', report_role: 'Contributing Author', org_unit: 'Accenture Strategy & Consulting', job_title: 'Group Chief Executive - Strategy & Consulting', company: 'Accenture', email: 'jack.azagury@accenture.com', linkedin_url: 'https://linkedin.com/in/jackazagury', confidence: 'medium' },
        { full_name: 'Karthik Narain', report_role: 'Contributing Author', org_unit: 'Accenture Technology', job_title: 'Group Chief Executive - Technology', company: 'Accenture', email: 'karthik.narain@accenture.com', linkedin_url: 'https://linkedin.com/in/karthiknarain', confidence: 'high' },
      ],
    },
    {
      report_title: 'Reinvention in the Age of Generative AI',
      executive_summary: 'This foundational report frames the generative AI revolution as the next wave of enterprise reinvention. It argues that organizations must fundamentally rethink operations, talent strategy, and technology architecture to capture the transformative potential of generative AI across all business functions.',
      key_claims: [
        { claim: '98% of executives agree GenAI will play a significant role in their organizations within 3-5 years', citation_ref: 'RAGA-pg6', page_section: 'Executive Consensus, p.6', confidence_score: 0.94 },
        { claim: 'Early GenAI adopters report 25-40% cost reduction in targeted operations', citation_ref: 'RAGA-pg34', page_section: 'Cost Impact Analysis, p.34', confidence_score: 0.81 },
      ],
      topic_tags: ['GenAI', 'AI Transformation', 'Digital Transformation', 'Technology', 'Cloud'],
      industry_relevance: [
        { industry: 'Financial Services', relevance_score: 0.90 },
        { industry: 'Banking', relevance_score: 0.85 },
        { industry: 'Insurance', relevance_score: 0.82 },
      ],
      contributors: [
        { full_name: 'Paul Daugherty', report_role: 'Lead Author', org_unit: 'Accenture Research', job_title: 'Group Chief Executive - Technology & CTO', company: 'Accenture', email: 'paul.daugherty@accenture.com', linkedin_url: 'https://linkedin.com/in/pauldaugherty', confidence: 'high' },
        { full_name: 'Jim Wilson', report_role: 'Contributing Author', org_unit: 'Accenture Research', job_title: 'Global Managing Director - Thought Leadership & Research', company: 'Accenture', email: 'james.wilson@accenture.com', linkedin_url: 'https://linkedin.com/in/jimwilsonacn', confidence: 'high' },
      ],
    },
    {
      report_title: 'Macro Foresight 2026: Top 10 Trends',
      executive_summary: 'Accenture Strategy identifies the top 10 macroeconomic and technology trends shaping enterprise strategy in 2026, from sovereign AI policies to workforce transformation and supply chain resilience. The report provides a data-driven outlook for C-suite leaders navigating geopolitical and technological disruption.',
      key_claims: [
        { claim: 'Sovereign AI policies will impact 60% of global enterprises by 2027', citation_ref: 'MF2026-pg12', page_section: 'Sovereign AI, p.12', confidence_score: 0.86 },
        { claim: 'Supply chain AI adoption will reach 78% among Fortune 500 by end of 2026', citation_ref: 'MF2026-pg28', page_section: 'Supply Chain Resilience, p.28', confidence_score: 0.79 },
      ],
      topic_tags: ['Sovereign AI', 'Supply Chain', 'Workforce', 'AI Transformation', 'Technology'],
      industry_relevance: [
        { industry: 'Financial Services', relevance_score: 0.88 },
        { industry: 'Technology', relevance_score: 0.92 },
        { industry: 'Healthcare', relevance_score: 0.75 },
      ],
      contributors: [
        { full_name: 'Mark Knickrehm', report_role: 'Lead Author', org_unit: 'Accenture Strategy', job_title: 'Group Chief Executive - Strategy', company: 'Accenture', email: 'mark.knickrehm@accenture.com', linkedin_url: 'https://linkedin.com/in/markknickrehm', confidence: 'high' },
      ],
    },
    {
      report_title: 'Technology Trends 2025 in Healthcare',
      executive_summary: 'This analysis explores how agentic AI, ambient clinical intelligence, and federated health data networks are transforming healthcare delivery, clinical trials, and patient experience. Key focus areas include AI-driven diagnostics, personalized treatment planning, and regulatory compliance for health AI.',
      key_claims: [
        { claim: 'Agentic AI will automate 30% of administrative healthcare workflows by 2027', citation_ref: 'HC-2025-web', page_section: 'Agentic AI in Healthcare', confidence_score: 0.82 },
        { claim: 'AI-assisted diagnostics show 23% improvement in early detection accuracy', citation_ref: 'HC-2025-web', page_section: 'AI Diagnostics', confidence_score: 0.78 },
      ],
      topic_tags: ['Healthcare', 'Life Sciences', 'Agentic AI', 'AI Transformation', 'Data Analytics'],
      industry_relevance: [
        { industry: 'Healthcare', relevance_score: 0.97 },
        { industry: 'Life Sciences', relevance_score: 0.93 },
      ],
      contributors: [
        { full_name: 'Kaveh Safavi', report_role: 'Lead Author', org_unit: 'Accenture Health', job_title: 'Senior Managing Director - Health Industry', company: 'Accenture', email: 'kaveh.safavi@accenture.com', linkedin_url: 'https://linkedin.com/in/kavehsafavi', confidence: 'high' },
      ],
    },
    {
      report_title: 'Cybersecurity: AI-Augmented Cyber Threats',
      executive_summary: 'Only 1 in 10 organizations globally are ready to protect against AI-augmented cyber threats. This report assesses the state of enterprise cyber resilience, the emerging threat landscape where adversaries leverage generative AI, and the defensive strategies organizations must adopt to maintain security posture.',
      key_claims: [
        { claim: 'Only 10% of organizations are fully prepared for AI-augmented cyber attacks', citation_ref: 'CYBER-2025-web', page_section: 'Cyber Readiness Assessment', confidence_score: 0.92 },
        { claim: 'GenAI-powered phishing attacks have increased 340% since 2024', citation_ref: 'CYBER-2025-web', page_section: 'Threat Landscape', confidence_score: 0.85 },
      ],
      topic_tags: ['Cybersecurity', 'Risk', 'AI Transformation', 'Technology', 'GenAI'],
      industry_relevance: [
        { industry: 'Financial Services', relevance_score: 0.96 },
        { industry: 'Banking', relevance_score: 0.94 },
        { industry: 'Healthcare', relevance_score: 0.88 },
      ],
      contributors: [
        { full_name: 'Paolo Dal Cin', report_role: 'Lead Author', org_unit: 'Accenture Security', job_title: 'Global Lead - Accenture Security', company: 'Accenture', email: 'paolo.dal.cin@accenture.com', linkedin_url: 'https://linkedin.com/in/paolodalcin', confidence: 'high' },
      ],
    },
    {
      report_title: 'Destination Net Zero',
      executive_summary: 'This report provides a framework for achieving net-zero emissions across industries through technology-enabled sustainability transformations. It examines how AI, IoT, and digital twins are enabling organizations to measure, reduce, and offset carbon emissions while maintaining business performance.',
      key_claims: [
        { claim: 'AI-driven sustainability solutions can reduce carbon emissions by 15-20% within 2 years of deployment', citation_ref: 'DNZ-web', page_section: 'Technology for Sustainability', confidence_score: 0.80 },
        { claim: 'Organizations with net-zero commitments see 12% higher investor confidence scores', citation_ref: 'DNZ-web', page_section: 'Business Case for Sustainability', confidence_score: 0.76 },
      ],
      topic_tags: ['Sustainability', 'Net Zero', 'Energy', 'AI Transformation', 'Technology'],
      industry_relevance: [
        { industry: 'Energy', relevance_score: 0.96 },
        { industry: 'Financial Services', relevance_score: 0.72 },
        { industry: 'Technology', relevance_score: 0.80 },
      ],
      contributors: [
        { full_name: 'Peter Lacy', report_role: 'Lead Author', org_unit: 'Accenture Sustainability Services', job_title: 'Global Sustainability Services Lead', company: 'Accenture', email: 'peter.lacy@accenture.com', linkedin_url: 'https://linkedin.com/in/peterlacy', confidence: 'high' },
      ],
    },
    {
      report_title: 'Gen AI and Talent Transformation',
      executive_summary: 'This report explores how generative AI is reshaping the workforce, analyzing the skills gap, reskilling imperatives, and organizational change management required to integrate AI into daily work. It provides a talent strategy framework for HR and business leaders.',
      key_claims: [
        { claim: '40% of all working hours can be augmented by large language models', citation_ref: 'GAIT-web', page_section: 'Workforce Impact', confidence_score: 0.88 },
        { claim: 'Organizations investing in AI reskilling see 2x employee retention improvement', citation_ref: 'GAIT-web', page_section: 'Reskilling ROI', confidence_score: 0.83 },
      ],
      topic_tags: ['Workforce', 'Talent', 'GenAI', 'AI Transformation', 'Operations'],
      industry_relevance: [
        { industry: 'Technology', relevance_score: 0.93 },
        { industry: 'Financial Services', relevance_score: 0.87 },
        { industry: 'Healthcare', relevance_score: 0.78 },
      ],
      contributors: [
        { full_name: 'Ellyn Shook', report_role: 'Lead Author', org_unit: 'Accenture Leadership & Culture', job_title: 'Chief Leadership & Human Resources Officer', company: 'Accenture', email: 'ellyn.shook@accenture.com', linkedin_url: 'https://linkedin.com/in/ellynshook', confidence: 'high' },
      ],
    },
    {
      report_title: '5 Predictions for Insurance Industry 2026',
      executive_summary: 'Accenture analyzes five key predictions for the insurance industry in 2026, covering AI-driven underwriting, agentic claims processing, embedded insurance distribution, climate risk modeling, and personalized policy design. The report provides strategic guidance for insurers navigating rapid digital transformation.',
      key_claims: [
        { claim: 'AI-driven underwriting will reduce processing time by 50% for commercial lines by 2027', citation_ref: 'INS-2026-web', page_section: 'AI Underwriting', confidence_score: 0.84 },
        { claim: 'Embedded insurance premiums will reach $700B globally by end of 2026', citation_ref: 'INS-2026-web', page_section: 'Distribution Evolution', confidence_score: 0.77 },
      ],
      topic_tags: ['Insurance', 'AI Transformation', 'Agentic AI', 'Data Analytics'],
      industry_relevance: [
        { industry: 'Insurance', relevance_score: 0.98 },
        { industry: 'Financial Services', relevance_score: 0.85 },
      ],
      contributors: [
        { full_name: 'Kenneth Saldanha', report_role: 'Lead Author', org_unit: 'Accenture Insurance', job_title: 'Global Insurance Industry Lead', company: 'Accenture', email: 'kenneth.saldanha@accenture.com', linkedin_url: 'https://linkedin.com/in/kennethsaldanha', confidence: 'high' },
      ],
    },
    {
      report_title: 'Top 10 Trends in Banking 2024',
      executive_summary: 'This report identifies the top 10 technology and business trends reshaping the banking industry, from embedded finance and real-time payments to AI-powered risk management and open banking platforms. It provides strategic guidance for banking executives navigating digital-first transformation.',
      key_claims: [
        { claim: 'Real-time payments will account for 30% of all electronic payments by 2026', citation_ref: 'BANK-2024-web', page_section: 'Payments Innovation', confidence_score: 0.86 },
        { claim: 'AI-powered fraud detection reduces false positives by 60% compared to rule-based systems', citation_ref: 'BANK-2024-web', page_section: 'Risk Management', confidence_score: 0.89 },
      ],
      topic_tags: ['Banking', 'Payments', 'AI Transformation', 'Financial Services', 'Data Analytics'],
      industry_relevance: [
        { industry: 'Banking', relevance_score: 0.98 },
        { industry: 'Financial Services', relevance_score: 0.95 },
        { industry: 'Payments', relevance_score: 0.92 },
      ],
      contributors: [
        { full_name: 'Michael Abbott', report_role: 'Lead Author', org_unit: 'Accenture Banking', job_title: 'Senior Managing Director - Global Banking Lead', company: 'Accenture', email: 'michael.abbott@accenture.com', linkedin_url: 'https://linkedin.com/in/michaelabbott', confidence: 'high' },
      ],
    },
  ],
  personas: [
    { role_title: 'Chief Technology Officer', seniority_level: 'C-Suite', kpis: ['System uptime 99.99%', 'Time-to-market reduction', 'Technical debt ratio'], pain_points: ['Legacy system integration complexity', 'Talent shortage for cloud-native development', 'Multi-vendor orchestration overhead'], buying_triggers: ['Board mandate for digital transformation', 'Competitive pressure from fintechs', 'Regulatory compliance deadlines'], objections: ['Migration risk to production systems', 'Total cost of ownership concerns', 'Vendor lock-in fears'], committee_neighbors: ['CIO', 'CISO', 'CFO'], report_fit_score: 94 },
    { role_title: 'VP of Digital Transformation', seniority_level: 'VP/Director', kpis: ['Digital revenue percentage', 'Customer digital adoption rate', 'Process automation coverage'], pain_points: ['Organizational resistance to change', 'Siloed technology decisions', 'Measuring transformation ROI'], buying_triggers: ['CEO strategic vision alignment', 'Customer experience benchmarking gaps', 'Operational efficiency targets'], objections: ['Timeline uncertainty', 'Resource allocation conflicts', 'Change management complexity'], committee_neighbors: ['CTO', 'COO', 'Head of Product'], report_fit_score: 87 },
  ],
  icp_summary: {
    industry_segments: ['Banking', 'Insurance', 'Financial Services', 'Technology', 'Healthcare', 'Life Sciences', 'Cybersecurity', 'Sustainability', 'Energy', 'Workforce & Talent'],
    company_size_bands: ['Enterprise (10,000+)', 'Large (5,000-10,000)'],
    tech_stack_hints: ['AWS', 'Azure', 'NVIDIA', 'Kubernetes', 'Terraform'],
    geographic_focus: ['North America', 'Western Europe', 'APAC'],
  },
  enriched_contacts: [
    { full_name: 'Paul Daugherty', job_title: 'Group Chief Executive - Technology & CTO', company: 'Accenture', org_unit: 'Accenture Research', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/pauldaugherty', email: 'paul.daugherty@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Technology Vision 2025', 'Reinvention in the Age of GenAI'], persona_tags: ['CTO', 'C-Suite'] },
    { full_name: 'Lan Guan', job_title: 'Chief AI Officer', company: 'Accenture', org_unit: 'Accenture AI', location: 'San Francisco, CA', linkedin_url: 'https://linkedin.com/in/languanai', email: 'lan.guan@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Art of AI Maturity'], persona_tags: ['CAIO', 'C-Suite'] },
    { full_name: 'Julie Sweet', job_title: 'Chair & CEO', company: 'Accenture', org_unit: 'Executive Office', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/juliesweet', email: 'julie.sweet@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Making Reinvention Real'], persona_tags: ['CEO', 'C-Suite'] },
    { full_name: 'Marc Carrel-Billiard', job_title: 'Global Technology Innovation Lead', company: 'Accenture', org_unit: 'Technology Innovation', location: 'Paris, France', linkedin_url: 'https://linkedin.com/in/marccb', email: 'marc.carrel-billiard@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Technology Vision 2025'], persona_tags: ['Innovation', 'VP/Director'] },
    { full_name: 'Jim Wilson', job_title: 'Global MD - Thought Leadership', company: 'Accenture', org_unit: 'Accenture Research', location: 'Boston, MA', linkedin_url: 'https://linkedin.com/in/jimwilsonacn', email: 'james.wilson@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Reinvention in the Age of GenAI'], persona_tags: ['Research', 'VP/Director'] },
    { full_name: 'Kaveh Safavi', job_title: 'Senior Managing Director - Health Industry', company: 'Accenture', org_unit: 'Accenture Health', location: 'Washington, DC', linkedin_url: 'https://linkedin.com/in/kavehsafavi', email: 'kaveh.safavi@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Technology Trends 2025 in Healthcare'], persona_tags: ['Healthcare', 'C-Suite'] },
    { full_name: 'Paolo Dal Cin', job_title: 'Global Lead - Accenture Security', company: 'Accenture', org_unit: 'Accenture Security', location: 'Milan, Italy', linkedin_url: 'https://linkedin.com/in/paolodalcin', email: 'paolo.dal.cin@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Cybersecurity: AI-Augmented Cyber Threats'], persona_tags: ['CISO', 'Security'] },
    { full_name: 'Peter Lacy', job_title: 'Global Sustainability Services Lead', company: 'Accenture', org_unit: 'Accenture Sustainability Services', location: 'London, UK', linkedin_url: 'https://linkedin.com/in/peterlacy', email: 'peter.lacy@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Destination Net Zero'], persona_tags: ['Sustainability', 'VP/Director'] },
    { full_name: 'Ellyn Shook', job_title: 'Chief Leadership & Human Resources Officer', company: 'Accenture', org_unit: 'Accenture Leadership & Culture', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/ellynshook', email: 'ellyn.shook@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Gen AI and Talent Transformation'], persona_tags: ['CHRO', 'C-Suite'] },
    { full_name: 'Kenneth Saldanha', job_title: 'Global Insurance Industry Lead', company: 'Accenture', org_unit: 'Accenture Insurance', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/kennethsaldanha', email: 'kenneth.saldanha@accenture.com', confidence: 'high', needs_review: false, source_reports: ['5 Predictions for Insurance Industry 2026'], persona_tags: ['Insurance', 'VP/Director'] },
    { full_name: 'Michael Abbott', job_title: 'Senior Managing Director - Global Banking Lead', company: 'Accenture', org_unit: 'Accenture Banking', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/michaelabbott', email: 'michael.abbott@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Top 10 Trends in Banking 2024'], persona_tags: ['Banking', 'VP/Director'] },
    { full_name: 'Mark Knickrehm', job_title: 'Group Chief Executive - Strategy', company: 'Accenture', org_unit: 'Accenture Strategy', location: 'New York, NY', linkedin_url: 'https://linkedin.com/in/markknickrehm', email: 'mark.knickrehm@accenture.com', confidence: 'high', needs_review: false, source_reports: ['Macro Foresight 2026: Top 10 Trends'], persona_tags: ['Strategy', 'C-Suite'] },
  ],
  email_sequences: [
    {
      contact_name: 'Paul Daugherty',
      persona_tag: 'CTO',
      emails: [
        { variant_type: 'Partnership-Led', subject_line: 'Accenture invested in us — your research is why', body: 'Paul,\n\nLast October, Accenture Ventures invested in Lyzr and brought us into Project Spotlight. That decision was not random — it was driven by the exact gap your Technology Vision 2025 identifies: 95% executive consensus on AI, but most platforms fail the procurement gauntlet.\n\nSince then, Accenture has deployed 200+ agents on our platform tracking 300,000 startups globally. We have grown 10x in revenue and hit a 90% customer go-live rate. This is production ARR, not prototyping ARR.\n\nYour insight on AI-native platforms driving 3.2x faster innovation cycles is precisely what our Orchestration-as-a-Service delivers — and why your colleagues chose to back us.\n\nAs partners now, I would welcome your perspective on where we take this next.\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a 20-minute call', cited_claims: ['95% executives agree AI transformative', '3.2x faster innovation cycles', 'Accenture deployed 200+ agents on Lyzr', '90% go-live rate'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Report-Led', subject_line: 'The 95% consensus your report found has a problem', body: 'Paul,\n\n95% of executives agree AI will be transformative within 3 years. Your Technology Vision 2025 nails this. But here is what keeps me up at night: 85% of production teams abandon frameworks like LangChain before they ever reach enterprise scale.\n\nThe gap between executive consensus and production reality is where we live at Lyzr. We built an Agentic OS that passes 300-question security audits and deploys in customer VPCs — because enterprise AI is not a prototyping exercise.\n\nYour insight on AI-native platforms driving 3.2x faster innovation cycles maps directly to what our Orchestration-as-a-Service delivers in production today.\n\nWorth a 20-minute conversation?\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a 20-minute call', cited_claims: ['95% executives agree AI transformative', '3.2x faster innovation cycles', '85% abandon LangChain'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Value-Led', subject_line: 'We deployed AI agents that passed a Fortune 100 security audit', body: 'Paul,\n\nLast quarter, we deployed an AI agent pipeline for a Fortune 100 bank that passed their full 300-question security audit, VAPT testing, and red teaming — in their VPC, not ours.\n\nYour Technology Vision report identifies exactly why this matters: organizations investing in AI-native platforms see 3.2x faster innovation cycles. But only when those platforms are production-ready, not just demo-ready.\n\nLyzr is an Agentic OS built for this reality — Orchestration as a Service, Knowledge Graphs, and a Hallucination Manager that keeps outputs grounded. We hit 10x revenue growth and 90% customer go-live since your colleagues at Accenture Ventures backed us.\n\nWould a 20-minute deep dive on production-grade agent orchestration be useful?\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a 20-minute deep dive', cited_claims: ['3.2x faster innovation cycles', '10x revenue growth', '90% go-live rate'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
      ],
    },
    {
      contact_name: 'Kenneth Saldanha',
      persona_tag: 'Insurance',
      emails: [
        { variant_type: 'Partnership-Led', subject_line: 'You called agentic AI the next frontier — we built it', body: 'Kenneth,\n\nWhen you announced Accenture\'s investment in Lyzr, you said agentic AI represents the next frontier in financial services. Four months later, here is where we are: 10x revenue growth, 90% customer go-live rate, and a Fortune 100 bank that passed our full 300-question security audit.\n\nYour 5 Predictions for Insurance 2026 report identified AI-driven underwriting reducing processing time by 50%. Our Agent Studio is now automating exactly this — claims processing, policy renewals, endorsements, and mid-term changes — all with built-in compliance guardrails.\n\nI would value 20 minutes to discuss how we accelerate the joint roadmap for insurance agentic AI.\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a partnership review', cited_claims: ['Agentic AI next frontier in financial services', 'AI underwriting 50% processing time reduction', '10x revenue growth', '90% go-live rate'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Report-Led', subject_line: 'Embedded insurance at $700B needs production-grade agents', body: 'Kenneth,\n\nYour prediction that embedded insurance premiums will reach $700B by end of 2026 raises an infrastructure question most insurers are not asking: who builds the agents that underwrite, process claims, and manage policies at that scale?\n\nAt Lyzr, we are deploying production-grade AI agents for insurance workflows — not prototypes that demo well but fail the compliance audit. Our platform runs 10,000 automated simulation tests before any agent goes live, and every deployment includes Responsible AI with full audit trails.\n\nAs our partner through Accenture Ventures, you have seen this firsthand. I would welcome your input on where the insurance industry needs us most.\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Join an insurance AI strategy session', cited_claims: ['Embedded insurance $700B by 2026', '10,000 simulation tests', 'Responsible AI with audit trails'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
      ],
    },
    {
      contact_name: 'Lan Guan',
      persona_tag: 'CAIO',
      emails: [
        { variant_type: 'Partnership-Led', subject_line: 'Accenture backed us — your AI maturity framework is why', body: 'Lan,\n\nYour Art of AI Maturity research quantified what we see daily: only 12% of companies have reached AI maturity sufficient for superior growth. When Accenture Ventures invested in Lyzr last October, they bet on the infrastructure to close that gap.\n\nFour months in: 10x revenue growth, 200+ agents deployed on our platform by Accenture alone, and a 90% customer go-live rate. We are helping enterprises skip the experimentation trap your report describes — jumping straight from AI Experimenter to AI Leader.\n\nOur Chimera Architecture and Hallucination Manager are the production infrastructure that makes this jump possible. As partners now, I would value your perspective on scaling this across Accenture\'s client base.\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a 20-minute call', cited_claims: ['Only 12% reached AI maturity', '10x revenue growth', '200+ agents by Accenture', '90% go-live rate'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Report-Led', subject_line: 'Only 12% AI mature — your report explains why', body: 'Lan,\n\nYour Art of AI Maturity research found that only 12% of companies have reached AI maturity sufficient for superior growth. That number should alarm every enterprise board.\n\nHaving built Lyzr from the ground up as an enterprise Agentic OS, I see the root cause daily: most organizations are stuck on prototyping platforms that cannot survive a real security audit, let alone a production deployment.\n\nOur Chimera Architecture enables self-evolving AI agents without compromising enterprise security — and our Hallucination Manager keeps outputs grounded in trusted data. This is what the jump from "AI Experimenter" to "AI Leader" actually requires.\n\nYour framework for measuring AI maturity resonates deeply with how we think about production readiness. Worth comparing notes?\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Schedule a 20-minute call', cited_claims: ['Only 12% reached AI maturity', 'AI Leaders 2.5x higher revenue growth'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
        { variant_type: 'Insight-Led', subject_line: 'From AI Experimenter to AI Leader — the missing infrastructure', body: 'Lan,\n\nAs Accenture\'s Chief AI Officer and lead author of the AI Maturity report, you have quantified something most vendors ignore: AI Leaders achieve 2.5x higher revenue growth, but responsible AI frameworks are the prerequisite, not the afterthought.\n\nAt Lyzr, we built Responsible AI directly into the platform — compliance, safety, audit trails are not add-ons. Combined with our Knowledge Graph and Orchestration as a Service, we are helping enterprises skip the experimentation trap and deploy production-grade agents from day one.\n\nYour finding that responsible AI correlates with 35% higher stakeholder trust validates our entire architecture thesis. I would value your perspective on what the next generation of enterprise AI infrastructure looks like.\n\nSiva Surendira\nCEO, Lyzr AI', cta: 'Join a CAIO strategy session', cited_claims: ['2.5x higher revenue growth', '35% higher stakeholder trust from responsible AI'], compliance_footer: 'You are receiving this email based on your professional role. Reply STOP to opt out.' },
      ],
    },
  ],
  quality_gates: { groundedness_pass: true, dedup_pass: true, confidence_threshold_met: true, issues_flagged: [] },
  total_contacts: 12,
  total_reports: 12,
}

// ─── Topic Tag Color Map ─────────────────────────────────────────────────────
function topicTagColor(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('ai transformation')) return 'text-amber-300 border-amber-400/30 bg-amber-400/10'
  if (t === 'genai') return 'text-orange-300 border-orange-400/30 bg-orange-400/10'
  if (t === 'cloud') return 'text-sky-300 border-sky-400/30 bg-sky-400/10'
  if (t === 'technology') return 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10'
  if (t.includes('banking')) return 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
  if (t.includes('insurance')) return 'text-purple-300 border-purple-400/30 bg-purple-400/10'
  if (t.includes('financial')) return 'text-green-300 border-green-400/30 bg-green-400/10'
  if (t.includes('digital')) return 'text-indigo-300 border-indigo-400/30 bg-indigo-400/10'
  if (t.includes('automation')) return 'text-rose-300 border-rose-400/30 bg-rose-400/10'
  if (t.includes('data') || t.includes('analytics')) return 'text-teal-300 border-teal-400/30 bg-teal-400/10'
  if (t.includes('healthcare') || t.includes('life sciences')) return 'text-pink-300 border-pink-400/30 bg-pink-400/10'
  if (t.includes('cybersecurity') || t.includes('risk')) return 'text-red-300 border-red-400/30 bg-red-400/10'
  if (t.includes('sustainability') || t.includes('net zero') || t.includes('energy')) return 'text-lime-300 border-lime-400/30 bg-lime-400/10'
  if (t.includes('workforce') || t.includes('talent')) return 'text-violet-300 border-violet-400/30 bg-violet-400/10'
  if (t.includes('agentic')) return 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10'
  if (t.includes('sovereign')) return 'text-yellow-300 border-yellow-400/30 bg-yellow-400/10'
  if (t.includes('supply chain')) return 'text-stone-300 border-stone-400/30 bg-stone-400/10'
  if (t.includes('payments')) return 'text-emerald-200 border-emerald-300/30 bg-emerald-300/10'
  if (t.includes('consumer')) return 'text-blue-300 border-blue-400/30 bg-blue-400/10'
  if (t.includes('inclusion') || t.includes('diversity')) return 'text-neutral-300 border-neutral-400/30 bg-neutral-400/10'
  if (t.includes('autonomous') || t.includes('quantum') || t.includes('edge') || t.includes('spatial')) return 'text-cyan-200 border-cyan-300/30 bg-cyan-300/10'
  return 'text-primary border-primary/20 bg-primary/10'
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

// ─── JSON Boundary Extraction ────────────────────────────────────────────────
function extractJsonFromText(text: string): string | null {
  if (!text || typeof text !== 'string') return null

  // Try markdown code block first
  const codeBlock = text.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlock) {
    const inner = codeBlock[1].trim()
    if (inner.startsWith('{') || inner.startsWith('[')) return inner
  }

  // Find the first { and its matching }
  let start = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') { start = i; break }
  }
  if (start === -1) return null

  const openChar = text[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"' && !esc) { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === openChar) depth++
    else if (ch === closeChar) {
      depth--
      if (depth === 0) return text.substring(start, i + 1)
    }
  }

  // No matching close found — return from start anyway (may be truncated)
  if (start !== -1) return text.substring(start)
  return null
}

function tryParseJsonAggressive(text: string): any {
  if (!text) return null
  // Direct parse
  try { return JSON.parse(text) } catch { /* continue */ }
  // Extract boundary then parse
  const extracted = extractJsonFromText(text)
  if (extracted) {
    try { return JSON.parse(extracted) } catch { /* continue */ }
    // Try common fixes
    try {
      const fixed = extracted
        .replace(/,(\s*[}\]])/g, '$1')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
      return JSON.parse(fixed)
    } catch { /* continue */ }
  }
  return null
}

// ─── Parse Agent Response ────────────────────────────────────────────────────
function findPlaybookData(obj: any, depth: number = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  // Direct match: object has report_playbooks
  if (Array.isArray(obj.report_playbooks)) return obj
  // Check nested keys commonly used by Lyzr responses
  const searchKeys = ['result', 'response', 'data', 'output', 'content', 'message', 'text']
  for (const key of searchKeys) {
    if (obj[key] != null) {
      // If it's a string, try to parse as JSON (with aggressive extraction)
      if (typeof obj[key] === 'string') {
        const parsed = tryParseJsonAggressive(obj[key])
        if (parsed && typeof parsed === 'object') {
          const found = findPlaybookData(parsed, depth + 1)
          if (found) return found
          // Also check if parsed itself has report_playbooks
          if (Array.isArray(parsed.report_playbooks)) return parsed
        }
      } else if (typeof obj[key] === 'object') {
        const found = findPlaybookData(obj[key], depth + 1)
        if (found) return found
      }
    }
  }
  // Also iterate ALL keys (not just known ones) looking for report_playbooks in nested objects
  for (const key of Object.keys(obj)) {
    if (searchKeys.includes(key)) continue // already checked
    const val = obj[key]
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = findPlaybookData(val, depth + 1)
      if (found) return found
    }
  }
  return null
}

function parseAgentResponse(result: any): PlaybookData | null {
  if (!result) return null

  // Log for debugging
  console.log('[parseAgentResponse] result.success:', result?.success)
  console.log('[parseAgentResponse] result.error:', result?.error)
  console.log('[parseAgentResponse] result.response?.status:', result?.response?.status)
  console.log('[parseAgentResponse] result.response?.result keys:', result?.response?.result ? Object.keys(result.response.result) : 'N/A')

  // If result.success is false, still try to find data in the response
  // (some responses return success:true at poll level but different structure)

  let data: any = null

  // Strategy 1: Standard path result.response.result
  if (result?.response?.result && typeof result.response.result === 'object') {
    if (Array.isArray(result.response.result.report_playbooks)) {
      data = result.response.result
    }
  }

  // Strategy 2: Deep search through the entire result object
  if (!data) {
    data = findPlaybookData(result)
  }

  // Strategy 3: Try result.response.message as JSON string
  if (!data && result?.response?.message && typeof result.response.message === 'string') {
    try {
      const parsed = JSON.parse(result.response.message)
      data = findPlaybookData(parsed) || (Array.isArray(parsed?.report_playbooks) ? parsed : null)
    } catch { /* not JSON */ }
  }

  // Strategy 4: Try raw_response as JSON string
  if (!data && typeof result?.raw_response === 'string') {
    try {
      const parsed = JSON.parse(result.raw_response)
      data = findPlaybookData(parsed) || (Array.isArray(parsed?.report_playbooks) ? parsed : null)
    } catch { /* not JSON */ }
  }

  // Strategy 5: result.response itself might be the data
  if (!data && result?.response && Array.isArray(result.response.report_playbooks)) {
    data = result.response
  }

  // Strategy 6: result itself might contain the data (flat response)
  if (!data && Array.isArray(result?.report_playbooks)) {
    data = result
  }

  // Strategy 7: result.response.result.text — use aggressive JSON extraction (handles prose, markdown, etc.)
  if (!data && result?.response?.result?.text && typeof result.response.result.text === 'string') {
    console.log('[parseAgentResponse] Strategy 7: Attempting aggressive extraction from text field, length:', result.response.result.text.length)
    const textParsed = tryParseJsonAggressive(result.response.result.text)
    if (textParsed && typeof textParsed === 'object') {
      data = findPlaybookData(textParsed) || (Array.isArray(textParsed?.report_playbooks) ? textParsed : null)
      if (data) console.log('[parseAgentResponse] Strategy 7 SUCCEEDED')
    }
  }

  // Strategy 8: Try deeply nested result.response.response (double-wrapped)
  if (!data && result?.response?.response) {
    const inner = result.response.response
    if (typeof inner === 'string') {
      const parsed = tryParseJsonAggressive(inner)
      if (parsed && typeof parsed === 'object') {
        data = findPlaybookData(parsed) || (Array.isArray(parsed?.report_playbooks) ? parsed : null)
      }
    } else if (typeof inner === 'object') {
      data = findPlaybookData(inner) || (Array.isArray(inner?.report_playbooks) ? inner : null)
    }
  }

  // Strategy 9: Aggressive JSON extraction from raw_response using boundary detection
  if (!data && typeof result?.raw_response === 'string' && result.raw_response.length > 100) {
    console.log('[parseAgentResponse] Strategy 9: Aggressive boundary extraction from raw_response, length:', result.raw_response.length)
    const rawParsed = tryParseJsonAggressive(result.raw_response)
    if (rawParsed && typeof rawParsed === 'object') {
      data = findPlaybookData(rawParsed) || (Array.isArray(rawParsed?.report_playbooks) ? rawParsed : null)
      if (data) console.log('[parseAgentResponse] Strategy 9 SUCCEEDED from raw_response')
    }
  }

  // Strategy 10: Try result.response.message with aggressive extraction
  if (!data && result?.response?.message && typeof result.response.message === 'string' && result.response.message.length > 100) {
    console.log('[parseAgentResponse] Strategy 10: Aggressive extraction from response.message')
    const msgParsed = tryParseJsonAggressive(result.response.message)
    if (msgParsed && typeof msgParsed === 'object') {
      data = findPlaybookData(msgParsed) || (Array.isArray(msgParsed?.report_playbooks) ? msgParsed : null)
      if (data) console.log('[parseAgentResponse] Strategy 10 SUCCEEDED')
    }
  }

  if (!data) {
    console.log('[parseAgentResponse] FAILED - no data found. Full result keys:', result ? Object.keys(result) : 'null')
    if (result?.response) console.log('[parseAgentResponse] response keys:', Object.keys(result.response))
    if (result?.response?.result) {
      console.log('[parseAgentResponse] result.response.result type:', typeof result.response.result, 'value preview:', JSON.stringify(result.response.result).substring(0, 500))
      // Log what the text field actually contains
      if (result.response.result.text) {
        const textPreview = String(result.response.result.text)
        console.log('[parseAgentResponse] text field length:', textPreview.length)
        console.log('[parseAgentResponse] text field first 300 chars:', textPreview.substring(0, 300))
        console.log('[parseAgentResponse] text field last 300 chars:', textPreview.substring(Math.max(0, textPreview.length - 300)))
      }
    }
    if (result?.raw_response) console.log('[parseAgentResponse] raw_response preview:', String(result.raw_response).substring(0, 500))
    return null
  }

  console.log('[parseAgentResponse] SUCCESS - found data with', Array.isArray(data.report_playbooks) ? data.report_playbooks.length : 0, 'report_playbooks')

  const artifactFiles = Array.isArray(result?.module_outputs?.artifact_files)
    ? result.module_outputs.artifact_files
    : []

  return {
    playbook_id: data.playbook_id || '',
    generation_date: data.generation_date || new Date().toISOString(),
    pipeline_status: data.pipeline_status || 'completed',
    report_playbooks: Array.isArray(data.report_playbooks) ? data.report_playbooks.map((rp: any) => ({
      report_title: rp.report_title || '',
      executive_summary: rp.executive_summary || '',
      key_claims: Array.isArray(rp.key_claims) ? rp.key_claims : [],
      topic_tags: Array.isArray(rp.topic_tags) ? rp.topic_tags : [],
      industry_relevance: Array.isArray(rp.industry_relevance) ? rp.industry_relevance : [],
      contributors: Array.isArray(rp.contributors) ? rp.contributors : [],
    })) : [],
    personas: Array.isArray(data.personas) ? data.personas : [],
    icp_summary: data.icp_summary || { industry_segments: [], company_size_bands: [], tech_stack_hints: [], geographic_focus: [] },
    enriched_contacts: Array.isArray(data.enriched_contacts) ? data.enriched_contacts : [],
    email_sequences: Array.isArray(data.email_sequences) ? data.email_sequences : [],
    quality_gates: data.quality_gates || { groundedness_pass: false, dedup_pass: false, confidence_threshold_met: false, issues_flagged: [] },
    total_contacts: data.total_contacts || 0,
    total_reports: data.total_reports || 0,
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

// ─── Collect all unique topic tags from playbook ─────────────────────────────
function collectAllTopicTags(playbook: PlaybookData): string[] {
  const tagSet = new Set<string>()
  const reports = Array.isArray(playbook?.report_playbooks) ? playbook.report_playbooks : []
  reports.forEach(rp => {
    if (Array.isArray(rp?.topic_tags)) {
      rp.topic_tags.forEach(t => tagSet.add(t))
    }
  })
  return Array.from(tagSet).sort()
}

// ─── Playbook Display Name Helper ─────────────────────────────────────────────
function getPlaybookDisplayName(pb: PlaybookData): string {
  if (pb.display_name) return pb.display_name
  const reports = Array.isArray(pb?.report_playbooks) ? pb.report_playbooks : []
  if (reports.length === 0) return pb.playbook_id || 'Untitled Playbook'
  const firstName = reports[0]?.report_title || 'Untitled Report'
  if (reports.length === 1) return firstName
  return `${firstName} + ${reports.length - 1} more report${reports.length - 1 > 1 ? 's' : ''}`
}

// ─── Rich Email Editor Component ──────────────────────────────────────────────
function RichEmailEditor({ initialBody, onSave, onCancel }: {
  initialBody: string
  onSave: (html: string) => void
  onCancel: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      // Convert newlines to <br> for initial content if it looks like plain text
      const hasHtml = /<[a-z][\s\S]*>/i.test(initialBody)
      editorRef.current.innerHTML = hasHtml ? initialBody : initialBody.replace(/\n/g, '<br>')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const handleInsertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      const sel = window.getSelection()
      if (sel && sel.toString().length > 0) {
        execCmd('createLink', url)
      } else {
        const linkText = prompt('Enter link text:', url) || url
        execCmd('insertHTML', `<a href="${url}" style="color:#c9a84c;text-decoration:underline" target="_blank">${linkText}</a>`)
      }
    }
  }

  const handleInsertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCmd('insertHTML', `<img src="${url}" alt="Inserted image" style="max-width:100%;height:auto;margin:8px 0;display:block" />`)
    }
  }

  const handleInsertVideo = () => {
    const url = prompt('Enter video URL (YouTube, Vimeo, or direct):')
    if (url) {
      // Try to create an embedded link with a play-button style thumbnail
      execCmd('insertHTML', `<div style="margin:8px 0;padding:12px;border:1px solid rgba(255,255,255,0.1);display:inline-block"><a href="${url}" target="_blank" style="color:#c9a84c;text-decoration:none;display:flex;align-items:center;gap:8px"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3)">&#9654;</span> Watch Video</a></div>`)
    }
  }

  const handleSave = () => {
    if (editorRef.current) {
      onSave(editorRef.current.innerHTML)
    }
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap border border-border bg-secondary/20 p-1.5">
        <button onClick={() => execCmd('bold')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Bold"><FiBold size={14} /></button>
        <button onClick={() => execCmd('italic')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Italic"><FiItalic size={14} /></button>
        <button onClick={() => execCmd('underline')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Underline"><FiUnderline size={14} /></button>
        <div className="w-px h-5 bg-border mx-1" />
        <button onClick={handleInsertLink} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Insert Link"><FiLink size={14} /></button>
        <button onClick={handleInsertImage} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Insert Image"><FiImage size={14} /></button>
        <button onClick={handleInsertVideo} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Insert Video"><FiVideo size={14} /></button>
        <button onClick={() => execCmd('insertHorizontalRule')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Insert Divider"><FiMinus size={14} /></button>
      </div>
      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[200px] max-h-[400px] overflow-y-auto bg-secondary/30 border border-border p-4 text-sm leading-relaxed text-foreground/80 focus:outline-none focus:border-primary transition-colors"
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground text-xs tracking-widest uppercase hover:text-foreground transition-colors">
          <FiX size={12} /> Cancel
        </button>
        <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs tracking-widest uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
          <FiSave size={12} /> Save
        </button>
      </div>
    </div>
  )
}

// ─── Gmail Send Panel Component ───────────────────────────────────────────────
function GmailSendPanel({ email, contactEmail, contactName, onClose }: {
  email: EmailVariant
  contactEmail: string
  contactName: string
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    to: contactEmail,
    subject: email?.subject_line ?? '',
    body: email?.body ?? '',
    cc: '',
    bcc: '',
  })
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSend = async () => {
    if (!formData.to || !formData.subject || !formData.body) return
    setSending(true)
    setFeedback(null)
    try {
      let message = `Send this email via Gmail. recipient_email: ${formData.to}, subject: ${formData.subject}, body: ${formData.body}`
      if (formData.cc) message += `, cc: ${formData.cc}`
      if (formData.bcc) message += `, bcc: ${formData.bcc}`
      const result = await callAIAgent(message, EMAIL_AGENT_ID)
      if (result?.success) {
        setFeedback({ type: 'success', message: `Email sent to ${formData.to} successfully.` })
      } else {
        setFeedback({ type: 'error', message: result?.error || 'Failed to send email. Please try again.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'An error occurred while sending.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 border border-primary/20 bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-primary">
          <FiSend size={12} />
          <span>Send via Gmail</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
          <FiX size={14} />
        </button>
      </div>
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Recipient</label>
        <input type="email" value={formData.to} onChange={(e) => setFormData(prev => ({ ...prev, to: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" placeholder="recipient@example.com" />
      </div>
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Subject</label>
        <input type="text" value={formData.subject} onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Body</label>
        <textarea value={formData.body} onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))} rows={5} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">CC (optional)</label>
          <input type="email" value={formData.cc} onChange={(e) => setFormData(prev => ({ ...prev, cc: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" placeholder="cc@example.com" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">BCC (optional)</label>
          <input type="email" value={formData.bcc} onChange={(e) => setFormData(prev => ({ ...prev, bcc: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" placeholder="bcc@example.com" />
        </div>
      </div>
      {feedback && (
        <div className={`text-xs p-2.5 border ${feedback.type === 'success' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-destructive border-destructive/20 bg-destructive/5'}`}>
          {feedback.message}
        </div>
      )}
      <button onClick={handleSend} disabled={sending || !formData.to || !formData.subject || !formData.body} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground text-xs tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
        {sending ? <><FiLoader className="animate-spin" size={12} /> Sending</> : <><FiSend size={12} /> Send Email</>}
      </button>
    </div>
  )
}

// ─── Instantly Add to Campaign Panel Component ────────────────────────────────
function InstantlySendPanel({ contactEmail, contactName, onClose }: {
  contactEmail: string
  contactName: string
  onClose: () => void
}) {
  const nameParts = (contactName || '').split(' ')
  const [formData, setFormData] = useState({
    email: contactEmail,
    campaignName: '',
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
  })
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleAdd = async () => {
    if (!formData.email || !formData.campaignName) return
    setSending(true)
    setFeedback(null)
    try {
      const message = `Add this lead to Instantly campaign. email: ${formData.email}, campaign_name: ${formData.campaignName}, first_name: ${formData.firstName}, last_name: ${formData.lastName}`
      const result = await callAIAgent(message, EMAIL_AGENT_ID)
      if (result?.success) {
        setFeedback({ type: 'success', message: `Lead ${formData.email} added to campaign "${formData.campaignName}" successfully.` })
      } else {
        setFeedback({ type: 'error', message: result?.error || 'Failed to add lead. Please try again.' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'An error occurred.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 border border-amber-400/20 bg-secondary/20 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs tracking-widest uppercase text-amber-400">
          <FiZap size={12} />
          <span>Add to Instantly Campaign</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
          <FiX size={14} />
        </button>
      </div>
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Contact Email</label>
        <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Campaign Name</label>
        <input type="text" value={formData.campaignName} onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" placeholder="e.g. Q1 CTO Outreach" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">First Name</label>
          <input type="text" value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-1">Last Name</label>
          <input type="text" value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary" />
        </div>
      </div>
      {feedback && (
        <div className={`text-xs p-2.5 border ${feedback.type === 'success' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-destructive border-destructive/20 bg-destructive/5'}`}>
          {feedback.message}
        </div>
      )}
      <button onClick={handleAdd} disabled={sending || !formData.email || !formData.campaignName} className="w-full flex items-center justify-center gap-2 py-2.5 border border-amber-400 text-amber-400 text-xs tracking-widest uppercase hover:bg-amber-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        {sending ? <><FiLoader className="animate-spin" size={12} /> Adding</> : <><FiZap size={12} /> Add to Campaign</>}
      </button>
    </div>
  )
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
function DashboardScreen({ onGenerate, isGenerating, currentStep, stepTimes, savedPlaybooks, setActiveSection, setCurrentPlaybook, onDeletePlaybook, showSample, errorMsg }: {
  onGenerate: (urls: string, industry: string, region: string, persona: string, keywords: string, uploadedDocNames: string[]) => void
  isGenerating: boolean
  currentStep: number
  stepTimes: number[]
  savedPlaybooks: PlaybookData[]
  setActiveSection: (s: ActiveSection) => void
  setCurrentPlaybook: (p: PlaybookData) => void
  onDeletePlaybook: (idx: number) => void
  showSample: boolean
  errorMsg: string
}) {
  const [urls, setUrls] = useState(showSample ? 'https://www.accenture.com/us-en/insights/technology/technology-trends-2025\nhttps://www.accenture.com/us-en/insights/artificial-intelligence/ai-maturity-and-transformation' : '')
  const [industry, setIndustry] = useState(showSample ? 'Banking' : 'All')
  const [region, setRegion] = useState(showSample ? 'NA' : 'Global')
  const [persona, setPersona] = useState(showSample ? 'C-Suite' : 'All')
  const [keywords, setKeywords] = useState(showSample ? 'cloud migration, AI platforms, cost optimization' : '')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; status: 'uploading' | 'trained' | 'failed'; error?: string }[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(f =>
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.type === 'text/plain' ||
      f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.txt')
    )
    if (validFiles.length === 0) return

    // Add files to the list as uploading
    const newEntries = validFiles.map(f => ({ name: f.name, status: 'uploading' as const }))
    setUploadedFiles(prev => [...prev, ...newEntries])

    // Upload each file to the KB
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      try {
        const result = await uploadAndTrainDocument(RAG_ID, file)
        setUploadedFiles(prev => prev.map(entry =>
          entry.name === file.name && entry.status === 'uploading'
            ? { ...entry, status: result.success ? 'trained' : 'failed', error: result.error }
            : entry
        ))
      } catch (err: any) {
        setUploadedFiles(prev => prev.map(entry =>
          entry.name === file.name && entry.status === 'uploading'
            ? { ...entry, status: 'failed', error: err?.message || 'Upload failed' }
            : entry
        ))
      }
    }
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const removeUploadedFile = (name: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== name))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left Column: Input Form */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h2 className="font-serif text-2xl tracking-wider mb-1">Generate Playbook</h2>
          <p className="text-muted-foreground text-xs tracking-wider uppercase">Provide seed URLs, upload documents, or both to generate a per-report ABM intelligence playbook</p>
        </div>

        <div className="bg-card border border-border p-6 space-y-5">
          <div>
            <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Seed URLs <span className="normal-case tracking-normal text-muted-foreground/50">(optional if documents uploaded)</span></label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="Enter report URLs, one per line... (optional if you upload documents below)"
              rows={4}
              className="w-full bg-secondary/50 border border-border text-foreground text-sm p-3 focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Upload Reports</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border border-dashed p-4 text-center transition-colors cursor-pointer ${isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
              onClick={() => uploadInputRef.current?.click()}
            >
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
              <FiUpload className="mx-auto text-muted-foreground mb-2" size={20} />
              <p className="text-xs text-muted-foreground tracking-wider">
                Drop PDF, DOCX, or TXT files here or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">Files are uploaded to the knowledge base for agent processing</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-2">
                      <FiFileText size={12} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-foreground/80 truncate max-w-[200px]">{file.name}</span>
                      {file.status === 'uploading' && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <FiLoader className="animate-spin" size={10} /> Training
                        </span>
                      )}
                      {file.status === 'trained' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <FiCheck size={10} /> Trained
                        </span>
                      )}
                      {file.status === 'failed' && (
                        <span className="flex items-center gap-1 text-xs text-destructive" title={file.error}>
                          <FiAlertTriangle size={10} /> Failed
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeUploadedFile(file.name) }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-muted-foreground mb-2">Industry</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full bg-secondary/50 border border-border text-foreground text-sm p-2.5 focus:outline-none focus:border-primary">
                <option value="All">All Industries</option>
                <option value="Banking">Banking</option>
                <option value="Insurance">Insurance</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Life Sciences">Life Sciences</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Workforce & Talent">Workforce & Talent</option>
                <option value="Sustainability & Energy">Sustainability & Energy</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="Consumer">Consumer</option>
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
            onClick={() => {
              const trainedDocs = uploadedFiles.filter(f => f.status === 'trained').map(f => f.name)
              onGenerate(urls, industry, region, persona, keywords, trainedDocs)
            }}
            disabled={isGenerating || (!urls.trim() && uploadedFiles.filter(f => f.status === 'trained').length === 0)}
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
            {savedPlaybooks.map((pb, idx) => {
              const reportCount = Array.isArray(pb?.report_playbooks) ? pb.report_playbooks.length : 0
              return (
                <div
                  key={idx}
                  className="relative bg-card border border-border hover:border-primary/30 transition-all duration-200 group"
                >
                  <button
                    onClick={() => { setCurrentPlaybook(pb); setActiveSection('playbooks') }}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-serif tracking-wider group-hover:text-primary transition-colors line-clamp-2">{getPlaybookDisplayName(pb)}</h4>
                      <span className={`text-xs tracking-widest uppercase px-2 py-0.5 border flex-shrink-0 ${pb.pipeline_status === 'completed' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'}`}>
                        {pb.pipeline_status || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FiFileText size={11} /> {reportCount} report{reportCount !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1"><FiUsers size={11} /> {pb.total_contacts ?? 0} contacts</span>
                      <span className="flex items-center gap-1"><FiClock size={11} /> {pb.generation_date ? new Date(pb.generation_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePlaybook(idx) }}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive transition-all"
                    title="Delete playbook"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              )
            })}
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

// ─── Report Card Component ───────────────────────────────────────────────────
function ReportCard({ report, reportIndex, copiedId, setCopiedId }: {
  report: ReportPlaybook
  reportIndex: number
  copiedId: string
  setCopiedId: (id: string) => void
}) {
  const [summaryExpanded, setSummaryExpanded] = useState(reportIndex === 0)
  const [claimsExpanded, setClaimsExpanded] = useState(false)
  const [contributorsExpanded, setContributorsExpanded] = useState(true)

  const contributors = Array.isArray(report?.contributors) ? report.contributors : []
  const keyClaims = Array.isArray(report?.key_claims) ? report.key_claims : []
  const topicTags = Array.isArray(report?.topic_tags) ? report.topic_tags : []
  const industryRelevance = Array.isArray(report?.industry_relevance) ? report.industry_relevance : []

  return (
    <div className="bg-card border border-border border-l-2 border-l-primary">
      {/* Report Title & Tags */}
      <div className="p-6 pb-4">
        <h3 className="font-serif text-xl tracking-wider mb-3">{report?.report_title || 'Untitled Report'}</h3>
        <div className="flex flex-wrap gap-1.5">
          {topicTags.map((tag, i) => (
            <span key={i} className={`text-xs tracking-wider px-2 py-0.5 border ${topicTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="px-6 pb-4">
        <button
          onClick={() => setSummaryExpanded(!summaryExpanded)}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {summaryExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          Executive Summary
        </button>
        {summaryExpanded && (
          <div className="text-sm leading-relaxed text-foreground/85 pl-5 border-l border-border/50">
            {renderMarkdown(report?.executive_summary || '')}
          </div>
        )}
      </div>

      {/* Key Claims */}
      <div className="px-6 pb-4">
        <button
          onClick={() => setClaimsExpanded(!claimsExpanded)}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          {claimsExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          Key Claims
          <span className="text-xs text-muted-foreground/60 normal-case tracking-normal">({keyClaims.length})</span>
        </button>
        {claimsExpanded && (
          <div className="grid grid-cols-1 gap-3 pl-5">
            {keyClaims.map((claim, idx) => (
              <div key={idx} className="bg-secondary/30 border border-border/50 p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm flex-1">{claim.claim ?? ''}</p>
                  <span className={`text-xs tracking-wider uppercase px-2 py-0.5 border flex-shrink-0 ${confidenceColor(claim.confidence_score ?? 0)}`}>
                    {((claim.confidence_score ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FiFileText size={10} />
                  <span>{claim.citation_ref ?? ''}</span>
                  <span className="text-muted-foreground/30">|</span>
                  <span>{claim.page_section ?? ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Industry Relevance */}
      {industryRelevance.length > 0 && (
        <div className="px-6 pb-4">
          <div className="text-xs tracking-widest uppercase text-muted-foreground mb-2 pl-5">Industry Relevance</div>
          <div className="flex flex-wrap gap-4 pl-5">
            {industryRelevance.map((ind, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-foreground/70">{ind.industry ?? ''}</span>
                <div className="w-20 bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${confidenceBarColor(ind.relevance_score ?? 0)} transition-all duration-500`} style={{ width: `${(ind.relevance_score ?? 0) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{((ind.relevance_score ?? 0) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contributors Section */}
      <div className="px-6 pb-6">
        <button
          onClick={() => setContributorsExpanded(!contributorsExpanded)}
          className="flex items-center gap-2 text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          {contributorsExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
          Authors & Contributors
          <span className="text-xs tracking-wider px-1.5 py-0.5 bg-primary/15 text-primary border border-primary/20 normal-case">{contributors.length}</span>
        </button>
        {contributorsExpanded && contributors.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal">Name</th>
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal">Role</th>
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal">Title / Company</th>
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal">Email</th>
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">Li</th>
                  <th className="text-left p-2 text-xs tracking-widest uppercase text-muted-foreground font-normal">Conf.</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((contrib, cIdx) => {
                  const emailCopyId = `report-${reportIndex}-contrib-${cIdx}`
                  return (
                    <tr key={cIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-2">
                        <span className="font-serif tracking-wider">{contrib.full_name ?? ''}</span>
                      </td>
                      <td className="p-2">
                        <span className="text-xs uppercase tracking-wider text-primary border border-primary/20 px-1.5 py-0.5 bg-primary/5">{contrib.report_role ?? ''}</span>
                      </td>
                      <td className="p-2 text-foreground/70">
                        <div className="text-xs">{contrib.job_title ?? ''}</div>
                        <div className="text-xs text-muted-foreground">{contrib.company ?? ''} {contrib.org_unit ? `/ ${contrib.org_unit}` : ''}</div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          {contrib.email ? (
                            <>
                              <a href={`mailto:${contrib.email}`} className="text-xs text-foreground/70 hover:text-primary transition-colors">{contrib.email}</a>
                              <button
                                onClick={() => copyToClipboard(contrib.email ?? '', setCopiedId, emailCopyId)}
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5 flex-shrink-0"
                              >
                                {copiedId === emailCopyId ? <FiCheck size={11} className="text-green-400" /> : <FiCopy size={11} />}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {contrib.linkedin_url ? (
                          <a href={contrib.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                            <FiExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={`text-xs uppercase tracking-widest px-1.5 py-0.5 border ${confidenceColor(contrib.confidence ?? 'low')}`}>
                          {contrib.confidence ?? 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {contributorsExpanded && contributors.length === 0 && (
          <div className="text-xs text-muted-foreground pl-5">No contributors extracted for this report</div>
        )}
      </div>
    </div>
  )
}

// ─── Playbook Results Screen ─────────────────────────────────────────────────
function PlaybookResultsScreen({ playbook, copiedId, setCopiedId, onDeletePlaybook, onUpdatePlaybook }: {
  playbook: PlaybookData
  copiedId: string
  setCopiedId: (id: string) => void
  onDeletePlaybook: () => void
  onUpdatePlaybook: (updated: PlaybookData) => void
}) {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedTopic, setSelectedTopic] = useState('All')
  const [expandedPersona, setExpandedPersona] = useState<number | null>(null)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)
  const [contactFilter, setContactFilter] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set())
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(getPlaybookDisplayName(playbook))
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null)
  const [gmailPanelId, setGmailPanelId] = useState<string | null>(null)
  const [instantlyPanelId, setInstantlyPanelId] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNameValue(getPlaybookDisplayName(playbook))
  }, [playbook])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  const handleNameSave = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== getPlaybookDisplayName(playbook)) {
      const updated = { ...playbook, display_name: trimmed }
      onUpdatePlaybook(updated)
    }
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave()
    if (e.key === 'Escape') { setNameValue(getPlaybookDisplayName(playbook)); setEditingName(false) }
  }

  // Find contact email from sequence for send panels
  const findContactEmail = (contactName: string): string => {
    const contacts = Array.isArray(playbook?.enriched_contacts) ? playbook.enriched_contacts : []
    const match = contacts.find(c => c.full_name === contactName)
    return match?.email || ''
  }

  const handleEmailBodySave = (sIdx: number, eIdx: number, html: string) => {
    const updated = { ...playbook }
    if (Array.isArray(updated.email_sequences) && updated.email_sequences[sIdx] && Array.isArray(updated.email_sequences[sIdx].emails) && updated.email_sequences[sIdx].emails[eIdx]) {
      updated.email_sequences = [...updated.email_sequences]
      updated.email_sequences[sIdx] = { ...updated.email_sequences[sIdx], emails: [...updated.email_sequences[sIdx].emails] }
      updated.email_sequences[sIdx].emails[eIdx] = { ...updated.email_sequences[sIdx].emails[eIdx], body: html }
      onUpdatePlaybook(updated)
    }
    setEditingEmailId(null)
  }

  const tabs = ['Reports & Contributors', 'Personas & ICPs', 'All Contacts', 'ABM Emails']

  const allTopicTags = collectAllTopicTags(playbook)
  const reportPlaybooks = Array.isArray(playbook?.report_playbooks) ? playbook.report_playbooks : []

  // Filter reports by selected topic
  const filteredReports = selectedTopic === 'All'
    ? reportPlaybooks
    : reportPlaybooks.filter(rp => Array.isArray(rp?.topic_tags) && rp.topic_tags.includes(selectedTopic))

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
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="font-serif text-2xl tracking-wider bg-secondary/50 border border-primary text-foreground px-2 py-1 focus:outline-none min-w-[300px]"
              />
              <button onClick={handleNameSave} className="text-primary hover:text-primary/80 transition-colors p-1" title="Save name">
                <FiCheck size={18} />
              </button>
            </div>
          ) : (
            <h2
              className="font-serif text-2xl tracking-wider cursor-pointer group flex items-center gap-2 hover:text-primary transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to rename playbook"
            >
              {getPlaybookDisplayName(playbook)}
              <FiEdit size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground tracking-wider">
            <span>{playbook?.playbook_id || ''}</span>
            <span>{playbook?.generation_date ? new Date(playbook.generation_date).toLocaleDateString() : ''}</span>
            <span className="flex items-center gap-1"><FiFileText size={11} /> {playbook?.total_reports ?? 0} reports</span>
            <span className="flex items-center gap-1"><FiUsers size={11} /> {playbook?.total_contacts ?? 0} contacts</span>
            <span className={`uppercase px-2 py-0.5 border ${playbook?.pipeline_status === 'completed' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'}`}>
              {playbook?.pipeline_status || 'Unknown'}
            </span>
          </div>
        </div>
        {/* Quality Gates & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            {playbook?.quality_gates?.groundedness_pass && <span className="flex items-center gap-1 text-xs text-green-400"><FiShield size={12} /> Grounded</span>}
            {playbook?.quality_gates?.dedup_pass && <span className="flex items-center gap-1 text-xs text-green-400"><FiCheck size={12} /> Deduped</span>}
            {playbook?.quality_gates?.confidence_threshold_met && <span className="flex items-center gap-1 text-xs text-green-400"><FiActivity size={12} /> Confidence Met</span>}
          </div>
          <button
            onClick={onDeletePlaybook}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground text-xs tracking-widest uppercase hover:border-destructive hover:text-destructive transition-colors"
          >
            <FiTrash2 size={12} /> Delete
          </button>
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
        {/* Tab 0: Reports & Contributors */}
        {activeTab === 0 && (
          <div className="space-y-6">
            {/* Topic Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs tracking-widest uppercase text-muted-foreground mr-2 flex items-center gap-1"><FiTag size={11} /> Filter by Topic:</span>
              <button
                onClick={() => setSelectedTopic('All')}
                className={`text-xs tracking-wider px-3 py-1 border transition-colors ${selectedTopic === 'All' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
              >
                All ({reportPlaybooks.length})
              </button>
              {allTopicTags.map((tag, i) => {
                const count = reportPlaybooks.filter(rp => Array.isArray(rp?.topic_tags) && rp.topic_tags.includes(tag)).length
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedTopic(tag)}
                    className={`text-xs tracking-wider px-3 py-1 border transition-colors ${selectedTopic === tag ? `border-current ${topicTagColor(tag)}` : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
                  >
                    {tag} ({count})
                  </button>
                )
              })}
            </div>

            {/* Report Cards */}
            {filteredReports.length > 0 ? (
              <div className="space-y-6">
                {filteredReports.map((report, idx) => (
                  <ReportCard
                    key={idx}
                    report={report}
                    reportIndex={idx}
                    copiedId={copiedId}
                    setCopiedId={setCopiedId}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border p-12 text-center">
                <FiSearch className="mx-auto text-muted-foreground/30 mb-3" size={28} />
                <p className="text-sm text-muted-foreground">No reports match the selected topic filter</p>
                <button onClick={() => setSelectedTopic('All')} className="text-xs text-primary mt-2 hover:underline">Show all reports</button>
              </div>
            )}
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

        {/* Tab 2: All Contacts */}
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
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Location</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal w-8">Li</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Email</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Confidence</th>
                    <th className="text-left p-3 text-xs tracking-widest uppercase text-muted-foreground font-normal">Source Reports</th>
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
                      <td className="p-3 text-foreground/70 text-xs">{contact.location ?? ''}</td>
                      <td className="p-3">
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                            <FiExternalLink size={13} />
                          </a>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-foreground/70">{contact.email ?? ''}</span>
                          {contact.email && (
                            <button
                              onClick={() => copyToClipboard(contact.email ?? '', setCopiedId, `contact-tab-${idx}`)}
                              className="text-muted-foreground hover:text-primary transition-colors p-0.5 flex-shrink-0"
                            >
                              {copiedId === `contact-tab-${idx}` ? <FiCheck size={11} className="text-green-400" /> : <FiCopy size={11} />}
                            </button>
                          )}
                        </div>
                      </td>
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
            {Array.isArray(playbook?.email_sequences) && playbook.email_sequences.map((seq, sIdx) => {
              const seqContactEmail = findContactEmail(seq.contact_name ?? '')
              return (
                <div key={sIdx} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FiMail className="text-primary" size={14} />
                    <h3 className="font-serif text-sm tracking-wider">{seq.contact_name ?? 'Unknown Contact'}</h3>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">{seq.persona_tag ?? ''}</span>
                    {seqContactEmail && <span className="text-xs text-muted-foreground/60">{seqContactEmail}</span>}
                  </div>
                  <div className="space-y-2">
                    {Array.isArray(seq.emails) && seq.emails.map((email, eIdx) => {
                      const emailId = `${sIdx}-${eIdx}`
                      const isExpanded = expandedEmail === emailId
                      const isEditing = editingEmailId === emailId
                      const showGmail = gmailPanelId === emailId
                      const showInstantly = instantlyPanelId === emailId
                      const hasHtmlBody = /<[a-z][\s\S]*>/i.test(email.body ?? '')
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
                                title="Copy email"
                              >
                                {copiedId === emailId ? <FiCheck size={14} className="text-green-400" /> : <FiCopy size={14} />}
                              </button>
                              {isExpanded ? <FiChevronDown size={14} className="text-muted-foreground" /> : <FiChevronRight size={14} className="text-muted-foreground" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="p-4 pt-0 border-t border-border/50 space-y-3">
                              {/* Email Body: Edit mode or View mode */}
                              {isEditing ? (
                                <RichEmailEditor
                                  initialBody={email.body ?? ''}
                                  onSave={(html) => handleEmailBodySave(sIdx, eIdx, html)}
                                  onCancel={() => setEditingEmailId(null)}
                                />
                              ) : (
                                <>
                                  {hasHtmlBody ? (
                                    <div className="text-sm leading-relaxed text-foreground/80" dangerouslySetInnerHTML={{ __html: email.body ?? '' }} />
                                  ) : (
                                    <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">{email.body ?? ''}</div>
                                  )}
                                </>
                              )}
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

                              {/* Action Buttons Row */}
                              {!isEditing && (
                                <div className="flex items-center gap-2 border-t border-border/30 pt-3 flex-wrap">
                                  <button
                                    onClick={() => setEditingEmailId(emailId)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted-foreground text-xs tracking-widest uppercase hover:border-primary hover:text-primary transition-colors"
                                  >
                                    <FiEdit size={12} /> Edit
                                  </button>
                                  <button
                                    onClick={() => { setGmailPanelId(showGmail ? null : emailId); setInstantlyPanelId(null) }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs tracking-widest uppercase transition-colors ${showGmail ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                                  >
                                    <FiSend size={12} /> Send via Gmail
                                  </button>
                                  <button
                                    onClick={() => { setInstantlyPanelId(showInstantly ? null : emailId); setGmailPanelId(null) }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs tracking-widest uppercase transition-colors ${showInstantly ? 'border-amber-400 text-amber-400 bg-amber-400/10' : 'border-border text-muted-foreground hover:border-amber-400 hover:text-amber-400'}`}
                                  >
                                    <FiZap size={12} /> Send via Instantly
                                  </button>
                                </div>
                              )}

                              {/* Gmail Send Panel */}
                              {showGmail && (
                                <GmailSendPanel
                                  email={email}
                                  contactEmail={seqContactEmail}
                                  contactName={seq.contact_name ?? ''}
                                  onClose={() => setGmailPanelId(null)}
                                />
                              )}

                              {/* Instantly Send Panel */}
                              {showInstantly && (
                                <InstantlySendPanel
                                  contactEmail={seqContactEmail}
                                  contactName={seq.contact_name ?? ''}
                                  onClose={() => setInstantlyPanelId(null)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
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
          {playbook?.total_reports ?? 0} reports | {playbook?.total_contacts ?? 0} contacts
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

  const handleGenerate = useCallback(async (urls: string, industry: string, region: string, persona: string, keywords: string, uploadedDocNames: string[] = []) => {
    const hasUrls = urls.trim().length > 0
    const hasDocs = uploadedDocNames.length > 0
    if (!hasUrls && !hasDocs) return

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
      // Build source context depending on what the user provided
      let sourceContext = ''
      if (hasUrls && hasDocs) {
        sourceContext = `Seed URLs: ${urls}\nUploaded Documents in Knowledge Base: ${uploadedDocNames.join(', ')}\nProcess BOTH the seed URLs AND all uploaded documents from the knowledge base.`
      } else if (hasUrls) {
        sourceContext = `Seed URLs: ${urls}\nAlso process any relevant documents already in the knowledge base.`
      } else {
        sourceContext = `Uploaded Documents in Knowledge Base: ${uploadedDocNames.join(', ')}\nNo seed URLs provided. Process ONLY the uploaded documents from the knowledge base. Retrieve and analyze the full content of each uploaded document.`
      }

      const message = `Generate ABM intelligence playbook. Process ALL reports. Return JSON only.

${sourceContext}
Filters: Industry=${industry}, Region=${region}, Persona=${persona}${keywords ? `, Keywords=${keywords}` : ''}

CRITICAL INSTRUCTIONS FOR CONTRIBUTOR EXTRACTION:
- Extract ONLY real people who are explicitly named in each report as authors, co-authors, editors, contributors, research leads, or cited experts.
- DO NOT invent, guess, or hallucinate contributor names. Every contributor MUST be traceable to a specific mention in the report text.
- For each contributor, record the exact page or section where their name appears.
- If a report does not name any contributors, return an empty contributors array for that report rather than guessing.
- Include ALL contributors mentioned — not just the lead author. Look for acknowledgments sections, contributor pages, research team credits, editorial teams, and cited experts within the report body.

CRITICAL INSTRUCTIONS FOR EXECUTIVE SUMMARIES:
- Read the ENTIRE document thoroughly, not just the first few pages.
- Provide deeply insightful executive summaries that capture the full scope of each report's findings, methodology, key data points, frameworks, and strategic recommendations.
- Executive summaries should be 3-5 paragraphs covering: core thesis, key findings with data, methodology/framework used, strategic implications, and actionable takeaways.

Return the complete JSON with report_playbooks (one per report), personas, icp_summary, enriched_contacts, email_sequences, and quality_gates. Process as many reports as possible. A partial result with real data is required — never return text explanations.`

      const result = await callAIAgent(message, MANAGER_AGENT_ID)

      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      setCurrentStep(8)
      const finalTimes = PIPELINE_STEPS.map((_, i) => times[i] || Math.round((Date.now() - startTime) / 1000 / 8))
      setStepTimes(finalTimes)

      console.log('[handleGenerate] Raw result from callAIAgent:', JSON.stringify(result).substring(0, 2000))

      // Check if the agent returned an error
      if (!result?.success && result?.error) {
        setErrorMsg(`Agent error: ${result.error}`)
        return
      }

      const parsed = parseAgentResponse(result)
      if (parsed) {
        setPlaybookData(parsed)
        setSavedPlaybooks(prev => [parsed, ...prev.slice(0, 9)])
        setActiveSection('playbooks')
      } else {
        // Check if the agent returned a text explanation instead of JSON
        const agentText = result?.response?.result?.text
          || result?.response?.message
          || (typeof result?.response?.result === 'string' ? result.response.result : null)

        if (agentText && typeof agentText === 'string' && agentText.length > 50) {
          // The agent returned prose instead of structured data — show it clearly
          setErrorMsg(`The agent returned a text response instead of structured data. This usually means the request was too complex for a single run. Agent response: "${agentText.substring(0, 300)}${agentText.length > 300 ? '...' : ''}" — Try again or reduce the number of seed URLs.`)
        } else {
          // Build diagnostic message for unexpected response shapes
          const diag: string[] = ['Failed to parse playbook response.']
          if (result?.error) diag.push(`Error: ${result.error}`)
          if (result?.response?.status === 'error') diag.push(`Agent status: error - ${result.response.message || 'no message'}`)
          if (result?.response?.result && typeof result.response.result === 'object') {
            const keys = Object.keys(result.response.result)
            if (keys.length > 0) diag.push(`Response keys: ${keys.join(', ')}`)
            else diag.push('Response result was empty object.')
          }
          if (result?.response?.message && typeof result.response.message === 'string') {
            diag.push(`Message: ${result.response.message.substring(0, 200)}`)
          }
          setErrorMsg(diag.join(' '))
        }
      }
    } catch (err: any) {
      console.error('[handleGenerate] Exception:', err)
      setErrorMsg(err?.message || 'An error occurred while generating the playbook.')
    } finally {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current)
      setIsGenerating(false)
      setActiveAgentId('')
    }
  }, [])

  const handleDeletePlaybook = useCallback((idx: number) => {
    setSavedPlaybooks(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      try { localStorage.setItem('abm_playbooks', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
    // If the deleted playbook is the currently viewed one, clear it
    setPlaybookData(current => {
      if (current && savedPlaybooks[idx] && current.playbook_id === savedPlaybooks[idx].playbook_id && current.generation_date === savedPlaybooks[idx].generation_date) {
        return null
      }
      return current
    })
  }, [savedPlaybooks])

  const handleDeleteCurrentPlaybook = useCallback(() => {
    if (!playbookData) return
    const idx = savedPlaybooks.findIndex(p => p.playbook_id === playbookData.playbook_id && p.generation_date === playbookData.generation_date)
    if (idx !== -1) {
      handleDeletePlaybook(idx)
    }
    setPlaybookData(null)
    setActiveSection('dashboard')
  }, [playbookData, savedPlaybooks, handleDeletePlaybook])

  const handleUpdatePlaybook = useCallback((updated: PlaybookData) => {
    setPlaybookData(updated)
    setSavedPlaybooks(prev => {
      const newList = prev.map(p =>
        p.playbook_id === updated.playbook_id && p.generation_date === updated.generation_date
          ? updated
          : p
      )
      try { localStorage.setItem('abm_playbooks', JSON.stringify(newList)) } catch { /* ignore */ }
      return newList
    })
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
                    <span className={`inline-block h-3.5 w-3.5 transform transition-transform bg-background`} style={{ transform: showSample ? 'translateX(18px)' : 'translateX(2px)' }} />
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
                onDeletePlaybook={handleDeletePlaybook}
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
                  onDeletePlaybook={handleDeleteCurrentPlaybook}
                  onUpdatePlaybook={handleUpdatePlaybook}
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
