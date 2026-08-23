import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeople, deletePerson, updatePerson } from '../../db/hooks';
import type { Person } from '../../db/database';
import Modal from '../shared/Modal';
import {
  Search,
  Edit3,
  Trash2,
  FileText,
  Eye,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';

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
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      (p.schoolName && p.schoolName.toLowerCase().includes(search.toLowerCase()))
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
        <FileText className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
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
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" />
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
                {person.role || 'Member'} • {person.schoolName || person.department || 'General'}
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
                className="p-1.5 rounded-lg border hover:text-[#84a92c] transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
                title="Edit Record"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDelete(person)}
                className="p-1.5 rounded-lg border text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                }}
                title="Delete Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Department / Class</label>
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
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Blood Group</label>
                <select
                  value={editBlood}
                  onChange={e => setEditBlood(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
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
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:opacity-80 cursor-pointer"
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
                className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{isSaving ? 'Saving…' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
