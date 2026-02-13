
import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Shield, Key, Trash2, Edit2, Search, X, CheckCircle2, Building2, Save, Image as ImageIcon, Upload, Monitor, Lock, Unlock, MailCheck, AlertCircle, Eye, EyeOff, Bell, Clock, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, UserRole } from '../types';

interface UserManagementProps {
    users: User[];
    currentUser: User;
    onAddUser: (user: User) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (id: string) => void;
    hospitalName: string;
    setHospitalName: (name: string) => void;
    bgImage: string;
    setBgImage: (img: string) => void;
    loginBgImage: string;
    setLoginBgImage: (img: string) => void;
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
}

const UserManagement: React.FC<UserManagementProps> = ({
    users, currentUser, onAddUser, onUpdateUser, onDeleteUser, hospitalName, setHospitalName, bgImage,
    setBgImage, loginBgImage, setLoginBgImage, reportEmail, setReportEmail, atbCosts, setAtbCosts,
    patientDays, setPatientDays, configNotifyReset, setConfigNotifyReset, configNotifyPending,
    setConfigNotifyPending, configNotifyExpired, setConfigNotifyExpired, configResetTime,
    setConfigResetTime, configResetTimeUTI, setConfigResetTimeUTI, configPendingTimeClinicas, setConfigPendingTimeClinicas,
    configPendingTimeUTI, setConfigPendingTimeUTI,
    configAtbDayLock, setConfigAtbDayLock, configAtbDayChangeTime, setConfigAtbDayChangeTime,
    configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTI
}) => {
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [newResetPassword, setNewResetPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempHospitalName, setTempHospitalName] = useState(hospitalName);
    const [showEmailToast, setShowEmailToast] = useState<{ name: string, email: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'alerts' | 'params'>('users');
    const [visiblePasswordId, setVisiblePasswordId] = useState<string | null>(null);
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

    // Salva rascunho do formulário
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
        localStorage.removeItem('sva_user_form_draft'); // Limpa rascunho
    };

    const handleResetPassword = async () => {
        if (!newResetPassword || !resetPasswordUser) return;

        try {
            // Update Auth if it's the current user
            if (resetPasswordUser.id === currentUser.id || resetPasswordUser.email === currentUser.email) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: newResetPassword
                });
                if (authError) throw authError;
            }

            // Always update profiles/local state
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

    const handleDelete = (e: React.MouseEvent, u: User) => {
        e.preventDefault();
        e.stopPropagation();

        if (u.id === currentUser.id) {
            alert("Ação Bloqueada: Você não pode excluir sua própria conta para não ser trancada fora do sistema.");
            return;
        }

        if (window.confirm(`Deseja excluir permanentemente o colaborador ${u.name}? Ele perderá o acesso ao sistema imediatamente.`)) {
            onDeleteUser(u.id);
        }
    };

    const filteredUsers = (currentUser.role === UserRole.ADMINISTRADOR ? users : users.filter(u => u.id === currentUser.id)).filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cpf.includes(searchTerm)
    );

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
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2.5 rounded-[16px] text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'users'
                            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-500 shadow-sm'
                            : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                            }`}
                    >
                        <Shield size={14} /> Usuários
                    </button>
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
                        <Building2 size={14} /> Parâmetros
                    </button>
                </div>
            </div>

            {activeTab === 'users' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                            <input type="text" placeholder="Filtrar por nome ou CPF..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xs shadow-sm text-slate-900 dark:text-white transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        {String(currentUser.role).toUpperCase() === 'ADMINISTRADOR' && (
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
                                                    u.role === UserRole.VISUALIZADOR ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 dark:text-slate-500 font-black">
                                                {visiblePasswordId === u.id ? u.password : (u.cpf || '***')}
                                            </td>
                                            <td className="px-8 py-5 text-right space-x-2">
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

                    <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <AlertCircle size={120} />
                        </div>
                        <div className="space-y-2 relative">
                            <h3 className="text-xl font-black uppercase leading-tight">Sobre os Alertas</h3>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed">
                                As rotinas de notificação ajudam a manter a equipe <span className="text-emerald-400">alinhada em tempo real</span>.
                                O reset de avaliações acontece diariamente no horário definido, permitindo que novas avaliações sejam registradas para o ciclo de 24h.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 relative">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black">{i}</div>
                                ))}
                            </div>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Métricas de Engajamento</p>
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
                                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Identidade Visual</h3>
                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Personalize as telas do sistema</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Painel de Fundo</label>
                                <button onClick={() => bgInputRef.current?.click()} className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-all bg-slate-50 dark:bg-slate-900/50">
                                    {bgImage ? <img src={bgImage} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-500" /> : <Monitor size={24} className="text-slate-300 dark:text-slate-600" />}
                                    <div className="z-10 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-lg shadow-sm border border-white dark:border-slate-700">
                                        <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300">Alterar</span>
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
                            </div>
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1 tracking-widest">Tela de Login</label>
                                <button onClick={() => loginBgInputRef.current?.click()} className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-purple-500 transition-all bg-slate-50 dark:bg-slate-900/50">
                                    {loginBgImage ? <img src={loginBgImage} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-500" /> : <Key size={24} className="text-slate-300 dark:text-slate-600" />}
                                    <div className="z-10 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-lg shadow-sm border border-white dark:border-slate-700">
                                        <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300">Alterar</span>
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
                                        <select className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all uppercase" value={formData.sector || ''} onChange={e => setFormData({ ...formData, sector: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            <option value="CLÍNICA MÉDICA">CLÍNICA MÉDICA</option>
                                            <option value="CLÍNICA CIRÚRGICA">CLÍNICA CIRÚRGICA</option>
                                            <option value="UTI ADULTO">UTI ADULTO</option>
                                            <option value="UTI COVID">UTI COVID</option>
                                            <option value="PRONTO SOCORRO">PRONTO SOCORRO</option>
                                            <option value="CENTRO CIRÚRGICO">CENTRO CIRÚRGICO</option>
                                            <option value="INFECTOLOGIA">INFECTOLOGIA</option>
                                            <option value="DIRETORIA">DIRETORIA</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Perfil de Acesso</label>
                                        <select className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white transition-all uppercase" value={formData.role || UserRole.VISUALIZADOR} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                                            <option value={UserRole.VISUALIZADOR}>Visualizador</option>
                                            <option value={UserRole.COLABORADOR}>Colaborador</option>
                                            <option value={UserRole.ADMINISTRADOR}>Administrador</option>
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
                                            className="w-full bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-800 p-3 rounded-xl font-black text-center text-lg tracking-[0.5em] focus:border-amber-500 outline-none text-slate-900 dark:text-white transition-all"
                                            value={formData.password || ''}
                                            onChange={e => setFormData({ ...formData, password: e.target.value.toUpperCase() })}
                                            placeholder="8754"
                                            maxLength={6}
                                        />
                                        <p className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase text-center">Informe esta senha ao colaborador para o primeiro acesso.</p>
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
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-black text-center text-lg tracking-[0.5em] focus:border-yellow-500 outline-none text-slate-900 dark:text-white transition-all uppercase"
                                    placeholder="NOVA SENHA"
                                    value={newResetPassword}
                                    onChange={e => setNewResetPassword(e.target.value.toUpperCase())}
                                    maxLength={8}
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
