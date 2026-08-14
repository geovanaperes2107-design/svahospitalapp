
import { differenceInDays, addDays, parseISO, format, startOfDay } from 'date-fns';

export const getTodayISO = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentYearMonth = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const parseAnyDate = (dateInput?: string | Date | null): Date => {
  if (!dateInput) return startOfDay(new Date());
  if (dateInput instanceof Date) return startOfDay(dateInput);

  const trimmed = String(dateInput).trim();
  if (!trimmed) return startOfDay(new Date());

  // If DD/MM/YYYY format (e.g. 03/08/2026)
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }

  // If YYYY-MM-DD format or ISO timestamp (e.g. 2026-08-03 or 2026-08-03T00:00:00.000Z)
  if (trimmed.includes('-')) {
    const datePart = trimmed.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }

  const parsed = parseISO(trimmed);
  return isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
};

export const formatDateBR = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  const d = parseAnyDate(dateInput);
  return format(d, 'dd/MM/yyyy');
};

export const formatDateISO = (dateInput?: string | Date | null): string => {
  if (!dateInput) return getTodayISO();
  const d = parseAnyDate(dateInput);
  return format(d, 'yyyy-MM-dd');
};

export const calculateEndDate = (startDate: string, duration: string | number): string => {
  const days = typeof duration === 'number' ? duration : parseInt(duration);
  const startDateObj = parseAnyDate(startDate);
  return format(addDays(startDateObj, isNaN(days) ? 1 : days), 'dd/MM/yyyy');
};

export const getDaysRemaining = (endDate: string): number => {
  const today = startOfDay(new Date());
  const end = startOfDay(parseAnyDate(endDate));
  return differenceInDays(end, today);
};

export const isD0Frequency = (frequency?: string): boolean => {
  if (!frequency) return false;
  const f = frequency.toUpperCase().replace(/\s+/g, '');

  if (f.includes('24') || f.includes('48') || f.includes('DOSE') || f.includes('1X')) {
    return false;
  }

  const d0Patterns = [
    '12/12', '12-12', '12EM12', '12H',
    '8/8', '08/08', '8-8', '08-08', '8EM8', '08EM08', '8H',
    '6/6', '06/06', '6-6', '06-06', '6EM6', '06EM06', '6H',
    '4/4', '04/04', '4-4', '04-04', '4EM4', '04EM04', '4H'
  ];

  return d0Patterns.some(pattern => f.includes(pattern));
};

export const getATBDay = (startDate: string, frequency?: string): number => {
  const today = startOfDay(new Date());
  const start = startOfDay(parseAnyDate(startDate));
  const diff = differenceInDays(today, start);

  if (isD0Frequency(frequency)) {
    return Math.max(0, diff);
  } else {
    return Math.max(1, diff + 1);
  }
};

export const isAtbVencido = (a: { status: string; startDate: string; durationDays: number | string; frequency?: string }): boolean => {
  if (a.status !== 'EM_USO' && a.status !== 'Em Uso') return false;
  const daysRem = getDaysRemaining(calculateEndDate(a.startDate, a.durationDays));
  const currentDay = getATBDay(a.startDate, a.frequency);
  const dur = typeof a.durationDays === 'number' ? a.durationDays : parseInt(String(a.durationDays), 10);
  return daysRem <= 0 || (dur > 0 && currentDay > dur);
};

export const getStatusColor = (daysRemaining: number) => {
  if (daysRemaining > 2) return 'bg-emerald-500';
  if (daysRemaining > 0 && daysRemaining <= 2) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const getStatusText = (daysRemaining: number) => {
  if (daysRemaining > 2) return 'Normal';
  if (daysRemaining > 0) return `Faltam ${daysRemaining} dias`;
  if (daysRemaining === 0) return 'Vence hoje';
  return `Vencido há ${Math.abs(daysRemaining)} dias`;
};

export const safeJsonParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (e) {
    console.error('Error parsing JSON from storage:', e);
    return fallback;
  }
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isValidUUID = (uuid?: string): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
