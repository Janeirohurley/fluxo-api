import { Router } from 'express';

import { type FinanceController } from './finance.controller';

export function createFinanceRoutes(financeController: FinanceController) {
  const router = Router();

  router.get('/docs', financeController.getDocumentation);
  router.get('/', financeController.overview);

  router.get('/payment-methods', financeController.listPaymentMethods);
  router.post('/payment-methods', financeController.createPaymentMethod);
  router.patch('/payment-methods/:id', financeController.updatePaymentMethod);
  router.delete('/payment-methods/:id', financeController.removePaymentMethod);
  router.get('/transaction-types', financeController.listTransactionTypes);
  router.post('/transaction-types', financeController.createTransactionType);
  router.patch('/transaction-types/:id', financeController.updateTransactionType);
  router.delete('/transaction-types/:id', financeController.removeTransactionType);

  router.get('/accounts', financeController.listAccountingAccounts);
  router.post('/accounts', financeController.createAccountingAccount);
  router.patch('/accounts/:id', financeController.updateAccountingAccount);
  router.delete('/accounts/:id', financeController.removeAccountingAccount);

  router.get('/transactions', financeController.listTransactions);
  router.post('/transactions', financeController.createTransaction);
  router.get('/transactions/:id', financeController.getTransactionById);
  router.patch('/transactions/:id', financeController.updateTransaction);
  router.delete('/transactions/:id', financeController.removeTransaction);

  router.get('/journal-entries', financeController.listJournalEntries);
  router.post('/journal-entries', financeController.createJournalEntry);
  router.get('/journal-entries/:id', financeController.getJournalEntryById);
  router.post('/journal-entries/:id/post', financeController.postJournalEntry);

  router.get('/reconciliations', financeController.listReconciliations);
  router.post('/reconciliations', financeController.createReconciliation);
  router.get('/reconciliations/:id', financeController.getReconciliationById);
  router.post('/reconciliations/:id/close', financeController.closeReconciliation);
  router.post('/reconciliations/:id/items', financeController.addReconciliationItem);

  return router;
}
