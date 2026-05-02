const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Rename buttons to match user request
content = content.replace(/Auto-Reconcile with AI/, "Analizar con IA");
content = content.replace(/Procesar Emparejamiento Manual/, "Conciliar Manualmente");

// 2. Update handleAutoReconcile to use "Analizar" terminology in logs
content = content.replace(
  /details: `Sugerencia de IA generada: \${result\.message}`,/,
  "details: `Análisis de IA: ${result.message}`, "
);

// 3. Add handleApproveSuggestion function
const handleApproveSuggestionCode = `  const handleApproveSuggestion = async () => {
    if (!suggestion || !suggestion.bank) return;

    const newEntry = {
      timestamp: Timestamp.now(),
      user: 'Admin',
      type: 'manual_adjustment',
      details: \`Conciliación Sugerida Aprobada: \${suggestion.message}\`,
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
`;

// Insert it before the return of ReconciliationView
content = content.replace(/  return \(/, `${handleApproveSuggestionCode}\n  return (`);

// 4. Link "Aprobar" button to handleApproveSuggestion and rename to "Conciliar"
content = content.replace(
  /<button className="px-6 py-2\.5 rounded-xl border-2 border-outline-variant bg-on-surface text-white font-display text-[10px] font-black uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-all shadow-\[4px_4px_0px_0px_rgba\(0,0,0,0.1\)\] hover:shadow-none">Aprobar<\/button>/,
  `<button onClick={handleApproveSuggestion} className="px-6 py-2.5 rounded-xl border-2 border-outline-variant bg-on-surface text-white font-display text-[10px] font-black uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none">Conciliar Sugerencia</button>`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Renaming and action logic updated");
