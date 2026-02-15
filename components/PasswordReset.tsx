
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, LogOut } from 'lucide-react';

interface PasswordResetProps {
    onSuccess: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                // Tradução amigável de erros do Supabase
                if (error.message.includes('New password should be different')) {
                    throw new Error('A nova senha deve ser diferente da senha temporária que você usou para entrar.');
                }
                if (error.message.includes('Password should be at least 6 characters')) {
                    throw new Error('A senha deve ter pelo menos 6 caracteres.');
                }
                throw error;
            }

            // Update profile flag
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: profileError } = await supabase.from('profiles').update({ needs_password_change: false }).eq('id', user.id);
                if (profileError) {
                    console.error('Error updating profile:', profileError);
                    throw new Error('A senha foi alterada, mas houve um erro ao atualizar seu perfil. Por favor, tente novamente ou contate o suporte.');
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar senha.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload(); // Force full app reset
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <Lock className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Definir Nova Senha</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Crie uma senha forte para sua conta</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3 text-red-600">
                        <AlertCircle size={20} />
                        <p className="text-xs font-bold">{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="mb-6 p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] text-center space-y-3 animate-in slide-in-from-top-4">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <h3 className="text-emerald-800 font-black uppercase text-sm">Senha Alterada!</h3>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Você será redirecionado para o sistema em instantes...</p>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Nova Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 pl-12 pr-12 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Confirmar Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Repita a senha"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 flex items-center justify-center gap-2 text-sm tracking-wide"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Atualizar Minha Senha'}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-[10px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors flex items-center justify-center gap-2 mt-2"
                        >
                            <LogOut size={14} /> Não é você? Entrar com outra conta
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PasswordReset;
