
import React, { useState, useEffect } from 'react';
import { UserPlus, Plus, Trash2, Calendar, Save, AlertCircle, Clock, Pill, X } from 'lucide-react';
import { Patient, Antibiotic, AntibioticStatus, InfectoStatus, TreatmentType, MedicationCategory } from '../types';
import { SECTORS, MEDICATION_LISTS, FREQUENCY_OPTIONS, DURATION_OPTIONS } from '../constants';
import { calculateEndDate } from '../utils';

interface PatientRegistrationProps {
  onAdd: (patient: Patient) => void;
  onCancel: () => void;
}

const PatientRegistration: React.FC<PatientRegistrationProps> = ({ onAdd, onCancel }) => {
  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem('sva_patient_registration_draft');
    return draft ? JSON.parse(draft).formData : {
      name: '',
      birthDate: '',
      bed: '',
      sector: SECTORS[0],
      diagnosis: '',
      observation: '',
      treatmentType: TreatmentType.TERAPEUTICO,
      numAtb: 1
    };
  });

  const [atbs, setAtbs] = useState<Partial<Antibiotic>[]>(() => {
    const draft = localStorage.getItem('sva_patient_registration_draft');
    return draft ? JSON.parse(draft).atbs : [{
      id: 'atb-init',
      category: MedicationCategory.ANTIMICROBIANO,
      name: '',
      dose: '',
      frequency: '24/24',
      startDate: new Date().toISOString().split('T')[0],
      durationDays: 7,
      status: AntibioticStatus.EM_USO,
      times: ['08:00'],
      route: 'EV'
    }];
  });

  // Salva rascunho automaticamente a cada mudança
  useEffect(() => {
    localStorage.setItem('sva_patient_registration_draft', JSON.stringify({ formData, atbs }));
  }, [formData, atbs]);

  useEffect(() => {
    if (formData.sector === 'Centro Cirúrgico') {
      setAtbs(prevAtbs => prevAtbs.map(atb => ({
        ...atb,
        name: 'CEFAZOLINA PO P/ SOL INJ 1G',
        frequency: 'Dose Única',
        durationDays: 1
      })));
      setFormData(prev => ({ ...prev, treatmentType: TreatmentType.PROFILATICO }));
    }
  }, [formData.sector]);

  const handleNumAtbChange = (val: number) => {
    setFormData({ ...formData, numAtb: val });
    const currentAtbs = [...atbs];
    if (val > currentAtbs.length) {
      for (let i = currentAtbs.length; i < val; i++) {
        currentAtbs.push({
          id: Math.random().toString(),
          category: MedicationCategory.ANTIMICROBIANO,
          name: '',
          dose: '',
          frequency: formData.sector === 'Centro Cirúrgico' ? 'Dose Única' : '08/08',
          startDate: new Date().toISOString().split('T')[0],
          durationDays: formData.sector === 'Centro Cirúrgico' ? 1 : 7,
          status: AntibioticStatus.EM_USO,
          times: ['08:00'],
          route: 'EV'
        });
      }
    } else {
      currentAtbs.splice(val);
    }
    setAtbs(currentAtbs);
  };

  const updateAtb = (index: number, updates: Partial<Antibiotic>) => {
    const newAtbs = [...atbs];
    newAtbs[index] = { ...newAtbs[index], ...updates };
    setAtbs(newAtbs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.birthDate) {
      alert("Nome e Data de Nascimento são obrigatórios!");
      return;
    }

    const invalidAtb = atbs.find(atb => !atb.name);
    if (invalidAtb) {
      alert("Por favor, selecione o nome de todos os medicamentos adicionados.");
      return;
    }

    const newPatient: Patient = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name.toUpperCase(),
      birthDate: formData.birthDate.split('-').reverse().join('/'),
      bed: formData.bed || 'S/L',
      sector: formData.sector,
      diagnosis: formData.diagnosis,
      observation: formData.observation,
      treatmentType: formData.sector === 'Centro Cirúrgico' ? TreatmentType.PROFILATICO : formData.treatmentType,
      infectoStatus: formData.sector === 'Centro Cirúrgico' ? InfectoStatus.AUTORIZADO : InfectoStatus.PENDENTE,
      isEvaluated: false,
      history: [
        {
          date: new Date().toLocaleString('pt-BR'),
          action: 'Cadastro',
          user: 'Sistema',
          details: 'Paciente cadastrado no sistema.'
        },
        ...(formData.observation ? [{
          date: new Date().toLocaleString('pt-BR'),
          action: 'Observação',
          user: 'Sistema',
          details: formData.observation
        }] : [])
      ],
      antibiotics: atbs as Antibiotic[],
      procedureDate: formData.sector === 'Centro Cirúrgico' ? (formData.procedureDate || new Date().toISOString().split('T')[0]) : undefined
    };

    onAdd(newPatient);
    localStorage.removeItem('sva_patient_registration_draft'); // Limpa rascunho ao finalizar
    alert("Paciente cadastrado com sucesso!");
  };

  // Função para limpar o formulário e o rascunho
  const handleClearForm = () => {
    if (confirm("Tem certeza que deseja limpar o formulário? Todos os dados não salvos serão perdidos.")) {
      const initialFormData = {
        name: '',
        birthDate: '',
        bed: '',
        sector: SECTORS[0],
        diagnosis: '',
        observation: '',
        treatmentType: TreatmentType.TERAPEUTICO as TreatmentType,
        numAtb: 1
      };
      const initialAtbs = [{
        id: 'atb-init',
        category: MedicationCategory.ANTIMICROBIANO,
        name: '',
        dose: '',
        frequency: '24/24',
        startDate: new Date().toISOString().split('T')[0],
        durationDays: 7,
        status: AntibioticStatus.EM_USO,
        times: ['08:00'],
        route: 'EV'
      }];
      setFormData(initialFormData);
      setAtbs(initialAtbs);
      localStorage.removeItem('sva_patient_registration_draft');
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e293b] rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-[#1e293b] p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-lg"><UserPlus size={20} /></div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight leading-none">Cadastro de Paciente</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Preencha os campos obrigatórios</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleClearForm} type="button" className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-red-400" title="Limpar Formulário"><Trash2 size={20} /></button>
          <button onClick={onCancel} type="button" className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Nome Completo *</label>
            <input required type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none uppercase shadow-inner text-slate-900 dark:text-white"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do paciente" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Nascimento *</label>
            <input required type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none shadow-inner text-slate-900 dark:text-white"
              value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Leito</label>
            <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none shadow-inner uppercase text-slate-900 dark:text-white"
              value={formData.bed} onChange={e => setFormData({ ...formData, bed: e.target.value })} placeholder="L-01" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Setor / Unidade</label>
            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none shadow-inner appearance-none text-slate-900 dark:text-white"
              value={formData.sector} onChange={e => setFormData({ ...formData, sector: e.target.value })}>
              {SECTORS.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{s}</option>)}
            </select>
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Tipo Internação</label>
            <div className="flex gap-1.5">
              <button type="button" disabled={formData.sector === 'Centro Cirúrgico'} onClick={() => setFormData({ ...formData, treatmentType: TreatmentType.TERAPEUTICO })}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.treatmentType === TreatmentType.TERAPEUTICO ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                Terap.
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, treatmentType: TreatmentType.PROFILATICO })}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase border transition-all ${formData.treatmentType === TreatmentType.PROFILATICO ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                Prof.
              </button>
            </div>
          </div>
          <div className="col-span-1 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Qtd. Medicamentos</label>
            <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none shadow-inner appearance-none text-slate-900 dark:text-white"
              value={formData.numAtb} onChange={e => handleNumAtbChange(parseInt(e.target.value))}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{n} Med{n !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          {formData.sector === 'Centro Cirúrgico' && (
            <div className="col-span-1 space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Data do Procedimento</label>
              <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none shadow-inner text-slate-900 dark:text-white"
                value={formData.procedureDate || new Date().toISOString().split('T')[0]} onChange={e => setFormData({ ...formData, procedureDate: e.target.value })} />
            </div>
          )}
          <div className="col-span-4 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Diagnóstico Principal</label>
            <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none h-20 resize-none leading-relaxed shadow-inner text-slate-900 dark:text-white"
              value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} placeholder="Descreva o quadro clínico e diagnóstico..." />
          </div>
          <div className="col-span-4 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Observações (Opcional)</label>
            <textarea className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/20 focus:border-emerald-500 outline-none h-20 resize-none leading-relaxed shadow-inner text-slate-900 dark:text-white"
              value={formData.observation} onChange={e => setFormData({ ...formData, observation: e.target.value })} placeholder="Informações adicionais..." />
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h3 className="text-sm font-black uppercase text-emerald-600 flex items-center gap-2">
            <Pill size={18} /> Esquema Antimicrobiano
          </h3>

          <div className="space-y-4">
            {atbs.map((atb, idx) => (
              <div key={atb.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative shadow-sm">
                <div className="absolute -top-3 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-md">Medicamento {idx + 1}</div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Nome do ATB</label>
                    <select required className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 shadow-sm text-slate-900 dark:text-white"
                      value={atb.name} onChange={e => updateAtb(idx, { name: e.target.value })}>
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Selecione o medicamento...</option>
                      {atb.category && MEDICATION_LISTS[atb.category].map(a => <option key={a} value={a} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Dose</label>
                    <input required type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 shadow-sm text-slate-900 dark:text-white"
                      value={atb.dose} onChange={e => updateAtb(idx, { dose: e.target.value })} placeholder="Ex: 1g, 500mg" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Freqüência</label>
                    <select disabled={formData.sector === 'Centro Cirúrgico'} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50 shadow-sm text-slate-900 dark:text-white"
                      value={atb.frequency} onChange={e => updateAtb(idx, { frequency: e.target.value })}>
                      {FREQUENCY_OPTIONS.map(f => <option key={f} value={f} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Duração (Dias)</label>
                    <select disabled={formData.sector === 'Centro Cirúrgico'} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none disabled:bg-slate-50 dark:disabled:bg-slate-900/50 shadow-sm text-slate-900 dark:text-white"
                      value={atb.durationDays} onChange={e => updateAtb(idx, { durationDays: e.target.value as any })}>
                      {DURATION_OPTIONS.map(d => <option key={d} value={d} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Via</label>
                    <select required className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-emerald-500 shadow-sm text-slate-900 dark:text-white"
                      value={atb.route} onChange={e => updateAtb(idx, { route: e.target.value })}>
                      <option value="EV" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">EV (Intravenosa)</option>
                      <option value="ORAL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Oral</option>
                      <option value="IM" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">IM (Intramuscular)</option>
                      <option value="SC" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">SC (Subcutânea)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Data de Início</label>
                    <input type="date" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none shadow-sm text-slate-900 dark:text-white"
                      value={atb.startDate} onChange={e => updateAtb(idx, { startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Horários</label>
                    <input type="text" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs outline-none shadow-sm text-slate-900 dark:text-white"
                      value={atb.times?.join(', ')} onChange={e => updateAtb(idx, { times: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '') })} placeholder="Ex: 08:00, 16:00" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-200 transition-all">
            Cancelar
          </button>
          <button type="submit" className="flex-[2] py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all flex items-center justify-center gap-2">
            <Save size={18} /> Finalizar Cadastro
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientRegistration;
