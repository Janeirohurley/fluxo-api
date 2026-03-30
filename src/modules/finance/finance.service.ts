import { HttpError } from '../../shared/http-error';
import { buildPaginatedResult } from '../../shared/pagination';
import {
  type CloseReconciliationInput,
  type CreateAccountingAccountInput,
  type CreateJournalEntryInput,
  type CreatePaymentMethodInput,
  type CreateReconciliationInput,
  type CreateReconciliationItemInput,
  type CreateTransactionInput,
  type CreateTransactionTypeInput,
  type ListJournalEntriesQuery,
  type ListReconciliationsQuery,
  type ListTransactionsQuery,
  type PostJournalEntryInput,
  type UpdatePaymentMethodInput,
  type UpdateTransactionTypeInput,
  type UpdateAccountingAccountInput,
  type UpdateTransactionInput
} from './finance.schema';
import { type FinanceRepository } from './finance.repository';
import {
  type AccountingAccount,
  type FinanceOverview,
  type FinanceTransaction,
  type FinanceTransactionDetails,
  type FinanceTransactionListResult,
  type JournalEntry,
  type JournalEntryDetails,
  type JournalEntryListResult,
  type PaymentMethod,
  type Reconciliation,
  type ReconciliationDetails,
  type ReconciliationItem,
  type ReconciliationListResult,
  type TransactionType
} from './finance.types';

export class FinanceService {
  constructor(private readonly repository: FinanceRepository) {}

  getOverview(): FinanceOverview {
    return {
      module: 'finance',
      description:
        'Cash-flow, accounting, journal entries and reconciliations module based on the PDF schema.',
      ready: true,
      extensible: true,
      boundaries: [
        'payment-methods',
        'transaction-types',
        'accounting-accounts',
        'transactions',
        'journal-entries',
        'reconciliations'
      ]
    };
  }

  listPaymentMethods(): Promise<PaymentMethod[]> {
    return this.repository.listPaymentMethods();
  }

  createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    return this.repository.createPaymentMethod(input);
  }

  updatePaymentMethod(id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    return this.repository.updatePaymentMethod(id, input);
  }

  removePaymentMethod(id: string): Promise<void> {
    return this.repository.removePaymentMethod(id);
  }

  listTransactionTypes(): Promise<TransactionType[]> {
    return this.repository.listTransactionTypes();
  }

  createTransactionType(input: CreateTransactionTypeInput): Promise<TransactionType> {
    return this.repository.createTransactionType(input);
  }

  updateTransactionType(id: string, input: UpdateTransactionTypeInput): Promise<TransactionType> {
    return this.repository.updateTransactionType(id, input);
  }

  removeTransactionType(id: string): Promise<void> {
    return this.repository.removeTransactionType(id);
  }

  listAccountingAccounts(): Promise<AccountingAccount[]> {
    return this.repository.listAccountingAccounts();
  }

  createAccountingAccount(input: CreateAccountingAccountInput): Promise<AccountingAccount> {
    return this.repository.createAccountingAccount(input);
  }

  updateAccountingAccount(
    id: string,
    input: UpdateAccountingAccountInput
  ): Promise<AccountingAccount> {
    return this.repository.updateAccountingAccount(id, input);
  }

  removeAccountingAccount(id: string): Promise<void> {
    return this.repository.removeAccountingAccount(id);
  }

  async listTransactions(input: ListTransactionsQuery): Promise<FinanceTransactionListResult> {
    const transactions = await this.repository.listTransactions(input);
    const data = await Promise.all(transactions.items.map((transaction) => this.enrichTransaction(transaction)));

    return buildPaginatedResult(data, input, transactions.total);
  }

  async getTransactionById(id: string): Promise<FinanceTransactionDetails> {
    return this.enrichTransaction(await this.repository.getTransactionById(id));
  }

  async createTransaction(input: CreateTransactionInput): Promise<FinanceTransactionDetails> {
    await Promise.all([
      this.repository.getTransactionTypeById(input.transactionTypeId),
      this.repository.getPaymentMethodById(input.paymentMethodId),
      ...(input.journalEntryId ? [this.repository.getJournalEntryById(input.journalEntryId)] : [])
    ]);

    return this.enrichTransaction(await this.repository.createTransaction(input));
  }

  async updateTransaction(
    id: string,
    input: UpdateTransactionInput
  ): Promise<FinanceTransactionDetails> {
    const existing = await this.repository.getTransactionById(id);
    const relationSummary = await this.repository.getTransactionRelationSummary(id);

    if (relationSummary.reconciliationItemsCount > 0) {
      throw new HttpError(
        409,
        'Cannot update a transaction that is already linked to reconciliation items',
        {
          relationSummary
        }
      );
    }

    if (existing.journalEntryId) {
      const journalEntry = await this.repository.getJournalEntryById(existing.journalEntryId);

      if (journalEntry.status === 'posted') {
        throw new HttpError(
          409,
          'Cannot update a transaction that belongs to a posted journal entry',
          {
            journalEntryId: journalEntry.id
          }
        );
      }
    }

    await Promise.all([
      ...(input.transactionTypeId ? [this.repository.getTransactionTypeById(input.transactionTypeId)] : []),
      ...(input.paymentMethodId ? [this.repository.getPaymentMethodById(input.paymentMethodId)] : []),
      ...(input.journalEntryId ? [this.repository.getJournalEntryById(input.journalEntryId)] : [])
    ]);

    return this.enrichTransaction(await this.repository.updateTransaction(id, input));
  }

  async removeTransaction(id: string): Promise<void> {
    const existing = await this.repository.getTransactionById(id);
    const relationSummary = await this.repository.getTransactionRelationSummary(id);

    if (relationSummary.reconciliationItemsCount > 0) {
      throw new HttpError(
        409,
        'Cannot delete a transaction that is already linked to reconciliation items',
        {
          relationSummary
        }
      );
    }

    if (existing.journalEntryId) {
      const journalEntry = await this.repository.getJournalEntryById(existing.journalEntryId);

      if (journalEntry.status === 'posted') {
        throw new HttpError(
          409,
          'Cannot delete a transaction that belongs to a posted journal entry',
          {
            journalEntryId: journalEntry.id
          }
        );
      }
    }

    await this.repository.removeTransaction(id);
  }

  async listJournalEntries(input: ListJournalEntriesQuery): Promise<JournalEntryListResult> {
    const entries = await this.repository.listJournalEntries(input);
    const data = await Promise.all(entries.items.map((entry) => this.enrichJournalEntry(entry)));

    return buildPaginatedResult(data, input, entries.total);
  }

  async getJournalEntryById(id: string): Promise<JournalEntryDetails> {
    return this.enrichJournalEntry(await this.repository.getJournalEntryById(id));
  }

  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntryDetails> {
    await Promise.all(input.lines.map((line) => this.repository.getAccountingAccountById(line.accountId)));

    return this.enrichJournalEntry(await this.repository.createJournalEntry(input));
  }

  async postJournalEntry(id: string, input: PostJournalEntryInput): Promise<JournalEntryDetails> {
    const existing = await this.repository.getJournalEntryById(id);

    if (existing.status === 'posted') {
      throw new HttpError(409, 'This journal entry has already been posted');
    }

    return this.enrichJournalEntry(await this.repository.postJournalEntry(id, input));
  }

  async listReconciliations(input: ListReconciliationsQuery): Promise<ReconciliationListResult> {
    const reconciliations = await this.repository.listReconciliations(input);
    const data = await Promise.all(
      reconciliations.items.map((reconciliation) => this.enrichReconciliation(reconciliation))
    );

    return buildPaginatedResult(data, input, reconciliations.total);
  }

  async getReconciliationById(id: string): Promise<ReconciliationDetails> {
    return this.enrichReconciliation(await this.repository.getReconciliationById(id));
  }

  async createReconciliation(input: CreateReconciliationInput): Promise<ReconciliationDetails> {
    await this.repository.getAccountingAccountById(input.accountId);

    return this.enrichReconciliation(await this.repository.createReconciliation(input));
  }

  async closeReconciliation(
    id: string,
    input: CloseReconciliationInput
  ): Promise<ReconciliationDetails> {
    const existing = await this.repository.getReconciliationById(id);

    if (existing.status === 'closed') {
      throw new HttpError(409, 'This reconciliation is already closed');
    }

    const existingItems = await this.repository.listReconciliationItemsByReconciliationId(id);

    if (existingItems.length === 0) {
      throw new HttpError(409, 'Cannot close a reconciliation without matched items');
    }

    return this.enrichReconciliation(await this.repository.closeReconciliation(id, input));
  }

  async addReconciliationItem(
    reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<ReconciliationItem> {
    const reconciliation = await this.repository.getReconciliationById(reconciliationId);

    if (reconciliation.status === 'closed') {
      throw new HttpError(409, 'Cannot add reconciliation items to a closed reconciliation');
    }

    const transaction = input.transactionId
      ? await this.repository.getTransactionById(input.transactionId)
      : null;
    const journalEntryLine = input.journalEntryLineId
      ? await this.repository.getJournalEntryLineById(input.journalEntryLineId)
      : null;

    if (transaction?.journalEntryId) {
      const journalEntry = await this.repository.getJournalEntryById(transaction.journalEntryId);

      if (journalEntry.status !== 'posted') {
        throw new HttpError(
          409,
          'Cannot reconcile a transaction that belongs to a draft journal entry',
          {
            journalEntryId: journalEntry.id
          }
        );
      }
    }

    if (journalEntryLine) {
      const journalEntry = await this.repository.getJournalEntryById(
        journalEntryLine.journalEntryId
      );

      if (journalEntry.status !== 'posted') {
        throw new HttpError(
          409,
          'Only lines from posted journal entries can be added to a reconciliation',
          {
            journalEntryId: journalEntry.id
          }
        );
      }
    }

    if (await this.repository.hasReconciliationItemLink(reconciliationId, input)) {
      throw new HttpError(
        409,
        'This reconciliation source is already linked to another reconciliation'
      );
    }

    return this.repository.createReconciliationItem(reconciliationId, input);
  }

  private async enrichTransaction(transaction: FinanceTransaction): Promise<FinanceTransactionDetails> {
    const [transactionType, paymentMethod] = await Promise.all([
      this.repository.getTransactionTypeById(transaction.transactionTypeId),
      this.repository.getPaymentMethodById(transaction.paymentMethodId)
    ]);

    return {
      ...transaction,
      transactionType,
      paymentMethod
    };
  }

  private async enrichJournalEntry(entry: JournalEntry): Promise<JournalEntryDetails> {
    const lines = await this.repository.listJournalEntryLinesByEntryId(entry.id);

    return {
      ...entry,
      lines
    };
  }

  private async enrichReconciliation(
    reconciliation: Reconciliation
  ): Promise<ReconciliationDetails> {
    const [account, items] = await Promise.all([
      this.repository.getAccountingAccountById(reconciliation.accountId),
      this.repository.listReconciliationItemsByReconciliationId(reconciliation.id)
    ]);

    return {
      ...reconciliation,
      account,
      items
    };
  }
}
