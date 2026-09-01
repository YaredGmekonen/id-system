import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Shield, Check, AlertTriangle, UserCheck, UserX } from 'lucide-react';
import apiClient from '../../api/client';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'collector' | 'guest';
  status: 'Active' | 'Suspended' | 'Pending';
  avatar: string;
  lastLogin?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'designer' | 'collector'>('collector');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      if (res.data && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch {
      // Default fallback
      setUsers([
        { id: '1', name: 'Abenezer Kaleab', email: 'admin@siliconlabs.internal', role: 'admin', status: 'Active', avatar: 'AK', lastLogin: 'Just now' },
        { id: '2', name: 'Selamawit Bekele', email: 'designer@siliconlabs.internal', role: 'designer', status: 'Active', avatar: 'SB', lastLogin: '10m ago' },
        { id: '3', name: 'Hanna Mengistu', email: 'registrar@siliconlabs.internal', role: 'collector', status: 'Active', avatar: 'HM', lastLogin: '2h ago' },
        { id: '4', name: 'Yared Mekonen', email: 'yared@siliconlabs.internal', role: 'admin', status: 'Active', avatar: 'YM', lastLogin: 'Yesterday' },
        { id: '5', name: 'Tewodros Kassahun', email: 'ted@siliconlabs.internal', role: 'collector', status: 'Active', avatar: 'TK', lastLogin: '3d ago' },
      ]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    try {
      await apiClient.post('/users', {
        name: newName,
        email: newEmail,
        role: newRole,
      });
      setToastMsg(`User "${newName}" created successfully.`);
    } catch {
      const avatar = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      setUsers(prev => [
        { id: String(Date.now()), name: newName, email: newEmail, role: newRole, status: 'Active', avatar, lastLogin: 'Never' },
        ...prev,
      ]);
      setToastMsg(`User "${newName}" created.`);
    }

    setNewName('');
    setNewEmail('');
    setIsCreating(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    apiClient.patch(`/users/${id}/status`, { status: nextStatus }).catch(() => {});
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: nextStatus as any } : u)));
    setToastMsg(`User status changed to ${nextStatus}.`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div
        className="relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        {/* Header */}
        <div className="p-4 md:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Enterprise Users & Role Management</h2>
              <p className="text-xs text-slate-400">Control system access, provision accounts, and manage role permissions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="px-6 py-2 bg-[#84a92c]/20 border-b border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Controls Bar */}
        <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'admin', 'designer', 'collector'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer uppercase ${
                  roleFilter === r
                    ? 'bg-[#84a92c] text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Create User Sub-Form */}
        {isCreating && (
          <form onSubmit={handleCreateUser} className="p-4 border-b bg-slate-900/60 flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border-primary)' }}>
            <input
              type="text"
              placeholder="Full Name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-100 flex-1 min-w-[140px]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-100 flex-1 min-w-[160px]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-100"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <option value="admin">Administrator</option>
              <option value="designer">Credential Designer</option>
              <option value="collector">Data Collector</option>
            </select>
            <button type="submit" className="btn-primary py-1.5 px-3 text-xs font-bold cursor-pointer">
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-400 hover:text-white cursor-pointer"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* User Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Last Login</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-[#84a92c] flex items-center justify-center font-bold text-[10px]">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                      user.role === 'admin'
                        ? 'bg-[#84a92c]/20 text-[#84a92c] border border-[#84a92c]/40'
                        : user.role === 'designer'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      user.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                    {user.lastLogin || 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        user.status === 'Active'
                          ? 'border-rose-500/30 text-rose-400 hover:bg-rose-950/40'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                    >
                      {user.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
