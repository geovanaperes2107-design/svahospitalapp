
import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Shield, Key, Trash2, Edit2, Search, X, CheckCircle2, Building2, Save, Image as ImageIcon, Upload, Monitor, Lock, Unlock, MailCheck, AlertCircle, Eye, EyeOff, Bell, Clock, Users, LayoutGrid, PlusCircle, Archive, ArchiveRestore, Info, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, UserRole, Patient, AntibioticStatus, normalizeRole } from '../types';
import { DEFAULT_SECTORS } from '../constants';
import { safeJsonParse } from '../utils';

interface UserManagementProps {
    users: User[];
    currentUser: User;
    patients?: Patient[];
    onAddUser: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (id: string) => void;
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
    reportEmail: string;
    setReportEmail: (email: string) => void;
    atbCosts: Record<string, number>;
    setAtbCosts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    patientDays: number;
    setPatientDays: (val: number) => void;
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
    activeSectors: string[];
    setActiveSectors: (sectors: string[] | ((prev: string[]) => string[])) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
    users, currentUser, patients = [], onAddUser, onUpdateUser, onDeleteUser, hospitalName, setHospitalName,
    bgImage, setBgImage, bgFit = 'cover', setBgFit, bgPosition = 'center', setBgPosition, bgOpacity = '0.3', setBgOpacity,
    loginBgImage, setLoginBgImage, loginBgFit = 'cover', setLoginBgFit, loginBgPosition = 'center', setLoginBgPosition, loginBgOpacity = '0.4', setLoginBgOpacity,
    reportEmail, setReportEmail, atbCosts, setAtbCosts,
    patientDays, setPatientDays, configNotifyReset, setConfigNotifyReset, configNotifyPending,
    setConfigNotifyPending, configNotifyExpired, setConfigNotifyExpired, configResetTime,
    setConfigResetTime, configResetTimeUTI, setConfigResetTimeUTI, configPendingTimeClinicas, setConfigPendingTimeClinicas,
    configPendingTimeUTI, setConfigPendingTimeUTI,
    configAtbDayLock, setConfigAtbDayLock, configAtbDayChangeTime, setConfigAtbDayChangeTime,
    configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTI,
    activeSectors, setActiveSectors
}) => {
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [newResetPassword, setNewResetPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempHospitalName, setTempHospitalName] = useState(hospitalName);
    const [showEmailToast, setShowEmailToast] = useState<{ name: string, email: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'alerts' | 'params' | 'paineis'>(() => {
        const isAdm = normalizeRole(currentUser.role) === UserRole.ADMINISTRADOR;
        return isAdm ? 'users' : 'params';
    });
    const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null);
    const [newSectorName, setNewSectorName] = useState('');

    const [allKnownSectors, setAllKnownSectors] = useState<string[]>(() => {
        const saved = localStorage.getItem('sva_all_known_sectors');
        const initial = saved ? safeJsonParse(saved, DEFAULT_SECTORS) : DEFAULT_SECTORS;
        return Array.from(new Set([...initial, ...DEFAULT_SECTORS, ...activeSectors]));
    });

    useEffect(() => {
        setAllKnownSectors(prev => {
            const updated = Array.from(new Set([...prev, ...DEFAULT_SECTORS, ...activeSectors]));
            localStorage.setItem('sva_all_known_sectors', JSON.stringify(updated));
            return updated;
        });
    }, [activeSectors]);

    const archivedSectors = allKnownSectors.filter(s => !activeSectors.includes(s));

    const formatCPF = (cpf: string) => {
        const digits = cpf.replace(/\D/g, '');
        if (digits.length !== 11) return cpf;
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    };
    const [showModalPassword, setShowModalPassword] = useState(false);

    const bgInputRef = useRef<HTMLInputElement>(null);
    const loginBgInputRef = useRef<HTMLInputElement>(null);
    const profilePicRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<User>>(() => {
        const saved = localStorage.getItem('sva_user_form_draft');
        return saved ? JSON.parse(saved) : {
            role: UserRole.VISUALIZADOR,
            needsPasswordChange: true,
            password: ''
        };
    });

    useEffect(() => {
        localStorage.setItem('sva_user_form_draft', JSON.stringify(formData));
    }, [formData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            onUpdateUser({ ...editingUser, ...formData } as User);
            alert("Cadastro do colaborador atualizado com sucesso.");
        } else {
            const newUser: User = {
                ...formData,
                id: 'usr-' + Math.random().toString(36).substr(2, 9),
                needsPasswordChange: formData.needsPasswordChange ?? true
            } as User;
            onAddUser(newUser);

            setShowEmailToast({ name: newUser.name, email: newUser.email });
            setTimeout(() => setShowEmailToast(null), 5000);
        }
        setShowForm(false);
        setEditingUser(null);
        setFormData({ role: UserRole.VISUALIZADOR, needsPasswordChange: true, password: '' });
        localStorage.removeItem('sva_user_form_draft');
    };

    const handleResetPassword = async () => {
        if (!newResetPassword || !resetPasswordUser) return;

        try {
            if (resetPasswordUser.id === currentUser.id || resetPasswordUser.email === currentUser.email) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: newResetPassword
                });
                if (authError) throw authError;
            }

            onUpdateUser({
                ...resetPasswordUser,
                password: newResetPassword,
                needsPasswordChange: true
            });

            alert(`Senha de ${resetPasswordUser.name} alterada com sucesso! O acesso deverá ser feito com a nova senha.`);
            setResetPasswordUser(null);
            setNewResetPassword('');
        } catch (err: any) {
            alert(`Erro ao alterar senha: ${err.message || 'Erro desconhecido'}`);
        }
    };

    const handleDeleteClick = (u: User, e: React.MouseEvent) => {
        e.stopPropagation();

        if (u.id === currentUser.id) {
            alert("Ação Bloqueada: Você não pode excluir sua própria conta para não ser trancada fora do sistema.");
            return;
        }

        if (window.confirm(`Deseja excluir permanentemente o colaborador ${u.name}? Ele perderá o acesso ao sistema imediatamente.`)) {
            onDeleteUser(u.id);
        }
    };

    const isAdminUser = normalizeRole(currentUser.role) === UserRole.ADMINISTRADOR;
    const cleanSearch = (searchTerm || '').toLowerCase().trim();
    const filteredUsers = users.filter(u => {
        if (!isAdminUser) {
            const isSelf = u.id === currentUser.id ||
                (u.email && currentUser.email && u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
                (u.cpf && currentUser.cpf && (u.cpf || '').replace(/\D/g, '') === (currentUser.cpf || '').replace(/\D/g, ''));
            return isSelf;
        }

        if (!cleanSearch) return true;
        const nameMatch = (u.name || '').toLowerCase().includes(cleanSearch);
        const emailMatch = (u.email || '').toLowerCase().includes(cleanSearch);
        const cleanCpf = (u.cpf || '').replace(/\D/g, '');
        const cleanSearchDigits = cleanSearch.replace(/\D/g, '');
        const cpfMatch = (cleanSearchDigits && cleanCpf.includes(cleanSearchDigits)) || (u.cpf || '').toLowerCase().includes(cleanSearch);
        const sectorMatch = (u.sector || '').toLowerCase().includes(cleanSearch);
        return nameMatch || emailMatch || cpfMatch || sectorMatch;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10 text-left">
            {showEmailToast && (
                <div className="fixed top-10 right-10 bg-emerald-600 text-white p-6 rounded-[24px] shadow-2xl z-[9000] flex items-center gap-4 animate-in slide-in-from-right-10 border-2 border-emerald-400">
                    <div className="bg-white/20 p-3 rounded-xl"><MailCheck size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60">Novo Cadastro Realizado</p>
                        <p className="text-xs font-bold leading-tight">Instruções enviadas para:<br /><span className="underline font-black">{showEmailToast.email}</span></p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Shield className="text-emerald-600 dark:text-emerald-500" size={26} /> Configurações do Sistema
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        Gerencie usuários, alertas e parâmetros da unidade
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest opacity-60">Escolha uma seção:</p>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-[22px] w-fit border border-slate-200 dark:border-slate-800">
                    {isAdminUser && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-2.5 rounded-[16px] text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'users'
                                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 shadow-sm'
                                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                                }`}
                        >
                            <Shield size={14} /> Usuários
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`px-6 py-2.5 rounded-[16px] text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'alerts'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 shadow-sm'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                            }`}
                    >
                        <Bell size={14} /> Alertas
                    </button>
                    <button
                        onClick={() => setActiveTab('params')}
                        className={`px-6 py-2.5 rounded-[16px] text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'params'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 shadow-sm'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                            }`}
                    >
                        <Building2 size={14} /> Parâmetros & Fundo
                    </button>
                    {isAdminUser && (
                        <button
                            onClick={() => setActiveTab('paineis')}
                            className={`px-6 py-2.5 rounded-[16px] text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'paineis'
                                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 shadow-sm'
                                : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                                }`}
                        >
                            <LayoutGrid size={14} /> Painéis
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                            <input type="text" placeholder="Filtrar por nome ou CPF..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xs shadow-sm text-slate-900 dark:text-white transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        {isAdminUser && (
                            <button
                                onClick={() => { setEditingUser(null); setFormData({ role: UserRole.VISUALIZADOR, needsPasswordChange: true, password: '' }); setShowForm(true); }}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                            >
                                <UserPlus size={16} /> Novo Colaborador
                            </button>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] font-bold">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-8 py-4">Nome / E-mail</th>
                                        <th className="px-8 py-4">Setor</th>
                                        <th className="px-8 py-4">Perfil</th>
                                        <th className="px-8 py-4">CPF (Login)</th>
                                        <th className="px-8 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredUsers.map(u => (
                                        <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors ${u.id === currentUser.id ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : ''}`}>
                                            <td className="px-8 py-5">
                                                <p className="text-slate-800 dark:text-white uppercase font-black">{u.name}</p>
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 lowercase">{u.email}</p>
                                                {u.id === currentUser.id && <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase">Sua Conta</span>}
                                            </td>
                                            <td className="px-8 py-5 uppercase text-slate-500 dark:text-slate-400">{u.sector}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.role === UserRole.ADMINISTRADOR ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                                                    u.role === UserRole.VISUALIZADOR ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500' :
                                                        u.role === UserRole.INFECTO ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                                            u.role === UserRole.SCIH ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                                                                u.role === UserRole.FARMACEUTICO ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                                                                    'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 dark:text-slate-500 font-black">
                                                {visiblePasswordId === u.id ? u.password : (formatCPF(u.cpf) || '***')}
                                            </td>
                                            <td className="px-8 py-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2 flex-nowrap">
                                                    <button onClick={() => { setEditingUser(u); setFormData(u); setShowForm(true); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700" title="Editar"><Edit2 size={16} /></button>
                                                    <button
                                                        onClick={() => setVisiblePasswordId(visiblePasswordId === u.id ? null : u.id)}
                                                        className={`p-2.5 rounded-xl transition-all border ${visiblePasswordId === u.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                                                        title="Ver Senha"
                                                    >
                                                        {visiblePasswordId === u.id ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                    <button onClick={() => setResetPasswordUser(u)} className="p-2.5 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-xl hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-all border border-yellow-100 dark:border-yellow-900" title="Alterar Senha"><Key size={16} /></button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDelete(e, u)}
                                                        disabled={u.id === currentUser.id}
                                                        className={`p-2.5 rounded-xl transition-all border ${u.id === currentUser.id ? 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-700 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-30' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/50 active:scale-95'}`}
                                                        title={u.id === currentUser.id ? "Auto-exclusão bloqueada" : "Excluir Registro"}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center opacity-30 uppercase text-[10px] font-black tracking-widest">Nenhum registro encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-500">
                                <Bell size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Alertas do Sistema</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Defina quais rotinas de notificação ativar</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={configNotifyReset} onChange={e => setConfigNotifyReset(e.target.checked)} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Reset de Avaliações (GERAL)</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Limpa status diário (PS, ENFERMARIA, CC)</p>
                                    </div>
                                </div>
                                <input type="time" className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:border-emerald-500 text-slate-800 dark:text-white" value={configResetTime} onChange={e => setConfigResetTime(e.target.value)} />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Reset de Avaliações (UTI)</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Limpa status diário (UTIs)</p>
                                    </div>
                                </div>
                                <input type="time" className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:border-emerald-500 text-slate-800 dark:text-white" value={configResetTimeUTI} onChange={e => setConfigResetTimeUTI(e.target.value)} />
                            </label>

                            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-3">
                                <div>
                                    <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">Reset Manual de Avaliações por Setor</p>
                                    <p className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase">Selecione o grupo para forçar a limpeza do botão 'AVALIADO' imediatamente</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm('Deseja forçar o reset manual de avaliações apenas para CLÍNICAS / GERAL?')) {
                                                try {
                                                    const generalSectors = (activeSectors && activeSectors.length > 0 ? activeSectors : DEFAULT_SECTORS).filter(s => !s.toUpperCase().includes('UTI'));
                                                    await supabase.from('pacientes').update({ is_evaluated: false }).in('sector', generalSectors).eq('is_evaluated', true);
                                                    alert('Reset manual de CLÍNICAS / GERAL executado com sucesso! A página será atualizada.');
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error('Erro no reset manual de Clínicas:', e);
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw size={13} /> Reset Clínicas/Geral
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm('Deseja forçar o reset manual de avaliações apenas para a UTI?')) {
                                                try {
                                                    const utiSectors = (activeSectors && activeSectors.length > 0 ? activeSectors : DEFAULT_SECTORS).filter(s => s.toUpperCase().includes('UTI'));
                                                    await supabase.from('pacientes').update({ is_evaluated: false }).in('sector', utiSectors).eq('is_evaluated', true);
                                                    alert('Reset manual da UTI executado com sucesso! A página será atualizada.');
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error('Erro no reset manual da UTI:', e);
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw size={13} /> Reset Apenas UTI
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (window.confirm('Deseja forçar o reset manual de avaliações em TODOS os setores do hospital?')) {
                                                try {
                                                    await supabase.from('pacientes').update({ is_evaluated: false }).eq('is_evaluated', true);
                                                    alert('Reset manual de TODOS OS SETORES executado com sucesso! A página será atualizada.');
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error('Erro no reset manual total:', e);
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase shadow-md transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw size={13} /> Reset Todos Setores
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={configAtbDayLock} onChange={e => setConfigAtbDayLock(e.target.checked)} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Trava de 24h (Dia ATB)</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Pula incremento se ajustado manualmente</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${configAtbDayLock ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{configAtbDayLock ? 'Ativada' : 'Desativada'}</span>
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 cursor-pointer group hover:border-emerald-500 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-500">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Virada de Dia (GERAL)</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Horário do incremento automático</p>
                                    </div>
                                </div>
                                <input type="time" className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs font-black outline-none text-slate-800 dark:text-white" value={configAtbDayChangeTime} onChange={e => setConfigAtbDayChangeTime(e.target.value)} />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 cursor-pointer group hover:border-emerald-500 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-500">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Virada de Dia (UTI)</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Horário do incremento automático (UTIs)</p>
                                    </div>
                                </div>
                                <input type="time" className="bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-emerald-500 rounded-xl px-3 py-1.5 text-xs font-black outline-none text-slate-800 dark:text-white" value={configAtbDayChangeTimeUTI} onChange={e => setConfigAtbDayChangeTimeUTI(e.target.value)} />
                            </label>

                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={configNotifyPending} onChange={e => setConfigNotifyPending(e.target.checked)} />
                                        <div>
                                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Alertas de Pendentes</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase">Notificar avaliações não realizadas</p>
                                        </div>
                                    </div>
                                </div>

                                {configNotifyPending && (
                                    <div className="grid grid-cols-2 gap-4 pl-8">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase">Clínicas</p>
                                            <input type="time" className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:border-emerald-500 text-slate-800 dark:text-white" value={configPendingTimeClinicas} onChange={e => setConfigPendingTimeClinicas(e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-500 uppercase">UTI</p>
                                            <input type="time" className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:border-emerald-500 text-slate-800 dark:text-white" value={configPendingTimeUTI} onChange={e => setConfigPendingTimeUTI(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 cursor-pointer group hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={configNotifyExpired} onChange={e => setConfigNotifyExpired(e.target.checked)} />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">Vencimento de ATB</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Alerta imediato de antibiótico vencido</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all">Tempo Real</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white space-y-6 relative overflow-hidden group border border-slate-800">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <AlertCircle size={140} />
                        </div>
                        <div className="space-y-3 relative">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Info size={22} />
                                <h3 className="text-lg font-black uppercase tracking-tight">O que significa cada Alerta?</h3>
                            </div>
                            <p className="text-slate-300 text-xs font-medium leading-relaxed">
                                Entenda como funcionam os parâmetros de notificação do sistema:
                            </p>
                        </div>

                        <div className="space-y-3 relative text-xs">
                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                <p className="font-black text-emerald-400 uppercase text-[10px] flex items-center gap-1.5">
                                    <Clock size={13} /> Reset de Avaliação (Geral & UTI)
                                </p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    No horário definido (ex: <strong>07:00</strong> nas Clínicas e <strong>19:00</strong> na UTI), o sistema <strong>desmarca automaticamente o botão 'AVALIADO'</strong> de todos os pacientes ativos. Isso obriga a equipe médica e a CCIH a realizar uma nova checagem e reavaliação diária em cada ciclo de 24h.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                <p className="font-black text-purple-400 uppercase text-[10px] flex items-center gap-1.5">
                                    <ShieldCheck size={13} /> Trava de 24h (Dia ATB)
                                </p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    Se um profissional alterar manualmente o dia do antibiótico na caixa do paciente (ex: avançar de D1 para D3), a trava impede que o sistema incremente o dia novamente na meia-noite do mesmo dia, evitando pular dias acidentalmente.
                                </p>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                                <p className="font-black text-amber-400 uppercase text-[10px] flex items-center gap-1.5">
                                    <Bell size={13} /> Alertas de Pendentes & Vencimento
                                </p>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    Notificam em destaque os pacientes em uso de antibiótico que ainda não receberam avaliação no dia ou cujos tratamentos atingiram a duração limite programada (ex: D7 de 7D).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'params' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-500">
                                <Building2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Unidade Hospitalar</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Identificação da instituição</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Nome da Unidade</label>
                                <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all" value={hospitalName} onChange={e => setHospitalName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Relatórios por E-mail</label>
                                <div className="relative">
                                    <MailCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
                                    <input type="email" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 pl-12 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none text-slate-900 dark:text-white transition-all" value={reportEmail} onChange={e => setReportEmail(e.target.value.replace(/\s/g, ''))} placeholder="administrativo@hospital.com.br" />
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">O sistema enviará uma cópia mensal automática para este endereço.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-500">
                                <ImageIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Identidade Visual & Imagens de Fundo</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Personalize imagens, enquadramento, alinhamento e opacidade</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Painel de Fundo */}
                            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Painel Principal</label>
                                    {bgImage && (
                                        <button
                                            type="button"
                                            onClick={() => setBgImage('')}
                                            className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase"
                                        >
                                            Remover Imagem
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => bgInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-all bg-white dark:bg-slate-800">
                                    {bgImage ? (
                                        <img src={bgImage} className="absolute inset-0 w-full h-full transition-transform duration-500" style={{ objectFit: bgFit as any, objectPosition: bgPosition }} />
                                    ) : (
                                        <Monitor size={24} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                    <div className="z-10 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl shadow-md border border-white dark:border-slate-700 flex items-center gap-1.5">
                                        <Upload size={12} className="text-purple-600 dark:text-purple-400" />
                                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{bgImage ? 'Alterar Imagem' : 'Carregar Imagem'}</span>
                                    </div>
                                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const r = new FileReader();
                                            r.onload = () => setBgImage(r.result as string);
                                            r.readAsDataURL(file);
                                        }
                                    }} />
                                </button>

                                <div className="space-y-1 text-left">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Ou Cole a URL da Imagem (Link)</label>
                                    <input
                                        type="text"
                                        placeholder="https://exemplo.com/sua-imagem.jpg"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-medium outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                        value={bgImage}
                                        onChange={e => setBgImage(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Sugestões de Fotos Hospitalares</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                        {[
                                            { name: 'Estetoscópio', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Hospital Moderno', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Laboratório', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'UTI', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Centro Cirúrgico', url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=2070&q=80' },
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setBgImage(preset.url)}
                                                className={`shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 relative group hover:scale-105 transition-all ${bgImage === preset.url ? 'border-purple-500 ring-2 ring-purple-400/40' : 'border-slate-200 dark:border-slate-700'}`}
                                                title={preset.name}
                                            >
                                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-left">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Enquadramento</label>
                                        <select
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-black outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                            value={bgFit}
                                            onChange={e => setBgFit && setBgFit(e.target.value)}
                                        >
                                            <option value="cover">Preencher Tela (Cover)</option>
                                            <option value="contain">Ajustar Inteira (Contain)</option>
                                            <option value="fill">Esticar (Fill)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Posicionamento</label>
                                        <select
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-black outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                            value={bgPosition}
                                            onChange={e => setBgPosition && setBgPosition(e.target.value)}
                                        >
                                            <option value="center">Centro</option>
                                            <option value="top">Topo</option>
                                            <option value="bottom">Base</option>
                                            <option value="left">Esquerda</option>
                                            <option value="right">Direita</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Escurecimento Fundo</label>
                                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">{Math.round(Number(bgOpacity) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="0.9"
                                        step="0.05"
                                        className="w-full accent-purple-600"
                                        value={bgOpacity}
                                        onChange={e => setBgOpacity && setBgOpacity(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Tela de Login */}
                            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tela de Login</label>
                                    {loginBgImage && (
                                        <button
                                            type="button"
                                            onClick={() => setLoginBgImage('')}
                                            className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase"
                                        >
                                            Remover Imagem
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => loginBgInputRef.current?.click()} className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-all bg-white dark:bg-slate-800">
                                    {loginBgImage ? (
                                        <img src={loginBgImage} className="absolute inset-0 w-full h-full transition-transform duration-500" style={{ objectFit: loginBgFit as any, objectPosition: loginBgPosition }} />
                                    ) : (
                                        <Key size={24} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                    <div className="z-10 bg-white/90 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl shadow-md border border-white dark:border-slate-700 flex items-center gap-1.5">
                                        <Upload size={12} className="text-purple-600 dark:text-purple-400" />
                                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{loginBgImage ? 'Alterar Imagem' : 'Carregar Imagem'}</span>
                                    </div>
                                    <input type="file" ref={loginBgInputRef} className="hidden" accept="image/*" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const r = new FileReader();
                                            r.onload = () => setLoginBgImage(r.result as string);
                                            r.readAsDataURL(file);
                                        }
                                    }} />
                                </button>

                                <div className="space-y-1 text-left">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Ou Cole a URL da Imagem (Link)</label>
                                    <input
                                        type="text"
                                        placeholder="https://exemplo.com/sua-imagem.jpg"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-medium outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                        value={loginBgImage}
                                        onChange={e => setLoginBgImage(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Sugestões de Fotos Hospitalares</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                        {[
                                            { name: 'Estetoscópio', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Hospital Moderno', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Laboratório', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'UTI', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=2070&q=80' },
                                            { name: 'Centro Cirúrgico', url: 'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=2070&q=80' },
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setLoginBgImage(preset.url)}
                                                className={`shrink-0 w-12 h-9 rounded-lg overflow-hidden border-2 relative group hover:scale-105 transition-all ${loginBgImage === preset.url ? 'border-purple-500 ring-2 ring-purple-400/40' : 'border-slate-200 dark:border-slate-700'}`}
                                                title={preset.name}
                                            >
                                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-left">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Enquadramento</label>
                                        <select
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-black outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                            value={loginBgFit}
                                            onChange={e => setLoginBgFit && setLoginBgFit(e.target.value)}
                                        >
                                            <option value="cover">Preencher Tela (Cover)</option>
                                            <option value="contain">Ajustar Inteira (Contain)</option>
                                            <option value="fill">Esticar (Fill)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Posicionamento</label>
                                        <select
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-[10px] font-black outline-none focus:border-purple-500 text-slate-800 dark:text-white"
                                            value={loginBgPosition}
                                            onChange={e => setLoginBgPosition && setLoginBgPosition(e.target.value)}
                                        >
                                            <option value="center">Centro</option>
                                            <option value="top">Topo</option>
                                            <option value="bottom">Base</option>
                                            <option value="left">Esquerda</option>
                                            <option value="right">Direita</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Escurecimento Fundo</label>
                                        <span className="text-[9px] font-black text-purple-600 dark:text-purple-400">{Math.round(Number(loginBgOpacity) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="0.9"
                                        step="0.05"
                                        className="w-full accent-purple-600"
                                        value={loginBgOpacity}
                                        onChange={e => setLoginBgOpacity && setLoginBgOpacity(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-5 transition-colors lg:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                                <Key size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Custos e Cobertura</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Gestão financeira e de estoque</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 block mb-2">Cobertura de Estoque (Camas/Dias)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-black text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                                        value={patientDays}
                                        onChange={e => setPatientDays(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 leading-tight">Valor usado para o cálculo de demanda nas compras.</p>
                                    
                                    {(() => {
                                        const activeAtbCount = (patients || []).filter(p => p.sector !== 'Centro Cirúrgico' && !p.sector?.includes('Centro Cir') && p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO)).length;
                                        const computedPatientDays = (activeAtbCount || (patients || []).length || 1) * 30;
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => setPatientDays(computedPatientDays)}
                                                className="w-full mt-3 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl font-black text-[9px] uppercase transition-all border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                ⚡ Usar Tempo Real ({activeAtbCount} Pcts em ATB × 30d = {computedPatientDays})
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 block mb-2">Preços Unitários (ATBs)</label>
                                    <div className="max-h-64 overflow-y-auto pr-2 space-y-2 text-left">
                                        {Object.entries(atbCosts).map(([name, price]) => (
                                            <div key={name} className="flex items-center justify-between gap-4 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase truncate flex-1">{name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-300">R$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-24 bg-slate-50 dark:bg-slate-900 border-none p-1.5 rounded-lg text-right font-black text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500"
                                                        value={price}
                                                        onChange={e => setAtbCosts(prev => ({ ...prev, [name]: parseFloat(e.target.value) || 0 }))}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[8000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-emerald-600 p-8 text-white">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/20 rounded-2xl">
                                        <UserPlus size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                        <p className="text-[10px] font-bold uppercase opacity-80">Preencha os dados de acesso</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Nome Completo</label>
                                    <input required type="text" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} placeholder="EX: JOÃO DA SILVA" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">E-mail</label>
                                        <input required type="email" className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="contato@hospital.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">CPF (Apenas Números)</label>
                                        <input required type="text" maxLength={11} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all" value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })} placeholder="000.000.000-00" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Setor Principal</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all uppercase"
                                            value={formData.sector || ''}
                                            onChange={e => {
                                                const sec = e.target.value;
                                                const autoRole = (sec === 'FARMÁCIA' || sec === 'FARMACIA') ? UserRole.FARMACEUTICO : formData.role;
                                                setFormData({ ...formData, sector: sec, role: autoRole });
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="FARMÁCIA">FARMÁCIA</option>
                                            <option value="ENFERMARIAS">ENFERMARIAS</option>
                                            <option value="UTI">UTI</option>
                                            <option value="ASSISTENCIAIS">ASSISTENCIAIS</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Perfil de Acesso</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all uppercase"
                                            value={(formData.sector === 'FARMÁCIA' || formData.sector === 'FARMACIA') ? UserRole.FARMACEUTICO : normalizeRole(formData.role)}
                                            onChange={e => setFormData({ ...formData, role: normalizeRole(e.target.value) })}
                                        >
                                            <option value={UserRole.ADMINISTRADOR}>Administrador</option>
                                            <option value={UserRole.VISUALIZADOR}>Visualizador</option>
                                            <option value={UserRole.INFECTO}>Infecto</option>
                                            <option value={UserRole.SCIH}>SCIH</option>
                                            <option value={UserRole.FARMACEUTICO}>Farmacêutico</option>
                                        </select>
                                    </div>
                                </div>

                                {!editingUser && (
                                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 space-y-3">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                            <Key size={16} />
                                            <p className="text-[10px] font-black uppercase">Senha Chave (Provisória)</p>
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            minLength={6}
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 p-3 rounded-xl font-black text-center text-lg tracking-[0.3em] focus:border-amber-500 outline-none text-slate-900 dark:text-white transition-all"
                                            value={formData.password || ''}
                                            onChange={e => setFormData({ ...formData, password: e.target.value.toUpperCase() })}
                                            placeholder="SVA123"
                                            maxLength={12}
                                        />
                                        <p className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase text-center">Mínimo 6 caracteres. Informe esta senha ao colaborador para o primeiro acesso.</p>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-4">
                                <Save size={18} /> {editingUser ? 'Salvar Alterações' : 'Confirmar Pré-Cadastro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'paineis' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                <LayoutGrid size={18} className="text-emerald-600" /> Painéis Ativos ({activeSectors.length})
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">
                                Arquive um painel para removê-lo do menu. Ele poderá ser desarquivado a qualquer momento.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {activeSectors.map(sector => (
                                <div key={sector} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <span className="font-black text-sm text-slate-700 dark:text-white uppercase">{sector}</span>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Arquivar o painel "${sector}"? Ele sairá do menu, mas os dados dos pacientes são mantidos.`)) {
                                                setActiveSectors((prev: string[]) => prev.filter(s => s !== sector));
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 text-slate-400 dark:text-slate-500 rounded-xl font-black text-[10px] uppercase transition-all"
                                    >
                                        <Archive size={14} /> Arquivar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {archivedSectors.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-amber-100 dark:border-amber-900/30 shadow-sm space-y-6">
                            <div>
                                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                    <Archive size={18} className="text-amber-500" /> Painéis Arquivados ({archivedSectors.length})
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">
                                    Clique em "Desarquivar" para reativar o painel no menu principal.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {archivedSectors.map(sector => (
                                    <div key={sector} className="flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 px-5 py-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <span className="font-black text-sm text-slate-700 dark:text-slate-200 uppercase">{sector}</span>
                                        <button
                                            onClick={() => {
                                                setActiveSectors((prev: string[]) => [...prev, sector]);
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase shadow-md shadow-emerald-600/20 transition-all"
                                        >
                                            <ArchiveRestore size={14} /> Desarquivar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                <PlusCircle size={18} className="text-emerald-600" /> Criar Novo Painel
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">
                                Digite o nome do novo setor para criar um painel dedicado a ele.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newSectorName}
                                onChange={e => setNewSectorName(e.target.value)}
                                placeholder="Ex: Enfermaria B, Nefrologia..."
                                className="flex-1 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-emerald-500 outline-none p-4 rounded-2xl font-bold text-sm text-slate-900 dark:text-white transition-all"
                            />
                            <button
                                disabled={!newSectorName.trim() || activeSectors.includes(newSectorName.trim())}
                                onClick={() => {
                                    const name = newSectorName.trim();
                                    if (!name || activeSectors.includes(name)) return;
                                    setActiveSectors((prev: string[]) => [...prev, name]);
                                    setAllKnownSectors((prev: string[]) => Array.from(new Set([...prev, name])));
                                    setNewSectorName('');
                                }}
                                className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                <PlusCircle size={16} /> Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetPasswordUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-2xl flex items-center justify-center mx-auto">
                                <Key size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">Resetar Senha</h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Colaborador: {resetPasswordUser.name}</p>
                            </div>

                            <div className="space-y-4 mt-6">
                                <input
                                    type="text"
                                    minLength={6}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-black text-center text-lg tracking-[0.3em] focus:border-yellow-500 outline-none text-slate-900 dark:text-white transition-all uppercase"
                                    placeholder="NOVA SENHA (MÍN 6 DIG)"
                                    value={newResetPassword}
                                    onChange={e => setNewResetPassword(e.target.value.toUpperCase())}
                                    maxLength={12}
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setResetPasswordUser(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">Cancelar</button>
                                    <button onClick={handleResetPassword} disabled={!newResetPassword} className="flex-2 py-4 bg-yellow-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 disabled:opacity-50 transition-all">Confirmar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default UserManagement;
