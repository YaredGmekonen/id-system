import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePeople, useBatchFolders, usePrintJobs, useTemplates } from '../db/hooks';
import {
  Search,
  Bell,
  Sun,
  Moon,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ShoppingBag,
  BarChart3,
  Users,
  Tag,
  CreditCard,
  Printer,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Menu,
} from 'lucide-react';

export default function OverviewDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  const dbPeople = usePeople();
  const dbFolders = useBatchFolders();
  const dbPrintJobs = usePrintJobs();
  const dbTemplates = useTemplates();

  const [timeRange, setTimeRange] = useState<'year' | 'month' | 'today'>('year');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Metric Calculations from Database
  const totalIssued = dbPeople.length > 0 ? dbPeople.length : 1284;
  const totalOrders = dbPrintJobs.length > 0 ? dbPrintJobs.length : 1000;
  const totalFolders = dbFolders.length > 0 ? dbFolders.length : 24;
  const totalPrinted = dbPeople.filter(p => p.status === 'Printed' || p.status === 'Active').length || 3000;

  // Monthly Activity Data for Dual-Bar Chart
  const monthlyData = [
    { month: 'Jan', intake: 28, printed: 42, label: 'January' },
    { month: 'Feb', intake: 36, printed: 18, label: 'February' },
    { month: 'Mar', intake: 24, printed: 32, label: 'March' },
    { month: 'Apr', intake: 14, printed: 10, label: 'April' },
    { month: 'May', intake: 26, printed: 40, label: 'May' },
    { month: 'Jun', intake: 34, printed: 18, label: 'June' },
  ];

  // Category Breakdown for Pie Chart
  const categories = [
    { name: 'Students', count: 2487, percent: 55, change: '+1.9%', isPositive: true, color: '#062e1b' },
    { name: 'Staff & Faculty', count: 1828, percent: 30, change: '+2.9%', isPositive: true, color: '#10b981' },
    { name: 'Corporate / Visitors', count: 1463, percent: 15, change: '-2.09%', isPositive: false, color: '#84a92c' },
  ];

  // Regional Growth Data
  const regions = [
    { name: 'Addis Ababa HQ', percent: 87, flag: '🇪🇹' },
    { name: 'Oromia Campus', percent: 64, flag: '🏛️' },
    { name: 'Amhara Division', percent: 42, flag: '🏢' },
    { name: 'Sidama Branch', percent: 28, flag: '🏫' },
  ];

  // Formatted current date string (e.g. Friday, October 12th 2025)
  const currentDateFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      {/* 4-Main Dropdown Modern Sidebar */}
      <Sidebar />

      {/* Main Scrollable Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TOP HEADER: Report Title & Actions (Exact Image Wireframe)     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <header
          className="px-6 sm:px-10 py-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          {/* Left: Title & Live Date */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-sidebar'))}
              className="md:hidden p-2 rounded-2xl border hover:opacity-80 transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-[#10b981]" />
            </button>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Production Overview
              </h1>
              <p className="text-xs font-semibold mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Calendar className="w-3.5 h-3.5 text-[#10b981]" />
                <span>{currentDateFormatted}</span>
              </p>
            </div>
          </div>

          {/* Right: Search + Notifications + Theme Toggle + User Avatar Pill */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Pill */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search report..."
                className="w-48 pl-9 pr-4 py-2 rounded-2xl border text-xs font-semibold focus:outline-none focus:border-[#10b981] transition-all"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Notification Bell */}
            <button
              className="p-2.5 rounded-2xl border hover:opacity-80 transition-all relative cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-[#10b981] absolute top-2 right-2 ring-2 ring-[var(--bg-elevated)]" />
            </button>

            {/* Dark / White Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl border hover:opacity-80 transition-all cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* User Profile Pill */}
            <div
              className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-2xl border shadow-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#062e1b] to-[#10b981] flex items-center justify-center text-white font-black text-xs shadow-xs">
                {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'AK'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-extrabold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {currentUser?.name || 'Abenezer Kaleab'}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {currentUser?.role === 'admin' ? 'Super Administrator' : 'Platform Officer'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD BODY (Exact 2-Column Grid Matching Provided Image)   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 p-6 sm:p-10 space-y-6 max-w-[1600px] mx-auto w-full">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ──────────────────────────────────────────────────────── */}
            {/* LEFT COLUMN: 4 KPI Cards + Customer Habits Bar Chart      */}
            {/* ──────────────────────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* TOP 4 METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* CARD 1: Hero Accent Green Card (Sales / Total Issued) */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-3xl bg-[#062e1b] text-white shadow-xl shadow-emerald-950/20 border border-[#10b981]/30 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                      <CreditCard className="w-5 h-5 text-[#9fe870]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#10b981] text-slate-950 font-black text-xs font-mono">
                      +20.9%
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold text-emerald-200/80 uppercase font-mono tracking-wider">
                      Total Credentials Issued
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                        ${(totalIssued * 482).toLocaleString()}
                      </h2>
                    </div>
                    <p className="text-[11px] text-emerald-300/70 mt-1 font-semibold">
                      {totalIssued.toLocaleString()} IDs vs Last Month
                    </p>
                  </div>
                </motion.div>

                {/* CARD 2: Total Orders / Print Jobs */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      <BarChart3 className="w-5 h-5 text-[#10b981]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] font-black text-xs font-mono border border-[#10b981]/30">
                      +10.9%
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Total Print Orders
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                      {totalOrders.toLocaleString()}
                    </h2>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
                      Orders vs Last Month
                    </p>
                  </div>
                </motion.div>

                {/* CARD 3: Personnel Intake (Total Visitors) */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 font-black text-xs font-mono border border-rose-500/30">
                      -10.2%
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Personnel Intake Volume
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                      2003.67
                    </h2>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
                      Intakes vs Last Month
                    </p>
                  </div>
                </motion.div>

                {/* CARD 4: Dispatched / Sold Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-3xl border shadow-xs flex flex-col justify-between transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl border flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      <Tag className="w-5 h-5 text-[#10b981]" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] font-black text-xs font-mono border border-[#10b981]/30">
                      +20.9%
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Total Cards Dispatched
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                      {totalPrinted.toLocaleString()}
                    </h2>
                    <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>
                      Fulfillment vs Last Month
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* DUAL-BAR CHART: Production & Intake Activity (Customer Habits) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="p-6 sm:p-8 rounded-3xl border shadow-xs transition-all relative overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                {/* Header & Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Production Activity
                    </h3>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Track intake registrations and printed credentials
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" />
                        <span>Intake</span>
                      </span>
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#062e1b] dark:bg-[#062e1b] inline-block ring-1 ring-[#10b981]/40" />
                        <span>Printed</span>
                      </span>
                    </div>

                    {/* Filter Dropdown */}
                    <div className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer hover:border-[#10b981]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                    >
                      <span>This year</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Vertical Bar Chart Container */}
                <div className="h-64 sm:h-72 w-full flex items-end justify-between pt-6 px-2 relative">
                  
                  {/* Grid Guidelines (40K, 30K, 20K, 10K, 0K) */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                    {['40K', '30K', '20K', '10K', '0K'].map((gridLabel, i) => (
                      <div key={i} className="flex items-center gap-3 w-full">
                        <span className="text-[10px] font-mono font-bold w-6 text-right" style={{ color: 'var(--text-muted)' }}>
                          {gridLabel}
                        </span>
                        <div className="flex-1 border-b border-dashed" style={{ borderColor: 'var(--border-primary)', opacity: 0.6 }} />
                      </div>
                    ))}
                  </div>

                  {/* Bars Rendered Across Months */}
                  <div className="flex-1 flex items-end justify-around pl-8 z-10">
                    {monthlyData.map((item, idx) => {
                      const isHovered = hoveredMonth === idx;
                      const maxVal = 45;
                      const intakeH = Math.round((item.intake / maxVal) * 180);
                      const printedH = Math.round((item.printed / maxVal) * 180);

                      return (
                        <div
                          key={item.month}
                          className="flex flex-col items-center group relative cursor-pointer"
                          onMouseEnter={() => setHoveredMonth(idx)}
                          onMouseLeave={() => setHoveredMonth(null)}
                        >
                          {/* Tooltip on Hover */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.9 }}
                                animate={{ opacity: 1, y: -8, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.9 }}
                                className="absolute -top-14 px-3 py-1.5 rounded-xl bg-slate-950 text-white font-mono text-[11px] shadow-2xl border border-slate-700 z-30 whitespace-nowrap"
                              >
                                <span className="font-bold text-[#9fe870]">{item.label}:</span> {item.intake}k Intake • {item.printed}k Printed
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Dual Bars */}
                          <div className="flex items-end gap-2 px-1">
                            {/* Bar 1: Intake (Emerald Green) */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: intakeH }}
                              transition={{ duration: 0.5, delay: idx * 0.05 }}
                              className="w-4 sm:w-5.5 rounded-full bg-[#10b981] transition-transform duration-200 group-hover:scale-y-105"
                              style={{
                                boxShadow: isHovered ? '0 0 16px rgba(16, 185, 129, 0.5)' : undefined,
                              }}
                            />
                            {/* Bar 2: Printed (Deep Forest Green) */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: printedH }}
                              transition={{ duration: 0.5, delay: idx * 0.05 + 0.05 }}
                              className="w-4 sm:w-5.5 rounded-full bg-[#062e1b] border border-[#10b981]/40 transition-transform duration-200 group-hover:scale-y-105"
                              style={{
                                boxShadow: isHovered ? '0 0 16px rgba(6, 46, 27, 0.8)' : undefined,
                              }}
                            />
                          </div>

                          {/* Month Label */}
                          <span
                            className={`text-xs font-bold mt-3 transition-colors ${
                              isHovered ? 'text-[#10b981]' : ''
                            }`}
                            style={{ color: isHovered ? '#10b981' : 'var(--text-muted)' }}
                          >
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* RIGHT COLUMN: Product Statistic Donut + Customer Growth   */}
            {/* ──────────────────────────────────────────────────────── */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* TOP RIGHT CARD: Credential Statistics (Product Statistic) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                className="p-6 sm:p-7 rounded-3xl border shadow-xs relative overflow-hidden transition-all"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Credential Statistics
                    </h3>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Track category distribution
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  >
                    <span>Today</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Large Interactive Pie / Donut Chart */}
                <div className="flex flex-col items-center justify-center my-6 relative">
                  <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                    {/* Segment 1: Students 55% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#062e1b"
                      strokeWidth="24"
                      strokeDasharray="131 238"
                      strokeDashoffset="0"
                      className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                      onMouseEnter={() => setHoveredPieIndex(0)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                    />
                    {/* Segment 2: Staff 30% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="24"
                      strokeDasharray="71 238"
                      strokeDashoffset="-131"
                      className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                      onMouseEnter={() => setHoveredPieIndex(1)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                    />
                    {/* Segment 3: Visitors 15% */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#84a92c"
                      strokeWidth="24"
                      strokeDasharray="36 238"
                      strokeDashoffset="-202"
                      className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                      onMouseEnter={() => setHoveredPieIndex(2)}
                      onMouseLeave={() => setHoveredPieIndex(null)}
                    />
                  </svg>
                </div>

                {/* Category Breakdown List */}
                <div className="space-y-3 pt-2">
                  {categories.map((cat, i) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between text-xs py-1 border-b last:border-0"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                          {cat.count.toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${
                          cat.isPositive ? 'bg-[#10b981] text-slate-950' : 'bg-rose-500 text-white'
                        }`}>
                          {cat.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* BOTTOM RIGHT CARD: Customer Growth / Regional Locations */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="p-6 sm:p-7 rounded-3xl border shadow-xs transition-all"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Intake Distribution
                    </h3>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Track personnel by regional branch
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl border"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  >
                    <span>Today</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Content: Left Bubble Clusters + Right Progress Bars */}
                <div className="grid grid-cols-12 gap-4 items-center pt-2">
                  
                  {/* Left: Overlapping Percentage Bubbles */}
                  <div className="col-span-5 flex items-center justify-center relative h-28">
                    {/* Big Bubble 87% */}
                    <div className="w-16 h-16 rounded-full bg-[#062e1b] text-white flex items-center justify-center font-black text-xs shadow-md border border-[#10b981]/30 absolute left-0 top-2 z-10">
                      87%
                    </div>
                    {/* Top Right Bubble 17% */}
                    <div className="w-10 h-10 rounded-full bg-[#10b981] text-slate-950 flex items-center justify-center font-black text-[10px] shadow-md absolute right-3 top-0 z-20">
                      17%
                    </div>
                    {/* Bottom Right Bubble 57% */}
                    <div className="w-13 h-13 rounded-full bg-[#0d4726] text-white flex items-center justify-center font-black text-xs shadow-md border border-[#10b981]/40 absolute right-1 bottom-1 z-10">
                      57%
                    </div>
                    {/* Bottom Bubble 37% */}
                    <div className="w-11 h-11 rounded-full bg-[#10b981] text-slate-950 flex items-center justify-center font-black text-[10px] shadow-md absolute left-8 bottom-0 z-20">
                      37%
                    </div>
                  </div>

                  {/* Right: Regional Progress Bars */}
                  <div className="col-span-7 space-y-2.5 pl-2">
                    {regions.map(r => (
                      <div key={r.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="flex items-center gap-1 truncate" style={{ color: 'var(--text-primary)' }}>
                            <span>{r.flag}</span>
                            <span className="truncate">{r.name}</span>
                          </span>
                          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.percent}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full rounded-full bg-gradient-to-r from-[#062e1b] to-[#10b981]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
