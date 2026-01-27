import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PasswordReset from './components/PasswordReset';
import { UserRole, Patient, User, AntibioticStatus } from './types';
import { INITIAL_PATIENTS } from './data/mockData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [recoverySession, setRecoverySession] = useState(false);

  const [hospitalName, setHospitalName] = useState(() => {
    return localStorage.getItem('sva_hospital_name') || 'Hospital Estadual de São Luis de Montes Belos - HSLMB';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [bgImage, setBgImage] = useState(() => localStorage.getItem('sva_bg_image') || '');
  const [loginBgImage, setLoginBgImage] = useState(() => localStorage.getItem('sva_login_bg_image') || '');
  const [reportEmail, setReportEmail] = useState(() => localStorage.getItem('sva_report_email') || '');
  const [patientDays, setPatientDays] = useState(() => parseInt(localStorage.getItem('sva_patient_days') || '1200'));
  const [atbCosts, setAtbCosts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('sva_atb_costs');
    return saved ? JSON.parse(saved) : {
      'MEROPENEM PO P/ SOL INJ 1G': 85.00,
      'VANCOMICINA PO P/ SOL INJ 500MG': 45.00,
      'PIPERACILINA + TAZOBACTAM PO P/ SOL INJ 4 + 0,5G': 120.00,
      'CEFTRIAXONA PO P/ SOL INJ 1G': 15.00,
      'CIPROFLOXACINO COMP 500MG': 12.00,
      'CEFEPIME PO P/ SOL INJ 1G': 55.00,
      'LINEZOLIDA SOL INJ 2MG/ML 300ML': 250.00,
      'POLIMIXINA B PO P/ SOL INJ 500.000UI': 180.00,
      'FLUCONAZOL SOL INJ 2MG/ML 100ML': 25.00,
    };
  });

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('sva_dark_mode') === 'true');

  // Sincronização da classe 'dark' no documento para ativação das classes utilitárias do Tailwind
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('sva_dark_mode', String(newVal));
      return newVal;
    });
  }, []);

  const [systemAlert, setSystemAlert] = useState<{ message: string, type: 'info' | 'warning' | 'success' } | null>(null);

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('hesmb_users');
    let userList: User[] = saved ? JSON.parse(saved) : [];
    // Only keeping local users backup/cache logic if needed, but ideally users should also be in DB. 
    // For now, focusing on Patients migration as requested.
    const geovanaCPF = '060.044.891-66';
    const geovanaExists = userList.some(u => u.cpf.replace(/\D/g, '') === geovanaCPF.replace(/\D/g, ''));

    if (!geovanaExists) {
      userList.push({
        id: 'geovana-master',
        name: 'GEOVANA CORREA PERES',
        email: 'geovana.peres@heslmb.org.br',
        password: 'Geovana20',
        role: UserRole.ADMINISTRADOR,
        sector: 'DIRETORIA',
        cpf: geovanaCPF,
        mobile: '(64) 99999-9999',
        birthDate: '01/01/1980',
        needsPasswordChange: false
      });
    }
    return userList;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // --- DATA TRANSFORMATION HELPERS ---
  const mapDbToPatient = (row: any): Patient => ({
    id: row.id,
    name: row.name,
    birthDate: row.birth_date ? format(new Date(row.birth_date), 'dd/MM/yyyy') : '',
    bed: row.bed,
    sector: row.sector,
    diagnosis: row.diagnosis || '',
    treatmentType: row.treatment_type,
    infectoStatus: row.infecto_status,
    infectoComment: row.infecto_comment,
    pharmacyNote: row.pharmacy_note,
    prescriberNotes: row.prescriber_notes,
    incisionRelation: row.incision_relation,
    procedureDate: row.procedure_date ? format(new Date(row.procedure_date), 'dd/MM/yyyy') : undefined,
    operativeTime: row.operative_time,
    antibiotics: row.antibiotics || [],
    isEvaluated: row.is_evaluated,
    lastEvaluationDate: row.last_evaluation_date,
    history: row.history || []
  });

  const mapPatientToDb = (p: Patient) => {
    // Helper to parse DD/MM/YYYY to YYYY-MM-DD
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    };

    return {
      name: p.name,
      birth_date: parseDate(p.birthDate),
      bed: p.bed,
      sector: p.sector,
      diagnosis: p.diagnosis,
      treatment_type: p.treatmentType,
      infecto_status: p.infectoStatus,
      infecto_comment: p.infectoComment,
      pharmacy_note: p.pharmacyNote,
      prescriber_notes: p.prescriberNotes,
      incision_relation: p.incisionRelation,
      procedure_date: parseDate(p.procedureDate),
      operative_time: p.operativeTime,
      antibiotics: p.antibiotics,
      is_evaluated: p.isEvaluated,
      last_evaluation_date: p.lastEvaluationDate,
      history: p.history
    };
  };

  // --- SUPABASE FETCH & SUBSCRIPTION ---
  const fetchPatients = useCallback(async () => {
    const { data, error } = await supabase.from('pacientes').select('*');
    if (error) {
      console.error('Error fetching patients:', error);
      setSystemAlert({ message: 'Erro ao carregar pacientes do servidor.', type: 'warning' });
    } else {
      setPatients(data.map(mapDbToPatient));
      setLastSaved(new Date());
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchPatients();

      const channel = supabase
        .channel('public:pacientes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, (payload) => {
          console.log('Realtime chage received:', payload);
          fetchPatients(); // Simplest strategy: reload all on change to ensure consistency
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchPatients]);


  // --- ROTINA DE TAREFAS AGENDADAS (07:30 E 22:00) ---
  // --- REPORT GENERATION ---
  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    const today = new Date();
    const monthStr = format(today, 'MMMM yyyy', { locale: ptBR });

    // Header
    doc.setFontSize(18);
    doc.text(`Relatório Mensal SVA - ${monthStr}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Hospital: ${hospitalName}`, 14, 28);
    doc.text(`Gerado em: ${format(today, 'dd/MM/yyyy HH:mm')}`, 14, 34);

    // Stats
    const activePatients = patients.filter(p => p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO)).length;
    doc.text(`Pacientes em Uso de ATB: ${activePatients}`, 14, 45);
    doc.text(`Custo Total Estimado: R$ ${(Object.values(atbCosts) as any[]).reduce((a: number, b: number) => a + (Number(b) || 0), 0).toFixed(2)}`, 14, 51);

    // Patients Table
    const tableData = patients.map(p => {
      const activeAtbs = p.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO).map(a => a.name).join(', ');
      return [p.name, p.sector, p.bed, activeAtbs || 'Nenhum', p.infectoStatus];
    });

    autoTable(doc, {
      startY: 60,
      head: [['Paciente', 'Setor', 'Leito', 'ATBs em Uso', 'Status Infecto']],
      body: tableData,
    });

    // Save PDF
    const fileName = `Relatorio_Mensal_${format(today, 'yyyy_MM')}.pdf`;
    doc.save(fileName);

    // Simulate Email Send (Client-side limitation)
    if (reportEmail) {
      const subject = `Relatório Mensal SVA - ${monthStr}`;
      const body = `Segue em anexo o relatório mensal gerado automaticamente.\n\nHospital: ${hospitalName}`;
      const mailtoLink = `mailto:${reportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
    }
  };

  useEffect(() => {
    const checkScheduledTasks = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      // Reset 07:30 AM
      const isPastResetTime = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() >= 30);
      const lastResetDate = localStorage.getItem('sva_last_reset_evaluations');
      if (lastResetDate !== todayStr && isPastResetTime) {
        // Reset Logic: Update Supabase and Local State
        supabase.from('pacientes').update({ is_evaluated: false }).neq('id', '00000000-0000-0000-0000-000000000000')
          .then(({ error }) => {
            if (!error) {
              fetchPatients(); // Reload fresh data
              localStorage.setItem('sva_last_reset_evaluations', todayStr);
              setSystemAlert({ message: 'Atenção: As avaliações diárias foram resetadas (Rotina 07:30)', type: 'info' });
              setTimeout(() => setSystemAlert(null), 10000);
            } else {
              console.error('Erro ao resetar avaliações:', error);
            }
          });
      }

      // Alerta 22:00 PM
      const isPastAlertTime = now.getHours() >= 22;
      const lastAlertDate = localStorage.getItem('sva_last_night_alert');
      if (lastAlertDate !== todayStr && isPastAlertTime) {
        const hasUnevaluated = patients.some(p => !p.isEvaluated);
        if (hasUnevaluated) {
          setSystemAlert({ message: 'Aviso: Existem pacientes pendentes de avaliação hoje (Alerta 22:00)', type: 'warning' });
          localStorage.setItem('sva_last_night_alert', todayStr);
          setTimeout(() => setSystemAlert(null), 15000);
        }
      }

      // Relatório Mensal
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isLastDay = now.getDate() === lastDayOfMonth;
      const isReportTime = now.getHours() >= 23;
      const lastReportDate = localStorage.getItem('sva_last_monthly_report');

      if (isLastDay && isReportTime && lastReportDate !== todayStr) {
        console.log(`[SVA] Gerando relatório PDF mensal...`);
        generateMonthlyReport();
        localStorage.setItem('sva_last_monthly_report', todayStr);
        setSystemAlert({ message: `Relatório mensal gerado e pronto para envio para ${reportEmail}`, type: 'success' });
        setTimeout(() => setSystemAlert(null), 10000);
      }
    };

    checkScheduledTasks();
    const interval = setInterval(checkScheduledTasks, 60000);
    return () => clearInterval(interval);
  }, [patients, reportEmail, atbCosts, hospitalName]);

  useEffect(() => {
    // Only save settings to local storage, NOT patients
    localStorage.setItem('hesmb_users', JSON.stringify(users));
    localStorage.setItem('sva_hospital_name', hospitalName);
    localStorage.setItem('sva_bg_image', bgImage);
    localStorage.setItem('sva_login_bg_image', loginBgImage);
    localStorage.setItem('sva_report_email', reportEmail);
    localStorage.setItem('sva_patient_days', patientDays.toString());
    localStorage.setItem('sva_atb_costs', JSON.stringify(atbCosts));
  }, [users, hospitalName, bgImage, loginBgImage, reportEmail, patientDays, atbCosts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAddPatient = async (p: Patient) => {
    // Optimistic update
    setPatients(prev => [p, ...prev]);

    const dbPayload = mapPatientToDb(p);
    const { error } = await supabase.from('pacientes').insert([dbPayload]);

    if (error) {
      console.error('Error adding patient:', error);
      alert(`Erro ao salvar paciente no servidor: ${error.message} - ${error.details || ''}`);
      fetchPatients(); // Revert on error
    }
  };

  const handleUpdatePatient = async (p: Patient) => {
    // Optimistic
    setPatients(prev => prev.map(old => old.id === p.id ? p : old));

    const dbPayload = mapPatientToDb(p);
    // Don't remove ID, used for matching

    const { error } = await supabase.from('pacientes').update(dbPayload).eq('id', p.id);

    if (error) {
      console.error('Error updating patient:', error);
      alert(`Erro ao atualizar paciente: ${error.message} - ${error.details || ''}`);
      fetchPatients();
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm("Confirmar exclusão deste paciente do banco de dados?")) return;

    // Optimistic
    setPatients(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase.from('pacientes').delete().eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      alert(`Erro ao excluir paciente: ${error.message} - ${error.details || ''}`);
      fetchPatients();
    }
  };

  const handleAddUser = useCallback((u: User) => {
    setUsers(prev => [...prev, u]);
  }, []);

  const handleUpdateUser = useCallback((u: User) => {
    setUsers(prev => prev.map(old => old.id === u.id ? u : old));
  }, []);

  const handleDeleteUser = useCallback((id: string) => {
    setUsers(prev => {
      const isGeovana = prev.find(u => u.id === id)?.cpf === '060.044.891-66';
      if (isGeovana) {
        alert("A conta master de GEOVANA CORREA PERES não pode ser excluída.");
        return prev;
      }
      return prev.filter(u => u.id !== id);
    });
  }, []);

  if (recoverySession) {
    return <PasswordReset onSuccess={() => setRecoverySession(false)} />;
  }

  if (!session) {
    return <Login onLoginSuccess={fetchPatients} bgImage={loginBgImage} />;
  }

  // Mock user for now if session exists but user object is not fully hydrated from DB
  const currentUser = user || users.find(u => u.email === session?.user?.email) || {
    id: session?.user?.id,
    name: session?.user?.email?.split('@')[0].toUpperCase(),
    email: session?.user?.email,
    role: UserRole.ADMINISTRADOR, // Default role for now
    sector: 'GERAL',
    cpf: '',
    mobile: '',
    birthDate: '',
    needsPasswordChange: false,
    password: ''
  };

  return (
    <Dashboard
      user={currentUser}
      patients={patients}
      hospitalName={hospitalName}
      setHospitalName={setHospitalName}
      bgImage={bgImage}
      setBgImage={setBgImage}
      loginBgImage={loginBgImage}
      setLoginBgImage={setLoginBgImage}
      onLogout={handleLogout}
      onUpdatePatient={handleUpdatePatient}
      onDeletePatient={handleDeletePatient}
      onAddPatient={handleAddPatient}
      lastSaved={lastSaved}
      users={users}
      onAddUser={handleAddUser}
      onUpdateUser={handleUpdateUser}
      onDeleteUser={handleDeleteUser}
      reportEmail={reportEmail}
      setReportEmail={setReportEmail}
      atbCosts={atbCosts}
      setAtbCosts={setAtbCosts}
      patientDays={patientDays}
      setPatientDays={setPatientDays}
      systemAlert={systemAlert}
      setSystemAlert={setSystemAlert}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    />
  );
};

export default App;
