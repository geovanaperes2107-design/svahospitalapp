
import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Shield, Key, Trash2, Edit2, Search, X, CheckCircle2, Building2, Save, Image as ImageIcon, Upload, Monitor, Lock, Unlock, MailCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
}

const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, hospitalName, setHospitalName, bgImage, setBgImage, loginBgImage, setLoginBgImage, reportEmail, setReportEmail, atbCosts, setAtbCosts }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
    const [newResetPassword, setNewResetPassword] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [tempHospitalName, setTempHospitalName] = useState(hospitalName);
    const [showEmailToast, setShowEmailToast] = useState<{ name: string, email: string } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
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
                        <Shield className="text-emerald-600 dark:text-emerald-500" size={26} /> {currentUser.role === UserRole.ADMINISTRADOR ? 'Controle de Colaboradores' : 'Meu Perfil'}
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                        {currentUser.role === UserRole.ADMINISTRADOR ? 'Apenas você gerencia quem acessa este sistema' : 'Gerencie seus dados de acesso'}
                    </p>
                </div>
                {currentUser.role === UserRole.ADMINISTRADOR && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${showSettings
                                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Building2 size={16} /> Configurações
                        </button>
                        <button
                            onClick={() => { setEditingUser(null); setFormData({ role: UserRole.VISUALIZADOR, needsPasswordChange: true, password: '' }); setShowForm(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                        >
                            <UserPlus size={16} /> Cadastrar Colaborador
                        </button>
                    </div>
                )}
            </div>

            {currentUser.role === UserRole.ADMINISTRADOR && showSettings && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 transition-colors">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 tracking-widest">
                            <Building2 size={14} className="text-emerald-500" /> Unidade Hospitalar
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                                value={hospitalName}
                                onChange={e => setHospitalName(e.target.value)}
                                placeholder="Nome da Unidade"
                            />
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-tight uppercase">Nome da unidade é gravado instantaneamente.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 transition-colors">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 tracking-widest">
                            <MailCheck size={14} className="text-blue-500" /> Relatórios (E-mail)
                        </h3>
                        <div className="space-y-3">
                            <input
                                type="email"
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-sm focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                                value={reportEmail}
                                onChange={e => setReportEmail(e.target.value)}
                                placeholder="exemplo@email.com"
                            />
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-tight uppercase">Configurado para envio mensal automático.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3 transition-colors">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 tracking-widest">
                            <ImageIcon size={14} className="text-purple-500" /> Personalização
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Painel</label>
                                <button onClick={() => bgInputRef.current?.click()} className="w-full h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500 transition-colors">
                                    {bgImage ? <img src={bgImage} className="absolute inset-0 w-full h-full object-cover opacity-20" /> : <Monitor size={18} className="text-slate-300 dark:text-slate-600" />}
                                    <span className="text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 z-10">Fundo</span>
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
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase ml-1">Login</label>
                                <button onClick={() => loginBgInputRef.current?.click()} className="w-full h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500 transition-colors">
                                    {loginBgImage ? <img src={loginBgImage} className="absolute inset-0 w-full h-full object-cover opacity-20" /> : <Key size={18} className="text-slate-300 dark:text-slate-600" />}
                                    <span className="text-[7px] font-black uppercase text-slate-400 dark:text-slate-500 z-10">Fundo</span>
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
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 transition-colors">
                        <div className="bg-slate-900 dark:bg-slate-950 p-8 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? 'Editar Registro' : 'Novo Registro'}</h3>
                            <button onClick={() => { setShowForm(false); localStorage.removeItem('sva_user_form_draft'); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Foto de Perfil (Opcional)</label>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => profilePicRef.current?.click()} className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-emerald-500 transition-colors relative group bg-slate-50 dark:bg-slate-900">
                                            {formData.photoURL ? (
                                                <img src={formData.photoURL} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500" />
                                            )}
                                            <input type="file" ref={profilePicRef} className="hidden" accept="image/*" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const r = new FileReader();
                                                    r.onload = () => setFormData(prev => ({ ...prev, photoURL: r.result as string }));
                                                    r.readAsDataURL(file);
                                                }
                                            }} />
                                        </button>
                                        {formData.photoURL && (
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, photoURL: undefined }))} className="text-[9px] font-black text-red-500 dark:text-red-400 uppercase hover:underline">Remover</button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Nome Completo</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Setor</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.sector || ''} onChange={e => setFormData({ ...formData, sector: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">CPF (Login de Acesso)</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.cpf || ''} onChange={e => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">E-mail</label>
                                    <input required type="email" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Perfil de Acesso</label>
                                    <select required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                                        {Object.values(UserRole).map(r => <option key={r} value={r} className="bg-white dark:bg-slate-800">{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Telefone</label>
                                    <input required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                        value={formData.mobile || ''} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                                </div>
                                {!editingUser && (
                                    <div className="md:col-span-2 space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Definir Senha Inicial</label>
                                        <input required type="password" placeholder="Mínimo 4 caracteres" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                            value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-emerald-700 transition-all">
                                {editingUser ? 'Salvar Alterações' : 'Concluir Registro do Colaborador'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {resetPasswordUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[32px] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 transition-colors">
                        <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-2xl flex items-center justify-center"><Key size={24} /></div>
                        <div>
                            <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">Alterar Senha</h3>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">Colaborador: {resetPasswordUser.name}</p>
                        </div>
                        <div className="relative">
                            <input
                                autoFocus
                                type={showModalPassword ? "text" : "password"}
                                placeholder="Nova Senha"
                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-xl font-bold text-xs pr-12 text-slate-900 dark:text-white outline-none focus:border-yellow-500"
                                value={newResetPassword}
                                onChange={e => setNewResetPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowModalPassword(!showModalPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {showModalPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setResetPasswordUser(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Voltar</button>
                            <button onClick={handleResetPassword} className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase shadow-lg hover:opacity-90 transition-all">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/10">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                        <input type="text" placeholder="Filtrar por nome ou CPF..." className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:border-emerald-500 outline-none font-bold text-xs shadow-sm text-slate-900 dark:text-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <AlertCircle size={14} />
                        <span className="text-[8px] font-black uppercase">Dica: Você não pode excluir a si mesma</span>
                    </div>
                </div>
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
    );
};

export default UserManagement;
