import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import { useUserAccounts } from '../db/hooks';
import type { UserAccount } from '../db/database';
import {
  syncUsersWithBackend,
  createUniversalUser,
  updateUniversalUser,
  toggleUniversalUserStatus,
  deleteUniversalUser,
  checkAccountExistence,
} from '../services/dbSync';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Check,
  Trash2,
  X,
  AlertTriangle,
  Lock,
  Edit3,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

export default function UsersPage() {
  const dbUsers = useUserAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Quick Account Lookup & Verifier Bar State
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<{
    checked: boolean;
    exists: boolean;
    user?: UserAccount;
  } | null>(null);

  // Create modal
  const [isCreatingModal, setIsCreatingModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newRole, setNewRole] = useState<'admin' | 'designer' | 'collector'>('collector');
  const [createAccountCheck, setCreateAccountCheck] = useState<{
    exists: boolean;
    user?: UserAccount;
  } | null>(null);

  // Edit modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'designer' | 'collector'>('collector');
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended'>('Active');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editEmailConflict, setEditEmailConflict] = useState<UserAccount | null>(null);

  // Delete modal
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: number; name: string; email?: string } | null>(null);

  // View credentials modal
  const [viewCredUser, setViewCredUser] = useState<UserAccount | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync with central backend on load and listen to broadcast events from other browsers
  useEffect(() => {
    syncUsersWithBackend();

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('idplatform_sync') : null;
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === 'DB_CHANGED') {
          syncUsersWithBackend();
        }
      };
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Real-time check when admin enters new user email
  useEffect(() => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setCreateAccountCheck(null);
      return;
    }

    const match = dbUsers.find(u => (u.email || '').toLowerCase().trim() === trimmed);
    if (match) {
      setCreateAccountCheck({ exists: true, user: match });
    } else {
      setCreateAccountCheck({ exists: false });
    }
  }, [newEmail, dbUsers]);

  // Real-time check when editing email
  useEffect(() => {
    if (!editingUser) {
      setEditEmailConflict(null);
      return;
    }
    const trimmed = editEmail.trim().toLowerCase();
    if (!trimmed || trimmed === (editingUser.email || '').toLowerCase().trim()) {
      setEditEmailConflict(null);
      return;
    }
    const conflict = dbUsers.find(
      u => u.id !== editingUser.id && (u.email || '').toLowerCase().trim() === trimmed
    );
    setEditEmailConflict(conflict || null);
  }, [editEmail, editingUser, dbUsers]);

  // Quick lookup handler
  const handleQuickLookup = (emailToCheck: string) => {
    const trimmed = emailToCheck.trim().toLowerCase();
    if (!trimmed) {
      setLookupResult(null);
      return;
    }
    const match = dbUsers.find(u => (u.email || '').toLowerCase().trim() === trimmed);
    setLookupResult({
      checked: true,
      exists: !!match,
      user: match,
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncUsersWithBackend();
      showToast('Database synchronized across all browsers.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ===== CREATE =====
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const trimmedEmail = newEmail.trim().toLowerCase();

    // Check if account already exists
    const existing = dbUsers.find(u => (u.email || '').toLowerCase().trim() === trimmedEmail);
    if (existing) {
      showToast(`Account with email "${trimmedEmail}" already exists for ${existing.name}.`);
      return;
    }

    const finalPassword = newPassword.trim() || 'password123';

    try {
      await createUniversalUser({
        name: newName.trim(),
        email: trimmedEmail,
        password: finalPassword,
        role: newRole,
      });

      showToast(`Account for "${newName}" (${newRole}) registered & authorized for Google SSO & Password sign-in.`);
      setNewName('');
      setNewEmail('');
      setNewPassword('password123');
      setCreateAccountCheck(null);
      setIsCreatingModal(false);
    } catch {
      showToast('Error creating user.');
    }
  };

  // ===== EDIT (open modal) =====
  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password || 'password123');
    setEditRole((user.role as any) || 'collector');
    setEditStatus(user.status === 'Active' ? 'Active' : 'Suspended');
    setShowEditPassword(false);
    setEditEmailConflict(null);
  };

  // ===== UPDATE =====
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.id || !editName.trim() || !editEmail.trim()) return;

    if (editEmailConflict) {
      showToast(`Cannot use email "${editEmail}" — already assigned to ${editEmailConflict.name}.`);
      return;
    }

    try {
      await updateUniversalUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        password: editPassword.trim() || 'password123',
        role: editRole,
        status: editStatus,
      });

      showToast(`User "${editName}" updated successfully.`);
      setEditingUser(null);
    } catch {
      showToast('Error updating user.');
    }
  };

  // ===== TOGGLE STATUS =====
  const handleToggleActive = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    await toggleUniversalUserStatus(id, nextStatus as any);
    showToast(`User status updated to ${nextStatus}.`);
  };

  // ===== DELETE =====
  const handleConfirmDelete = async () => {
    if (!deleteConfirmUser) return;
    await deleteUniversalUser(deleteConfirmUser.id, deleteConfirmUser.email);
    showToast(`User "${deleteConfirmUser.name}" permanently removed.`);
    setDeleteConfirmUser(null);
  };

  const uniqueUsers = React.useMemo(() => {
    const map = new Map<string, UserAccount>();
    for (const u of dbUsers) {
      const email = (u.email || '').toLowerCase().trim();
      if (!map.has(email)) {
        map.set(email, u);
      }
    }
    return Array.from(map.values());
  }, [dbUsers]);

  const filteredUsers = uniqueUsers.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Page Header */}
        <header
          className="h-16 px-6 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[var(--text-primary)]">Enterprise Users & Role Management</h1>
              <p className="text-xs text-[var(--text-muted)]">Create, read, update, and delete user accounts with full CRUD control.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Sync database with backend"
              className="p-2 rounded-xl border text-[var(--text-secondary)] hover:text-white hover:border-[#84a92c] transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#84a92c]' : ''}`} />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <button
              onClick={() => setIsCreatingModal(true)}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>
        </header>

        {/* Toast */}
        {toastMsg && (
          <div className="mx-6 md:mx-8 mt-3 p-3 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Quick Account Authorization & Google SSO Verifier Bar */}
        <div
          className="mx-6 md:mx-8 mt-4 p-3.5 rounded-2xl border bg-[var(--bg-elevated)]"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#4285F4]/10 text-[#4285F4] border border-[#4285F4]/20 flex items-center justify-center font-bold flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Account Existence & Google SSO Verifier
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  Check if a user or Google email is registered and authorized to access the system
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  placeholder="Type email to check authorization…"
                  value={lookupEmail}
                  onChange={e => {
                    setLookupEmail(e.target.value);
                    handleQuickLookup(e.target.value);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                />
                {lookupEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setLookupEmail('');
                      setLookupResult(null);
                    }}
                    className="absolute right-2.5 top-2 text-[10px] text-[var(--text-muted)] hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Lookup Result Indicator */}
          {lookupResult?.checked && (
            <div className="mt-2.5 pt-2.5 border-t border-[var(--border-primary)] flex items-center justify-between text-xs animate-fade-in flex-wrap gap-2">
              {lookupResult.exists && lookupResult.user ? (
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Account Authorized: <strong>{lookupResult.user.name}</strong> ({lookupResult.user.role}) — Status: {lookupResult.user.status}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      "{lookupEmail}" is <strong>NOT registered</strong>. This user cannot sign in with Google or password.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmail(lookupEmail);
                      setNewName(lookupEmail.split('@')[0]);
                      setIsCreatingModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#84a92c]/20 hover:bg-[#84a92c]/30 text-[#84a92c] text-[10px] font-bold cursor-pointer border border-[#84a92c]/40"
                  >
                    + Provision Account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search & Filter */}
        <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search user by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#84a92c]"
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
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="px-6 md:px-8 pb-8 flex-1 overflow-x-auto">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <table className="w-full text-left text-xs">
              <thead
                className="border-b text-[10px] font-mono uppercase text-[var(--text-muted)]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Password</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                {filteredUsers.map(user => {
                  const avatar = user.avatar || user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const isActive = user.status === 'Active';
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#84a92c]/20 border border-[#84a92c]/40 text-[#84a92c] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {avatar}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{user.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
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
                        <button
                          onClick={() => setViewCredUser(user)}
                          className="text-[10px] font-mono text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          isActive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                        {user.lastLogin || 'Recent'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openEditModal(user)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-blue-500/30 text-blue-400 hover:bg-blue-950/20 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </motion.button>

                          {/* Suspend / Activate */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleToggleActive(user.id || 0, user.status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              isActive
                                ? 'border-rose-500/30 text-rose-400 hover:bg-rose-950/20'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/20'
                            }`}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </motion.button>

                          {/* Delete */}
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setDeleteConfirmUser({ id: user.id || 0, name: user.name, email: user.email })}
                            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== MODAL: Create New User ===== */}
        <AnimatePresence>
          {isCreatingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setIsCreatingModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Provision New User Account</h3>
                  <button
                    onClick={() => setIsCreatingModal(false)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dawit Tsige"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Email Address (Google SSO / Login)</label>
                    <input
                      type="email"
                      placeholder="e.g. dawit@gmail.com or dawit@siliconlabs.internal"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />

                    {/* Real-time Existence Status Check */}
                    {createAccountCheck?.exists && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Account already registered:</span>
                            <div className="text-[10px] text-slate-300">
                              {createAccountCheck.user?.name} ({createAccountCheck.user?.role}) — Status: {createAccountCheck.user?.status}
                            </div>
                          </div>
                        </div>
                        {createAccountCheck.user && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingModal(false);
                              openEditModal(createAccountCheck.user!);
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold cursor-pointer"
                          >
                            Edit User
                          </button>
                        )}
                      </div>
                    )}

                    {createAccountCheck && !createAccountCheck.exists && (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] flex items-center gap-1.5 animate-fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Email available — will be authorized for Google SSO & credentials</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Login Password</label>
                    <input
                      type="text"
                      placeholder="Default: password123"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />
                    <p className="text-[9px] text-[var(--text-muted)] mt-1 font-mono">
                      User can log in with Google SSO or this password (defaults: <strong>password123</strong> / <strong>admin123</strong>).
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">System Role</label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <option value="collector">Data Collector / Field Registrar</option>
                      <option value="designer">Credential Designer</option>
                      <option value="admin">System Administrator</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingModal(false)}
                      className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={!!createAccountCheck?.exists}
                      className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {createAccountCheck?.exists ? 'Email Already Exists' : 'Authorize & Create Account'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ===== MODAL: Edit User ===== */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setEditingUser(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Edit User Account</h3>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Email Address (Login Username)</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />

                    {/* Conflict warning in edit */}
                    {editEmailConflict && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Email already registered to {editEmailConflict.name} ({editEmailConflict.role})</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Login Password</label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-xl border text-xs text-[var(--text-primary)]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">System Role</label>
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        <option value="collector">Data Collector</option>
                        <option value="designer">Designer</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Account Status</label>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer"
                    >
                      Save Changes
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ===== MODAL: View Credentials ===== */}
        <AnimatePresence>
          {viewCredUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setViewCredUser(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Login Credentials</h3>
                  <button
                    onClick={() => setViewCredUser(null)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Name</label>
                    <span className="font-bold text-xs text-[var(--text-primary)]">{viewCredUser.name}</span>
                  </div>

                  <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Email / Username</label>
                    <span className="font-bold text-xs text-[#84a92c] font-mono">{viewCredUser.email}</span>
                  </div>

                  <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Password</label>
                    <span className="font-bold text-xs text-[#84a92c] font-mono">{viewCredUser.password || 'password123'}</span>
                  </div>

                  <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                    <label className="text-[10px] font-mono text-[var(--text-muted)] uppercase block mb-1">Role</label>
                    <span className="font-bold text-xs text-[var(--text-primary)] uppercase">{viewCredUser.role}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">
                    This user can log in using the email and password above. Universal passwords <strong>password123</strong> and <strong>admin123</strong> are also accepted.
                  </p>
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setViewCredUser(null)}
                    className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ===== MODAL: Delete Confirmation ===== */}
        <AnimatePresence>
          {deleteConfirmUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setDeleteConfirmUser(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 text-center z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Remove User Account?</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Are you sure you want to permanently remove <strong>{deleteConfirmUser.name}</strong>? This user will no longer be able to log in.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirmUser(null)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    style={{ borderColor: 'var(--border-primary)' }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleConfirmDelete}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Confirm Delete
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
