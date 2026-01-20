import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  bgImage?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, bgImage }) => {
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState(''); // Only for sign up
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>, isLoginField: boolean) => {
    const value = formatCpf(e.target.value);
    if (isLoginField) setEmailOrCpf(value);
    else setCpf(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign Up Flow
        if (cpf.length < 14) throw new Error('CPF incompleto.');

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailOrCpf,
          password
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: authData.user.id, email: emailOrCpf, cpf: cpf }]);

          if (profileError) console.error('Error creating profile:', profileError);
        }

        setError('Conta criada com sucesso! Você já pode entrar.');
        setIsSignUp(false);
      } else {
        // Login Flow
        let emailToLogin = emailOrCpf;
        const isCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(emailOrCpf);

        if (isCpf) {
          // Lookup email by CPF
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('cpf', emailOrCpf)
            .single();

          if (profileError || !profiles) throw new Error('CPF não encontrado ou erro ao buscar usuário.');
          emailToLogin = profiles.email;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToLogin,
          password,
        });

        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de autenticação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${bgImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'})` }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Lock className="text-white" size={32} />
          </div>
          <div className="mb-8">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">SVA</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sistema de Vigilância de Antimicrobianos</p>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 border-l-4 rounded-xl flex items-start gap-3 ${error.includes('sucesso') ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600'}`}>
            <AlertCircle className={error.includes('sucesso') ? 'text-emerald-500' : 'text-red-500'} size={20} />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">{isSignUp ? 'Email' : 'Email ou CPF'}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                required
                value={emailOrCpf}
                onChange={(e) => {
                  const val = e.target.value;
                  // If it looks like they are typing a CPF (digits only or format), apply formatting logic if desired, or just let them type.
                  // For simplicity, let's just handle raw input unless it matches CPF format length?
                  // Better: checking if it starts with number -> assume CPF
                  if (/^\d/.test(val)) handleCpfChange(e, true);
                  else setEmailOrCpf(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                placeholder={isSignUp ? "seu@email.com" : "seu@email.com ou CPF"}
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">CPF</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">CPF</div>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => handleCpfChange(e, false)}
                  className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-sm tracking-wide"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Cadastrar' : 'Entrar no Sistema')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setEmailOrCpf(''); setCpf(''); setPassword(''); }}
            className="text-xs font-black text-blue-600 uppercase hover:underline tracking-wider"
          >
            {isSignUp ? 'Já tem conta? Entrar' : 'Primeiro acesso? Criar Conta'}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Sistema de Gestão Hospitalar v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
