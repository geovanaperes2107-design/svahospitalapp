
import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity, Scissors, CheckCircle2, Clock, Scale, XCircle, TrendingUp, Download, List, AlertTriangle,
  ArrowRightLeft, Shield, Dna, Bug, ChevronDown, User, Timer, CheckSquare, ShieldCheck, FileSpreadsheet,
  FileText, Printer, ChevronRight, Bone, Stethoscope, DollarSign, Pill, ThumbsUp, ThumbsDown, Eye, Calendar,
  TrendingDown, BarChart3, PieChart, Users, Syringe, Hospital, BadgeCheck, AlertCircle
} from 'lucide-react';
import { Patient, AntibioticStatus, IncisionRelation, TreatmentType, InfectoStatus, MedicationCategory } from '../types';
import { DDD_MAP, SECTORS, ANTIBIOTICS_LIST } from '../constants';
import { calculateEndDate, getDaysRemaining, getATBDay } from '../utils';

interface ReportsProps {
  patients: Patient[];
  initialReportTab?: string;
  atbCosts: Record<string, number>;
  setAtbCosts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  patientDays: number;
  setPatientDays: (days: number) => void;
}
type ReportTab = 'monitoramento' | 'stewardship' | 'epidemiologia' | 'censo' | 'ddd' | 'vencimento' | 'cc' | 'financeiro';

// Tabela DDD OMS (editável por admin)
const DDD_OMS_VALUES: Record<string, number> = {
  'ACICLOVIR COMP 200MG': 3.0,
  'ACICLOVIR PO P/ SOL INJ 250MG': 3.0,
  'AMICACINA SOL INJ 250MG/ML 2ML': 1.0,
  'AMOXICILINA + ACIDO CLAVULANICO COMP 500 + 125MG': 1.0,
  'AMOXICILINA + ACIDO CLAVULANICO PO P/ SOL INJ 1G + 200MG': 1.0,
  'AMOXICILINA + CLAVULANATO DE POTASSIO COMP 875 + 125MG': 1.0,
  'AMOXICILINA + CLAVULANATO SUSP ORAL 250 + 62,5MG/5ML 75ML': 1.0,
  'AMPICILINA + SULBACTAM PO P/ SOL INJ 1 + 0,5G': 2.0,
  'AMPICILINA SODICA PO P/ SOL INJ 1G': 2.0,
  'ANFOTERICINA B DESOXICOLATO PO P/ SOL INJ 50MG': 0.04,
  'AZITROMICINA COMP 500MG': 0.5,
  'BENZILPENICIL BENZATINA PO P/ SOL INJ 1.200.000UI': 1.0,
  'BENZILPENICILINA POTASS PO P/ SOL INJ 5.000.000UI': 3.6,
  'CEFALEXINA COMP 500MG': 2.0,
  'CEFALOTINA PO P/ SOL INJ 1G': 2.0,
  'CEFAZOLINA PO P/ SOL INJ 1G': 3.0,
  'CEFEPIME PO P/ SOL INJ 1G': 2.0,
  'CEFOXITINA PO P/ SOL INJ 1000MG': 6.0,
  'CEFTAZIDIMA + AVIBACTAM PO P/ SOL INJ 2,5G': 1.0,
  'CEFTAZIDIMA PO P/ SOL INJ 1G': 4.0,
  'CEFTRIAXONA PO P/ SOL INJ 1G': 2.0,
  'CEFTRIAXONA PO P/ SOL INJ IM 1G': 2.0,
  'CEFUROXIMA PO P/ SOL INJ 750MG': 3.0,
  'CIPROFLOXACINO COMP 500MG': 1.0,
  'CIPROFLOXACINO SOL INJ 2MG/ML 200ML': 0.8,
  'CLARITROMICINA PO P/ SOL INJ 500MG': 1.0,
  'CLINDAMICINA SOL INJ 150MG/ML 4ML': 1.8,
  'FLUCONAZOL CAPS 150MG': 0.2,
  'FLUCONAZOL SOL INJ 2MG/ML 100ML': 0.2,
  'GENTAMICINA SOL INJ 40MG/ML': 0.24,
  'IVERMECTINA COMP 6MG': 1.0,
  'LEVOFLOXACINO SOL INJ 5MG/ML 100ML': 0.5,
  'LINEZOLIDA SOL INJ 2MG/ML 300ML': 1.2,
  'MEROPENEM PO P/ SOL INJ 1G': 2.0,
  'METRONIDAZOL COMP 250MG': 1.5,
  'METRONIDAZOL SOL INJ 5MG/ML 100ML': 1.5,
  'MUPIROCINA 2% CREME 20MG/G 15G': 1.0,
  'NISTATINA SUSP ORAL 100.000UI/ML 50ML': 1.0,
  'OSELTAMIVIR FOSFATO CAPS 30MG': 0.15,
  'OSELTAMIVIR FOSFATO CAPS 45MG': 0.15,
  'OSELTAMIVIR FOSFATO CAPS 75MG': 0.15,
  'OXACILINA PO P/ SOL INJ 500MG': 2.0,
  'PIPERACILINA + TAZOBACTAM PO P/ SOL INJ 4 + 0,5G': 14.0,
  'POLIMIXINA B PO P/ SOL INJ 500.000UI': 0.15,
  'SULFAMETOXAZOL + TRIMETOPRIMA COMP 400 + 80MG': 1.92,
  'SULFAMETOXAZOL + TRIMETOPRIMA SOL INJ 80 + 16MG/ML 5ML': 1.92,
  'TEICOPLANINA PO P/ SOL INJ 400MG': 0.4,
  'VANCOMICINA PO P/ SOL INJ 500MG': 2.0
};

