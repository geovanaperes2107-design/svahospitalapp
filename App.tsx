import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PasswordReset from './components/PasswordReset';
import { UserRole, Patient, User, AntibioticStatus } from './types';
import { INITIAL_PATIENTS } from './data/mockData';
import { SECTORS } from './constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [recoverySession, setRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const [hospitalName, setHospitalNameState] = useState(() => localStorage.getItem('sva_hospital_name') || 'Hospital Estadual de São Luis de Montes Belos - HSLMB');
  const [bgImage, setBgImageState] = useState(() => localStorage.getItem('sva_bg_image') || '');
  const [loginBgImage, setLoginBgImageState] = useState(() => localStorage.getItem('sva_login_bg_image') || '');
  const [reportEmail, setReportEmailState] = useState(() => localStorage.getItem('sva_report_email') || '');
  const [patientDays, setPatientDaysState] = useState(() => parseInt(localStorage.getItem('sva_patient_days') || '1200'));
  const [atbCosts, setAtbCostsState] = useState<Record<string, number>>(() => {
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

  const [configNotifyReset, setConfigNotifyResetState] = useState(() => localStorage.getItem('sva_config_notify_reset') !== 'false');
  const [configNotifyPending, setConfigNotifyPendingState] = useState(() => localStorage.getItem('sva_config_notify_pending') !== 'false');
  const [configNotifyExpired, setConfigNotifyExpiredState] = useState(() => localStorage.getItem('sva_config_notify_expired') !== 'false');
  const [configResetTime, setConfigResetTimeState] = useState(() => localStorage.getItem('sva_config_reset_time') || '07:30');
  const [configResetTimeUTI, setConfigResetTimeUTIState] = useState(() => localStorage.getItem('sva_config_reset_time_uti') || '22:00');
  const [configPendingTimeClinicas, setConfigPendingTimeClinicasState] = useState(() => localStorage.getItem('sva_config_pending_time_clinicas') || '21:30');
  const [configPendingTimeUTI, setConfigPendingTimeUTIState] = useState(() => localStorage.getItem('sva_config_pending_time_uti_alert') || '13:00');
  const [configAtbDayLock, setConfigAtbDayLockState] = useState(() => localStorage.getItem('sva_config_atb_day_lock') !== 'false');
  const [configAtbDayChangeTime, setConfigAtbDayChangeTimeState] = useState(() => localStorage.getItem('sva_config_atb_day_change_time') || '00:00');
  const [configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTIState] = useState(() => localStorage.getItem('sva_config_atb_day_change_time_uti') || '00:00');

  // --- HELPER PARA SALVAR CONFIGURAÇÕES NO SUPABASE E LOCALSTORAGE ---
  const saveSetting = async (key: string, value: any, localStorageKey: string) => {
    localStorage.setItem(localStorageKey, typeof value === 'string' ? value : JSON.stringify(value));
    try {
      await supabase.from('system_settings').upsert({ key, value }, { onConflict: 'key' });
    } catch (err) {
      console.error(`Erro ao salvar configuração ${key}:`, err);
    }
  };

  const setHospitalName = (val: string) => { setHospitalNameState(val); saveSetting('hospital_name', val, 'sva_hospital_name'); };
  const setBgImage = (val: string) => { setBgImageState(val); saveSetting('bg_image', val, 'sva_bg_image'); };
  const setLoginBgImage = (val: string) => { setLoginBgImageState(val); saveSetting('login_bg_image', val, 'sva_login_bg_image'); };
  const setReportEmail = (val: string) => { setReportEmailState(val); saveSetting('report_email', val, 'sva_report_email'); };
  const setPatientDays = (val: number) => { setPatientDaysState(val); saveSetting('patient_days', val, 'sva_patient_days'); };
  const setAtbCosts = (val: any) => {
    setAtbCostsState(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      saveSetting('atb_costs', newVal, 'sva_atb_costs');
      return newVal;
    });
  };
  const setConfigNotifyReset = (val: boolean) => { setConfigNotifyResetState(val); saveSetting('config_notify_reset', val, 'sva_config_notify_reset'); };
  const setConfigNotifyPending = (val: boolean) => { setConfigNotifyPendingState(val); saveSetting('config_notify_pending', val, 'sva_config_notify_pending'); };
  const setConfigNotifyExpired = (val: boolean) => { setConfigNotifyExpiredState(val); saveSetting('config_notify_expired', val, 'sva_config_notify_expired'); };
  const setConfigResetTime = (val: string) => { setConfigResetTimeState(val); saveSetting('config_reset_time', val, 'sva_config_reset_time'); };
  const setConfigResetTimeUTI = (val: string) => { setConfigResetTimeUTIState(val); saveSetting('config_reset_time_uti', val, 'sva_config_reset_time_uti'); };
  const setConfigPendingTimeClinicas = (val: string) => { setConfigPendingTimeClinicasState(val); saveSetting('config_pending_time_clinicas', val, 'sva_config_pending_time_clinicas'); };
  const setConfigPendingTimeUTI = (val: string) => { setConfigPendingTimeUTIState(val); saveSetting('config_pending_time_uti_alert', val, 'sva_config_pending_time_uti_alert'); };
  const setConfigAtbDayLock = (val: boolean) => { setConfigAtbDayLockState(val); saveSetting('config_atb_day_lock', val, 'sva_config_atb_day_lock'); };
  const setConfigAtbDayChangeTime = (val: string) => { setConfigAtbDayChangeTimeState(val); saveSetting('config_atb_day_change_time', val, 'sva_config_atb_day_change_time'); };
  const setConfigAtbDayChangeTimeUTI = (val: string) => { setConfigAtbDayChangeTimeUTIState(val); saveSetting('config_atb_day_change_time_uti', val, 'sva_config_atb_day_change_time_uti'); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, !!session);
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setRecoverySession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


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
      // Dispatch an event so other tabs know immediately
      window.dispatchEvent(new Event('storage'));
      return newVal;
    });
  }, []);

  // --- CROSS-TAB SYNC VIA STORAGE EVENT ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      // If e is a StorageEvent it triggers on actual changes to localStorage from OTHER tabs
      // If it's a generic Event (dispatched manually), it triggers on the SAME tab
      const isDark = localStorage.getItem('sva_dark_mode') === 'true';
      setIsDarkMode(isDark);

      setHospitalNameState(localStorage.getItem('sva_hospital_name') || 'Hospital Estadual de São Luis de Montes Belos - HSLMB');
      setBgImageState(localStorage.getItem('sva_bg_image') || '');
      setLoginBgImageState(localStorage.getItem('sva_login_bg_image') || '');
      setReportEmailState(localStorage.getItem('sva_report_email') || '');
      setPatientDaysState(parseInt(localStorage.getItem('sva_patient_days') || '1200'));

      const savedCosts = localStorage.getItem('sva_atb_costs');
      if (savedCosts) setAtbCostsState(JSON.parse(savedCosts));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [systemAlert, setSystemAlert] = useState<{ message: string, type: 'info' | 'warning' | 'success' } | null>(null);

  const [users, setUsers] = useState<User[]>([]);

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

  const mapProfileToUser = (profile: any): User => ({
    id: profile.id,
    name: profile.name || 'SEM NOME',
    email: profile.email,
    cpf: profile.cpf,
    role: profile.role || UserRole.VISUALIZADOR,
    sector: profile.sector || 'GERAL',
    mobile: profile.mobile || '',
    birthDate: profile.birth_date ? format(new Date(profile.birth_date), 'dd/MM/yyyy') : '',
    photoURL: profile.photo_url,
    needsPasswordChange: profile.needs_password_change,
    password: '' // Password hidden/unknown
  });

  const mapPreRegToUser = (pre: any): User => ({
    id: `pre-${pre.cpf}`,
    name: `${pre.name} (PENDENTE)`,
    email: pre.email,
    cpf: pre.cpf,
    role: pre.role as UserRole,
    sector: pre.sector,
    mobile: '',
    birthDate: '',
    photoURL: undefined,
    needsPasswordChange: true,
    password: pre.temp_password // Exposed here if we want to show it, or keep hidden. Usually admin knows what they set.
  });

  const parseDateToDb = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // --- SUPABASE FETCH & SUBSCRIPTION ---
  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('pacientes').select('*');
    if (error) {
      console.error('Error fetching patients:', error);
      setSystemAlert({ message: 'Erro ao carregar pacientes do servidor.', type: 'warning' });
    } else {
      setPatients(data.map(mapDbToPatient));
      setLastSaved(new Date());
    }
    setIsLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) {
      console.error('Error fetching settings:', error);
    } else if (data) {
      data.forEach(s => {
        switch (s.key) {
          case 'hospital_name': setHospitalNameState(s.value); break;
          case 'bg_image': setBgImageState(s.value); break;
          case 'login_bg_image': setLoginBgImageState(s.value); break;
          case 'report_email': setReportEmailState(s.value); break;
          case 'patient_days': setPatientDaysState(Number(s.value)); break;
          case 'atb_costs': setAtbCostsState(s.value); break;
          case 'config_notify_reset': setConfigNotifyResetState(s.value); break;
          case 'config_notify_pending': setConfigNotifyPendingState(s.value); break;
          case 'config_notify_expired': setConfigNotifyExpiredState(s.value); break;
          case 'config_reset_time': setConfigResetTimeState(s.value); break;
          case 'config_reset_time_uti': setConfigResetTimeUTIState(s.value); break;
          case 'config_pending_time_clinicas': setConfigPendingTimeClinicasState(s.value); break;
          case 'config_pending_time_uti_alert': setConfigPendingTimeUTIState(s.value); break;
          case 'config_atb_day_change_time': setConfigAtbDayChangeTimeState(s.value); break;
          case 'config_atb_day_change_time_uti': setConfigAtbDayChangeTimeUTIState(s.value); break;
        }
        // Sync to localStorage too
        localStorage.setItem(`sva_${s.key}`, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
      });
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    const { data: preRegs, error: prError } = await supabase.from('pre_registrations').select('*');

    if (pError) console.error('Error fetching profiles:', pError);
    if (prError) console.error('Error fetching pre_registrations:', prError);

    const validProfiles = profiles ? profiles.map(mapProfileToUser) : [];
    const validPreRegs = preRegs ? preRegs.map(mapPreRegToUser) : [];

    setUsers([...validProfiles, ...validPreRegs]);
  }, []);

  useEffect(() => {
    if (session) {
      fetchPatients();
      fetchUsers();
      fetchSettings();

      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => {
          fetchPatients();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchUsers();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pre_registrations' }, () => {
          fetchUsers();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
          fetchSettings();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time changes');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchPatients, fetchUsers, fetchSettings]);


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
    const totalCost = (Object.values(atbCosts) as any[]).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    doc.text(`Custo Total Estimado: R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 51);

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

      // Reset evaluations por Setor
      if (configNotifyReset) {
        const lastResetDateMap = JSON.parse(localStorage.getItem('sva_sector_resets') || '{}');
        const sectorsToReset: string[] = [];

        // Verifica Enfermaria (Geral)
        const [hGen, mGen] = configResetTime.split(':').map(Number);
        const isPastGenTime = now.getHours() > hGen || (now.getHours() === hGen && now.getMinutes() >= mGen);
        if (lastResetDateMap['GERAL'] !== todayStr && isPastGenTime) {
          sectorsToReset.push('GERAL');
          lastResetDateMap['GERAL'] = todayStr;
        }

        // Verifica UTI
        const [hUTI, mUTI] = configResetTimeUTI.split(':').map(Number);
        const isPastUTITime = now.getHours() > hUTI || (now.getHours() === hUTI && now.getMinutes() >= mUTI);
        if (lastResetDateMap['UTI'] !== todayStr && isPastUTITime) {
          sectorsToReset.push('UTI');
          lastResetDateMap['UTI'] = todayStr;
        }

        if (sectorsToReset.length > 0) {
          let query = supabase.from('pacientes').update({ is_evaluated: false });

          // Divide os setores do sistema entre UTI e Geral baseando-se no nome
          const utiSectors = SECTORS.filter(s => s.toUpperCase().includes('UTI'));
          const generalSectors = SECTORS.filter(s => !s.toUpperCase().includes('UTI'));

          if (sectorsToReset.includes('GERAL') && sectorsToReset.includes('UTI')) {
            // Reset global - remove filtro para afetar todos
          } else if (sectorsToReset.includes('UTI')) {
            query = query.in('sector', utiSectors);
          } else {
            query = query.in('sector', generalSectors);
          }

          query.then(({ error }) => {
            if (!error) {
              fetchPatients();
              localStorage.setItem('sva_sector_resets', JSON.stringify(lastResetDateMap));
              setSystemAlert({
                message: `Reset de avaliações concluído para: ${sectorsToReset.join(', ')}`,
                type: 'info'
              });
              setTimeout(() => setSystemAlert(null), 10000);
            }
          });
        }
      }

      // Alerta de Pendentes
      if (configNotifyPending) {
        // --- ALERTA CLÍNICAS / OUTROS (20:00) ---
        const [hClin, mClin] = configPendingTimeClinicas.split(':').map(Number);
        const isPastClinTime = now.getHours() > hClin || (now.getHours() === hClin && now.getMinutes() >= mClin);
        const lastAlertGen = localStorage.getItem('sva_last_night_alert_clinicas');

        if (lastAlertGen !== todayStr && isPastClinTime) {
          const pendentesClinicas = patients.filter(p => !p.isEvaluated && !p.sector?.includes('UTI'));
          if (pendentesClinicas.length > 0) {
            const names = pendentesClinicas.map(p => p.name).slice(0, 3).join(', ');
            const remaining = pendentesClinicas.length - 3;
            const msg = remaining > 0 ? ` e outros ${remaining} pacientes` : '';
            setSystemAlert({ message: `Pendentes Clínicas (${configPendingTimeClinicas}): ${names}${msg}`, type: 'warning' });
            localStorage.setItem('sva_last_night_alert_clinicas', todayStr);
          }
        }

        // --- ALERTA UTI (08:00) ---
        const [hUtiAlert, mUtiAlert] = configPendingTimeUTI.split(':').map(Number);
        const isPastUtiAlertTime = now.getHours() > hUtiAlert || (now.getHours() === hUtiAlert && now.getMinutes() >= mUtiAlert);
        const lastAlertUti = localStorage.getItem('sva_last_night_alert_uti');

        if (lastAlertUti !== todayStr && isPastUtiAlertTime) {
          const pendentesUti = patients.filter(p => !p.isEvaluated && p.sector?.includes('UTI'));
          if (pendentesUti.length > 0) {
            const names = pendentesUti.map(p => p.name).slice(0, 3).join(', ');
            const remaining = pendentesUti.length - 3;
            const msg = remaining > 0 ? ` e outros ${remaining} pacientes` : '';
            setSystemAlert({ message: `Pendentes UTI (${configPendingTimeUTI}): ${names}${msg}`, type: 'warning' });
            localStorage.setItem('sva_last_night_alert_uti', todayStr);
          }
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
  }, [patients, reportEmail, atbCosts, hospitalName, configNotifyReset, configNotifyPending, configResetTime, configResetTimeUTI, configPendingTimeClinicas, configPendingTimeUTI]);

  useEffect(() => {
    // Only save settings to local storage, NOT patients OR users anymore
    localStorage.setItem('sva_hospital_name', hospitalName);
    localStorage.setItem('sva_bg_image', bgImage);
    localStorage.setItem('sva_login_bg_image', loginBgImage);
    localStorage.setItem('sva_report_email', reportEmail);
    localStorage.setItem('sva_patient_days', patientDays.toString());
    localStorage.setItem('sva_atb_costs', JSON.stringify(atbCosts));
    localStorage.setItem('sva_config_notify_reset', String(configNotifyReset));
    localStorage.setItem('sva_config_notify_pending', String(configNotifyPending));
    localStorage.setItem('sva_config_notify_expired', String(configNotifyExpired));
    localStorage.setItem('sva_config_reset_time', configResetTime);
    localStorage.setItem('sva_config_pending_time_clinicas', configPendingTimeClinicas);
    localStorage.setItem('sva_config_pending_time_uti_alert', configPendingTimeUTI);
  }, [hospitalName, bgImage, loginBgImage, reportEmail, patientDays, atbCosts, configNotifyReset, configNotifyPending, configNotifyExpired, configResetTime, configPendingTimeClinicas, configPendingTimeUTI]);

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

  const handleUpdatePatientsOrder = async (updates: { id: string, order: number }[]) => {
    // Optimistic update
    setPatients(prev => {
      const newPatients = [...prev];
      updates.forEach(up => {
        const idx = newPatients.findIndex(p => p.id === up.id);
        if (idx !== -1) newPatients[idx] = { ...newPatients[idx], order: up.order };
      });
      return newPatients;
    });

    // Supabase supports bulk upsert/update if we provide the primary key
    // But here it's easier to just fire them off or use a single RPC if available.
    // Since there's no custom RPC, we do multiple updates.
    try {
      await Promise.all(updates.map(up =>
        supabase.from('pacientes').update({ order: up.order }).eq('id', up.id)
      ));
    } catch (err) {
      console.error('Error updating patient orders:', err);
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

  const handleAddUser = useCallback(async (u: User) => {
    // Admin provisioning flow
    if (!u.cpf || !u.password) {
      alert("Para cadastrar um usuário, preencha CPF e uma Senha Chave (temporária).");
      return;
    }

    const { error } = await supabase.from('pre_registrations').insert([{
      cpf: u.cpf,
      email: u.email,
      name: u.name.toUpperCase(),
      sector: u.sector,
      role: u.role,
      temp_password: u.password // The 'key' password
    }]);

    if (error) {
      console.error('Erro ao pré-cadastrar usuário:', error);
      alert(`Erro ao cadastrar: ${error.message}. Verifique se o CPF já existe.`);
    } else {
      alert(`Usuário ${u.name} pré-cadastrado com sucesso! Informe a senha chave "${u.password}" para o primeiro acesso.`);
      fetchUsers();
    }
  }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (u: User) => {
    // Update profile
    const payload: any = {
      name: u.name,
      sector: u.sector,
      role: u.role,
      mobile: u.mobile,
      birth_date: parseDateToDb(u.birthDate),
      photo_url: u.photoURL,
      needs_password_change: u.needsPasswordChange
    };

    // Optimistic update
    setUsers(prev => prev.map(old => old.id === u.id ? u : old));

    // Determine if it is a pre-registration or full profile based on ID
    if (String(u.id).startsWith('pre-')) {
      const cpf = String(u.id).replace('pre-', '');
      // For pre-regs, we only update core fields
      const { error } = await supabase.from('pre_registrations').update({
        name: u.name,
        sector: u.sector,
        role: u.role,
      }).eq('cpf', cpf);
      if (error) alert("Erro ao atualizar pré-cadastro: " + error.message);
    } else {
      const { error } = await supabase.from('profiles').update(payload).eq('id', u.id);
      if (error) {
        console.error("Error updating user profile:", error);
        alert("Erro ao atualizar perfil do usuário: " + error.message);
        fetchUsers();
      }
    }
  }, [fetchUsers]);

  const handleDeleteUser = useCallback(async (id: string) => {
    if (id === user?.id) {
      alert("Você não pode excluir a si mesmo.");
      return;
    }

    const confirm = window.confirm("Confirmar exclusão deste usuário?");
    if (confirm) {
      setUsers(prev => prev.filter(u => u.id !== id));

      if (String(id).startsWith('pre-')) {
        const cpf = String(id).replace('pre-', '');
        const { error } = await supabase.from('pre_registrations').delete().eq('cpf', cpf);
        if (error) alert("Erro ao excluir pré-cadastro: " + error.message);
      } else {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) {
          console.error("Error deleting profile:", error);
          // We can't easily delete from auth.users via client without edge function, 
          // so deleting profile effectively 'hides' them and prevents logic from working mostly.
          fetchUsers();
        }
      }
    }
  }, [user, fetchUsers]);

  // Current User Logic
  const currentUser = user || users.find(u => u.email?.toLowerCase() === session?.user?.email?.toLowerCase()) || {
    id: session?.user?.id,
    name: session?.user?.email?.split('@')[0].toUpperCase(),
    email: session?.user?.email,
    role: UserRole.VISUALIZADOR,
    sector: 'GERAL',
    cpf: '',
    mobile: '',
    birthDate: '',
    needsPasswordChange: false,
    password: ''
  };

  // Check for Forced Password Change
  const needsPasswordChange = users.find(u => u.id === currentUser.id)?.needsPasswordChange;

  if (recoverySession || (session && needsPasswordChange)) {
    return <PasswordReset onSuccess={() => {
      setRecoverySession(false);
      // Refresh users to clear needsPasswordChange without losing session
      fetchUsers();
    }} />;
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-6">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">SVA Hospital</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Verificando Acesso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={fetchPatients} bgImage={loginBgImage} />;
  }

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
      onUpdatePatientsOrder={handleUpdatePatientsOrder}
      lastSaved={lastSaved}
      users={users}
      onAddUser={handleAddUser}
      onUpdateUser={handleUpdateUser}
      onDeleteUser={handleDeleteUser}
      isLoading={isLoading}
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
      configNotifyReset={configNotifyReset}
      setConfigNotifyReset={setConfigNotifyReset}
      configNotifyPending={configNotifyPending}
      setConfigNotifyPending={setConfigNotifyPending}
      configNotifyExpired={configNotifyExpired}
      setConfigNotifyExpired={setConfigNotifyExpired}
      configResetTime={configResetTime}
      setConfigResetTime={setConfigResetTime}
      configResetTimeUTI={configResetTimeUTI}
      setConfigResetTimeUTI={setConfigResetTimeUTI}
      configPendingTimeClinicas={configPendingTimeClinicas}
      configPendingTimeUTI={configPendingTimeUTI}
      setConfigPendingTimeClinicas={setConfigPendingTimeClinicas}
      setConfigPendingTimeUTI={setConfigPendingTimeUTI}
      configAtbDayLock={configAtbDayLock}
      setConfigAtbDayLock={setConfigAtbDayLock}
      configAtbDayChangeTime={configAtbDayChangeTime}
      setConfigAtbDayChangeTime={setConfigAtbDayChangeTime}
      configAtbDayChangeTimeUTI={configAtbDayChangeTimeUTI}
      setConfigAtbDayChangeTimeUTI={setConfigAtbDayChangeTimeUTI}
      onBulkAddPatients={async (newPatients: Patient[]) => {
        const dbPayloads = newPatients.map(mapPatientToDb);
        const { error } = await supabase.from('pacientes').insert(dbPayloads);
        if (error) {
          console.error('Error bulk adding patients:', error);
          alert(`Erro ao salvar pacientes em massa: ${error.message}`);
          fetchPatients();
        } else {
          setPatients(prev => [...newPatients, ...prev]);
          alert(`${newPatients.length} pacientes importados com sucesso!`);
        }
      }}
    />
  );
};

export default App;
