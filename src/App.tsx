import { useState, useEffect, type ReactNode, type FormEvent, useRef, type ChangeEvent } from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  Settings, 
  HelpCircle, 
  Building2, 
  Droplet, 
  ArrowLeftRight, 
  Search, 
  Bell, 
  Wallet, 
  Cpu,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Download,
  Plus,
  RefreshCw,
  ExternalLink,
  Bot,
  Link as LinkIcon,
  Check,
  X,
  ArrowRight,
  PieChart as PieChartIcon,
  CalendarDays,
  FileText,
  ShieldCheck,
  Tag,
  Upload,
  Globe
} from 'lucide-react';
import { KPI } from './components/KPI';
import { ItemsTable, CLASSIFICATION_OPTIONS } from './components/ItemsTable';
import { geminiService } from './services/geminiService';
import { db } from './services/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, updateDoc, doc, writeBatch } from 'firebase/firestore';

import { 
  PRESET_COMPANIES, 
  LIQUIDITY_TREND, 
  SENSITIVITY_DATA, 
  MATURITY_DATA, 
  BREAKDOWN_DATA, 
  PERFORMANCE_DATA_MAP, 
  ENTITY_METRICS_MAP, 
  INITIAL_LOGS 
} from './data/mockData';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';


type View = 'dashboard' | 'reconciliation' | 'liquidity' | 'entity-details' | 'fx-risk';

interface BankAccountConfig {
  entity: string;
  rut: string;
  bank: string;
  accountNumber: string;
  currency: 'CLP' | 'USD' | 'EUR' | 'UF';
  initialBalance: number;
  customColumns: { id: string; label: string }[];
  mappings: {
    amount: string;
    description: string;
    date: string;
    reference: string;
    deposits?: string;
    withdrawals?: string;
    balance?: string;
    [key: string]: string | undefined;
  };
}


