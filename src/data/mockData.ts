export const PRESET_COMPANIES = [
  { name: 'Cramick S.A. - Chile', rut: '76.093.977-3', accounts: [
    { bank: 'ITAU', number: '200359660', currency: 'CLP' as const },
    { bank: 'BCI Chile', number: '46488031', currency: 'CLP' as const },
    { bank: 'BCI Miami', number: '120015230', currency: 'USD' as const }
  ]},
  { name: 'Bedrock S.A.', rut: '96.965.980-8', accounts: [] },
  { name: 'Caelus Motors SpA', rut: '77.608.369-0', accounts: [{ bank: 'ITAU', number: '224430313', currency: 'CLP' as const }] },
  { name: 'Caelus SpA', rut: '76.780.769-4', accounts: [{ bank: 'ITAU', number: '213150658', currency: 'CLP' as const }] },
  { name: 'Consus Latinoamerica SpA', rut: '77.261.734-8', accounts: [
    { bank: 'BCI', number: '63713462', currency: 'CLP' as const },
    { bank: 'ITAU', number: '220803318', currency: 'CLP' as const },
    { bank: 'Santander', number: '89403839', currency: 'CLP' as const }
  ]},
  { name: 'Servicios Informaticos Santiago Tech Spa', rut: '76.369.345-7', accounts: [
    { bank: 'BCI', number: '52633021', currency: 'CLP' as const },
    { bank: 'ITAU', number: '209005479', currency: 'CLP' as const }
  ]}
];

export const LIQUIDITY_TREND = [
  { name: 'Lun', value: 12.4 },
  { name: 'Mar', value: 12.8 },
  { name: 'Mie', value: 13.2 },
  { name: 'Jue', value: 13.1 },
  { name: 'Vie', value: 13.8 },
  { name: 'Sab', value: 14.1 },
  { name: 'Dom', value: 14.25 },
];

export const SENSITIVITY_DATA = [
  { label: '+1% Tasa UF', value: '+ $2.4M', color: 'secondary' },
  { label: '+5% USD/CLP', value: '+ $5.6M', color: 'secondary' },
  { label: '-5% USD/CLP', value: '- $4.8M', color: 'error' },
];

export const MATURITY_DATA = [
  { name: 'M1', dap: 15, ffmm: 10, credit: 5 },
  { name: 'M2', dap: 20, ffmm: 5, credit: 10 },
  { name: 'M3', dap: 12, ffmm: 8, credit: 0 },
  { name: 'M4', dap: 8, ffmm: 5, credit: 15 },
  { name: 'M5', dap: 15, ffmm: 12, credit: 0 },
  { name: 'M6', dap: 25, ffmm: 5, credit: 10 },
  { name: 'M7', dap: 18, ffmm: 15, credit: 5 },
  { name: 'M8', dap: 12, ffmm: 10, credit: 0 },
  { name: 'M9', dap: 8, ffmm: 5, credit: 20 },
  { name: 'M10', dap: 5, ffmm: 15, credit: 0 },
  { name: 'M11', dap: 15, ffmm: 10, credit: 8 },
  { name: 'M12', dap: 15, ffmm: 5, credit: 0 },
];

export const BREAKDOWN_DATA = [
  { name: 'Cta. Cte. A', amount: '120,000.00', status: 'Inmediato', statusColor: 'secondary' },
  { name: 'Cta. Cte. B', amount: '45,500.00', status: 'Inmediato', statusColor: 'secondary' },
  { name: 'DAP 30D', amount: '200,000.00', status: '30 Días', statusColor: 'tertiary' },
  { name: 'FFMM', amount: '86,600.00', status: '24 Horas', statusColor: 'tertiary' },
];

export const PERFORMANCE_DATA_MAP: Record<string, any[]> = {
  'Manta Holding SpA': [
    { date: '04/26', rate: 97.4, manual: 12, time: 45 },
    { date: '04/27', rate: 98.1, manual: 8, time: 38 },
    { date: '04/28', rate: 98.5, manual: 10, time: 35 },
    { date: '04/29', rate: 98.8, manual: 5, time: 28 },
    { date: '04/30', rate: 99.1, manual: 4, time: 22 },
    { date: '05/01', rate: 99.2, manual: 3, time: 18 },
    { date: '05/02', rate: 99.9, manual: 1, time: 12 },
  ],
  'Manta Tech Ltda': [
    { date: '04/26', rate: 92.4, manual: 22, time: 55 },
    { date: '04/27', rate: 93.1, manual: 18, time: 48 },
    { date: '04/28', rate: 94.5, manual: 20, time: 45 },
    { date: '04/29', rate: 95.8, manual: 15, time: 38 },
    { date: '04/30', rate: 96.1, manual: 14, time: 32 },
    { date: '05/01', rate: 96.2, manual: 13, time: 28 },
    { date: '05/02', rate: 97.9, manual: 11, time: 22 },
  ],
  'Manta Real Estate Fund': [
    { date: '04/26', rate: 85.4, manual: 32, time: 75 },
    { date: '04/27', rate: 86.1, manual: 28, time: 68 },
    { date: '04/28', rate: 87.5, manual: 30, time: 65 },
    { date: '04/29', rate: 88.8, manual: 25, time: 58 },
    { date: '04/30', rate: 89.1, manual: 24, time: 52 },
    { date: '05/01', rate: 89.2, manual: 23, time: 48 },
    { date: '05/02', rate: 91.9, manual: 21, time: 42 },
  ]
};

export const ENTITY_METRICS_MAP: Record<string, { avgTime: string; manualAdj: string; timeTrend: string; adjTrend: string }> = {
  'Manta Holding SpA': { avgTime: '18m', manualAdj: '12%', timeTrend: '-6m vs US', adjTrend: '-4% Mejora' },
  'Manta Tech Ltda': { avgTime: '24m', manualAdj: '18%', timeTrend: '-4m vs US', adjTrend: '-2% Mejora' },
  'Manta Real Estate Fund': { avgTime: '42m', manualAdj: '21%', timeTrend: '-8m vs US', adjTrend: '-5% Mejora' }
};

export const INITIAL_LOGS: any[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 3600000 * 2),
    user: 'Agente IA',
    type: 'automated_match',
    classification: 'factura',
    details: 'Identificado emparejamiento para Factura #8842 con línea de estado de cuenta AWS SERVICES.',
    amount: '$3,200.50',
    tags: ['servicios_it', 'suscripcion']
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 3600000 * 24),
    user: 'Admin',
    type: 'manual_adjustment',
    classification: 'liquidación',
    details: 'Ajuste manual para discrepancia de nómina Manta Tech.',
    amount: '$12,400.00',
    tags: ['nomina', 'relacionado_con_impuestos']
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 3600000 * 48),
    user: 'Agente IA',
    type: 'automated_match',
    classification: 'rendición',
    details: 'Conciliación por lotes de 15 entradas para Manta Real Estate.',
    amount: '$45,000.00',
    tags: ['transferencia_interna', 'liquidacion']
  }
];

export const LIQUIDITY_PROJECTION = [
  { day: 0, value: 80 },
  { day: 15, value: 70 },
  { day: 30, value: 85 },
  { day: 42, value: 45 },
  { day: 45, value: 42 },
  { day: 60, value: 88 },
  { day: 75, value: 95 },
  { day: 90, value: 82 },
];
