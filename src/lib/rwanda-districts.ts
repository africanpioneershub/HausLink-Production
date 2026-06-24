export const RWANDA_DISTRICTS = [
  // Kigali City
  'Gasabo',
  'Kicukiro',
  'Nyarugenge',
  // Northern Province
  'Burera',
  'Gakenke',
  'Gicumbi',
  'Musanze',
  'Rulindo',
  // Southern Province
  'Gisagara',
  'Huye',
  'Kamonyi',
  'Muhanga',
  'Nyamagabe',
  'Nyanza',
  'Nyaruguru',
  'Ruhango',
  // Eastern Province
  'Bugesera',
  'Gatsibo',
  'Kayonza',
  'Kirehe',
  'Ngoma',
  'Nyagatare',
  'Rwamagana',
  // Western Province
  'Karongi',
  'Ngororero',
  'Nyabihu',
  'Nyamasheke',
  'Rubavu',
  'Rusizi',
  'Rutsiro',
] as const;

export type RwandaDistrict = (typeof RWANDA_DISTRICTS)[number];
