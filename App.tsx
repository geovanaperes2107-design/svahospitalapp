import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PasswordReset from './components/PasswordReset';
import { UserRole, Patient, User, AntibioticStatus, normalizeRole } from './types';
import { INITIAL_PATIENTS } from './data/mockData';
import { DEFAULT_SECTORS } from './constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeJsonParse, generateUUID, isValidUUID, formatDateBR, formatDateISO, parseAnyDate, getTodayISO } from './utils';

const DEFAULT_ATB_COSTS: Record<string, number> = {
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

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [recoverySession, setRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const [hospitalName, setHospitalNameState] = useState(() => localStorage.getItem('sva_hospital_name') || 'Hospital Estadual de São Luis de Montes Belos - HSLMB');
  const [bgImage, setBgImageState] = useState(() => localStorage.getItem('sva_bg_image') || '');
  const [bgFit, setBgFitState] = useState(() => localStorage.getItem('sva_bg_fit') || 'cover');
  const [bgPosition, setBgPositionState] = useState(() => localStorage.getItem('sva_bg_position') || 'center');
  const [bgOpacity, setBgOpacityState] = useState(() => localStorage.getItem('sva_bg_opacity') || '0.3');

  const [loginBgImage, setLoginBgImageState] = useState(() => localStorage.getItem('sva_login_bg_image') || '');
  const [loginBgFit, setLoginBgFitState] = useState(() => localStorage.getItem('sva_login_bg_fit') || 'cover');
  const [loginBgPosition, setLoginBgPositionState] = useState(() => localStorage.getItem('sva_login_bg_position') || 'center');
  const [loginBgOpacity, setLoginBgOpacityState] = useState(() => localStorage.getItem('sva_login_bg_opacity') || '0.4');
  const [reportEmail, setReportEmailState] = useState(() => localStorage.getItem('sva_report_email') || '');
  const [patientDays, setPatientDaysState] = useState(() => parseInt(localStorage.getItem('sva_patient_days') || '1200'));
  const [atbCosts, setAtbCostsState] = useState<Record<string, number>>(() =>
    safeJsonParse(localStorage.getItem('sva_atb_costs'), DEFAULT_ATB_COSTS)
  );

  const [configNotifyReset, setConfigNotifyResetState] = useState(() => localStorage.getItem('sva_config_notify_reset') !== 'false');
  const [configNotifyPending, setConfigNotifyPendingState] = useState(() => localStorage.getItem('sva_config_notify_pending') !== 'false');
  const [configNotifyExpired, setConfigNotifyExpiredState] = useState(() => localStorage.getItem('sva_config_notify_expired') !== 'false');
  const [configResetTime, setConfigResetTimeState] = useState(() => localStorage.getItem('sva_config_reset_time') || '07:30');
  const [configResetTimeUTI, setConfigResetTimeUTIState] = useState(() => localStorage.getItem('sva_config_reset_time_uti') || '22:00');
  const [configPendingTimeClinicas, setConfigPendingTimeClinicasState] = useState(() => localStorage.getItem('sva_config_pending_time_clinicas') || '21:30');
  const [configPendingTimeUTI, setConfigPendingTimeUTIState] = useState(() => localStorage.getItem('sva_config_pending_time_uti_alert') || '13:00');
  const [configAtbDayLock, setConfigAtbDayLockState] = useState(() => localStorage.getItem('sva_config_atb_day_lock') !== 'false');
  const [configAtbDayChangeTime, setConfigAtbDayChangeTimeState] = useState(() => localStorage.getItem('sva_config_atb_day_change_time') || '07:00');
  const [configAtbDayChangeTimeUTI, setConfigAtbDayChangeTimeUTIState] = useState(() => localStorage.getItem('sva_config_atb_day_change_time_uti') || '19:00');
  const [activeSectors, setActiveSectorsState] = useState<string[]>(() =>
    safeJsonParse(localStorage.getItem('sva_active_sectors'), DEFAULT_SECTORS)
  );
  const [lastSectorResets, setLastSectorResetsState] = useState<Record<string, string>>(() =>
    safeJsonParse(localStorage.getItem('sva_last_sector_resets'), {})
  );
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

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
  const setBgFit = (val: string) => { setBgFitState(val); saveSetting('bg_fit', val, 'sva_bg_fit'); };
  const setBgPosition = (val: string) => { setBgPositionState(val); saveSetting('bg_position', val, 'sva_bg_position'); };
  const setBgOpacity = (val: string) => { setBgOpacityState(val); saveSetting('bg_opacity', val, 'sva_bg_opacity'); };

  const setLoginBgImage = (val: string) => { setLoginBgImageState(val); saveSetting('login_bg_image', val, 'sva_login_bg_image'); };
  const setLoginBgFit = (val: string) => { setLoginBgFitState(val); saveSetting('login_bg_fit', val, 'sva_login_bg_fit'); };
  const setLoginBgPosition = (val: string) => { setLoginBgPositionState(val); saveSetting('login_bg_position', val, 'sva_login_bg_position'); };
  const setLoginBgOpacity = (val: string) => { setLoginBgOpacityState(val); saveSetting('login_bg_opacity', val, 'sva_login_bg_opacity'); };
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
  const setActiveSectors = (val: string[] | ((prev: string[]) => string[])) => {
    setActiveSectorsState(prev => {
      const newVal = typeof val === 'function' ? val(prev) : val;
      saveSetting('active_sectors', newVal, 'sva_active_sectors');
      return newVal;
    });
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout to ensure isInitializing doesn't get stuck indefinitely
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsInitializing(false);
    }, 4000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setIsInitializing(false);
        }
      })
      .catch((err) => {
        console.error('Error getting Supabase session:', err);
        if (mounted) setIsInitializing(false);
      })
      .finally(() => {
        clearTimeout(safetyTimer);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event, !!session);
      if (mounted) {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        if (event === 'PASSWORD_RECOVERY') {
          setRecoverySession(true);
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);


  const [completedPasswordResets, setCompletedPasswordResets] = useState<Set<string>>(new Set());
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
      if (savedCosts) setAtbCostsState(safeJsonParse(savedCosts, DEFAULT_ATB_COSTS));

      const savedSectors = localStorage.getItem('sva_active_sectors');
      if (savedSectors) setActiveSectorsState(safeJsonParse(savedSectors, DEFAULT_SECTORS));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [systemAlert, setSystemAlert] = useState<{ id?: string; message: string; type: 'info' | 'warning' | 'success' } | null>(null);

  const triggerSystemAlert = useCallback((alertObj: { id?: string; message: string; type: 'info' | 'warning' | 'success' }, durationMs = 10000) => {
    const alertId = alertObj.id || `${alertObj.type}_${alertObj.message}`;
    const dismissedAlerts = safeJsonParse(localStorage.getItem('sva_dismissed_alerts'), [] as string[]);
    if (dismissedAlerts.includes(alertId)) {
      return;
    }
    setSystemAlert({ ...alertObj, id: alertId });
    if (durationMs > 0) {
      setTimeout(() => {
        setSystemAlert(current => (current?.id === alertId ? null : current));
      }, durationMs);
    }
  }, []);

  const [users, setUsers] = useState<User[]>([]);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // --- DATA TRANSFORMATION HELPERS ---
  const mapDbToPatient = (row: any): Patient => ({
    id: row.id,
    name: row.name,
    birthDate: row.birth_date ? formatDateBR(row.birth_date) : '',
    bed: row.bed,
    sector: row.sector,
    diagnosis: row.diagnosis || '',
    treatmentType: row.treatment_type,
    infectoStatus: row.infecto_status,
    infectoComment: row.infecto_comment,
    pharmacyNote: row.pharmacy_note,
    prescriberNotes: row.prescriber_notes,
    incisionRelation: row.incision_relation,
    procedureDate: row.procedure_date ? formatDateBR(row.procedure_date) : undefined,
    operativeTime: row.operative_time,
    antibiotics: row.antibiotics || [],
    isEvaluated: row.is_evaluated,
    lastEvaluationDate: row.last_evaluation_date ? formatDateBR(row.last_evaluation_date) : undefined,
    history: row.history || []
  });

  const mapPatientToDb = (p: Patient) => {
    // Helper to parse DD/MM/YYYY to YYYY-MM-DD
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return dateStr;
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
      last_evaluation_date: p.lastEvaluationDate ? formatDateISO(p.lastEvaluationDate) : null,
      history: p.history
    };
  };

  const mapProfileToUser = (profile: any): User => {
    const isSuyanne = profile.email?.toLowerCase().trim() === 'suyanne_oliveira92@hotmail.com';
    const isFarmacia = profile.sector === 'FARMÁCIA' || profile.sector === 'FARMACIA';
    const effectiveRole = (isSuyanne || isFarmacia) ? UserRole.FARMACEUTICO : normalizeRole(profile.role);

    return {
      id: profile.id,
      name: profile.name || 'SUYANNE MAYARA OLIVEIRA FERREIRA',
      email: profile.email,
      cpf: profile.cpf,
      role: effectiveRole,
      sector: profile.sector || 'FARMÁCIA',
      mobile: profile.mobile || '',
      birthDate: profile.birth_date ? format(new Date(profile.birth_date), 'dd/MM/yyyy') : '',
      photoURL: profile.photo_url,
      needsPasswordChange: profile.needs_password_change,
      password: ''
    };
  };

  const mapPreRegToUser = (pre: any): User => {
    const isSuyanne = pre.email?.toLowerCase().trim() === 'suyanne_oliveira92@hotmail.com';
    const isFarmacia = pre.sector === 'FARMÁCIA' || pre.sector === 'FARMACIA';
    const effectiveRole = (isSuyanne || isFarmacia) ? UserRole.FARMACEUTICO : normalizeRole(pre.role);

    return {
      id: `pre-${pre.cpf}`,
      name: `${pre.name} (PENDENTE)`,
      email: pre.email,
      cpf: pre.cpf,
      role: effectiveRole,
      sector: pre.sector || 'FARMÁCIA',
      mobile: '',
      birthDate: '',
      photoURL: undefined,
      needsPasswordChange: true,
      password: pre.temp_password
    };
  };

  const parseDateToDb = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const fetchPatients = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const { data, error } = await supabase.from('pacientes').select('*');
      if (error) {
        console.warn('Supabase fetch notice:', error);
      } else if (data) {
        const mapped = data.map(mapDbToPatient);
        setPatients(prev => {
          if (JSON.stringify(prev) === JSON.stringify(mapped)) {
            return prev;
          }
          setLastSaved(new Date());
          return mapped;
        });
      }
    } catch (err) {
      console.warn('Fetch patients exception:', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
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
            case 'active_sectors': setActiveSectorsState(s.value); break;
            case 'last_sector_resets': {
              const resets = typeof s.value === 'string' ? safeJsonParse(s.value, {}) : (s.value || {});
              setLastSectorResetsState(resets);
              break;
            }
          }
          // Sync to localStorage too
          localStorage.setItem(`sva_${s.key}`, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
        });
      }
    } catch (err) {
      console.error('Exception in fetchSettings:', err);
    } finally {
      setIsSettingsLoaded(true);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    const { data: preRegs, error: prError } = await supabase.from('pre_registrations').select('*');

    if (pError) console.error('Error fetching profiles:', pError);
    if (prError) console.error('Error fetching pre_registrations:', prError);

    const userMap = new Map<string, User>();

    if (preRegs) {
      for (const pre of preRegs) {
        const u = mapPreRegToUser(pre);
        const key = (u.email || '').toLowerCase().trim() || (u.cpf || '').replace(/\D/g, '');
        if (key) userMap.set(key, u);
      }
    }

    if (profiles) {
      for (const p of profiles) {
        const u = mapProfileToUser(p);
        const key = (u.email || '').toLowerCase().trim() || (u.cpf || '').replace(/\D/g, '');
        if (key) userMap.set(key, u);
      }
    }

    // Mandatory fallback to ensure Suyanne is ALWAYS visible in Admin User Management list
    const suyanneEmail = 'suyanne_oliveira92@hotmail.com';
    if (!userMap.has(suyanneEmail)) {
      userMap.set(suyanneEmail, {
        id: 'usr-suyanne',
        name: 'SUYANNE MAYARA OLIVEIRA FERREIRA',
        email: suyanneEmail,
        cpf: '034.646.941-43',
        role: UserRole.FARMACEUTICO,
        sector: 'FARMÁCIA',
        mobile: '',
        birthDate: '',
        needsPasswordChange: false,
        password: ''
      });
    }

    setUsers(Array.from(userMap.values()));
  }, []);

  useEffect(() => {
    if (session) {
      fetchPatients(true);
      fetchUsers();
      fetchSettings();

      const channel = supabase
        .channel('sva-realtime-global')
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
            console.log('⚡ Conectado ao Supabase Realtime com sucesso!');
          }
        });

      // Sincronização inteligente com debounce e fallback a cada 15s sem recarregar se os dados forem idênticos
      const autoSyncInterval = setInterval(() => {
        fetchPatients();
      }, 15000);

      return () => {
        clearInterval(autoSyncInterval);
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
    const activePatients = patients.filter(p => p.sector !== 'Centro Cirúrgico' && !p.sector?.includes('Centro Cir') && p.antibiotics.some(a => a.status === AntibioticStatus.EM_USO)).length;
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
      if (!isSettingsLoaded) return;

      const now = new Date();
      const todayISO = getTodayISO();
      const todayBR = formatDateBR(now);

      // Reset evaluations por Setor (Sincronizado via Supabase system_settings)
      if (configNotifyReset) {
        const lastResetDateMap = { ...lastSectorResets };
        const sectorsToReset: string[] = [];

        // Verifica Enfermaria (Geral)
        const [hGen, mGen] = configResetTime.split(':').map(Number);
        const isPastGenTime = now.getHours() > hGen || (now.getHours() === hGen && now.getMinutes() >= mGen);
        if (lastResetDateMap['GERAL'] !== todayISO && isPastGenTime) {
          sectorsToReset.push('GERAL');
          lastResetDateMap['GERAL'] = todayISO;
        }

        // Verifica UTI
        const [hUTI, mUTI] = configResetTimeUTI.split(':').map(Number);
        const isPastUTITime = now.getHours() > hUTI || (now.getHours() === hUTI && now.getMinutes() >= mUTI);
        if (lastResetDateMap['UTI'] !== todayISO && isPastUTITime) {
          sectorsToReset.push('UTI');
          lastResetDateMap['UTI'] = todayISO;
        }

        if (sectorsToReset.length > 0) {
          // Grava imediatamente em lastSectorResets no Supabase para impedir que outros painéis/dispositivos tentem resetar hoje
          setLastSectorResetsState(lastResetDateMap);
          saveSetting('last_sector_resets', lastResetDateMap, 'sva_last_sector_resets');

          const utiSectors = activeSectors.filter(s => s.toUpperCase().includes('UTI'));
          const generalSectors = activeSectors.filter(s => !s.toUpperCase().includes('UTI'));

          let query = supabase.from('pacientes').update({ is_evaluated: false });

          if (sectorsToReset.includes('GERAL') && sectorsToReset.includes('UTI')) {
            // Reset global
          } else if (sectorsToReset.includes('UTI')) {
            query = query.in('sector', utiSectors);
          } else {
            query = query.in('sector', generalSectors);
          }

          // Proteção adicional: NÃO desmarca pacientes avaliados HOJE (verifica ISO YYYY-MM-DD e BR DD/MM/YYYY)
          query = query.or(`last_evaluation_date.is.null,and(last_evaluation_date.neq.${todayISO},last_evaluation_date.neq.${todayBR})`);

          query.then(({ error }) => {
            if (!error) {
              fetchPatients();
              triggerSystemAlert({
                id: `reset_${todayISO}_${sectorsToReset.join('_')}`,
                message: `Reset de avaliações concluído para: ${sectorsToReset.join(', ')}`,
                type: 'info'
              });
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

        if (lastAlertGen !== todayISO && isPastClinTime) {
          const pendentesClinicas = patients.filter(p => !p.isEvaluated && !p.sector?.includes('UTI'));
          if (pendentesClinicas.length > 0) {
            const names = pendentesClinicas.map(p => p.name).slice(0, 3).join(', ');
            const remaining = pendentesClinicas.length - 3;
            const msg = remaining > 0 ? ` e outros ${remaining} pacientes` : '';
            triggerSystemAlert({
              id: `pending_clinicas_${todayISO}`,
              message: `Pendentes Clínicas (${configPendingTimeClinicas}): ${names}${msg}`,
              type: 'warning'
            });
            localStorage.setItem('sva_last_night_alert_clinicas', todayISO);
          }
        }

        // --- ALERTA UTI (08:00) ---
        const [hUtiAlert, mUtiAlert] = configPendingTimeUTI.split(':').map(Number);
        const isPastUtiAlertTime = now.getHours() > hUtiAlert || (now.getHours() === hUtiAlert && now.getMinutes() >= mUtiAlert);
        const lastAlertUti = localStorage.getItem('sva_last_night_alert_uti');

        if (lastAlertUti !== todayISO && isPastUtiAlertTime) {
          const pendentesUti = patients.filter(p => !p.isEvaluated && p.sector?.includes('UTI'));
          if (pendentesUti.length > 0) {
            const names = pendentesUti.map(p => p.name).slice(0, 3).join(', ');
            const remaining = pendentesUti.length - 3;
            const msg = remaining > 0 ? ` e outros ${remaining} pacientes` : '';
            triggerSystemAlert({
              id: `pending_uti_${todayISO}`,
              message: `Pendentes UTI (${configPendingTimeUTI}): ${names}${msg}`,
              type: 'warning'
            });
            localStorage.setItem('sva_last_night_alert_uti', todayISO);
          }
        }
      }

      // Relatório Mensal
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const isLastDay = now.getDate() === lastDayOfMonth;
      const isReportTime = now.getHours() >= 23;
      const lastReportDate = localStorage.getItem('sva_last_monthly_report');

      if (isLastDay && isReportTime && lastReportDate !== todayISO) {
        console.log(`[SVA] Gerando relatório PDF mensal...`);
        generateMonthlyReport();
        localStorage.setItem('sva_last_monthly_report', todayISO);
        triggerSystemAlert({
          id: `monthly_report_${todayISO}`,
          message: `Relatório mensal gerado e pronto para envio para ${reportEmail}`,
          type: 'success'
        });
      }
    };

    checkScheduledTasks();
    const interval = setInterval(checkScheduledTasks, 60000);
    return () => clearInterval(interval);
  }, [isSettingsLoaded, patients, reportEmail, atbCosts, hospitalName, configNotifyReset, configNotifyPending, configResetTime, configResetTimeUTI, configPendingTimeClinicas, configPendingTimeUTI, lastSectorResets, triggerSystemAlert]);

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
    localStorage.setItem('sva_config_pending_time_uti_alert', configPendingTimeUTI);
    localStorage.setItem('sva_active_sectors', JSON.stringify(activeSectors));
  }, [hospitalName, bgImage, loginBgImage, reportEmail, patientDays, atbCosts, configNotifyReset, configNotifyPending, configNotifyExpired, configResetTime, configPendingTimeClinicas, configPendingTimeUTI, activeSectors]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAddPatient = async (p: Patient) => {
    const validId = isValidUUID(p.id) ? p.id : generateUUID();
    const patientWithValidId = { ...p, id: validId };

    // Optimistic update
    setPatients(prev => [patientWithValidId, ...prev]);

    const dbPayload = {
      id: validId,
      ...mapPatientToDb(patientWithValidId)
    };

    const { error } = await supabase.from('pacientes').insert([dbPayload]);

    if (error) {
      console.error('Error adding patient:', error);
      alert(`Erro ao salvar paciente no servidor: ${error.message} - ${error.details || ''}`);
      fetchPatients();
    }
  };

  const handleUpdatePatient = async (p: Patient) => {
    let targetId = p.id;
    let isNewGeneratedId = false;

    if (!isValidUUID(targetId)) {
      targetId = generateUUID();
      isNewGeneratedId = true;
    }

    const updatedPatient = { ...p, id: targetId };

    // Optimistic
    setPatients(prev => prev.map(old => (old.id === p.id || old.id === targetId) ? updatedPatient : old));

    const dbPayload = mapPatientToDb(updatedPatient);

    let error: any = null;

    if (isNewGeneratedId) {
      // If the patient previously had an invalid string ID (like "37uylqbhl"), insert/upsert with valid UUID!
      const { error: insertErr } = await supabase.from('pacientes').insert([{ id: targetId, ...dbPayload }]);
      error = insertErr;
    } else {
      // Standard update by UUID
      const { error: updateErr } = await supabase.from('pacientes').update(dbPayload).eq('id', targetId);
      error = updateErr;
    }

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

    try {
      await Promise.all(updates.filter(up => isValidUUID(up.id)).map(up =>
        supabase.from('pacientes').update({ order: up.order }).eq('id', up.id)
      ));
    } catch (err) {
      console.error('Error updating patient orders:', err);
      fetchPatients();
    }
  };

  const handleDeletePatient = async (id: string, justification?: string) => {
    const targetPatient = patients.find(p => p.id === id);
    const userName = currentUser.name || user?.name || 'Usuário';

    // Optimistic
    setPatients(prev => prev.filter(p => p.id !== id));

    if (isValidUUID(id)) {
      const { error } = await supabase.from('pacientes').delete().eq('id', id);

      if (error) {
        console.error('Error deleting patient:', error);
        alert(`Erro ao excluir paciente: ${error.message} - ${error.details || ''}`);
        fetchPatients();
      } else if (targetPatient) {
        setSystemAlert({
          message: `Paciente ${targetPatient.name} excluído por ${userName}. Motivo: ${justification || 'Não informado'}`,
          type: 'info'
        });
        setTimeout(() => setSystemAlert(null), 8000);
      }
    }
  };

  const handleAddUser = useCallback(async (u: User) => {
    if (!u.cpf || !u.password) {
      alert("Para cadastrar um usuário, preencha CPF e uma Senha Chave (temporária).");
      return;
    }

    const cleanCpf = u.cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const cleanEmail = u.email.toLowerCase().trim();
    const effectiveRole = (u.sector === 'FARMÁCIA' || u.sector === 'FARMACIA') ? UserRole.FARMACEUTICO : normalizeRole(u.role);

    // 1. Check if user already exists in profiles
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.eq.${cleanEmail},cpf.eq.${cleanCpf},cpf.eq.${formattedCpf}`)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      // User profile already exists in Supabase! Update existing profile with new credentials
      const profile = existingProfiles[0];
      const { error: updateErr } = await supabase.from('profiles').update({
        name: u.name.toUpperCase().trim(),
        sector: u.sector,
        role: effectiveRole,
        cpf: cleanCpf,
        temp_password: u.password,
        needs_password_change: true
      }).eq('id', profile.id);

      if (updateErr) {
        alert("Erro ao atualizar usuário existente: " + updateErr.message);
      } else {
        alert(`Usuário ${u.name} atualizado com sucesso! Perfil: ${effectiveRole}. Informar a senha "${u.password}".`);
        fetchUsers();
      }
      return;
    }

    // 2. Otherwise insert fresh pre-registration
    await supabase.from('pre_registrations').delete().in('cpf', [cleanCpf, formattedCpf, u.cpf]);
    if (cleanEmail) {
      await supabase.from('pre_registrations').delete().eq('email', cleanEmail);
    }

    const { error } = await supabase.from('pre_registrations').insert([{
      cpf: cleanCpf,
      email: cleanEmail,
      name: u.name.toUpperCase().trim(),
      sector: u.sector,
      role: effectiveRole,
      temp_password: u.password
    }]);

    if (error) {
      console.error('Erro ao pré-cadastrar usuário:', error);
      alert(`Erro ao cadastrar: ${error.message}`);
    } else {
      const newUserObj: User = {
        id: `pre-${cleanCpf}`,
        name: `${u.name.toUpperCase().trim()} (PENDENTE)`,
        email: cleanEmail,
        cpf: cleanCpf,
        role: effectiveRole,
        sector: u.sector,
        mobile: '',
        birthDate: '',
        needsPasswordChange: true,
        password: u.password
      };
      setUsers(prev => [...prev.filter(x => (x.email?.toLowerCase().trim() !== cleanEmail && (x.cpf || '').replace(/\D/g, '') !== cleanCpf)), newUserObj]);
      alert(`Usuário ${u.name} pré-cadastrado com sucesso! Perfil: ${effectiveRole}. Informe a senha chave "${u.password}" para o primeiro acesso.`);
      fetchUsers();
    }
  }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (u: User) => {
    const isSuyanne = u.email?.toLowerCase().trim() === 'suyanne_oliveira92@hotmail.com';
    const isFarmacia = u.sector === 'FARMÁCIA' || u.sector === 'FARMACIA';
    const effectiveRole = (isSuyanne || isFarmacia) ? UserRole.FARMACEUTICO : normalizeRole(u.role);

    const cleanCpf = (u.cpf || '').replace(/\D/g, '');
    const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const cleanEmail = (u.email || '').toLowerCase().trim();

    const updatedUserObj: User = {
      ...u,
      role: effectiveRole,
      name: u.name.replace(' (PENDENTE)', '').toUpperCase()
    };

    // Optimistic update
    setUsers(prev => prev.map(old => (old.id === u.id || (cleanEmail && old.email?.toLowerCase().trim() === cleanEmail)) ? updatedUserObj : old));

    // Update pre_registrations
    const preData: any = {
      name: updatedUserObj.name,
      sector: u.sector,
      role: effectiveRole,
      email: cleanEmail
    };
    if (u.password) preData.temp_password = u.password;

    if (cleanEmail) {
      await supabase.from('pre_registrations').update(preData).eq('email', cleanEmail);
    }
    if (cleanCpf) {
      await supabase.from('pre_registrations').update(preData).in('cpf', [cleanCpf, formattedCpf]);
    }

    // Update profiles
    const profilePayload: any = {
      name: updatedUserObj.name,
      sector: u.sector,
      role: effectiveRole,
      mobile: u.mobile,
      birth_date: parseDateToDb(u.birthDate),
      photo_url: u.photoURL,
      needs_password_change: u.needsPasswordChange
    };
    if (u.password) profilePayload.temp_password = u.password;

    if (cleanEmail) {
      await supabase.from('profiles').update(profilePayload).eq('email', cleanEmail);
    }
    if (cleanCpf) {
      await supabase.from('profiles').update(profilePayload).in('cpf', [cleanCpf, formattedCpf]);
    }

    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = useCallback(async (id: string) => {
    if (id === user?.id) {
      alert("Você não pode excluir a si mesmo.");
      return;
    }

    const confirm = window.confirm("Confirmar exclusão deste usuário?");
    if (confirm) {
      setUsers(prev => {
        const target = prev.find(u => u.id === id);
        if (target) {
          const rawCpf = target.cpf || id.replace('pre-', '');
          const cleanCpf = rawCpf.replace(/\D/g, '');
          const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          const cleanEmail = target.email?.toLowerCase().trim();

          // Delete from pre_registrations
          supabase.from('pre_registrations').delete().in('cpf', [cleanCpf, formattedCpf, rawCpf]).then(() => {
            if (cleanEmail) supabase.from('pre_registrations').delete().eq('email', cleanEmail);
          });

          // Delete from profiles
          if (!String(id).startsWith('pre-')) {
            supabase.from('profiles').delete().eq('id', id);
          }
          if (cleanEmail) {
            supabase.from('profiles').delete().eq('email', cleanEmail);
          }
          supabase.from('profiles').delete().in('cpf', [cleanCpf, formattedCpf]);
        }
        return prev.filter(u => u.id !== id);
      });

      setTimeout(() => fetchUsers(), 500);
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
  const userEmailKey = (currentUser.email || '').toLowerCase().trim();
  const userCpfKey = (currentUser.cpf || '').replace(/\D/g, '');
  const isPasswordAlreadyChangedLocally = (userEmailKey && completedPasswordResets.has(userEmailKey)) || (userCpfKey && completedPasswordResets.has(userCpfKey));

  const targetUserObj = users.find(u => u.id === currentUser.id || u.email?.toLowerCase() === currentUser.email?.toLowerCase());
  const needsPasswordChange = !isPasswordAlreadyChangedLocally && (targetUserObj?.needsPasswordChange === true);

  if (recoverySession || (session && needsPasswordChange)) {
    return <PasswordReset onSuccess={() => {
      setRecoverySession(false);
      if (userEmailKey) setCompletedPasswordResets(prev => new Set(prev).add(userEmailKey));
      if (userCpfKey) setCompletedPasswordResets(prev => new Set(prev).add(userCpfKey));

      setUsers(prev => prev.map(u => (u.id === currentUser.id || u.email?.toLowerCase() === currentUser.email?.toLowerCase()) ? { ...u, needsPasswordChange: false } : u));
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
    return <Login onLoginSuccess={fetchPatients} bgImage={loginBgImage} bgFit={loginBgFit} bgPosition={loginBgPosition} bgOpacity={loginBgOpacity} />;
  }

  return (
    <Dashboard
      user={currentUser}
      patients={patients}
      hospitalName={hospitalName}
      setHospitalName={setHospitalName}
      bgImage={bgImage}
      setBgImage={setBgImage}
      bgFit={bgFit}
      setBgFit={setBgFit}
      bgPosition={bgPosition}
      setBgPosition={setBgPosition}
      bgOpacity={bgOpacity}
      setBgOpacity={setBgOpacity}
      loginBgImage={loginBgImage}
      setLoginBgImage={setLoginBgImage}
      loginBgFit={loginBgFit}
      setLoginBgFit={setLoginBgFit}
      loginBgPosition={loginBgPosition}
      setLoginBgPosition={setLoginBgPosition}
      loginBgOpacity={loginBgOpacity}
      setLoginBgOpacity={setLoginBgOpacity}
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
      activeSectors={activeSectors}
      setActiveSectors={setActiveSectors}
    />
  );
};

export default App;
