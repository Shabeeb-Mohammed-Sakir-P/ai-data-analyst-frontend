import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'

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
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '1rem' }}>
      {AGENTS.map((agent, index) => {
        let backgroundColor = '#e0e0e0'
        let color = '#666'

        if (index < currentIndex) {
          backgroundColor = '#E1F5EE'
          color = '#085041'
        } else if (index === currentIndex) {
          backgroundColor = '#E6F1FB'
          color = '#0C447C'
        }

        return (
          <span
            key={agent.key}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              backgroundColor,
              color,
            }}
          >
            {index < currentIndex ? '✓ ' : ''}{agent.label}
          </span>
        )
      })}
    </div>
  )
}

function UploadPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [datasetId, setDatasetId] = useState(null)
  const [status, setStatus] = useState(null)
  const [currentStep, setCurrentStep] = useState(null)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [approvedActions, setApprovedActions] = useState({})

  const authHeader = { headers: { Authorization: `Bearer ${token}` } }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log('UPLOAD SUCCESS:', uploadResponse.data)
      const newDatasetId = uploadResponse.data.dataset_id
      setDatasetId(newDatasetId)

      const previewResponse = await axios.post(`${API_BASE}/preview/${newDatasetId}`, {}, authHeader)
      console.log('PREVIEW:', previewResponse.data)
      setPreviewData(previewResponse.data)

      const initialApprovals = {}
      previewResponse.data.proposed_actions.forEach((_, index) => {
        initialApprovals[index] = true
      })
      setApprovedActions(initialApprovals)
    } catch (err) {
      console.log('UPLOAD/PREVIEW FAILED:', err.response?.status, err.response?.data, err.message)
      setError(err.response?.data?.detail || 'Upload failed')
    }
  }

  const toggleApproval = (index) => {
    setApprovedActions((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleConfirmAndAnalyze = async () => {
    const finalActions = previewData.proposed_actions.filter((_, index) => approvedActions[index])

    try {
      await axios.post(
        `${API_BASE}/analyze/${datasetId}`,
        { approved_actions: finalActions },
        authHeader
      )
      console.log('ANALYZE STARTED with', finalActions.length, 'approved actions')
      setStatus('processing')
    } catch (err) {
      console.log('ANALYZE FAILED:', err.response?.status, err.response?.data, err.message)
      setError(err.response?.data?.detail || 'Failed to start analysis')
    }
  }

  // Poll for status every 3 seconds while processing
  useEffect(() => {
    if (!datasetId || status !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE}/status/${datasetId}`, authHeader)
        console.log('STATUS CHECK:', response.data)
        setStatus(response.data.status)
        setCurrentStep(response.data.current_step)

        if (response.data.status === 'complete') {
          clearInterval(interval)
          navigate(`/results/${datasetId}`)
        } else if (response.data.status === 'failed') {
          clearInterval(interval)
          setError(response.data.error_message || 'Analysis failed')
        }
      } catch (err) {
        console.log('STATUS CHECK FAILED:', err.response?.status, err.response?.data, err.message)
        clearInterval(interval)
        setError('Lost connection while checking status')
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [datasetId, status])

  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>AI Data Analyst Agent</h1>
        <button onClick={logout}>Log out</button>
      </div>

      {!datasetId && !previewData && (
        <>
          <p>Upload a CSV file to begin analysis.</p>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <br /><br />
          <button onClick={handleUpload} disabled={!file}>
            Upload and Preview
          </button>
        </>
      )}

      {previewData && !status && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Review Proposed Cleaning Actions</h2>
          <p>Uncheck anything you don't want applied before analysis.</p>

          {previewData.proposed_actions.map((action, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px',
                marginBottom: '8px',
                background: '#f5f5f5',
                borderRadius: '8px',
              }}
            >
              <input
                type="checkbox"
                checked={!!approvedActions[index]}
                onChange={() => toggleApproval(index)}
                style={{ marginTop: '4px' }}
              />
              <div>
                <strong>[{action.severity?.toUpperCase()}] {action.action}</strong> on <code>{action.column}</code>
                <p style={{ margin: '4px 0 0', color: '#555' }}>{action.reason}</p>
              </div>
            </div>
          ))}

          <button onClick={handleConfirmAndAnalyze} style={{ marginTop: '1rem' }}>
            Confirm and Run Analysis
          </button>
        </div>
      )}

      {datasetId && status === 'processing' && (
        <div>
          <p>Analyzing your dataset... this can take a minute or two.</p>
          <PipelineStrip currentStep={currentStep} />
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export default UploadPage