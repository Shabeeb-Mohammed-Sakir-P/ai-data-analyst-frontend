import { useAuth } from './AuthContext'

function UploadPage() {
  const { logout } = useAuth()

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Upload Dataset</h1>
      <p>You are logged in.</p>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

export default UploadPage