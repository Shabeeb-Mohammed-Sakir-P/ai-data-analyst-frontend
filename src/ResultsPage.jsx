import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { theme } from './theme'

const API_BASE = import.meta.env.VITE_API_BASE

// ---- Report text parsing ----
// Turns "**Heading**" lines into headings, and inline **bold** into <strong>.
function parseReport(text) {
  if (!text) return []
  const lines = text.split('\n').filter((l) => l.trim() !== '')

  return lines.map((line, i) => {
    const headingMatch = line.trim().match(/^\*\*(.+)\*\*$/)
    if (headingMatch) {
      return { type: 'heading', key: i, text: headingMatch[1] }
    }
    return { type: 'paragraph', key: i, text: line }
  })
}

function renderInlineBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function ReportBody({ report }) {
  const blocks = parseReport(report)
  return (
    <div className="report-body">
      {blocks.map((block) =>
        block.type === 'heading' ? (
          <h3 key={block.key} className="report-heading">{block.text}</h3>
        ) : (
          <p key={block.key} className="report-paragraph">{renderInlineBold(block.text)}</p>
        )
      )}
    </div>
  )
}

// ---- Metric card ----
function MetricCard({ label, value, tone }) {
  return (
    <div className={`metric-card ${tone || ''}`}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  )
}

