export const getLocalDateISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isValidLocalDateISO = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const getLocalDateTimeInput = (date = new Date()) =>
  `${getLocalDateISO(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const isValidLocalDateTimeInput = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const [date, time] = value.split('T');
  const [hour, minute] = time.split(':').map(Number);
  return isValidLocalDateISO(date) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

export const formatDateEs = (value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
  new Intl.DateTimeFormat('es-AR', options).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export const greetingForHour = (hour: number) => hour >= 5 && hour < 12 ? 'Buenos días' : hour >= 12 && hour < 20 ? 'Buenas tardes' : 'Buenas noches';

export const currentGreeting = (date = new Date()) => greetingForHour(date.getHours());
