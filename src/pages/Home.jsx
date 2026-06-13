import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Search, Download, File, Calendar, User, X } from 'lucide-react'

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

  const fetchFiles = async (searchTerm, categoryId) => {
    setLoading(true)
    let query = supabase
      .from('files')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query
    if (error) console.error('Search error:', error)
    setFiles(data || [])
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchFiles(search, categoryFilter), 200)
    return () => clearTimeout(timer)
  }, [search, categoryFilter])

  const handleDownload = async (file) => {
    const { data } = await supabase.functions.invoke('drive-download', {
      body: { fileId: file.drive_file_id }
    })
    if (data?.url) window.open(data.url, '_blank')
  }

  const clearSearch = () => {
    setSearch('')
    setCategoryFilter('')
  }

  const formatSize = (bytes) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
    return `${bytes.toFixed(1)} ${units[i]}`
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and download repository files.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files by title or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
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
              className="w-full sm:w-48"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
        ) : files.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground">
            {search || categoryFilter ? 'No files match your search.' : 'No files found.'}
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Uploaded by</TableHead>
                <TableHead className="w-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="truncate max-w-[200px] block">{file.title}</span>
                        {file.file_name && file.file_name !== file.title && (
                          <span className="text-xs text-muted-foreground">{file.file_name}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {file.categories?.name || '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {formatSize(file.file_size)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {file.uploaded_by_email || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