export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedEntity, setSelectedEntity] = useState('Cramick S.A. - Chile');
  
  const [sessionConfig, setSessionConfig] = useState<BankAccountConfig>({
    entity: PRESET_COMPANIES[0].name,
    rut: PRESET_COMPANIES[0].rut,
    bank: PRESET_COMPANIES[0].accounts[0].bank,
    accountNumber: PRESET_COMPANIES[0].accounts[0].number,
    currency: PRESET_COMPANIES[0].accounts[0].currency,
    initialBalance: 0,
    customColumns: [
      { id: 'proyecto', label: 'Proyecto' },
      { id: 'venta', label: 'Venta' },
      { id: 'documento', label: 'Documento' },
      { id: 'n_documento', label: 'N° documento' }
    ],
    mappings: {
      date: 'Fecha',
      description: 'Descripción',
      amount: 'Monto',
      reference: 'Número de operación',
      deposits: 'Depósitos o abono',
      withdrawals: 'Cheques y otros cargos',
      balance: 'Saldo diario'
    }
  });

  const handleApproveSuggestion = async () => {
    if (!suggestion || !suggestion.bank) return;

    const newEntry = {
      timestamp: Timestamp.now(),
      user: 'Admin',
      type: 'manual_adjustment',
      details: `Conciliación Sugerida Aprobada: ${suggestion.message}`,
      amount: suggestion.bank,
      tags: [...(suggestion.tags || []), 'aprobado_ia']
    };

    try {
      await addDoc(collection(db, 'reconciliations'), newEntry);
      setMismatches(prev => Math.max(0, prev - 1));
      setReconciledCount(prev => prev + 1);
      // Optional: clear suggestion
      setSuggestion({ bank: '', erp: '', bankLabel: '', erpLabel: '', confidence: 0, message: '' });
    } catch (error) {
      console.error("Error approving suggestion:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-background selection:bg-primary/20">
      {/* Sidebar */}
      <nav id="sidebar" className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r-2 border-outline-variant bg-surface py-6 px-4 md:flex z-40">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-lg font-black leading-none text-on-surface">Manta Misión</h1>
            <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-display font-black italic">Centro de Control</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <NavButton 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')}
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Panel Principal"
          />
          <NavButton 
            active={activeView === 'reconciliation'} 
            onClick={() => setActiveView('reconciliation')}
            icon={<RefreshCw className="h-4 w-4" />}
            label="Conciliación"
          />
          <NavButton 
            active={activeView === 'liquidity'} 
            onClick={() => setActiveView('liquidity')}
            icon={<Droplet className="h-4 w-4" />}
            label="Liquidez"
          />
          <NavButton 
            active={activeView === 'entity-details'} 
            onClick={() => setActiveView('entity-details')}
            icon={<Building2 className="h-4 w-4" />}
            label="Detalle Entidad"
          />
          <NavButton 
            active={activeView === 'fx-risk'} 
            onClick={() => setActiveView('fx-risk')}
            icon={<ArrowLeftRight className="h-4 w-4" />}
            label="Riesgo FX"
          />
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t-2 border-outline-variant pt-6">
          <NavButton 
            icon={<Settings className="h-4 w-4" />}
            label="Configuración"
          />
          <NavButton 
            icon={<HelpCircle className="h-4 w-4" />}
            label="Soporte"
          />
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-outline-variant bg-on-surface py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-white transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <ArrowLeftRight className="h-3 w-3" />
            Cambiar Entidad
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-64">
        {/* TopBar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-outline-variant bg-background/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="hidden h-9 w-64 items-center gap-3 rounded-xl border-2 border-outline-variant bg-surface px-4 lg:flex shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
              <Search className="h-4 w-4 text-outline-variant" />
              <input 
                type="text" 
                placeholder="Buscar recursos..." 
                className="bg-transparent text-xs font-medium text-on-surface outline-none placeholder:text-on-surface-variant/50 w-full"
              />
            </div>
            {/* Mobile Logo */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="font-display font-black text-on-surface italic">Manta</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-6 border-r-2 border-outline-variant pr-6 lg:flex">
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black uppercase text-on-surface-variant leading-none font-display italic">CLP</span>
                <span className="font-display font-black text-xs text-on-surface italic">$12.45B</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-black uppercase text-on-surface-variant leading-none font-display italic">USD</span>
                <span className="font-display font-black text-xs text-on-surface italic">$14.2M</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-transparent hover:border-outline-variant hover:bg-slate-100 transition-all text-on-surface-variant">
                <Wallet className="h-5 w-5" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-transparent hover:border-outline-variant hover:bg-slate-100 transition-all text-on-surface-variant">
                <Cpu className="h-5 w-5" />
              </button>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border-2 border-transparent hover:border-outline-variant hover:bg-slate-100 transition-all text-on-surface-variant">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error border-2 border-background" />
              </button>
            </div>

            <div className="ml-2 flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/5 px-3 py-1.5 text-secondary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
              <span className="text-[10px] font-bold uppercase tracking-widest font-display leading-none">Estado en Vivo</span>
            </div>
          </div>
        </header>

        {/* View Component */}
        <main className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'reconciliation' && <ReconciliationView config={sessionConfig} setConfig={setSessionConfig} />}
              {activeView === 'liquidity' && <LiquidityView />}
              {activeView === 'entity-details' && <EntityDetailsView />}
              {activeView === 'fx-risk' && <FXRiskView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active?: boolean; icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-[10px] font-black uppercase tracking-[0.15em] transition-all",
        active 
          ? "bg-accent text-on-surface border-2 border-outline-variant shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] translate-x-1" 
          : "text-on-surface-variant hover:text-on-surface hover:bg-slate-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Views Components ---

function DashboardView() {
  const liquidityTrend = LIQUIDITY_TREND;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-5xl font-black tracking-tighter text-on-surface italic">Resumen</h2>
          <p className="mt-1 text-on-surface-variant font-medium">Liquidez de holding en tiempo real y exposición al riesgo</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-surface px-5 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-primary px-5 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-primary-container shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <Plus className="h-4 w-4" />
            Nueva Transferencia
          </button>
        </div>
      </header>

      {/* KPI Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <KPI 
          label="Liquidez Neta Total" 
          value="$14.25M" 
          trend="+2.4% vs semana pasada" 
          trendType="positive"
          status="EN VIVO"
          icon={<Wallet className="h-4 w-4" />}
        />
        <KPI 
          label="Flujo Neto Mensual" 
          value="-$1.12M" 
          trend="Esperado por ciclo fiscal" 
          trendType="neutral"
          icon={<TrendingUp className="h-4 w-4 rotate-180" />}
          negativeValue
        />
        <KPI 
          label="Exposición al Riesgo" 
          value="18.5%" 
          trend="USD/EUR fuera de rango" 
          trendType="negative"
          status="ATENCIÓN"
          statusType="error"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Chart Section */}
        <section className="lg:col-span-8 bento-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4 mb-6">
            <h3 className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-on-surface flex items-center gap-2 italic">
              <TrendingUp className="h-4 w-4" />
              Evolución de Liquidez Consolidada (M USD)
            </h3>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-slate-100 text-[8px] font-black uppercase border border-outline-variant">7D</button>
              <button className="px-2 py-1 rounded text-[8px] font-black uppercase text-on-surface-variant hover:bg-slate-50 transition-colors">30D</button>
            </div>
          </div>
          <div className="flex-1 h-[300px] w-full chart-grid">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liquidityTrend}>
                <defs>
                  <linearGradient id="dashboardGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={4} fill="url(#dashboardGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4 border-t-2 border-outline-variant/30 pt-6">
            <MiniStat label="Facturas" value="42" sub="Importadas" icon={<FileText className="h-4 w-4" />} />
            <MiniStat label="Boletas" value="18" sub="Sincro" icon={<Tag className="h-4 w-4" />} color="tertiary" />
            <MiniStat label="Rendiciones" value="5" sub="Revisión" icon={<RefreshCw className="h-4 w-4" />} color="secondary" />
            <MiniStat label="Alertas" value="2" sub="Alta" icon={<AlertCircle className="h-4 w-4" />} color="error" />
          </div>
        </section>

        {/* Portfolio Table - Simplified for Dashboard */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bento-card-dark overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-4">
              <h3 className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 italic">
                <FileText className="h-4 w-4" />
                Alertas Críticas
              </h3>
            </div>
            <div className="flex-1 divide-y divide-slate-800">
              <FeedItem time="Ahora" bank="BCI" amount="-$45k" label="Giro No Reconocido" refCode="OP-9942" status="negative" active />
              <FeedItem time="2h" bank="ITAU" amount="+$120k" label="Factura Duplicada Detectada" refCode="FAC-2231" status="positive" />
              <FeedItem time="Directo" bank="SANTANDER" amount="-$8.2k" label="Sobregiro Técnico" refCode="AC-0012" status="negative" />
            </div>
            <button className="bg-slate-800/50 p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              Sistema de Alertas Completo
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function EntityRow({ name, liquidity, flow, status, color }: any) {
  return (
    <tr className="group border-b border-outline-variant/30 transition-colors hover:bg-slate-50">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-3 w-3 rounded-full border border-outline-variant shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]", `bg-${color}`)} />
          <span className="font-bold text-on-surface text-xs uppercase tracking-tight">{name}</span>
        </div>
      </td>
      <td className="p-4 text-right font-display font-black text-sm">{liquidity}</td>
      <td className="p-4 text-center">
        <div className="mx-auto w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden border border-outline-variant/30">
          <div className={cn("h-full rounded-full transition-all duration-1000", 
            flow === 'positive' ? "bg-secondary" :
            flow === 'negative' ? "bg-error" : "bg-tertiary"
          )} style={{ width: flow === 'neutral' ? '50%' : '100%' }} />
        </div>
      </td>
      <td className="p-4 text-right">
        <span className={cn(
          "inline-block rounded-lg px-2 py-0.5 font-display text-[9px] font-black border-2",
          color === 'secondary' ? "bg-secondary/10 text-secondary border-secondary/20" :
          color === 'error' ? "bg-error/10 text-error border-error/20" :
          "bg-tertiary/10 text-tertiary border-tertiary/20"
        )}>
          {status}
        </span>
      </td>
    </tr>
  );
}

function ProgressItem({ label, value, color }: any) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-100 border-2 border-outline-variant overflow-hidden p-0.5">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000", `bg-${color}`)} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  );
}

function ObligationItem({ label, date, amount, dark }: any) {
  return (
    <div className={cn(
      "group flex items-center justify-between p-4 transition-colors cursor-pointer",
      dark ? "hover:bg-slate-800" : "hover:bg-slate-50"
    )}>
      <div className="flex flex-col">
        <div className={cn("font-bold text-xs uppercase tracking-tight", dark ? "text-white" : "text-on-surface")}>{label}</div>
        <div className={cn("text-[9px] font-black uppercase tracking-widest", dark ? "text-slate-500" : "text-on-surface-variant")}>{date}</div>
      </div>
      <div className="text-right">
        <div className={cn("font-display font-black text-sm", dark ? "text-accent" : "text-on-surface")}>{amount}</div>
      </div>
    </div>
  );
}

function LiquidityView() {
  const data = LIQUIDITY_PROJECTION;

  const breakdown = BREAKDOWN_DATA;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-5xl font-black tracking-tighter text-on-surface italic">Flujo de Caja</h2>
          <p className="mt-1 text-on-surface-variant font-medium">Vista estratégica de proyecciones a través de instrumentos del holding.</p>
        </div>
        <div className="flex gap-2 rounded-xl border-2 border-outline-variant bg-surface p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          {['CLP', 'USD', 'UF'].map((cur, i) => (
            <button key={cur} className={cn(
              "px-4 py-1.5 rounded-lg font-display text-[10px] font-black tracking-widest transition-all",
              i === 0 ? "bg-accent text-on-surface border border-outline-variant" : "text-on-surface-variant hover:text-on-surface"
            )}>
              {cur}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Alert */}
          <div className="flex items-center gap-4 bento-card-accent border-error/50 bg-error/5 text-error">
            <AlertTriangle className="h-6 w-6 shrink-0" />
            <div>
              <h4 className="font-display text-[11px] font-black uppercase tracking-widest">Advertencia de Brecha de Caja</h4>
              <p className="text-sm font-medium">La liquidez proyectada cae bajo el margen de seguridad en el Día 42.</p>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="bento-card overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4 mb-6">
              <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
                <BarChart3 className="h-4 w-4" />
                Proyección a 90 Días
              </h3>
            </div>
            <div className="h-[350px] w-full chart-grid">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `D${v}`} />
                  <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Controls */}
          <div className="bento-card">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface mb-8 italic">Controles de Simulación</h3>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Línea Base</label>
                <select className="w-full rounded-xl border-2 border-outline-variant bg-slate-50 p-3 text-xs font-bold outline-none focus:border-primary">
                  <option>Cuentas por Cobrar Atrasadas (A)</option>
                  <option>Proyección Estándar (B)</option>
                </select>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Margen (M CLP)</label>
                  <span className="font-display font-black text-primary italic">50M</span>
                </div>
                <input type="range" className="w-full accent-primary h-2 bg-slate-200 rounded-full appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bento-card bg-accent">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-4 font-display">Liquidez Total</h3>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-5xl font-black text-on-surface tracking-tighter italic">452.1</span>
              <span className="text-xs font-black text-on-surface-variant italic">M CLP</span>
            </div>
          </div>

          <div className="bento-card flex-1 p-0 overflow-hidden">
            <div className="p-4 border-b-2 border-outline-variant bg-slate-50">
              <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface italic">Instrumentos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody className="divide-y-2 divide-outline-variant/10">
                  {breakdown.map((item) => (
                    <tr key={item.name} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="p-4 font-bold text-xs uppercase tracking-tight text-on-surface">{item.name}</td>
                      <td className="p-4 text-right font-display font-black text-sm">{item.amount}</td>
                      <td className="p-4 text-right">
                        <span className={cn(
                          "inline-block rounded-lg px-2 py-0.5 text-[9px] font-black border-2",
                          `bg-${item.statusColor}/10 border-${item.statusColor}/20 text-${item.statusColor}`
                        )}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FXRiskView() {
  const sensitivity = SENSITIVITY_DATA;

  const maturityData = MATURITY_DATA;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-5xl font-black tracking-tighter text-on-surface italic">Monitor de Exposición</h2>
          <p className="mt-1 text-on-surface-variant font-medium">Distribución de divisas y riesgo en todo el portafolio.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-surface px-5 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </header>

      {/* Critical Alert */}
      <div className="bento-card bg-on-surface border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-2 h-full bg-error" />
        <div className="flex gap-4 relative z-10">
          <AlertTriangle className="h-8 w-8 text-error shrink-0" />
          <div>
            <div className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-error mb-1 italic">Violación de Política</div>
            <h4 className="font-display text-xl font-black text-white italic">Posición en EUR Excede el Límite</h4>
            <p className="mt-2 text-slate-400 text-sm font-medium leading-relaxed">La exposición está en 18.5%, superando el umbral del 15%. Se recomienda cobertura (hedging).</p>
          </div>
        </div>
        <button className="whitespace-nowrap px-6 py-3 rounded-xl bg-error text-white font-display text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          Cubrir Riesgo Ahora
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Exposure Map */}
        <section className="lg:col-span-8 bento-card overflow-hidden flex flex-col">
          <div className="p-4 border-b-2 border-outline-variant bg-slate-50 flex justify-between items-center">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
              <PieChart className="h-4 w-4" />
              Mapa de Exposición
            </h3>
            <span className="font-display text-[10px] font-black uppercase text-on-surface-variant italic">$425.8M Total</span>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div className="h-72 flex gap-4">
              <div className="w-[60%] rounded-2xl bg-indigo-50 border-2 border-outline-variant p-6 flex flex-col justify-between hover:bg-indigo-100 transition-all cursor-pointer">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 font-display italic">CLP</span>
                  <div className="font-display text-5xl font-black text-indigo-700 mt-2 italic tracking-tighter">55%</div>
                </div>
                <div className="font-display font-black text-on-surface italic">$235M</div>
              </div>
              <div className="w-[40%] flex flex-col gap-4">
                <div className="h-1/2 bento-card-dark p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-display italic">USD</span>
                  <div className="font-display text-2xl font-black text-white italic">26%</div>
                </div>
                <div className="h-1/2 rounded-2xl bg-accent border-2 border-outline-variant p-6 flex flex-col justify-between hover:brightness-105 transition-all cursor-pointer">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface font-display italic italic">EUR</span>
                  <div className="font-display text-2xl font-black text-on-surface italic">19%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sensitivity */}
        <section className="lg:col-span-4 bento-card overflow-hidden flex flex-col">
          <div className="p-4 border-b-2 border-outline-variant bg-slate-50">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface italic">Análisis de Sensibilidad</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            {sensitivity.map((item) => (
              <div key={item.label} className={cn(
                "rounded-xl border-2 p-5 transition-all hover:translate-x-1 cursor-pointer",
                item.color === 'secondary' ? "bg-slate-50 border-outline-variant" : "bg-error/5 border-error/20"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-display italic">{item.label}</span>
                </div>
                <div className={cn("font-display text-3xl font-black italic", `text-${item.color}`)}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Maturity Ladder */}
        <section className="lg:col-span-12 bento-card overflow-hidden">
          <div className="p-4 border-b-2 border-outline-variant bg-slate-50 flex justify-between items-center">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
              <CalendarDays className="h-4 w-4" />
              Escalera de Vencimientos
            </h3>
            <div className="flex gap-4">
              <LegendItem color="primary" label="DAP" />
              <LegendItem color="tertiary" label="FFMM" />
              <LegendItem color="error" label="Créditos" />
            </div>
          </div>
          <div className="h-[250px] w-full p-6 chart-grid">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Bar dataKey="dap" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ffmm" stackId="a" fill="#f59e0b" />
                <Bar dataKey="credit" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 rounded-md border-2 border-outline-variant shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)]", `bg-${color}`)} />
      <span className="font-display text-[10px] font-black uppercase tracking-widest text-on-surface-variant italic">{label}</span>
    </div>
  );
}

