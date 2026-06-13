import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Shield, Tags, Users, X } from 'lucide-react'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('staff')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    loadTags()
    loadUsers()
  }, [])

  const showMsg = (msg, type = '') => { setMessage(msg); setMessageType(type); setTimeout(() => setMessage(''), 4000) }

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage tags and user accounts.</p>
      </div>

      {message && (
        <p className={`text-sm ${messageType === 'error' ? 'text-destructive' : 'text-emerald-600'}`}>
          {message}
        </p>
      )}

      <Tabs defaultValue="tags">
        <TabsList>
          <TabsTrigger value="tags"><Tags className="mr-1 h-4 w-4" /> Tags</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1 h-4 w-4" /> Users</TabsTrigger>
        </TabsList>

        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tags</CardTitle>
              <CardDescription>Flat list of tags. Duplicates are auto-merged.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Tag name (e.g. driver, excel, 2025)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  className="flex-1 text-sm"
                />
                <Button onClick={handleCreateTag}>
                  <Plus className="mr-1 h-4 w-4" /> Create
                </Button>
              </div>
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No tags yet. Upload files to auto-generate.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs gap-1 pr-1">
                      {tag.name}
                      <button onClick={() => handleDeleteTag(tag.id)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Accounts</CardTitle>
              <CardDescription>Create and manage user accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full sm:w-28">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button onClick={handleCreateUser}>
                  <Plus className="mr-1 h-4 w-4" /> Create
                </Button>
              </div>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No users.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-0"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium min-w-0 max-w-0"><span className="truncate block">{u.email || u.user_id}</span></TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                              <Shield className="mr-1 h-3 w-3" />
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(u.user_id)} className="h-9 w-9 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
