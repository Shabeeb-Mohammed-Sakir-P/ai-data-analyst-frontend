import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'
import { theme } from './theme'

const API_BASE = 'http://127.0.0.1:8000'

const AGENTS = [
  { key: 'profiling', label: 'Profiling' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'hypothesis', label: 'Hypothesis' },
  { key: 'statistical_testing', label: 'Testing' },
  { key: 'visualization', label: 'Visuals' },
  { key: 'feature_engineering', label: 'Features' },
  { key: 'report', label: 'Report' },
]

function PipelineStrip({ currentStep }) {
  const currentIndex = AGENTS.findIndex((a) => a.key === currentStep)

  return (
    <div className="pipeline-strip" role="status" aria-live="polite">
      {AGENTS.map((agent, index) => {
        let stateClass = 'pending'
        if (index < currentIndex) stateClass = 'done'
        else if (index === currentIndex) stateClass = 'active'

        return (
          <span key={agent.key} className={`pipeline-pill ${stateClass}`}>
            {index < currentIndex && (
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ marginRight: '4px' }} aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {agent.label}
          </span>
        )
      })}
    </div>
  )
}

function UploadPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [datasetId, setDatasetId] = useState(null)
  const [status, setStatus] = useState(null)
  const [currentStep, setCurrentStep] = useState(null)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [approvedActions, setApprovedActions] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const authHeader = { headers: { Authorization: `Bearer ${token}` } }

  const processFile = (selectedFile) => {
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are supported.')
      return
    }
    setFile(selectedFile)
    setError('')
  }

  const handleFileChange = (e) => processFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file || isUploading) return
    setError('')
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const newDatasetId = uploadResponse.data.dataset_id
      setDatasetId(newDatasetId)

      const previewResponse = await axios.post(`${API_BASE}/preview/${newDatasetId}`, {}, authHeader)
      setPreviewData(previewResponse.data)

      const initialApprovals = {}
      previewResponse.data.proposed_actions.forEach((_, index) => {
        initialApprovals[index] = true
      })
      setApprovedActions(initialApprovals)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.')
      setDatasetId(null)
    } finally {
      setIsUploading(false)
    }
  }

  const toggleApproval = (index) => {
    setApprovedActions((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const approvedCount = Object.values(approvedActions).filter(Boolean).length
  const totalCount = previewData?.proposed_actions.length || 0

  const handleConfirmAndAnalyze = async () => {
    if (isStartingAnalysis) return
    setIsStartingAnalysis(true)
    setError('')

    const finalActions = previewData.proposed_actions.filter((_, index) => approvedActions[index])

    try {
      await axios.post(`${API_BASE}/analyze/${datasetId}`, { approved_actions: finalActions }, authHeader)
      setStatus('processing')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start analysis.')
      setIsStartingAnalysis(false)
    }
  }

  const resetUpload = () => {
    setFile(null)
    setDatasetId(null)
    setStatus(null)
    setCurrentStep(null)
    setError('')
    setPreviewData(null)
    setApprovedActions({})
    setIsStartingAnalysis(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (!datasetId || status !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE}/status/${datasetId}`, authHeader)
        setStatus(response.data.status)
        setCurrentStep(response.data.current_step)

        if (response.data.status === 'complete') {
          clearInterval(interval)
          navigate(`/results/${datasetId}`)
        } else if (response.data.status === 'failed') {
          clearInterval(interval)
          setError(response.data.error_message || 'Analysis failed.')
        }
      } catch (err) {
        clearInterval(interval)
        setError('Lost connection while checking status.')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [datasetId, status])
  return (
    <div className="upload-page">
      <style>{`
        * { box-sizing: border-box; }

        .upload-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 85% 8%, rgba(24, 116, 111, 0.07), transparent 28%),
            ${theme.colors.paper};
          color: ${theme.colors.ink};
          font-family: ${theme.fonts.body};
        }

        .upload-shell {
          width: min(1120px, calc(100% - 40px));
          margin: 0 auto;
          padding: 22px 0 56px;
        }

        .upload-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 52px;
          margin-bottom: 54px;
        }

        .brand-lockup {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .brand-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid ${theme.colors.border};
          border-radius: 10px;
          background: ${theme.colors.surface};
          box-shadow: 0 4px 18px rgba(20, 35, 35, 0.05);
        }

        .brand-title {
          font-family: ${theme.fonts.display};
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: ${theme.colors.ink};
        }

        .brand-status {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-left: 10px;
          padding-left: 10px;
          border-left: 1px solid ${theme.colors.border};
          color: ${theme.colors.slate};
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${theme.colors.teal};
          box-shadow: 0 0 0 4px ${theme.colors.tealLight};
        }

        .logout-button {
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          color: ${theme.colors.slate};
          font-family: ${theme.fonts.body};
          font-size: 12px;
          font-weight: 500;
          padding: 8px 13px;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .logout-button:hover {
          border-color: ${theme.colors.slate};
          color: ${theme.colors.ink};
          transform: translateY(-1px);
        }

        .upload-main {
          max-width: 900px;
          margin: 0 auto;
        }

        .hero {
          text-align: center;
          max-width: 720px;
          margin: 0 auto 30px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border: 1px solid ${theme.colors.border};
          border-radius: 999px;
          background: ${theme.colors.surface};
          color: ${theme.colors.teal};
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero-title {
          margin: 16px 0 10px;
          font-family: ${theme.fonts.display};
          font-size: clamp(34px, 5vw, 54px);
          line-height: 0.98;
          font-weight: 500;
          letter-spacing: -0.045em;
          color: ${theme.colors.ink};
        }

        .hero-title span {
          color: ${theme.colors.teal};
        }

        .hero-subtitle {
          max-width: 650px;
          margin: 0 auto;
          color: ${theme.colors.slate};
          font-size: 14px;
          line-height: 1.7;
        }

        .pipeline-wrap {
          margin: 0 auto 22px;
          padding: 11px;
          border: 1px solid ${theme.colors.border};
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.65);
        }

        .pipeline-label {
          margin: 0 0 9px 3px;
          color: ${theme.colors.slate};
          font-family: ${theme.fonts.mono};
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pipeline-strip {
          display: flex;
          gap: 6px;
          width: 100%;
          overflow-x: auto;
          padding-bottom: 1px;
          scrollbar-width: thin;
        }

        .pipeline-pill {
          flex: 1 0 auto;
          min-width: 84px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: ${theme.fonts.mono};
          font-size: 10px;
          font-weight: 500;
          padding: 8px 10px;
          border-radius: 8px;
          white-space: nowrap;
          transition: all 0.25s ease;
        }

        .pipeline-pill.pending {
          background: ${theme.colors.paper};
          color: ${theme.colors.slate};
          border: 1px solid ${theme.colors.border};
        }

        .pipeline-pill.active {
          background: ${theme.colors.tealLight};
          color: ${theme.colors.teal};
          border: 1px solid rgba(24, 116, 111, 0.2);
          box-shadow: inset 0 0 0 1px rgba(24, 116, 111, 0.04);
          animation: pillPulse 1.8s ease-in-out infinite;
        }

        .pipeline-pill.done {
          background: ${theme.colors.mossLight};
          color: #085041;
          border: 1px solid rgba(8, 80, 65, 0.08);
        }

        @keyframes pillPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.58; }
        }

        .workspace-card {
          border: 1px solid ${theme.colors.border};
          border-radius: 20px;
          background: ${theme.colors.surface};
          box-shadow: 0 18px 55px rgba(20, 35, 35, 0.07);
          overflow: hidden;
        }

        .workspace-topline {
          height: 4px;
          background: ${theme.colors.teal};
        }

        .dropzone {
          margin: 18px;
          min-height: 330px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 1.5px dashed ${theme.colors.border};
          border-radius: 15px;
          background:
            linear-gradient(rgba(24, 116, 111, 0.025), rgba(24, 116, 111, 0.025)),
            ${theme.colors.paper};
          padding: 38px 24px;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .dropzone.dragging {
          border-color: ${theme.colors.teal};
          background: ${theme.colors.tealLight};
          transform: scale(1.005);
        }

        .dropzone-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(24, 116, 111, 0.14);
          border-radius: 16px;
          background: ${theme.colors.tealLight};
          color: ${theme.colors.teal};
          margin-bottom: 18px;
        }

        .dropzone-title {
          font-family: ${theme.fonts.display};
          font-size: 25px;
          line-height: 1.1;
          font-weight: 500;
          letter-spacing: -0.025em;
          margin: 0 0 8px;
        }

        .dropzone-subtitle {
          max-width: 440px;
          font-size: 13px;
          line-height: 1.6;
          color: ${theme.colors.slate};
          margin: 0 0 18px;
        }

        .file-chip {
          max-width: min(100%, 420px);
          display: inline-flex;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(24, 116, 111, 0.16);
          background: ${theme.colors.tealLight};
          color: ${theme.colors.teal};
          font-family: ${theme.fonts.mono};
          font-size: 11px;
          padding: 8px 12px;
          border-radius: 9px;
          margin-bottom: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .choose-file-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          color: ${theme.colors.ink};
          font-family: ${theme.fonts.body};
          font-weight: 500;
          font-size: 12px;
          padding: 9px 14px;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .choose-file-button:hover {
          border-color: ${theme.colors.teal};
          color: ${theme.colors.teal};
          transform: translateY(-1px);
        }

        .primary-button {
          width: 100%;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: 10px;
          background: ${theme.colors.teal};
          color: white;
          font-family: ${theme.fonts.body};
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-top: 18px;
          transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 8px 20px rgba(24, 116, 111, 0.15);
        }

        .primary-button:hover:not(:disabled) {
          opacity: 0.94;
          transform: translateY(-1px);
          box-shadow: 0 11px 25px rgba(24, 116, 111, 0.2);
        }

        .primary-button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
          box-shadow: none;
        }

        .helper-row {
          width: 100%;
          max-width: 620px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 22px;
          color: ${theme.colors.slate};
          font-size: 10px;
        }

        .helper-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .helper-check {
          color: ${theme.colors.teal};
          font-weight: 700;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ---- Review ---- */

        .review-panel {
          padding: 26px;
        }

        .review-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 20px;
          border-bottom: 1px solid ${theme.colors.border};
        }

        .section-kicker {
          color: ${theme.colors.teal};
          font-family: ${theme.fonts.mono};
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .review-title,
        .processing-title {
          font-family: ${theme.fonts.display};
          font-size: 25px;
          line-height: 1.1;
          font-weight: 500;
          letter-spacing: -0.025em;
          margin: 0;
        }

        .review-subtitle,
        .processing-subtitle {
          color: ${theme.colors.slate};
          font-size: 12px;
          line-height: 1.6;
          margin: 7px 0 0;
        }

        .review-count {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 9px;
          background: ${theme.colors.paper};
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.ink};
          font-family: ${theme.fonts.mono};
          font-size: 10px;
        }

        .review-count strong {
          color: ${theme.colors.teal};
        }

        .review-note {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 16px 0;
          padding: 10px 12px;
          border-radius: 9px;
          background: rgba(205, 160, 62, 0.08);
          border: 1px solid rgba(205, 160, 62, 0.16);
          color: #76540b;
          font-size: 11px;
          line-height: 1.45;
        }

        .action-list {
          display: grid;
          gap: 8px;
        }

        .action-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 11px;
          background: ${theme.colors.paper};
          border: 1px solid ${theme.colors.border};
          transition: border-color 0.18s ease, background 0.18s ease;
        }

        .action-card.approved {
          border-color: rgba(24, 116, 111, 0.18);
          background: rgba(24, 116, 111, 0.025);
        }

        .action-checkbox {
          margin-top: 2px;
          width: 17px;
          height: 17px;
          accent-color: ${theme.colors.teal};
          cursor: pointer;
          flex-shrink: 0;
        }

        .action-body {
          flex: 1;
          min-width: 0;
        }

        .action-title {
          font-size: 12px;
          line-height: 1.5;
          color: ${theme.colors.ink};
          margin: 0;
        }

        .severity-badge {
          display: inline-block;
          font-family: ${theme.fonts.mono};
          font-size: 8px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 5px;
          margin-right: 7px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          vertical-align: 1px;
        }

        .severity-badge.high {
          background: ${theme.colors.amberLight};
          color: #854F0B;
        }

        .severity-badge.medium {
          background: ${theme.colors.tealLight};
          color: ${theme.colors.teal};
        }

        .severity-badge.low {
          background: ${theme.colors.border};
          color: ${theme.colors.slate};
        }

        .action-column {
          font-family: ${theme.fonts.mono};
          background: ${theme.colors.border};
          padding: 2px 6px;
          border-radius: 5px;
          font-size: 10px;
        }

        .action-reason {
          font-size: 11px;
          color: ${theme.colors.slate};
          margin: 5px 0 0;
          line-height: 1.55;
        }

        /* ---- Processing ---- */

        .processing-panel {
          padding: 34px 28px 30px;
          text-align: center;
        }

        .processing-orb {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 50%;
          background: ${theme.colors.tealLight};
          color: ${theme.colors.teal};
          border: 1px solid rgba(24, 116, 111, 0.15);
        }

        .processing-panel .pipeline-strip {
          max-width: 760px;
          margin: 24px auto 0;
        }

        .processing-footer {
          margin-top: 20px;
          color: ${theme.colors.slate};
          font-size: 10px;
          font-family: ${theme.fonts.mono};
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 14px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: rgba(179, 38, 30, 0.06);
          border: 1px solid rgba(179, 38, 30, 0.15);
          color: #B3261E;
          font-size: 12px;
          line-height: 1.5;
        }

        .error-icon {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(179, 38, 30, 0.1);
          font-size: 10px;
          font-weight: 700;
        }

        .start-over-wrap {
          padding: 0 26px 26px;
        }

        .start-over-wrap .choose-file-button {
          width: 100%;
        }

        @media (max-width: 760px) {
          .upload-shell {
            width: min(100% - 24px, 680px);
            padding-top: 12px;
          }

          .upload-header {
            margin-bottom: 34px;
          }

          .brand-status {
            display: none;
          }

          .hero-title {
            font-size: 38px;
          }

          .workspace-card {
            border-radius: 16px;
          }

          .review-panel,
          .processing-panel {
            padding: 20px;
          }

          .review-top {
            flex-direction: column;
          }

          .review-count {
            align-self: flex-start;
          }

          .dropzone {
            margin: 10px;
            min-height: 300px;
            padding: 30px 18px;
          }
        }

        @media (max-width: 460px) {
          .hero-title {
            font-size: 33px;
          }

          .hero-subtitle {
            font-size: 12px;
          }

          .pipeline-wrap {
            padding: 8px;
          }

          .pipeline-pill {
            min-width: 78px;
          }

          .helper-row {
            gap: 9px 13px;
          }

          .review-note {
            align-items: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pipeline-pill.active,
          .spinner {
            animation: none;
          }

          .logout-button,
          .choose-file-button,
          .primary-button,
          .dropzone,
          .action-card {
            transition: none;
          }
        }
      `}</style>

      <div className="upload-shell">
        <header className="upload-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <path d="M10 14L20 30L30 14" stroke={theme.colors.teal} strokeWidth="2" strokeLinecap="round" />
                <path d="M10 14L30 14" stroke={theme.colors.teal} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
                <circle cx="10" cy="14" r="4" fill={theme.colors.teal} />
                <circle cx="30" cy="14" r="4" fill={theme.colors.teal} opacity="0.55" />
                <circle cx="20" cy="30" r="4" fill={theme.colors.teal} />
              </svg>
            </div>
            <span className="brand-title">AI Data Analyst Agent</span>
            <span className="brand-status">
              <span className="status-dot" />
              Ready
            </span>
          </div>

          <button className="logout-button" onClick={logout}>
            Log out
          </button>
        </header>

        <main className="upload-main">
          {error && (
            <div className="error-banner" role="alert">
              <span className="error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          {!datasetId && !previewData && (
            <>
              <section className="hero">
                <div className="eyebrow">
                  <span className="status-dot" />
                  Autonomous data intelligence
                </div>
                <h1 className="hero-title">
                  Put your dataset to work.<br />
                  <span>Let the agents investigate.</span>
                </h1>
                <p className="hero-subtitle">
                  Upload a CSV and the analyst pipeline will profile the data, identify
                  issues, propose cleaning actions, test findings, and build the analysis for you.
                </p>
              </section>

              <div className="pipeline-wrap">
                <p className="pipeline-label">Analysis pipeline</p>
                <PipelineStrip currentStep={null} />
              </div>

              <section className="workspace-card">
                <div className="workspace-topline" />

                <div
                  className={`dropzone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="dropzone-icon" aria-hidden="true">
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 15.5V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>

                  <h2 className="dropzone-title">
                    {isDragging ? 'Drop your dataset here' : 'Upload your dataset'}
                  </h2>

                  <p className="dropzone-subtitle">
                    Drag and drop your CSV file here, or select it from your computer.
                    Your data stays in the analysis workflow.
                  </p>

                  {file && (
                    <div className="file-chip" title={file.name}>
                      <span aria-hidden="true">▣</span>
                      <span>{file.name}</span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  <label htmlFor="file-input" className="choose-file-button">
                    {file ? 'Choose a different file' : 'Choose CSV file'}
                  </label>

                  <button
                    className="primary-button"
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span className="spinner" />
                        Uploading and profiling...
                      </>
                    ) : (
                      <>
                        Upload and preview
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>

                  <div className="helper-row">
                    <span className="helper-item"><span className="helper-check">✓</span> CSV supported</span>
                    <span className="helper-item"><span className="helper-check">✓</span> Automatic profiling</span>
                    <span className="helper-item"><span className="helper-check">✓</span> Review before changes</span>
                  </div>
                </div>
              </section>
            </>
          )}

          {previewData && !status && (
            <section className="workspace-card">
              <div className="workspace-topline" />

              <div className="review-panel">
                <div className="review-top">
                  <div>
                    <div className="section-kicker">Human review checkpoint</div>
                    <h2 className="review-title">Review proposed cleaning</h2>
                    <p className="review-subtitle">
                      The profiling agent found these potential fixes. You decide what gets applied.
                    </p>
                  </div>

                  <div className="review-count">
                    <strong>{approvedCount}</strong> / {totalCount} approved
                  </div>
                </div>

                <div className="review-note">
                  <span aria-hidden="true">◆</span>
                  <span>Nothing is applied until you approve it. Uncheck any action you want the agent to skip.</span>
                </div>

                <div className="action-list">
                  {previewData.proposed_actions.map((action, index) => {
                    const isApproved = !!approvedActions[index]

                    return (
                      <div key={index} className={`action-card ${isApproved ? 'approved' : ''}`}>
                        <input
                          id={`action-${index}`}
                          type="checkbox"
                          className="action-checkbox"
                          checked={isApproved}
                          onChange={() => toggleApproval(index)}
                        />

                        <label htmlFor={`action-${index}`} className="action-body" style={{ cursor: 'pointer' }}>
                          <p className="action-title">
                            <span className={`severity-badge ${action.severity}`}>
                              {action.severity}
                            </span>
                            <strong>{action.action}</strong> on{' '}
                            <span className="action-column">{action.column}</span>
                          </p>
                          <p className="action-reason">{action.reason}</p>
                        </label>
                      </div>
                    )
                  })}
                </div>

                <button
                  className="primary-button"
                  onClick={handleConfirmAndAnalyze}
                  disabled={isStartingAnalysis}
                >
                  {isStartingAnalysis ? (
                    <>
                      <span className="spinner" />
                      Starting analysis...
                    </>
                  ) : (
                    <>
                      Confirm {approvedCount} action{approvedCount === 1 ? '' : 's'} and run analysis
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {datasetId && status === 'processing' && (
            <section className="workspace-card">
              <div className="workspace-topline" />

              <div className="processing-panel">
                <div className="processing-orb" aria-hidden="true">
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" opacity="0.35" />
                    <path d="M12 4A8 8 0 0 1 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                <div className="section-kicker">Agent pipeline running</div>
                <h2 className="processing-title">Your analysis is underway</h2>
                <p className="processing-subtitle">
                  Specialized agents are working through the dataset in sequence.
                </p>

                <PipelineStrip currentStep={currentStep} />

                <p className="processing-footer">
                  Current stage: {currentStep ? currentStep.replace(/_/g, ' ') : 'starting'}
                </p>
              </div>
            </section>
          )}

          {status === 'failed' && (
            <div className="start-over-wrap">
              <button className="choose-file-button" onClick={resetUpload}>
                ← Start over
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default UploadPage
