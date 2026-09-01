import { useState, useMemo } from 'react';
import type { Person } from '../../db/database';

interface PeopleSelectorProps {
  people: Person[];
  selectedId: number | null;
  onSelectPerson: (id: number) => void;
  selectedIds: Set<number>;
  onTogglePerson: (id: number) => void;
  onToggleSelectAll: () => void;
}

export default function PeopleSelector({
  people,
  selectedId,
  onSelectPerson,
  selectedIds,
  onTogglePerson,
  onToggleSelectAll,
}: PeopleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPeople = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return people;
    return people.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.idNumber.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  }, [people, searchQuery]);

  const isAllSelected = people.length > 0 && selectedIds.size === people.length;

  return (
    <div className="flex flex-col h-full bg-paper-50 rounded-lg border border-paper-300 shadow-xs overflow-hidden font-body text-ink">
      
      {/* Header */}
      <div className="p-3 border-b border-paper-300 bg-paper-100/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
            Directory ({people.length})
          </span>
          <span className="text-[10px] font-mono font-bold text-teal bg-teal-50 px-2 py-0.5 rounded border border-teal/30">
            {selectedIds.size} Selected
          </span>
        </div>

        {/* Search */}
        <div className="mt-2 relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-paper-50 border border-paper-300 rounded text-ink focus:outline-none focus:border-teal placeholder:text-ink-muted"
          />
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between pt-2 px-0.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-ink font-semibold mb-0">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={onToggleSelectAll}
              className="w-4 h-4 rounded accent-teal border-paper-300 cursor-pointer"
            />
            <span>Select All</span>
          </label>
        </div>
      </div>

      {/* People List */}
      <div className="flex-1 overflow-y-auto divide-y divide-paper-300 p-1.5 space-y-1 max-h-[460px]">
        {filteredPeople.map(p => {
          const isSelected = selectedIds.has(p.id!);
          const isActive = (selectedId === p.id) || (!selectedId && p === people[0]);

          return (
            <div
              key={p.id}
              onClick={() => onSelectPerson(p.id!)}
              className={`flex items-center gap-2.5 p-2 rounded cursor-pointer transition-all ${
                isActive
                  ? 'bg-paper-200 border border-teal/40 shadow-2xs'
                  : 'hover:bg-paper-100 border border-transparent'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onClick={e => e.stopPropagation()}
                onChange={() => onTogglePerson(p.id!)}
                className="w-4 h-4 rounded accent-teal border-paper-300 cursor-pointer flex-shrink-0"
              />

              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-paper-200 border border-paper-300 flex items-center justify-center">
                {p.photoDataUrl ? (
                  <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-ink font-display">
                    {p.fullName.split(' ').map(n => n[0]).join('')}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink truncate leading-tight font-display">
                    {p.fullName}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono mt-0.5">
                  <span className="truncate">{p.role}</span>
                  <span className="text-teal font-bold">{p.idNumber}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
