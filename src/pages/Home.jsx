import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useDownloads } from '@/lib/downloadContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Download, File, Calendar, User, X, Tag } from 'lucide-react'

const HIGHLIGHT_CLASSES = "inline bg-amber-200/60 dark:bg-amber-500/30 rounded-sm px-0.5"

function highlightText(text, searchWords) {
  if (!text || !searchWords.length) return text
  const escaped = searchWords.filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return text
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className={HIGHLIGHT_CLASSES}>{part}</mark> : part
  )
}

export default function Home() {
  const { startDownload } = useDownloads() || {}
  const [files, setFiles] = useState([])
  const [allTags, setAllTags] = useState([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const searchWords = search.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0)

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => setAllTags(data || []))
  }, [])

  const fetchFiles = useCallback(async (searchTerm, tagId) => {
    if (!searchTerm && !tagId) {
      setFiles([])
      setHasSearched(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    const words = searchTerm.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0)

    let query = supabase
      .from('files')
      .select('*, file_tags!inner(tag_id)')
      .order('created_at', { ascending: false })

    if (tagId) {
      query = query.eq('file_tags.tag_id', tagId)
    }

    if (words.length > 0) {
      const conditions = words.map(w => `title.ilike.%${w}%,file_name.ilike.%${w}%`).join(',')
      query = query.or(conditions)
    }

    const { data, error } = await query
    if (error) console.error('Fetch error:', error.message)

    const unique = data ? data.filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i) : []

    const enriched = await Promise.all(
      unique.map(async (f) => {
        const { data: ftags } = await supabase
          .from('file_tags')
          .select('tag_id')
          .eq('file_id', f.id)
        return { ...f, tagIds: (ftags || []).map(t => t.tag_id) }
      })
    )

    setFiles(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchFiles(search, tagFilter), 200)
    return () => clearTimeout(timer)
  }, [search, tagFilter, fetchFiles])

  const handleDownload = (file) => {
    if (startDownload) startDownload(file)
  }

  const clearSearch = () => { setSearch(''); setTagFilter(null) }
  const toggleTag = (tagId) => setTagFilter(prev => prev === tagId ? null : tagId)
  const getTagName = (id) => allTags.find(t => t.id === id)?.name || ''

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
        <p className="text-sm text-muted-foreground mt-1">Search by title, filename, or tag.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Try "driver epson" or "laporan 2025"...'
          value={search}
          onChange={(e) => { setSearch(e.target.value); setTagFilter(null) }}
          className="pl-9 pr-9 h-10 text-base"
          autoFocus
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
          {allTags.map((tag) => (
            <Badge
              key={tag.id}
              variant={tagFilter === tag.id ? 'default' : 'secondary'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>
      )}

      {!loading && hasSearched && files.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No files match{tagFilter ? ` tag "${getTagName(tagFilter)}"` : ''}{search ? ` "${search}"` : ''}.
        </p>
      )}

      {!loading && files.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left font-medium text-muted-foreground py-2 px-3">File</th>
              <th className="text-left font-medium text-muted-foreground py-2 px-3 hidden sm:table-cell">Tags</th>
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
                  <div className="flex items-start gap-2">
                    <File className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium truncate block">
                        {highlightText(file.title, searchWords)}
                      </span>
                      {file.file_name && file.file_name !== file.title && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {highlightText(file.file_name, searchWords)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {file.tagIds?.map((tid) => (
                      <Badge
                        key={tid}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-primary/20"
                        onClick={() => toggleTag(tid)}
                      >
                        {getTagName(tid)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden sm:table-cell">
                  {formatSize(file.file_size)}
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden lg:table-cell">
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(file.created_at).toLocaleDateString()}</div>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground text-xs hidden lg:table-cell">
                  <div className="flex items-center gap-1"><User className="h-3 w-3" />{file.uploaded_by_email || '-'}</div>
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
