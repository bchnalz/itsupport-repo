import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { UploadCloud, Tag, X, Plus, Sparkles, CheckCircle2, AlertCircle, FileUp } from 'lucide-react'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState([])
  const [customTag, setCustomTag] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [generating, setGenerating] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const debounceRef = useRef(null)
  const dropRef = useRef(null)

  const suggestTags = useCallback(async (t, fn) => {
    if (!t || t.length < 2) { setTags([]); return }
    setGenerating(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, fileName: fn }),
      })
      const data = await res.json()
      setTags(data.tags || [])
    } catch { setTags([]) }
    finally { setGenerating(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      suggestTags(title, file?.name)
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [title, file, suggestTags])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
    if (f) suggestTags(title || f.name.replace(/\.[^.]+$/, ''), f.name)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      setFile(f)
      suggestTags(title || f.name.replace(/\.[^.]+$/, ''), f.name)
    }
  }

  const removeTag = (index) => setTags(prev => prev.filter((_, i) => i !== index))

  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase()
    if (!t || tags.includes(t)) return
    setTags(prev => [...prev, t])
    setCustomTag('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    setProgress(0)
    setMessage('')
    setMessageType('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('tags', JSON.stringify(tags))
    formData.append('notes', notes)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      setUploading(false)
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        setMessage(`Uploaded! ${(res.tags || []).length} tags assigned.`)
        setMessageType('success')
        setTitle('')
        setFile(null)
        setTags([])
      } else {
        try { const err = JSON.parse(xhr.responseText); setMessage(err.detail || err.error || 'Upload failed') }
        catch { setMessage('Upload failed') }
        setMessageType('error')
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setMessage('Upload failed. Check your connection.')
      setMessageType('error')
    }

    xhr.send(formData)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upload File</h1>
        <p className="text-sm text-muted-foreground mt-1">Tags are generated automatically from your title.</p>
      </div>

      <Card className="transition-all duration-200 hover:shadow-sm">
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-5 pt-6">
            {/* File drop zone */}
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg'
                    : file
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required={!file}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="transition-all duration-200">
                  {file ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                      <FileUp className="mx-auto h-8 w-8 text-emerald-500" />
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className={`mx-auto h-8 w-8 transition-all duration-200 ${dragOver ? 'text-primary scale-110' : 'text-muted-foreground'}`} />
                      <p className="text-sm text-muted-foreground">
                        {dragOver ? 'Drop file here' : 'Drag & drop or click to browse'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2 animate-in fade-in duration-200 delay-50">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What is this file? Be descriptive..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm transition-all duration-200 focus-visible:ring-2"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2 animate-in fade-in duration-200 delay-100">
              <div className="flex items-center justify-between">
                <Label>Tags</Label>
                {generating && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in duration-150">
                    <Sparkles className="h-3 w-3 animate-pulse" /> generating...
                  </span>
                )}
              </div>
              <div className={`rounded-lg border transition-all duration-200 p-3 min-h-[48px] ${
                tags.length > 0 ? 'bg-muted/30' : 'bg-muted/30'
              }`}>
                {tags.length === 0 && !generating ? (
                  <p className="text-xs text-muted-foreground py-1">Type a title above to auto-generate tags.</p>
                ) : generating && tags.length === 0 ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="h-3 w-3 rounded-full bg-primary/30 animate-pulse" />
                    <div className="h-3 w-3 rounded-full bg-primary/20 animate-pulse delay-75" />
                    <div className="h-3 w-3 rounded-full bg-primary/10 animate-pulse delay-150" />
                    <span className="text-xs text-muted-foreground ml-1">Generating tags...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs gap-1 pr-1 group animate-in fade-in slide-in-from-left-1 duration-150"
                        style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(i)}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-all duration-150 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                  className="h-8 text-sm transition-all duration-200 focus-visible:ring-2"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomTag} className="h-8 shrink-0 transition-all duration-200 active:scale-[0.95]">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 animate-in fade-in duration-200 delay-150">
              <Label htmlFor="notes">Description</Label>
              <Textarea
                id="notes"
                placeholder="Optional description or notes about this file..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm transition-all duration-200 focus-visible:ring-2"
              />
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5 animate-bounce" /> Uploading...
                  </span>
                  <span className="text-muted-foreground tabular-nums">{progress}%</span>
                </div>
                <Progress value={progress} className="transition-all duration-300" />
              </div>
            )}

            {/* Toast message */}
            {message && (
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm animate-in slide-in-from-bottom-1 fade-in duration-200 ${
                  messageType === 'error'
                    ? 'bg-destructive/5 border-destructive/20 text-destructive'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                {message}
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full transition-all duration-200 active:scale-[0.98]"
              disabled={uploading || !file || !title}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 animate-pulse" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Upload
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
