import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import { useAuth } from './AuthContext'

const API_BASE = 'http://127.0.0.1:8000'

function ChatWindow({ datasetId, token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return
    const question = input
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setLoading(true)

    try {
      const chatHistory = messages.map((m, i, arr) => {
        if (m.role !== 'user') return null
        const answer = arr[i + 1]
        return answer ? { question: m.text, answer: answer.text } : null
      }).filter(Boolean)

      const response = await axios.post(
        `${API_BASE}/chat/${datasetId}`,
        { question, chat_history: chatHistory },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages((prev) => [...prev, { role: 'assistant', text: response.data.answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage()
  }

  return (
    <section style={{ marginTop: '2rem', border: '1px solid #ccc', borderRadius: '8px', padding: '1rem' }}>
      <h2>Ask About This Analysis</h2>

      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === 'user' ? 'right' : 'left',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                borderRadius: '12px',
                background: m.role === 'user' ? '#0C447C' : '#f0f0f0',
                color: m.role === 'user' ? 'white' : 'black',
                maxWidth: '80%',
              }}
            >
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>Thinking...</p>}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. What is the average age?"
          style={{ flex: 1, padding: '8px' }}
        />
        <button onClick={sendMessage} disabled={loading}>Send</button>
      </div>
    </section>
  )
}

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
      .then((response) => {
        setResults(response.data)
      })
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

      <section style={{ marginBottom: '2rem' }}>
        <h2>Statistical Test Results</h2>
        {(results.test_results || []).map((result, i) => (
          <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <p><strong>{result.hypothesis}</strong></p>
            <p>Test: {result.test_used || 'N/A'} | p-value: {result.p_value ?? 'N/A'} | Significant: {String(result.significant)}</p>
            {result.note && <p>Note: {result.note}</p>}
          </div>
        ))}
      </section>

      <ChatWindow datasetId={datasetId} token={token} />
    </div>
  )
}

export default ResultsPage