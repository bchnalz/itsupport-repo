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

const DRIVE_FOLDER_ID = "12X5Ff-RW-4dguxMPI8l0qVaycKcKuNAt"

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
  const fileInputRef = useRef(null)

  const suggestTags = useCallback(async (t, fn) => {
    if (!t || t.length < 2) { setTags([]); return }
    setGenerating(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-tags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, fileName: fn }),
      })
      const data = await res.json()
      setTags(data.tags || [])
    } catch { setTags([]) }
    finally { setGenerating(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => suggestTags(title, file?.name), 600)
    return () => clearTimeout(debounceRef.current)
  }, [title, file, suggestTags])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!f) return
    setFile(f)
    suggestTags(title || f.name.replace(/\.[^.]+$/, ''), f.name)
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileChange(e) }

  const removeTag = (index) => setTags(prev => prev.filter((_, i) => i !== index))
  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase()
    if (!t || tags.includes(t)) return
    setTags(prev => [...prev, t]); setCustomTag('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true); setProgress(0); setMessage(''); setMessageType('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      setMessage('Getting Drive token...')
      const tokenRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
      })
      const { token: driveToken, error: tokenErr } = await tokenRes.json()
      if (tokenErr || !driveToken) throw new Error(tokenErr || 'Failed to get Drive token')

      setMessage('Uploading to Drive...')

      const metadata = { name: file.name, parents: [DRIVE_FOLDER_ID] }
      const formBody = new FormData()
      formBody.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      formBody.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size')
      xhr.setRequestHeader('Authorization', `Bearer ${driveToken}`)

      const uploadResult = await new Promise((resolve, reject) => {
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText))
          else reject(new Error(`Drive upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(formBody)
      })

      setMessage('Saving metadata...')
      const metaRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title, notes, tags,
          driveFileId: uploadResult.id,
          fileSize: file.size,
          mimeType: file.type,
          fileName: file.name,
        }),
      })

      if (!metaRes.ok) throw new Error('Failed to save metadata')

      setUploading(false)
      setMessage(`Uploaded! ${tags.length} tags assigned.`)
      setMessageType('success')
      setTitle(''); setFile(null); setTags([])
    } catch (err) {
      setUploading(false)
      setMessage(err.message || 'Upload failed')
      setMessageType('error')
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upload File</h1>
        <p className="text-sm text-muted-foreground mt-1">Max file size: unlimited (direct to Drive).</p>
      </div>
      <Card>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <div
                className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
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
              <Input id="title" placeholder="What is this file? Be descriptive..." value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags</Label>
                {generating && <span className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> generating...</span>}
              </div>
              <div className="rounded-md border bg-muted/30 p-3 min-h-[48px]">
                {tags.length === 0 && !generating ? (
                  <p className="text-xs text-muted-foreground py-1">Type a title above to auto-generate tags.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1 group">
                        <Tag className="h-3 w-3" />{tag}
                        <button type="button" onClick={() => removeTag(i)} className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom tag..." value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }} className="h-8 text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={addCustomTag} className="h-8 shrink-0"><Plus className="h-3 w-3" /></Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Description</Label>
              <Textarea id="notes" placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{message}</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
            {!uploading && message && (
              <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>{message}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={uploading || !file || !title}>
              {uploading ? 'Uploading...' : <><UploadCloud className="mr-2 h-4 w-4" /> Upload</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
