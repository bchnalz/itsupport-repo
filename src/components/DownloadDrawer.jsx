import { useState, useCallback } from 'react'
import { supabase } from '@/supabaseClient'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, ChevronUp, ChevronDown, File, CheckCircle, AlertCircle } from 'lucide-react'

function useDownloadManager() {
  const [downloads, setDownloads] = useState([])
  const [collapsed, setCollapsed] = useState(true)

  const addDownload = useCallback(({ filename, progress, status }) => {
    const id = Date.now() + Math.random()
    setDownloads(prev => [{ id, filename, progress, status }, ...prev])
    setCollapsed(false)
    return id
  }, [])

  const updateDownload = useCallback((id, update) => {
    setDownloads(prev => {
      if (update._remove) return prev.filter(d => d.id !== id)
      return prev.map(d => d.id === id ? { ...d, ...update } : d)
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status === 'downloading'))
  }, [])

  const startDownload = async (file) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const filename = file.file_name || file.title || 'download'
    const dlId = addDownload({ filename, progress: 0, status: 'downloading' })

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileId: file.drive_file_id }),
        }
      )

      if (!res.ok) {
        updateDownload(dlId, { status: 'error' })
        return
      }

      const contentLength = res.headers.get('Content-Length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      const reader = res.body.getReader()
      const chunks = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        received += value.length
        if (total > 0) {
          updateDownload(dlId, { progress: Math.round((received / total) * 100) })
        }
      }

      const blob = new Blob(chunks)
      const actualFilename = res.headers.get('X-Filename') || filename
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = actualFilename
      a.click()
      URL.revokeObjectURL(url)

      updateDownload(dlId, { status: 'completed', progress: 100 })
    } catch {
      updateDownload(dlId, { status: 'error' })
    }
  }

  return {
    downloads,
    collapsed,
    setCollapsed,
    pendingCount: downloads.filter(d => d.status === 'downloading').length,
    addDownload,
    updateDownload,
    clearCompleted,
    startDownload,
  }
}

export default function DownloadDrawer({ manager }) {
  const { downloads, collapsed, setCollapsed, pendingCount, updateDownload, clearCompleted } = manager

  if (!downloads || downloads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-sm">
      {collapsed ? (
        <Button
          onClick={() => setCollapsed(false)}
          className="w-full justify-between shadow-lg"
          variant="secondary"
        >
          <span>{pendingCount} downloading</span>
          <ChevronUp className="h-4 w-4" />
        </Button>
      ) : (
        <Card className="shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <span className="text-sm font-medium">
              {pendingCount > 0 ? `${pendingCount} downloading` : 'Downloads'}
            </span>
            <div className="flex items-center gap-1">
              {downloads.some(d => d.status === 'completed') && (
                <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs h-7">
                  Clear
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setCollapsed(true)} className="h-7 w-7 p-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {downloads.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
                {d.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : d.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <File className="h-4 w-4 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{d.filename}</p>
                  {d.status === 'downloading' && (
                    <Progress value={d.progress} className="h-1 mt-1" />
                  )}
                  {d.status === 'completed' && (
                    <p className="text-xs text-muted-foreground">Completed</p>
                  )}
                  {d.status === 'error' && (
                    <p className="text-xs text-destructive">Failed</p>
                  )}
                </div>
                {d.status !== 'downloading' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => updateDownload(d.id, { _remove: true })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export { useDownloadManager }
