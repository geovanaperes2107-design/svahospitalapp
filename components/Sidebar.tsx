
import React from 'react';
import { LogOut, Settings, ShieldCheck, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { UserRole, Patient, InfectoStatus } from '../types';
import { MENU_ITEMS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  patients: Patient[];
  onLogout: () => void;
  canManageUsers: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  role,
  patients,
  onLogout,
  canManageUsers,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const isVisualizer = role === UserRole.VISUALIZADOR;

  // Badge da Infectologia deve ignorar CC
  const infectoPendingCount = patients.filter(p => p.infectoStatus === InfectoStatus.PENDENTE && p.sector !== 'Centro Cirúrgico').length;

  return (
    <div className={`
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      ${isCollapsed ? 'w-20' : 'w-52'}
      fixed md:relative z-[1001] bg-[#0a1120] h-full flex flex-col text-slate-400 border-r border-white/5 no-print transition-all duration-300 ease-in-out
    `}>
      <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-emerald-900/20 shrink-0">
          ATB
        </div>
        {!isCollapsed && (
          <div className="text-left animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="text-white font-black leading-none text-base tracking-tight uppercase">SVA</h1>
            <p className="text-[7px] uppercase tracking-widest text-slate-500 font-bold leading-tight mt-0.5">Vigilância</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 768) setIsMobileOpen(false);
              }}
              title={isCollapsed ? item.label : ''}
              className={`
                w-full flex items-center px-3 py-3 rounded-xl text-[11px] font-black transition-all duration-200 group relative
                ${isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                ${isCollapsed ? 'justify-center' : 'space-x-3'}
              `}
            >
              <div className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors shrink-0`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
              </div>

              {!isCollapsed && (
                <span className="tracking-tight uppercase truncate flex-1 text-left animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}

              {item.id === 'infectologia' && infectoPendingCount > 0 && !isActive && (
                <span className={`
                  bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full
                  ${isCollapsed ? 'absolute -top-1 -right-1 border-2 border-[#0a1120]' : ''}
                `}>
                  {infectoPendingCount}
                </span>
              )}

              {isActive && isCollapsed && (
                <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full" />
              )}
            </button>
          );
        })}

        {role === UserRole.ADMINISTRADOR && (
          <div className="pt-4 mt-4 border-t border-white/5">
            <button
              onClick={() => {
                setActiveTab('usuarios');
                if (window.innerWidth < 768) setIsMobileOpen(false);
              }}
              title={isCollapsed ? 'Configurações' : ''}
              className={`
                  w-full flex items-center px-3 py-3 rounded-xl text-[11px] font-black transition-all duration-200 group relative
                  ${activeTab === 'usuarios'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                  ${isCollapsed ? 'justify-center' : 'space-x-3'}
                `}
            >
              <div className={`${activeTab === 'usuarios' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors shrink-0`}>
                <Settings size={18} />
              </div>
              {!isCollapsed && (
                <span className="tracking-tight uppercase animate-in fade-in slide-in-from-left-2 duration-300">Configurações</span>
              )}
              {activeTab === 'usuarios' && isCollapsed && (
                <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full" />
              )}
            </button>
          </div>
        )}
      </nav>

      <div className="p-2 border-t border-white/5 space-y-1">
        {/* Botão de Colapso (Desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-full items-center justify-center p-3 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition-all group"
          title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : (
            <div className="flex items-center space-x-3 w-full px-1">
              <ChevronLeft size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Recolher</span>
            </div>
          )}
        </button>

        <button
          onClick={onLogout}
          className={`
            w-full flex items-center p-3 rounded-xl text-xs font-black text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all group
            ${isCollapsed ? 'justify-center' : 'space-x-3'}
          `}
          title={isCollapsed ? 'Sair' : ''}
        >
          <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
          {!isCollapsed && <span className="uppercase animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
