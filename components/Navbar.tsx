
import React from 'react';
import { User as UserIcon, Building2, Moon, Sun, Menu, X } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
    hospitalName: string;
    user: User;
    isDarkMode: boolean;
    toggleTheme: () => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (val: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({
    hospitalName,
    user,
    isDarkMode,
    toggleTheme,
    isMobileMenuOpen,
    setIsMobileMenuOpen
}) => {
    return (
        <header className="h-20 flex items-center justify-between px-4 md:px-8 border-b border-black/5 bg-white shadow-sm no-print transition-colors duration-300">
            <div className="flex items-center space-x-3 md:space-x-4">
                {/* Menu Hambúrguer (Mobile) */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 md:hidden text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <div className="bg-emerald-600 p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-lg shadow-emerald-100/50 shrink-0">
                    <Building2 className="text-white" size={24} />
                </div>
                <div className="text-left flex-1 min-w-0">
                    <h1 className="text-xs sm:text-base md:text-xl font-black text-slate-900 leading-none tracking-tight uppercase truncate">
                        SVA <span className="hidden mini:inline sm:inline">• Vigilância</span>
                    </h1>
                    <p className="text-[7px] sm:text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 truncate max-w-[120px] sm:max-w-none">
                        {hospitalName}
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-3 md:space-x-6">
                <button
                    onClick={toggleTheme}
                    className={`p-2 md:p-2.5 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                    title={isDarkMode ? "Modo Claro" : "Modo Noturno (Dark Mode)"}
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="flex items-center gap-2 md:gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="font-black text-xs md:text-sm text-slate-900 uppercase tracking-tight">{user.name}</p>
                        <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner overflow-hidden shrink-0">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={24} />
                        )}
                    </div>
                </div>
            </div>
        </header >
    );
};

export default Navbar;
