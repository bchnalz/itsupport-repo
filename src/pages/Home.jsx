import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useDownloads } from '@/lib/downloadContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Search, Download, File, Calendar, User, X } from 'lucide-react'

export default function Home() {
  const { startDownload } = useDownloads() || {}
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  const fetchFiles = useCallback(async (searchTerm, categoryId) => {
    if (!searchTerm && !categoryId) {
      setFiles([])
      setHasSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setHasSearched(true)
    let query = supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query
    if (error) console.error('Fetch error:', error.message)
    setFiles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchFiles(search, categoryFilter), 200)
    return () => clearTimeout(timer)
  }, [search, categoryFilter, fetchFiles])

  const handleDownload = (file) => {
    if (startDownload) startDownload(file)
  }

  const clearSearch = () => {
    setSearch('')
    setCategoryFilter('')
  }

  const getCategoryName = (categoryId) => {
    if (!categoryId) return '-'
    const cat = categories.find(c => c.id === categoryId)
    return cat?.name || '-'
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
    return `${bytes.toFixed(1)} ${units[i]}`
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Repository</h1>
        <p className="text-sm text-muted-foreground mt-1">Search to find files.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 h-10 text-base"
            autoFocus
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </Select>
      </div>

      {loading && (
        <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>
      )}

      {!loading && hasSearched && files.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No files match your search.</p>
      )}

      {!loading && files.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left font-medium text-muted-foreground py-2 px-3">File</th>
              <th className="text-left font-medium text-muted-foreground py-2 px-3 hidden sm:table-cell">Category</th>
              <th className="text-left font-medium text-muted-foreground py-2 px-3 hidden sm:table-cell">Size</th>
              <th className="text-left font-medium text-muted-foreground py-2 px-3 hidden lg:table-cell">Date</th>
              <th className="text-left font-medium text-muted-foreground py-2 px-3 hidden lg:table-cell">By</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{file.title}</span>
                      {file.file_name && file.file_name !== file.title && (
                        <span className="text-xs text-muted-foreground truncate block">{file.file_name}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden sm:table-cell">
                  {getCategoryName(file.category_id)}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden sm:table-cell">
                  {formatSize(file.file_size)}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {file.uploaded_by_email || '-'}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(file)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
