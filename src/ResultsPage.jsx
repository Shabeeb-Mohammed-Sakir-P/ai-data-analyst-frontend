import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import { useAuth } from './AuthContext'

const API_BASE = 'http://127.0.0.1:8000'

function ResultsPage() {
  const { datasetId } = useParams()
  const { token } = useAuth()
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    axios
      .get(`${API_BASE}/results/${datasetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setResults(response.data))
      .catch((err) => setError(err.response?.data?.detail || 'Could not load results'))
  }, [datasetId])

  if (error) return <p style={{ color: 'red', padding: '2rem' }}>{error}</p>
  if (!results) return <p style={{ padding: '2rem' }}>Loading results...</p>

  const chartFilenames = (results.chart_filepaths || []).map((path) =>
    path.split(/[/\\]/).pop()
  )

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Analysis Results</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Report</h2>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{results.report}</div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Charts</h2>
        {chartFilenames.map((filename) => (
          <img
            key={filename}
            src={`${API_BASE}/charts/${filename}`}
            alt={filename}
            style={{ maxWidth: '100%', marginBottom: '1rem', border: '1px solid #ccc' }}
          />
        ))}
      </section>

      <section>
        <h2>Statistical Test Results</h2>
        {(results.test_results || []).map((result, i) => (
          <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <p><strong>{result.hypothesis}</strong></p>
            <p>Test: {result.test_used || 'N/A'} | p-value: {result.p_value ?? 'N/A'} | Significant: {String(result.significant)}</p>
            {result.note && <p>Note: {result.note}</p>}
          </div>
        ))}
      </section>
    </div>
  )
}

export default ResultsPage