// ---- Chat window ----
function ChatWindow({ datasetId, token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const chatHistory = messages
        .map((m, i, arr) => {
          if (m.role !== 'user') return null
          const answer = arr[i + 1]
          return answer ? { question: m.text, answer: answer.text } : null
        })
        .filter(Boolean)

      const response = await axios.post(
        `${API_BASE}/chat/${datasetId}`,
        { question, chat_history: chatHistory },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages((prev) => [...prev, { role: 'assistant', text: response.data.answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Sorry, I couldn't answer that. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = [
    'What was the most important finding?',
    'What is the average value in the dataset?',
    'Should I trust these results?',
  ]

  return (
    <section className="workspace-card chat-card">
      <div className="workspace-topline" />
      <div className="chat-panel">
        <div className="section-kicker">Ask the analyst</div>
        <h2 className="section-title">Questions about this analysis</h2>
        <p className="section-subtitle">
          Ask about the findings, or request a live calculation from the raw data.
        </p>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="chat-suggestions">
              {suggestions.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`chat-row ${m.role}`}>
              <div className={`chat-avatar ${m.role}`} aria-hidden="true">
                {m.role === 'user' ? 'Y' : 'A'}
              </div>
              <div className={`chat-bubble ${m.role}`}>{m.text}</div>
            </div>
          ))}

          {loading && (
            <div className="chat-row assistant">
              <div className="chat-avatar assistant" aria-hidden="true">A</div>
              <div className="chat-bubble assistant typing">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this analysis..."
            rows={1}
          />
          <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()} aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 12L20 4L14 20L11 13L4 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}

function getIssueCount(value) {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.length
  if (typeof value === 'object') return Object.keys(value).length
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) return numeric
    return trimmed.split(/[,;\n]+/).filter(Boolean).length
  }
  return 0
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  return String(value)
}

function shortTestName(result) {
  const test = String(result?.test_used || 'Statistical test')
  return test.replace(/_/g, ' ')
}

function humanizeChartName(filename) {
  return filename
    .replace(/\.png$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function chartViewType(filename) {
  const name = filename.toLowerCase()
  if (name.includes('vs')) return 'Relationship view'
  if (name.includes('over') || name.includes('trend') || name.includes('date') || name.includes('time')) return 'Trend view'
  if (name.includes('proportion') || name.includes('outlier')) return 'Anomaly view'
  if (name.includes('by')) return 'Category comparison'
  return 'Analytical view'
}

function ResultsPage() {
  const { datasetId } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [activeEvidence, setActiveEvidence] = useState(null)

  useEffect(() => {
    axios
      .get(`${API_BASE}/results/${datasetId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setResults(response.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load results'))
  }, [datasetId, token])

  const chartFilenames = (results?.chart_filepaths || []).map((path) => path.split(/[/\\]/).pop())
  const findings = results?.profiling_findings || {}
  const testResults = results?.test_results || []
  const significantCount = testResults.filter((r) => r.significant === true || r.significant === 'True').length
  const significantResults = testResults.filter((r) => r.significant === true || r.significant === 'True')

  const missingCount = getIssueCount(findings.missing_values ?? findings.missing_value_issues)
  const duplicateCount = Number(findings.duplicate_rows || 0)
  const dtypeCount = getIssueCount(findings.dtype_issues ?? findings.dtype_errors ?? findings.data_type_issues)
  const categoryCount = getIssueCount(findings.category_inconsistencies ?? findings.inconsistent_categories)
  const outlierCount = getIssueCount(findings.outliers ?? findings.outlier_issues)
  const qualityIssueTotal = [missingCount, duplicateCount, dtypeCount, categoryCount, outlierCount].filter((n) => n > 0).length
  const totalAgents = 7

  const pipeline = [
    ['01', 'Profiling'],
    ['02', 'Cleaning'],
    ['03', 'Hypotheses'],
    ['04', 'Testing'],
    ['05', 'Visuals'],
    ['06', 'Features'],
    ['07', 'Report'],
  ]

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="results-page">
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        .results-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 0%, rgba(24, 116, 111, 0.055), transparent 26%),
            radial-gradient(circle at 92% 8%, rgba(55, 98, 139, 0.045), transparent 24%),
            ${theme.colors.paper};
          color: ${theme.colors.ink};
          font-family: ${theme.fonts.body};
        }

        .results-shell { width: min(1180px, calc(100% - 44px)); margin: 0 auto; padding: 18px 0 80px; }

        .results-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 4px 0 18px; position: sticky; top: 0; z-index: 20;
          background: rgba(247, 249, 249, 0.9); backdrop-filter: blur(16px);
        }
        .brand-lockup { display: flex; align-items: center; gap: 10px; }
        .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid ${theme.colors.border}; border-radius: 10px; background: ${theme.colors.surface}; box-shadow: 0 4px 16px rgba(20, 45, 48, 0.05); }
        .brand-title { font-family: ${theme.fonts.display}; font-size: 15px; font-weight: 600; }
        .header-actions { display: flex; gap: 8px; }
        .ghost-button { border: 1px solid ${theme.colors.border}; background: ${theme.colors.surface}; color: ${theme.colors.slate}; font-size: 11px; font-weight: 600; padding: 8px 12px; border-radius: 9px; cursor: pointer; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
        .ghost-button:hover { transform: translateY(-1px); border-color: ${theme.colors.teal}; box-shadow: 0 5px 14px rgba(20, 45, 48, 0.07); }

        .hero { display: grid; grid-template-columns: 1fr 300px; gap: 28px; align-items: end; padding: 54px 0 26px; }
        .eyebrow, .section-kicker { font-family: ${theme.fonts.mono || theme.fonts.body}; text-transform: uppercase; letter-spacing: .14em; font-size: 9px; color: ${theme.colors.teal}; font-weight: 700; }
        .status-line { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: ${theme.colors.teal}; box-shadow: 0 0 0 5px rgba(24,116,111,.08); }
        .hero-title { margin: 0; color: #16363A !important; font-family: ${theme.fonts.display}; font-size: clamp(44px, 6vw, 78px); line-height: .93; letter-spacing: -.045em; max-width: 800px; font-weight: 650; }
        .hero-title em { color: ${theme.colors.teal}; font-style: normal; }
        .hero-copy { max-width: 700px; margin: 18px 0 0; color: #425B60 !important; font-size: 13px; line-height: 1.75; }
        .hero-side { border: 1px solid ${theme.colors.border}; background: rgba(255,255,255,.78); border-radius: 16px; padding: 18px; box-shadow: 0 10px 30px rgba(20,45,48,.04); }
        .hero-side-label { color: ${theme.colors.slate}; font-size: 9px; text-transform: uppercase; letter-spacing: .13em; }
        .hero-side-value { margin-top: 8px; color: #16363A !important; font-family: ${theme.fonts.display}; font-size: 24px; font-weight: 650; }
        .hero-side-note { margin-top: 5px; color: ${theme.colors.slate}; font-size: 10px; line-height: 1.5; }

        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0 22px; }
        .metric-card { position: relative; overflow: hidden; min-height: 92px; padding: 15px 16px; border: 1px solid ${theme.colors.border}; background: rgba(255,255,255,.84); border-radius: 13px; box-shadow: 0 5px 18px rgba(20,45,48,.035); }
        .metric-card::after { content: ''; position: absolute; right: -18px; bottom: -20px; width: 52px; height: 52px; border-radius: 50%; background: rgba(24,116,111,.07); }
        .metric-card.warning { background: rgba(246, 232, 205, .42); border-color: #e9c988; }
        .metric-card.positive { background: rgba(220, 241, 234, .55); border-color: #acd8ca; }
        .metric-label { margin: 0; color: #52696D !important; font-size: 10px; font-weight: 650; text-transform: uppercase; letter-spacing: .08em; }
        .metric-value { margin: 8px 0 0; color: #102E33 !important; font-family: ${theme.fonts.mono || theme.fonts.body}; font-size: 25px; font-weight: 750; letter-spacing: -.03em; }
        .metric-note { margin: 4px 0 0; color: ${theme.colors.slate}; font-size: 9px; }

        .pipeline-card { border: 1px solid ${theme.colors.border}; background: ${theme.colors.surface}; border-radius: 16px; padding: 18px; margin-bottom: 18px; box-shadow: 0 8px 26px rgba(20,45,48,.04); }
        .pipeline-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 15px; }
        .pipeline-title { margin: 0; color: #16363A !important; font-family: ${theme.fonts.display}; font-size: 17px; font-weight: 650; }
        .pipeline-meta { color: ${theme.colors.slate}; font-size: 10px; }
        .pipeline { display:grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .pipeline-step { min-width: 0; position:relative; padding: 10px 8px; border:1px solid ${theme.colors.border}; border-radius:10px; background:${theme.colors.paper}; text-align:center; }
        .pipeline-step::after { content:'✓'; position:absolute; right:6px; top:5px; font-size:8px; color:${theme.colors.teal}; }
        .pipeline-number { display:block; font-family:${theme.fonts.mono || theme.fonts.body}; color:${theme.colors.teal}; font-size:8px; margin-bottom:4px; }
        .pipeline-name { display:block; color:#244247 !important; font-size:10px; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        .section { margin-top: 18px; scroll-margin-top: 75px; }
        .section-card { border: 1px solid ${theme.colors.border}; background: rgba(255,255,255,.9); border-radius: 16px; overflow:hidden; box-shadow: 0 8px 30px rgba(20,45,48,.045); }
        .section-topline { height: 3px; background: ${theme.colors.teal}; }
        .section-inner { padding: 24px; }
        .section-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:20px; }
        .section-title { margin: 6px 0 0; color:#16363A !important; font-family:${theme.fonts.display}; font-size:28px; line-height:1.05; letter-spacing:-.028em; font-weight:650; }
        .section-subtitle { margin:8px 0 0; color:#536A6E !important; font-size:12px; line-height:1.6; }
        .section-badge { flex-shrink:0; border:1px solid ${theme.colors.border}; border-radius:999px; padding:8px 10px; color:${theme.colors.slate}; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; text-transform:uppercase; letter-spacing:.08em; }

        .discovery-grid { display:grid; grid-template-columns: 1.2fr .8fr; gap:12px; }
        .discovery-card { border:1px solid ${theme.colors.border}; border-radius:13px; padding:18px; background:${theme.colors.paper}; }
        .discovery-card.highlight { background: linear-gradient(135deg, rgba(220,241,234,.7), rgba(255,255,255,.9)); border-color:#b7dcd2; }
        .discovery-label { font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; color:${theme.colors.teal}; text-transform:uppercase; letter-spacing:.11em; }
        .discovery-title { margin:9px 0 0; color:#16363A !important; font-family:${theme.fonts.display}; font-size:22px; line-height:1.18; font-weight:650; }
        .discovery-text { margin:10px 0 0; color:#425B60 !important; font-size:12px; line-height:1.7; }
        .evidence-row { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }
        .evidence-chip { border:1px solid ${theme.colors.border}; background:${theme.colors.surface}; border-radius:999px; padding:6px 9px; color:${theme.colors.slate}; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; }
        .text-button { border:0; background:transparent; color:${theme.colors.teal}; padding:0; font-size:10px; font-weight:700; cursor:pointer; }

        .quality-grid { display:grid; grid-template-columns: repeat(5,1fr); gap:7px; margin-top:12px; }
        .quality-item { padding:13px 10px; border:1px solid ${theme.colors.border}; border-radius:11px; background:${theme.colors.paper}; }
        .quality-item .q-label { color:${theme.colors.slate}; font-size:9px; }
        .quality-item .q-value { margin-top:6px; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:16px; font-weight:700; }
        .quality-item .q-state { margin-top:3px; color:${theme.colors.slate}; font-size:8px; }


        .hero-side-label, .pipeline-meta, .metric-note, .quality-item .q-label, .quality-item .q-state, .stat-note, .rec-text, .modal-note { color:#536A6E !important; }
        .quality-item .q-value, .test-meta strong, .activity-name strong, .modal-item strong { color:#16363A !important; }
        .test-index, .rec-number, .activity-state { font-weight:750; }
        .report-wrap { max-height: 520px; overflow:auto; padding-right:8px; }
        .report-body { color:${theme.colors.slate}; }
        .report-heading { margin:24px 0 9px; color:#16363A !important; font-family:${theme.fonts.display}; font-size:20px; line-height:1.2; font-weight:650; }
        .report-heading:first-child { margin-top:0; }
        .report-paragraph { margin:0 0 11px; color:#425B60 !important; font-size:12px; line-height:1.8; }
        .report-paragraph strong { color:#102E33 !important; font-weight:750; }
        .report-toggle { display:inline-flex; margin-top:15px; border:1px solid ${theme.colors.border}; background:${theme.colors.surface}; border-radius:9px; padding:8px 11px; color:${theme.colors.teal}; font-size:9px; font-weight:700; cursor:pointer; }

        .chart-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
        .chart-card { position:relative; display:block; border:1px solid ${theme.colors.border}; border-radius:15px; overflow:hidden; background:#FFFFFF; text-decoration:none; transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .chart-card:hover { transform:translateY(-3px); border-color:${theme.colors.teal}; box-shadow:0 16px 32px rgba(20,45,48,.10); }
        .chart-card.featured { grid-column:1 / -1; }
        .chart-card img { display:block; width:100%; height:285px; object-fit:contain; background:#FFFFFF; }
        .chart-card.featured img { height:390px; }
        .chart-toolbar { position:absolute; left:10px; top:10px; right:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; pointer-events:none; }
        .chart-badge, .chart-open { display:inline-flex; align-items:center; min-height:26px; padding:6px 9px; border:1px solid rgba(24,116,111,.18); border-radius:8px; background:rgba(255,255,255,.94); color:#176F6A; box-shadow:0 3px 10px rgba(20,45,48,.06); font-size:8px; font-weight:750; text-transform:uppercase; letter-spacing:.08em; }
        .chart-caption { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-top:1px solid ${theme.colors.border}; color:#29474C !important; font-size:11px; font-weight:650; }
        .chart-caption-title { color:#16363A !important; text-transform:capitalize; }
        .chart-caption-type { flex-shrink:0; color:#61767A !important; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; text-transform:uppercase; letter-spacing:.08em; }

        .test-list { display:grid; gap:8px; }
        .test-card { border:1px solid ${theme.colors.border}; border-radius:12px; padding:14px; background:${theme.colors.paper}; }
        .test-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
        .test-index { color:${theme.colors.teal}; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; margin-bottom:5px; }
        .test-question { margin:0; color:#17383D !important; font-size:13px; line-height:1.6; font-weight:650; }
        .sig-badge { flex-shrink:0; border-radius:999px; padding:6px 9px; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:7px; text-transform:uppercase; letter-spacing:.08em; }
        .sig-badge.yes { background:${theme.colors.mossLight}; color:#085041; }
        .sig-badge.no { background:#eef0f2; color:${theme.colors.slate}; }
        .test-meta { display:flex; flex-wrap:wrap; gap:7px; margin-top:11px; }
        .test-meta span { border:1px solid ${theme.colors.border}; background:${theme.colors.surface}; border-radius:7px; padding:6px 8px; color:${theme.colors.slate}; font-size:8px; }
        .test-meta strong { color:${theme.colors.ink}; font-family:${theme.fonts.mono || theme.fonts.body}; font-weight:600; }
        .test-note { margin:10px 0 0; padding-top:10px; border-top:1px dashed ${theme.colors.border}; color:${theme.colors.slate}; font-size:10px; line-height:1.6; }
        .test-actions { margin-top:10px; }

        .recommendations { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
        .recommendation { border:1px solid ${theme.colors.border}; border-radius:12px; padding:15px; background:${theme.colors.paper}; }
        .rec-number { font-family:${theme.fonts.mono || theme.fonts.body}; color:${theme.colors.teal}; font-size:8px; }
        .rec-title { margin:8px 0 0; color:#16363A !important; font-family:${theme.fonts.display}; font-size:17px; line-height:1.25; font-weight:650; }
        .rec-text { margin:6px 0 0; color:${theme.colors.slate}; font-size:10px; line-height:1.55; }

        .activity { display:grid; gap:0; margin-top:3px; }
        .activity-row { display:grid; grid-template-columns:20px 1fr auto; gap:10px; align-items:center; min-height:42px; border-bottom:1px solid ${theme.colors.border}; }
        .activity-row:last-child { border-bottom:0; }
        .activity-dot { width:8px; height:8px; border-radius:50%; background:${theme.colors.teal}; box-shadow:0 0 0 4px rgba(24,116,111,.08); }
        .activity-name { font-size:10px; color:${theme.colors.ink}; }
        .activity-state { color:${theme.colors.slate}; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:8px; text-transform:uppercase; }

        .chat-card { margin-top:18px; }
        .chat-panel { padding:24px; }
        .chat-scroll { min-height:90px; max-height:380px; overflow-y:auto; padding:12px 0; }
        .chat-suggestions { display:flex; flex-wrap:wrap; gap:7px; margin-top:5px; }
        .suggestion-chip { border:1px solid ${theme.colors.border}; background:${theme.colors.surface}; color:${theme.colors.slate}; border-radius:999px; padding:8px 10px; font-size:9px; cursor:pointer; transition:border-color .15s, color .15s, transform .15s; }
        .suggestion-chip:hover { border-color:${theme.colors.teal}; color:${theme.colors.teal}; transform:translateY(-1px); }
        .chat-row { display:flex; gap:9px; margin:9px 0; align-items:flex-start; }
        .chat-row.user { flex-direction:row-reverse; }
        .chat-avatar { width:27px; height:27px; border-radius:8px; display:grid; place-items:center; flex-shrink:0; font-size:9px; font-weight:700; }
        .chat-avatar.assistant { background:${theme.colors.teal}; color:white; }
        .chat-avatar.user { background:#e9edef; color:${theme.colors.slate}; }
        .chat-bubble { max-width:min(760px, 82%); padding:10px 12px; border-radius:11px; font-size:10px; line-height:1.6; }
        .chat-bubble.assistant { background:${theme.colors.paper}; border:1px solid ${theme.colors.border}; }
        .chat-bubble.user { background:${theme.colors.ink}; color:white; }
        .chat-input-row { display:flex; gap:8px; padding-top:12px; border-top:1px solid ${theme.colors.border}; }
        .chat-input { flex:1; min-height:42px; max-height:110px; resize:vertical; border:1px solid ${theme.colors.border}; border-radius:10px; padding:11px 12px; outline:none; background:white; color:${theme.colors.ink}; font-family:${theme.fonts.body}; font-size:10px; }
        .chat-input:focus { border-color:${theme.colors.teal}; box-shadow:0 0 0 3px rgba(24,116,111,.08); }
        .chat-send { width:42px; border:0; border-radius:10px; background:${theme.colors.teal}; color:white; cursor:pointer; display:grid; place-items:center; }
        .chat-send:disabled { opacity:.4; cursor:not-allowed; }
        .dot { display:inline-block; width:5px; height:5px; border-radius:50%; background:${theme.colors.slate}; margin:0 2px; animation:blink 1s infinite ease-in-out; }
        .dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
        @keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }

        .evidence-overlay { position:fixed; inset:0; z-index:50; background:rgba(14,25,28,.38); backdrop-filter:blur(5px); display:grid; place-items:center; padding:20px; }
        .evidence-modal { width:min(560px,100%); background:${theme.colors.surface}; border:1px solid ${theme.colors.border}; border-radius:16px; padding:22px; box-shadow:0 25px 70px rgba(0,0,0,.18); }
        .modal-head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; }
        .modal-close { border:1px solid ${theme.colors.border}; background:${theme.colors.paper}; width:30px; height:30px; border-radius:8px; cursor:pointer; color:${theme.colors.slate}; }
        .modal-title { margin:6px 0 0; color:#16363A !important; font-family:${theme.fonts.display}; font-size:23px; line-height:1.2; font-weight:650; }
        .modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:18px; }
        .modal-item { border:1px solid ${theme.colors.border}; border-radius:10px; padding:11px; background:${theme.colors.paper}; }
        .modal-item span { display:block; color:${theme.colors.slate}; font-size:8px; text-transform:uppercase; letter-spacing:.08em; }
        .modal-item strong { display:block; margin-top:5px; font-family:${theme.fonts.mono || theme.fonts.body}; font-size:11px; }
        .modal-note { margin:14px 0 0; color:${theme.colors.slate}; font-size:10px; line-height:1.65; }

        .center-state { min-height:65vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:13px; text-align:center; }
        .center-spinner { width:32px; height:32px; border:3px solid ${theme.colors.border}; border-top-color:${theme.colors.teal}; border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .center-text { color:${theme.colors.slate}; font-size:12px; }
        .center-error { color:#B3261E; max-width:430px; font-size:12px; line-height:1.6; }

        @media (max-width: 900px) {
          .hero { grid-template-columns:1fr; }
          .hero-side { max-width:420px; }
          .summary-grid { grid-template-columns:repeat(2,1fr); }
          .pipeline { grid-template-columns:repeat(4,1fr); }
          .discovery-grid { grid-template-columns:1fr; }
          .quality-grid { grid-template-columns:repeat(3,1fr); }
          .recommendations { grid-template-columns:1fr; }
        }
        @media (max-width: 650px) {
          .results-shell { width:min(100% - 24px,1180px); }
          .results-header { position:static; }
          .brand-title { font-size:13px; }
          .header-actions .ghost-button:first-child { display:none; }
          .hero { padding-top:32px; }
          .hero-title { font-size:46px; }
          .summary-grid { grid-template-columns:1fr 1fr; }
          .pipeline { grid-template-columns:repeat(2,1fr); }
          .chart-grid { grid-template-columns:1fr; }
          .chart-card.featured { grid-column:auto; }
          .chart-card img, .chart-card.featured img { height:250px; }
          .quality-grid { grid-template-columns:repeat(2,1fr); }
          .section-inner, .chat-panel { padding:18px; }
          .section-header { align-items:flex-start; flex-direction:column; }
          .test-top { flex-direction:column; }
          .modal-grid { grid-template-columns:1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior:auto; }
          .dot, .center-spinner { animation:none; }
          .ghost-button, .chart-card, .suggestion-chip { transition:none; }
        }
      `}</style>

      <div className="results-shell">
        <header className="results-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <circle cx="10" cy="14" r="4" fill={theme.colors.teal} />
                <circle cx="30" cy="14" r="4" fill={theme.colors.teal} opacity="0.55" />
                <circle cx="20" cy="30" r="4" fill={theme.colors.teal} />
                <path d="M14 16L18 27M26 16L22 27M14 14H26" stroke={theme.colors.teal} strokeWidth="1.4" opacity="0.45" />
              </svg>
            </div>
            <span className="brand-title">AI Data Analyst Agent</span>
          </div>
          <div className="header-actions">
            <button className="ghost-button" onClick={() => navigate('/upload')}>+ New analysis</button>
            <button className="ghost-button" onClick={logout}>Log out</button>
          </div>
        </header>

        {!results && !error && (
          <div className="center-state">
            <div className="center-spinner" />
            <p className="center-text">Assembling the analyst's findings...</p>
          </div>
        )}

        {error && (
          <div className="center-state">
            <p className="center-error">{error}</p>
            <button className="ghost-button" onClick={() => navigate('/upload')}>Back to upload</button>
          </div>
        )}

        {results && (
          <>
            <section className="hero">
              <div>
                <div className="status-line"><span className="status-dot" /><span className="eyebrow">Investigation complete</span></div>
                <h1 className="hero-title">Your data,<br /><em>understood.</em></h1>
                <p className="hero-copy">
                  The analyst pipeline profiled, cleaned, tested, visualized, and synthesized your dataset — with the evidence left visible so you can challenge the conclusions.
                </p>
              </div>
              <div className="hero-side">
                <div className="hero-side-label">Pipeline status</div>
                <div className="hero-side-value">All agents completed</div>
                <div className="hero-side-note">{totalAgents} specialized stages · {testResults.length} hypotheses tested · {chartFilenames.length} visual artifacts</div>
              </div>
            </section>

            <div className="summary-grid">
              <MetricCard label="Rows analyzed" value={formatValue(findings.num_rows)} />
              <MetricCard label="Columns" value={formatValue(findings.num_columns)} />
              <MetricCard label="Duplicate rows" value={formatValue(findings.duplicate_rows ?? 0)} tone={duplicateCount > 0 ? 'warning' : ''} />
              <MetricCard label="Significant tests" value={`${significantCount} / ${testResults.length}`} tone={significantCount > 0 ? 'positive' : ''} />
            </div>

            <section className="pipeline-card">
              <div className="pipeline-head">
                <div>
                  <div className="section-kicker">Agent orchestration</div>
                  <h2 className="pipeline-title">Investigation trail</h2>
                </div>
                <span className="pipeline-meta">7 / 7 complete</span>
              </div>
              <div className="pipeline">
                {pipeline.map(([number, name]) => (
                  <div className="pipeline-step" key={name}>
                    <span className="pipeline-number">{number}</span>
                    <span className="pipeline-name">{name}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="section" id="discoveries">
              <div className="section-card">
                <div className="section-topline" />
                <div className="section-inner">
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Analyst discoveries</div>
                      <h2 className="section-title">What did the agents actually find?</h2>
                      <p className="section-subtitle">The strongest conclusions are surfaced first, with a direct path back to statistical evidence.</p>
                    </div>
                    <span className="section-badge">{significantCount} significant</span>
                  </div>

                  <div className="discovery-grid">
                    <div className="discovery-card highlight">
                      <div className="discovery-label">Strongest statistical signal</div>
                      <h3 className="discovery-title">
                        {significantResults[0]?.hypothesis || 'No statistically significant relationship detected'}
                      </h3>
                      <p className="discovery-text">
                        {significantResults[0]?.note || (significantResults[0]
                          ? 'This hypothesis crossed the configured statistical significance threshold.'
                          : 'The statistical testing agent did not identify a significant result in the tested hypotheses.')}
                      </p>
                      {significantResults[0] && (
                        <div className="evidence-row">
                          <span className="evidence-chip">{shortTestName(significantResults[0])}</span>
                          <span className="evidence-chip">p = {formatValue(significantResults[0].p_value)}</span>
                          <button className="text-button" onClick={() => setActiveEvidence(significantResults[0])}>Why this result →</button>
                        </div>
                      )}
                    </div>

                    <div className="discovery-card">
                      <div className="discovery-label">Data quality signal</div>
                      <h3 className="discovery-title">{qualityIssueTotal > 0 ? `${qualityIssueTotal} issue categories detected` : 'No major issue categories surfaced'}</h3>
                      <p className="discovery-text">
                        Profiling signals are kept separate from statistical conclusions so data-quality problems can be investigated before modeling.
                      </p>
                      <div className="evidence-row">
                        <span className="evidence-chip">duplicates: {formatValue(duplicateCount)}</span>
                        <span className="evidence-chip">missing: {formatValue(missingCount)}</span>
                        <span className="evidence-chip">outliers: {formatValue(outlierCount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="quality-grid">
                    <div className="quality-item"><div className="q-label">Duplicates</div><div className="q-value">{formatValue(duplicateCount)}</div><div className="q-state">profiled</div></div>
                    <div className="quality-item"><div className="q-label">Missing values</div><div className="q-value">{formatValue(missingCount)}</div><div className="q-state">profiled</div></div>
                    <div className="quality-item"><div className="q-label">Type issues</div><div className="q-value">{formatValue(dtypeCount)}</div><div className="q-state">profiled</div></div>
                    <div className="quality-item"><div className="q-label">Categories</div><div className="q-value">{formatValue(categoryCount)}</div><div className="q-state">profiled</div></div>
                    <div className="quality-item"><div className="q-label">Outliers</div><div className="q-value">{formatValue(outlierCount)}</div><div className="q-state">profiled</div></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="report">
              <div className="section-card">
                <div className="section-topline" />
                <div className="section-inner">
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Report agent</div>
                      <h2 className="section-title">Executive analysis</h2>
                      <p className="section-subtitle">A narrative synthesis of the completed workflow.</p>
                    </div>
                    <button className="section-badge" onClick={() => scrollTo('chat')}>Ask the analyst →</button>
                  </div>
                  <div className="report-wrap"><ReportBody report={results.report} /></div>
                </div>
              </div>
            </section>

            {chartFilenames.length > 0 && (
              <section className="section" id="visuals">
                <div className="section-card">
                  <div className="section-topline" />
                  <div className="section-inner">
                    <div className="section-header">
                      <div>
                        <div className="section-kicker">Visualization agent</div>
                        <h2 className="section-title">Visual evidence</h2>
                        <p className="section-subtitle">The first chart is surfaced as the primary visual evidence. The remaining views support comparison, trends, and anomaly inspection.</p>
                      </div>
                      <span className="section-badge">{chartFilenames.length} charts</span>
                    </div>
                    <div className="chart-grid">
                      {chartFilenames.map((filename, index) => {
                        const title = humanizeChartName(filename)
                        const viewType = chartViewType(filename)
                        return (
                          <a
                            key={filename}
                            href={`${API_BASE}/charts/${filename}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`chart-card ${index === 0 ? 'featured' : ''}`}
                            aria-label={`Open ${title} chart in a new tab`}
                          >
                            <div className="chart-toolbar">
                              <span className="chart-badge">{index === 0 ? 'Primary evidence' : `Chart ${String(index + 1).padStart(2, '0')}`}</span>
                              <span className="chart-open">Open full size ↗</span>
                            </div>
                            <img
                              src={`${API_BASE}/charts/${filename}`}
                              alt={title}
                              loading={index === 0 ? 'eager' : 'lazy'}
                            />
                            <div className="chart-caption">
                              <span className="chart-caption-title">{title}</span>
                              <span className="chart-caption-type">{viewType}</span>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="section" id="tests">
              <div className="section-card">
                <div className="section-topline" />
                <div className="section-inner">
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Statistical testing agent</div>
                      <h2 className="section-title">Evidence, not just answers.</h2>
                      <p className="section-subtitle">Every generated hypothesis is shown with its method, p-value, and interpretation.</p>
                    </div>
                    <span className="section-badge">{testResults.length} tested</span>
                  </div>

                  <div className="test-list">
                    {testResults.map((result, i) => {
                      const isSignificant = result.significant === true || result.significant === 'True'
                      return (
                        <div key={i} className="test-card">
                          <div className="test-top">
                            <div>
                              <div className="test-index">HYPOTHESIS {String(i + 1).padStart(2, '0')}</div>
                              <p className="test-question">{result.hypothesis}</p>
                            </div>
                            <span className={`sig-badge ${isSignificant ? 'yes' : 'no'}`}>{isSignificant ? 'Significant' : 'Not significant'}</span>
                          </div>
                          <div className="test-meta">
                            <span>Test <strong>{shortTestName(result)}</strong></span>
                            <span>p-value <strong>{formatValue(result.p_value)}</strong></span>
                          </div>
                          {result.note && <p className="test-note">{result.note}</p>}
                          <div className="test-actions"><button className="text-button" onClick={() => setActiveEvidence(result)}>Inspect evidence →</button></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="next">
              <div className="section-card">
                <div className="section-topline" />
                <div className="section-inner">
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Analyst recommendations</div>
                      <h2 className="section-title">What should happen next?</h2>
                      <p className="section-subtitle">Turn the investigation into concrete preparation steps before a machine-learning pipeline.</p>
                    </div>
                  </div>
                  <div className="recommendations">
                    <div className="recommendation"><div className="rec-number">01 · DATA QUALITY</div><h3 className="rec-title">Resolve the detected quality issues</h3><p className="rec-text">Review duplicate, missing, type, category, and outlier signals before trusting downstream models.</p></div>
                    <div className="recommendation"><div className="rec-number">02 · FEATURES</div><h3 className="rec-title">Keep useful signal, remove noise</h3><p className="rec-text">Use the report's feature-engineering guidance to separate identifiers, derived features, and predictive variables.</p></div>
                    <div className="recommendation"><div className="rec-number">03 · VALIDATION</div><h3 className="rec-title">Treat significance as evidence</h3><p className="rec-text">A statistically significant result is a lead for investigation, not proof of causation. Validate it with domain knowledge.</p></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="activity">
              <div className="section-card">
                <div className="section-topline" />
                <div className="section-inner">
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Execution trace</div>
                      <h2 className="section-title">Agent activity</h2>
                      <p className="section-subtitle">A human-readable view of the orchestration path.</p>
                    </div>
                  </div>
                  <div className="activity">
                    {pipeline.map(([number, name]) => (
                      <div className="activity-row" key={name}>
                        <span className="activity-dot" />
                        <span className="activity-name"><strong>{number}</strong> · {name} agent completed</span>
                        <span className="activity-state">complete</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="section" id="chat">
              <ChatWindow datasetId={datasetId} token={token} />
            </section>
          </>
        )}
      </div>

      {activeEvidence && (
        <div className="evidence-overlay" role="dialog" aria-modal="true" onClick={() => setActiveEvidence(null)}>
          <div className="evidence-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="section-kicker">Evidence inspector</div>
                <h2 className="modal-title">Why this result?</h2>
              </div>
              <button className="modal-close" onClick={() => setActiveEvidence(null)} aria-label="Close">×</button>
            </div>
            <p className="modal-note">The statistical testing agent evaluated this hypothesis using the reported test. Statistical significance indicates evidence against the null hypothesis under the chosen test; it does not by itself establish causation.</p>
            <div className="modal-grid">
              <div className="modal-item"><span>Hypothesis</span><strong>{activeEvidence.hypothesis || '—'}</strong></div>
              <div className="modal-item"><span>Decision</span><strong>{activeEvidence.significant === true || activeEvidence.significant === 'True' ? 'Significant' : 'Not significant'}</strong></div>
              <div className="modal-item"><span>Test used</span><strong>{shortTestName(activeEvidence)}</strong></div>
              <div className="modal-item"><span>p-value</span><strong>{formatValue(activeEvidence.p_value)}</strong></div>
            </div>
            {activeEvidence.note && <p className="modal-note"><strong>Agent interpretation:</strong> {activeEvidence.note}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsPage
