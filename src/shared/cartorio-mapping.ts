export const CNS_BY_OFICIO: Record<string, string> = {
  '6': '110742',
  '9': '163659',
  '12': '110064',
  '13': '109736',
  '14': '110635',
  '15': '110072',
};

export const OFICIO_BY_CNS: Record<string, string> = Object.keys(CNS_BY_OFICIO).reduce(
  (acc, oficio) => {
    acc[CNS_BY_OFICIO[oficio]] = oficio;
    return acc;
  },
  {} as Record<string, string>,
);

export function resolveOficioFromCns(value: string): string {
  const digits = String(value || '').replace(/\D+/g, '').slice(0, 6);
  return OFICIO_BY_CNS[digits] || '';
}
