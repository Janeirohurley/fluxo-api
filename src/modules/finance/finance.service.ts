export class FinanceService {
  getOverview() {
    return {
      module: 'finance',
      description: 'Cash-flow, income and expense tracking module scaffold',
      ready: false,
      extensible: true,
      boundaries: ['transactions', 'accounts', 'journal-entries', 'reconciliations']
    };
  }
}
