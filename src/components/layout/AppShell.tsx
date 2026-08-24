import React, { useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import SimulatePanel from '../admin/SimulatePanel';
import { useAuth } from '../../context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPrint?: () => void;
  onDownload?: () => void;
  onNewRecord?: () => void;
  isGenerating?: boolean;
  activeTab?: string;
}

export default function AppShell({
  children,
  title = 'Overview',
  subtitle,
  onPrint,
  onDownload,
  onNewRecord,
  isGenerating,
}: AppShellProps) {
  const [showSimModal, setShowSimModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isGuest } = useAuth();

  return (
    <div className="min-h-screen w-full bg-paper text-ink flex flex-row overflow-hidden font-body select-none">
      
      {/* Left Navigation Sidebar */}
      <div className={`lg:block ${mobileMenuOpen ? 'block fixed inset-0 z-40' : 'hidden lg:flex'}`}>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-navy/50 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div className="relative z-50 h-full">
          <Sidebar
            onSimulateClick={() => setShowSimModal(true)}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        </div>
      </div>

      {/* Main Operational Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen bg-paper overflow-hidden">
        
        {/* Guest Evaluation Notification Banner */}
        {isGuest && (
          <div className="bg-navy text-paper px-4 py-1.5 text-xs font-medium flex items-center justify-between border-b border-navy-light">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal" />
              <span><strong>Evaluation Sandbox Mode:</strong> Full interactive ID Card Studio preview & batch testing active.</span>
            </div>
            <span className="text-[10px] font-mono text-teal bg-navy-dark border border-navy-light px-2 py-0.5 rounded">DEMO+ ACTIVE</span>
          </div>
        )}

        {/* Top Header */}
        <Header
          title={title}
          subtitle={subtitle}
          onPrint={onPrint}
          onDownload={onDownload}
          onNewRecord={onNewRecord}
          isGenerating={isGenerating}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-paper">
          {children}
        </main>
      </div>

      {/* Real Batch Generation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowSimModal(false)}
                className="w-8 h-8 rounded-full bg-paper-50 text-ink hover:bg-paper-200 flex items-center justify-center text-sm font-bold shadow-md cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SimulatePanel />
          </div>
        </div>
      )}

    </div>
  );
}
