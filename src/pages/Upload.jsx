import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Upload() {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [categories, setCategories] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    setProgress(0)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('categoryId', categoryId)
    formData.append('notes', notes)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      setUploading(false)
      if (xhr.status === 200) {
        setMessage('File uploaded successfully')
        setTitle('')
        setCategoryId('')
        setNotes('')
        setFile(null)
      } else {
        setMessage('Upload failed: ' + xhr.responseText)
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setMessage('Upload failed')
    }

    xhr.send(formData)
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="card">
        <h2>Upload File</h2>
        <form onSubmit={handleUpload}>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.parent_id ? '- ' : ''}{cat.name}
              </option>
            ))}
          </select>

          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <label>File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            required
            style={{ border: 'none', padding: '0.5rem 0' }}
          />

          {uploading && (
            <div style={{ margin: '1rem 0' }}>
              <progress value={progress} max="100" style={{ width: '100%' }} />
              <span>{progress}%</span>
            </div>
          )}

          {message && <p className={message.includes('failed') ? 'error' : ''} style={{ margin: '0.5rem 0', color: message.includes('failed') ? '#d33' : '#080' }}>{message}</p>}

          <button type="submit" disabled={uploading} style={{ width: '100%', marginTop: '1rem' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  )
}
