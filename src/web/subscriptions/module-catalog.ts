export const MODULE_CATALOG = [
  {
    code: 'assets',
    name: 'Assets',
    description: 'Patrimoine, inventaire, maintenance, affectations et donnees financieres.'
  },
  {
    code: 'finance',
    name: 'Finance',
    description: 'Entrees, sorties, rapprochements et suivi financier.'
  },
  {
    code: 'employees',
    name: 'Employees',
    description: 'Personnel, postes, roles et historique RH.'
  },
  {
    code: 'payroll',
    name: 'Payroll',
    description: 'Contrats, bulletins et operations de paie.'
  }
] as const;

export const MODULE_CODES = MODULE_CATALOG.map((module) => module.code);
