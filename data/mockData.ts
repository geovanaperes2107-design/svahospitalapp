
import { Patient, InfectoStatus, AntibioticStatus, TreatmentType, MedicationCategory } from '../types';
import { format, subDays } from 'date-fns';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'OLIVEIRA FERREIRA DA SILVEIRA',
    birthDate: '08/12/1968',
    bed: 'L-01',
    sector: 'UTI',
    diagnosis: 'Paciente com diagnóstico de pnm / dpoc / imunodeprimido.',
    treatmentType: TreatmentType.TERAPEUTICO,
    infectoStatus: InfectoStatus.AUTORIZADO,
    isEvaluated: false,
    history: [],
    antibiotics: [
      {
        id: 'a1',
        // Fix: added missing category property
        category: MedicationCategory.ANTIMICROBIANO,
        name: 'PIPERACILINA + TAZOBACTAM PO P/ SOL INJ 4 + 0,5G',
        dose: '18G',
        frequency: '06/06',
        startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
        durationDays: 7,
        times: ['10:00', '16:00', '22:00', '04:00'],
        status: AntibioticStatus.EM_USO
      }
    ]
  },
  {
    id: '2',
    name: 'MARIA APARECIDA DOS SANTOS',
    birthDate: '15/05/1955',
    bed: 'L-08',
    sector: 'Clínica Médica',
    diagnosis: 'Infecção do Trato Urinário (ITU) complicada.',
    treatmentType: TreatmentType.TERAPEUTICO,
    infectoStatus: InfectoStatus.PENDENTE,
    isEvaluated: false,
    history: [],
    antibiotics: [
      {
        id: 'a2',
        // Fix: added missing category property
        category: MedicationCategory.ANTIMICROBIANO,
        name: 'CEFTRIAXONA PO P/ SOL INJ 1G',
        dose: '2G',
        frequency: '24/24',
        startDate: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        durationDays: 7,
        times: ['10:00'],
        status: AntibioticStatus.EM_USO
      }
    ]
  }
];
