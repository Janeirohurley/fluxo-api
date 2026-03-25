import { Router } from 'express';

import { type PayrollController } from './payroll.controller';

export function createPayrollRoutes(payrollController: PayrollController) {
  const router = Router();

  router.get('/docs', payrollController.getDocumentation);
  router.get('/', payrollController.overview);
  router.get('/contracts', payrollController.listContracts);
  router.get('/contracts/:id', payrollController.getContractById);
  router.get('/payslips', payrollController.listPaySlips);
  router.post('/payslips/generate', payrollController.generatePayRun);
  router.post('/payslips', payrollController.createPaySlip);
  router.get('/payslips/:id', payrollController.getPaySlipById);
  router.patch('/payslips/:id', payrollController.updatePaySlip);
  router.delete('/payslips/:id', payrollController.removePaySlip);
  router.post('/payslips/:id/issue', payrollController.issuePaySlip);
  router.post('/payslips/:id/mark-paid', payrollController.markPaySlipPaid);
  router.post('/payslips/:id/journal-entry', payrollController.createJournalEntryForPaySlip);
  router.post('/payslips/:id/register-payment', payrollController.registerPaymentForPaySlip);

  return router;
}
