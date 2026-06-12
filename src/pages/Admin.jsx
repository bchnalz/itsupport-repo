import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('files')
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [parentCategory, setParentCategory] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('staff')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadFiles()
    loadCategories()
    loadUsers()
  }, [])

  const loadFiles = async () => {
    const { data } = await supabase.from('files').select('*').order('created_at', { ascending: false })
    setFiles(data || [])
  }

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  const loadUsers = async () => {
    const { data, error } = await supabase.from('user_roles').select('*, user:user_id(email)')
    if (!error) setUsers(data || [])
  }

  const handleDeleteFile = async (file) => {
    if (!confirm(`Delete "${file.title}" from Drive and database?`)) return

    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.functions.invoke('drive-delete', {
      body: { fileId: file.drive_file_id, dbId: file.id }
    })
    if (error) {
      setMessage('Delete failed')
    } else {
      await supabase.from('files').delete().eq('id', file.id)
      loadFiles()
      setMessage('File deleted')
    }
  }

  const handleEditFile = async (file) => {
    const newTitle = prompt('New title:', file.title)
    if (!newTitle) return
    await supabase.from('files').update({ title: newTitle }).eq('id', file.id)
    loadFiles()
  }

  const handleCreateCategory = async () => {
    if (!newCategory) return
    const { error } = await supabase.from('categories').insert({
      name: newCategory,
      parent_id: parentCategory || null
    })
    if (!error) {
      setNewCategory('')
      setParentCategory('')
      loadCategories()
      setMessage('Category created')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete category? Files will become uncategorized.')) return
    await supabase.from('categories').delete().eq('id', id)
    loadCategories()
  }

  const handleCreateUser = async () => {
    setMessage('')
    if (!newUserEmail || !newUserPassword) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole })
    })
    if (res.ok) {
      setNewUserEmail('')
      setNewUserPassword('')
      loadUsers()
      setMessage('User created')
    } else {
      const err = await res.json()
      setMessage(err.error || 'Failed to create user')
    }
  }

  const handleDeactivateUser = async (userId) => {
    if (!confirm('Deactivate this user?')) return
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deactivate-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    })
    if (res.ok) {
      loadUsers()
      setMessage('User deactivated')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={() => setActiveTab('files')} style={{ marginRight: '0.5rem' }}>Files</button>
          <button onClick={() => setActiveTab('categories')} style={{ marginRight: '0.5rem' }}>Categories</button>
          <button onClick={() => setActiveTab('users')}>Users</button>
        </div>

        {message && (
          <p style={{ color: message.includes('failed') ? '#d33' : '#080', marginBottom: '1rem' }}>{message}</p>
        )}

        {activeTab === 'files' && (
          <table>
            <thead>
              <tr><th>Title</th><th>Drive ID</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id}>
                  <td>{f.title}</td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>{f.drive_file_id}</td>
                  <td>{new Date(f.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => handleEditFile(f)} style={{ marginRight: '0.25rem', fontSize: '12px' }}>Edit</button>
                    <button onClick={() => handleDeleteFile(f)} style={{ background: '#d33', fontSize: '12px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'categories' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ width: 'auto', display: 'inline', marginRight: '0.5rem' }}
              />
              <select
                value={parentCategory}
                onChange={(e) => setParentCategory(e.target.value)}
                style={{ width: 'auto', display: 'inline', marginRight: '0.5rem' }}
              >
                <option value="">No parent</option>
                {categories.filter(c => !c.parent_id).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button onClick={handleCreateCategory}>Create</button>
            </div>
            <table>
              <thead>
                <tr><th>Name</th><th>Parent</th><th></th></tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>{categories.find(c => c.id === cat.parent_id)?.name || '-'}</td>
                    <td>
                      <button onClick={() => handleDeleteCategory(cat.id)} style={{ background: '#d33', fontSize: '12px' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'users' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="email"
                placeholder="Email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                style={{ width: 'auto', display: 'inline', marginRight: '0.5rem' }}
              />
              <input
                type="password"
                placeholder="Password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                style={{ width: 'auto', display: 'inline', marginRight: '0.5rem' }}
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                style={{ width: 'auto', display: 'inline', marginRight: '0.5rem' }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleCreateUser}>Create User</button>
            </div>
            <table>
              <thead>
                <tr><th>Email</th><th>Role</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.user?.email || '-'}</td>
                    <td>{u.role}</td>
                    <td>
                      <button onClick={() => handleDeactivateUser(u.user_id)} style={{ background: '#d33', fontSize: '12px' }}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
