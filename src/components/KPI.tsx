import React, { ReactNode } from 'react';
import { cn } from '@/src/lib/utils';

interface KPIProps {
  label: string;
  value: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  status?: string;
  statusType?: 'error' | 'success' | 'warning' | 'info';
  icon?: ReactNode;
  negativeValue?: boolean;
}

export function KPI({ label, value, trend, trendType, status, statusType, icon, negativeValue }: KPIProps) {
  return (
    <div className="bento-card group flex flex-col justify-between hover:scale-[1.02]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
            {icon}
            {label}
          </span>
          {status && (
            <span className={cn(
              "rounded-lg px-2 py-0.5 text-[9px] font-black tracking-widest border-2",
              statusType === 'error' 
                ? "bg-error text-white border-outline-variant shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]" 
                : "bg-accent text-on-surface border-outline-variant shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
            )}>
              {status}
            </span>
          )}
        </div>
        <div className={cn(
          "font-display text-4xl font-black italic mt-1 leading-none tracking-tight",
          negativeValue ? "text-error" : "text-on-surface"
        )}>
          {value}
        </div>
      </div>
      {trend && (
        <div className={cn(
          "mt-6 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
          trendType === 'positive' ? "text-secondary" : 
          trendType === 'negative' ? "text-error" : "text-on-surface-variant"
        )}>
          {trend}
        </div>
      )}
    </div>
  );
}
