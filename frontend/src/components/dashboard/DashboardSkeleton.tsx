import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-8">
      {/* Top Stat Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="rounded-2xl border p-4 flex items-start gap-3.5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <div className="w-10 h-10 rounded-xl skeleton-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 skeleton-shimmer rounded-md" />
              <div className="h-6 w-24 skeleton-shimmer rounded-md" />
              <div className="h-2.5 w-12 skeleton-shimmer rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Section Skeleton (Breakdown + Production Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Doughnut Chart Skeleton Card */}
        <div
          className="lg:col-span-7 rounded-2xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="h-4 w-40 skeleton-shimmer rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center py-4">
            <div className="sm:col-span-5 flex justify-center">
              <div className="w-36 h-36 rounded-full skeleton-shimmer" />
            </div>
            <div className="sm:col-span-7 space-y-3">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="flex justify-between items-center">
                  <div className="h-3.5 w-28 skeleton-shimmer rounded-md" />
                  <div className="h-3.5 w-16 skeleton-shimmer rounded-md" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            {[1, 2, 3, 4].map(k => (
              <div key={k} className="h-10 skeleton-shimmer rounded-xl" />
            ))}
          </div>
        </div>

        {/* History Feed Skeleton Card */}
        <div
          className="lg:col-span-5 rounded-2xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex justify-between">
            <div className="h-4 w-36 skeleton-shimmer rounded-md" />
            <div className="h-4 w-16 skeleton-shimmer rounded-md" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map(m => (
              <div key={m} className="flex items-center gap-3">
                <div className="w-12 h-3 skeleton-shimmer rounded-md" />
                <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 skeleton-shimmer rounded-md" />
                  <div className="h-2.5 w-44 skeleton-shimmer rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className="rounded-2xl border p-4 space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <div className="h-4 w-28 skeleton-shimmer rounded-md" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4].map(row => (
                <div key={row} className="h-8 skeleton-shimmer rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
