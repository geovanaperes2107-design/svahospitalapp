
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
}

const Dashboard: React.FC<DashboardProps> = ({ user, patients, users, hospitalName, setHospitalName, bgImage, setBgImage, loginBgImage, setLoginBgImage, onLogout, onUpdatePatient, onDeletePatient, onAddPatient, onAddUser, onUpdateUser, onDeleteUser, lastSaved, reportEmail, setReportEmail, atbCosts, setAtbCosts, patientDays, setPatientDays, systemAlert, setSystemAlert, isDarkMode, toggleTheme }) => {
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
      if (a.isEvaluated === b.isEvaluated) return 0;
      return a.isEvaluated ? 1 : -1;
    });
  }, [filteredPatients]);

  const stats = useMemo(() => {
    const activeAtbPatients = patients.filter(p => p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO));
    const expiredPatients = activeAtbPatients.filter(p =>
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
    stats.expiredList.forEach(p => {
      p.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO && getDaysRemaining(calculateEndDate(a.startDate, a.durationDays)) <= 0).forEach(a => {
        const notifyId = `${p.id}-${a.id}`;
        if (!dismissedNotifications.includes(notifyId)) {
          list.push({ id: notifyId, patientName: p.name, atbName: a.name });
        }
      });
    });
    return list;
  }, [stats.expiredList, dismissedNotifications]);

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

        {systemAlert && (
          <div className="mx-2 md:mx-6 mt-4 animate-in slide-in-from-top-4 duration-300">
            <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg ${systemAlert.type === 'warning' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className={systemAlert.type === 'warning' ? 'text-red-500' : 'text-blue-500'} />
                <p className="text-[10px] md:text-sm font-black uppercase tracking-tight">{systemAlert.message}</p>
              </div>
              <button onClick={() => setSystemAlert(null)} className="p-1 hover:bg-black/5 rounded-full"><X size={16} /></button>
            </div>
          </div>
        )}

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
                {sortedPatients.map(p => <PatientCard key={p.id} patient={p} role={user.role} activeTab={activeTab} onUpdate={onUpdatePatient} onDelete={onDeletePatient} isDarkMode={isDarkMode} />)}
              </div>
            </div>
          )}
        </main>
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-xs pointer-events-none no-print">
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
