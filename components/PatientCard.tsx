
import React, { useState, useEffect } from 'react';
import {
  MoreVertical,
  Edit3,
  History,
  Calendar,
  Activity,
  PlusCircle,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Dna,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Trash2,
  Save,
  GripVertical
} from 'lucide-react';
import { Patient, UserRole, AntibioticStatus, InfectoStatus, Antibiotic, HistoryEntry, TreatmentType, IncisionRelation, MedicationCategory } from '../types';
import { SECTORS, ANTIBIOTICS_LIST, FREQUENCY_OPTIONS, MEDICATION_LISTS } from '../constants';
import { format, differenceInDays, parseISO, startOfDay, addDays } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  role: UserRole;
  activeTab: string;
  onUpdate: (updatedPatient: Patient) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDarkMode: boolean;
  // Drag and Drop props
  onDragStart?: (e: React.DragEvent, patientId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, patientId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  configAtbDayLock?: boolean;
  configAtbDayChangeTime?: string;
  configAtbDayChangeTimeUTI?: string;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, role, activeTab, onUpdate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, isDarkMode, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver, configAtbDayLock, configAtbDayChangeTime, configAtbDayChangeTimeUTI }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSectorMenu, setShowSectorMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  const [editMode, setEditMode] = useState<{
    type: 'editar' | 'troca' | 'novo' | 'tempo',
    atbId?: string,
    oldAtbName?: string
  } | null>(() => {
    const saved = localStorage.getItem(`sva_draft_atb_editmode_${patient.id}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [newAtb, setNewAtb] = useState(() => {
    const saved = localStorage.getItem(`sva_draft_atb_data_${patient.id}`);
    return saved ? JSON.parse(saved) : {
      name: '',
      dose: '',
      freq: '08/08',
      times: '',
      duration: 7,
      start: format(new Date(), 'yyyy-MM-dd'),
      justification: ''
    };
  });

  // Salva rascunhos automáticos
  useEffect(() => {
    localStorage.setItem(`sva_draft_atb_editmode_${patient.id}`, JSON.stringify(editMode));
    localStorage.setItem(`sva_draft_atb_data_${patient.id}`, JSON.stringify(newAtb));
  }, [editMode, newAtb, patient.id]);

  const [tempBed, setTempBed] = useState(patient.bed || ''); // Estado para edição de leito
  const [tempDiagnosis, setTempDiagnosis] = useState(patient.diagnosis || '');
  const [tempPharmacyNote, setTempPharmacyNote] = useState(patient.pharmacyNote || '');
  const [tempPrescriberNotes, setTempPrescriberNotes] = useState(patient.prescriberNotes || '');

  // State for per-antibiotic comments in Infecto panel
  const [atbInfectoComments, setAtbInfectoComments] = useState<Record<string, string>>({});

  // Inicializa o leito temporário ao abrir modal de edição
  useEffect(() => {
    if (editMode?.type === 'editar') {
      setTempBed(patient.bed || '');
      setTempDiagnosis(patient.diagnosis || '');
    }
  }, [editMode, patient.bed, patient.diagnosis]);

  // Sincroniza notas temporárias quando o menu de detalhes é aberto
  useEffect(() => {
    if (showMenu) {
      setTempPharmacyNote(patient.pharmacyNote || '');
      setTempPrescriberNotes(patient.prescriberNotes || '');
    }
  }, [showMenu, patient.pharmacyNote, patient.prescriberNotes]);

  // Initialize antibiotic comments
  useEffect(() => {
    const comments: Record<string, string> = {};
    patient.antibiotics.forEach(a => {
      comments[a.id] = a.infectoComment || '';
    });
    setAtbInfectoComments(comments);
  }, [patient.antibiotics]);

  const isCC = patient.sector === 'Centro Cirúrgico';
  const isInfectoPanel = activeTab === 'infectologia';

  const addHistory = (action: string, details: string) => {
    const entry: HistoryEntry = {
      date: new Date().toLocaleString('pt-BR'),
      action,
      user: role,
      details
    };
    return [entry, ...patient.history];
  };

  const handleSaveAction = () => {
    let updatedPatient = { ...patient };
    let updatedAtbs = [...patient.antibiotics];
    let updateLog = '';

    const getInferredCategory = (name: string): MedicationCategory => {
      if (MEDICATION_LISTS[MedicationCategory.PSICOTROPICO].includes(name)) return MedicationCategory.PSICOTROPICO;
      if (MEDICATION_LISTS[MedicationCategory.BIOLOGICO].includes(name)) return MedicationCategory.BIOLOGICO;
      return MedicationCategory.ANTIMICROBIANO;
    };

    if (editMode?.type === 'novo') {
      const atbObj: Antibiotic = {
        id: 'atb-' + Math.random().toString(36).substr(2, 9),
        category: getInferredCategory(newAtb.name),
        name: newAtb.name,
        dose: newAtb.dose,
        frequency: isCC ? 'Dose Única' : newAtb.freq,
        startDate: newAtb.start,
        durationDays: isCC ? 1 : newAtb.duration,
        times: newAtb.times.split(',').map(t => t.trim()).filter(t => t !== ''),
        status: AntibioticStatus.EM_USO,
        justification: newAtb.justification,
        infectoStatus: InfectoStatus.PENDENTE // New ATBs start as pending
      };
      updatedAtbs.push(atbObj);
      updateLog = `Adicionado ATB: ${newAtb.name}`;
    } else if (editMode?.type === 'troca') {
      updatedAtbs = updatedAtbs.map(a => a.id === editMode.atbId ? { ...a, status: AntibioticStatus.TROCADO } : a);
      const atbObj: Antibiotic = {
        id: 'atb-' + Math.random().toString(36).substr(2, 9),
        category: getInferredCategory(newAtb.name),
        name: newAtb.name,
        dose: newAtb.dose,
        frequency: isCC ? 'Dose Única' : newAtb.freq,
        startDate: newAtb.start,
        durationDays: isCC ? 1 : newAtb.duration,
        times: newAtb.times.split(',').map(t => t.trim()).filter(t => t !== ''),
        status: AntibioticStatus.EM_USO,
        justification: newAtb.justification,
        infectoStatus: InfectoStatus.PENDENTE // New ATBs start as pending
      };
      updatedAtbs.push(atbObj);
      updateLog = `Substituição: ${newAtb.name} substituiu ${editMode.oldAtbName}. Motivo: ${newAtb.justification}`;
    } else if (editMode?.type === 'editar') {
      // If tempBed has changed, update patient bed
      if (tempBed !== patient.bed) {
        updatedPatient.bed = tempBed;
        updateLog = `Leito: ${patient.bed} -> ${tempBed}`;
      }

      // If tempDiagnosis has changed, update patient diagnosis
      if (tempDiagnosis !== patient.diagnosis) {
        updatedPatient.diagnosis = tempDiagnosis;
        const diagLog = `Dx: ${patient.diagnosis} -> ${tempDiagnosis}`;
        updateLog = updateLog ? `${updateLog} | ${diagLog}` : diagLog;
      }

      // If an ATB ID is present, update ATB details
      if (editMode.atbId) {
        const atbToUpdate = updatedAtbs.find(a => a.id === editMode.atbId);
        updatedAtbs = updatedAtbs.map(a => a.id === editMode.atbId ? {
          ...a,
          dose: newAtb.dose,
          frequency: isCC ? 'Dose Única' : newAtb.freq,
          times: newAtb.times.split(',').map(t => t.trim()).filter(t => t !== ''),
          justification: newAtb.justification
        } : a);
        const atbLog = `ATB ${atbToUpdate?.name} editado (Dose/Horário)`;
        updateLog = updateLog ? `${updateLog} | ${atbLog}` : atbLog;
      }
    } else if (editMode?.type === 'tempo') {
      updatedAtbs = updatedAtbs.map(a => a.id === editMode.atbId ? {
        ...a,
        durationDays: isCC ? 1 : newAtb.duration,
        justification: newAtb.justification,
        times: newAtb.times.split(',').map(t => t.trim()).filter(t => t !== '')
      } : a);
      updateLog = `Tempo alterado para ${newAtb.duration} dias. Motivo: ${newAtb.justification}`;
    }

    // Recalculate patient status if necessary
    onUpdate({ ...updatedPatient, antibiotics: updatedAtbs, history: addHistory('Ajuste Dados', updateLog || 'Alteração manual') });
    setEditMode(null);
    setNewAtb({ ...newAtb, justification: '', name: '', times: '' });
    localStorage.removeItem(`sva_draft_atb_editmode_${patient.id}`); // Limpa rascunho
    localStorage.removeItem(`sva_draft_atb_data_${patient.id}`);
  };

  const derivePatientInfectoStatus = (atbs: Antibiotic[]): InfectoStatus => {
    const activeAtbs = atbs.filter(a => a.status === AntibioticStatus.EM_USO);
    if (activeAtbs.length === 0) return InfectoStatus.PENDENTE;

    // If any active ATB is NOT_AUTHORIZED, patient is NOT_AUTHORIZED
    if (activeAtbs.some(a => a.infectoStatus === InfectoStatus.NAO_AUTORIZADO)) {
      return InfectoStatus.NAO_AUTORIZADO;
    }
    // If any active ATB is PENDING (or undefined), patient is PENDING
    if (activeAtbs.some(a => !a.infectoStatus || a.infectoStatus === InfectoStatus.PENDENTE)) {
      return InfectoStatus.PENDENTE;
    }
    // If ALL active ATBs are AUTHORIZED, patient is AUTHORIZED
    if (activeAtbs.every(a => a.infectoStatus === InfectoStatus.AUTORIZADO)) {
      return InfectoStatus.AUTORIZADO;
    }

    return InfectoStatus.PENDENTE;
  };

  const handleInfectoEvaluation = (atbId: string, status: InfectoStatus) => {
    const comment = atbInfectoComments[atbId];
    const updatedAntibiotics = patient.antibiotics.map(a => {
      if (a.id === atbId) {
        return {
          ...a,
          infectoStatus: status,
          infectoComment: comment
        };
      }
      return a;
    });

    const newPatientStatus = derivePatientInfectoStatus(updatedAntibiotics);
    const atbName = patient.antibiotics.find(a => a.id === atbId)?.name || 'Desconhecido';

    onUpdate({
      ...patient,
      antibiotics: updatedAntibiotics,
      infectoStatus: newPatientStatus, // Update top-level status based on aggregate
      history: addHistory('Avaliação Infecto', `ATB: ${atbName} -> Status: ${status}. Parecer: ${comment || 'Sem parecer.'}`)
    });
  };

  const handleIncisionChange = (relation: IncisionRelation) => {
    onUpdate({
      ...patient,
      incisionRelation: relation,
      history: addHistory('CC Registro', `Relação com incisão: ${relation}`)
    });
  };

  const getCardTheme = () => {
    if (patient.isEvaluated) return 'bg-purple-100 border-purple-500 shadow-purple-200';
    if (isCC) return 'bg-slate-50 border-purple-300 shadow-purple-50';
    const activeAtbs = patient.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO);
    if (activeAtbs.length === 0) return 'bg-white border-slate-200';
    const minDaysRemaining = Math.min(...activeAtbs.map(a => {
      const start = startOfDay(parseISO(a.startDate));
      const today = startOfDay(new Date());
      const calculatedDay = differenceInDays(today, start) + 1;
      const currentCycle = calculatedDay + (a.cycleOffset || 0);
      return a.durationDays - currentCycle;
    }));
    if (minDaysRemaining <= 0) return 'bg-red-50 border-red-500 shadow-red-100';
    if (minDaysRemaining > 0 && minDaysRemaining <= 2) return 'bg-amber-50 border-amber-400 shadow-amber-100';
    return 'bg-emerald-50 border-emerald-500 shadow-emerald-100';
  };

  const handleStatusChange = (atbId: string, newStatus: AntibioticStatus) => {
    const updatedAtbs = patient.antibiotics.map(a => a.id === atbId ? { ...a, status: newStatus } : a);
    onUpdate({ ...patient, antibiotics: updatedAtbs, history: addHistory('Status ATB', `ATB ${newStatus}`) });
    setShowStatusMenu(null);
  };

  const antibioticsToDisplay = activeTab === 'finalizados'
    ? patient.antibiotics.filter(a => [AntibioticStatus.FINALIZADO, AntibioticStatus.SUSPENSO, AntibioticStatus.TROCADO, AntibioticStatus.EVADIDO].includes(a.status))
    : patient.antibiotics.filter(a => a.status === AntibioticStatus.EM_USO);

  return (
    <div
      className={`relative rounded-xl mb-3 w-full max-w-5xl mx-auto border transition-all duration-300 shadow-sm text-slate-800 ${getCardTheme()} ${isDragging ? 'opacity-50 scale-[0.98] cursor-grabbing' : 'cursor-grab'} ${isDragOver ? 'border-blue-500 border-2 shadow-lg shadow-blue-200' : ''}`}
      draggable={!isInfectoPanel}
      onDragStart={(e) => onDragStart?.(e, patient.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={(e) => onDrop?.(e, patient.id)}
      onDragEnd={onDragEnd}
    >

      {/* 🔝 HEADER OTIMIZADO */}
      <div className={`px-4 py-3 flex items-start justify-between border-b rounded-t-xl transition-colors ${patient.isEvaluated ? 'border-purple-200 bg-purple-100/50' : 'border-black/5 bg-white/40'}`}>
        <div className="flex gap-4 items-start flex-1 text-left">
          <div className="bg-white px-2 py-1.5 rounded-xl border border-black/5 shadow-sm min-w-[64px] text-center flex items-center gap-1.5">
            {!isInfectoPanel && <GripVertical size={16} className="text-slate-300 -ml-1 cursor-grab active:cursor-grabbing" />}
            <div>
              <span className="text-2xl font-black block leading-none text-slate-800">{patient.bed}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Leito</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-lg font-black uppercase text-slate-800 tracking-tight leading-none truncate">{patient.name}</h3>
            <div className="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 mt-1">
              <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><Calendar size={10} /> {patient.birthDate}</span>
              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                <Activity size={10} /> {isCC ? 'NÃO CIRÚRGICO' : patient.treatmentType}
              </span>
              {!isCC && (
                <span className={`px-1 py-0.5 rounded text-[7px] md:text-[8px] font-black uppercase border ${patient.infectoStatus === InfectoStatus.AUTORIZADO ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  patient.infectoStatus === InfectoStatus.NAO_AUTORIZADO ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                  Inf: {patient.infectoStatus}
                </span>
              )}
            </div>
            {/* DIAGNÓSTICO */}
            <p className="text-[8px] md:text-[9px] font-bold text-slate-500 leading-tight mt-1 italic truncate" title={patient.diagnosis}>
              <span className="font-black text-slate-400 uppercase mr-1 not-italic">Dx:</span> {patient.diagnosis}
            </p>
            {patient.observation && (
              <p className="text-[8px] md:text-[9px] font-bold text-blue-500 leading-tight mt-0.5 italic truncate" title={patient.observation}>
                <span className="font-black text-blue-400 uppercase mr-1 not-italic">Obs:</span> {patient.observation}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isInfectoPanel && (
            <div className="relative">
              <button onClick={() => setShowSectorMenu(!showSectorMenu)} className="px-2 py-1 bg-white rounded-lg border border-slate-200 text-[9px] font-black uppercase flex items-center gap-1 hover:bg-slate-50 text-slate-700">
                {patient.sector} <ChevronDown size={12} />
              </button>
              {showSectorMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white shadow-2xl rounded-2xl p-1.5 z-[100] border border-slate-100 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar">
                  <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-700 mb-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Alterar Setor</p>
                  </div>
                  {SECTORS.map(s => (
                    <button key={s} onClick={() => { onUpdate({ ...patient, sector: s }); setShowSectorMenu(false); }} className={`text-left px-4 py-2.5 text-[11px] font-black uppercase hover:bg-slate-50 rounded-xl transition-colors ${patient.sector === s ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isInfectoPanel && (
            <div className="flex gap-1">
              <button onClick={() => setEditMode({ type: 'editar' })} className="p-2 bg-blue-600 text-white rounded-xl shadow hover:scale-105 transition-all" title="Editar Dados do Paciente">
                <Edit3 size={18} />
              </button>
              <button onClick={() => setEditMode({ type: 'novo' })} className="p-2 bg-emerald-600 text-white rounded-xl shadow hover:scale-105 transition-all" title="Adicionar ATB">
                <PlusCircle size={18} />
              </button>
            </div>
          )}

          <button onClick={() => setShowMenu(!showMenu)} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 transition-colors" title="Ver Detalhes">
            <MoreVertical size={18} />
          </button>

          {/* Botões de mover para cima/baixo */}
          {!isInfectoPanel && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className={`p-1.5 rounded-lg border transition-all ${canMoveUp ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:scale-105' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                title="Mover para cima"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className={`p-1.5 rounded-lg border transition-all ${canMoveDown ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:scale-105' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                title="Mover para baixo"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {!isInfectoPanel && (
            <button
              onClick={() => {
                if (window.confirm(`Deseja realmente excluir o paciente ${patient.name}? Esta ação não pode ser desfeita.`)) {
                  onDelete(patient.id);
                }
              }}
              className="p-2 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
              title="Excluir Paciente"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-2 space-y-2">
        {antibioticsToDisplay.map((atb) => {
          const isUTI = patient.sector?.includes('UTI');
          const changeTime = isUTI ? (configAtbDayChangeTimeUTI || '00:00') : (configAtbDayChangeTime || '00:00');
          const [h, m] = changeTime.split(':').map(Number);

          const shiftDate = (date: Date) => {
            const d = new Date(date);
            d.setHours(h, m, 0, 0);
            return d;
          };

          const now = new Date();
          const automationNow = now.getHours() < h || (now.getHours() === h && now.getMinutes() < m)
            ? addDays(now, -1)
            : now;

          const start = startOfDay(parseISO(atb.startDate));
          const adjustedToday = startOfDay(automationNow);
          const calculatedDay = differenceInDays(adjustedToday, start) + 1;

          let displayDay = calculatedDay + (atb.cycleOffset || 0);

          // Lógica de "pular uma meia-noite" se houve ajuste manual recente
          const todayStr = format(now, 'yyyy-MM-dd');
          const lastAdj = atb.lastAdjustmentDate;
          const shouldLock = configAtbDayLock !== false;

          if (shouldLock && lastAdj === todayStr) {
            // Se ajustou hoje, mantém o valor exato do ajuste até a próxima "virada"
            displayDay = calculatedDay + (atb.cycleOffset || 0);
          }

          const daysRemaining = atb.durationDays - displayDay;
          const isVencido = daysRemaining <= 0;
          const endDate = format(addDays(parseISO(atb.startDate), atb.durationDays), 'dd/MM/yyyy');

          // Infecto status fallback for display
          const atbStatus = atb.infectoStatus || InfectoStatus.PENDENTE;

          return (
            <div key={atb.id} className="rounded-xl p-2 border border-black/5 bg-white/60 hover:bg-white/80 transition-all flex flex-col gap-2 shadow-inner">
              <div className="flex justify-between items-center">
                <div className="text-left flex items-center gap-2.5">
                  <div className="relative">
                    <button
                      disabled={isInfectoPanel}
                      onClick={() => !isInfectoPanel && setShowStatusMenu(showStatusMenu === atb.id ? null : atb.id)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase transition-all shadow-sm ${atb.status === AntibioticStatus.EM_USO ? 'bg-emerald-500 text-white' :
                        atb.status === AntibioticStatus.SUSPENSO ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                        } ${isInfectoPanel ? 'cursor-default' : ''}`}
                    >
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" /> {atb.status} {!isInfectoPanel && '▾'}
                    </button>
                    {showStatusMenu === atb.id && !isInfectoPanel && (
                      <div className="absolute top-full left-0 mt-1 w-32 bg-white shadow-xl rounded-xl p-1 z-[200] border border-slate-100 flex flex-col gap-0.5">
                        <button onClick={() => handleStatusChange(atb.id, AntibioticStatus.SUSPENSO)} className="text-left px-3 py-2 text-[9px] font-black uppercase text-amber-600 hover:bg-amber-50 rounded-lg">Suspender</button>
                        <button onClick={() => handleStatusChange(atb.id, AntibioticStatus.FINALIZADO)} className="text-left px-3 py-2 text-[9px] font-black uppercase text-red-600 hover:bg-red-50 rounded-lg">Finalizar</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{atb.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Hor: <span className="text-slate-700 font-black">{atb.times.join('/')}</span></p>
                  </div>

                  {/* Status do ATB na visão da Infecto */}
                  {isInfectoPanel && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ml-2 ${atbStatus === InfectoStatus.AUTORIZADO ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                      atbStatus === InfectoStatus.NAO_AUTORIZADO ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                      {atbStatus}
                    </span>
                  )}
                </div>

                {/* AÇÕES */}
                {!isInfectoPanel && (
                  <div className="flex gap-1.5">
                    <button onClick={() => { setNewAtb({ ...newAtb, name: atb.name, dose: atb.dose, freq: atb.frequency, times: atb.times.join(', '), duration: atb.durationDays }); setEditMode({ type: 'troca', atbId: atb.id, oldAtbName: atb.name }); }} className="p-1.5 bg-slate-800 text-white rounded-lg shadow hover:scale-105 transition-all border border-slate-700" title="Substituir">
                      <Dna size={14} />
                    </button>
                    {!isCC && (
                      <button onClick={() => { setNewAtb({ ...newAtb, duration: atb.durationDays, times: atb.times.join(', ') }); setEditMode({ type: 'tempo', atbId: atb.id }); }} className="p-1.5 bg-blue-500 dark:bg-blue-600 text-white rounded-lg shadow hover:scale-105 transition-all" title="Alterar Tempo">
                        <Clock size={14} />
                      </button>
                    )}
                    <button onClick={() => { setNewAtb({ ...newAtb, name: atb.name, dose: atb.dose, freq: atb.frequency, times: atb.times.join(', ') }); setEditMode({ type: 'editar', atbId: atb.id }); }} className="p-1.5 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-slate-800 shadow-sm transition-colors" title="Editar">
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* DADOS DE TRATAMENTO */}
              <div className={`grid grid-cols-3 ${isCC ? 'md:grid-cols-5' : 'md:grid-cols-6'} gap-2`}>
                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Início</p>
                  <p className="text-[11px] font-black text-slate-800 leading-none">{atb.startDate.split('-').reverse().join('/')}</p>
                </div>

                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Fim Prev.</p>
                  <p className={`text-[11px] font-black leading-none ${isCC ? 'text-purple-600' : 'text-slate-800'}`}>
                    {isCC ? 'INTRAOP' : endDate}
                  </p>
                </div>

                {isCC ? (
                  <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Freq.</p>
                    <p className="text-[11px] font-black text-slate-800 leading-none uppercase">Dose Única</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                      <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Trat.</p>
                      <p className="text-[11px] font-black text-slate-800 leading-none">{atb.durationDays}D</p>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                      <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Freq.</p>
                      <p className="text-[11px] font-black text-slate-800 leading-none">{atb.frequency}</p>
                    </div>
                  </>
                )}

                {!isCC && (
                  <div className="bg-white p-1.5 rounded-lg shadow-sm border border-black/5 text-center flex flex-col justify-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Venc.</p>
                    <p className={`text-[11px] font-black leading-none ${isVencido ? 'text-red-600' : daysRemaining <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {isVencido ? 'VENCIDO' : `${daysRemaining}D`}
                    </p>
                  </div>
                )}

                <div className="bg-white p-1 rounded-lg shadow-sm border border-black/5 text-center flex flex-col items-center justify-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Dia</p>
                  <input type="number" disabled={isCC || isInfectoPanel} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-[11px] font-black py-0 outline-none focus:border-blue-500 text-slate-800 disabled:opacity-50" value={isCC ? 1 : displayDay} onChange={e => {
                    const newVal = parseInt(e.target.value) || 1;
                    const offset = newVal - calculatedDay;
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    onUpdate({ ...patient, antibiotics: patient.antibiotics.map(a => a.id === atb.id ? { ...a, cycleOffset: offset, lastAdjustmentDate: todayStr } : a) });
                  }} />
                </div>

                {isCC && (
                  <div className="bg-purple-50 p-1 rounded-lg shadow-inner border border-purple-200 text-center flex flex-col justify-center">
                    <p className="text-[7px] font-black text-purple-400 uppercase leading-none mb-1">Incisão</p>
                    <select
                      disabled={isInfectoPanel}
                      className="bg-transparent text-[10px] font-black text-purple-700 outline-none w-full text-center uppercase disabled:opacity-50"
                      value={patient.incisionRelation || ''}
                      onChange={(e) => handleIncisionChange(e.target.value as IncisionRelation)}
                    >
                      <option value="">Sel...</option>
                      <option value={IncisionRelation.BEFORE_60}>Antes</option>
                      <option value={IncisionRelation.AFTER_INCISION}>Após</option>
                      <option value={IncisionRelation.PRE_POST_OP}>Pós-Op</option>
                    </select>
                  </div>
                )}
              </div>

              {/* === ÁREA DE AVALIAÇÃO DA INFECTOLOGIA (POR ANTIBIÓTICO) === */}
              {isInfectoPanel && (
                <div className="mt-2 bg-blue-50/50 rounded-xl p-2 border border-blue-100/50 shadow-inner">
                  <div className="flex gap-3 items-stretch">
                    <div className="flex-1">
                      <label className="text-[8px] font-black uppercase text-blue-500 flex items-center gap-1 mb-1">
                        <MessageSquare size={10} /> Parecer: {atb.name}
                      </label>
                      <textarea
                        className="w-full bg-white p-1.5 rounded-lg text-[10px] font-bold text-slate-600 h-10 border border-blue-100 outline-none focus:ring-1 focus:ring-blue-400 shadow-sm resize-none"
                        value={atbInfectoComments[atb.id] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setAtbInfectoComments(prev => ({ ...prev, [atb.id]: val }));
                        }}
                        placeholder="Justificativa..."
                      />
                    </div>
                    <div className="flex flex-col justify-center gap-1 w-24">
                      <button
                        onClick={() => handleInfectoEvaluation(atb.id, InfectoStatus.AUTORIZADO)}
                        className={`flex items-center justify-center gap-1 py-1.5 text-white rounded font-black uppercase text-[8px] shadow transition-all ${atbStatus === InfectoStatus.AUTORIZADO ? 'bg-emerald-700 ring-2 ring-emerald-300' : 'bg-emerald-500 hover:bg-emerald-600 opacity-90'}`}
                      >
                        <ThumbsUp size={10} /> Autorizar
                      </button>
                      <button
                        onClick={() => handleInfectoEvaluation(atb.id, InfectoStatus.NAO_AUTORIZADO)}
                        className={`flex items-center justify-center gap-1 py-1.5 text-white rounded font-black uppercase text-[8px] shadow transition-all ${atbStatus === InfectoStatus.NAO_AUTORIZADO ? 'bg-red-700 ring-2 ring-red-300' : 'bg-red-500 hover:bg-red-600 opacity-90'}`}
                      >
                        <ThumbsDown size={10} /> Não
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}

        <div className="flex justify-end pt-1">
          <button onClick={() => onUpdate({ ...patient, isEvaluated: !patient.isEvaluated })} className={`px-4 py-1 rounded-full font-black uppercase text-[9px] shadow transition-all ${patient.isEvaluated ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
            {patient.isEvaluated ? '✓ AVALIADO' : 'MARCAR COMO AVALIADO'}
          </button>
        </div>

        {showMenu && (
          <div className="mt-6 space-y-6 animate-in slide-in-from-top-3 duration-300 text-left border-t border-black/5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 p-6 border border-black/5 shadow-sm rounded-2xl space-y-4">
                <label className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><MessageSquare size={18} className="text-blue-500" /> Notas da Farmácia</label>
                <textarea className="w-full bg-slate-50 p-4 rounded-xl text-sm font-bold text-slate-600 h-28 border-0 outline-none focus:ring-2 focus:ring-blue-100 placeholder:opacity-50" value={tempPharmacyNote} onChange={e => setTempPharmacyNote(e.target.value)} placeholder="Observações da farmácia..." />
                <button
                  onClick={() => {
                    onUpdate({ ...patient, pharmacyNote: '', history: addHistory('Nota Farmácia', tempPharmacyNote || 'Nota vazia') });
                    setTempPharmacyNote('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow hover:bg-blue-700 transition-all"
                >
                  <Save size={14} /> Salvar
                </button>
              </div>
              <div className="bg-white/80 p-6 border border-black/5 shadow-sm rounded-2xl space-y-4">
                <label className="text-sm font-black uppercase text-emerald-500">Notas da Assistência</label>
                <textarea className="w-full bg-slate-50 p-4 rounded-xl text-sm font-bold text-slate-600 h-28 border-0 outline-none focus:ring-2 focus:ring-emerald-100 placeholder:opacity-50" value={tempPrescriberNotes} onChange={e => setTempPrescriberNotes(e.target.value)} placeholder="Evolução clínica / Conduta..." />
                <button
                  onClick={() => {
                    onUpdate({ ...patient, prescriberNotes: tempPrescriberNotes, history: addHistory('Nota Assistência', tempPrescriberNotes || 'Nota vazia') });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow hover:bg-emerald-700 transition-all"
                >
                  <Save size={14} /> Salvar
                </button>
              </div>
              <div className="bg-white/80 p-6 border border-black/5 shadow-sm rounded-2xl space-y-4">
                <label className="text-sm font-black uppercase text-orange-500 flex items-center gap-2"><ShieldCheck size={18} /> Parecer Infectologia (Geral)</label>
                <div className="w-full bg-slate-50 p-4 rounded-xl text-sm font-bold text-slate-400 h-28 border-0 overflow-y-auto">
                  {/* Shows aggregate of comments if needed, or just keep as is for historical/general comments */}
                  {patient.infectoComment || 'Nenhum parecer geral registrado.'}
                  {patient.antibiotics.map(a => a.infectoComment ? <div key={a.id} className="mt-2 pt-2 border-t border-slate-200"><span className="text-slate-800 uppercase text-[10px]">{a.name}:</span> {a.infectoComment}</div> : null)}
                </div>
              </div>
              {isCC && (
                <div className="bg-white/80 p-6 border border-black/5 shadow-sm rounded-2xl space-y-4">
                  <label className="text-sm font-black uppercase text-purple-600 flex items-center gap-2"><Clock size={18} /> Detalhes Cirúrgicos</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Proc.</p>
                      <input type="date" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border-0 outline-none focus:ring-2 focus:ring-purple-100 text-slate-800" value={patient.procedureDate || ''} onChange={e => onUpdate({ ...patient, procedureDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo Op.</p>
                      <input type="text" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-sm border-0 outline-none focus:ring-2 focus:ring-purple-100 text-slate-800" value={patient.operativeTime || ''} onChange={e => onUpdate({ ...patient, operativeTime: e.target.value })} placeholder="Ex: 2h 30min" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-slate-900 text-white/50 rounded-[32px] p-8 shadow-inner space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-white">Histórico Completo</h4>
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {patient.history.length > 0 ? patient.history.map((h, i) => (
                  <div key={i} className="flex justify-between items-start text-xs border-b border-white/5 pb-3 last:border-0">
                    <div className="text-left pr-6">
                      <span className="text-white font-black uppercase block">{h.action}</span>
                      <span className="font-medium italic text-slate-400">{h.details}</span>
                    </div>
                    <span className="text-[10px] font-bold shrink-0 text-slate-500 mt-1">{h.date}</span>
                  </div>
                )) : <p className="text-sm italic">Sem registros de histórico.</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {editMode && !isInfectoPanel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[8000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl p-5 space-y-4 text-left border-t-4 border-blue-600">
            <h3 className="text-lg font-black uppercase tracking-tight pb-2 border-b dark:border-slate-800 dark:text-white">
              {editMode.type === 'novo' ? 'Novo Tratamento' : editMode.type === 'troca' ? '🧬 Substituir ATB' : editMode.type === 'tempo' ? 'Duração e Horário' : 'Ajustar Dados'}
            </h3>

            <div className="space-y-3">
              {editMode.type !== 'tempo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="md:col-span-2 space-y-0.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
                      {editMode.type === 'editar' ? 'Dados do Paciente' : 'Medicamento'}
                    </label>
                    {editMode.type === 'editar' ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="w-1/4">
                            <label className="text-[8px] font-black uppercase text-slate-400">Leito</label>
                            <input
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 uppercase text-slate-900 dark:text-white"
                              value={tempBed}
                              onChange={e => setTempBed(e.target.value)}
                              placeholder="Leito"
                            />
                          </div>
                          <div className="w-3/4">
                            <label className="text-[8px] font-black uppercase text-slate-400">Paciente (Ref. Apenas)</label>
                            <input
                              disabled
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-[10px] outline-none text-slate-400 uppercase"
                              value={patient.name}
                            />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-black uppercase text-slate-400">Diagnóstico Principal</label>
                          <textarea
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white h-16 resize-none"
                            value={tempDiagnosis}
                            onChange={e => setTempDiagnosis(e.target.value)}
                            placeholder="Descreva o quadro clínico..."
                          />
                        </div>
                        {editMode.atbId && (
                          <div className="pt-2 border-t dark:border-slate-800">
                            <label className="text-[9px] font-black uppercase text-blue-500">Editando ATB: {newAtb.name}</label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" value={newAtb.name} onChange={e => setNewAtb({ ...newAtb, name: e.target.value })}>
                        <option value="" className="bg-white dark:bg-slate-800">Selecione um ATB...</option>
                        {ANTIBIOTICS_LIST.map(a => <option key={a} value={a} className="bg-white dark:bg-slate-800">{a}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Dose</label>
                    <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" value={newAtb.dose} onChange={e => setNewAtb({ ...newAtb, dose: e.target.value })} placeholder="Ex: 1G" />
                  </div>
                  {!isCC && (
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Frequência</label>
                      <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" value={newAtb.freq} onChange={e => setNewAtb({ ...newAtb, freq: e.target.value })}>
                        {FREQUENCY_OPTIONS.map(f => <option key={f} value={f} className="bg-white dark:bg-slate-800">{f}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Horários (Separar por vírgula)</label>
                <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" value={newAtb.times} onChange={e => setNewAtb({ ...newAtb, times: e.target.value })} placeholder="Ex: 10:00, 16:00..." />
              </div>

              {!isCC && (editMode.type === 'tempo' || editMode.type === 'novo' || editMode.type === 'troca') && (
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Duração Total (Dias)</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl font-bold text-xs outline-none focus:border-blue-500 text-slate-900 dark:text-white" value={newAtb.duration} onChange={e => setNewAtb({ ...newAtb, duration: parseInt(e.target.value) || 1 })} />
                </div>
              )}

              {(editMode.type === 'tempo' || editMode.type === 'troca') && (
                <div className="space-y-0.5">
                  <label className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 flex items-center gap-2">Justificativa Clínica *</label>
                  <textarea required className="w-full bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-2 rounded-xl font-bold text-xs outline-none focus:border-red-400 text-slate-900 dark:text-white h-20" value={newAtb.justification} onChange={e => setNewAtb({ ...newAtb, justification: e.target.value })} placeholder="Descreva o motivo técnico..." />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setEditMode(null); localStorage.removeItem(`sva_draft_atb_editmode_${patient.id}`); localStorage.removeItem(`sva_draft_atb_data_${patient.id}`); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-black uppercase text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Descartar</button>
              <button
                disabled={(editMode.type === 'tempo' || editMode.type === 'troca') && !newAtb.justification.trim()}
                onClick={handleSaveAction}
                className="flex-[2] py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] shadow-lg disabled:opacity-30 hover:bg-black dark:hover:bg-slate-100 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
