
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Bell,
  X,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { UserRole, Patient, InfectoStatus, AntibioticStatus, User } from '../types';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import PatientCard from './PatientCard';
import PatientRegistration from './PatientRegistration';
import BulkImport from './BulkImport';
import Reports from './Reports';
import DeletePatientModal from './DeletePatientModal';
import UserManagement from './UserManagement';
import { getDaysRemaining, calculateEndDate, getATBDay, isAtbVencido, safeJsonParse } from '../utils';
import { getMenuItems, DEFAULT_SECTORS } from '../constants';

interface DashboardProps {
  user: User;
  patients: Patient[];
  users: User[];
  hospitalName: string;
  setHospitalName: (name: string) => void;
  bgImage: string;
  setBgImage: (img: string) => void;
  bgFit?: string;
  setBgFit?: (val: string) => void;
  bgPosition?: string;
  setBgPosition?: (val: string) => void;
  bgOpacity?: string;
  setBgOpacity?: (val: string) => void;
  loginBgImage: string;
  setLoginBgImage: (img: string) => void;
  loginBgFit?: string;
  setLoginBgFit?: (val: string) => void;
  loginBgPosition?: string;
  setLoginBgPosition?: (val: string) => void;
  loginBgOpacity?: string;
  setLoginBgOpacity?: (val: string) => void;
  onLogout: () => void;
  onUpdatePatient: (p: Patient) => void;
  onDeletePatient: (id: string, justification?: string) => void;
  onAddPatient: (p: Patient) => void;
  onUpdatePatientsOrder: (updatedPatients: { id: string, order: number }[]) => void;
  onBulkAddPatients: (patients: Patient[]) => void;
  onAddUser: (u: User) => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  lastSaved: Date | null;
  reportEmail: string;
  setReportEmail: (email: string) => void;
  atbCosts: Record<string, number>;
  setAtbCosts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  patientDays: number;
  setPatientDays: (days: number) => void;
  systemAlert: { message: string, type: 'info' | 'warning' } | null;
  setSystemAlert: (alert: any) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  configNotifyReset: boolean;
  setConfigNotifyReset: (val: boolean) => void;
  configNotifyPending: boolean;
  setConfigNotifyPending: (val: boolean) => void;
  configNotifyExpired: boolean;
  setConfigNotifyExpired: (val: boolean) => void;
  configResetTime: string;
  setConfigResetTime: (val: string) => void;
  configResetTimeUTI: string;
  setConfigResetTimeUTI: (val: string) => void;
  configPendingTimeClinicas: string;
  setConfigPendingTimeClinicas: (val: string) => void;
  configPendingTimeUTI: string;
  setConfigPendingTimeUTI: (val: string) => void;
  configAtbDayLock: boolean;
  setConfigAtbDayLock: (val: boolean) => void;
  configAtbDayChangeTime: string;
  setConfigAtbDayChangeTime: (val: string) => void;
  configAtbDayChangeTimeUTI: string;
  setConfigAtbDayChangeTimeUTI: (val: string) => void;
  isLoading?: boolean;
  activeSectors: string[];
  setActiveSectors: (sectors: string[] | ((prev: string[]) => string[])) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user, patients, users, hospitalName, setHospitalName, bgImage, setBgImage, bgFit, setBgFit, bgPosition, setBgPosition, bgOpacity, setBgOpacity,
  loginBgImage, setLoginBgImage, loginBgFit, setLoginBgFit, loginBgPosition, setLoginBgPosition, loginBgOpacity, setLoginBgOpacity,
  onLogout, onUpdatePatient, onDeletePatient, onAddPatient, onUpdatePatientsOrder, onBulkAddPatients, onAddUser, onUpdateUser, onDeleteUser,
  lastSaved, reportEmail, setReportEmail, atbCosts, setAtbCosts, patientDays, setPatientDays,
  systemAlert, setSystemAlert, isDarkMode, toggleTheme, configNotifyReset, setConfigNotifyReset,
  configNotifyPending, setConfigNotifyPending, configNotifyExpired, setConfigNotifyExpired,
  configResetTime, setConfigResetTime, configResetTimeUTI, setConfigResetTimeUTI, configPendingTimeClinicas,
  setConfigPendingTimeClinicas, configPendingTimeUTI, setConfigPendingTimeUTI, configAtbDayLock, setConfigAtbDayLock, configAtbDayChangeTime, setConfigAtbDayChangeTime,
  configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTI,
  isLoading, activeSectors, setActiveSectors
}) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sva_active_tab') || 'inicio');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTargetPatient, setDeleteTargetPatient] = useState<Patient | null>(null);

  const globalSearchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return patients.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.bed || '').toLowerCase().includes(term) ||
      (p.sector || '').toLowerCase().includes(term) ||
      (p.diagnosis || '').toLowerCase().includes(term) ||
      p.antibiotics.some(a => a.name.toLowerCase().includes(term))
    );
  }, [patients, searchTerm]);
  const [infectoSubTab, setInfectoSubTab] = useState<'todos' | 'pendentes' | 'autorizados' | 'nao_autorizados'>(() =>
    (localStorage.getItem('sva_infecto_subtab') as any) || 'pendentes'
  );
  const [infectoHistoryMonth, setInfectoHistoryMonth] = useState(() =>
    localStorage.getItem('sva_infecto_month') || new Date().toISOString().substring(0, 7)
  );
  const [ccSubTab, setCcSubTab] = useState<'pendentes' | 'avaliados' | 'historico'>(() => {
    const saved = localStorage.getItem('sva_cc_subtab');
    if (saved === 'finalizados') return 'avaliados';
    return (saved as any) || 'pendentes';
  });
  const [ccHistoryMonth, setCcHistoryMonth] = useState(() =>
    localStorage.getItem('sva_cc_month') || new Date().toISOString().substring(0, 7)
  );

  // Controle de notificações persistentes
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('sva_dismissed_notifications');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) return parsed.ids;
    } catch (e) { }
    return [];
  });
  const [reportInitialTab, setReportInitialTab] = useState<string>(() => localStorage.getItem('sva_report_initial_tab') || 'monitoramento');

  // Estados para Sidebar e Responsividade
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sva_sidebar_collapsed') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para Drag and Drop
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);
  const [dragOverPatientId, setDragOverPatientId] = useState<string | null>(null);

  // Controle de alertas persistentes (Baloes)
  const [dismissedPendingAlert, setDismissedPendingAlert] = useState(() => localStorage.getItem('sva_dismissed_pending_alert') === new Date().toISOString().split('T')[0]);

  const SkeletonLine = () => (
    <div className="flex flex-col gap-4 mb-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center flex-1">
          <div className="w-16 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="w-1/3 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-1/4 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700/50 rounded-lg" />)}
      </div>
    </div>
  );

  const EmptyState = ({ title, message }: { title: string; message: string }) => (
    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-500 w-full">
      <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center text-slate-300 dark:text-slate-600 shadow-inner">
        <Search size={48} />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">{message}</p>
      </div>
    </div>
  );

  const unevaluatedPatients = useMemo(() => 
    patients.filter(p => 
      !p.isEvaluated && 
      p.sector !== 'Centro Cirúrgico' &&
      !p.sector?.includes('Centro Cir') &&
      p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO)
    ), 
    [patients]
  );

  const menuItems = useMemo(() => getMenuItems(activeSectors), [activeSectors]);

  const handleDismissPendingAlert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedPendingAlert(true);
    localStorage.setItem('sva_dismissed_pending_alert', new Date().toISOString().split('T')[0]);
  };

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('sva_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  useEffect(() => {
    localStorage.setItem('sva_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('sva_infecto_subtab', infectoSubTab);
  }, [infectoSubTab]);

  useEffect(() => {
    localStorage.setItem('sva_infecto_month', infectoHistoryMonth);
  }, [infectoHistoryMonth]);

  useEffect(() => {
    localStorage.setItem('sva_cc_subtab', ccSubTab);
  }, [ccSubTab]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('sva_dismissed_notifications', JSON.stringify({ date: today, ids: dismissedNotifications }));
  }, [dismissedNotifications]);

  useEffect(() => {
    localStorage.setItem('sva_cc_month', ccHistoryMonth);
  }, [ccHistoryMonth]);

  useEffect(() => {
    localStorage.setItem('sva_report_initial_tab', reportInitialTab);
  }, [reportInitialTab]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.bed.toLowerCase().includes(searchTerm.toLowerCase());
    if (['inicio', 'cadastro', 'relatorios', 'usuarios'].includes(activeTab)) return false;

    if (activeTab === 'finalizados') {
      const hasFinishedAtb = p.antibiotics.some(a =>
        [AntibioticStatus.FINALIZADO, AntibioticStatus.SUSPENSO, AntibioticStatus.TROCADO, AntibioticStatus.EVADIDO, AntibioticStatus.OBITO].includes(a.status)
      );
      return hasFinishedAtb && matchesSearch;
    }

    if (activeTab === 'Centro Cirúrgico') {
      const isCC = p.sector === 'Centro Cirúrgico';
      const historicallyCC = p.sector === 'Centro Cirúrgico' || p.history.some(h => h.details.includes('Centro Cirúrgico'));
      const currentMonth = new Date().toISOString().substring(0, 7);

      if (ccSubTab === 'historico') {
        const matchesMonth = p.antibiotics.some(a => a.startDate.startsWith(ccHistoryMonth)) ||
          (p.procedureDate ? p.procedureDate.startsWith(ccHistoryMonth) : false);
        return historicallyCC && matchesMonth && matchesSearch;
      }

      if (!isCC) return false;
      const isCurrentMonth = p.antibiotics.some(a => a.startDate.startsWith(currentMonth)) ||
        (p.procedureDate ? p.procedureDate.startsWith(currentMonth) : true);

      if (!isCurrentMonth) return false;

      const hasIncision = !!p.incisionRelation;
      if (ccSubTab === 'pendentes') return !hasIncision && matchesSearch;
      return hasIncision && matchesSearch; // Sub-aba 'avaliados'
    }

    if (activeTab === 'infectologia') {
      const isCC = p.sector === 'Centro Cirúrgico' || p.sector?.includes('Centro Cir');
      if (isCC) return false; // Exclui pacientes do Centro Cirúrgico do painel da Infectologia

      const hasActiveAtb = p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO);
      const matchesMonth = p.antibiotics.some(a => a.startDate.startsWith(infectoHistoryMonth));

      const matchesStatus =
        infectoSubTab === 'todos' ? true :
          infectoSubTab === 'pendentes' ? p.infectoStatus === InfectoStatus.PENDENTE :
            infectoSubTab === 'autorizados' ? p.infectoStatus === InfectoStatus.AUTORIZADO :
              infectoSubTab === 'nao_autorizados' ? p.infectoStatus === InfectoStatus.NAO_AUTORIZADO : true;

      // Todos os subtabs exigem ao menos 1 ATB ativo; sem ATB ativo = paciente encerrado/deletado
      return hasActiveAtb && matchesStatus && matchesMonth && matchesSearch;
    }

    const hasActiveAtb = p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO);
    return matchesSearch && p.sector === activeTab && hasActiveAtb;
  });

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      // Se for UTI, ordena numericamente pelo leito obrigatoriamente
      const isUTITab = activeTab?.includes('UTI');
      if (isUTITab) {
        const getBedNumber = (bed: string) => {
          const match = bed.match(/\d+/);
          return match ? parseInt(match[0], 10) : Infinity;
        };
        const bedA = getBedNumber(a.bed);
        const bedB = getBedNumber(b.bed);
        if (bedA !== bedB) return bedA - bedB;
      }

      // Para outros setores, mantém a lógica de order manual e avaliação
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;

      if (a.isEvaluated === b.isEvaluated) return 0;
      return a.isEvaluated ? 1 : -1;
    });
  }, [filteredPatients, activeTab]);

  const handleMovePatient = (patientId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedPatients.findIndex(p => p.id === patientId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sortedPatients.length) return;

    // Troca as ordens dos dois pacientes
    const patient1 = sortedPatients[currentIndex];
    const patient2 = sortedPatients[newIndex];

    // Atribui orders se não existirem
    const order1 = patient1.order ?? currentIndex;
    const order2 = patient2.order ?? newIndex;

    onUpdatePatient({ ...patient1, order: order2 });
    onUpdatePatient({ ...patient2, order: order1 });
  };

  // Funções de Drag and Drop
  const handleDragStart = (e: React.DragEvent, patientId: string) => {
    setDraggedPatientId(patientId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, patientId: string) => {
    e.preventDefault();
    if (patientId !== draggedPatientId) {
      setDragOverPatientId(patientId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPatientId: string) => {
    e.preventDefault();
    if (!draggedPatientId || draggedPatientId === targetPatientId) {
      setDraggedPatientId(null);
      setDragOverPatientId(null);
      return;
    }

    const draggedIndex = sortedPatients.findIndex(p => p.id === draggedPatientId);
    const targetIndex = sortedPatients.findIndex(p => p.id === targetPatientId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSortedPatients = [...sortedPatients];
    const [draggedPatient] = newSortedPatients.splice(draggedIndex, 1);
    newSortedPatients.splice(targetIndex, 0, draggedPatient);

    // Mapeia os IDs dos pacientes filtrados para suas novas ordens
    const updates = newSortedPatients.map((p, index) => ({
      id: p.id,
      order: index
    }));

    onUpdatePatientsOrder(updates);

    setDraggedPatientId(null);
    setDragOverPatientId(null);
  };

  const handleDragEnd = () => {
    setDraggedPatientId(null);
    setDragOverPatientId(null);
  };

  const stats = useMemo(() => {
    const isCC = (sec?: string) => sec === 'Centro Cirúrgico' || sec?.includes('Centro Cir');

    const activeAtbPatients = patients.filter(p => !isCC(p.sector) && p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO));
    const totalActiveATBs = patients.reduce((acc, p) => isCC(p.sector) ? acc : acc + p.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO).length, 0);

    const expiredPatients = activeAtbPatients.filter(p =>
      p.antibiotics.some(a => isAtbVencido(a))
    );

    const finalizedAtbCount = patients.reduce((acc, p) =>
      acc + p.antibiotics.filter(a => [AntibioticStatus.FINALIZADO, AntibioticStatus.SUSPENSO, AntibioticStatus.TROCADO, AntibioticStatus.EVADIDO, AntibioticStatus.OBITO].includes(a.status)).length, 0
    );

    const finalizedPatientsCount = patients.filter(p =>
      p.antibiotics.some(a => [AntibioticStatus.FINALIZADO, AntibioticStatus.SUSPENSO, AntibioticStatus.TROCADO, AntibioticStatus.EVADIDO, AntibioticStatus.OBITO].includes(a.status))
    ).length;

    const sectorCounts: Record<string, number> = {};
    activeSectors.forEach(sector => {
      sectorCounts[sector] = activeAtbPatients.filter(p => p.sector === sector).length;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newCycles = patients.reduce((acc, p) => isCC(p.sector) ? acc : acc + p.antibiotics.filter(a => a.startDate === todayStr).length, 0);

    const evaluatedCount = activeAtbPatients.filter(p => p.isEvaluated || p.infectoStatus === InfectoStatus.AUTORIZADO).length;
    const adesaoCalc = activeAtbPatients.length > 0
      ? parseFloat(((evaluatedCount / activeAtbPatients.length) * 100).toFixed(1))
      : 0;

    return {
      ativos: activeAtbPatients.length,
      emUso: activeAtbPatients.length,
      totalATBs: totalActiveATBs,
      vencidos: expiredPatients.length,
      expiredList: expiredPatients,
      novos: newCycles,
      adesao: adesaoCalc,
      finalizados: finalizedAtbCount,
      finalizedPatients: finalizedPatientsCount,
      sectorCounts
    };
  }, [patients, activeSectors]);

  const notifications = useMemo(() => {
    const list: { id: string, patientName: string, text: string, type: 'expired' | 'pending' | 'system', patientId: string, sector: string }[] = [];

    // Conjunto de IDs de pacientes existentes para evitar notificações de pacientes deletados
    const existingPatientIds = new Set(patients.map(p => p.id));

    if (configNotifyExpired) {
      stats.expiredList
        .filter(p => existingPatientIds.has(p.id)) // só pacientes que ainda existem
        .forEach(p => {
          p.antibiotics.filter(a => isAtbVencido(a)).forEach(a => {
            const notifyId = `expired-${p.id}-${a.id}`;
            if (!dismissedNotifications.includes(notifyId)) {
              list.push({ id: notifyId, patientName: p.name, text: `${a.name} venceu (D${a.durationDays}).`, type: 'expired', patientId: p.id, sector: p.sector });
            }
          });
        });
    }

    if (configNotifyReset) {
      const todayStr = new Date().toISOString().split('T')[0];
      const savedResets = localStorage.getItem('sva_last_sector_resets');
      let lastResetDateMap: Record<string, string> = {};
      try {
        if (savedResets) lastResetDateMap = JSON.parse(savedResets);
      } catch (e) { }

      // Exibe a notificação APENAS após o reset ter sido efetivamente executado no horário hoje
      if (lastResetDateMap['GERAL'] === todayStr) {
        const resetClinId = `reset-clin-${todayStr}`;
        if (!dismissedNotifications.includes(resetClinId)) {
          list.push({
            id: resetClinId,
            patientName: 'Rotina de Reset (Clínicas)',
            text: `Reset de avaliações efetuado às ${configResetTime}`,
            type: 'system',
            patientId: 'system',
            sector: 'Clínicas'
          });
        }
      }

      if (lastResetDateMap['UTI'] === todayStr) {
        const resetUtiId = `reset-uti-${todayStr}`;
        if (!dismissedNotifications.includes(resetUtiId)) {
          list.push({
            id: resetUtiId,
            patientName: 'Rotina de Reset (UTI)',
            text: `Reset de avaliações efetuado às ${configResetTimeUTI}`,
            type: 'system',
            patientId: 'system',
            sector: 'UTI'
          });
        }
      }
    }

    return list;
  }, [patients, stats.expiredList, dismissedNotifications, configNotifyExpired, configNotifyReset, configResetTime, configResetTimeUTI]);

  const handleNotifyClick = () => {
    setReportInitialTab('vencimento');
    setActiveTab('relatorios');
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-500 ${isDarkMode ? 'dark bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden relative`}>
      {/* Imagem de Fundo em Camada Fixa */}
      {bgImage && (
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-700 bg-no-repeat"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: bgFit || 'cover',
            backgroundPosition: bgPosition || 'center',
            zIndex: 0
          }}
        >
          <div
            className="absolute inset-0 bg-slate-950 transition-opacity"
            style={{ opacity: bgOpacity !== undefined ? Number(bgOpacity) : 0.3 }}
          />
        </div>
      )}
      {/* Sidebar Overlay para Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[1000] md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={user.role}
        patients={patients}
        onLogout={onLogout}
        canManageUsers={user.role === UserRole.ADMINISTRADOR}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        activeSectors={activeSectors}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Navbar
          hospitalName={hospitalName}
          user={user}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenSettings={user.role === UserRole.ADMINISTRADOR ? () => setActiveTab('usuarios') : undefined}
        />



        <main className="flex-1 overflow-y-auto p-3 md:p-6 relative custom-scrollbar">
          {activeTab === 'inicio' && (
            <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in text-left">
              
              {/* Barra de Busca Geral no Painel Principal */}
              <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-3 transition-colors">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400" size={22} />
                  <input
                    type="text"
                    placeholder="🔍 Busca Geral: Digite nome do paciente, leito, setor, diagnóstico ou medicamento..."
                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl font-bold text-sm outline-none focus:bg-white dark:focus:bg-slate-900 border-2 border-transparent focus:border-blue-500 transition-all text-slate-900 dark:text-white shadow-inner"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Limpar busca"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <span className="text-xs font-black px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0 border border-blue-100 dark:border-blue-800">
                    {globalSearchResults.length} paciente(s) encontrado(s)
                  </span>
                )}
              </div>

              {/* Resultados da Busca Geral no Painel Principal */}
              {searchTerm.trim() ? (
                <div className="space-y-4 py-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Search className="text-blue-500" size={18} /> Resultados da Busca em Todo o Hospital
                    </h3>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase transition-colors"
                    >
                      Limpar Busca ✖
                    </button>
                  </div>

                  {globalSearchResults.length === 0 ? (
                    <EmptyState
                      title="Nenhum paciente encontrado"
                      message={`Nenhum paciente no hospital corresponde a "${searchTerm}".`}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {globalSearchResults.map((p, index) => (
                        <PatientCard
                          key={p.id}
                          patient={p}
                          role={user.role}
                          activeTab="inicio"
                          onUpdate={onUpdatePatient}
                          onDelete={(id, justification) => onDeletePatient(id, justification)}
                          isDarkMode={isDarkMode}
                          configAtbDayLock={configAtbDayLock}
                          configAtbDayChangeTime={configAtbDayChangeTime}
                          configAtbDayChangeTimeUTI={configAtbDayChangeTimeUTI}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {[
                  { label: 'Pacientes Ativos', value: stats.ativos, icon: <Users size={20} />, color: 'text-blue-600', tab: null },
                  { label: 'Total de ATBs', value: stats.totalATBs, icon: <AlertTriangle size={20} />, color: 'text-emerald-600', tab: null },
                  { label: 'Aguardando Aval.', value: unevaluatedPatients.length, icon: <Clock size={20} />, color: 'text-orange-500', tab: 'pendentes' },
                  { label: 'Novos Ciclos', value: stats.novos, icon: <Clock size={20} />, color: 'text-blue-500', tab: null },
                  { label: 'Adesão', value: `${stats.adesao}%`, icon: <CheckCircle2 size={20} />, color: 'text-indigo-500', tab: null },
                  { label: 'Encerrados', value: stats.finalizedPatients, subtitle: `${stats.finalizedPatients} Pac. • ${stats.finalizados} ATBs`, icon: <ClipboardList size={20} />, color: 'text-slate-600', tab: 'finalizados' },
                ].map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (s.tab) {
                        setReportInitialTab(s.tab);
                        setActiveTab('relatorios');
                      }
                    }}
                    className={`bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-32 group ${s.tab ? 'cursor-pointer hover:border-orange-300 dark:hover:border-orange-500/50 hover:scale-[1.02]' : ''}`}
                    title={s.label === 'Encerrados' ? `Encerrados: ${stats.finalizedPatients} Pacientes com ${stats.finalizados} prescrições encerradas (Finalizados, Suspensos, Trocados, Óbitos e Centro Cirúrgico)` : s.tab ? `Clique para abrir o relatório de ${s.label}` : ''}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{s.label}</p>
                      <div className={`p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 ${s.color} group-hover:scale-110 transition-transform`}>{React.cloneElement(s.icon as React.ReactElement, { size: 18 })}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">{s.value}</p>
                        {s.subtitle && <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase">{s.subtitle}</p>}
                      </div>
                      {s.tab && (
                        <span className="text-[8px] font-black uppercase text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">Ver lista ➔</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {stats.vencidos > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" size={20} /> Vigilância Crítica (Vencimentos)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.expiredList.slice(0, 6).map(p => (
                      <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border-l-[8px] border-l-red-500 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                        <div className="text-left">
                          <p className="text-base font-black text-slate-800 dark:text-white uppercase leading-none truncate max-w-[200px]">{p.name}</p>
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-2.5 uppercase">Setor: <span className="text-slate-600 dark:text-slate-300">{p.sector}</span> | Leito: <span className="text-slate-600 dark:text-slate-300">{p.bed}</span></p>
                        </div>
                        <div className="flex gap-2">
                          {user.role === 'ADMINISTRADOR' && (
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTargetPatient(p); }} className="p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir Paciente (Requer Justificativa)">
                              <X size={24} />
                            </button>
                          )}
                          <button onClick={handleNotifyClick} className="p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-colors">
                            <ChevronRight size={24} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-12">
                {menuItems.filter(m => m.id !== 'inicio' && activeSectors.includes(m.id)).map((item) => {
                  const count = stats.sectorCounts[item.id] || 0;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all text-left group">
                      <div className={`h-18 ${item.color} p-4 flex justify-between items-center transition-all group-hover:h-20`}>
                        <div className="bg-white/20 p-2 rounded-2xl text-white">{React.cloneElement(item.icon as React.ReactElement, { size: 24 })}</div>
                        <span className="bg-white/95 dark:bg-slate-900/95 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-800 dark:text-slate-200 shadow-sm">{count} Pct{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="p-4 pt-3"><h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tighter truncate">{item.label}</h3></div>
                    </button>
                  );
                })}
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all text-left group"
                >
                  <div className="h-18 bg-emerald-600 p-4 flex justify-between items-center transition-all group-hover:h-20">
                    <div className="bg-white/20 p-2 rounded-2xl text-white">
                      <FileSpreadsheet size={24} />
                    </div>
                  </div>
                  <div className="p-4 pt-3">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tighter truncate">Importar Planilha</h3>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <UserManagement
              users={users}
              currentUser={user}
              patients={patients}
              onAddUser={onAddUser}
              onUpdateUser={onUpdateUser}
              onDeleteUser={onDeleteUser}
              hospitalName={hospitalName}
              setHospitalName={setHospitalName}
              bgImage={bgImage}
              setBgImage={setBgImage}
              bgFit={bgFit}
              setBgFit={setBgFit}
              bgPosition={bgPosition}
              setBgPosition={setBgPosition}
              bgOpacity={bgOpacity}
              setBgOpacity={setBgOpacity}
              loginBgImage={loginBgImage}
              setLoginBgImage={setLoginBgImage}
              loginBgFit={loginBgFit}
              setLoginBgFit={setLoginBgFit}
              loginBgPosition={loginBgPosition}
              setLoginBgPosition={setLoginBgPosition}
              loginBgOpacity={loginBgOpacity}
              setLoginBgOpacity={setLoginBgOpacity}
              reportEmail={reportEmail}
              setReportEmail={setReportEmail}
              atbCosts={atbCosts}
              setAtbCosts={setAtbCosts}
              configNotifyReset={configNotifyReset}
              setConfigNotifyReset={setConfigNotifyReset}
              configNotifyPending={configNotifyPending}
              setConfigNotifyPending={setConfigNotifyPending}
              configNotifyExpired={configNotifyExpired}
              setConfigNotifyExpired={setConfigNotifyExpired}
              configResetTime={configResetTime}
              setConfigResetTime={setConfigResetTime}
              configResetTimeUTI={configResetTimeUTI}
              setConfigResetTimeUTI={setConfigResetTimeUTI}
              configPendingTimeClinicas={configPendingTimeClinicas}
              setConfigPendingTimeClinicas={setConfigPendingTimeClinicas}
              configPendingTimeUTI={configPendingTimeUTI}
              setConfigPendingTimeUTI={setConfigPendingTimeUTI}
              configAtbDayLock={configAtbDayLock}
              setConfigAtbDayLock={setConfigAtbDayLock}
              configAtbDayChangeTime={configAtbDayChangeTime}
              setConfigAtbDayChangeTime={setConfigAtbDayChangeTime}
              configAtbDayChangeTimeUTI={configAtbDayChangeTimeUTI}
              setConfigAtbDayChangeTimeUTI={setConfigAtbDayChangeTimeUTI}
              patientDays={patientDays}
              setPatientDays={setPatientDays}
              activeSectors={activeSectors}
              setActiveSectors={setActiveSectors}
            />
          )}
          {activeTab === 'cadastro' && <div className="max-w-4xl mx-auto"><PatientRegistration activeSectors={activeSectors} onAdd={(p) => { onAddPatient(p); setActiveTab('inicio'); }} onCancel={() => setActiveTab('inicio')} /></div>}
          {activeTab === 'relatorios' && <Reports patients={patients} initialReportTab={reportInitialTab} atbCosts={atbCosts} setAtbCosts={setAtbCosts} patientDays={patientDays} setPatientDays={setPatientDays} />}


          {['finalizados', 'Centro Cirúrgico', 'infectologia', ...activeSectors].includes(activeTab) && (
            <div className="max-w-[1200px] mx-auto space-y-3 text-left animate-in fade-in pb-6">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center no-print bg-white dark:bg-slate-800 p-5 md:p-6 lg:p-7 rounded-[2.5rem] shadow-md border border-slate-100 dark:border-slate-700 gap-4 lg:gap-6 transition-colors overflow-hidden">
                <div className="flex flex-col gap-3 min-w-0">
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <div className={`p-4 md:p-5 rounded-[1.5rem] text-white shadow-lg shrink-0 ${menuItems.find(m => m.id === activeTab)?.color || 'bg-slate-500'}`}>{React.cloneElement(menuItems.find(m => m.id === activeTab)?.icon as React.ReactElement, { size: 32 })}</div>
                    <div className="min-w-0">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none truncate">{menuItems.find(m => m.id === activeTab)?.label}</h2>
                      <p className="text-xs md:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5 leading-none">Gestão e Monitoramento</p>
                    </div>
                  </div>
                  {activeTab === 'Centro Cirúrgico' && (() => {
                    const currentMonth = new Date().toISOString().substring(0, 7);
                    const pendCount = patients.filter(p => p.sector === 'Centro Cirúrgico' && !p.incisionRelation && (p.antibiotics.some(a => a.startDate.startsWith(currentMonth)) || (p.procedureDate ? p.procedureDate.startsWith(currentMonth) : true))).length;
                    const avalCount = patients.filter(p => p.sector === 'Centro Cirúrgico' && !!p.incisionRelation && (p.antibiotics.some(a => a.startDate.startsWith(currentMonth)) || (p.procedureDate ? p.procedureDate.startsWith(currentMonth) : true))).length;
                    const histCount = patients.filter(p => (p.sector === 'Centro Cirúrgico' || p.history.some(h => h.details.includes('Centro Cirúrgico'))) && (p.antibiotics.some(a => a.startDate.startsWith(ccHistoryMonth)) || (p.procedureDate ? p.procedureDate.startsWith(ccHistoryMonth) : false))).length;

                    return (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setCcSubTab('pendentes')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'pendentes' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Pendentes ({pendCount})</button>
                        <button onClick={() => setCcSubTab('avaliados')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'avaliados' || (ccSubTab as string) === 'finalizados' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Avaliados ({avalCount})</button>
                        <button onClick={() => setCcSubTab('historico')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'historico' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Histórico ({histCount})</button>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 min-w-0">
                  {activeTab === 'infectologia' && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setInfectoSubTab('pendentes')} className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'pendentes' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Pendentes</button>
                        <button onClick={() => setInfectoSubTab('autorizados')} className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'autorizados' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Aut.</button>
                        <button onClick={() => setInfectoSubTab('nao_autorizados')} className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'nao_autorizados' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Não Aut.</button>
                        <button onClick={() => setInfectoSubTab('todos')} className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'todos' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Todos</button>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 px-2.5 rounded-xl border border-slate-100 shadow-inner justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">Mês:</span>
                        <input type="month" className="bg-transparent border-0 font-bold text-xs outline-none text-slate-600" value={infectoHistoryMonth} onChange={e => setInfectoHistoryMonth(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Centro Cirúrgico' && ccSubTab === 'historico' && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Mês:</span>
                      <input type="month" className="bg-transparent border-0 font-bold text-sm outline-none text-slate-600" value={ccHistoryMonth} onChange={e => setCcHistoryMonth(e.target.value)} />
                    </div>
                  )}
                  <div className="relative w-full sm:w-64 md:w-72 lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input type="text" placeholder="Filtrar por nome ou leito..." className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl font-bold text-sm outline-none focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 transition-all shadow-inner text-slate-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonLine key={i} />)
                ) : sortedPatients.length === 0 ? (
                  <EmptyState
                    title="Nenhum paciente"
                    message={searchTerm ? `Busca "${searchTerm}" sem resultados.` : "Ainda não há pacientes neste setor."}
                  />
                ) : (
                  sortedPatients.map((p, index) => (
                    <PatientCard
                      key={p.id}
                      patient={p}
                      role={user.role}
                      activeTab={activeTab}
                      onUpdate={onUpdatePatient}
                      onDelete={onDeletePatient}
                      onMoveUp={() => handleMovePatient(p.id, 'up')}
                      onMoveDown={() => handleMovePatient(p.id, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < sortedPatients.length - 1}
                      isDarkMode={isDarkMode}
                      configAtbDayLock={configAtbDayLock}
                      configAtbDayChangeTime={configAtbDayChangeTime}
                      configAtbDayChangeTimeUTI={configAtbDayChangeTimeUTI}
                      onDragStart={handleDragStart}
                      onDragOver={(e) => handleDragOver(e, p.id)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedPatientId === p.id}
                      isDragOver={dragOverPatientId === p.id}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </main>
        <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-3 max-w-md pointer-events-none no-print">
          {systemAlert && (
            <div
              onClick={() => { if (systemAlert.message.includes('Pendentes')) setActiveTab('inicio'); }}
              className={`pointer-events-auto p-5 rounded-[2rem] border-2 flex items-center justify-between shadow-2xl backdrop-blur-md cursor-pointer hover:scale-[1.02] transition-all animate-in slide-in-from-right-4 w-full
              ${systemAlert.type === 'warning' ? 'bg-red-500/95 border-red-400 text-white' : 'bg-blue-500/95 border-blue-400 text-white'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <ShieldCheck size={24} className="text-white animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Sistema</p>
                  <p className="text-xs font-black uppercase tracking-tight leading-tight">{systemAlert.message}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (systemAlert?.id) {
                    const dismissed = safeJsonParse(localStorage.getItem('sva_dismissed_alerts'), [] as string[]);
                    if (!dismissed.includes(systemAlert.id)) {
                      dismissed.push(systemAlert.id);
                      localStorage.setItem('sva_dismissed_alerts', JSON.stringify(dismissed));
                    }
                  }
                  setSystemAlert(null);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors ml-4"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notifications.map((notify) => (
            <div key={notify.id} className={`pointer-events-auto text-white p-3.5 rounded-2xl shadow-xl border-l-4 animate-in slide-in-from-right-5 flex flex-col gap-2 relative group w-72
              ${notify.type === 'expired' ? 'bg-slate-900 border-l-red-500' : 'bg-slate-900 border-l-blue-500'}`}>
              <button onClick={(e) => { e.stopPropagation(); setDismissedNotifications(prev => [...prev, notify.id]); }} className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-red-500 rounded-full transition-colors" title="Dispensar"><X size={12} /></button>
              <div className="cursor-pointer" onClick={() => {
                if (notify.type === 'expired') {
                  setSearchTerm(notify.patientName);
                  setActiveTab(notify.sector);
                } else {
                  setReportInitialTab('pendentes');
                  setActiveTab('relatorios');
                }
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1 rounded-lg ${notify.type === 'expired' ? 'bg-red-500' : 'bg-blue-500'}`}>
                    <Bell size={12} />
                  </div>
                  <span className={`text-[8px] font-black uppercase ${notify.type === 'expired' ? 'text-red-400' : 'text-blue-400'}`}>
                    {notify.type === 'expired' ? 'Vencimento ATB (Individual)' : 'Rotina do Sistema (Geral)'}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase leading-tight text-white">{notify.patientName}</p>
                <p className="text-[9px] font-bold text-slate-300 uppercase italic mt-0.5">{notify.text}</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase">Ver mais <ArrowRight size={10} /></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isBulkImportOpen && (
        <BulkImport
          onImport={(importedPatients) => {
            onBulkAddPatients(importedPatients);
            setIsBulkImportOpen(false);
          }}
          onCancel={() => setIsBulkImportOpen(false)}
        />
      )}

      <DeletePatientModal
        patient={deleteTargetPatient}
        isOpen={!!deleteTargetPatient}
        onClose={() => setDeleteTargetPatient(null)}
        onConfirmDelete={(id, justification) => onDeletePatient(id, justification)}
        userName={user.name}
      />
    </div>
  );
};

export default Dashboard;
