import React from 'react';
import { cn } from '@/src/lib/utils';
import { X, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export const CLASSIFICATION_OPTIONS = [
  { id: 'factura', label: 'Factura', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'boleta_honorarios', label: 'BH', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'liquidación', label: 'Remuneración', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'rendición', label: 'Rendición (RG)', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'importación', label: 'Importación', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { id: 'otro', label: 'Otro', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' }
];

export function ItemsTable({
  filteredLogs,
  logs,
  setLogs,
  config,
  customFilters,
  setCustomFilters,
  hoveredBalanceId,
  setHoveredBalanceId,
  balanceTrendData
}: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant bg-slate-50/50">
            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Marca de Tiempo</th>
            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Usuario</th>
            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant text-center">Saldo</th>
            {config.customColumns.map((col: any) => (
              <th key={col.id} className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant min-w-[140px]">
                <div className="flex flex-col gap-2">
                  <span>{col.label}</span>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder={`Filtrar ${col.label}...`}
                      value={customFilters[col.id] || ''}
                      onChange={(e) => setCustomFilters((prev: any) => ({ ...prev, [col.id]: e.target.value }))}
                      className="w-full bg-white border border-outline-variant rounded px-2 py-1 text-[8px] font-bold text-on-surface outline-none focus:border-accent placeholder:text-slate-300"
                    />
                    {customFilters[col.id] && (
                      <X className="absolute right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 cursor-pointer text-slate-400 hover:text-error" onClick={() => setCustomFilters((prev: any) => ({ ...prev, [col.id]: '' }))} />
                    )}
                  </div>
                </div>
              </th>
            ))}
            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant min-w-[150px]">Tipo / Clasificación</th>
            <th className="p-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Detalles</th>
            <th className="p-4 text-right text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Impacto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {filteredLogs.length > 0 ? filteredLogs.map((log: any) => (
            <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
              <td className="p-4 text-[10px] font-medium text-on-surface-variant whitespace-nowrap italic">
                {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="block text-[8px] opacity-70 font-black tracking-tight mt-0.5">
                  {log.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  {log.user === 'Agente IA' ? (
                    <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">🤖</div>
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-primary text-white flex items-center justify-center font-black text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                      {log.user.charAt(0)}
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tight">{log.user}</span>
                </div>
              </td>
              <td 
                className="p-4 text-center relative"
                onMouseEnter={() => log.balance && setHoveredBalanceId(log.id)}
                onMouseLeave={() => setHoveredBalanceId(null)}
              >
                <span className="text-[10px] font-black text-secondary cursor-help">{log.balance || '-'}</span>
                <AnimatePresence>
                  {hoveredBalanceId === log.id && balanceTrendData.length > 1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                    >
                      <div className="bg-[#0f172a] rounded-xl border-2 border-accent shadow-2xl p-4 w-[280px]">
                        <div className="flex justify-between items-center mb-3">
                           <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest text-left">Tendencia Saldo Diario</div>
                           <div className="flex items-center gap-1">
                             <TrendingUp className="h-3 w-3 text-accent" />
                             <span className="text-[7px] font-black text-accent uppercase">Análisis Temporal</span>
                           </div>
                        </div>
                        <div className="h-[80px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={balanceTrendData}>
                              <defs>
                                <linearGradient id="popoverGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="var(--color-accent)" 
                                fill="url(#popoverGradient)" 
                                strokeWidth={2}
                                isAnimationActive={false}
                              />
                              <XAxis dataKey="displayDate" hide />
                              <YAxis hide domain={['dataMin * 0.99', 'dataMax * 1.01']} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-[8px] font-black text-slate-500 uppercase tracking-tighter flex justify-between">
                          <span>{balanceTrendData[0].displayDate}</span>
                          <span className="text-secondary italic">Saldo: {log.balance}</span>
                          <span>{balanceTrendData[balanceTrendData.length - 1].displayDate}</span>
                        </div>
                      </div>
                      <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#0f172a] mx-auto" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </td>
              {config.customColumns.map((col: any) => (
                <td key={col.id} className="p-2">
                  <input 
                    type="text"
                    value={log.customValues?.[col.id] || ''}
                    onChange={(e) => {
                      const newLogs = [...logs];
                      const idx = newLogs.findIndex(l => l.id === log.id);
                      if (idx !== -1) {
                        newLogs[idx] = {
                          ...newLogs[idx],
                          customValues: { ...(newLogs[idx].customValues || {}), [col.id]: e.target.value }
                        };
                        setLogs(newLogs);
                      }
                    }}
                    placeholder="..."
                    className="w-full bg-slate-100 border border-transparent focus:border-accent/40 rounded px-2 py-1 text-[10px] font-bold text-on-surface uppercase outline-none transition-all"
                  />
                </td>
              ))}
              <td className="p-2">
                <select 
                  value={log.classification || ''}
                  onChange={(e) => {
                    const newLogs = [...logs];
                    const idx = newLogs.findIndex(l => l.id === log.id);
                    if (idx !== -1) {
                      newLogs[idx] = { ...newLogs[idx], classification: e.target.value as any };
                      setLogs(newLogs);
                    }
                  }}
                  className={cn(
                    "w-full bg-slate-100 border border-transparent rounded px-2 py-1 text-[9px] font-black uppercase tracking-tighter outline-none cursor-pointer",
                    CLASSIFICATION_OPTIONS.find(o => o.id === log.classification)?.color
                  )}
                >
                  <option value="" className="text-slate-400">Sin Clasificar</option>
                  {CLASSIFICATION_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="p-4 text-[11px] font-medium leading-tight max-w-[300px]">
                <div className="mb-1.5">
                  <span className={cn(
                    "inline-block rounded-lg px-2 py-0.5 text-[8px] font-black border-2 uppercase tracking-tighter mb-1",
                    log.type === 'automated_match' ? "bg-secondary/10 border-secondary/20 text-secondary" :
                    log.type === 'manual_adjustment' ? "bg-primary/10 border-primary/20 text-primary" :
                    "bg-tertiary/10 border-tertiary/20 text-tertiary"
                  )}>
                    {log.type.replace('_', ' ')}
                  </span>
                  <div>{log.details}</div>
                </div>
                {log.tags && log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {log.tags.map((tag: any) => (
                      <span key={tag} className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-outline text-on-surface-variant">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-4 text-right font-display font-black text-xs italic">
                {log.amount}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6 + config.customColumns.length} className="p-12 text-center text-on-surface-variant font-display text-[10px] font-black uppercase tracking-widest italic opacity-50">
                No se encontraron entradas en el historial para los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
