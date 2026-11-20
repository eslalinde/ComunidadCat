export interface CarismaOption {
  value: number;
  label: string;
}

export const CARISMA_OPTIONS: CarismaOption[] = [
  { value: 1, label: 'Matrimonio' },
  { value: 2, label: 'Soltero/a' },
  { value: 3, label: 'Presbítero' },
  { value: 4, label: 'Seminarista' },
  { value: 5, label: 'Diácono' },
  { value: 6, label: 'Monja' },
  { value: 7, label: 'Viudo/a' },
];

/** Person types that cannot be married (should not be merged with spouse) */
export const NON_MARRIAGE_TYPE_IDS = [3, 4, 5, 6];

/** Person types that require a location (country/city where they are) */
export const LOCATION_TYPE_IDS = [3, 4, 6]; // Presbítero, Seminarista, Monja

export function getCarismaLabel(personTypeId?: number): string {
  if (!personTypeId) return '';
  return CARISMA_OPTIONS.find(opt => opt.value === personTypeId)?.label || '';
}

/** Whether a person needs location fields (country/city) based on their type or itinerante status */
export function needsLocationFields(personTypeId?: number | null, isItinerante?: boolean): boolean {
  if (isItinerante) return true;
  if (personTypeId != null && LOCATION_TYPE_IDS.includes(personTypeId)) return true;
  return false;
}

/** Badge color classes by carisma label, for use in UI components */
export const CARISMA_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Presbítero': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'Itinerante': { bg: 'bg-teal-100', text: 'text-teal-800' },
  'Seminarista': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Diácono': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'Monja': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  'Viudo/a': { bg: 'bg-slate-100', text: 'text-slate-800' },
  'Soltero/a': { bg: 'bg-muted', text: 'text-foreground' },
  'Matrimonio': { bg: 'bg-pink-100', text: 'text-pink-800' },
};

/** Order for grouping brothers by carisma in BrothersList (lower = first) */
export const CARISMA_GROUP_ORDER: Record<string, number> = {
  'Matrimonio': 0,
  'Presbítero': 1,
  'Diácono': 2,
  'Seminarista': 3,
  'Monja': 4,
  'Viudo/a': 5,
  'Soltero/a': 6,
  '': 7,
};
