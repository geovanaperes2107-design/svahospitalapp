
import React from 'react';
import { LogOut, Settings, ShieldCheck } from 'lucide-react';
import { UserRole, Patient, InfectoStatus } from '../types';
import { MENU_ITEMS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole;
  patients: Patient[];
  onLogout: () => void;
  canManageUsers: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role, patients, onLogout, canManageUsers }) => {
  const isVisualizer = role === UserRole.VISUALIZADOR;

  // Badge da Infectologia deve ignorar CC
  const infectoPendingCount = patients.filter(p => p.infectoStatus === InfectoStatus.PENDENTE && p.sector !== 'Centro Cirúrgico').length;

  return (
    <div className="w-48 bg-[#0a1120] h-full flex flex-col text-slate-400 border-r border-white/5 no-print">
      <div className="p-3 flex items-center space-x-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-[8px] shadow">
          ATB
        </div>
        <div className="text-left">
          <h1 className="text-white font-black leading-none text-sm tracking-tight uppercase">SVA</h1>
          <p className="text-[6px] uppercase tracking-wide text-slate-500 font-bold leading-tight">Vigilância de Antimicrobianos</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
        <div className="space-y-0.5">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            if (item.id === 'cadastro' && isVisualizer) return null;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[11px] font-black transition-all duration-200 group
                  ${isActive
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <div className="flex items-center space-x-2 text-left">
                  <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 15 })}
                  </span>
                  <span className="tracking-tight uppercase truncate">{item.label}</span>
                </div>

                {item.id === 'infectologia' && infectoPendingCount > 0 && !isActive && (
                  <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full">
                    {infectoPendingCount}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[11px] font-black transition-all duration-200 group
                ${activeTab === 'usuarios'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
              `}
          >
            <div className="flex items-center space-x-2 text-left">
              <span className={`${activeTab === 'usuarios' ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                <Settings size={15} />
              </span>
              <span className="tracking-tight uppercase">Configurações</span>
            </div>
          </button>
        </div>
      </nav>

      <div className="p-2 mt-auto border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-black text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all group"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span className="uppercase">Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
