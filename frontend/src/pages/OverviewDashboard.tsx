import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import { useAuth } from '../context/AuthContext';
import { usePeople, useWorkers, useBatchFolders, useTemplates, usePrintJobs } from '../db/hooks';
import {
  Search,
  Bell,
  Mail,
  ArrowUpRight,
  Plus,
  Play,
  Pause,
  Square,
  Sparkles,
  Users,
  Printer,
  IdCard,
  Layers,
  FolderKanban,
  CheckCircle2,
  GraduationCap,
  Building2,
  Landmark,
  Car,
  ShieldCheck,
  Activity,
  Zap,
  TrendingUp,
  Workflow,
  Cpu,
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function OverviewDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const dbPeople = usePeople();
  const dbWorkers = useWorkers();
  const dbBatchFolders = useBatchFolders();
  const dbTemplates = useTemplates();
  const dbPrintJobs = usePrintJobs();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabMode, setActiveTabMode] = useState<'bars' | 'grape-nodes'>('bars');
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(2);

  // Live Shift Timer State
  const [timerSeconds, setTimerSeconds] = useState(5048); // 01:24:08 initial
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Live metrics
  const totalIssued = dbPeople.length ? dbPeople.length : 1284;
  const printedCount = dbPeople.filter(p => p.status === 'Printed' || p.status === 'Active').length || 892;
  const inQueueCount = dbPeople.filter(p => p.status === 'Processing').length || 342;
  const pendingCount = dbPeople.filter(p => p.status === 'Pending').length || 50;

  // Weekly analytics data
  const weeklyAnalytics = [
    { day: 'S', height: 42, isPattern: true, count: 88 },
    { day: 'M', height: 60, isPattern: false, isLightGreen: true, count: 140 },
    { day: 'T', height: 78, isPattern: false, isPrimary: true, tooltip: '74% Peak', count: 182 },
    { day: 'W', height: 94, isPattern: false, isDarkGreen: true, count: 215 },
    { day: 'T', height: 48, isPattern: true, count: 96 },
    { day: 'F', height: 58, isPattern: true, count: 124 },
    { day: 'S', height: 70, isPattern: true, count: 160 },
  ];

  // Active batches list (Strictly Lucide Icons, No Emojis)
  const activeBatches = [
    {
      id: 1,
      title: 'AAU 2026 Student Batch',
      due: 'Nov 28, 2024',
      badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
      icon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 2,
      title: 'Ministry of Health Credentials',
      due: 'Nov 30, 2024',
      badgeBg: 'bg-teal-500/15 border-teal-500/30 text-teal-400',
      icon: <Building2 className="w-4 h-4 text-teal-400" />,
    },
    {
      id: 3,
      title: 'Commercial Bank Security Badges',
      due: 'Dec 02, 2024',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      icon: <Landmark className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 4,
      title: 'Bole Sub-City Driver Licenses',
      due: 'Dec 05, 2024',
      badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      icon: <Car className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 5,
      title: 'Federal Security & Access Cards',
      due: 'Dec 08, 2024',
      badgeBg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
      icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
    },
  ];

  // Team collaborators
  const teamMembers = [
    {
      name: 'Alexandra Deff',
      role: 'HQ Studio Lead Registrar',
      status: 'Completed',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Edwin Adenike',
      role: 'Field Biometric Intake Hub',
      status: 'In Progress',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'Isaac Oluwatemilorun',
      role: 'Thermal Card Print Station',
      status: 'Pending',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    },
    {
      name: 'David Oshodi',
      role: 'Quality & RFID Verification',
      status: 'In Progress',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=face',
    },
  ];

  // Grape / Network Nodes data for organic graph animation
  const grapeNodes = [
    { id: 'node-1', label: 'Field Intake', x: 18, y: 50, color: '#84a92c', count: '1,284 IDs', active: true },
    { id: 'node-2', label: 'Biometrics', x: 42, y: 28, color: '#10b981', count: '1,190 Clean', active: true },
    { id: 'node-3', label: 'Studio Layout', x: 42, y: 72, color: '#06b6d4', count: '342 In Queue', active: true },
    { id: 'node-4', label: 'Thermal Print', x: 68, y: 38, color: '#3b82f6', count: '892 Ready', active: true },
    { id: 'node-5', label: 'Enclave Vault', x: 88, y: 50, color: '#9fe870', count: 'Dispatched', active: true },
  ];

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pb-20 lg:pb-8">
        {/* ========================================================================= */}
        {/* TOP BAR: Clean Search Pill + Icons + Profile Capsule */}
        {/* ========================================================================= */}
        <header
          className="px-4 sm:px-8 py-3.5 border-b flex-shrink-0 flex items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          {/* Search Pill */}
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search credential, batch, staff..."
              className="w-full pl-10 pr-12 py-2 rounded-full text-sm font-medium border focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border text-slate-400"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              ⌘F
            </span>
          </div>

          {/* Right Action Icons + Profile Capsule */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/audit')}
              className="p-2 rounded-full border hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Audit Logs"
            >
              <Mail className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/audit')}
              className="p-2 rounded-full border hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white relative"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="w-2 h-2 rounded-full bg-[#84a92c] absolute top-1.5 right-1.5"
              />
            </button>

            {/* Profile Capsule */}
            <div
              onClick={() => navigate('/users')}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border cursor-pointer hover:bg-white/5 transition-all shadow-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="w-7 h-7 rounded-full bg-[#84a92c] text-slate-950 font-bold text-xs flex items-center justify-center overflow-hidden">
                {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'YM'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                  {currentUser?.name || 'Yared Mekonen'}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  {currentUser?.email || 'yared@idstudio.gov.et'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* DASHBOARD TITLE + ACTIONS HEADER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-8 pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Dashboard
              </h1>
              <p className="text-sm font-medium mt-1 text-slate-400">
                Plan, prioritize, and manage credential identities with ease.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/designer')}
                className="py-2.5 px-5 rounded-full text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all bg-[#14532d] hover:bg-[#166534] text-white active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Template</span>
              </button>

              <button
                onClick={() => navigate('/collector')}
                className="py-2.5 px-5 rounded-full text-xs font-bold border transition-all cursor-pointer hover:bg-white/5 active:scale-95"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <span>Import Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BENTO GRID WORKSPACE WITH MODERN MOTION & GRAPE NODE EFFECTS */}
        {/* ========================================================================= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-4 sm:px-8 py-5 space-y-6"
        >
          {/* 1. TOP 4 BENTO SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Solid Accent Green Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl bg-[#14532d] text-white flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[140px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-100">
                  Total Credentials Issued
                </span>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {totalIssued.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-200">
                <span className="px-1.5 py-0.5 rounded-md bg-white/15 text-white font-bold text-[10px]">
                  5↑
                </span>
                <span>Increased from last month</span>
              </div>
            </motion.div>

            {/* Card 2: Printed & Dispatched */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border flex flex-col justify-between shadow-xs min-h-[140px]"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Printed & Dispatched
                </span>
                <div
                  className="w-7 h-7 rounded-full border flex items-center justify-center"
                  style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {printedCount.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span className="px-1.5 py-0.5 rounded-md bg-[#84a92c]/15 text-[#84a92c] font-bold text-[10px]">
                  6↑
                </span>
                <span>Increased from last month</span>
              </div>
            </motion.div>

            {/* Card 3: Active Print Queue */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border flex flex-col justify-between shadow-xs min-h-[140px]"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Active Print Queue
                </span>
                <div
                  className="w-7 h-7 rounded-full border flex items-center justify-center"
                  style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {inQueueCount}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 font-bold text-[10px]">
                  2↑
                </span>
                <span>Active Print Stations</span>
              </div>
            </motion.div>

            {/* Card 4: Pending Verification */}
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="p-5 rounded-3xl border flex flex-col justify-between shadow-xs min-h-[140px]"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Pending Verification
                </span>
                <div
                  className="w-7 h-7 rounded-full border flex items-center justify-center"
                  style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="my-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {pendingCount}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span>Under Intake Review</span>
              </div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MIDDLE BENTO ROW: Analytics / Grape Node Graph + Dispatch + Batches */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card A: Intake Analytics & Grape Graph Node Visualizer (5 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-5 p-6 rounded-3xl border shadow-xs flex flex-col justify-between relative overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Intake Analytics
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#84a92c] animate-pulse" />
                </div>

                {/* View Switcher: Graph Bars vs Grape Network Nodes */}
                <div
                  className="flex items-center p-0.5 rounded-full border"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <button
                    onClick={() => setActiveTabMode('bars')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      activeTabMode === 'bars'
                        ? 'bg-[#14532d] text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bars
                  </button>
                  <button
                    onClick={() => setActiveTabMode('grape-nodes')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTabMode === 'grape-nodes'
                        ? 'bg-[#14532d] text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Workflow className="w-3 h-3" />
                    <span>Pipeline</span>
                  </button>
                </div>
              </div>

              {/* View 1: Animated Fingerprint Pill Bar Chart */}
              {activeTabMode === 'bars' ? (
                <div className="flex items-end justify-between gap-2.5 h-44 px-2 pt-6 pb-2">
                  {weeklyAnalytics.map((item, idx) => {
                    const isSelected = selectedDayIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDayIdx(idx)}
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end relative group cursor-pointer"
                      >
                        {/* Tooltip on active / peak bar */}
                        {(item.tooltip || isSelected) && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -top-7 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md border border-slate-200 dark:border-slate-700 pointer-events-none z-10 whitespace-nowrap"
                          >
                            {isSelected ? `${item.count} IDs` : item.tooltip}
                          </motion.div>
                        )}

                        {/* Bar Pillar with Spring Animation */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${item.height}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: idx * 0.05 }}
                          className={`w-full rounded-full transition-all group-hover:scale-105 ${
                            isSelected
                              ? 'bg-[#4ade80] shadow-md shadow-[#4ade80]/20 ring-2 ring-[#4ade80]/40'
                              : item.isDarkGreen
                              ? 'bg-[#14532d]'
                              : item.isLightGreen
                              ? 'bg-[#84a92c]'
                              : 'bg-slate-700/30 border border-dashed border-slate-500/40'
                          }`}
                        />

                        {/* Day label */}
                        <span className={`text-xs font-semibold font-mono ${isSelected ? 'text-[#84a92c] font-bold' : 'text-slate-400'}`}>
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* View 2: Grape / Network Node Flow Animation */
                <div className="relative h-44 w-full rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800/60 bg-slate-950/40">
                  <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Connecting lines between grape cluster nodes */}
                    <motion.path
                      d="M 18 50 Q 30 28 42 28 T 68 38 T 88 50"
                      fill="none"
                      stroke="#84a92c"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                    />
                    <motion.path
                      d="M 18 50 Q 30 72 42 72 T 68 38 T 88 50"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse' }}
                    />
                  </svg>

                  {/* Organic Grape Nodes */}
                  {grapeNodes.map((node) => (
                    <motion.div
                      key={node.id}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 3, delay: Math.random() }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
                    >
                      {/* Outer pulsing ring */}
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center border transition-all shadow-md group-hover:scale-125"
                        style={{ backgroundColor: `${node.color}20`, borderColor: node.color }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color }} />
                      </span>
                      <span className="text-[9px] font-bold font-mono mt-1 text-slate-300 whitespace-nowrap bg-slate-900/80 px-1.5 py-0.2 rounded border border-slate-700">
                        {node.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Card B: Station Dispatch / Reminders (3 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-3 p-6 rounded-3xl border shadow-xs flex flex-col justify-between"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Station Dispatch
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Activity className="w-3 h-3" />
                    <span>Live</span>
                  </span>
                </div>

                <h3 className="text-base font-extrabold mt-2 leading-snug" style={{ color: 'var(--text-primary)' }}>
                  Thermal Station #1 — Bole Hub
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Shift: 08:30 AM - 05:00 PM
                </p>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => navigate('/paper-print')}
                  className="w-full py-3 px-4 rounded-full bg-[#14532d] hover:bg-[#166534] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Start Print Queue</span>
                </button>
              </div>
            </motion.div>

            {/* Card C: Active Batches List (4 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-4 p-6 rounded-3xl border shadow-xs flex flex-col justify-between"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Active Batches
                </h3>
                <button
                  onClick={() => navigate('/collector')}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full border hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                >
                  + New
                </button>
              </div>

              <div className="space-y-3">
                {activeBatches.map(batch => (
                  <div
                    key={batch.id}
                    onClick={() => navigate('/collector')}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${batch.badgeBg}`}>
                      {batch.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate group-hover:text-[#84a92c] transition-colors" style={{ color: 'var(--text-primary)' }}>
                        {batch.title}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Due: {batch.due}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* 3. BOTTOM BENTO ROW: Team + Donut Progress + Time Tracker */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card D: Team Collaboration & Registrars (5 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-5 p-6 rounded-3xl border shadow-xs"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Intake Team & Registrars
                </h3>
                <button
                  onClick={() => navigate('/staff-tracking')}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full border hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                >
                  + Add Member
                </button>
              </div>

              <div className="space-y-3.5">
                {teamMembers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {member.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${
                        member.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : member.status === 'In Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Card E: Issuance Progress Semi-Circle Gauge (3 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-3 p-6 rounded-3xl border shadow-xs flex flex-col justify-between items-center text-center"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="w-full flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Issuance Progress
                </h3>
              </div>

              {/* Semi-Circle Arc Meter with Smooth SVG Animation */}
              <div className="relative w-44 h-28 flex items-center justify-center my-2">
                <svg viewBox="0 0 100 55" className="w-full h-full overflow-visible">
                  {/* Background Arc */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="rgba(100, 116, 139, 0.25)"
                    strokeWidth="14"
                    strokeLinecap="round"
                  />
                  {/* Completed Green Arc */}
                  <motion.path
                    d="M 10 50 A 40 40 0 0 1 70 20"
                    fill="none"
                    stroke="#14532d"
                    strokeWidth="14"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                  {/* Active Highlight Arc */}
                  <motion.path
                    d="M 10 50 A 40 40 0 0 1 50 10"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="14"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                  />
                </svg>

                <div className="absolute bottom-1 text-center">
                  <span className="text-2xl sm:text-3xl font-extrabold block" style={{ color: 'var(--text-primary)' }}>
                    68%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Target Met
                  </span>
                </div>
              </div>

              {/* Legend with Clean Circle Pills */}
              <div className="flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-400 pt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#14532d]" />
                  <span>Completed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
                  <span>In Progress</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span>Pending</span>
                </span>
              </div>
            </motion.div>

            {/* Card F: Production Shift Time Tracker (Dark Forest Green Wave - 4 Cols) */}
            <motion.div
              variants={itemVariants}
              className="lg:col-span-4 p-6 rounded-3xl bg-[#0d3b1e] text-white flex flex-col justify-between relative overflow-hidden shadow-lg min-h-[220px]"
            >
              {/* Subtle background abstract waves */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <svg viewBox="0 0 200 200" className="w-full h-full object-cover">
                  <path d="M0 80 Q 50 120 100 80 T 200 80 L 200 200 L 0 200 Z" fill="none" stroke="#4ade80" strokeWidth="6" />
                  <path d="M0 110 Q 50 150 100 110 T 200 110 L 200 200 L 0 200 Z" fill="none" stroke="#4ade80" strokeWidth="6" />
                  <path d="M0 140 Q 50 180 100 140 T 200 140 L 200 200 L 0 200 Z" fill="none" stroke="#4ade80" strokeWidth="6" />
                </svg>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-200">
                  Shift Time Tracker
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3 text-emerald-300" />
                  <span>Station Active</span>
                </span>
              </div>

              {/* Big Digital Timer */}
              <div className="relative z-10 my-4">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-wider font-mono text-white">
                  {formatTimer(timerSeconds)}
                </span>
              </div>

              {/* Pause / Stop Controls */}
              <div className="relative z-10 flex items-center gap-3">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center hover:bg-emerald-100 transition-all cursor-pointer shadow-md active:scale-95"
                  title={isTimerRunning ? 'Pause Shift' : 'Resume Shift'}
                >
                  {isTimerRunning ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
                </button>

                <button
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="w-10 h-10 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer shadow-md active:scale-95"
                  title="Stop / Reset Shift"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
