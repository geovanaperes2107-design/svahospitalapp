
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
  return differenceInDays(today, start) + 1;
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
