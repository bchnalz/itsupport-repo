import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useDownloads } from '@/lib/downloadContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, Download, File, X, Tag, Pencil } from 'lucide-react'

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
  const [recentTags, setRecentTags] = useState([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [role, setRole] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const searchWords = search.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0)

  useEffect(() => {
    supabase.from('tags').select('*').order('name').then(({ data }) => setAllTags(data || []))
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) supabase.from('user_roles').select('role').eq('user_id', session.user.id).single()
        .then(({ data }) => setRole(data?.role || null))
    })
  }, [])

  const fetchFiles = useCallback(async (searchTerm, tagId) => {
    if (!searchTerm && !tagId) { setFiles([]); setHasSearched(false); setLoading(false); return }
    setLoading(true); setHasSearched(true)

    const words = searchTerm.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0)
    let query = supabase.from('files').select('*').order('created_at', { ascending: false })

    if (tagId) {
      const { data: tagged } = await supabase.from('file_tags').select('file_id').eq('tag_id', tagId)
      const fileIds = (tagged || []).map(t => t.file_id)
      if (fileIds.length === 0) { setFiles([]); setLoading(false); return }
      query = query.in('id', fileIds)
    }
    if (words.length > 0) {
      query = query.or(words.map(w => `title.ilike.%${w}%,file_name.ilike.%${w}%`).join(','))
    }

    const { data, error } = await query
    if (error) console.error('Fetch error:', error.message)

    const unique = data ? data.filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i) : []
    const enriched = await Promise.all(unique.map(async (f) => {
      const { data: ftags } = await supabase.from('file_tags').select('tag_id').eq('file_id', f.id)
      return { ...f, tagIds: (ftags || []).map(t => t.tag_id) }
    }))
    setFiles(enriched)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchFiles(search, tagFilter), 200)
    return () => clearTimeout(timer)
  }, [search, tagFilter, fetchFiles])

  const handleDownload = (file) => { if (startDownload) startDownload(file) }
  const clearSearch = () => { setSearch(''); setTagFilter(null) }

  const toggleTag = (tagId) => {
    const newFilter = tagFilter === tagId ? null : tagId
    setTagFilter(newFilter)
    setRecentTags(prev => { const rest = prev.filter(id => id !== tagId); return [tagId, ...rest].slice(0, 5) })
  }

  const sortedTags = (() => {
    const recentSet = new Set(recentTags)
    const recent = recentTags.filter(id => allTags.some(t => t.id === id))
    const rest = allTags.filter(t => !recentSet.has(t.id)).map(t => t.id)
    return [...recent, ...rest]
  })()

  const clearTagFilter = () => setTagFilter(null)

  const getTagName = (id) => allTags.find(t => t.id === id)?.name || ''
  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
    return `${bytes.toFixed(1)} ${units[i]}`
  }

  const openEdit = (file) => {
    setEditFile(file)
    setEditTitle(file.title)
    setEditNotes(file.notes || '')
  }

  const saveEdit = async () => {
    if (!editFile) return
    await supabase.from('files').update({ title: editTitle, notes: editNotes || null }).eq('id', editFile.id)
    setFiles(prev => prev.map(f => f.id === editFile.id ? { ...f, title: editTitle, notes: editNotes } : f))
    setEditFile(null)
  }

  const removeFileTag = async (fileId, tagId) => {
    await supabase.from('file_tags').delete().eq('file_id', fileId).eq('tag_id', tagId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, tagIds: f.tagIds.filter(t => t !== tagId) } : f))
  }

  const addFileTag = async (fileId, tagName) => {
    const clean = tagName.toLowerCase().trim()
    if (!clean) return
    let { data: tag } = await supabase.from('tags').select('id').eq('name', clean).single()
    if (!tag) {
      const { data: created } = await supabase.from('tags').insert({ name: clean }).select('id').single()
      tag = created
      if (created) setAllTags(prev => [...prev, { id: created.id, name: clean }])
    }
    if (tag) {
      await supabase.from('file_tags').upsert({ file_id: fileId, tag_id: tag.id }, { onConflict: 'file_id,tag_id' })
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, tagIds: [...f.tagIds, tag.id] } : f))
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">IT SUPPORT REPOSITORY</h1>
        <p className="text-sm text-muted-foreground mt-1">Search by title, filename, or tag.</p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder='Search files...'
          value={search}
          onChange={(e) => { setSearch(e.target.value); setTagFilter(null) }}
          className="pl-9 pr-9 h-10 text-base text-center placeholder:text-center"
          autoFocus
        />
        {search && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {sortedTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 items-center">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {sortedTags.map((tid) => (
            <Badge
              key={tid}
              variant={tagFilter === tid ? 'default' : 'secondary'}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => toggleTag(tid)}
            >
              {getTagName(tid)}
            </Badge>
          ))}
          {tagFilter && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={clearTagFilter}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {loading && <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>}
      {!loading && hasSearched && files.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No files match.</p>
      )}

      {!loading && files.length > 0 && (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground py-1.5 px-2">File</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 px-2 hidden sm:table-cell w-[72px]">Size</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 px-2 hidden md:table-cell w-[96px]">Date</th>
                <th className="text-left font-medium text-muted-foreground py-1.5 px-2 hidden lg:table-cell w-[128px]">By</th>
                <th className="py-1.5 px-2 w-0"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors group">
                  <td className="py-1.5 px-2 max-w-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium truncate block max-w-full">
                            {highlightText(file.title, searchWords)}
                          </span>
                          {file.file_name && file.file_name !== file.title && (
                            <span className="text-xs text-muted-foreground truncate max-w-full block">
                              ({highlightText(file.file_name, searchWords)})
                            </span>
                          )}
                        </div>
                        {file.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">{file.notes}</p>
                        )}
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {file.tagIds?.map((tid) => (
                            <Badge key={tid} variant="secondary" className="text-[10px] px-1.5 py-0 leading-normal group/badge cursor-pointer hover:bg-primary/20" onClick={() => toggleTag(tid)}>
                              {getTagName(tid)}
                              {role === 'admin' && (
                                <button onClick={(e) => { e.stopPropagation(); removeFileTag(file.id, tid) }}
                                  className="ml-0.5 opacity-0 group-hover/badge:opacity-100 hover:text-destructive">
                                  <X className="h-2.5 w-2.5 inline" />
                                </button>
                              )}
                            </Badge>
                          ))}
                          {role === 'admin' && <AddTagButton onAdd={(name) => addFileTag(file.id, name)} />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground text-xs tabular-nums hidden sm:table-cell">{formatSize(file.file_size)}</td>
                  <td className="py-1.5 px-2 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">{new Date(file.created_at).toLocaleDateString()}</td>
                  <td className="py-1.5 px-2 text-muted-foreground text-xs hidden lg:table-cell truncate max-w-[128px]">{file.uploaded_by_email || '-'}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {role === 'admin' && (
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => openEdit(file)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editFile} onOpenChange={() => setEditFile(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFile(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddTagButton({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')

  const handleAdd = () => {
    if (val.trim()) { onAdd(val.trim()); setVal(''); setOpen(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-[10px] text-muted-foreground border border-dashed rounded px-1.5 py-0 hover:border-primary hover:text-primary transition-colors">+ tag</button>
  )

  return (
    <span className="inline-flex items-center gap-0.5">
      <input value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="tag" className="w-16 h-5 text-[10px] border rounded px-1 bg-transparent" autoFocus />
      <button onClick={handleAdd} className="text-[10px] text-primary">add</button>
      <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground"><X className="h-2.5 w-2.5" /></button>
    </span>
  )
}