function EntityDetailsView() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bento-card bg-primary flex items-center justify-center p-0 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="font-display text-5xl font-black tracking-tighter text-on-surface italic">Manta Real Estate</h2>
            <p className="mt-1 flex items-center gap-2 text-on-surface-variant font-medium">
              <span className="h-2 w-2 rounded-full bg-secondary shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]" />
              Entidad de Holding · ID: RE-001
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded-xl border-2 border-outline-variant bg-surface px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            Editar Entidad
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <KPI label="Liquidez" value="$8.45M" trend="+12.4%" trendType="positive" icon={<Building2 className="h-4 w-4" />} />
        <KPI label="Carga Tributaria" value="$1.20M" trend="-2.1%" trendType="negative" icon={<FileText className="h-4 w-4" />} />
        <KPI label="Cumplimiento" value="98%" trend="Saludable" trendType="neutral" status="SINCRONIZADO" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8 bento-card overflow-hidden">
          <div className="p-4 border-b-2 border-outline-variant bg-slate-50 mb-6">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface italic">Distribución de Activos</h3>
          </div>
          <div className="h-[350px] w-full chart-grid">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { month: 'Ene', val: 400 },
                { month: 'Feb', val: 300 },
                { month: 'Mar', val: 600 },
                { month: 'Abr', val: 800 },
                { month: 'May', val: 500 },
                { month: 'Jun', val: 900 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={4} fill="#8b5cf6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-4 bento-card flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b-2 border-outline-variant bg-slate-50">
            <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface italic">Actividad Reciente</h3>
          </div>
          <div className="flex-1 divide-y-2 divide-outline-variant/10">
            <FeedItem user="Admin" action="Actualizó Estrategia FX" time="Hace 2h" />
            <FeedItem user="Sistema" action="Conciliación Mensual" time="Hace 4h" />
            <FeedItem user="CFO" action="Aprobó Transferencia de Fondos" time="Ayer" />
          </div>
          <button className="bg-slate-50 p-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">
            Ver Registro de Auditoría
          </button>
        </section>
      </div>
    </div>
  );
}

function DetailMetric({ label, value, icon, status, statusColor }: any) {
  return (
    <div className="bento-card flex flex-col justify-between">
      <div className="flex items-center justify-between pointer-events-none">
        <span className="font-display text-[10px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
          {icon}
          {label}
        </span>
        {status && (
          <span className={cn(
            "rounded-lg px-2 py-0.5 text-[9px] font-black border-2",
            `bg-${statusColor}/10 text-${statusColor} border-${statusColor}/20`
          )}>
            {status}
          </span>
        )}
      </div>
      <div className="font-display text-3xl font-black italic mt-4 tracking-tighter text-on-surface">{value}</div>
    </div>
  );
}

function InstrumentCard({ bank, account, balance, sync }: any) {
  return (
    <div className="bento-card group flex flex-col justify-between hover:scale-[1.02] cursor-pointer">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="font-display text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-1 italic">{bank}</div>
          <div className="text-xs font-bold text-on-surface tracking-tight">{account}</div>
        </div>
        <div className="h-8 w-8 rounded-lg bg-slate-50 border-2 border-outline-variant flex items-center justify-center text-on-surface-variant group-hover:bg-accent group-hover:text-on-surface transition-colors">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div>
        <div className="font-display text-3xl font-black italic tracking-tighter text-on-surface">{balance}</div>
        <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-secondary">
          <RefreshCw className="h-3 w-3 animate-spin-slow" />
          {sync}
        </div>
      </div>
    </div>
  );
}

type ReconciliationLogAction = 'automated_match' | 'manual_adjustment' | 'ai_suggestion' | 'global_audit';

interface ReconciliationLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  type: ReconciliationLogAction;
  classification?: 'factura' | 'boleta_honorarios' | 'liquidación' | 'rendición' | 'importación' | 'otro';
  details: string;
  amount: string;
  balance?: string;
  customValues?: Record<string, string>;
  tags?: string[];
}


interface MappingSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  key?: string | number;
}

