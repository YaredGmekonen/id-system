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
  AlertTriangle,
} from 'lucide-react';

interface PeopleListProps {
  refreshTrigger?: number;
  activeFolderId?: number;
  activeFolderName?: string;
}

export default function PeopleList({ activeFolderId, activeFolderName }: PeopleListProps = {}) {
  const people = usePeople();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
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
    return people.filter(p => {
      const matchFolder = activeFolderId ? p.batchFolderId === activeFolderId : true;
      const matchSearch =
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.department.toLowerCase().includes(search.toLowerCase()) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(search.toLowerCase()));

      return matchFolder && matchSearch;
    });
  }, [people, search, activeFolderId]);

  const handleDelete = (person: Person) => {
    setPersonToDelete(person);
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
    <div className="space-y-4 font-sans text-sm" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div>
          <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Registered Directory
          </h3>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border bg-[#84a92c]/10 text-[#84a92c] border-[#84a92c]/30">
          {people.length} Records
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter registered directory..."
          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-700 bg-[#18191b] text-white focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
        />
      </div>

      {/* List */}
      <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pr-1">
        {filteredPeople.map(person => (
          <div
            key={person.id}
            className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-800 bg-[#18191b] hover:border-slate-700 transition-all shadow-xs"
          >
            {/* Avatar */}
            <div
              className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700 flex items-center justify-center font-bold text-xs bg-slate-900"
            >
              {person.photoDataUrl ? (
                <img src={person.photoDataUrl} alt={person.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 font-bold text-sm">
                  {person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm truncate text-white">{person.fullName}</p>
                <span className="text-[10px] font-mono font-bold text-[#84a92c] bg-[#84a92c]/10 px-1.5 py-0.5 rounded border border-[#84a92c]/30">
                  {person.idNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {person.role || 'Member'} • {person.schoolName || person.department || 'General'}
              </p>
            </div>

            {/* Action buttons (Inspect, Edit, Delete) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => navigate(`/studio?personId=${person.id}`)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-[#84a92c] text-slate-200 transition-colors cursor-pointer"
                title="Open in ID Studio"
              >
                Inspect
              </button>

              <button
                onClick={() => handleOpenEdit(person)}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:text-[#84a92c] text-slate-400 transition-colors cursor-pointer"
                title="Edit Record"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDelete(person)}
                className="p-2 rounded-lg border border-slate-700 bg-slate-800/80 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors cursor-pointer"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
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

      {/* Delete Confirmation Modal */}
      {personToDelete && (
        <Modal
          isOpen={!!personToDelete}
          onClose={() => setPersonToDelete(null)}
          title="Delete Personnel Record"
          size="sm"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <p className="leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-white">{personToDelete.fullName}</strong> ({personToDelete.idNumber}) from the directory?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (personToDelete.id !== undefined) await deletePerson(personToDelete.id);
                  setPersonToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
