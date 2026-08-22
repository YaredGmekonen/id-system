import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Person } from '../../db/database';
import { updatePerson, deletePerson } from '../../db/hooks';

interface OrderQueueTableProps {
  people: Person[];
  selectedWorkerId?: number | null;
  onClearWorkerFilter?: () => void;
}

export default function OrderQueueTable({
  people,
  selectedWorkerId,
  onClearWorkerFilter,
}: OrderQueueTableProps) {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<'All' | 'Unfulfilled' | 'Processing' | 'Fulfilled' | 'Refunded' | 'On Hold'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter logic
  const filtered = people.filter(p => {
    // Worker filter
    if (selectedWorkerId && p.workerId !== selectedWorkerId) return false;

    // Status tab filter
    if (filterTab !== 'All') {
      const matchFulfillment = p.fulfillmentStatus?.toLowerCase() === filterTab.toLowerCase();
      const matchStatus = p.status?.toLowerCase() === filterTab.toLowerCase();
      if (!matchFulfillment && !matchStatus) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.fullName.toLowerCase().includes(q);
      const matchEmail = p.email.toLowerCase().includes(q);
      const matchRole = p.role.toLowerCase().includes(q);
      const matchId = p.idNumber.toLowerCase().includes(q);
      const matchCollector = p.collectedBy?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole && !matchId && !matchCollector) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedPeople = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getFulfillmentPill = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'fulfilled':
      case 'printed':
        return <span className="pill-fulfilled">Fulfilled</span>;
      case 'unfulfilled':
      case 'pending':
        return <span className="pill-unfulfilled">Unfulfilled</span>;
      case 'processing':
        return <span className="pill-processing">Processing</span>;
      case 'refunded':
        return <span className="pill-refunded">Refunded</span>;
      case 'on hold':
        return <span className="pill-onhold">On Hold</span>;
      default:
        return <span className="pill-unfulfilled">Unfulfilled</span>;
    }
  };

  const getPaymentPill = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <span className="pill-paid">Paid</span>;
      case 'refunded':
        return <span className="pill-refunded">Refunded</span>;
      case 'pending':
      default:
        return <span className="pill-processing">Pending</span>;
    }
  };

  const handleStatusChange = async (id: number, newFulfillment: 'Fulfilled' | 'Unfulfilled' | 'Processing' | 'Refunded' | 'On Hold') => {
    await updatePerson(id, {
      fulfillmentStatus: newFulfillment,
      status: newFulfillment === 'Fulfilled' ? 'Printed' : newFulfillment === 'Processing' ? 'Processing' : 'Pending',
    });
    setActiveMenuId(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this record from the database?')) {
      await deletePerson(id);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-5 sm:p-6 space-y-4 font-body text-ink">
      
      {/* Top Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-ink font-display tracking-tight">
            Personnel Directory & Issuance Records
          </h2>
          {selectedWorkerId && (
            <div className="flex items-center gap-1.5 bg-teal-50 text-teal px-2.5 py-0.5 rounded text-xs font-semibold border border-teal/30">
              <span>Filtered by Field Station</span>
              <button
                onClick={onClearWorkerFilter}
                className="hover:text-teal font-bold ml-1"
                title="Clear filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <svg
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search personnel, ID, department..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink placeholder:text-ink-muted focus:bg-paper-50 focus:outline-none focus:border-teal"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-paper-100 p-1 rounded-md border border-paper-300 overflow-x-auto text-xs">
            {(['All', 'Unfulfilled', 'Processing', 'Fulfilled', 'Refunded', 'On Hold'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setFilterTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded font-semibold text-xs transition-all whitespace-nowrap font-display ${
                  filterTab === tab
                    ? 'bg-navy text-paper shadow-2xs'
                    : 'text-ink-muted hover:text-ink hover:bg-paper-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-paper-300 text-ink-muted font-mono uppercase text-[10px] tracking-wider">
              <th className="pb-3 px-3">Personnel</th>
              <th className="pb-3 px-3">ID & Role</th>
              <th className="pb-3 px-3">Department</th>
              <th className="pb-3 px-3">Payment</th>
              <th className="pb-3 px-3">Fulfillment</th>
              <th className="pb-3 px-3">Station / Channel</th>
              <th className="pb-3 px-3">Enrolled</th>
              <th className="pb-3 px-3 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-paper-300">
            {paginatedPeople.map(p => (
              <tr key={p.id} className="hover:bg-paper-100 transition-colors group">
                
                {/* Name + Avatar + Email */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5 min-w-[180px]">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-paper-200 border border-paper-300 flex-shrink-0">
                      {p.photoDataUrl ? (
                        <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-navy bg-paper-300 font-display">
                          {p.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink font-display truncate leading-tight">
                        {p.fullName}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate font-mono">
                        {p.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* ID & Role */}
                <td className="py-3 px-3">
                  <span className="font-mono text-teal font-bold block">{p.idNumber}</span>
                  <span className="text-[11px] text-ink-muted">{p.role}</span>
                </td>

                {/* Department */}
                <td className="py-3 px-3 font-medium text-ink">
                  {p.department}
                </td>

                {/* Payment */}
                <td className="py-3 px-3">
                  {getPaymentPill(p.paymentStatus)}
                </td>

                {/* Fulfillment */}
                <td className="py-3 px-3">
                  {getFulfillmentPill(p.fulfillmentStatus)}
                </td>

                {/* Channel / Station */}
                <td className="py-3 px-3 text-ink-muted text-[11px]">
                  <span className="font-semibold text-ink block">{p.channel || 'Field Terminal'}</span>
                  <span>{p.collectedBy || 'Auto'}</span>
                </td>

                {/* Date */}
                <td className="py-3 px-3 font-mono text-[11px] text-ink-muted">
                  {p.joinedDate || new Date(p.createdAt || '').toISOString().split('T')[0]}
                </td>

                {/* Action Menu */}
                <td className="py-3 px-3 text-right relative">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => navigate(`/studio?personId=${p.id}`)}
                      className="btn-secondary py-1 px-2.5 text-[11px] font-bold cursor-pointer"
                    >
                      Inspect Card
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id!)}
                        className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-200"
                      >
                        ⋮
                      </button>

                      {activeMenuId === p.id && (
                        <div className="absolute right-0 top-8 bg-paper-50 border border-paper-300 rounded-md shadow-xl p-1.5 w-44 z-50 text-left space-y-1">
                          <p className="text-[9px] font-bold text-ink-muted px-2 uppercase font-mono">
                            Update Status
                          </p>
                          <button
                            onClick={() => handleStatusChange(p.id!, 'Fulfilled')}
                            className="w-full text-left px-2 py-1 hover:bg-paper-200 rounded text-[11px] text-teal font-semibold"
                          >
                            ✓ Mark Fulfilled
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id!, 'Processing')}
                            className="w-full text-left px-2 py-1 hover:bg-paper-200 rounded text-[11px] text-navy font-semibold"
                          >
                            ⚙ Set Processing
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.id!, 'On Hold')}
                            className="w-full text-left px-2 py-1 hover:bg-paper-200 rounded text-[11px] text-ochre font-semibold"
                          >
                            ⏸ Place On Hold
                          </button>
                          <div className="border-t border-paper-300 my-1 pt-1">
                            <button
                              onClick={() => handleDelete(p.id!)}
                              className="w-full text-left px-2 py-1 hover:bg-stamp-50 rounded text-[11px] text-stamp font-semibold"
                            >
                              ✕ Delete Record
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-paper-300 text-xs text-ink-muted">
        <div>
          Showing {paginatedPeople.length} of {filtered.length} records
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-2 font-mono text-ink font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}