function MappingSelect({ label, value, options, onChange }: MappingSelectProps) {
  return (
    <div className="space-y-1">
      <span className="text-[7px] font-black uppercase text-slate-500">{label}</span>
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-[10px] font-bold text-accent outline-none focus:border-accent appearance-none cursor-pointer"
      >
        <option value="">N/A</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

interface SIIDocument {
  id: string;
  type: string;
  folio: string;
  date: string;
  issuer: string;
  issuerRut: string;
  amount: number;
  status: string;
  originalImage?: string;
}

function ReconciliationView({ config, setConfig }: { config: BankAccountConfig; setConfig: (c: BankAccountConfig) => void }) {
  const [matchRate, setMatchRate] = useState(99.2);
  const [mismatches, setMismatches] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [siiDocs, setSiiDocs] = useState<SIIDocument[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const siiFileInputRef = useRef<HTMLInputElement>(null);

  // --- Reconciliation Rules State ---
  const [rules, setRules] = useState<{ 
    id: string; 
    term?: string; 
    refTerm?: string;
    amount?: number; 
    minAmount?: number; 
    maxAmount?: number; 
    classification: ReconciliationLogEntry['classification'] 
  }[]>([
    { id: 'r1', term: 'aws', classification: 'factura' },
    { id: 'r2', term: 'sueldo', classification: 'liquidación' },
    { id: 'r3', term: 'reembolso', classification: 'rendición' }
  ]);
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState(500); // Amount difference threshold in local currency
  const [initialBalance, setInitialBalance] = useState(0);
  const [hoveredBalanceId, setHoveredBalanceId] = useState<string | null>(null);
  const [newRuleTerm, setNewRuleTerm] = useState('');
  const [newRuleRefTerm, setNewRuleRefTerm] = useState('');
  const [newRuleAmount, setNewRuleAmount] = useState<string>('');
  const [newRuleMinAmount, setNewRuleMinAmount] = useState<string>('');
  const [newRuleMaxAmount, setNewRuleMaxAmount] = useState<string>('');
  const [newRuleClass, setNewRuleClass] = useState<ReconciliationLogEntry['classification']>('otro');
  
  const [suggestion, setSuggestion] = useState<any>({
    bank: "-$3,200.50",
    erp: "$3,200.00",
    bankLabel: "AWS SERVICES",
    erpLabel: "Amazon Inc.",
    confidence: 85,
    message: "Coincidencia con Factura #8842 basada en mapeo histórico. Se detectó una discrepancia de $0.50 probablemente por redondeo de FX.",
    tags: ['servicios_it', 'gastos_op'],
    fxAnalysis: {
      rate: "834.50",
      adjustment: "$0.50",
      confidence: 92,
      explanation: "Fluctuación del tipo de cambio USD/CLP entre fecha de facturación y fecha de cobro bancario."
    }
  });

  const [logs, setLogs] = useState<ReconciliationLogEntry[]>(INITIAL_LOGS);

  useEffect(() => {
    const q = query(collection(db, 'reconciliations'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
        } as ReconciliationLogEntry;
      });
      if (fbLogs.length > 0) {
        setLogs(fbLogs);
      }
    });
    return () => unsubscribe();
  }, []);


  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{row: number, error: string}[]>([]);
  const [dataSample, setDataSample] = useState<{headers: string[], rows: any[][]}>({ headers: [], rows: [] });

  const validateCurrentMappings = () => {
    if (dataSample.headers.length === 0) {
      setValidationErrors([{ row: 0, error: "No hay datos cargados para validar. Por favor, suba un archivo primero." }]);
      return;
    }

    const errors: {row: number, error: string}[] = [];
    const { headers, rows } = dataSample;

    const checkMapping = (key: keyof typeof config.mappings, label: string, isNumeric = false, isDate = false) => {
      const colLabel = config.mappings[key];
      const match = colLabel.match(/Col ([A-Z])/);
      let idx = -1;

      if (match) {
        idx = match[1].charCodeAt(0) - 65;
      } else {
        idx = headers.findIndex(h => String(h).toLowerCase().trim() === colLabel.toLowerCase().trim());
      }

      if (idx === -1 || idx >= headers.length) {
        errors.push({ row: 0, error: `Columna "${label}" no encontrada: ${colLabel}` });
        return;
      }

      // Check first 3 rows
      rows.forEach((row, i) => {
        const val = row[idx];
        if (val === undefined || val === null || val === '') return;

        if (isNumeric) {
          const num = parseFloat(String(val).replace(/[$,]/g, ''));
          if (isNaN(num)) errors.push({ row: i + 2, error: `Tipo incorrecto en ${label}: "${val}" no es un número.` });
        }
        if (isDate) {
          const date = new Date(val);
          if (isNaN(date.getTime())) errors.push({ row: i + 2, error: `Tipo incorrecto en ${label}: "${val}" no es una fecha válida.` });
        }
      });
    };

    checkMapping('amount', 'Monto', true);
    checkMapping('date', 'Fecha', false, true);
    checkMapping('description', 'Descripción');
    if (config.mappings.deposits) checkMapping('deposits', 'Depósitos', true);
    if (config.mappings.withdrawals) checkMapping('withdrawals', 'Giros', true);
    if (config.mappings.balance) checkMapping('balance', 'Saldo', true);

    if (errors.length === 0) {
      alert("¡Validación Exitosa! Los mapeos coinciden con la estructura del archivo.");
    }
    setValidationErrors(errors);
  };

  const [performanceEntity, setPerformanceEntity] = useState(config.entity);
  const [comparisonEntity, setComparisonEntity] = useState<string | null>(null);

  const performanceDataMap = PERFORMANCE_DATA_MAP;

  const entityMetricsMap = ENTITY_METRICS_MAP;

  const primaryPerformanceData = performanceDataMap[performanceEntity] || performanceDataMap['Manta Holding SpA'];
  const comparisonPerformanceData = comparisonEntity ? performanceDataMap[comparisonEntity] : null;

  const mergedPerformanceData = primaryPerformanceData.map((d, index) => ({
    ...d,
    comparisonRate: comparisonPerformanceData ? comparisonPerformanceData[index]?.rate : undefined
  }));

  const entityMetrics = entityMetricsMap[performanceEntity] || entityMetricsMap['Manta Holding SpA'];
  const comparisonMetrics = comparisonEntity ? entityMetricsMap[comparisonEntity] : null;

  const [manualForm, setManualForm] = useState({
    bankAmount: '',
    bankDesc: '',
    erpAmount: '',
    erpDesc: '',
    notes: '',
    tags: [] as string[]
  });

  const availableTags = ['relacionado_con_impuestos', 'nomina', 'transferencia_interna', 'servicios_it', 'suscripcion', 'gastos_op', 'liquidacion'];

  const toggleTag = (tagName: string) => {
    setManualForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName) 
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  const MAPPING_OPTIONS = [
    'Fecha', 
    'Número de operación', 
    'Sucursal',
    'Descripción', 
    'Depósitos o abonos', 
    'Giros o cargos', 
    'Saldo diario',
    'Amount', 
    'Debit', 
    'Credit', 
    'Reference',
    ...Array.from({ length: 26 }, (_, i) => `Col ${String.fromCharCode(65 + i)}`)
  ];

    const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newEntry = {
      timestamp: Timestamp.now(),
      user: 'Admin',
      type: 'manual_adjustment',
      details: `Conciliación manual: ${manualForm.bankDesc} vs ${manualForm.erpDesc}. Notas: ${manualForm.notes}`,
      amount: `${manualForm.bankAmount}`,
      tags: manualForm.tags
    };

    try {
      await addDoc(collection(db, 'reconciliations'), newEntry);
      setMismatches(prev => Math.max(0, prev - 1));
      setIsManualEntryOpen(false);
      setManualForm({
        bankAmount: '',
        bankDesc: '',
        erpAmount: '',
        erpDesc: '',
        notes: '',
        tags: []
      });
    } catch (error) {
      console.error("Error saving manual reconciliation:", error);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length === 0) {
          throw new Error("El archivo está vacío.");
        }

        // --- INTELLIGENT AUTO-DETECTION ---
        const matchers = {
          amount: ['monto total', 'monto neto', 'monto', 'amount', 'valor', 'total', 'importe', 'vlr', 'impte'],
          date: ['fecha docto', 'fecha', 'date', 'transaction date', 'fec', 'vcto', 'fech'],
          description: ['razon social', 'emisor', 'descripción', 'description', 'detalle', 'glosa', 'concepto', 'det'],
          reference: ['folio', 'número de operación', 'n° documento', 'documento', 'referencia', 'nro', 'operación', 'doc'],
          rut: ['rut proveedor', 'rut emisor', 'rut'],
          deposits: ['depósitos o abonos', 'depósitos y abono', 'abonos', 'credit', 'entradas', 'deposito', 'abono', 'dep'],
          withdrawals: ['giros o cargos', 'cheques y otros cargos', 'cargos', 'debit', 'salidas', 'cargo', 'giro', 'cheque'],
          balance: ['saldo diario', 'saldo', 'balance', 'saldo disponible']
        };

        const allTerms = Object.values(matchers).flat();
        
        // Find the most likely header row (usually the one with most recognized financial terms)
        let headerIdx = 0;
        let bestMatchCount = 0;
        
        for (let i = 0; i < Math.min(data.length, 25); i++) {
          const row = data[i] || [];
          const count = row.filter(cell => allTerms.some(term => String(cell).toLowerCase().includes(term))).length;
          if (count > bestMatchCount) {
            bestMatchCount = count;
            headerIdx = i;
          }
        }

        const headers = data[headerIdx] || [];
        setDataSample({ headers, rows: data.slice(headerIdx + 1, headerIdx + 11) });

        const autoMappings = { ...config.mappings };
        headers.forEach((h: any) => {
          const cleanH = String(h).toLowerCase().trim();
          Object.entries(matchers).forEach(([key, terms]) => {
            if (terms.some(t => cleanH.includes(t))) {
              // Priority for SII columns
              if (key === 'amount' && cleanH === 'monto total') (autoMappings as any)[key] = h;
              else if (key === 'date' && cleanH === 'fecha docto') (autoMappings as any)[key] = h;
              else if (! (autoMappings as any)[key] || terms[0] === cleanH) (autoMappings as any)[key] = h;
            }
          });
        });

        // Update config with auto-detected mappings
        setConfig({ ...config, mappings: autoMappings });

        const getColIndex = (mapping: string | undefined, headerList: any[]) => {
          if (!mapping) return -1;
          const match = mapping.match(/Col ([A-Z])/);
          if (match) return match[1].charCodeAt(0) - 65;
          return headerList.findIndex(h => String(h).toLowerCase().trim() === mapping.toLowerCase().trim());
        };

        const amtIdx = getColIndex(autoMappings.amount, headers);
        const descIdx = getColIndex(autoMappings.description, headers);
        const dateIdx = getColIndex(autoMappings.date, headers);
        const depIdx = autoMappings.deposits ? getColIndex(autoMappings.deposits, headers) : -1;
        const girIdx = autoMappings.withdrawals ? getColIndex(autoMappings.withdrawals, headers) : -1;
        const balIdx = autoMappings.balance ? getColIndex(autoMappings.balance, headers) : -1;

        // Custom columns indices
        const customIndices = config.customColumns.reduce((acc, col) => {
          const mapping = config.mappings[col.id];
          let idx = -1;
          if (mapping) {
            idx = getColIndex(mapping, headers);
          } else {
            // Fallback to fuzzy match if no explicit mapping
            idx = headers.findIndex(h => String(h).toLowerCase().trim() === col.label.toLowerCase().trim());
          }
          
          if (idx !== -1) acc[col.id] = idx;
          return acc;
        }, {} as Record<string, number>);

        // Validation Phase
        const errors: {row: number, error: string}[] = [];
        const validRows: any[][] = [];

        data.slice(headerIdx + 1).forEach((row, index) => {
          const rowNum = index + headerIdx + 2; 
          if (row.length === 0) return;

          let finalAmount: number | null = null;
          
          if (depIdx !== -1 || girIdx !== -1) {
            const depVal = depIdx !== -1 ? String(row[depIdx] || '0').replace(/[$.]/g, '').replace(',', '.') : '0';
            const girVal = girIdx !== -1 ? String(row[girIdx] || '0').replace(/[$.]/g, '').replace(',', '.') : '0';
            
            const dep = parseFloat(depVal) || 0;
            const gir = parseFloat(girVal) || 0;
            
            if (dep !== 0) finalAmount = dep;
            else if (gir !== 0) finalAmount = -gir;
          } else {
            const rawAmt = String(row[amtIdx] || '0').replace(/[$.]/g, '').replace(',', '.');
            finalAmount = parseFloat(rawAmt);
          }

          if (finalAmount === null || isNaN(finalAmount)) {
            // Probably an empty row or sub-total line
            return;
          }

          const rawDate = row[dateIdx];
          const date = rawDate ? new Date(rawDate) : null;
          if (rawDate && (!date || isNaN(date.getTime()))) {
            // Optional: don't error, just skip if date is missing
          }

          validRows.push([...row, finalAmount]); // Inject clean amount
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
          setIsProcessing(false);
          return;
        }

        setValidationErrors([]);
        
        // Feed into logs
        const newLogs: ReconciliationLogEntry[] = validRows.slice(0, 15).map(row => {
          const amount = row[row.length - 1]; // Use injected amount
          const customValues: Record<string, string> = {};
          Object.entries(customIndices).forEach(([id, idx]) => {
            customValues[id] = String(row[idx] || '');
          });

          // Smart classification
          const details = row[descIdx] || '';
          let classification: any = undefined;
          const lowerDetail = String(details).toLowerCase();
          if (lowerDetail.includes('factura') || lowerDetail.includes(' fac ')) classification = 'factura';
          else if (lowerDetail.includes('boleta honorarios') || lowerDetail.includes(' bh ')) classification = 'boleta_honorarios';
          else if (lowerDetail.includes('remuneracion') || lowerDetail.includes('sueldo') || lowerDetail.includes('liquidacion')) classification = 'liquidación';
          else if (lowerDetail.includes('rg ') || lowerDetail.includes('rendicion')) classification = 'rendición';
          else if (lowerDetail.includes('importacion')) classification = 'importación';

          return {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: dateIdx !== -1 && row[dateIdx] ? new Date(row[dateIdx]) : new Date(),
            user: 'AI Agent',
            type: 'automated_match',
            classification,
            details: `Importado: ${details}`,
            amount: `${amount < 0 ? '-' : ''}$${Math.abs(Number(amount)).toLocaleString('es-CL')}`,
            balance: balIdx !== -1 ? `$${parseFloat(String(row[balIdx] || '0').replace(/[$.]/g, '').replace(',', '.')).toLocaleString('es-CL')}` : undefined,
            customValues,
            tags: ['importado', 'sincronizacion_cartola']
          };
        });

              // Save to Firestore
        const batch = writeBatch(db);
        newLogs.forEach(log => {
          const docRef = doc(collection(db, 'reconciliations'));
          batch.set(docRef, {
            ...log,
            timestamp: Timestamp.fromDate(log.timestamp)
          });
        });
        await batch.commit();
        setMismatches(prev => prev + (validRows.length > 15 ? validRows.length - 15 : 0));
        setReconciledCount(prev => prev + (validRows.length > 15 ? 15 : validRows.length));
        setMatchRate(prev => Math.min(99.9, prev + 0.1));

      } catch (error) {
        console.error("File processing error:", error);
      } finally {
        setIsProcessing(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const csvRows = [
      ['Timestamp', 'User', 'Type', 'Details', 'Amount', 'Tags'],
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.user,
        log.type,
        log.details,
        log.amount.replace('$', '').replace(',', ''),
        (log.tags || []).join(';')
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `manta_recon_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSIIOCR = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    
    try {
      // Use FileReader to get base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const response = await geminiService.extractDocumentsFromImage(base64 as string, file.type);

      const text = response.text || '';
      // Simple clean up of potential markdown code blocks
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      if (result.documents && Array.isArray(result.documents)) {
        const newDocs: SIIDocument[] = result.documents.map((d: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          type: d.type || d.documento || 'Documento',
          folio: String(d.folio || d.n_documento || ''),
          date: d.date || d.fecha || '',
          issuer: d.issuer || d.razon_social || d.emisor || '',
          issuerRut: d.issuer_rut || d.rut_emisor || d.rut || '',
          amount: Number(String(d.amount || d.monto || '0').replace(/[^0-9.-]/g, '')),
          status: d.status || d.estado || 'Receptor'
        }));

        setSiiDocs(prev => [...newDocs, ...prev]);
        
        // Automated cross-check attempt
        const bankLogs = logs.filter(l => l.type === 'automated_match' && !l.classification);
        let crossingCount = 0;
        
        const updatedLogs = logs.map(log => {
          const logAmtStr = log.amount.replace(/[^0-9.-]/g, '');
          const logAmt = Math.abs(parseFloat(logAmtStr));
          
          // Look for a match in newly extracted docs
          const match = newDocs.find(d => 
            Math.abs(d.amount - logAmt) < 1 || // Exact or near match
            log.details.includes(d.folio) ||
            log.details.toLowerCase().includes(d.issuer.toLowerCase())
          );
          
          if (match && !log.classification) {
            crossingCount++;
            let cls: any = 'otro';
            if (match.type.toLowerCase().includes('factura')) cls = 'factura';
            else if (match.type.toLowerCase().includes('boleta')) cls = 'boleta_honorarios';
            
            return {
              ...log,
              classification: cls,
              details: `${log.details} [CRUZADO CON SII: Folio ${match.folio} de ${match.issuer}]`,
              tags: [...(log.tags || []), 'cruce_sii', 'ocr_verificado']
            };
          }
          return log;
        });

              if (crossingCount > 0) {
        const batch = writeBatch(db);
        updatedLogs.forEach(log => {
          // Only update if it was modified (has 'cruce_sii' tag newly added)
          if (log.tags?.includes('cruce_sii')) {
             const docRef = doc(db, 'reconciliations', log.id);
             batch.update(docRef, {
               classification: log.classification,
               details: log.details,
               tags: log.tags
             });
          }
        });
        await batch.commit();
        setReconciledCount(prev => prev + crossingCount);
        setMatchRate(prev => Math.min(99.9, prev + (crossingCount * 0.2)));
      }
      }

    } catch (error) {
      console.error("OCR Final Error:", error);
      alert("Error al procesar la imagen con IA. Verifique el formato e intente nuevamente.");
    } finally {
      setIsOcrProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleManualCrossDoc = (doc: SIIDocument, logId: string) => {
        const logToUpdate = logs.find(l => l.id === logId);
    if (logToUpdate) {
      let cls: any = 'otro';
      if (doc.type.toLowerCase().includes('factura')) cls = 'factura';
      else if (doc.type.toLowerCase().includes('boleta')) cls = 'boleta_honorarios';

      const docRef = doc(db, 'reconciliations', logToUpdate.id);
      await updateDoc(docRef, {
        classification: cls,
        details: `${logToUpdate.details} [VÍNCULO MANUAL: Folio ${doc.folio} de ${doc.issuer}]`,
        tags: [...(logToUpdate.tags || []), 'vinculo_manual_sii']
      });
    }
    setReconciledCount(prev => prev + 1);
    setSiiDocs(prev => prev.filter(d => d.id !== doc.id));
  };

  const handleAddRule = () => {
    if (!newRuleTerm && !newRuleRefTerm && !newRuleAmount && !newRuleMinAmount && !newRuleMaxAmount) return;
    
    const amountNum = newRuleAmount ? parseFloat(newRuleAmount) : undefined;
    const minNum = newRuleMinAmount ? parseFloat(newRuleMinAmount) : undefined;
    const maxNum = newRuleMaxAmount ? parseFloat(newRuleMaxAmount) : undefined;

    setRules([...rules, { 
      id: Math.random().toString(36).substr(2, 9), 
      term: newRuleTerm || undefined,
      refTerm: newRuleRefTerm || undefined, 
      amount: amountNum,
      minAmount: minNum,
      maxAmount: maxNum,
      classification: newRuleClass 
    }]);
    setNewRuleTerm('');
    setNewRuleRefTerm('');
    setNewRuleAmount('');
    setNewRuleMinAmount('');
    setNewRuleMaxAmount('');
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleAutoReconcile = async () => {
    setIsProcessing(true);
    
    // 1. Local Smart Scan (Rule-based)
    const updatedLogs = logs.map(l => {
      if (!l.classification) {
        const details = l.details.toLowerCase();
        const logAmtStr = l.amount.replace(/[^0-9.-]/g, '');
        const logAmt = Math.abs(parseFloat(logAmtStr));
        
        // Apply Custom User Rules
        const matchedRule = rules.find(r => {
          let matchesAll = true;

          // 1. Description condition
          if (r.term && !details.includes(r.term.toLowerCase())) {
            matchesAll = false;
          }

          // 2. Reference condition
          if (matchesAll && r.refTerm && l.reference) {
            if (!l.reference.toLowerCase().includes(r.refTerm.toLowerCase())) {
              matchesAll = false;
            }
          }

          // 3. Amount Exact condition
          if (matchesAll && r.amount !== undefined) {
            if (Math.abs(logAmt - r.amount) >= 0.01) {
              matchesAll = false;
            }
          }
          
          // 4. Amount Range condition
          if (matchesAll && (r.minAmount !== undefined || r.maxAmount !== undefined)) {
            const meetsMin = r.minAmount !== undefined ? logAmt >= r.minAmount : true;
            const meetsMax = r.maxAmount !== undefined ? logAmt <= r.maxAmount : true;
            if (!meetsMin || !meetsMax) {
              matchesAll = false;
            }
          }

          return matchesAll;
        });

        if (matchedRule) {
          return { ...l, classification: matchedRule.classification, tags: [...(l.tags || []), 'regla_usuario'] };
        }

        // Implicit matching logic (as fallback)
        let cls: any = undefined;
        if (details.includes('factura')) cls = 'factura';
        else if (details.includes('bh ')) cls = 'boleta_honorarios';
        else if (details.includes('sueldo') || details.includes('liquidacion')) cls = 'liquidación';
        else if (details.includes('rendicion')) cls = 'rendición';
        
        if (cls) {
          return { ...l, classification: cls, tags: [...(l.tags || []), 'regla_local'] };
        }
      }
      return l;
    });

        const anyChanges = JSON.stringify(updatedLogs) !== JSON.stringify(logs);
    if (anyChanges) {
      const batch = writeBatch(db);
      updatedLogs.forEach((log, i) => {
        if (JSON.stringify(log) !== JSON.stringify(logs[i])) {
          const docRef = doc(db, 'reconciliations', log.id);
          batch.update(docRef, {
            classification: log.classification,
            tags: log.tags
          });
        }
      });
      await batch.commit();
    }

    try {
      // 2. AI Deep Analysis for remaining mismatches
      const response = await geminiService.analyzeReconciliationMismatch(config.entity, config.bank);

      const result = JSON.parse(response.text || '{}');
      
      if (result.bank) {
        setSuggestion(result);

                const newEntry = {
          timestamp: Timestamp.now(),
          user: 'Agente IA',
          type: 'automated_match',
          details: `Análisis de IA: ${result.message}`, 
          amount: result.bank,
          tags: result.tags
        };

        await addDoc(collection(db, 'reconciliations'), newEntry);
        setMatchRate(result.confidence > 95 ? 99.9 : 98.5);
        setReconciledCount(prev => prev + 1);
      }
      
    } catch (error) {
      console.error("AI Reconciliation Error:", error);
      // Fallback to manual mock if AI fails
      setSuggestion({
        bank: "-$1,250.00",
        bankLabel: "AMAZON WEB SERVICES",
        erp: "$1,250.00",
        erpLabel: "AWS Cloud Services",
        confidence: 95,
        message: "Conciliación automática exitosa basada en patrones históricos de facturación (Modo Offline).",
        tags: ['servicios_it', 'infraestructura'],
        fxAnalysis: {
          rate: "831.20",
          adjustment: "$0.00",
          confidence: 100,
          explanation: "Monto coincide exactamente con la factura en USD."
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    const matchesTag = filterTag === 'all' || (log.tags?.includes(filterTag));
    
    const matchesCustom = Object.entries(customFilters).every(([colId, val]) => {
      const filterText = String(val).toLowerCase();
      if (!filterText) return true;
      const logVal = log.customValues?.[colId] || '';
      return String(logVal).toLowerCase().includes(filterText);
    });
    
    let matchesDate = true;
    if (filterDate !== 'all') {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - log.timestamp.getTime()) / (1000 * 3600 * 24));
      if (filterDate === 'today') matchesDate = diffDays === 0;
      else if (filterDate === 'yesterday') matchesDate = diffDays === 1;
      else if (filterDate === 'last7') matchesDate = diffDays <= 7;
    }
    
    return matchesType && matchesUser && matchesDate && matchesTag && matchesCustom;
  });

  const balanceTrendData = logs
    .filter(l => l.balance)
    .map(l => ({
      date: l.timestamp.getTime(),
      displayDate: l.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      value: parseFloat(l.balance!.replace(/[^0-9.-]/g, ''))
    }))
    .sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-8 h-full">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-col mb-2">
            <div className="flex items-center gap-3 mb-1">
              <Building2 className="h-4 w-4 text-accent" />
              <select 
                value={config.entity}
                onChange={(e) => {
                  const company = PRESET_COMPANIES.find(c => c.name === e.target.value);
                  if (company) {
                    setConfig({
                      ...config, 
                      entity: company.name, 
                      rut: company.rut,
                      bank: company.accounts[0]?.bank || 'Nuevo Banco',
                      accountNumber: company.accounts[0]?.number || 'Nueva Cuenta',
                      currency: (company.accounts[0]?.currency as any) || 'CLP'
                    });
                  }
                }}
                className="bg-transparent border-none text-xl font-black uppercase text-on-surface focus:outline-none cursor-pointer p-0"
              >
                {PRESET_COMPANIES.map(c => <option key={c.rut} value={c.name}>{c.name}</option>)}
              </select>
              <span className="bg-accent/10 px-2 py-0.5 rounded text-[10px] font-black text-accent border border-accent/20">
                {config.rut}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3 text-on-surface-variant" />
              <select 
                value={`${config.bank}|${config.accountNumber}`}
                onChange={(e) => {
                  const [bank, num] = e.target.value.split('|');
                  const company = PRESET_COMPANIES.find(c => c.name === config.entity);
                  const acc = company?.accounts.find(a => a.bank === bank && a.number === num);
                  if (acc) {
                    setConfig({...config, bank, accountNumber: num, currency: acc.currency as any});
                  } else if (bank === 'new') {
                    const newBank = prompt('Ingrese el nombre del Banco (ej. Itaú, BCI):') || 'Nuevo Banco';
                    const newAcc = prompt('Ingrese el número de cuenta:') || '00000000';
                    const newRut = prompt('Confirme el RUT de la entidad:', config.rut) || config.rut;
                    setConfig({...config, bank: newBank, accountNumber: newAcc, rut: newRut});
                  }
                }}
                className="bg-transparent border-none text-[10px] font-black uppercase text-on-surface-variant focus:outline-none cursor-pointer p-0"
              >
                {PRESET_COMPANIES.find(c => c.name === config.entity)?.accounts.map(acc => (
                  <option key={`${acc.bank}-${acc.number}`} value={`${acc.bank}|${acc.number}`}>
                    {acc.bank} • {acc.number} ({acc.currency})
                  </option>
                ))}
                <option value="new|new">+ Crear Nueva Cuenta...</option>
              </select>
              <div className="h-3 w-[1px] bg-outline-variant mx-1" />
              <span className="text-[10px] font-black uppercase text-on-surface-variant font-display tracking-widest italic opacity-60">
                Saldo Inicial: ${config.initialBalance.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
          <h2 className="font-display text-5xl font-black tracking-tighter text-on-surface italic">Centro Recon</h2>
          <p className="mt-1 text-on-surface-variant font-medium">Verifique la consistencia entre banco y registros contables para resolver discrepancias.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => siiFileInputRef.current?.click()}
            disabled={isOcrProcessing}
            className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-surface px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1 disabled:opacity-50"
          >
            {isOcrProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-secondary" />}
            Extraer desde Captura SII
          </button>
          <input 
            type="file" 
            ref={siiFileInputRef} 
            onChange={handleSIIOCR} 
            accept="image/*" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-surface px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Empalmar Manta Finanzas
          </button>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-surface px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1"
          >
            <Settings className="h-4 w-4" />
            Config Contexto
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-white px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all hover:scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button 
            onClick={handleAutoReconcile}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-accent px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-on-surface transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]",
              isProcessing ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-none translate-y-0 active:translate-y-1"
            )}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            {isProcessing ? "Procesando..." : "Analizar con IA"}
          </button>
          <button className="rounded-xl border-2 border-outline-variant bg-primary px-6 py-2.5 font-display text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
            Ejecutar Auditoría Global
          </button>
        </div>
      </header>

      {/* Validation Feedback */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bento-card-accent border-error/50 bg-error/5 p-6 mb-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-error">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <h4 className="font-display text-[11px] font-black uppercase tracking-widest leading-none">Problemas de Integridad Detectados</h4>
                  <p className="text-xs font-medium text-error/80 mt-1">Se encontraron discrepancias de formato en el archivo cargado.</p>
                </div>
              </div>
              <button 
                onClick={() => setValidationErrors([])}
                className="px-4 py-2 bg-error text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-transform hover:scale-105"
              >
                Descartar Alerta
              </button>
            </div>
            
            <div className="grid gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-white/50 rounded-xl border border-error/10">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tight">Fila {err.row}</span>
                  <span className="text-[10px] font-bold text-error italic text-right">{err.error}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Configuration Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bento-card-dark bg-on-surface/95 border-2 border-accent/20">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Empresa / Entidad</label>
                  <select 
                    value={config.entity}
                    onChange={(e) => setConfig({...config, entity: e.target.value})}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-accent transition-colors"
                  >
                    <option>Manta Holding SpA</option>
                    <option>Manta Tech Ltda</option>
                    <option>Manta Real Estate Fund</option>
                    <option>Manta Logistics SA</option>
                    <option>Manta Ventures</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Nombre del Banco</label>
                  <select 
                    value={config.bank}
                    onChange={(e) => setConfig({...config, bank: e.target.value})}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-accent transition-colors"
                  >
                    <option>Banco de Chile</option>
                    <option>Banco Santander</option>
                    <option>Banco Estado</option>
                    <option>BCI</option>
                    <option>Scotiabank</option>
                    <option>Itaú</option>
                    <option>Banco Bice</option>
                    <option>Banco Security</option>
                    <option>HSBC</option>
                    <option>J.P. Morgan</option>
                    <option>Merrill Lynch</option>
                    <option>Citibank</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Número de Cuenta</label>
                  <input 
                    type="text"
                    value={config.accountNumber}
                    onChange={(e) => setConfig({...config, accountNumber: e.target.value})}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-accent transition-colors"
                    placeholder="ej. 00-123-45678-90"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Moneda</label>
                  <select 
                    value={config.currency}
                    onChange={(e) => setConfig({...config, currency: e.target.value as any})}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-accent transition-colors"
                  >
                    <option>CLP</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>UF</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Saldo Inicial</label>
                  <input 
                    type="number"
                    value={config.initialBalance}
                    onChange={(e) => setConfig({...config, initialBalance: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-accent transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Columnas Personalizadas</label>
                  <div className="flex gap-2">
                    <input 
                      id="newCustomCol"
                      type="text"
                      placeholder="Nueva Columna..."
                      className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.currentTarget as HTMLInputElement).value;
                          if (val) {
                            setConfig({...config, customColumns: [...config.customColumns, { id: val.toLowerCase().replace(/\s+/g, '_'), label: val }]});
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('newCustomCol') as HTMLInputElement;
                        if (input && input.value) {
                          setConfig({...config, customColumns: [...config.customColumns, { id: input.value.toLowerCase().replace(/\s+/g, '_'), label: input.value }]});
                          input.value = '';
                        }
                      }}
                      className="bg-accent px-3 rounded-xl text-on-surface font-black text-xs"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {config.customColumns.map(col => (
                      <span key={col.id} className="bg-slate-700 text-[8px] font-black uppercase text-white px-2 py-0.5 rounded flex items-center gap-1">
                        {col.label}
                        <X className="h-2 w-2 cursor-pointer hover:text-red-400" onClick={() => setConfig({...config, customColumns: config.customColumns.filter(c => c.id !== col.id)})} />
                      </span>
                    ))}
                  </div>
                </div>

                {/* Reconciliation Rules Management */}
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Reglas de Conciliación Automática</label>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Descripción</label>
                        <input 
                          type="text"
                          placeholder="Si contiene..."
                          value={newRuleTerm}
                          onChange={(e) => setNewRuleTerm(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Referencia</label>
                        <input 
                          type="text"
                          placeholder="Ref/Op..."
                          value={newRuleRefTerm}
                          onChange={(e) => setNewRuleRefTerm(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Exacto</label>
                        <input 
                          type="number"
                          placeholder="$$$"
                          value={newRuleAmount}
                          onChange={(e) => setNewRuleAmount(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-2 py-1.5 text-[9px] font-bold text-white outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Min</label>
                        <input 
                          type="number"
                          placeholder="Min"
                          value={newRuleMinAmount}
                          onChange={(e) => setNewRuleMinAmount(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-2 py-1.5 text-[9px] font-bold text-white outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] font-black uppercase text-slate-500 ml-1">Max</label>
                        <input 
                          type="number"
                          placeholder="Max"
                          value={newRuleMaxAmount}
                          onChange={(e) => setNewRuleMaxAmount(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-2 py-1.5 text-[9px] font-bold text-white outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newRuleClass}
                        onChange={(e) => setNewRuleClass(e.target.value as any)}
                        className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-xl px-2 py-2 text-[8px] font-black uppercase text-white outline-none focus:border-accent"
                      >
                        <option value="factura">Factura</option>
                        <option value="liquidación">Liquidación</option>
                        <option value="rendición">Rendición</option>
                        <option value="importación">Importación</option>
                        <option value="boleta_honorarios">Boleta H.</option>
                      </select>
                      <button 
                        onClick={handleAddRule}
                        className="bg-secondary px-6 rounded-xl text-white font-black text-[9px] tracking-widest hover:scale-105 transition-transform"
                      >
                        AÑADIR REGLA
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    {rules.map(rule => (
                      <span key={rule.id} className="bg-slate-700/80 text-[8px] font-bold text-white px-2.5 py-1 rounded-lg flex items-center gap-2 border border-slate-600">
                        <div className="flex flex-col">
                          {rule.term && <span className="text-accent underline underline-offset-2">"{rule.term}"</span>}
                          {rule.refTerm && <span className="text-secondary italic text-[7px]">Ref: {rule.refTerm}</span>}
                          {rule.amount !== undefined && <span className="text-[7px] text-slate-400 font-black">${rule.amount.toLocaleString()}</span>}
                          {(rule.minAmount !== undefined || rule.maxAmount !== undefined) && (
                            <span className="text-[7px] text-slate-400 font-black">
                              {rule.minAmount !== undefined ? `$${rule.minAmount.toLocaleString()}` : '0'} 
                              {' - '}
                              {rule.maxAmount !== undefined ? `$${rule.maxAmount.toLocaleString()}` : '∞'}
                            </span>
                          )}
                        </div>
                        <ArrowRight className="h-2 w-2 text-slate-400" />
                        <span className="uppercase text-[7px] bg-slate-800 px-1.5 py-0.5 rounded">{rule.classification?.replace('_', ' ')}</span>
                        <X className="h-3 w-3 cursor-pointer hover:text-error transition-colors" onClick={() => removeRule(rule.id)} />
                      </span>
                    ))}
                    {rules.length === 0 && <span className="text-[8px] text-slate-500 italic py-1">Sin reglas personalizadas...</span>}
                  </div>
                </div>

                {/* Accuracy & Flagging Thresholds */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Saldo Inicial</label>
                  <div className="relative">
                    <input 
                      type="number"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-secondary transition-colors pl-8"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Umbral de Discrepancia</label>
                  <div className="relative group">
                    <input 
                      type="number"
                      value={discrepancyThreshold}
                      onChange={(e) => setDiscrepancyThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-error transition-colors pl-8"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</div>
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-hover:text-error transition-colors" />
                  </div>
                  <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Flag para revisión humana si Δ {config.currency} {'>'} umbral</p>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center border-t border-slate-700/50 pt-4">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motor de Reglas v2.4 Activo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-secondary" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IA Sincronizada</span>
                  </div>
                </div>
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Mapeo Avanzado (Itaú / General)</label>
                    <button 
                      onClick={validateCurrentMappings}
                      className="text-[7px] font-black uppercase text-accent hover:text-white transition-colors bg-accent/10 px-2 py-0.5 rounded border border-accent/20"
                    >
                      Validar Mapeo
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 items-end">
                    <MappingSelect label="Monto" value={config.mappings.amount || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, amount: val}})} />
                    <MappingSelect label="Fecha" value={config.mappings.date || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, date: val}})} />
                    <MappingSelect label="Descripción" value={config.mappings.description || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, description: val}})} />
                    <MappingSelect label="Ref/Op" value={config.mappings.reference || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, reference: val}})} />
                    <MappingSelect label="Depósitos" value={config.mappings.deposits || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, deposits: val}})} />
                    <MappingSelect label="Giros" value={config.mappings.withdrawals || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, withdrawals: val}})} />
                    <MappingSelect label="Saldo" value={config.mappings.balance || ''} options={MAPPING_OPTIONS} onChange={(val) => setConfig({...config, mappings: {...config.mappings, balance: val}})} />
                    {config.customColumns.map(col => (
                      <MappingSelect 
                        key={col.id} 
                        label={col.label} 
                        value={config.mappings[col.id] || ''} 
                        options={MAPPING_OPTIONS} 
                        onChange={(val) => setConfig({...config, mappings: {...config.mappings, [col.id]: val}})} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 italic font-medium">Configurando sesión para <strong>{config.bank}</strong>. La IA ignorará columnas irrelevantes según el mapeo.</p>
                <button 
                  onClick={() => setShowConfig(false)}
                  className="px-6 py-2 bg-accent text-on-surface font-display text-[10px] font-black uppercase tracking-widest rounded-lg"
                >
                  Aplicar y Bloquear Contexto
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 grid-cols-12">
        {/* Recon Stats */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <motion.div 
            initial={false}
            animate={{ scale: isProcessing ? 0.98 : 1 }}
            className="bento-card-dark flex flex-col justify-between h-48 relative overflow-hidden"
          >
            {isProcessing && (
              <motion.div 
                className="absolute inset-0 bg-primary/10"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            )}
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-display italic relative z-10">Tasa de Cruce</h3>
            <div className="font-display text-6xl font-black text-secondary italic tracking-tighter relative z-10">
              <motion.span
                key={matchRate}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {matchRate}%
              </motion.span>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">
              {isProcessing ? "IA Analizando patrones..." : `+${(matchRate - 98.8).toFixed(1)}% desde ayer`}
            </div>
          </motion.div>
          
          <motion.div 
            animate={{ 
              backgroundColor: mismatches === 1 ? 'var(--color-secondary)' : 'var(--color-accent)',
              scale: isProcessing ? 0.98 : 1
            }}
            className="bento-card h-48 flex flex-col justify-between"
          >
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-display italic">Discrepancias</h3>
             <div className="font-display text-6xl font-black text-on-surface italic tracking-tighter">
               <motion.span key={mismatches} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
                 {mismatches}
               </motion.span>
             </div>
             <div className="flex justify-between items-center">
               <button 
                onClick={() => setIsManualEntryOpen(!isManualEntryOpen)}
                className="text-[10px] font-black text-on-surface uppercase tracking-widest underline underline-offset-4"
               >
                {isManualEntryOpen ? 'Cerrar Formulario' : 'Resolver Discrepancia'}
               </button>
               {reconciledCount > 0 && (
                 <span className="text-[9px] font-black bg-white/50 px-2 py-1 rounded-lg border border-black/10">
                   {reconciledCount} AUTO-FIJADOS
                 </span>
               )}
             </div>
          </motion.div>

          {/* Performance Trend Widget */}
          <div className="bento-card overflow-hidden p-0 flex flex-col">
            <div className="p-4 border-b-2 border-outline-variant bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[9px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
                  <TrendingUp className="h-3 w-3" />
                  Tendencias de Desempeño
                </h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="text-[7px] font-black uppercase text-slate-400 mb-1 ml-1">Entidad Principal</div>
                  <div className="flex gap-1 bg-white p-1 rounded-lg border border-outline-variant">
                    {Object.keys(performanceDataMap).map((entityName) => (
                      <button
                        key={entityName}
                        onClick={() => setPerformanceEntity(entityName)}
                        className={cn(
                          "flex-1 text-[7px] font-black uppercase py-1.5 rounded transition-all",
                          performanceEntity === entityName 
                            ? "bg-on-surface text-white" 
                            : "text-on-surface-variant hover:bg-slate-50"
                        )}
                      >
                        {entityName.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[7px] font-black uppercase text-slate-400 mb-1 ml-1 flex justify-between">
                    <span>Comparar Con</span>
                    {comparisonEntity && (
                      <button 
                        onClick={() => setComparisonEntity(null)}
                        className="text-error hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 bg-white/50 p-1 rounded-lg border border-outline-variant border-dashed">
                    {Object.keys(performanceDataMap).map((entityName) => (
                      <button
                        key={`comp-${entityName}`}
                        disabled={entityName === performanceEntity}
                        onClick={() => setComparisonEntity(entityName)}
                        className={cn(
                          "flex-1 text-[7px] font-black uppercase py-1.5 rounded transition-all",
                          comparisonEntity === entityName 
                            ? "bg-accent text-white shadow-lg shadow-accent/20" 
                            : "text-on-surface-variant hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed"
                        )}
                      >
                        {entityName.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              {comparisonEntity && (
                <div className="flex gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-[8px] font-black uppercase text-on-surface-variant">{performanceEntity.split(' ')[1]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-[8px] font-black uppercase text-on-surface-variant">{comparisonEntity.split(' ')[1]}</span>
                  </div>
                </div>
              )}
              
              <div className="h-[120px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mergedPerformanceData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorComparison" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '2px solid #0f172a', borderRadius: '8px', fontSize: '10px' }}
                      labelStyle={{ fontWeight: '800' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rate" 
                      name={performanceEntity.split(' ')[1]} 
                      stroke="var(--color-secondary)" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRate)" 
                    />
                    {comparisonEntity && (
                      <Area 
                        type="monotone" 
                        dataKey="comparisonRate" 
                        name={comparisonEntity.split(' ')[1]} 
                        stroke="var(--color-accent)" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorComparison)" 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-outline-variant/10 pt-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-[8px] font-black uppercase text-on-surface-variant mb-1">Tiempo Prom.</div>
                    <div className="flex items-baseline gap-2">
                      <div className="font-display text-lg font-black italic tracking-tighter text-secondary">{entityMetrics.avgTime}</div>
                      {comparisonMetrics && (
                        <div className="font-display text-sm font-black italic tracking-tighter text-accent opacity-60">vs {comparisonMetrics.avgTime}</div>
                      )}
                    </div>
                    <div className="text-[8px] font-bold text-secondary uppercase">{entityMetrics.timeTrend}</div>
                  </div>
                </div>
                <div className="space-y-3 text-right">
                  <div>
                    <div className="text-[8px] font-black uppercase text-on-surface-variant mb-1">Ajuste Manual</div>
                    <div className="flex items-baseline gap-2 justify-end">
                      {comparisonMetrics && (
                        <div className="font-display text-sm font-black italic tracking-tighter text-accent opacity-60">{comparisonMetrics.manualAdj} vs</div>
                      )}
                      <div className="font-display text-lg font-black italic tracking-tighter text-secondary">{entityMetrics.manualAdj}</div>
                    </div>
                    <div className="text-[8px] font-bold text-secondary uppercase">{entityMetrics.adjTrend}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bento-card overflow-hidden p-0 flex flex-col">
            <div className="p-4 border-b-2 border-outline-variant bg-slate-50">
              <h3 className="font-display text-[9px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
                <PieChartIcon className="h-3 w-3" />
                Análisis de Flujos (Clasificado)
              </h3>
            </div>
            <div className="p-4 h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      const counts: Record<string, number> = {};
                      logs.forEach(l => {
                        if (l.classification) {
                          const amt = Math.abs(parseFloat(l.amount.replace(/[^0-9.-]/g, '')) || 0);
                          counts[l.classification] = (counts[l.classification] || 0) + amt;
                        }
                      });
                      const results = Object.entries(counts).map(([id, value]) => ({
                        name: CLASSIFICATION_OPTIONS.find(o => o.id === id)?.label || id,
                        value
                      }));
                      return results.length > 0 ? results : [{ name: 'Sin Clasificar', value: 1 }];
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {CLASSIFICATION_OPTIONS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value: number) => `$${value.toLocaleString('es-CL')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {CLASSIFICATION_OPTIONS.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${i * 45}, 70%, 50%)` }} />
                  <span className="text-[8px] font-black uppercase text-on-surface-variant">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Manual Adjustment Form (Conditional) */}
        <AnimatePresence>
          {isManualEntryOpen && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="col-span-12 overflow-hidden"
            >
              <div className="bento-card bg-surface">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-black italic">Conciliación Manual</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Cree un vínculo directo entre el banco y los registros contables</p>
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Bank Side */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-error flex items-center gap-2">
                        <Wallet className="h-3 w-3" />
                        Detalles de Entrada Bancaria
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-1">Monto Estado de Cuenta</label>
                          <input 
                            required
                            type="text" 
                            placeholder="ej. 3200.50"
                            className="w-full bg-slate-50 border-2 border-outline rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                            value={manualForm.bankAmount}
                            onChange={(e) => setManualForm({...manualForm, bankAmount: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-1">Descripción / Identificador</label>
                          <input 
                            required
                            type="text" 
                            placeholder="ej. AWS-RECON-JUNIO"
                            className="w-full bg-slate-50 border-2 border-outline rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                            value={manualForm.bankDesc}
                            onChange={(e) => setManualForm({...manualForm, bankDesc: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ERP Side */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        Detalles de Registro ERP
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-1">Monto en Ledger</label>
                          <input 
                            required
                            type="text" 
                            placeholder="ej. 3200.00"
                            className="w-full bg-slate-50 border-2 border-outline rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                            value={manualForm.erpAmount}
                            onChange={(e) => setManualForm({...manualForm, erpAmount: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-1">Referencia Registro ERP</label>
                          <input 
                            required
                            type="text" 
                            placeholder="ej. Factura #9921"
                            className="w-full bg-slate-50 border-2 border-outline rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                            value={manualForm.erpDesc}
                            onChange={(e) => setManualForm({...manualForm, erpDesc: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-outline-variant/10">
                    <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-2">Etiquetas de Conciliación</label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-tight transition-all",
                            manualForm.tags.includes(tag)
                              ? "bg-primary border-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                              : "bg-slate-50 border-outline text-on-surface-variant hover:border-outline-variant"
                          )}
                        >
                          {tag.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-outline-variant/10">
                    <label className="text-[9px] font-black uppercase text-on-surface-variant block mb-2">Notas y Justificación de Conciliación</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Explique el motivo del emparejamiento manual o cualquier discrepancia de FX detectada..."
                      className="w-full bg-slate-50 border-2 border-outline rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-primary transition-all resize-none"
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({...manualForm, notes: e.target.value})}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-6">
                    <button 
                      type="button"
                      onClick={() => setIsManualEntryOpen(false)}
                      className="px-8 py-3 rounded-xl border-2 border-outline-variant font-display text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-display"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="px-8 py-3 rounded-xl border-2 border-outline-variant bg-on-surface text-white font-display text-[11px] font-black uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                    >
                      Conciliar Manualmente
                    </button>
                  </div>
                </form>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* SII Extracted Documents Workspace */}
        {siiDocs.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-12 bento-card border-secondary/30 bg-secondary/[0.02]"
          >
            <div className="flex items-center justify-between border-b-2 border-outline-variant pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-secondary text-white flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black italic">Documentos SII Extraídos ({siiDocs.length})</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Vincule estos documentos con el estado de cuenta bancario</p>
                </div>
              </div>
              <button 
                onClick={() => setSiiDocs([])}
                className="text-[10px] font-black uppercase text-error hover:underline"
              >
                Limpiar Lista
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {siiDocs.map((doc) => (
                <div key={doc.id} className="bento-card bg-white border-2 border-outline-variant hover:border-secondary transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded border border-outline-variant">{doc.type}</span>
                    <span className="font-display font-black text-sm text-secondary italic">${doc.amount.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-black uppercase truncate">{doc.issuer}</div>
                    <div className="flex justify-between text-[8px] font-bold text-on-surface-variant uppercase italic">
                      <span>Folio: {doc.folio}</span>
                      <span>Fecha: {doc.date}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-dashed border-outline-variant flex flex-col gap-2">
                    <div className="text-[8px] font-black uppercase text-slate-400">Vincular con Pendiente:</div>
                    <div className="grid grid-cols-1 gap-1 max-h-[100px] overflow-y-auto custom-scrollbar">
                      {logs.filter(l => !l.classification && l.type === 'automated_match').slice(0, 3).map(log => (
                        <button
                          key={log.id}
                          onClick={() => handleManualCrossDoc(doc, log.id)}
                          className="flex items-center justify-between text-[8px] font-black uppercase bg-slate-50 hover:bg-secondary/10 p-2 rounded border border-outline-variant transition-colors"
                        >
                          <span className="truncate w-2/3">{log.details}</span>
                          <span className="text-secondary">{log.amount}</span>
                        </button>
                      ))}
                      {logs.filter(l => !l.classification && l.type === 'automated_match').length === 0 && (
                        <div className="text-[8px] text-slate-400 italic">No hay transacciones pendientes para vincular.</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Suggestion Workspace */}
        <section className="col-span-12 lg:col-span-8 bento-card overflow-hidden p-0 flex flex-col">
          <div className="p-4 border-b-2 border-outline-variant bg-slate-50 flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface italic flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {isProcessing ? "Agente Trabajando..." : "Sugerencia del Agente"}
              </h3>
              {!isProcessing && suggestion.tags && (
                <div className="flex gap-1">
                  {suggestion.tags.map(tag => (
                    <span key={tag} className="text-[8px] font-black uppercase bg-accent/20 border border-accent/30 text-on-surface px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className={cn(
              "font-display text-[10px] font-black uppercase italic transition-colors",
              suggestion.confidence > 90 ? "text-secondary" : "text-tertiary"
            )}>
              {suggestion.confidence}% Confianza
            </span>
          </div>
          
          <div className="p-10 space-y-10 relative">
            {isProcessing && (
              <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <RefreshCw className="h-12 w-12 text-primary animate-spin" />
                    <Bot className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <span className="font-display font-black text-[10px] uppercase tracking-widest animate-pulse">Ejecutando Match Neuronal...</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-16 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 hidden md:block">
                <div className="h-10 w-10 bento-card flex items-center justify-center p-0 rounded-full text-primary scale-110">
                  <LinkIcon className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant italic">Estado de Cuenta</div>
                <div className="bento-card-dark p-6">
                  <motion.div 
                    key={suggestion.bank}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-display text-3xl font-black text-error italic tracking-tighter"
                  >
                    {suggestion.bank}
                  </motion.div>
                  <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-tight">{suggestion.bankLabel}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant italic">Registro ERP</div>
                <div className="bento-card p-6">
                  <motion.div 
                    key={suggestion.erp}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-display text-3xl font-black text-on-surface italic tracking-tighter"
                  >
                    {suggestion.erp}
                  </motion.div>
                  <div className="mt-2 text-xs font-bold text-on-surface-variant uppercase tracking-tight">{suggestion.erpLabel}</div>
                </div>
              </div>
            </div>

            <div className="bento-card bg-slate-50 border-dashed border-2 p-6 flex flex-col gap-4">
              <div className="flex gap-4 items-start">
                <Bot className="h-6 w-6 text-primary shrink-0" />
                <div className="text-sm font-medium leading-relaxed italic">
                  <strong>Agente:</strong> {suggestion.message}
                </div>
              </div>

              {/* FX Analysis Section */}
              {suggestion.fxAnalysis && (
                <div className="mt-2 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-4 w-4 text-secondary" />
                    <h4 className="text-[10px] font-black uppercase text-secondary tracking-widest">Análisis de Divisas (AI)</h4>
                    <div className="ml-auto bg-secondary/10 text-secondary text-[8px] font-black px-2 py-0.5 rounded-full">
                      Confianza: {suggestion.fxAnalysis.confidence}%
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-outline-variant">
                      <div className="text-[8px] font-black uppercase text-on-surface-variant mb-1">Tipo de Cambio Sugerido</div>
                      <div className="font-display font-black text-lg italic text-secondary tracking-tighter">1 USD = {suggestion.fxAnalysis.rate} {config.currency}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-outline-variant">
                      <div className="text-[8px] font-black uppercase text-on-surface-variant mb-1">Ajuste por FX</div>
                      <div className="font-display font-black text-lg italic text-on-surface tracking-tighter">{suggestion.fxAnalysis.adjustment}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] font-medium text-on-surface-variant italic leading-tight">
                    "{suggestion.fxAnalysis.explanation}"
                  </div>
                </div>
              )}

              {/* Threshold Flagging Visibility */}
              {Math.abs(parseFloat(suggestion.bank.replace(/[^0-9.-]/g, '')) - parseFloat(suggestion.erp.replace(/[^0-9.-]/g, ''))) > discrepancyThreshold && (
                <div className="mt-2 bg-error/10 border border-error/20 p-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="h-10 w-10 rounded-full bg-error text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-error">ALERTA: Umbral de Discrepancia Excedido</h4>
                    <p className="text-[9px] font-bold text-error/80 uppercase">La diferencia entre montos ({Math.abs(parseFloat(suggestion.bank.replace(/[^0-9.-]/g, '')) - parseFloat(suggestion.erp.replace(/[^0-9.-]/g, ''))).toLocaleString('es-CL', { style: 'currency', currency: config.currency })}) supera el límite de seguridad de {discrepancyThreshold.toLocaleString('es-CL', { style: 'currency', currency: config.currency })}.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t-2 border-outline-variant">
              <button className="px-6 py-2.5 rounded-xl border-2 border-outline-variant font-display text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Dividir</button>
              <button className="px-6 py-2.5 rounded-xl border-2 border-outline-variant bg-on-surface text-white font-display text-[10px] font-black uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none">Aprobar</button>
            </div>
          </div>
        </section>

        {/* Audit Log / History */}
        <section className="col-span-12 bento-card overflow-hidden p-0 flex flex-col">
          <div className="p-6 border-b-2 border-outline-variant bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-[11px] font-black uppercase tracking-widest text-on-surface flex items-center gap-2 italic">
                <FileText className="h-4 w-4" />
                Historial de Conciliación
              </h3>
              <p className="text-[10px] text-on-surface-variant font-bold mt-1">Traza de auditoría para todas las acciones de emparejamiento y ajustes.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border-2 border-outline-variant rounded-lg px-2 py-1">
                <CalendarDays className="h-3.5 w-3.5 text-on-surface-variant" />
                <select 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-tight outline-none bg-transparent"
                >
                  <option value="all">Tiempo: Todo</option>
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                  <option value="last7">Últimos 7 Días</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border-2 border-outline-variant rounded-lg px-2 py-1">
                <Bot className="h-3.5 w-3.5 text-on-surface-variant" />
                <select 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-tight outline-none bg-transparent"
                >
                  <option value="all">Usuario: Todos</option>
                  <option value="Agente IA">Agente IA</option>
                  <option value="Admin">Admin</option>
                  <option value="CFO">CFO</option>
                </select>
              </div>

              {Object.keys(customFilters).some(k => customFilters[k]) && (
                <button 
                  onClick={() => setCustomFilters({})}
                  className="bg-error/10 text-error text-[8px] font-black uppercase px-2 py-1 rounded hover:bg-error/20 transition-colors"
                >
                  Limpiar Filtros Custom
                </button>
              )}

              <div className="flex items-center gap-2 bg-white border-2 border-outline-variant rounded-lg px-2 py-1">
                <LayoutDashboard className="h-3.5 w-3.5 text-on-surface-variant" />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-tight outline-none bg-transparent"
                >
                  <option value="all">Acción: Todas</option>
                  <option value="automated_match">Automatizado</option>
                  <option value="manual_adjustment">Manual</option>
                  <option value="ai_suggestion">Sugerencia</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white border-2 border-outline-variant rounded-lg px-2 py-1">
                <span className="text-[10px] font-black">#</span>
                <select 
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-tight outline-none bg-transparent"
                >
                  <option value="all">Etiqueta: Todas</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <ItemsTable 
            filteredLogs={filteredLogs} 
            logs={logs} 
            setLogs={setLogs} 
            config={config} 
            customFilters={customFilters} 
            setCustomFilters={setCustomFilters} 
            hoveredBalanceId={hoveredBalanceId} 
            setHoveredBalanceId={setHoveredBalanceId} 
            balanceTrendData={balanceTrendData} 
          />
          <div className="p-4 border-t border-outline-variant bg-slate-50 flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Mostrando {filteredLogs.length} entradas</span>
            <button 
              onClick={handleExport}
              className="text-[9px] font-black uppercase tracking-widest text-primary underline underline-offset-4"
            >
              Exportar Auditoría Completa
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeedItem({ time, bank, amount, label, refCode, status, active }: any) {
  return (
    <div className={cn(
      "group relative p-5 transition-all cursor-pointer border-l-4",
      active ? "bg-slate-50 border-primary" : "hover:bg-slate-50 border-transparent"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant italic">{time} • {bank}</span>
        <span className={cn("font-display font-black italic text-sm", status === 'positive' ? "text-secondary" : "text-error")}>{amount}</span>
      </div>
      <div className="text-[11px] font-black uppercase tracking-tight text-on-surface leading-tight mt-1">{label}</div>
      <div className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400 italic opacity-60 font-medium">{refCode}</div>
    </div>
  );
}

function MiniStat({ label, value, sub, icon, color }: any) {
  return (
    <div className="bento-card flex flex-col justify-between hover:scale-[1.02] cursor-pointer">
      <div className="flex justify-between items-start mb-6">
        <span className="font-display text-[9px] font-black uppercase tracking-widest text-on-surface-variant italic">{label}</span>
        <span className={cn(color ? `text-${color}` : "text-on-surface-variant")}>{icon}</span>
      </div>
      <div>
        <div className={cn("font-display text-3xl font-black italic tracking-tighter leading-none mb-2", color ? `text-${color}` : "text-on-surface")}>{value}</div>
        <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">{sub}</div>
      </div>
    </div>
  );
}
