
import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, Info, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Patient, Antibiotic, AntibioticStatus, InfectoStatus, TreatmentType, MedicationCategory, HistoryEntry } from '../types';
import { SECTORS } from '../constants';

interface BulkImportProps {
    onImport: (patients: Patient[]) => void;
    onCancel: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ onImport, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<Patient[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setError('Por favor, selecione um arquivo CSV.');
                return;
            }
            setFile(selectedFile);
            setError(null);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split(/\r?\n/);
            const patients: Patient[] = [];

            // Skip header if it exists (assuming first row is header)
            // Check if first row contains column names
            const startIdx = lines[0].toLowerCase().includes('nome') ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Detect delimiter (semicolon is common in BR locales)
                const delimiter = line.includes(';') ? ';' : ',';
                const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

                if (cols.length < 10) continue;

                const [name, birthDate, bed, sector, diagnosis, atbName, dose, frequency, startDate, duration] = cols;

                // Validate sector
                const validSector = SECTORS.includes(sector) ? sector : SECTORS[0];

                const newPatient: Patient = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: name.toUpperCase(),
                    birthDate: birthDate, // Expecting DD/MM/YYYY
                    bed: bed || 'S/L',
                    sector: validSector,
                    diagnosis: diagnosis,
                    treatmentType: validSector === 'Centro Cirúrgico' ? TreatmentType.PROFILATICO : TreatmentType.TERAPEUTICO,
                    infectoStatus: validSector === 'Centro Cirúrgico' ? InfectoStatus.AUTORIZADO : InfectoStatus.PENDENTE,
                    isEvaluated: false,
                    history: [{
                        date: new Date().toLocaleString('pt-BR'),
                        action: 'Importação',
                        user: 'Sistema',
                        details: 'Paciente importado via planilha CSV.'
                    }],
                    antibiotics: [{
                        id: Math.random().toString(36).substr(2, 9),
                        category: MedicationCategory.ANTIMICROBIANO,
                        name: atbName.toUpperCase(),
                        dose: dose,
                        frequency: frequency,
                        startDate: startDate.includes('/') ? startDate.split('/').reverse().join('-') : startDate, // Convert DD/MM/YYYY to YYYY-MM-DD
                        durationDays: parseInt(duration) || 7,
                        status: AntibioticStatus.EM_USO,
                        times: ['08:00'],
                        route: 'EV'
                    }]
                };

                patients.push(newPatient);
            }

            if (patients.length === 0) {
                setError('Nenhum dado válido encontrado no arquivo.');
            } else {
                setPreviewData(patients);
            }
        };
        reader.onerror = () => setError('Erro ao ler o arquivo.');
        reader.readAsText(file);
    };

    const handleRemove = (id: string) => {
        setPreviewData(prev => prev.filter(p => p.id !== id));
    };

    const handleConfirm = () => {
        if (previewData.length > 0) {
            onImport(previewData);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-[#1e293b] p-6 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500 rounded-xl shadow-lg">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-black uppercase tracking-tight leading-none">Importação em Massa</h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 text-left">Carregar pacientes via planilha CSV</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-all group"
                        >
                            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all">
                                <Upload size={48} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Clique ou arraste um arquivo CSV</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Formato suportado: .csv</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-2 rounded-xl">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase">{file.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewData.length} registros encontrados</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setFile(null); setPreviewData([]); setError(null); }}
                                    className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                >
                                    Trocar Arquivo
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                                    <AlertCircle size={20} />
                                    <p className="text-xs font-bold uppercase">{error}</p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-left">Pré-visualização</h3>
                                <div className="space-y-2">
                                    {previewData.map((p, idx) => (
                                        <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group">
                                            <div className="flex items-center gap-4 flex-1">
                                                <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                                                <div className="text-left">
                                                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{p.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{p.sector} • Leito {p.bed}</p>
                                                </div>
                                                <div className="hidden md:flex flex-col border-l border-slate-100 dark:border-slate-700 pl-4 ml-4 text-left">
                                                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Medicamento</p>
                                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[150px]">{p.antibiotics[0].name}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemove(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl flex gap-4 text-left">
                        <div className="text-blue-500 pt-0.5"><Info size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-tight">Dica de Formatação</p>
                            <p className="text-[10px] font-bold text-blue-600/80 dark:text-blue-400/80 leading-relaxed uppercase mt-1">
                                A planilha deve conter 10 colunas na ordem: Nome, Nascimento, Leito, Setor, Diagnóstico, Medicamento, Dose, Frequência, Data Início, Duração.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl font-black text-[11px] uppercase hover:bg-slate-100 dark:hover:bg-black transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        disabled={previewData.length === 0}
                        onClick={handleConfirm}
                        className="flex-[2] py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[11px] uppercase shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black dark:hover:bg-slate-200"
                    >
                        <CheckCircle2 size={18} /> Confirmar Importação ({previewData.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImport;
