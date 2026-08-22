import { useState } from 'react';
import type { UserAccount } from '../../db/database';
import { addUserAccount, updateUserAccount, deleteUserAccount } from '../../db/hooks';

interface UserManagementPanelProps {
  users: UserAccount[];
}

export default function UserManagementPanel({ users }: UserManagementPanelProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'designer' | 'collector' | 'guest'>('collector');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    await addUserAccount({
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'Active',
      lastLogin: 'Never',
      avatar: newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      createdAt: new Date(),
    });

    setNewName('');
    setNewEmail('');
    setShowInviteModal(false);
  };

  const handleRoleChange = async (userId: number, role: 'admin' | 'designer' | 'collector' | 'guest') => {
    await updateUserAccount(userId, { role });
  };

  const handleToggleStatus = async (user: UserAccount) => {
    await updateUserAccount(user.id!, {
      status: user.status === 'Active' ? 'Suspended' : 'Active',
    });
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('Delete this user account?')) {
      await deleteUserAccount(id);
    }
  };

  return (
    <div className="space-y-6 font-body text-ink">
      {/* Top Banner */}
      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-ink font-display tracking-tight">
              Enterprise Access & User Management
            </h2>
            <span className="text-[11px] font-mono font-bold text-teal bg-teal-50 px-2.5 py-0.5 rounded border border-teal/30">
              {users.length} Registered Accounts
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-normal font-body">
            Assign RBAC permission levels across Admin, Designer, Field Registrar, and Guest Sandbox.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <span>+</span>
          <span>Invite New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-paper-100 border-b border-paper-300 text-ink-muted font-mono uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4 font-bold">User</th>
              <th className="py-3 px-4 font-bold">Role</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold">Last Login</th>
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-300">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-paper-100 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-navy text-paper flex items-center justify-center font-bold text-[11px] font-display">
                      {u.avatar || u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-ink font-display">{u.name}</p>
                      <p className="text-[11px] text-ink-muted font-mono">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id!, e.target.value as any)}
                    className="text-xs bg-paper-100 border border-paper-300 rounded px-2 py-1 font-semibold text-ink focus:outline-none focus:border-teal"
                  >
                    <option value="admin">Admin</option>
                    <option value="designer">Designer</option>
                    <option value="collector">Collector</option>
                    <option value="guest">Guest</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    u.status === 'Active' ? 'bg-teal-50 text-teal border border-teal/30' : 'bg-stamp-50 text-stamp border border-stamp/30'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-ink-muted font-mono text-[11px]">
                  {u.lastLogin || 'Recent'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="btn-secondary py-1 px-2 text-[11px]"
                    >
                      {u.status === 'Active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id!)}
                      className="btn-danger py-1 px-2 text-[11px]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-paper-50 rounded-lg p-6 text-ink shadow-2xl border border-paper-300 space-y-4">
            <div className="flex items-center justify-between border-b border-paper-300 pb-3">
              <h3 className="text-base font-bold text-ink font-display">Invite New Platform User</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-ink-muted hover:text-ink p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@idplatform.internal"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Permission Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal font-medium"
                >
                  <option value="admin">Admin (Full Control)</option>
                  <option value="designer">Designer (Canvas & Templates)</option>
                  <option value="collector">Field Registrar (Camera & Data)</option>
                  <option value="guest">Guest (Read-Only Viewer)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-paper-300">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary py-1.5 text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 text-xs font-bold">
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
