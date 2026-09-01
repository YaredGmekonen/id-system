import { useState } from 'react';
import { useTemplates, deleteTemplate } from '../../db/hooks';
import type { CardTemplate } from '../../db/database';
import Modal from '../shared/Modal';
import { AlertTriangle } from 'lucide-react';

interface TemplateListProps {
  selectedTemplateId?: number | null;
  activeTemplateId?: number | null;
  onSelectTemplate: (template: CardTemplate) => void;
  onNewTemplate: () => void;
}

export default function TemplateList({
  selectedTemplateId,
  activeTemplateId,
  onSelectTemplate,
  onNewTemplate,
}: TemplateListProps) {
  const templates = useTemplates();
  const currentId = activeTemplateId !== undefined ? activeTemplateId : selectedTemplateId;
  const [templateToDelete, setTemplateToDelete] = useState<CardTemplate | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
          Template Library
        </p>
        <button
          onClick={onNewTemplate}
          className="py-1 px-2 text-[11px] font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition-all"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <svg className="w-3.5 h-3.5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>New</span>
        </button>
      </div>

      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {templates.map(t => (
          <div
            key={t.id}
            onClick={() => onSelectTemplate(t)}
            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border ${
              currentId === t.id
                ? 'border-[#84a92c] font-bold shadow-xs'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: currentId === t.id ? 'rgba(132, 169, 44, 0.08)' : 'var(--bg-elevated)',
              borderColor: currentId === t.id ? '#84a92c' : 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Orientation indicator badge */}
            <div
              className={`w-6 h-4 rounded border flex items-center justify-center text-[8px] font-mono font-bold flex-shrink-0 ${
                t.orientation === 'vertical' ? 'h-6 w-4' : 'w-6 h-4'
              }`}
              style={{
                borderColor: currentId === t.id ? '#84a92c' : 'var(--border-primary)',
                color: currentId === t.id ? '#84a92c' : 'var(--text-muted)',
              }}
            >
              {t.orientation === 'vertical' ? 'V' : 'H'}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">{t.name}</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t.frontElements.length} front · {t.backElements.length} back
              </p>
            </div>

            {/* Delete */}
            <button
              onClick={e => {
                e.stopPropagation();
                setTemplateToDelete(t);
              }}
              className="p-1 rounded opacity-50 hover:opacity-100 hover:text-red-500 transition-colors cursor-pointer"
              title="Delete template"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <Modal
          isOpen={!!templateToDelete}
          onClose={() => setTemplateToDelete(null)}
          title="Delete Template"
          size="sm"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <p className="leading-relaxed">
                Are you sure you want to permanently delete custom template <strong className="text-white">"{templateToDelete.name}"</strong>?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (templateToDelete.id !== undefined) deleteTemplate(templateToDelete.id);
                  setTemplateToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
              >
                Delete Template
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
