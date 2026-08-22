import { useTemplates, deleteTemplate } from '../../db/hooks';
import type { CardTemplate } from '../../db/database';

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
              backgroundColor: currentId === t.id ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)',
              borderColor: currentId === t.id ? '#84a92c' : 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Mini preview */}
            <div
              className="w-10 h-7 rounded-md flex items-center justify-center text-[10px] flex-shrink-0 border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-primary)',
                color: '#84a92c',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
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
                if (t.id !== undefined && confirm(`Delete template "${t.name}"?`)) deleteTemplate(t.id);
              }}
              className="p-1 rounded opacity-50 hover:opacity-100 hover:text-red-500 transition-colors"
              title="Delete template"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
