
import { differenceInDays, addDays, parseISO, format, startOfDay } from 'date-fns';

export const calculateEndDate = (startDate: string, duration: string | number): string => {
  const days = typeof duration === 'number' ? duration : parseInt(duration);
  return format(addDays(parseISO(startDate), isNaN(days) ? 1 : days), 'yyyy-MM-dd');
};

export const getDaysRemaining = (endDate: string): number => {
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(endDate));
  return differenceInDays(end, today);
};

export const getATBDay = (startDate: string): number => {
  const today = startOfDay(new Date());
  const start = startOfDay(parseISO(startDate));
  return Math.max(0, differenceInDays(today, start));
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
