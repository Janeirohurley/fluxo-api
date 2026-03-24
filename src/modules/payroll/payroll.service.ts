export class PayrollService {
  getOverview() {
    return {
      module: 'payroll',
      description: 'Payroll and payslip module scaffold',
      ready: false,
      extensible: true,
      boundaries: ['contracts', 'pay-slips', 'salary-components']
    };
  }
}