// Custos por ATB (editável)
const ATB_COSTS: Record<string, number> = {
  'MEROPENEM': 85.00,
  'VANCOMICINA': 45.00,
  'PIPERACILINA + TAZOBACTAM': 120.00,
  'CEFTRIAXONA': 15.00,
  'CIPROFLOXACINO': 12.00,
};

const Reports: React.FC<ReportsProps> = ({ patients, initialReportTab, atbCosts, setAtbCosts, patientDays, setPatientDays }) => {
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>((initialReportTab as ReportTab) || 'monitoramento');

  const [filterMonth, setFilterMonth] = useState<string>(() => localStorage.getItem('sva_report_filter_month') || new Date().toISOString().substring(0, 7));
  const [sectorFilter, setSectorFilter] = useState<string>(() => localStorage.getItem('sva_report_filter_sector') || 'Todos');
  const [atbFilter, setAtbFilter] = useState<string>(() => localStorage.getItem('sva_report_filter_atb') || 'Todos');

  const [activeKeyDiagnostic, setActiveKeyDiagnostic] = useState<string | null>(null);
  const [ccSubTab, setCcSubTab] = useState<'todos' | 'pendentes' | 'pos_op' | 'antes' | 'depois'>(() => (localStorage.getItem('sva_report_cc_subtab') as any) || 'todos');

  const updateAtbCost = (name: string, value: number) => {
    setAtbCosts(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    localStorage.setItem('sva_report_filter_month', filterMonth);
    localStorage.setItem('sva_report_filter_sector', sectorFilter);
    localStorage.setItem('sva_report_filter_atb', atbFilter);
    localStorage.setItem('sva_report_cc_subtab', ccSubTab);
  }, [filterMonth, sectorFilter, atbFilter, ccSubTab]);

  useEffect(() => { if (initialReportTab) setActiveReportTab(initialReportTab as ReportTab); }, [initialReportTab]);

  const categoryFilter = MedicationCategory.ANTIMICROBIANO;

  // Lista única de ATBs para filtro (usando a lista global do sistema)
  const allAtbs = useMemo(() => {
    return [...ANTIBIOTICS_LIST].sort();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Inclui pacientes cujos ATBs iniciaram no mês OU que estão em uso no mês atual
      const matchesMonth = p.antibiotics.some(a =>
        a.startDate.startsWith(filterMonth) ||
        (a.status === AntibioticStatus.EM_USO && filterMonth === new Date().toISOString().substring(0, 7))
      );
      const matchesSector = sectorFilter === 'Todos' || p.sector === sectorFilter || sectorFilter === 'Todos os Setores';
      const matchesAtb = atbFilter === 'Todos' || atbFilter === 'Todos os ATBs' || p.antibiotics.some(a => a.name === atbFilter);
      return matchesMonth && matchesSector && matchesAtb;
    });
  }, [patients, filterMonth, sectorFilter, atbFilter]);

  // STATS GERAIS
  const stats = useMemo(() => {
    let totalActive = 0, totalSubstituted = 0, totalFinalized = 0, totalSuspended = 0, prolongedCount = 0, totalDuration = 0, medsCount = 0;
    let therapeuticCount = 0, prophylacticCount = 0, oralCount = 0, ivCount = 0;

    filteredPatients.forEach(p => {
      if (p.treatmentType === TreatmentType.TERAPEUTICO) therapeuticCount++; else prophylacticCount++;
      p.antibiotics.forEach(a => {
        if (a.category === categoryFilter) {
          medsCount++;
          if (a.status === AntibioticStatus.EM_USO) totalActive++;
          if (a.status === AntibioticStatus.TROCADO) totalSubstituted++;
          if (a.status === AntibioticStatus.FINALIZADO) totalFinalized++;
          if (a.status === AntibioticStatus.SUSPENSO) totalSuspended++;
          if (getATBDay(a.startDate) > 14) prolongedCount++;
          totalDuration += a.durationDays;
          if (a.route === 'ORAL') oralCount++; else ivCount++;
        }
      });
    });

    const vencidosCount = filteredPatients.filter(p => p.sector !== 'Centro Cirúrgico' && p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO && getDaysRemaining(calculateEndDate(a.startDate, a.durationDays)) <= 0)).length;

    return {
      active: totalActive, substituted: totalSubstituted, finalized: totalFinalized, suspended: totalSuspended,
      prolonged: prolongedCount, avgDuration: medsCount > 0 ? (totalDuration / medsCount).toFixed(1) : '0',
      therapeutic: therapeuticCount, prophylactic: prophylacticCount, oral: oralCount, iv: ivCount, vencidos: vencidosCount
    };
  }, [filteredPatients, categoryFilter]);

  // CENSO INFECTO
  const censoStats = useMemo(() => {
    const auth = filteredPatients.filter(p => p.infectoStatus === InfectoStatus.AUTORIZADO).length;
    const notAuth = filteredPatients.filter(p => p.infectoStatus === InfectoStatus.NAO_AUTORIZADO).length;
    const pending = filteredPatients.filter(p => p.infectoStatus === InfectoStatus.PENDENTE).length;
    const total = filteredPatients.length;
    const semAvaliacao = filteredPatients.filter(p => p.infectoStatus === InfectoStatus.PENDENTE && p.sector !== 'Centro Cirúrgico');
    const todosIniciados = filteredPatients.filter(p =>
      p.antibiotics.some(a => a.category === MedicationCategory.ANTIMICROBIANO)
    ).sort((a, b) => a.name.localeCompare(b.name));

    return {
      authorized: auth, notAuthorized: notAuth, pending,
      pendingRate: total > 0 ? ((pending / total) * 100).toFixed(1) : '0',
      evaluationRate: total > 0 ? (((auth + notAuth) / total) * 100).toFixed(1) : '0',
      semAvaliacao, todosIniciados
    };
  }, [filteredPatients]);

  // DDD CALCS
  const dddStats = useMemo(() => {
    const consumoByAtb: Record<string, number> = {};
    const dddByAtb: Record<string, number> = {};
    let totalDDD = 0;

    filteredPatients.forEach(p => {
      p.antibiotics.filter(a => a.category === categoryFilter).forEach(a => {
        const doseMg = parseFloat(a.dose.replace(/[^\d.]/g, '')) || 0;
        const doseG = a.dose.toUpperCase().includes('G') && !a.dose.toUpperCase().includes('MG') ? doseMg : doseMg / 1000;
        const totalDays = a.durationDays;
        const consumo = doseG * totalDays;

        consumoByAtb[a.name] = (consumoByAtb[a.name] || 0) + consumo;

        const dddValue = DDD_OMS_VALUES[a.name.toUpperCase()] || 1;
        const dddCalc = (consumo / dddValue / patientDays) * 1000;
        dddByAtb[a.name] = (dddByAtb[a.name] || 0) + dddCalc;
        totalDDD += dddCalc;
      });
    });

    const sorted = Object.entries(dddByAtb).sort((a, b) => b[1] - a[1]);
    let cumulative = 0;
    const pareto: Array<{ name: string; ddd: number; isPareto: boolean }> = [];
    sorted.forEach(([name, ddd]) => {
      cumulative += ddd;
      pareto.push({ name, ddd, isPareto: cumulative <= totalDDD * 0.8 });
    });

    return { totalDDD: totalDDD.toFixed(2), byAtb: dddByAtb, pareto, patientDays };
  }, [filteredPatients, patientDays, categoryFilter]);

  // CENTRO CIRURGICO
  const ccStats = useMemo(() => {
    const ccPatients = filteredPatients.filter(p => p.sector === 'Centro Cirúrgico');
    let beforeIncision = 0, afterIncision = 0, noData = 0;
    let profilatico = 0, terapeutico = 0;

    ccPatients.forEach(p => {
      if (p.treatmentType === TreatmentType.PROFILATICO) profilatico++; else terapeutico++;
      if (p.incisionRelation === IncisionRelation.BEFORE_60) beforeIncision++;
      else if (p.incisionRelation === IncisionRelation.AFTER_INCISION) afterIncision++;
      else noData++;
    });

    const total = ccPatients.length || 1;
    return {
      total: ccPatients.length,
      beforeIncision, afterIncision, noData,
      beforeRate: ((beforeIncision / total) * 100).toFixed(1),
      afterRate: ((afterIncision / total) * 100).toFixed(1),
      profilatico, terapeutico,
      adherenceRate: ((beforeIncision / total) * 100).toFixed(1)
    };
  }, [filteredPatients]);

  // FINANCEIRO
  const financeStats = useMemo(() => {
    let totalCost = 0;
    const costByAtb: Record<string, { qty: number; cost: number }> = {};
    const costBySector: Record<string, number> = {};

    filteredPatients.forEach(p => {
      p.antibiotics.filter(a => a.category === categoryFilter).forEach(a => {
        const unitCost = atbCosts[a.name.toUpperCase()] || 50;
        const cost = unitCost * a.durationDays;
        totalCost += cost;
        if (!costByAtb[a.name]) costByAtb[a.name] = { qty: 0, cost: 0 };
        costByAtb[a.name].qty++;
        costByAtb[a.name].cost += cost;
        costBySector[p.sector] = (costBySector[p.sector] || 0) + cost;
      });
    });

    return { totalCost, costByAtb, costBySector };
  }, [filteredPatients, categoryFilter, atbCosts]);

  // EPIDEMIOLOGIA
  const epidemiologyStats = useMemo(() => {
    const keywords = ['SEPSE', 'ITU', 'DPOC', 'PNEUMONIA', 'APENDICITE', 'FRATURA', 'OUTROS'];
    const keyDiagnosticStats: Record<string, { count: number; meds: Record<string, number>; sectors: Record<string, number> }> = {};
    keywords.forEach(k => keyDiagnosticStats[k] = { count: 0, meds: {}, sectors: {} });

    filteredPatients.forEach(p => {
      const diagUpper = p.diagnosis.toUpperCase();
      let matched = false;
      keywords.slice(0, -1).forEach(key => {
        if (diagUpper.includes(key)) {
          matched = true;
          keyDiagnosticStats[key].count++;
          keyDiagnosticStats[key].sectors[p.sector] = (keyDiagnosticStats[key].sectors[p.sector] || 0) + 1;
          p.antibiotics.filter(a => a.category === categoryFilter).forEach(atb => {
            keyDiagnosticStats[key].meds[atb.name] = (keyDiagnosticStats[key].meds[atb.name] || 0) + 1;
          });
        }
      });
      if (!matched) {
        keyDiagnosticStats['OUTROS'].count++;
        keyDiagnosticStats['OUTROS'].sectors[p.sector] = (keyDiagnosticStats['OUTROS'].sectors[p.sector] || 0) + 1;
        p.antibiotics.filter(a => a.category === categoryFilter).forEach(atb => {
          keyDiagnosticStats['OUTROS'].meds[atb.name] = (keyDiagnosticStats['OUTROS'].meds[atb.name] || 0) + 1;
        });
      }
    });

    // Lista completa de diagnósticos
    const allDiagnoses: Array<{ patient: string; sector: string; diagnosis: string; atbs: string[] }> = [];
    filteredPatients.forEach(p => {
      allDiagnoses.push({
        patient: p.name,
        sector: p.sector,
        diagnosis: p.diagnosis || 'Não informado',
        atbs: p.antibiotics.filter(a => a.category === categoryFilter).map(a => a.name)
      });
    });

    return { keyDiagnostics: keyDiagnosticStats, allDiagnoses };
  }, [filteredPatients, categoryFilter]);

  const handlePrint = () => window.print();
  const exportToExcel = () => {
    const headers = ["Paciente", "Leito", "Setor", "Medicamento", "Dose", "Frequência", "Início", "Dia Ciclo", "Status", "Status Infecto"];
    const rows = filteredPatients.flatMap(p =>
      p.antibiotics.filter(a => a.category === categoryFilter).map(a => [
        p.name, p.bed, p.sector, a.name, a.dose, a.frequency, a.startDate, getATBDay(a.startDate), a.status, p.infectoStatus
      ])
    );

    // Configura o separador para ponto e vírgula (padrão Excel Brasil)
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    // Adiciona o BOM (Byte Order Mark) para UTF-8 para o Excel abrir com acentos corretos
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_atb_${filterMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CARD COMPONENT
  const Card = ({ label, value, icon, color = 'blue' }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 transition-colors">
      <div className="flex justify-between items-start">
        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{label}</p>
        <div className={`p-1.5 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>{React.cloneElement(icon as React.ReactElement, { size: 24 })}</div>
      </div>
      <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-none">{value}</h3>
    </div>
  );

  return (
    <div className="max-w-[1300px] mx-auto space-y-2 animate-in fade-in pb-4 bg-[#f8fafc] dark:bg-slate-900/50 min-h-screen p-2 rounded-lg">
      {/* HEADER */}
      <div className="bg-[#1e293b] p-6 rounded-3xl shadow-xl no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <h2 className="text-white text-2xl font-black uppercase flex items-center gap-3 tracking-tight">
              <Shield className="text-emerald-500" size={32} /> Inteligência de Dados
            </h2>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-2xl text-xs font-black uppercase hover:bg-white/20 transition-all"><Printer size={18} /> Imprimir Relatório</button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-3 bg-red-600/90 text-white rounded-2xl text-xs font-black uppercase hover:bg-red-700 transition-all"><FileText size={18} /> Exportar PDF</button>
              <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-3 bg-emerald-600/90 text-white rounded-2xl text-xs font-black uppercase hover:bg-emerald-700 transition-all"><FileSpreadsheet size={18} /> Planilha Excel</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:w-auto">
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Período (Mês)</label>
              <input type="month" className="w-full bg-slate-800 dark:bg-slate-950 text-white px-5 py-3 rounded-2xl text-sm font-bold outline-none border border-slate-700 dark:border-slate-800 focus:border-blue-500 transition-all" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Setor</label>
              <select className="w-full bg-slate-800 dark:bg-slate-950 text-white px-5 py-3 rounded-2xl text-sm font-bold outline-none border border-slate-700 dark:border-slate-800 focus:border-blue-500 transition-all appearance-none" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}>
                <option>Todos os Setores</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Antibiótico</label>
              <select className="w-full bg-slate-800 dark:bg-slate-950 text-white px-5 py-3 rounded-2xl text-sm font-bold outline-none border border-slate-700 dark:border-slate-800 focus:border-blue-500 transition-all appearance-none" value={atbFilter} onChange={e => setAtbFilter(e.target.value)}>
                <option>Todos os ATBs</option>
                {allAtbs.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 no-print custom-scrollbar transition-colors">
        {[
          { id: 'monitoramento', label: 'Monitoramento', icon: <Eye size={18} /> },
          { id: 'stewardship', label: 'Stewardship', icon: <CheckSquare size={18} /> },
          { id: 'censo', label: 'Censo Infecto', icon: <ShieldCheck size={18} /> },
          { id: 'epidemiologia', label: 'Matriz Epid.', icon: <Dna size={18} /> },
          { id: 'ddd', label: 'DDD ANVISA', icon: <Scale size={18} /> },
          { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={18} /> },
          { id: 'vencimento', label: 'Vencimentos', icon: <Clock size={18} /> },
          { id: 'cc', label: 'C. Cirúrgico', icon: <Scissors size={18} /> }
        ].map(t => (
          <button key={t.id} onClick={() => setActiveReportTab(t.id as ReportTab)}
            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-3 shrink-0 transition-all ${activeReportTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="space-y-3 text-left">

        {/* ===== MONITORAMENTO ATIVO ===== */}
        {activeReportTab === 'monitoramento' && (
          <div className="space-y-2 animate-in fade-in">
            <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Eye size={14} /> Todos os pacientes em uso ativo de ATB</h3>
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest border-b-2 border-slate-200 dark:border-slate-700">
                  <tr><th className="px-6 py-4">Paciente</th><th className="px-6 py-4">Nasc.</th><th className="px-6 py-4">Setor</th><th className="px-6 py-4">ATB</th><th className="px-6 py-4">Dose</th><th className="px-6 py-4">Freq/Hor</th><th className="px-6 py-4 text-center">Dias</th><th className="px-6 py-4 text-center">Ciclo</th><th className="px-6 py-4 text-center">Venc.</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-[10px]">
                  {filteredPatients.filter(p => p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO)).map(p =>
                    p.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO).map(a => {
                      const remaining = getDaysRemaining(calculateEndDate(a.startDate, a.durationDays));
                      return (
                        <tr key={`${p.id}-${a.id}`} className="hover:bg-slate-100/80 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white leading-tight">
                            <span className="text-[11px] font-black block">{p.name}</span>
                            <span className="text-slate-600 dark:text-slate-400 text-[9px] uppercase font-black">Leito: {p.bed}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold">{p.birthDate}</td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-100 uppercase font-black text-[11px]">{p.sector}</td>
                          <td className="px-6 py-4 font-black text-blue-700 dark:text-blue-400 text-[11px] leading-tight">{a.name}</td>
                          <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{a.dose}</td>
                          <td className="px-6 py-4 leading-tight font-black text-slate-800 dark:text-slate-200">
                            <span className="block">{a.frequency}</span>
                            <span className="text-slate-600 dark:text-slate-400 text-[9px] font-black">{a.times?.join('/')}</span>
                          </td>
                          <td className="px-6 py-4 font-black text-sm text-center text-slate-900 dark:text-white">{a.durationDays}d</td>
                          <td className="px-6 py-3 text-center"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-xl font-black text-[9px]">{getATBDay(a.startDate)}º</span></td>
                          <td className="px-6 py-3 text-center"><span className={`px-3 py-1 rounded-xl font-black text-[9px] ${remaining <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : remaining <= 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>{remaining <= 0 ? 'VENC' : `${remaining}d`}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== STEWARDSHIP ===== */}
        {activeReportTab === 'stewardship' && (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5">
              <Card label="Em Uso" value={stats.active} icon={<Pill size={12} />} color="blue" />
              <Card label="Finalizados" value={stats.finalized} icon={<CheckCircle2 size={12} />} color="emerald" />
              <Card label="Suspensos" value={stats.suspended} icon={<XCircle size={12} />} color="amber" />
              <Card label="Trocas" value={stats.substituted} icon={<ArrowRightLeft size={12} />} color="purple" />
              <Card label="Média Dias" value={stats.avgDuration} icon={<Timer size={12} />} color="slate" />
              <Card label="Prolongados" value={stats.prolonged} icon={<AlertTriangle size={12} />} color="red" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">Perfil de Tratamento</h4>
                <div className="flex gap-3">
                  <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl text-center border border-blue-100 dark:border-blue-800">
                    <p className="text-4xl font-black text-blue-700 dark:text-blue-400 leading-none">{stats.therapeutic}</p>
                    <p className="text-[10px] font-black text-blue-500 dark:text-blue-500/80 uppercase leading-none mt-2">Terapêutico</p>
                  </div>
                  <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl text-center border border-amber-100 dark:border-amber-800">
                    <p className="text-4xl font-black text-amber-700 dark:text-amber-400 leading-none">{stats.prophylactic}</p>
                    <p className="text-[10px] font-black text-amber-500 dark:text-amber-500/80 uppercase leading-none mt-2">Profilático</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">Via de Administração</h4>
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl text-center border border-emerald-100 dark:border-emerald-800">
                    <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{stats.oral}</p>
                    <p className="text-[10px] font-black text-emerald-500 dark:text-emerald-500/80 uppercase leading-none mt-2">Oral</p>
                  </div>
                  <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl text-center border border-purple-100 dark:border-purple-800">
                    <p className="text-4xl font-black text-purple-700 dark:text-purple-400 leading-none">{stats.iv}</p>
                    <p className="text-[10px] font-black text-purple-500 dark:text-purple-500/80 uppercase leading-none mt-2">EV</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-3xl border border-red-100 dark:border-red-900 shadow-sm transition-colors">
                <h4 className="text-sm font-black uppercase text-red-600 dark:text-red-400 mb-4 flex items-center gap-2 tracking-widest leading-none"><AlertTriangle size={14} /> Alertas Críticos</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] leading-none uppercase">
                    <span className="font-black text-slate-700 dark:text-slate-300 mb-1">ATB Vencidos</span>
                    <span className="font-black text-white bg-red-600 px-3 py-1 rounded-lg text-sm shadow-md">{stats.vencidos}</span>
                  </div>
                  <div className="flex justify-between text-[11px] leading-none uppercase">
                    <span className="font-black text-slate-700 dark:text-slate-300 mb-1">Uso Prolongado</span>
                    <span className="font-black text-white bg-amber-500 px-3 py-1 rounded-lg text-sm shadow-md">{stats.prolonged}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== CENSO INFECTO ===== */}
        {activeReportTab === 'censo' && (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
              <Card label="Autorizados" value={censoStats.authorized} icon={<ThumbsUp size={12} />} color="emerald" />
              <Card label="Não Autorizados" value={censoStats.notAuthorized} icon={<ThumbsDown size={12} />} color="red" />
              <Card label="Pendentes" value={censoStats.pending} icon={<Clock size={12} />} color="amber" />
              <Card label="% Avaliados" value={`${censoStats.evaluationRate}%`} icon={<BadgeCheck size={12} />} color="blue" />
              <Card label="% Pendentes" value={`${censoStats.pendingRate}%`} icon={<AlertCircle size={12} />} color="slate" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">ATB Iniciados Sem Avaliação</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {censoStats.semAvaliacao.map(p => (
                  <div key={p.id} className="flex justify-between items-center bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl text-sm border border-amber-100/50 dark:border-amber-800/50">
                    <span className="font-black text-slate-800 dark:text-white">{p.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black">{p.sector}</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 truncate max-w-[300px]">{p.antibiotics.map(a => a.name).join(', ')}</span>
                  </div>
                ))}
                {censoStats.semAvaliacao.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm font-bold text-center py-6 italic">Todos os pacientes foram avaliados pela Infectologia</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm no-print-break transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">Panorama Geral: Pacientes em Terapia Antimicrobiana ({censoStats.todosIniciados.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest border-b-2 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2">Paciente / Leito</th>
                      <th className="px-4 py-2">Setor</th>
                      <th className="px-4 py-2">Antibióticos</th>
                      <th className="px-4 py-2 text-center">Início</th>
                      <th className="px-4 py-2 text-center">Status Avaliação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-[10px]">
                    {censoStats.todosIniciados.map(p => (
                      <tr key={p.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-700">
                        <td className="px-4 py-3 leading-tight">
                          <span className="font-black text-slate-900 dark:text-white block text-sm">{p.name}</span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold">Leito: {p.bed}</span>
                        </td>
                        <td className="px-4 py-3 uppercase font-black text-slate-700 dark:text-slate-300 text-[10px]">{p.sector}</td>
                        <td className="px-4 py-3 font-black text-blue-700 dark:text-blue-400 leading-tight text-[11px]">
                          {p.antibiotics.filter(a => a.category === MedicationCategory.ANTIMICROBIANO).map(a => a.name).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200 font-black text-[11px]">
                          {p.antibiotics[0]?.startDate ? new Date(p.antibiotics[0].startDate).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded-lg font-black uppercase text-[8px] ${p.infectoStatus === InfectoStatus.AUTORIZADO ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            p.infectoStatus === InfectoStatus.NAO_AUTORIZADO ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                              'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            }`}>
                            {p.infectoStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== MATRIZ EPIDEMIOLÓGICA ===== */}
        {activeReportTab === 'epidemiologia' && (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {['SEPSE', 'ITU', 'DPOC', 'PNEUMONIA', 'APENDICITE', 'FRATURA', 'OUTROS'].map((key, i) => {
                const colors = ['red', 'blue', 'amber', 'emerald', 'purple', 'indigo', 'slate'];
                const data = epidemiologyStats.keyDiagnostics[key];
                return (
                  <button key={key} onClick={() => setActiveKeyDiagnostic(activeKeyDiagnostic === key ? null : key)}
                    className={`bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center hover:shadow-md transition-all ${activeKeyDiagnostic === key ? 'ring-2 ring-blue-500' : ''}`}>
                    <p className={`text-2xl font-black text-${colors[i]}-600 dark:text-${colors[i]}-400 leading-none`}>{data.count}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 leading-none mt-2 tracking-tighter">{key}</p>
                  </button>
                );
              })}
            </div>

            {activeKeyDiagnostic && (
              <div className="bg-slate-900 dark:bg-slate-950 p-6 rounded-3xl shadow-2xl text-white border border-white/10 transition-colors">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-base font-black uppercase text-emerald-400 tracking-widest">{activeKeyDiagnostic} - Perfil de ATB</h4>
                  <button onClick={() => setActiveKeyDiagnostic(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><XCircle size={20} /></button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(epidemiologyStats.keyDiagnostics[activeKeyDiagnostic].meds).map(([med, count]) => (
                    <div key={med} className="bg-white/5 p-3 rounded-xl flex justify-between items-center border border-white/5">
                      <span className="text-xs font-bold truncate pr-2 uppercase">{med}</span>
                      <span className="bg-emerald-500 px-3 py-1 rounded-lg text-[11px] font-black shrink-0 whitespace-nowrap">{count} Prescrições</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLANILHA DE DIAGNÓSTICOS REGISTRADOS */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-md overflow-hidden transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 p-6 border-b dark:border-slate-700 flex items-center gap-3 leading-none tracking-widest bg-slate-100/50 dark:bg-slate-900/50"><Stethoscope size={18} /> Detalhamento de Diagnósticos e Terapias ({epidemiologyStats.allDiagnoses.length})</h4>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest border-b-2 dark:border-slate-700 sticky top-0 z-10">
                    <tr><th className="px-6 py-4">Paciente</th><th className="px-6 py-4 text-center">Setor</th><th className="px-6 py-4">Diagnóstico Principal</th><th className="px-6 py-4">Esquema ATB</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-[13px]">
                    {epidemiologyStats.allDiagnoses.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-50 dark:border-slate-700">
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase text-sm leading-tight">{d.patient}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300 uppercase font-black text-center"><span className="bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">{d.sector}</span></td>
                        <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-black max-w-sm leading-relaxed" title={d.diagnosis}>{d.diagnosis}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {d.atbs.map((atb, j) => (<span key={j} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm tracking-tight">{atb}</span>))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== DDD ANVISA ===== */}
        {activeReportTab === 'ddd' && (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-3 gap-4">
              <Card label="DDD Geral" value={dddStats.totalDDD} icon={<Scale size={16} />} color="blue" />
              <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                <label className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none block mb-3">Pacientes-Dia</label>
                <input type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-black text-xl outline-none focus:border-blue-500 transition-all text-center text-slate-900 dark:text-white"
                  value={patientDays} onChange={e => setPatientDays(parseInt(e.target.value) || 1)} />
              </div>
              <Card label="Variação" value="+5.2%" icon={<TrendingUp size={16} />} color="emerald" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">Pareto de Consumo (Top 80%)</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {dddStats.pareto.map((item, i) => (
                  <div key={item.name} className={`flex justify-between items-center px-4 py-3 rounded-xl text-sm transition-all border ${item.isPareto ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 font-black text-blue-900 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    <span className="truncate mr-4">{i + 1}. {item.name}</span>
                    <span className={`shrink-0 ${item.isPareto ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-500'}`}>{item.ddd.toFixed(2)} DDD</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest leading-none">Referência: DDD Definida pela OMS (g/dia)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                {Object.entries(DDD_OMS_VALUES).map(([name, value]) => (
                  <div key={name} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-800 leading-none">
                    <span className="font-black text-slate-800 dark:text-white truncate pr-2 uppercase text-[10px]">{name}</span>
                    <span className="font-black text-white bg-blue-600 px-2 py-1 rounded-lg shadow-sm border border-blue-700">{value}g</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== FINANCEIRO ===== */}
        {activeReportTab === 'financeiro' && (
          <div className="space-y-2 animate-in fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl text-white flex flex-col justify-center">
                <p className="text-[10px] font-black uppercase opacity-80 leading-none mb-3 tracking-[0.2em]">Investimento Total</p>
                <p className="text-4xl font-black leading-none tracking-tighter">R$ {financeStats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col transition-colors">
                <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-[0.2em] leading-none">Top 4 - Consumo por Setor</p>
                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  {(Object.entries(financeStats.costBySector) as [string, number][])
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([sector, cost]) => (
                      <div key={sector} className="flex justify-between text-sm items-center">
                        <span className="font-black text-slate-800 dark:text-white truncate mr-4 uppercase tracking-tight">{sector}</span>
                        <span className="font-black text-white bg-emerald-600 px-3 py-1 rounded-xl shadow-lg border-b-2 border-emerald-800">R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* EDITAR VALORES DE ATB */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-6 flex items-center gap-2 leading-none whitespace-nowrap"><DollarSign size={16} /> Personalizar Valor Unitário do ATB</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto pr-3 custom-scrollbar">
                {allAtbs.map(atb => (
                  <div key={atb} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-emerald-500">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white flex-1 truncate leading-tight uppercase" title={atb}>{atb}</span>
                    <div className="flex items-center shrink-0">
                      <span className="text-xs font-black text-slate-600 dark:text-slate-400 mr-1.5">R$</span>
                      <input
                        type="number"
                        className="w-20 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-black text-right shadow-inner outline-none focus:border-emerald-600 text-slate-900 dark:text-white"
                        value={atbCosts[atb.toUpperCase()] || ''}
                        onChange={e => updateAtbCost(atb.toUpperCase(), parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CUSTO POR ATB */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 leading-none tracking-widest">Custo por ATB (Acumulado no Mês)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(Object.entries(financeStats.costByAtb) as [string, { qty: number; cost: number }][])
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .map(([atb, data]) => (
                    <div key={atb} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:bg-white dark:hover:bg-slate-750">
                      <p className="text-[9px] font-black text-slate-700 dark:text-slate-300 truncate mb-2 uppercase tracking-tighter" title={atb}>{atb}</p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none">R$ {data.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{data.qty} Prescrições</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
              <h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 p-6 border-b dark:border-slate-700 leading-none tracking-widest bg-slate-100/50 dark:bg-slate-900/50">Planilha de Auditoria Financeira Detalhada</h4>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest border-b-2 dark:border-slate-700 sticky top-0 z-10">
                    <tr><th className="px-6 py-4">Paciente</th><th className="px-6 py-4">Setor</th><th className="px-6 py-4">Antibiótico</th><th className="px-6 py-4 text-center">Tempo Uso</th><th className="px-6 py-4 text-right">Custo Aproximado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-[13px]">
                    {filteredPatients.map(p =>
                      p.antibiotics.map(a => (
                        <tr key={`${p.id}-${a.id}`} className="hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors border-b border-slate-50 dark:border-slate-700">
                          <td className="px-6 py-4 font-black text-slate-900 dark:text-white uppercase text-sm leading-tight">{p.name}</td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-300 uppercase font-black text-xs">{p.sector}</td>
                          <td className="px-6 py-4 font-black text-blue-800 dark:text-blue-400 uppercase text-xs">{a.name}</td>
                          <td className="px-6 py-4 text-center font-black text-slate-800 dark:text-slate-200">{getATBDay(a.startDate)}º Dia</td>
                          <td className="px-6 py-4 font-black text-emerald-700 dark:text-emerald-400 text-right text-base">R$ {((atbCosts[a.name.toUpperCase()] || 50) * a.durationDays).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== VENCIMENTO 24H ===== */}
        {activeReportTab === 'vencimento' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-red-600 p-8 rounded-3xl shadow-xl text-white flex justify-between items-center border-b-4 border-red-800">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-2xl"><Clock size={32} /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase leading-none tracking-tighter">Vigilância Crítica</h2>
                  <p className="text-xs font-black opacity-80 uppercase tracking-widest mt-2">Antibióticos próximos ao vencimento</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-6xl font-black leading-none tracking-tighter">{stats.vencidos}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1">Alertas Ativos</p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 text-[12px] font-black uppercase tracking-widest border-b-2">
                  <tr><th className="px-8 py-5">Paciente / Leito</th><th className="px-8 py-5">Setor</th><th className="px-8 py-5">Antibiótico</th><th className="px-8 py-5 text-center">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPatients
                    .filter(p => p.sector !== 'Centro Cirúrgico' && p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO && getDaysRemaining(calculateEndDate(a.startDate, a.durationDays)) <= 1))
                    .map(p => {
                      const med = p.antibiotics.find(a => a.status === AntibioticStatus.EM_USO);
                      const remaining = med ? getDaysRemaining(calculateEndDate(med.startDate, med.durationDays)) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-red-50 border-b border-red-50">
                          <td className="px-4 py-3 leading-tight"><span className="font-black text-slate-900 text-sm">{p.name}</span><br /><span className="text-[10px] text-slate-600 uppercase font-black">Leito {p.bed}</span></td>
                          <td className="px-4 py-3 text-slate-800 uppercase font-black text-xs">{p.sector}</td>
                          <td className="px-4 py-3 font-black text-red-700 leading-tight text-sm">{med?.name}</td>
                          <td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-lg font-black text-xs ${remaining <= 0 ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'}`}>{remaining <= 0 ? 'VENCIDO' : 'VENCE HOJE'}</span></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== CENTRO CIRÚRGICO ===== */}
        {activeReportTab === 'cc' && (
          <div className="space-y-3 animate-in fade-in">
            {(() => {
              const ccPatients = filteredPatients.filter(p => p.sector === 'Centro Cirúrgico');
              const filteredCcPatients = ccPatients.filter(p => {
                if (ccSubTab === 'todos') return true;
                if (ccSubTab === 'pendentes') return !p.incisionRelation;
                if (ccSubTab === 'pos_op') return p.incisionRelation === IncisionRelation.PRE_POST_OP;
                if (ccSubTab === 'antes') return p.incisionRelation === IncisionRelation.BEFORE_60;
                if (ccSubTab === 'depois') return p.incisionRelation === IncisionRelation.AFTER_INCISION;
                return true;
              });

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    <Card label="Pacientes CC" value={ccStats.total} icon={<Scissors size={12} />} color="purple" />
                    <Card label="Antes Incisão" value={ccStats.beforeIncision} icon={<CheckCircle2 size={12} />} color="emerald" />
                    <Card label="Depois Incisão" value={ccStats.afterIncision} icon={<XCircle size={12} />} color="red" />
                    <Card label="% Adesão" value={`${ccStats.adherenceRate}%`} icon={<BadgeCheck size={12} />} color="blue" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-white p-2 rounded shadow-xs border border-slate-100">
                      <h4 className="text-[10px] font-black uppercase text-slate-600 mb-1.5 leading-none">Administração</h4>
                      <div className="flex gap-1.5">
                        <div className="flex-1 bg-emerald-50 p-2 rounded text-center">
                          <p className="text-base font-black text-emerald-600 leading-none">{ccStats.beforeRate}%</p>
                          <p className="text-[7px] font-bold text-emerald-400 uppercase mt-0.5 leading-none">Antes ✓</p>
                        </div>
                        <div className="flex-1 bg-red-50 p-2 rounded text-center">
                          <p className="text-base font-black text-red-600 leading-none">{ccStats.afterRate}%</p>
                          <p className="text-[7px] font-bold text-red-400 uppercase mt-0.5 leading-none">Após ✗</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded shadow-xs border border-slate-100">
                      <h4 className="text-[10px] font-black uppercase text-slate-600 mb-1.5 leading-none">Tratamento</h4>
                      <div className="flex gap-1.5">
                        <div className="flex-1 bg-amber-50 p-2 rounded text-center">
                          <p className="text-base font-black text-amber-600 leading-none">{ccStats.profilatico}</p>
                          <p className="text-[7px] font-bold text-amber-400 uppercase mt-0.5 leading-none">Prof.</p>
                        </div>
                        <div className="flex-1 bg-blue-50 p-2 rounded text-center">
                          <p className="text-base font-black text-blue-600 leading-none">{ccStats.terapeutico}</p>
                          <p className="text-[7px] font-bold text-blue-400 uppercase mt-0.5 leading-none">Terap.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUB-ABAS CC */}
                  <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded shadow-inner">
                    {[
                      { id: 'todos', label: 'Tds', count: ccPatients.length },
                      { id: 'pendentes', label: 'Pend', count: ccPatients.filter(p => !p.incisionRelation).length },
                      { id: 'pos_op', label: 'Pós', count: ccPatients.filter(p => p.incisionRelation === IncisionRelation.PRE_POST_OP).length },
                      { id: 'antes', label: 'Ant', count: ccStats.beforeIncision },
                      { id: 'depois', label: 'Dps', count: ccStats.afterIncision },
                    ].map(t => (
                      <button key={t.id} onClick={() => setCcSubTab(t.id as any)}
                        className={`flex-1 px-1 py-1 rounded text-[7px] font-black uppercase leading-none transition-all ${ccSubTab === t.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}>
                        {t.label} ({t.count})
                      </button>
                    ))}
                  </div>

                  {/* LISTA DE PACIENTES CC */}
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-widest border-b-2">
                        <tr><th className="px-6 py-5">Paciente</th><th className="px-6 py-5 text-center">Leito</th><th className="px-6 py-5">ATB Prescrito</th><th className="px-6 py-5 text-center">Tipo</th><th className="px-6 py-5 text-center">Incisão/Rel.</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[13px]">
                        {filteredCcPatients.map(p => (
                          <tr key={p.id} className="hover:bg-slate-100 transition-colors border-b border-slate-50">
                            <td className="px-6 py-5 font-black text-slate-900 uppercase text-sm">{p.name}</td>
                            <td className="px-6 py-5 text-slate-800 font-black text-center"><span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{p.bed}</span></td>
                            <td className="px-6 py-5 font-black text-purple-700 uppercase italic opacity-90">{p.antibiotics.map(a => a.name).join(', ')}</td>
                            <td className="px-6 py-5 text-center"><span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${p.treatmentType === TreatmentType.PROFILATICO ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{p.treatmentType === TreatmentType.PROFILATICO ? 'Profilático' : 'Terapêutico'}</span></td>
                            <td className="px-6 py-5 text-center">
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-sm border ${p.incisionRelation === IncisionRelation.BEFORE_60 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                p.incisionRelation === IncisionRelation.AFTER_INCISION ? 'bg-red-50 text-red-700 border-red-200' :
                                  p.incisionRelation === IncisionRelation.PRE_POST_OP ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                {p.incisionRelation === IncisionRelation.BEFORE_60 ? 'Antes (✓)' :
                                  p.incisionRelation === IncisionRelation.AFTER_INCISION ? 'Depois (✗)' :
                                    p.incisionRelation === IncisionRelation.PRE_POST_OP ? 'Pós-Op' : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredCcPatients.length === 0 && (
                          <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-black text-sm uppercase italic">Nenhum paciente encontrado para este filtro</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="pt-8 border-t border-slate-200 text-center pb-6 no-print">
        <p className="text-xs font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.4em] opacity-80">© 2025 SVA — Sistema de Vigilância Ativa e Farmacêutica</p>
      </div>
    </div>
  );
};

export default Reports;
