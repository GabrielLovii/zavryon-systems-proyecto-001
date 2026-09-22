export const getLocalDateISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateEs = (value: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) =>
  new Intl.DateTimeFormat('es-ES', options).format(new Date(`${value.slice(0, 10)}T00:00:00`));

export const greetingForHour = (hour: number) => hour >= 5 && hour < 12 ? 'Buenos días' : hour >= 12 && hour < 20 ? 'Buenas tardes' : 'Buenas noches';

export const currentGreeting = (date = new Date()) => greetingForHour(date.getHours());
