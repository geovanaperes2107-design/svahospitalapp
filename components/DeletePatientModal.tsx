import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { Patient } from '../types';

interface DeletePatientModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (patientId: string, justification: string) => void;
  userName?: string;
}

const DeletePatientModal: React.FC<DeletePatientModalProps> = ({
  patient,
  isOpen,
  onClose,
  onConfirmDelete,
  userName
}) => {
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim() || justification.trim().length < 3) return;

    setIsSubmitting(true);
    try {
      onConfirmDelete(patient.id, justification.trim());
      setJustification('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = justification.trim().length >= 3;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-red-200 dark:border-red-950 text-left animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-600 p-5 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">
              <ShieldAlert size={28} className="text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight leading-none">
                Confirmação de Exclusão
              </h3>
              <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest mt-1">
                Trave de Segurança do Banco de Dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Patient Card Preview */}
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                Paciente a ser removido
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                Leito: {patient.bed || 'S/L'}
              </span>
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
              {patient.name}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-600 dark:text-slate-400">
              <span>Setor: <strong className="text-slate-800 dark:text-slate-200">{patient.sector}</strong></span>
              {patient.diagnosis && (
                <span className="truncate max-w-[260px]">Dx: <strong className="text-slate-800 dark:text-slate-200">{patient.diagnosis}</strong></span>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs font-bold leading-relaxed">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div>
              Esta ação excluirá permanentemente os registros do paciente e histórico de antibióticos do banco de dados.
            </div>
          </div>

          {/* Justification Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Motivo / Justificativa da Exclusão <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Mínimo 3 caracteres</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-red-500 dark:focus:border-red-500 rounded-2xl p-3 text-sm font-bold outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 resize-none shadow-inner"
              placeholder="Ex: Paciente recebeu alta hospitalar / Cadastrado em duplicidade / Transferência..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              autoFocus
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg flex items-center gap-2 transition-all ${
                isValid && !isSubmitting
                  ? 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/30 cursor-pointer active:scale-95'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Trash2 size={16} />
              {isSubmitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeletePatientModal;
