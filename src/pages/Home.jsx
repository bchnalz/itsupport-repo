import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      let query = supabase
        .from('files')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.ilike('title', `%${search}%`)
      }
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter)
      }

      query.then(({ data }) => {
        setFiles(data || [])
        setLoading(false)
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [search, categoryFilter])

  const handleDownload = async (file) => {
    const { data } = await supabase.functions.invoke('drive-download', {
      body: { fileId: file.drive_file_id }
    })
    if (data?.url) window.open(data.url, '_blank')
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024
      i++
    }
    return `${bytes.toFixed(1)} ${units[i]}`
  }

  return (
    <div className="container">
      <div className="card search-bar">
        <input
          type="text"
          placeholder="Search files by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ marginTop: '0.5rem' }}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : files.length === 0 ? (
          <p>No files found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.title}</td>
                  <td>{file.categories?.name || '-'}</td>
                  <td>{formatSize(file.file_size)}</td>
                  <td>{new Date(file.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleDownload(file)}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
