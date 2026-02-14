import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  bgImage?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, bgImage }) => {
  const [emailOrCpf, setEmailOrCpf] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const value = formatCpf(rawValue);
    setEmailOrCpf(value);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!emailOrCpf.includes('@')) {
        throw new Error('Por favor, informe seu e-mail para recuperação.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailOrCpf, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;
      setError('sucesso: E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Login Flow
      let emailToLogin = emailOrCpf.trim().toLowerCase();
      const cleanInput = emailOrCpf.replace(/\D/g, '');
      const isCpfMatch = cleanInput.length === 11 && /^\d+$/.test(cleanInput);

      if (isCpfMatch) {
        // Normalize the CPF for lookup - Ensure we use trimmed digits-only primarily
        const digitsOnly = cleanInput;
        const formattedCpf = formatCpf(digitsOnly);

        console.log('Login CPF Lookup debug:', { formattedCpf, digitsOnly });

        // Lookup email by CPF (trying both formatted and unformatted for legacy data)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .or(`cpf.eq.${digitsOnly},cpf.eq.${formattedCpf}`)
          .maybeSingle();

        if (profileError) {
          console.error('Database error during CPF lookup:', profileError);
          throw new Error('Erro ao buscar CPF no banco de dados.');
        }

        if (!profile) {
          console.warn('CPF not found in profiles:', digitsOnly);
          throw new Error('CPF não encontrado. Verifique os números ou solicite acesso.');
        }

        emailToLogin = profile.email;
      }

      console.log('Tentando login para:', emailToLogin);

      const { error } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password,
      });

      if (error) {
        console.error('Erro de autenticação Supabase:', error);
        throw error;
      }

      onLoginSuccess();
    } catch (err: any) {
      console.error('Erro capturado no handleLogin:', err);

      // JIT Sign Up Logic for Pre-registered Users
      if (err.message === 'Invalid login credentials' || err.message.includes('Invalid login')) {
        try {
          const cleanInput = emailOrCpf.replace(/\D/g, '');
          const isCpfMatch = cleanInput.length === 11 && /^\d+$/.test(cleanInput);
          let emailForPreReg = emailOrCpf.trim().toLowerCase();

          // If input was CPF, we need to find the Email associated in pre_registrations
          if (isCpfMatch) {
            const formattedCpf = formatCpf(cleanInput);
            const { data: preRegByCpf } = await supabase
              .from('pre_registrations')
              .select('*')
              .or(`cpf.eq.${formattedCpf},cpf.eq.${cleanInput}`)
              .maybeSingle();

            if (preRegByCpf) emailForPreReg = preRegByCpf.email;
          }

          // Check pre_registrations
          const { data: preReg } = await supabase
            .from('pre_registrations')
            .select('*')
            .eq('email', emailForPreReg)
            .maybeSingle();

          if (preReg && (preReg.temp_password === password || preReg.temp_password === password.toUpperCase())) {
            // Found pre-registration and password matches!
            // Execute JIT Sign Up
            console.log('Pre-registration found. Signing up...');

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
              email: emailForPreReg,
              password: password,
              options: {
                data: {
                  name: preReg.name,
                  cpf: preReg.cpf
                }
              }
            });

            if (signUpError) throw signUpError;

            if (authData.user) {
              // Create Profile
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                  id: authData.user.id,
                  email: emailForPreReg,
                  cpf: preReg.cpf,
                  name: preReg.name.toUpperCase(),
                  role: preReg.role,
                  sector: preReg.sector,
                  needs_password_change: true
                }]);

              if (profileError) console.error('Error creating profile for pre-reg:', profileError);

              // Delete Pre-registration
              await supabase.from('pre_registrations').delete().eq('cpf', preReg.cpf);

              if (authData.session) {
                // Session established (Email Confirmation likely disabled or not required)
                onLoginSuccess();
                return; // Successfully logged in via JIT
              } else {
                // Session null -> Email confirmation required
                setError('Cadastro inicial realizado com sucesso! Verifique seu e-mail para ativar a conta antes de entrar.');
                return;
              }
            }
          }
        } catch (jitError) {
          console.error('Error during JIT check:', jitError);
        }
      }

      setError(err.message || 'Erro de autenticação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${bgImage || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'})` }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative bg-white/95 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-white/20 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            {mode === 'FORGOT' ? <KeyRound className="text-white" size={32} /> : <Lock className="text-white" size={32} />}
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">
              {mode === 'LOGIN' ? 'SVA' : 'Recuperar Senha'}
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              {mode === 'LOGIN' ? 'Sistema de Vigilância de Antimicrobianos' : 'Informe seu e-mail cadastrado'}
            </p>
          </div>
        </div>

        {error && (
          <div className={`mb-6 p-4 border-l-4 rounded-xl flex items-start gap-3 ${error.includes('sucesso') ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600'}`}>
            <AlertCircle className={error.includes('sucesso') ? 'text-emerald-500' : 'text-red-500'} size={20} />
            <p className="text-xs font-bold">{error.replace('sucesso: ', '')}</p>
          </div>
        )}

        {mode === 'FORGOT' ? (
          <form onSubmit={handleForgotPassword} className="space-y-5 animate-in slide-in-from-right-10">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  required
                  value={emailOrCpf}
                  onChange={(e) => setEmailOrCpf(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar E-mail de Recuperação'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setError(null); }}
              className="w-full text-xs font-black text-slate-400 uppercase hover:text-slate-600 py-2 flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> Voltar para Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-left-10">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-2">Login (Email ou CPF)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  required
                  value={emailOrCpf}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d/.test(val)) {
                      handleCpfChange(e);
                    } else {
                      setEmailOrCpf(val.toLowerCase().replace(/\s/g, ''));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  placeholder="seu@email.com ou CPF"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Senha</label>
                {mode === 'LOGIN' && (
                  <button type="button" onClick={() => { setMode('FORGOT'); setError(null); }} className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase">
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 pl-12 pr-12 py-4 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar no Sistema'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Sistema de Gestão Hospitalar v2.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
