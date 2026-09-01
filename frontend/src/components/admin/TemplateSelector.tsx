import { useTemplates } from '../../db/hooks';
import type { CardTemplate } from '../../db/database';

interface TemplateSelectorProps {
  selectedTemplateId: number | null;
  onSelect: (template: CardTemplate) => void;
}

export default function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps) {
  const templates = useTemplates();

  if (templates.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        <p className="text-sm">No templates available</p>
        <p className="text-xs mt-1">Create templates in the Designer view first</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">Select Template</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map(t => (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            className={`p-4 rounded-xl text-left transition-all ${
              selectedTemplateId === t.id
                ? 'bg-brand-600/20 border-2 border-brand-500 shadow-glow-brand'
                : 'glass hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            {/* Mini card preview */}
            <div className="w-full aspect-[1.6] rounded-lg bg-surface-800 mb-3 flex items-center justify-center overflow-hidden border border-surface-700"
                 style={{ backgroundColor: t.backgroundColor }}>
              <div className="text-xs text-surface-400 flex flex-col items-center gap-1">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
            </div>

            <p className="font-medium text-white text-sm truncate">{t.name}</p>
            <p className="text-2xs text-surface-500 mt-0.5">
              {t.frontElements.length} elements · {t.backElements.length > 0 ? 'double-sided' : 'single-sided'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
