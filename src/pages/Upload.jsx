import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { UploadCloud, Tag, X, Plus, Sparkles } from 'lucide-react'

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
  const debounceRef = useRef(null)

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
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upload File</h1>
        <p className="text-sm text-muted-foreground mt-1">Tags are generated automatically from your title.</p>
      </div>

      <Card>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <div className="border-2 border-dashed rounded-md p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {file ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & drop or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="What is this file? Be descriptive..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags</Label>
                {generating && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> generating...
                  </span>
                )}
              </div>
              <div className="rounded-md border bg-muted/30 p-3 min-h-[48px]">
                {tags.length === 0 && !generating ? (
                  <p className="text-xs text-muted-foreground py-1">Type a title above to auto-generate tags.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1 group">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(i)}
                          className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-colors"
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
                  className="h-8 text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCustomTag} className="h-8 shrink-0">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Description</Label>
              <Textarea
                id="notes"
                placeholder="Optional description or notes about this file..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {message && (
              <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
                {message}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={uploading || !file || !title}>
              {uploading ? (
                'Uploading...'
              ) : (
                <><UploadCloud className="mr-2 h-4 w-4" /> Upload</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
