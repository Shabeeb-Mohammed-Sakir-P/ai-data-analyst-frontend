import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://127.0.0.1:8000'

function UploadPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [datasetId, setDatasetId] = useState(null)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

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
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('UPLOAD SUCCESS:', response.data)
      setDatasetId(response.data.dataset_id)

      await axios.post(`${API_BASE}/analyze/${response.data.dataset_id}`, {}, authHeader)
      console.log('ANALYZE STARTED')
      setStatus('processing')
    } catch (err) {
      console.log('UPLOAD/ANALYZE FAILED:', err.response?.status, err.response?.data, err.message)
      setError(err.response?.data?.detail || 'Upload failed')
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
    <div style={{ maxWidth: '500px', margin: '4rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>AI Data Analyst Agent</h1>
        <button onClick={logout}>Log out</button>
      </div>

      {!datasetId && (
        <>
          <p>Upload a CSV file to begin analysis.</p>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <br /><br />
          <button onClick={handleUpload} disabled={!file}>
            Upload and Analyze
          </button>
        </>
      )}

      {datasetId && status === 'processing' && (
        <div>
          <p>Analyzing your dataset... this can take a minute or two.</p>
          <p>Status: <strong>{status}</strong></p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export default UploadPage