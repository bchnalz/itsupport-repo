import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Shield, Tags, Users, X, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('staff')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [activeTab, setActiveTab] = useState('tags')

  useEffect(() => {
    loadTags()
    loadUsers()
  }, [])

  const showMsg = (msg, type = '') => {
    setMessage(msg); setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const loadTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name')
    setTags(data || [])
  }

  const loadUsers = async () => {
    const { data, error } = await supabase.from('user_roles').select('*').order('created_at')
    if (!error) setUsers(data || [])
  }

  const handleCreateTag = async () => {
    if (!newTag) return
    const name = newTag.toLowerCase().trim()
    const { error } = await supabase.from('tags').insert({ name })
    if (!error) { setNewTag(''); loadTags(); showMsg('Tag created', 'success') }
    else showMsg(error.message, 'error')
  }

  const handleDeleteTag = async (id) => {
    await supabase.from('tags').delete().eq('id', id)
    loadTags()
    showMsg('Tag deleted', 'success')
  }

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole })
    })
    if (res.ok) {
      setNewUserEmail('')
      setNewUserPassword('')
      loadUsers()
      showMsg('User created', 'success')
    } else {
      const err = await res.json()
      showMsg(err.error || 'Failed', 'error')
    }
  }

  const handleDeactivateUser = async (userId) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deactivate-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId })
    })
    if (res.ok) { loadUsers(); showMsg('User deactivated', 'success') }
    else showMsg('Failed to deactivate user', 'error')
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage tags and user accounts.</p>
      </div>

      {/* Toast notification */}
      <div className="relative h-0">
        {message && (
          <div
            className={`absolute top-0 left-0 right-0 z-10 animate-in slide-in-from-top-1 fade-in duration-200 ${
              messageType === 'error' ? 'text-destructive' : 'text-emerald-600'
            }`}
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm ${
              messageType === 'error'
                ? 'bg-destructive/5 border-destructive/20 text-destructive'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
            }`}>
              {messageType === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              {message}
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="tags" value={activeTab} onValueChange={setActiveTab} className="animate-in fade-in duration-300 delay-100">
        <TabsList>
          <TabsTrigger value="tags" className="transition-all duration-200 data-[state=active]:shadow-sm">
            <Tags className="mr-1.5 h-4 w-4" /> Tags
          </TabsTrigger>
          <TabsTrigger value="users" className="transition-all duration-200 data-[state=active]:shadow-sm">
            <Users className="mr-1.5 h-4 w-4" /> Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="animate-in fade-in slide-in-from-top-1 duration-200">
          <Card className="transition-all duration-200 hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                Tags
              </CardTitle>
              <CardDescription>Flat list of tags. Duplicates are auto-merged.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Tag name (e.g. driver, excel, 2025)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  className="flex-1 text-sm transition-all duration-200 focus-visible:ring-2"
                />
                <Button onClick={handleCreateTag} className="transition-all duration-200 active:scale-[0.97]">
                  <Plus className="mr-1.5 h-4 w-4" /> Create
                </Button>
              </div>

              {tags.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground animate-in fade-in duration-200">
                  <Tags className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No tags yet. Upload files to auto-generate.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs gap-1.5 pr-1 group transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-left-1"
                      style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive transition-all duration-150 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in slide-in-from-top-1 duration-200">
          <Card className="transition-all duration-200 hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                User Accounts
              </CardTitle>
              <CardDescription>Create and manage user accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border bg-muted/30 transition-all duration-200">
                <Input
                  type="email"
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="flex-1 text-sm transition-all duration-200 focus-visible:ring-2"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="flex-1 text-sm transition-all duration-200 focus-visible:ring-2"
                />
                <Select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full sm:w-28">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button onClick={handleCreateUser} className="transition-all duration-200 active:scale-[0.97]">
                  <Plus className="mr-1.5 h-4 w-4" /> Create
                </Button>
              </div>

              {users.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground animate-in fade-in duration-200">
                  <Users className="h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm">No users.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted/30">Email</TableHead>
                        <TableHead className="bg-muted/30">Role</TableHead>
                        <TableHead className="bg-muted/30 w-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u, i) => (
                        <TableRow
                          key={u.id}
                          className="transition-all duration-150 hover:bg-muted/50 animate-in fade-in"
                          style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                        >
                          <TableCell className="font-medium min-w-0 max-w-0">
                            <span className="truncate block">{u.email || u.user_id}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === 'admin' ? 'default' : 'secondary'}
                              className="transition-all duration-200"
                            >
                              <Shield className="mr-1 h-3 w-3" />
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateUser(u.user_id)}
                              className="h-9 w-9 p-0 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                              title="Deactivate user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
