export const MODULE_CATALOG = [
  {
    code: 'assets',
    name: 'Assets',
    description: 'Patrimoine, inventaire, maintenance, affectations et donnees financieres.',
    availability: 'available'
  },
  {
    code: 'finance',
    name: 'Finance',
    description: 'Entrees, sorties, rapprochements et suivi financier.',
    availability: 'available'
  },
  {
    code: 'employees',
    name: 'Employees',
    description: 'Personnel, postes, roles et historique RH.',
    availability: 'coming_soon'
  },
  {
    code: 'payroll',
    name: 'Payroll',
    description: 'Contrats, bulletins et operations de paie.',
    availability: 'coming_soon'
  }
] as const;

export const MODULE_CODES = MODULE_CATALOG.map((module) => module.code);
