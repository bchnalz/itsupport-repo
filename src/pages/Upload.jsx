import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { UploadCloud, Tag, Tags } from 'lucide-react'

export default function Upload() {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [tags, setTags] = useState([])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    setProgress(0)
    setMessage('')
    setMessageType('')
    setTags([])

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
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
        setMessage('File uploaded successfully.')
        setMessageType('success')
        setTags(res.tags || [])
        setTitle('')
        setNotes('')
        setFile(null)
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          setMessage(err.detail || err.error || 'Upload failed')
        } catch {
          setMessage('Upload failed')
        }
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

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upload File</h1>
        <p className="text-sm text-muted-foreground mt-1">Files are auto-tagged for search.</p>
      </div>

      <Card>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Epson L121 Driver v2.1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional context (helps tag generation)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                required
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

            {tags.length > 0 && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Tags className="h-3.5 w-3.5" /> Auto-generated tags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
                {message}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={uploading}>
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
