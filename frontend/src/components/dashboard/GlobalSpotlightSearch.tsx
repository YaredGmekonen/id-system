import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Users,
  FolderKanban,
  PenTool,
  Printer,
  ArrowRight,
  X,
  Sparkles,
  Command,
} from 'lucide-react';
import type { Person, BatchFolder, CardTemplate, PrintJob } from '../../db/database';

interface GlobalSpotlightSearchProps {
  people: Person[];
  batchFolders: BatchFolder[];
  templates: CardTemplate[];
  printJobs: PrintJob[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onClose?: () => void;
}

export default function GlobalSpotlightSearch({
  people,
  batchFolders,
  templates,
  printJobs,
  searchTerm,
  onSearchChange,
  onClose,
}: GlobalSpotlightSearchProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = searchTerm.trim().toLowerCase();

  // Filter Matching Entities
  const matchingPeople = useMemo(() => {
    if (!query) return [];
    return people.filter(p => {
      const personName = p.fullName || (p as any).name || '';
      return (
        personName.toLowerCase().includes(query) ||
        (p.idNumber && p.idNumber.toLowerCase().includes(query)) ||
        (p.department && p.department.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.role && p.role.toLowerCase().includes(query))
      );
    }).slice(0, 5);
  }, [people, query]);

  const matchingFolders = useMemo(() => {
    if (!query) return [];
    return batchFolders.filter(f =>
      (f.name && f.name.toLowerCase().includes(query)) ||
      (f.collectorName && f.collectorName.toLowerCase().includes(query)) ||
      (f.status && f.status.toLowerCase().includes(query))
    ).slice(0, 4);
  }, [batchFolders, query]);

  const matchingTemplates = useMemo(() => {
    if (!query) return [];
    return templates.filter(t =>
      t.name && t.name.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [templates, query]);

  const matchingPrintJobs = useMemo(() => {
    if (!query) return [];
    return printJobs.filter(j =>
      (j.jobName && j.jobName.toLowerCase().includes(query)) ||
      (j.operatorName && j.operatorName.toLowerCase().includes(query))
    ).slice(0, 3);
  }, [printJobs, query]);

  const totalMatches = matchingPeople.length + matchingFolders.length + matchingTemplates.length + matchingPrintJobs.length;

  const handleSelectPerson = (person: Person) => {
    setIsOpen(false);
    onSearchChange('');
    navigate(`/studio?personId=${person.id}`);
  };

  const handleSelectFolder = (folder: BatchFolder) => {
    setIsOpen(false);
    onSearchChange('');
    navigate('/batches');
  };

  const handleSelectTemplate = (template: CardTemplate) => {
    setIsOpen(false);
    onSearchChange('');
    navigate(`/designer?templateId=${template.id}`);
  };

  const handleSelectPrintJob = () => {
    setIsOpen(false);
    onSearchChange('');
    navigate('/print');
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-lg w-full">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)] pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search records, batches, templates..."
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full pl-10 pr-16 py-2.5 rounded-xl border text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#84a92c] focus:ring-1 focus:ring-[#84a92c]/50 transition-all shadow-xs"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        />
        {searchTerm ? (
          <button
            onClick={() => {
              onSearchChange('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-3 top-2.5 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-0.5 absolute right-3 top-2.5 px-1.5 py-0.5 rounded border border-[var(--border-primary)] bg-[var(--bg-surface)] text-[10px] font-mono font-bold text-[var(--text-muted)]">
            <Command className="w-2.5 h-2.5" /> K
          </span>
        )}
      </div>

      {/* Spotlight Dropdown Results */}
      <AnimatePresence>
        {isOpen && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 max-h-[440px] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            {totalMatches === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-[var(--text-primary)]">No matching records found</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  No people, batches, or templates match "<strong className="text-[#84a92c]">{searchTerm}</strong>"
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {/* 1. PEOPLE / CARDHOLDERS */}
                {matchingPeople.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-[#84a92c]" />
                        Cardholders ({matchingPeople.length})
                      </span>
                      <span>Click to open in studio</span>
                    </div>
                    <div className="space-y-1">
                      {matchingPeople.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPerson(p)}
                          className="p-2.5 rounded-xl border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.photoDataUrl ? (
                              <img src={p.photoDataUrl} alt={p.fullName} className="w-7 h-7 rounded-full object-cover border border-[#84a92c]/40" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center font-bold text-[10px]">
                                {(p.fullName || 'ID').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{p.fullName}</p>
                              <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                                {p.idNumber || 'No ID'} • {p.department || 'General'} • {p.status}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. BATCH FOLDERS */}
                {matchingFolders.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <FolderKanban className="w-3 h-3 text-blue-400" />
                        Batch Folders ({matchingFolders.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {matchingFolders.map(f => (
                        <div
                          key={f.id}
                          onClick={() => handleSelectFolder(f)}
                          className="p-2.5 rounded-xl border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                              <FolderKanban className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{f.name}</p>
                              <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                {f.totalRecords || 0} records • {f.collectorName || 'Registrar'} • {f.status}
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400">
                            {f.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. TEMPLATES */}
                {matchingTemplates.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <PenTool className="w-3 h-3 text-purple-400" />
                        Card Templates ({matchingTemplates.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {matchingTemplates.map(t => (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTemplate(t)}
                          className="p-2.5 rounded-xl border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                              <PenTool className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{t.name}</p>
                              <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                {t.orientation || 'Landscape'} • {t.elements?.length || (t as any).frontElements?.length || 'Vector'} elements
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-purple-400">Open Designer →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. PRINT JOBS */}
                {matchingPrintJobs.length > 0 && (
                  <div>
                    <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      <span className="flex items-center gap-1.5">
                        <Printer className="w-3 h-3 text-amber-400" />
                        Print Runs ({matchingPrintJobs.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {matchingPrintJobs.map(j => (
                        <div
                          key={j.id}
                          onClick={handleSelectPrintJob}
                          className="p-2.5 rounded-xl border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                              <Printer className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{j.jobName}</p>
                              <p className="text-[10px] font-mono text-[var(--text-muted)]">
                                {j.totalCards} cards • {j.paperSize} • {j.operatorName}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-400">View in Print Studio →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
