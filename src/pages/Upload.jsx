import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { UploadCloud } from 'lucide-react'

export default function Upload() {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [categories, setCategories] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

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
    setMessageType('')

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
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      setUploading(false)
      if (xhr.status === 200) {
        setMessage('File uploaded successfully.')
        setMessageType('success')
        setTitle('')
        setCategoryId('')
        setNotes('')
        setFile(null)
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          setMessage(err.detail || err.error || 'Upload failed')
        } catch {
          setMessage('Upload failed: ' + xhr.responseText)
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

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upload File</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a file to the shared repository.</p>
      </div>

      <Card>
        <form onSubmit={handleUpload}>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="File title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.parent_id ? '└ ' : ''}{cat.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
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
