
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
  ShieldCheck
} from 'lucide-react';
import { UserRole, Patient, InfectoStatus, AntibioticStatus, User } from '../types';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import PatientCard from './PatientCard';
import PatientRegistration from './PatientRegistration';
import Reports from './Reports';
import UserManagement from './UserManagement';
import { getDaysRemaining, calculateEndDate } from '../utils';
import { MENU_ITEMS, SECTORS } from '../constants';

interface DashboardProps {
  user: User;
  patients: Patient[];
  users: User[];
  hospitalName: string;
  setHospitalName: (name: string) => void;
  bgImage: string;
  setBgImage: (img: string) => void;
  loginBgImage: string;
  setLoginBgImage: (img: string) => void;
  onLogout: () => void;
  onUpdatePatient: (p: Patient) => void;
  onDeletePatient: (id: string) => void;
  onAddPatient: (p: Patient) => void;
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
  configPendingTime: string;
  setConfigPendingTime: (val: string) => void;
  configAtbDayLock: boolean;
  setConfigAtbDayLock: (val: boolean) => void;
  configAtbDayChangeTime: string;
  setConfigAtbDayChangeTime: (val: string) => void;
  configAtbDayChangeTimeUTI: string;
  setConfigAtbDayChangeTimeUTI: (val: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user, patients, users, hospitalName, setHospitalName, bgImage, setBgImage, loginBgImage, setLoginBgImage,
  onLogout, onUpdatePatient, onDeletePatient, onAddPatient, onAddUser, onUpdateUser, onDeleteUser,
  lastSaved, reportEmail, setReportEmail, atbCosts, setAtbCosts, patientDays, setPatientDays,
  systemAlert, setSystemAlert, isDarkMode, toggleTheme, configNotifyReset, setConfigNotifyReset,
  configNotifyPending, setConfigNotifyPending, configNotifyExpired, setConfigNotifyExpired,
  configResetTime, setConfigResetTime, configResetTimeUTI, setConfigResetTimeUTI, configPendingTime,
  setConfigPendingTime, configAtbDayLock, setConfigAtbDayLock, configAtbDayChangeTime, setConfigAtbDayChangeTime,
  configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTI
}) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sva_active_tab') || 'inicio');
  const [searchTerm, setSearchTerm] = useState('');
  const [infectoSubTab, setInfectoSubTab] = useState<'todos' | 'pendentes' | 'autorizados' | 'nao_autorizados'>(() =>
    (localStorage.getItem('sva_infecto_subtab') as any) || 'pendentes'
  );
  const [infectoHistoryMonth, setInfectoHistoryMonth] = useState(() =>
    localStorage.getItem('sva_infecto_month') || new Date().toISOString().substring(0, 7)
  );
  const [ccSubTab, setCcSubTab] = useState<'pendentes' | 'avaliados' | 'historico'>(() =>
    (localStorage.getItem('sva_cc_subtab') as any) || 'pendentes'
  );
  const [ccHistoryMonth, setCcHistoryMonth] = useState(() =>
    localStorage.getItem('sva_cc_month') || new Date().toISOString().substring(0, 7)
  );

  // Controle de notificações de vencimento
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [reportInitialTab, setReportInitialTab] = useState<string>(() => localStorage.getItem('sva_report_initial_tab') || 'monitoramento');

  // Estados para Sidebar e Responsividade
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sva_sidebar_collapsed') === 'true');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados para Drag and Drop
  const [draggedPatientId, setDraggedPatientId] = useState<string | null>(null);
  const [dragOverPatientId, setDragOverPatientId] = useState<string | null>(null);

  // Controle de alertas persistentes (Baloes)
  const [dismissedPendingAlert, setDismissedPendingAlert] = useState(() => localStorage.getItem('sva_dismissed_pending_alert') === new Date().toISOString().split('T')[0]);

  const unevaluatedPatients = useMemo(() => patients.filter(p => !p.isEvaluated && p.sector !== 'Centro Cirúrgico'), [patients]);

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
    localStorage.setItem('sva_cc_month', ccHistoryMonth);
  }, [ccHistoryMonth]);

  useEffect(() => {
    localStorage.setItem('sva_report_initial_tab', reportInitialTab);
  }, [reportInitialTab]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.bed.toLowerCase().includes(searchTerm.toLowerCase());
    if (['inicio', 'cadastro', 'relatorios', 'usuarios'].includes(activeTab)) return false;

    if (activeTab === 'finalizados') {
      const isFinishedOrEvaded = p.antibiotics.some(a =>
        [AntibioticStatus.FINALIZADO, AntibioticStatus.SUSPENSO, AntibioticStatus.TROCADO, AntibioticStatus.EVADIDO].includes(a.status)
      );
      return isFinishedOrEvaded && matchesSearch;
    }

    if (activeTab === 'Centro Cirúrgico') {
      const isCC = p.sector === 'Centro Cirúrgico';
      const historicallyCC = p.sector === 'Centro Cirúrgico' || p.history.some(h => h.details.includes('Centro Cirúrgico'));

      if (ccSubTab === 'historico') {
        const matchesMonth = p.antibiotics.some(a => a.startDate.startsWith(ccHistoryMonth));
        return historicallyCC && matchesMonth && matchesSearch;
      }

      if (!isCC) return false;
      const isEvaluated = !!p.incisionRelation;
      if (ccSubTab === 'pendentes') return !isEvaluated && matchesSearch;
      return isEvaluated && matchesSearch;
    }

    if (activeTab === 'infectologia') {
      const hasActiveAtb = p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO);
      const matchesMonth = p.antibiotics.some(a => a.startDate.startsWith(infectoHistoryMonth));

      const matchesStatus =
        infectoSubTab === 'todos' ? true :
          infectoSubTab === 'pendentes' ? p.infectoStatus === InfectoStatus.PENDENTE :
            infectoSubTab === 'autorizados' ? p.infectoStatus === InfectoStatus.AUTORIZADO :
              infectoSubTab === 'nao_autorizados' ? p.infectoStatus === InfectoStatus.NAO_AUTORIZADO : true;

      return hasActiveAtb && matchesStatus && matchesMonth && matchesSearch;
    }

    const hasActiveAtb = p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO);
    return matchesSearch && p.sector === activeTab && hasActiveAtb;
  });

  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      // Primeiro ordena por order (se definido)
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      // Depois mantém a lógica original de avaliados por último
      if (a.isEvaluated === b.isEvaluated) return 0;
      return a.isEvaluated ? 1 : -1;
    });
  }, [filteredPatients]);

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

    // Reordena atribuindo nova ordem para todos os pacientes afetados
    const newSortedPatients = [...sortedPatients];
    const [draggedPatient] = newSortedPatients.splice(draggedIndex, 1);
    newSortedPatients.splice(targetIndex, 0, draggedPatient);

    // Atualiza a ordem de todos os pacientes reordenados
    newSortedPatients.forEach((patient, index) => {
      if (patient.order !== index) {
        onUpdatePatient({ ...patient, order: index });
      }
    });

    setDraggedPatientId(null);
    setDragOverPatientId(null);
  };

  const handleDragEnd = () => {
    setDraggedPatientId(null);
    setDragOverPatientId(null);
  };

  const stats = useMemo(() => {
    const activeAtbPatients = patients.filter(p => p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO));
    const expiredPatients = activeAtbPatients.filter(p =>
      !p.sector.includes('Centro Cir') &&
      p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO && getDaysRemaining(calculateEndDate(a.startDate, a.durationDays)) <= 0)
    );

    const finalizedCount = patients.filter(p => p.antibiotics.some(a => a.status === AntibioticStatus.FINALIZADO)).length;

    const sectorCounts: Record<string, number> = {};
    SECTORS.forEach(sector => {
      sectorCounts[sector] = activeAtbPatients.filter(p => p.sector === sector).length;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const newCycles = patients.reduce((acc, p) => acc + p.antibiotics.filter(a => a.startDate === todayStr).length, 0);

    return {
      ativos: patients.length,
      emUso: activeAtbPatients.length,
      vencidos: expiredPatients.length,
      expiredList: expiredPatients,
      novos: newCycles,
      adesao: 94.2,
      finalizados: finalizedCount,
      sectorCounts
    };
  }, [patients]);

  const notifications = useMemo(() => {
    const list: { id: string, patientName: string, atbName: string }[] = [];
    if (configNotifyExpired) {
      stats.expiredList.forEach(p => {
        p.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO && getDaysRemaining(calculateEndDate(a.startDate, a.durationDays)) <= 0).forEach(a => {
          const notifyId = `${p.id}-${a.id}`;
          if (!dismissedNotifications.includes(notifyId)) {
            list.push({ id: notifyId, patientName: p.name, atbName: a.name });
          }
        });
      });
    }
    return list;
  }, [stats.expiredList, dismissedNotifications, configNotifyExpired]);

  const handleNotifyClick = () => {
    setReportInitialTab('vencimento');
    setActiveTab('relatorios');
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden relative`}>
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
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Navbar
          hospitalName={hospitalName}
          user={user}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />



        <main className="flex-1 overflow-y-auto p-3 md:p-6 relative custom-scrollbar">
          {activeTab === 'inicio' && (
            <div className="max-w-7xl mx-auto space-y-3 animate-in fade-in text-left">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: 'Pacientes Ativos', value: stats.ativos, icon: <Users size={20} />, color: 'text-blue-600' },
                  { label: 'Em Uso de ATB', value: stats.emUso, icon: <AlertTriangle size={20} />, color: 'text-emerald-600' },
                  { label: 'Novos Ciclos', value: stats.novos, icon: <Clock size={20} />, color: 'text-blue-500' },
                  { label: 'Adesão', value: `${stats.adesao}%`, icon: <CheckCircle2 size={20} />, color: 'text-indigo-500' },
                  { label: 'Finalizados', value: stats.finalizados, icon: <ClipboardList size={20} />, color: 'text-slate-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-36 transition-colors">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">{s.label}</p>
                      <div className={`p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 ${s.color}`}>{React.cloneElement(s.icon as React.ReactElement, { size: 22 })}</div>
                    </div>
                    <div>
                      <p className="text-4xl font-black text-slate-900 dark:text-white leading-none">{s.value}</p>
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
                        <button onClick={handleNotifyClick} className="p-3 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-colors">
                          <ChevronRight size={24} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-12">
                {MENU_ITEMS.filter(m => m.id !== 'inicio').map((item) => {
                  const isSector = SECTORS.includes(item.id);
                  const count = isSector ? stats.sectorCounts[item.id] : 0;
                  return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all text-left group">
                      <div className={`h-18 ${item.color} p-4 flex justify-between items-center transition-all group-hover:h-20`}>
                        <div className="bg-white/20 p-2 rounded-2xl text-white">{React.cloneElement(item.icon as React.ReactElement, { size: 24 })}</div>
                        {isSector && <span className="bg-white/95 dark:bg-slate-900/95 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-800 dark:text-slate-200 shadow-sm">{count} Pct{count !== 1 ? 's' : ''}</span>}
                      </div>
                      <div className="p-4 pt-3"><h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tighter truncate">{item.label}</h3></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'usuarios' && (
            <UserManagement
              users={users}
              currentUser={user}
              onAddUser={onAddUser}
              onUpdateUser={onUpdateUser}
              onDeleteUser={onDeleteUser}
              hospitalName={hospitalName}
              setHospitalName={setHospitalName}
              bgImage={bgImage}
              setBgImage={setBgImage}
              loginBgImage={loginBgImage}
              setLoginBgImage={setLoginBgImage}
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
              configPendingTime={configPendingTime}
              setConfigPendingTime={setConfigPendingTime}
              configAtbDayLock={configAtbDayLock}
              setConfigAtbDayLock={setConfigAtbDayLock}
              configAtbDayChangeTime={configAtbDayChangeTime}
              setConfigAtbDayChangeTime={setConfigAtbDayChangeTime}
              configAtbDayChangeTimeUTI={configAtbDayChangeTimeUTI}
              setConfigAtbDayChangeTimeUTI={setConfigAtbDayChangeTimeUTI}
              patientDays={patientDays}
              setPatientDays={setPatientDays}
            />
          )}
          {activeTab === 'cadastro' && <div className="max-w-4xl mx-auto"><PatientRegistration onAdd={(p) => { onAddPatient(p); setActiveTab('inicio'); }} onCancel={() => setActiveTab('inicio')} /></div>}
          {activeTab === 'relatorios' && <Reports patients={patients} initialReportTab={reportInitialTab} atbCosts={atbCosts} setAtbCosts={setAtbCosts} patientDays={patientDays} setPatientDays={setPatientDays} />}

          {['finalizados', 'Centro Cirúrgico', 'infectologia', ...SECTORS].includes(activeTab) && (
            <div className="max-w-[1200px] mx-auto space-y-3 text-left animate-in fade-in pb-6">
              <div className="flex flex-col md:flex-row justify-between items-center no-print bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-md border border-slate-100 dark:border-slate-700 gap-8 transition-colors">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-8">
                    <div className={`p-5 rounded-[1.5rem] text-white shadow-lg ${MENU_ITEMS.find(m => m.id === activeTab)?.color || 'bg-slate-500'}`}>{React.cloneElement(MENU_ITEMS.find(m => m.id === activeTab)?.icon as React.ReactElement, { size: 36 })}</div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{MENU_ITEMS.find(m => m.id === activeTab)?.label}</h2>
                      <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 leading-none">Gestão e Monitoramento</p>
                    </div>
                  </div>
                  {activeTab === 'Centro Cirúrgico' && (
                    <div className="flex gap-2">
                      <button onClick={() => setCcSubTab('pendentes')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'pendentes' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Pendentes</button>
                      <button onClick={() => setCcSubTab('avaliados')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'avaliados' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Avaliados</button>
                      <button onClick={() => setCcSubTab('historico')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${ccSubTab === 'historico' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Histórico</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                  {activeTab === 'infectologia' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => setInfectoSubTab('pendentes')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'pendentes' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Pendentes</button>
                        <button onClick={() => setInfectoSubTab('autorizados')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'autorizados' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Aut.</button>
                        <button onClick={() => setInfectoSubTab('nao_autorizados')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'nao_autorizados' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Não Aut.</button>
                        <button onClick={() => setInfectoSubTab('todos')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${infectoSubTab === 'todos' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>Todos</button>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner w-full justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Mês:</span>
                        <input type="month" className="bg-transparent border-0 font-bold text-sm outline-none text-slate-600" value={infectoHistoryMonth} onChange={e => setInfectoHistoryMonth(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'Centro Cirúrgico' && ccSubTab === 'historico' && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Mês:</span>
                      <input type="month" className="bg-transparent border-0 font-bold text-sm outline-none text-slate-600" value={ccHistoryMonth} onChange={e => setCcHistoryMonth(e.target.value)} />
                    </div>
                  )}
                  <div className="relative w-full md:w-[450px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={24} />
                    <input type="text" placeholder="Filtrar por nome ou leito..." className="w-full pl-14 pr-8 py-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl font-bold text-base outline-none focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-400 dark:focus:border-blue-500 transition-all shadow-inner text-slate-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {sortedPatients.map((p, index) => (
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
                ))}
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
                onClick={(e) => { e.stopPropagation(); setSystemAlert(null); }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors ml-4"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {configNotifyPending && unevaluatedPatients.length > 0 && !dismissedPendingAlert && (
            <div
              onClick={() => setActiveTab('inicio')}
              className="pointer-events-auto p-5 rounded-[2rem] bg-orange-600/95 border-2 border-orange-400 text-white flex items-center justify-between shadow-2xl backdrop-blur-md cursor-pointer hover:scale-[1.05] transition-all animate-in slide-in-from-right-4 w-full"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20">
                  <Bell size={24} className="text-white animate-bounce" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Aviso</p>
                  <p className="text-xs font-black uppercase tracking-tight leading-tight">
                    {unevaluatedPatients.length} {unevaluatedPatients.length === 1 ? 'paciente pendente' : 'pacientes pendentes'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismissPendingAlert}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors ml-4"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notifications.map((notify) => (
            <div key={notify.id} className="pointer-events-auto bg-slate-900 text-white p-3 rounded-2xl shadow-xl border-l-4 border-l-red-500 animate-in slide-in-from-right-5 flex flex-col gap-2 relative group">
              <button onClick={(e) => { e.stopPropagation(); setDismissedNotifications(prev => [...prev, notify.id]); }} className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-red-500 rounded-full transition-colors"><X size={12} /></button>
              <div className="cursor-pointer" onClick={handleNotifyClick}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-red-500 rounded-lg"><Bell size={12} /></div>
                  <span className="text-[8px] font-black uppercase text-red-400">Vencimento</span>
                </div>
                <p className="text-[9px] font-black uppercase leading-tight">{notify.patientName}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-0.5">{notify.atbName} venceu.</p>
                <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase">Ver <ArrowRight size={10} /></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
