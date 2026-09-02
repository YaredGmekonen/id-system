import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart2, Plus, PenTool, Menu } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = location.pathname;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-1 pointer-events-none">
      <div
        className="pointer-events-auto mx-auto max-w-md h-16 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-center justify-around px-3 transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-primary)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* 1. Home / Overview */}
        <button
          onClick={() => navigate('/overview')}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all cursor-pointer ${
            activePath === '/overview' ? 'text-[#10b981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        {/* 2. Batches / Progress */}
        <button
          onClick={() => navigate('/batches')}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all cursor-pointer ${
            activePath === '/batches' ? 'text-[#10b981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Progress</span>
        </button>

        {/* 3. Center Glowing Floating Action Button (Quick Intake) */}
        <button
          onClick={() => navigate('/collector')}
          className="w-13 h-13 -mt-6 rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#9fe870] text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2"
          style={{ borderColor: 'var(--bg-surface)' }}
          title="New Enrollment Intake"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>

        {/* 4. Studio / Design */}
        <button
          onClick={() => navigate('/designer')}
          className={`flex flex-col items-center justify-center gap-1 w-12 py-1 transition-all cursor-pointer ${
            activePath === '/designer' || activePath === '/studio' ? 'text-[#10b981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PenTool className="w-5 h-5" />
          <span className="text-[10px] font-bold">Design</span>
        </button>

        {/* 5. Menu / 4-Main Drawer Trigger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))}
          className="flex flex-col items-center justify-center gap-1 w-12 py-1 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
      </div>
    </div>
  );
}
