import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeople, deletePerson, updatePerson } from '../../db/hooks';
import type { Person } from '../../db/database';
import Modal from '../shared/Modal';

export default function PeopleList() {
  const people = usePeople();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBlood, setEditBlood] = useState('O+');

  const filteredPeople = useMemo(() => {
    return people.filter(p =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.idNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [people, search]);

  const handleDelete = async (person: Person) => {
    if (person.id !== undefined && confirm(`Remove ${person.fullName} (${person.idNumber}) from directory?`)) {
      await deletePerson(person.id);
    }
  };

  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setEditName(person.fullName);
    setEditId(person.idNumber);
    setEditDept(person.department);
    setEditRole(person.role);
    setEditPhone(person.phone || '');
    setEditEmail(person.email || '');
    setEditBlood(person.bloodGroup || 'O+');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson || editingPerson.id === undefined) return;

    setIsSaving(true);
    try {
      await updatePerson(editingPerson.id, {
        fullName: editName.trim(),
        idNumber: editId.trim(),
        department: editDept.trim(),
        role: editRole.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        bloodGroup: editBlood,
      });
      setEditingPerson(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (people.length === 0) {
    return (
      <div className="text-center py-12 space-y-2 font-sans" style={{ color: 'var(--text-muted)' }}>
        <span className="text-3xl block">📋</span>
        <p className="text-sm font-bold font-sans" style={{ color: 'var(--text-primary)' }}>No personnel registered yet</p>
        <p className="text-xs">Use the registration form on the left or spreadsheet import to add records.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans text-xs" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Registered Directory
          </h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Real-time local encrypted database</p>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border bg-[#84a92c]/10 text-[#84a92c] border-[#84a92c]/30">
          {people.length} Records
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter registered directory..."
          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* List */}
      <div className="space-y-1.5 max-h-[58vh] overflow-y-auto pr-1">
        {filteredPeople.map(person => (
          <div
            key={person.id}
            className="flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border flex items-center justify-center font-bold text-xs"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              {person.photoDataUrl ? (
                <img src={person.photoDataUrl} alt={person.fullName} className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: 'var(--text-primary)' }}>
                  {person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{person.fullName}</p>
                <span className="text-[9px] font-mono font-bold text-[#84a92c] bg-[#84a92c]/10 px-1 py-0.2 rounded border border-[#84a92c]/20">
                  {person.idNumber}
                </span>
              </div>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {person.role || 'Member'} • {person.department || 'General'}
              </p>
            </div>

            {/* Action buttons (Inspect, Edit, Delete) */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => navigate(`/studio?personId=${person.id}`)}
                className="px-2 py-1 text-[10px] font-bold rounded-lg border hover:border-[#84a92c] transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
                title="Open in ID Studio"
              >
                Inspect
              </button>

              <button
                onClick={() => handleOpenEdit(person)}
                className="p-1 rounded-lg border hover:text-[#84a92c] transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
                title="Edit Record"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>

              <button
                onClick={() => handleDelete(person)}
                className="p-1 rounded-lg border text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                }}
                title="Delete Record"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Record Modal (CRUD Update) */}
      {editingPerson && (
        <Modal
          isOpen={!!editingPerson}
          onClose={() => setEditingPerson(null)}
          title={`Edit Record: ${editingPerson.fullName}`}
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Full Legal Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>ID Number</label>
                <input
                  type="text"
                  required
                  value={editId}
                  onChange={e => setEditId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border font-mono font-bold focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Department</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={e => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Role / Title</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:opacity-80"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary py-2 px-5 text-xs font-bold shadow-xs cursor-pointer"
              >
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
