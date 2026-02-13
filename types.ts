
export enum UserRole {
  INFECTOLOGIA = 'INFECTOLOGIA',
  CONTROLE_INFECCAO = 'CONTROLE DE INFECÇÃO',
  FARMACIA = 'FARMÁCIA',
  COLABORADOR = 'COLABORADOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
  VISUALIZADOR = 'VISUALIZADOR'
}

export enum MedicationCategory {
  ANTIMICROBIANO = 'Antimicrobiano',
  PSICOTROPICO = 'Psicotrópico',
  BIOLOGICO = 'Biológico',
  ANTIFUNGICO = 'Antifúngico',
  ANTIVIRAL = 'Antiviral'
}

export enum AntibioticStatus {
  EM_USO = 'Em uso',
  SUSPENSO = 'Suspenso',
  FINALIZADO = 'Finalizado',
  TROCADO = 'Trocado',
  EVADIDO = 'Evadido',
  OBITO = 'ÓBITO'
}

export enum InfectoStatus {
  PENDENTE = 'Pendente',
  AUTORIZADO = 'Autorizado',
  NAO_AUTORIZADO = 'Não autorizado'
}

export enum TreatmentType {
  TERAPEUTICO = 'Terapêutico',
  PROFILATICO = 'Profilático'
}

export enum IncisionRelation {
  BEFORE_60 = 'Antes da Incisão',
  AFTER_INCISION = 'Após a Incisão',
  PRE_POST_OP = 'Antes do pós-operatório'
}

export interface HistoryEntry {
  date: string;
  action: string;
  user: string;
  details: string;
}

export interface Antibiotic {
  id: string;
  category: MedicationCategory;
  name: string;
  dose: string;
  frequency: string;
  startDate: string;
  durationDays: string | number;
  cycleOffset?: number;
  lastAdjustmentDate?: string;
  times: string[];
  status: AntibioticStatus;
  swapReason?: string;
  suspendedAt?: string;
  route?: string;
  justification?: string;
  infectoStatus?: InfectoStatus;
  infectoComment?: string;
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  bed: string;
  sector: string;
  diagnosis: string;
  treatmentType: TreatmentType;
  infectoStatus: InfectoStatus;
  infectoComment?: string;
  pharmacyNote?: string;
  prescriberNotes?: string;
  incisionRelation?: IncisionRelation;
  procedureDate?: string;
  operativeTime?: string;
  antibiotics: Antibiotic[];
  isEvaluated: boolean;
  lastEvaluationDate?: string;
  observation?: string;
  history: HistoryEntry[];
  order?: number;
}

export interface User {
  id: string;
  name: string;
  sector: string;
  birthDate: string;
  mobile: string;
  cpf: string;
  email: string;
  matricula?: string;
  role: UserRole;
  password: string;
  needsPasswordChange: boolean;
  photoURL?: string;
}
