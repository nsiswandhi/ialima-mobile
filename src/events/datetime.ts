// Event date/times are canonically WIB (GMT+7), independent of the device's
// timezone. Stored values are Unix epoch seconds (UTC); these helpers convert
// to/from WIB wall-clock so the app shows and captures the same time everywhere.

export const WIB_OFFSET_SEC = 7 * 3600;

export const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export type WibParts = {
  year: number; month: number; day: number; weekday: number; hour: number; minute: number;
};

// Break a stored UTC-epoch timestamp into WIB wall-clock parts.
export function wibParts(ts: number): WibParts {
  const d = new Date((ts + WIB_OFFSET_SEC) * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

export function wibTime(ts: number) {
  const p = wibParts(ts);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function wibDateTime(ts: number) {
  const p = wibParts(ts);
  return `${pad2(p.day)} ${BULAN[p.month]} ${p.year}, ${pad2(p.hour)}:${pad2(p.minute)} WIB`;
}

// A local-tz Date whose wall-clock equals ts's WIB wall-clock, so a native date
// picker (which renders in device tz) displays the WIB numbers.
export function tsToWibLocalDate(ts: number) {
  const p = wibParts(ts);
  return new Date(p.year, p.month, p.day, p.hour, p.minute, 0);
}

// Interpret a local-tz Date's wall-clock as WIB, returning the stored UTC epoch.
export function wibLocalDateToTs(local: Date) {
  return (
    Math.floor(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), local.getHours(), local.getMinutes(), 0) / 1000) -
    WIB_OFFSET_SEC
  );
}
