import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...')

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/health')
      .then(response => {
        setBackendStatus(response.data.health)
      })
      .catch(error => {
        setBackendStatus('backend not reachable')
        console.error(error)
      })
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>AI Data Analyst Agent</h1>
      <p>Backend status: <strong>{backendStatus}</strong></p>
    </div>
  )
}

export default App