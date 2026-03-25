export function getPayrollModuleDocumentation() {
  return {
    module: 'payroll',
    version: '1.0.0',
    basePath: '/api/payroll',
    description:
      'Payroll module for payslips, payroll lines and contract-based payroll processing in tenant databases.',
    storage: {
      default: 'prisma',
      fallback: 'memory',
      overrideEnv: 'PAYROLL_STORAGE=memory'
    },
    authentication: {
      type: 'apiKey',
      headers: ['x-module-key', 'x-api-key', 'Authorization: Bearer <key>'],
      requiredPlanModules: ['payroll']
    },
    routes: [
      { method: 'GET', path: '/api/payroll/docs', description: 'Returns this module documentation' },
      { method: 'GET', path: '/api/payroll', description: 'Returns payroll module overview' },
      { method: 'GET', path: '/api/payroll/contracts', description: 'Lists payroll-ready employee contracts' },
      { method: 'GET', path: '/api/payroll/contracts/:id', description: 'Returns one payroll contract' },
      { method: 'GET', path: '/api/payroll/payslips', description: 'Lists payslips with pagination and filters' },
      { method: 'POST', path: '/api/payroll/payslips/generate', description: 'Generates draft payslips in batch for active contracts over a pay period' },
      { method: 'POST', path: '/api/payroll/payslips', description: 'Creates a draft payslip from a contract' },
      { method: 'GET', path: '/api/payroll/payslips/:id', description: 'Returns one payslip with its lines' },
      { method: 'PATCH', path: '/api/payroll/payslips/:id', description: 'Updates a draft payslip' },
      { method: 'DELETE', path: '/api/payroll/payslips/:id', description: 'Deletes a draft payslip with no linked accounting activity' },
      { method: 'POST', path: '/api/payroll/payslips/:id/issue', description: 'Issues a draft payslip' },
      { method: 'POST', path: '/api/payroll/payslips/:id/mark-paid', description: 'Marks an issued payslip as paid' },
      { method: 'POST', path: '/api/payroll/payslips/:id/journal-entry', description: 'Creates a linked finance journal entry for the payslip' },
      { method: 'POST', path: '/api/payroll/payslips/:id/register-payment', description: 'Registers a linked finance payment transaction for the payslip' }
    ],
    samplePayloads: {
      generatePayRun: {
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        paymentDate: '2026-03-31',
        earningLabel: 'Base salary',
        skipExisting: true
      },
      createPaySlip: {
        employeeId: '11111111-1111-4111-8111-111111111111',
        contractId: '22222222-2222-4222-8222-222222222222',
        payPeriodStart: '2026-03-01',
        payPeriodEnd: '2026-03-31',
        paymentDate: '2026-03-31',
        currency: 'BIF',
        notes: 'March 2026 payroll',
        lines: [
          {
            lineType: 'earning',
            label: 'Base salary',
            amount: 1500000
          },
          {
            lineType: 'tax',
            label: 'PAYE',
            amount: 120000
          }
        ]
      },
      markPaid: {
        paymentDate: '2026-03-31'
      },
      createJournalEntry: {
        expenseAccountId: '33333333-3333-4333-8333-333333333333',
        payrollPayableAccountId: '44444444-4444-4444-8444-444444444444',
        deductionsPayableAccountId: '55555555-5555-4555-8555-555555555555',
        entryDate: '2026-03-31',
        status: 'draft'
      },
      registerPayment: {
        transactionTypeId: '66666666-6666-4666-8666-666666666666',
        paymentMethodId: '77777777-7777-4777-8777-777777777777',
        transactionDate: '2026-03-31',
        referenceNumber: 'PAY-2026-03-EMP-001'
      }
    }
  };
}
