const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
export function kstDate(value: Date = new Date()): string { return formatter.format(value); }
export function addKstDays(value: Date, days: number): string { const noonUtc = new Date(`${kstDate(value)}T03:00:00.000Z`); noonUtc.setUTCDate(noonUtc.getUTCDate() + days); return kstDate(noonUtc); }
