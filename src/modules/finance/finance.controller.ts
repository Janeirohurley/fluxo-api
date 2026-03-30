import { type Request, type Response } from 'express';

import {
  closeReconciliationSchema,
  createAccountingAccountSchema,
  createJournalEntrySchema,
  createPaymentMethodSchema,
  createReconciliationItemSchema,
  createReconciliationSchema,
  createTransactionSchema,
  createTransactionTypeSchema,
  listJournalEntriesQuerySchema,
  listReconciliationsQuerySchema,
  listTransactionsQuerySchema,
  postJournalEntrySchema,
  updatePaymentMethodSchema,
  updateTransactionTypeSchema,
  updateAccountingAccountSchema,
  updateTransactionSchema
} from './finance.schema';
import { getFinanceModuleDocumentation } from './finance.docs';
import { type FinanceService } from './finance.service';
import { buildPaginatedHttpResponse } from '../../shared/pagination';

export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  getDocumentation = (_req: Request, res: Response) => {
    res.status(200).json(getFinanceModuleDocumentation());
  };

  overview = (_req: Request, res: Response) => {
    res.status(200).json(this.financeService.getOverview());
  };

  listPaymentMethods = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.financeService.listPaymentMethods()
    });
  };

  createPaymentMethod = async (req: Request, res: Response) => {
    const payload = createPaymentMethodSchema.parse(req.body);
    const paymentMethod = await this.financeService.createPaymentMethod(payload);

    res.status(201).json({
      message: 'Payment method created successfully',
      data: paymentMethod
    });
  };

  updatePaymentMethod = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updatePaymentMethodSchema.parse(req.body);
    const paymentMethod = await this.financeService.updatePaymentMethod(req.params.id, payload);

    res.status(200).json({
      message: 'Payment method updated successfully',
      data: paymentMethod
    });
  };

  removePaymentMethod = async (req: Request<{ id: string }>, res: Response) => {
    await this.financeService.removePaymentMethod(req.params.id);
    res.status(204).send();
  };

  listTransactionTypes = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.financeService.listTransactionTypes()
    });
  };

  createTransactionType = async (req: Request, res: Response) => {
    const payload = createTransactionTypeSchema.parse(req.body);
    const transactionType = await this.financeService.createTransactionType(payload);

    res.status(201).json({
      message: 'Transaction type created successfully',
      data: transactionType
    });
  };

  updateTransactionType = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateTransactionTypeSchema.parse(req.body);
    const transactionType = await this.financeService.updateTransactionType(req.params.id, payload);

    res.status(200).json({
      message: 'Transaction type updated successfully',
      data: transactionType
    });
  };

  removeTransactionType = async (req: Request<{ id: string }>, res: Response) => {
    await this.financeService.removeTransactionType(req.params.id);
    res.status(204).send();
  };

  listAccountingAccounts = async (_req: Request, res: Response) => {
    res.status(200).json({
      data: await this.financeService.listAccountingAccounts()
    });
  };

  createAccountingAccount = async (req: Request, res: Response) => {
    const payload = createAccountingAccountSchema.parse(req.body);
    const account = await this.financeService.createAccountingAccount(payload);

    res.status(201).json({
      message: 'Accounting account created successfully',
      data: account
    });
  };

  updateAccountingAccount = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateAccountingAccountSchema.parse(req.body);
    const account = await this.financeService.updateAccountingAccount(req.params.id, payload);

    res.status(200).json({
      message: 'Accounting account updated successfully',
      data: account
    });
  };

  removeAccountingAccount = async (req: Request<{ id: string }>, res: Response) => {
    await this.financeService.removeAccountingAccount(req.params.id);
    res.status(204).send();
  };

  listTransactions = async (req: Request, res: Response) => {
    const query = listTransactionsQuerySchema.parse(req.query);
    const result = await this.financeService.listTransactions(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getTransactionById = async (req: Request<{ id: string }>, res: Response) => {
    const transaction = await this.financeService.getTransactionById(req.params.id);

    res.status(200).json({
      data: transaction
    });
  };

  createTransaction = async (req: Request, res: Response) => {
    const payload = createTransactionSchema.parse(req.body);
    const transaction = await this.financeService.createTransaction(payload);

    res.status(201).json({
      message: 'Transaction created successfully',
      data: transaction
    });
  };

  updateTransaction = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updateTransactionSchema.parse(req.body);
    const transaction = await this.financeService.updateTransaction(req.params.id, payload);

    res.status(200).json({
      message: 'Transaction updated successfully',
      data: transaction
    });
  };

  removeTransaction = async (req: Request<{ id: string }>, res: Response) => {
    await this.financeService.removeTransaction(req.params.id);

    res.status(204).send();
  };

  listJournalEntries = async (req: Request, res: Response) => {
    const query = listJournalEntriesQuerySchema.parse(req.query);
    const result = await this.financeService.listJournalEntries(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getJournalEntryById = async (req: Request<{ id: string }>, res: Response) => {
    const journalEntry = await this.financeService.getJournalEntryById(req.params.id);

    res.status(200).json({
      data: journalEntry
    });
  };

  createJournalEntry = async (req: Request, res: Response) => {
    const payload = createJournalEntrySchema.parse(req.body);
    const journalEntry = await this.financeService.createJournalEntry(payload);

    res.status(201).json({
      message: 'Journal entry created successfully',
      data: journalEntry
    });
  };

  postJournalEntry = async (req: Request<{ id: string }>, res: Response) => {
    const payload = postJournalEntrySchema.parse(req.body);
    const journalEntry = await this.financeService.postJournalEntry(req.params.id, payload);

    res.status(200).json({
      message: 'Journal entry posted successfully',
      data: journalEntry
    });
  };

  listReconciliations = async (req: Request, res: Response) => {
    const query = listReconciliationsQuerySchema.parse(req.query);
    const result = await this.financeService.listReconciliations(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getReconciliationById = async (req: Request<{ id: string }>, res: Response) => {
    const reconciliation = await this.financeService.getReconciliationById(req.params.id);

    res.status(200).json({
      data: reconciliation
    });
  };

  createReconciliation = async (req: Request, res: Response) => {
    const payload = createReconciliationSchema.parse(req.body);
    const reconciliation = await this.financeService.createReconciliation(payload);

    res.status(201).json({
      message: 'Reconciliation created successfully',
      data: reconciliation
    });
  };

  closeReconciliation = async (req: Request<{ id: string }>, res: Response) => {
    const payload = closeReconciliationSchema.parse(req.body);
    const reconciliation = await this.financeService.closeReconciliation(req.params.id, payload);

    res.status(200).json({
      message: 'Reconciliation closed successfully',
      data: reconciliation
    });
  };

  addReconciliationItem = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createReconciliationItemSchema.parse(req.body);
    const item = await this.financeService.addReconciliationItem(req.params.id, payload);

    res.status(201).json({
      message: 'Reconciliation item created successfully',
      data: item
    });
  };
}
