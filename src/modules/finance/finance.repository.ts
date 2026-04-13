import { HttpError } from '../../shared/http-error';
import { slicePage } from '../../shared/pagination';
import {
  type TenantDecimal,
  TenantPrisma,
  type TenantPrismaClientLike
} from '../../shared/tenant-prisma';
import {
  type CloseReconciliationInput,
  type CreateAccountingAccountInput,
  type CreateJournalEntryInput,
  type CreatePaymentMethodInput,
  type CreateTreasuryAccountInput,
  type CreateTreasuryTransferInput,
  type CreateReconciliationInput,
  type CreateReconciliationItemInput,
  type CreateTransactionInput,
  type CreateTransactionTypeInput,
  type ListJournalEntriesQuery,
  type ListReconciliationsQuery,
  type ListTreasuryTransfersQuery,
  type ListTransactionsQuery,
  type PostJournalEntryInput,
  type UpdatePaymentMethodInput,
  type UpdateTransactionTypeInput,
  type UpdateAccountingAccountInput,
  type UpdateTreasuryAccountInput,
  type UpdateTreasuryTransferInput,
  type UpdateTransactionInput
} from './finance.schema';
import {
  type AccountingAccount,
  type FinanceTransaction,
  type FinanceTransactionListQueryResult,
  type FinanceTransactionRelationSummary,
  type JournalEntry,
  type JournalEntryLine,
  type JournalEntryListQueryResult,
  type PaymentMethod,
  type TreasuryAccount,
  type TreasuryTransfer,
  type Reconciliation,
  type ReconciliationItem,
  type ReconciliationListQueryResult,
  type TreasuryTransferListQueryResult,
  type TransactionType
} from './finance.types';

export interface FinanceRepository {
  listPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod>;
  removePaymentMethod(id: string): Promise<void>;
  getPaymentMethodById(id: string): Promise<PaymentMethod>;
  listTransactionTypes(): Promise<TransactionType[]>;
  createTransactionType(input: CreateTransactionTypeInput): Promise<TransactionType>;
  updateTransactionType(id: string, input: UpdateTransactionTypeInput): Promise<TransactionType>;
  removeTransactionType(id: string): Promise<void>;
  getTransactionTypeById(id: string): Promise<TransactionType>;
  listAccountingAccounts(): Promise<AccountingAccount[]>;
  createAccountingAccount(input: CreateAccountingAccountInput): Promise<AccountingAccount>;
  updateAccountingAccount(id: string, input: UpdateAccountingAccountInput): Promise<AccountingAccount>;
  removeAccountingAccount(id: string): Promise<void>;
  getAccountingAccountById(id: string): Promise<AccountingAccount>;
  listTreasuryAccounts(): Promise<TreasuryAccount[]>;
  createTreasuryAccount(input: CreateTreasuryAccountInput): Promise<TreasuryAccount>;
  updateTreasuryAccount(id: string, input: UpdateTreasuryAccountInput): Promise<TreasuryAccount>;
  removeTreasuryAccount(id: string): Promise<void>;
  getTreasuryAccountById(id: string): Promise<TreasuryAccount>;
  listTreasuryTransfers(input: ListTreasuryTransfersQuery): Promise<TreasuryTransferListQueryResult>;
  createTreasuryTransfer(input: CreateTreasuryTransferInput): Promise<TreasuryTransfer>;
  updateTreasuryTransfer(id: string, input: UpdateTreasuryTransferInput): Promise<TreasuryTransfer>;
  removeTreasuryTransfer(id: string): Promise<void>;
  getTreasuryTransferById(id: string): Promise<TreasuryTransfer>;
  listTreasuryTransfersByTreasuryAccountId(treasuryAccountId: string): Promise<TreasuryTransfer[]>;
  listTransactions(input: ListTransactionsQuery): Promise<FinanceTransactionListQueryResult>;
  listTransactionsByTreasuryAccountId(treasuryAccountId: string): Promise<FinanceTransaction[]>;
  getTransactionById(id: string): Promise<FinanceTransaction>;
  createTransaction(input: CreateTransactionInput): Promise<FinanceTransaction>;
  updateTransaction(id: string, input: UpdateTransactionInput): Promise<FinanceTransaction>;
  removeTransaction(id: string): Promise<void>;
  getTransactionRelationSummary(id: string): Promise<FinanceTransactionRelationSummary>;
  listJournalEntries(input: ListJournalEntriesQuery): Promise<JournalEntryListQueryResult>;
  getJournalEntryById(id: string): Promise<JournalEntry>;
  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry>;
  postJournalEntry(id: string, input: PostJournalEntryInput): Promise<JournalEntry>;
  listJournalEntryLinesByEntryId(journalEntryId: string): Promise<JournalEntryLine[]>;
  getJournalEntryLineById(id: string): Promise<JournalEntryLine>;
  listReconciliations(input: ListReconciliationsQuery): Promise<ReconciliationListQueryResult>;
  getReconciliationById(id: string): Promise<Reconciliation>;
  createReconciliation(input: CreateReconciliationInput): Promise<Reconciliation>;
  closeReconciliation(id: string, input: CloseReconciliationInput): Promise<Reconciliation>;
  listReconciliationItemsByReconciliationId(reconciliationId: string): Promise<ReconciliationItem[]>;
  createReconciliationItem(
    reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<ReconciliationItem>;
  hasReconciliationItemLink(
    reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<boolean>;
}

function nowIso() {
  return new Date().toISOString();
}

function comparePrimitive(
  left: string | number | undefined,
  right: string | number | undefined,
  sortOrder: 'asc' | 'desc'
) {
  const leftValue = typeof left === 'number' ? left : (left ?? '').toLowerCase();
  const rightValue = typeof right === 'number' ? right : (right ?? '').toLowerCase();
  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));

  return sortOrder === 'asc' ? comparison : comparison * -1;
}

export class InMemoryFinanceRepository implements FinanceRepository {
  private readonly paymentMethods = new Map<string, PaymentMethod>();
  private readonly transactionTypes = new Map<string, TransactionType>();
  private readonly accountingAccounts = new Map<string, AccountingAccount>();
  private readonly treasuryAccounts = new Map<string, TreasuryAccount>();
  private readonly treasuryTransfers = new Map<string, TreasuryTransfer>();
  private readonly transactions = new Map<string, FinanceTransaction>();
  private readonly journalEntries = new Map<string, JournalEntry>();
  private readonly journalEntryLines = new Map<string, JournalEntryLine>();
  private readonly reconciliations = new Map<string, Reconciliation>();
  private readonly reconciliationItems = new Map<string, ReconciliationItem>();

  constructor() {
    this.seedReferenceData();
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    return Array.from(this.paymentMethods.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    this.assertUniqueName(this.paymentMethods, input.name, 'Payment method');
    const entity = this.createTimestampedEntity(input);
    this.paymentMethods.set(entity.id, entity);
    return entity;
  }

  async updatePaymentMethod(
    id: string,
    input: UpdatePaymentMethodInput
  ): Promise<PaymentMethod> {
    const existing = await this.getPaymentMethodById(id);
    const nextName = input.name ?? existing.name;
    this.assertUniqueName(this.paymentMethods, nextName, 'Payment method', id);

    const updated: PaymentMethod = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };

    this.paymentMethods.set(id, updated);
    return updated;
  }

  async removePaymentMethod(id: string): Promise<void> {
    await this.getPaymentMethodById(id);

    const linkedTransactions = Array.from(this.transactions.values()).some(
      (transaction) => transaction.paymentMethodId === id
    );

    if (linkedTransactions) {
      throw new HttpError(
        409,
        'Cannot delete a payment method that is already linked to transactions'
      );
    }

    this.paymentMethods.delete(id);
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const method = this.paymentMethods.get(id);
    if (!method) {
      throw new HttpError(404, `Payment method with id "${id}" not found`);
    }

    return method;
  }

  async listTransactionTypes(): Promise<TransactionType[]> {
    return Array.from(this.transactionTypes.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  async createTransactionType(input: CreateTransactionTypeInput): Promise<TransactionType> {
    this.assertUniqueName(this.transactionTypes, input.name, 'Transaction type');
    const entity = this.createTimestampedEntity(input);
    this.transactionTypes.set(entity.id, entity);
    return entity;
  }

  async updateTransactionType(
    id: string,
    input: UpdateTransactionTypeInput
  ): Promise<TransactionType> {
    const existing = await this.getTransactionTypeById(id);
    const nextName = input.name ?? existing.name;
    this.assertUniqueName(this.transactionTypes, nextName, 'Transaction type', id);

    const updated: TransactionType = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };

    this.transactionTypes.set(id, updated);
    return updated;
  }

  async removeTransactionType(id: string): Promise<void> {
    await this.getTransactionTypeById(id);

    const linkedTransactions = Array.from(this.transactions.values()).some(
      (transaction) => transaction.transactionTypeId === id
    );

    if (linkedTransactions) {
      throw new HttpError(
        409,
        'Cannot delete a transaction type that is already linked to transactions'
      );
    }

    this.transactionTypes.delete(id);
  }

  async getTransactionTypeById(id: string): Promise<TransactionType> {
    const transactionType = this.transactionTypes.get(id);
    if (!transactionType) {
      throw new HttpError(404, `Transaction type with id "${id}" not found`);
    }

    return transactionType;
  }

  async listAccountingAccounts(): Promise<AccountingAccount[]> {
    return Array.from(this.accountingAccounts.values()).sort((left, right) =>
      left.code.localeCompare(right.code)
    );
  }

  async createAccountingAccount(input: CreateAccountingAccountInput): Promise<AccountingAccount> {
    this.assertUniqueCode(input.code);
    const entity = this.createTimestampedEntity(input);
    this.accountingAccounts.set(entity.id, entity);
    return entity;
  }

  async updateAccountingAccount(
    id: string,
    input: UpdateAccountingAccountInput
  ): Promise<AccountingAccount> {
    const existing = await this.getAccountingAccountById(id);
    const nextCode = input.code ?? existing.code;
    this.assertUniqueCode(nextCode, id);
    const updated: AccountingAccount = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };

    this.accountingAccounts.set(id, updated);
    return updated;
  }

  async removeAccountingAccount(id: string): Promise<void> {
    await this.getAccountingAccountById(id);

    const hasJournalLines = Array.from(this.journalEntryLines.values()).some(
      (line) => line.accountId === id
    );
    const hasReconciliations = Array.from(this.reconciliations.values()).some(
      (reconciliation) => reconciliation.accountId === id
    );

    if (hasJournalLines || hasReconciliations) {
      throw new HttpError(
        409,
        'Cannot delete an accounting account that is already linked to journal entries or reconciliations'
      );
    }

    this.accountingAccounts.delete(id);
  }

  async getAccountingAccountById(id: string): Promise<AccountingAccount> {
    const account = this.accountingAccounts.get(id);
    if (!account) {
      throw new HttpError(404, `Accounting account with id "${id}" not found`);
    }

    return account;
  }

  async listTreasuryAccounts(): Promise<TreasuryAccount[]> {
    return Array.from(this.treasuryAccounts.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  async createTreasuryAccount(input: CreateTreasuryAccountInput): Promise<TreasuryAccount> {
    this.assertUniqueName(this.treasuryAccounts, input.name, 'Treasury account');
    const entity = this.createTimestampedEntity(input);
    this.treasuryAccounts.set(entity.id, entity);
    return entity;
  }

  async updateTreasuryAccount(
    id: string,
    input: UpdateTreasuryAccountInput
  ): Promise<TreasuryAccount> {
    const existing = await this.getTreasuryAccountById(id);
    const nextName = input.name ?? existing.name;
    this.assertUniqueName(this.treasuryAccounts, nextName, 'Treasury account', id);

    const updated: TreasuryAccount = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };

    this.treasuryAccounts.set(id, updated);
    return updated;
  }

  async removeTreasuryAccount(id: string): Promise<void> {
    await this.getTreasuryAccountById(id);

    const linkedTransactions = Array.from(this.transactions.values()).some(
      (transaction) => transaction.treasuryAccountId === id
    );
    const linkedTransfers = Array.from(this.treasuryTransfers.values()).some(
      (transfer) => transfer.fromTreasuryAccountId === id || transfer.toTreasuryAccountId === id
    );

    if (linkedTransactions || linkedTransfers) {
      throw new HttpError(
        409,
        'Cannot delete a treasury account that is already linked to transactions or transfers'
      );
    }

    this.treasuryAccounts.delete(id);
  }

  async getTreasuryAccountById(id: string): Promise<TreasuryAccount> {
    const account = this.treasuryAccounts.get(id);
    if (!account) {
      throw new HttpError(404, `Treasury account with id "${id}" not found`);
    }

    return account;
  }

  async listTreasuryTransfers(
    input: ListTreasuryTransfersQuery
  ): Promise<TreasuryTransferListQueryResult> {
    const filtered = Array.from(this.treasuryTransfers.values())
      .filter((transfer) => this.matchesTreasuryTransferFilters(transfer, input))
      .sort((left, right) => {
        const leftValue = this.getTreasuryTransferSortValue(left, input.sortBy);
        const rightValue = this.getTreasuryTransferSortValue(right, input.sortBy);
        return comparePrimitive(leftValue, rightValue, input.sortOrder);
      });

    return {
      items: slicePage(filtered, input),
      total: filtered.length
    };
  }

  async createTreasuryTransfer(input: CreateTreasuryTransferInput): Promise<TreasuryTransfer> {
    const entity = this.createTimestampedEntity(input);
    this.treasuryTransfers.set(entity.id, entity);
    return entity;
  }

  async updateTreasuryTransfer(
    id: string,
    input: UpdateTreasuryTransferInput
  ): Promise<TreasuryTransfer> {
    const existing = await this.getTreasuryTransferById(id);
    const updated: TreasuryTransfer = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };
    this.treasuryTransfers.set(id, updated);
    return updated;
  }

  async removeTreasuryTransfer(id: string): Promise<void> {
    await this.getTreasuryTransferById(id);
    this.treasuryTransfers.delete(id);
  }

  async getTreasuryTransferById(id: string): Promise<TreasuryTransfer> {
    const transfer = this.treasuryTransfers.get(id);
    if (!transfer) {
      throw new HttpError(404, `Treasury transfer with id "${id}" not found`);
    }

    return transfer;
  }

  async listTreasuryTransfersByTreasuryAccountId(
    treasuryAccountId: string
  ): Promise<TreasuryTransfer[]> {
    return Array.from(this.treasuryTransfers.values()).filter(
      (transfer) =>
        transfer.fromTreasuryAccountId === treasuryAccountId ||
        transfer.toTreasuryAccountId === treasuryAccountId
    );
  }

  async listTransactions(input: ListTransactionsQuery): Promise<FinanceTransactionListQueryResult> {
    const filtered = Array.from(this.transactions.values())
      .filter((transaction) => this.matchesTransactionFilters(transaction, input))
      .sort((left, right) => {
        const leftValue = this.getTransactionSortValue(left, input.sortBy);
        const rightValue = this.getTransactionSortValue(right, input.sortBy);
        return comparePrimitive(leftValue, rightValue, input.sortOrder);
      });

    return {
      items: slicePage(filtered, input),
      total: filtered.length
    };
  }

  async getTransactionById(id: string): Promise<FinanceTransaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new HttpError(404, `Transaction with id "${id}" not found`);
    }

    return transaction;
  }

  async listTransactionsByTreasuryAccountId(treasuryAccountId: string): Promise<FinanceTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.treasuryAccountId === treasuryAccountId
    );
  }

  async createTransaction(input: CreateTransactionInput): Promise<FinanceTransaction> {
    const entity: FinanceTransaction = {
      ...this.createTimestampedEntity({}),
      ...input
    };
    this.transactions.set(entity.id, entity);
    return entity;
  }

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<FinanceTransaction> {
    const existing = await this.getTransactionById(id);
    const updated: FinanceTransaction = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async removeTransaction(id: string): Promise<void> {
    await this.getTransactionById(id);
    this.transactions.delete(id);
    for (const item of await this.listReconciliationItemsByReconciliationIdForTransaction(id)) {
      this.reconciliationItems.delete(item.id);
    }
  }

  async getTransactionRelationSummary(id: string): Promise<FinanceTransactionRelationSummary> {
    await this.getTransactionById(id);
    const reconciliationItemsCount = Array.from(this.reconciliationItems.values()).filter(
      (item) => item.transactionId === id
    ).length;

    return {
      reconciliationItemsCount
    };
  }

  async listJournalEntries(input: ListJournalEntriesQuery): Promise<JournalEntryListQueryResult> {
    const filtered = Array.from(this.journalEntries.values())
      .filter((entry) => this.matchesJournalEntryFilters(entry, input))
      .sort((left, right) => {
        const leftValue = this.getJournalEntrySortValue(left, input.sortBy);
        const rightValue = this.getJournalEntrySortValue(right, input.sortBy);
        return comparePrimitive(leftValue, rightValue, input.sortOrder);
      });

    return {
      items: slicePage(filtered, input),
      total: filtered.length
    };
  }

  async getJournalEntryById(id: string): Promise<JournalEntry> {
    const entry = this.journalEntries.get(id);
    if (!entry) {
      throw new HttpError(404, `Journal entry with id "${id}" not found`);
    }

    return entry;
  }

  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    this.assertUniqueEntryNumber(input.entryNumber);
    const entry: JournalEntry = {
      ...this.createTimestampedEntity({
        entryNumber: input.entryNumber,
        entryDate: input.entryDate,
        description: input.description,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        status: input.status,
        postedBy: input.status === 'posted' ? input.postedBy : undefined
      }),
      postedAt: input.status === 'posted' ? nowIso() : undefined
    };

    this.journalEntries.set(entry.id, entry);

    for (const line of input.lines) {
      const lineEntity: JournalEntryLine = {
        ...this.createTimestampedEntity(line),
        journalEntryId: entry.id
      };
      this.journalEntryLines.set(lineEntity.id, lineEntity);
    }

    return entry;
  }

  async postJournalEntry(id: string, input: PostJournalEntryInput): Promise<JournalEntry> {
    const existing = await this.getJournalEntryById(id);
    const updated: JournalEntry = {
      ...existing,
      status: 'posted',
      postedBy: input.postedBy,
      postedAt: nowIso(),
      updatedAt: nowIso()
    };
    this.journalEntries.set(id, updated);
    return updated;
  }

  async listJournalEntryLinesByEntryId(journalEntryId: string): Promise<JournalEntryLine[]> {
    return Array.from(this.journalEntryLines.values()).filter(
      (line) => line.journalEntryId === journalEntryId
    );
  }

  async getJournalEntryLineById(id: string): Promise<JournalEntryLine> {
    const line = this.journalEntryLines.get(id);
    if (!line) {
      throw new HttpError(404, `Journal entry line with id "${id}" not found`);
    }

    return line;
  }

  async listReconciliations(input: ListReconciliationsQuery): Promise<ReconciliationListQueryResult> {
    const filtered = Array.from(this.reconciliations.values())
      .filter((reconciliation) => this.matchesReconciliationFilters(reconciliation, input))
      .sort((left, right) => {
        const leftValue = this.getReconciliationSortValue(left, input.sortBy);
        const rightValue = this.getReconciliationSortValue(right, input.sortBy);
        return comparePrimitive(leftValue, rightValue, input.sortOrder);
      });

    return {
      items: slicePage(filtered, input),
      total: filtered.length
    };
  }

  async getReconciliationById(id: string): Promise<Reconciliation> {
    const reconciliation = this.reconciliations.get(id);
    if (!reconciliation) {
      throw new HttpError(404, `Reconciliation with id "${id}" not found`);
    }

    return reconciliation;
  }

  async createReconciliation(input: CreateReconciliationInput): Promise<Reconciliation> {
    const reconciliation: Reconciliation = {
      ...this.createTimestampedEntity({
        ...input,
        closedBy: input.status === 'closed' ? input.closedBy : undefined
      }),
      closedAt: input.status === 'closed' ? nowIso() : undefined
    };
    this.reconciliations.set(reconciliation.id, reconciliation);
    return reconciliation;
  }

  async closeReconciliation(
    id: string,
    input: CloseReconciliationInput
  ): Promise<Reconciliation> {
    const existing = await this.getReconciliationById(id);
    const updated: Reconciliation = {
      ...existing,
      status: 'closed',
      closedBy: input.closedBy,
      closedAt: nowIso(),
      updatedAt: nowIso()
    };
    this.reconciliations.set(id, updated);
    return updated;
  }

  async listReconciliationItemsByReconciliationId(
    reconciliationId: string
  ): Promise<ReconciliationItem[]> {
    return Array.from(this.reconciliationItems.values()).filter(
      (item) => item.reconciliationId === reconciliationId
    );
  }

  async createReconciliationItem(
    reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<ReconciliationItem> {
    const timestamp = nowIso();
    const item: ReconciliationItem = {
      ...this.createTimestampedEntity(input),
      reconciliationId,
      matchedAt: timestamp
    };
    this.reconciliationItems.set(item.id, item);
    return item;
  }

  async hasReconciliationItemLink(
    _reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<boolean> {
    return Array.from(this.reconciliationItems.values()).some(
      (item) =>
        (input.transactionId && item.transactionId === input.transactionId) ||
        (input.journalEntryLineId && item.journalEntryLineId === input.journalEntryLineId)
    );
  }

  private async listReconciliationItemsByReconciliationIdForTransaction(transactionId: string) {
    return Array.from(this.reconciliationItems.values()).filter(
      (item) => item.transactionId === transactionId
    );
  }

  private matchesTransactionFilters(transaction: FinanceTransaction, input: ListTransactionsQuery) {
    if (input.transactionTypeId && transaction.transactionTypeId !== input.transactionTypeId) {
      return false;
    }

    if (input.paymentMethodId && transaction.paymentMethodId !== input.paymentMethodId) {
      return false;
    }

    if (input.treasuryAccountId && transaction.treasuryAccountId !== input.treasuryAccountId) {
      return false;
    }

    if (input.assetId && transaction.assetId !== input.assetId) {
      return false;
    }

    if (input.accountingCategory && transaction.accountingCategory !== input.accountingCategory) {
      return false;
    }

    if (input.dateFrom && transaction.transactionDate < input.dateFrom) {
      return false;
    }

    if (input.dateTo && transaction.transactionDate > input.dateTo) {
      return false;
    }

    if (!input.search) {
      return true;
    }

    const haystack = [
      transaction.accountingCategory,
      transaction.referenceNumber,
      transaction.description
    ]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase();

    return haystack.includes(input.search.toLowerCase());
  }

  private getTransactionSortValue(
    transaction: FinanceTransaction,
    sortBy: ListTransactionsQuery['sortBy']
  ) {
    switch (sortBy) {
      case 'amount':
        return transaction.amount;
      case 'createdAt':
        return transaction.createdAt;
      case 'updatedAt':
        return transaction.updatedAt;
      case 'transactionDate':
      default:
        return transaction.transactionDate;
    }
  }

  private matchesTreasuryTransferFilters(
    transfer: TreasuryTransfer,
    input: ListTreasuryTransfersQuery
  ) {
    if (
      input.fromTreasuryAccountId &&
      transfer.fromTreasuryAccountId !== input.fromTreasuryAccountId
    ) {
      return false;
    }

    if (input.toTreasuryAccountId && transfer.toTreasuryAccountId !== input.toTreasuryAccountId) {
      return false;
    }

    if (input.dateFrom && transfer.transferDate < input.dateFrom) {
      return false;
    }

    if (input.dateTo && transfer.transferDate > input.dateTo) {
      return false;
    }

    if (!input.search) {
      return true;
    }

    const haystack = [transfer.referenceNumber, transfer.description]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase();

    return haystack.includes(input.search.toLowerCase());
  }

  private getTreasuryTransferSortValue(
    transfer: TreasuryTransfer,
    sortBy: ListTreasuryTransfersQuery['sortBy']
  ) {
    switch (sortBy) {
      case 'amount':
        return transfer.amount;
      case 'createdAt':
        return transfer.createdAt;
      case 'updatedAt':
        return transfer.updatedAt;
      case 'transferDate':
      default:
        return transfer.transferDate;
    }
  }

  private matchesJournalEntryFilters(entry: JournalEntry, input: ListJournalEntriesQuery) {
    if (input.status && entry.status !== input.status) {
      return false;
    }

    if (input.periodYear && entry.periodYear !== input.periodYear) {
      return false;
    }

    if (input.periodMonth && entry.periodMonth !== input.periodMonth) {
      return false;
    }

    if (!input.search) {
      return true;
    }

    const haystack = [entry.entryNumber, entry.description]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase();

    return haystack.includes(input.search.toLowerCase());
  }

  private getJournalEntrySortValue(
    entry: JournalEntry,
    sortBy: ListJournalEntriesQuery['sortBy']
  ) {
    switch (sortBy) {
      case 'entryNumber':
        return entry.entryNumber;
      case 'createdAt':
        return entry.createdAt;
      case 'updatedAt':
        return entry.updatedAt;
      case 'entryDate':
      default:
        return entry.entryDate;
    }
  }

  private matchesReconciliationFilters(
    reconciliation: Reconciliation,
    input: ListReconciliationsQuery
  ) {
    if (input.status && reconciliation.status !== input.status) {
      return false;
    }

    if (input.accountId && reconciliation.accountId !== input.accountId) {
      return false;
    }

    if (
      input.reconciliationType &&
      reconciliation.reconciliationType !== input.reconciliationType
    ) {
      return false;
    }

    return true;
  }

  private getReconciliationSortValue(
    reconciliation: Reconciliation,
    sortBy: ListReconciliationsQuery['sortBy']
  ) {
    switch (sortBy) {
      case 'statementStartDate':
        return reconciliation.statementStartDate;
      case 'createdAt':
        return reconciliation.createdAt;
      case 'updatedAt':
        return reconciliation.updatedAt;
      case 'statementEndDate':
      default:
        return reconciliation.statementEndDate;
    }
  }

  private createTimestampedEntity<T extends object>(input: T) {
    const timestamp = nowIso();

    return {
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...input
    };
  }

  private assertUniqueName<T extends { id: string; name: string }>(
    collection: Map<string, T>,
    name: string,
    label: string,
    ignoreId?: string
  ) {
    const duplicate = Array.from(collection.values()).find(
      (entity) => entity.name === name && entity.id !== ignoreId
    );
    if (duplicate) {
      throw new HttpError(409, `${label} "${name}" already exists`);
    }
  }

  private assertUniqueCode(code: string, ignoreId?: string) {
    const duplicate = Array.from(this.accountingAccounts.values()).find(
      (account) => account.code === code && account.id !== ignoreId
    );
    if (duplicate) {
      throw new HttpError(409, `Accounting account with code "${code}" already exists`);
    }
  }

  private assertUniqueEntryNumber(entryNumber: string, ignoreId?: string) {
    const duplicate = Array.from(this.journalEntries.values()).find(
      (entry) => entry.entryNumber === entryNumber && entry.id !== ignoreId
    );
    if (duplicate) {
      throw new HttpError(409, `Journal entry with entry number "${entryNumber}" already exists`);
    }
  }

  private seedReferenceData() {
    for (const name of ['bank-transfer', 'cash', 'mobile-money', 'card']) {
      const method = this.createTimestampedEntity({ name });
      this.paymentMethods.set(method.id, method);
    }

    for (const name of ['income', 'expense', 'transfer', 'adjustment']) {
      const transactionType = this.createTimestampedEntity({ name });
      this.transactionTypes.set(transactionType.id, transactionType);
    }

    for (const account of [
      { code: '1000', name: 'Cash and Cash Equivalents', accountType: 'asset', isActive: true },
      { code: '1100', name: 'Accounts Receivable', accountType: 'asset', isActive: true },
      { code: '2000', name: 'Accounts Payable', accountType: 'liability', isActive: true },
      { code: '2100', name: 'Payroll Payable', accountType: 'liability', isActive: true },
      {
        code: '2200',
        name: 'Payroll Deductions Payable',
        accountType: 'liability',
        isActive: true
      },
      { code: '4000', name: 'Operating Revenue', accountType: 'revenue', isActive: true },
      { code: '5000', name: 'Operating Expense', accountType: 'expense', isActive: true },
      { code: '5100', name: 'Payroll Expense', accountType: 'expense', isActive: true }
    ] as const) {
      const accountingAccount = this.createTimestampedEntity(account);
      this.accountingAccounts.set(accountingAccount.id, accountingAccount);
    }

    const openingBalanceDate = nowIso().slice(0, 10);
    for (const treasuryAccount of [
      {
        name: 'Main Bank',
        accountType: 'bank' as const,
        currency: 'BIF',
        openingBalance: 0,
        openingBalanceDate,
        isActive: true
      },
      {
        name: 'Petty Cash',
        accountType: 'cash' as const,
        currency: 'BIF',
        openingBalance: 0,
        openingBalanceDate,
        isActive: true
      },
      {
        name: 'Mobile Money',
        accountType: 'mobile_money' as const,
        currency: 'BIF',
        openingBalance: 0,
        openingBalanceDate,
        isActive: true
      }
    ]) {
      const entity = this.createTimestampedEntity(treasuryAccount);
      this.treasuryAccounts.set(entity.id, entity);
    }
  }
}

export class PrismaFinanceRepository implements FinanceRepository {
  constructor(
    private readonly prismaResolver:
      | TenantPrismaClientLike
      | (() => TenantPrismaClientLike | null)
  ) {}

  private get prisma() {
    const prisma =
      typeof this.prismaResolver === 'function' ? this.prismaResolver() : this.prismaResolver;

    if (!prisma) {
      throw new HttpError(503, 'Tenant database client is not available for finance');
    }

    return prisma as any;
  }

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const methods = await this.prisma.paymentMethod.findMany({
      orderBy: { name: 'asc' }
    });

    return methods.map((method: any) => this.toPaymentMethod(method));
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<PaymentMethod> {
    try {
      const method = await this.prisma.paymentMethod.create({
        data: input
      });

      return this.toPaymentMethod(method);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Payment method "${input.name}" already exists`
      });
    }
  }

  async updatePaymentMethod(
    id: string,
    input: UpdatePaymentMethodInput
  ): Promise<PaymentMethod> {
    try {
      const method = await this.prisma.paymentMethod.update({
        where: { id },
        data: input
      });

      return this.toPaymentMethod(method);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Payment method with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Payment method "${input.name}" already exists`
            : 'A payment method with the same unique value already exists'
      });
    }
  }

  async removePaymentMethod(id: string): Promise<void> {
    try {
      await this.prisma.paymentMethod.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Payment method with id "${id}" not found`,
        relationMessage: 'Cannot delete a payment method that is already linked to transactions'
      });
    }
  }

  async getPaymentMethodById(id: string): Promise<PaymentMethod> {
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id }
    });

    if (!method) {
      throw new HttpError(404, `Payment method with id "${id}" not found`);
    }

    return this.toPaymentMethod(method);
  }

  async listTransactionTypes(): Promise<TransactionType[]> {
    const transactionTypes = await this.prisma.transactionType.findMany({
      orderBy: { name: 'asc' }
    });

    return transactionTypes.map((transactionType: any) => this.toTransactionType(transactionType));
  }

  async createTransactionType(input: CreateTransactionTypeInput): Promise<TransactionType> {
    try {
      const transactionType = await this.prisma.transactionType.create({
        data: input
      });

      return this.toTransactionType(transactionType);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Transaction type "${input.name}" already exists`
      });
    }
  }

  async updateTransactionType(
    id: string,
    input: UpdateTransactionTypeInput
  ): Promise<TransactionType> {
    try {
      const transactionType = await this.prisma.transactionType.update({
        where: { id },
        data: input
      });

      return this.toTransactionType(transactionType);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Transaction type with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Transaction type "${input.name}" already exists`
            : 'A transaction type with the same unique value already exists'
      });
    }
  }

  async removeTransactionType(id: string): Promise<void> {
    try {
      await this.prisma.transactionType.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Transaction type with id "${id}" not found`,
        relationMessage: 'Cannot delete a transaction type that is already linked to transactions'
      });
    }
  }

  async getTransactionTypeById(id: string): Promise<TransactionType> {
    const transactionType = await this.prisma.transactionType.findUnique({
      where: { id }
    });

    if (!transactionType) {
      throw new HttpError(404, `Transaction type with id "${id}" not found`);
    }

    return this.toTransactionType(transactionType);
  }

  async listAccountingAccounts(): Promise<AccountingAccount[]> {
    const accounts = await this.prisma.accountingAccount.findMany({
      orderBy: [{ code: 'asc' }]
    });

    return accounts.map((account: any) => this.toAccountingAccount(account));
  }

  async createAccountingAccount(input: CreateAccountingAccountInput): Promise<AccountingAccount> {
    try {
      const account = await this.prisma.accountingAccount.create({
        data: input
      });

      return this.toAccountingAccount(account);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Accounting account with code "${input.code}" already exists`
      });
    }
  }

  async updateAccountingAccount(
    id: string,
    input: UpdateAccountingAccountInput
  ): Promise<AccountingAccount> {
    try {
      const account = await this.prisma.accountingAccount.update({
        where: { id },
        data: input
      });

      return this.toAccountingAccount(account);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Accounting account with id "${id}" not found`,
        uniqueMessage:
          input.code !== undefined
            ? `Accounting account with code "${input.code}" already exists`
            : 'An accounting account with the same unique value already exists'
      });
    }
  }

  async removeAccountingAccount(id: string): Promise<void> {
    try {
      await this.prisma.accountingAccount.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Accounting account with id "${id}" not found`,
        relationMessage:
          'Cannot delete an accounting account that is already linked to journal entries or reconciliations'
      });
    }
  }

  async getAccountingAccountById(id: string): Promise<AccountingAccount> {
    const account = await this.prisma.accountingAccount.findUnique({
      where: { id }
    });

    if (!account) {
      throw new HttpError(404, `Accounting account with id "${id}" not found`);
    }

    return this.toAccountingAccount(account);
  }

  async listTreasuryAccounts(): Promise<TreasuryAccount[]> {
    const accounts = await this.prisma.treasuryAccount.findMany({
      orderBy: [{ name: 'asc' }]
    });

    return accounts.map((account: any) => this.toTreasuryAccount(account));
  }

  async createTreasuryAccount(input: CreateTreasuryAccountInput): Promise<TreasuryAccount> {
    try {
      const account = await this.prisma.treasuryAccount.create({
        data: {
          name: input.name,
          accountType: input.accountType,
          currency: input.currency,
          openingBalance: input.openingBalance,
          openingBalanceDate: new Date(input.openingBalanceDate),
          isActive: input.isActive,
          accountingAccountId: input.accountingAccountId ?? null
        }
      });

      return this.toTreasuryAccount(account);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Treasury account "${input.name}" already exists`,
        relationMessage: 'The linked accounting account reference is invalid'
      });
    }
  }

  async updateTreasuryAccount(
    id: string,
    input: UpdateTreasuryAccountInput
  ): Promise<TreasuryAccount> {
    try {
      const account = await this.prisma.treasuryAccount.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.openingBalance !== undefined ? { openingBalance: input.openingBalance } : {}),
          ...(input.openingBalanceDate !== undefined
            ? { openingBalanceDate: new Date(input.openingBalanceDate) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.accountingAccountId !== undefined
            ? { accountingAccountId: input.accountingAccountId ?? null }
            : {})
        }
      });

      return this.toTreasuryAccount(account);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Treasury account with id "${id}" not found`,
        uniqueMessage:
          input.name !== undefined
            ? `Treasury account "${input.name}" already exists`
            : 'A treasury account with the same unique value already exists',
        relationMessage: 'The linked accounting account reference is invalid'
      });
    }
  }

  async removeTreasuryAccount(id: string): Promise<void> {
    try {
      await this.prisma.treasuryAccount.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Treasury account with id "${id}" not found`,
        relationMessage:
          'Cannot delete a treasury account that is already linked to transactions or transfers'
      });
    }
  }

  async getTreasuryAccountById(id: string): Promise<TreasuryAccount> {
    const account = await this.prisma.treasuryAccount.findUnique({
      where: { id }
    });

    if (!account) {
      throw new HttpError(404, `Treasury account with id "${id}" not found`);
    }

    return this.toTreasuryAccount(account);
  }

  async listTreasuryTransfers(
    input: ListTreasuryTransfersQuery
  ): Promise<TreasuryTransferListQueryResult> {
    const where = this.buildTreasuryTransferWhereInput(input);
    const [transfers, total] = await this.prisma.$transaction([
      this.prisma.treasuryTransfer.findMany({
        where,
        orderBy: {
          [input.sortBy]: input.sortOrder
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.treasuryTransfer.count({
        where
      })
    ]);

    return {
      items: transfers.map((transfer: any) => this.toTreasuryTransfer(transfer)),
      total
    };
  }

  async createTreasuryTransfer(input: CreateTreasuryTransferInput): Promise<TreasuryTransfer> {
    try {
      const transfer = await this.prisma.treasuryTransfer.create({
        data: {
          fromTreasuryAccountId: input.fromTreasuryAccountId,
          toTreasuryAccountId: input.toTreasuryAccountId,
          amount: input.amount,
          transferDate: new Date(input.transferDate),
          referenceNumber: input.referenceNumber ?? null,
          description: input.description ?? null
        }
      });

      return this.toTreasuryTransfer(transfer);
    } catch (error) {
      this.rethrowKnownError(error, {
        relationMessage: 'The linked treasury account reference is invalid'
      });
    }
  }

  async updateTreasuryTransfer(
    id: string,
    input: UpdateTreasuryTransferInput
  ): Promise<TreasuryTransfer> {
    try {
      const transfer = await this.prisma.treasuryTransfer.update({
        where: { id },
        data: {
          ...(input.fromTreasuryAccountId !== undefined
            ? { fromTreasuryAccountId: input.fromTreasuryAccountId }
            : {}),
          ...(input.toTreasuryAccountId !== undefined
            ? { toTreasuryAccountId: input.toTreasuryAccountId }
            : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.transferDate !== undefined
            ? { transferDate: new Date(input.transferDate) }
            : {}),
          ...(input.referenceNumber !== undefined
            ? { referenceNumber: input.referenceNumber ?? null }
            : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {})
        }
      });

      return this.toTreasuryTransfer(transfer);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Treasury transfer with id "${id}" not found`,
        relationMessage: 'The linked treasury account reference is invalid'
      });
    }
  }

  async removeTreasuryTransfer(id: string): Promise<void> {
    try {
      await this.prisma.treasuryTransfer.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Treasury transfer with id "${id}" not found`
      });
    }
  }

  async getTreasuryTransferById(id: string): Promise<TreasuryTransfer> {
    const transfer = await this.prisma.treasuryTransfer.findUnique({
      where: { id }
    });

    if (!transfer) {
      throw new HttpError(404, `Treasury transfer with id "${id}" not found`);
    }

    return this.toTreasuryTransfer(transfer);
  }

  async listTreasuryTransfersByTreasuryAccountId(
    treasuryAccountId: string
  ): Promise<TreasuryTransfer[]> {
    const transfers = await this.prisma.treasuryTransfer.findMany({
      where: {
        OR: [{ fromTreasuryAccountId: treasuryAccountId }, { toTreasuryAccountId: treasuryAccountId }]
      },
      orderBy: { transferDate: 'asc' }
    });

    return transfers.map((transfer: any) => this.toTreasuryTransfer(transfer));
  }

  async listTransactions(input: ListTransactionsQuery): Promise<FinanceTransactionListQueryResult> {
    const where = this.buildTransactionWhereInput(input);
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.financeTransaction.findMany({
        where,
        orderBy: {
          [input.sortBy]: input.sortOrder
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.financeTransaction.count({
        where
      })
    ]);

    return {
      items: transactions.map((transaction: any) => this.toFinanceTransaction(transaction)),
      total
    };
  }

  async listTransactionsByTreasuryAccountId(treasuryAccountId: string): Promise<FinanceTransaction[]> {
    const transactions = await this.prisma.financeTransaction.findMany({
      where: { treasuryAccountId },
      orderBy: { transactionDate: 'asc' }
    });

    return transactions.map((transaction: any) => this.toFinanceTransaction(transaction));
  }

  async getTransactionById(id: string): Promise<FinanceTransaction> {
    const transaction = await this.prisma.financeTransaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      throw new HttpError(404, `Transaction with id "${id}" not found`);
    }

    return this.toFinanceTransaction(transaction);
  }

  async createTransaction(input: CreateTransactionInput): Promise<FinanceTransaction> {
    try {
      const transaction = await this.prisma.financeTransaction.create({
        data: {
          transactionTypeId: input.transactionTypeId,
          accountingCategory: input.accountingCategory,
          amount: input.amount,
          paymentMethodId: input.paymentMethodId,
          treasuryAccountId: input.treasuryAccountId ?? null,
          referenceNumber: input.referenceNumber ?? null,
          transactionDate: new Date(input.transactionDate),
          description: input.description ?? null,
          employeeId: input.employeeId ?? null,
          assetId: input.assetId ?? null,
          paySlipId: input.paySlipId ?? null,
          journalEntryId: input.journalEntryId ?? null
        }
      });

      return this.toFinanceTransaction(transaction);
    } catch (error) {
      this.rethrowKnownError(error, {
        relationMessage: 'One or more related finance references are invalid'
      });
    }
  }

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<FinanceTransaction> {
    try {
      const transaction = await this.prisma.financeTransaction.update({
        where: { id },
        data: {
          ...(input.transactionTypeId !== undefined
            ? { transactionTypeId: input.transactionTypeId }
            : {}),
          ...(input.accountingCategory !== undefined
            ? { accountingCategory: input.accountingCategory }
            : {}),
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.paymentMethodId !== undefined ? { paymentMethodId: input.paymentMethodId } : {}),
          ...(input.treasuryAccountId !== undefined
            ? { treasuryAccountId: input.treasuryAccountId ?? null }
            : {}),
          ...(input.referenceNumber !== undefined
            ? { referenceNumber: input.referenceNumber ?? null }
            : {}),
          ...(input.transactionDate !== undefined
            ? { transactionDate: new Date(input.transactionDate) }
            : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.employeeId !== undefined ? { employeeId: input.employeeId ?? null } : {}),
          ...(input.assetId !== undefined ? { assetId: input.assetId ?? null } : {}),
          ...(input.paySlipId !== undefined ? { paySlipId: input.paySlipId ?? null } : {}),
          ...(input.journalEntryId !== undefined
            ? { journalEntryId: input.journalEntryId ?? null }
            : {})
        }
      });

      return this.toFinanceTransaction(transaction);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Transaction with id "${id}" not found`,
        relationMessage: 'One or more related finance references are invalid'
      });
    }
  }

  async removeTransaction(id: string): Promise<void> {
    try {
      await this.prisma.financeTransaction.delete({
        where: { id }
      });
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Transaction with id "${id}" not found`
      });
    }
  }

  async getTransactionRelationSummary(id: string): Promise<FinanceTransactionRelationSummary> {
    await this.getTransactionById(id);

    const reconciliationItemsCount = await this.prisma.reconciliationItem.count({
      where: { transactionId: id }
    });

    return {
      reconciliationItemsCount
    };
  }

  async listJournalEntries(input: ListJournalEntriesQuery): Promise<JournalEntryListQueryResult> {
    const where = this.buildJournalEntryWhereInput(input);
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where,
        orderBy: {
          [input.sortBy]: input.sortOrder
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.journalEntry.count({
        where
      })
    ]);

    return {
      items: entries.map((entry: any) => this.toJournalEntry(entry)),
      total
    };
  }

  async getJournalEntryById(id: string): Promise<JournalEntry> {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      throw new HttpError(404, `Journal entry with id "${id}" not found`);
    }

    return this.toJournalEntry(entry);
  }

  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    try {
      const entry = await this.prisma.journalEntry.create({
        data: {
          entryNumber: input.entryNumber,
          entryDate: new Date(input.entryDate),
          description: input.description ?? null,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          status: input.status,
          postedBy: input.status === 'posted' ? input.postedBy ?? null : null,
          postedAt: input.status === 'posted' ? new Date() : null,
          lines: {
            create: input.lines.map((line) => ({
              accountId: line.accountId,
              debitAmount: line.debitAmount,
              creditAmount: line.creditAmount,
              description: line.description ?? null,
              employeeId: line.employeeId ?? null,
              assetId: line.assetId ?? null,
              paySlipId: line.paySlipId ?? null,
              referenceNumber: line.referenceNumber ?? null
            }))
          }
        }
      });

      return this.toJournalEntry(entry);
    } catch (error) {
      this.rethrowKnownError(error, {
        uniqueMessage: `Journal entry with entry number "${input.entryNumber}" already exists`,
        relationMessage: 'One or more related journal entry references are invalid'
      });
    }
  }

  async postJournalEntry(id: string, input: PostJournalEntryInput): Promise<JournalEntry> {
    try {
      const entry = await this.prisma.journalEntry.update({
        where: { id },
        data: {
          status: 'posted',
          postedBy: input.postedBy ?? null,
          postedAt: new Date()
        }
      });

      return this.toJournalEntry(entry);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Journal entry with id "${id}" not found`
      });
    }
  }

  async listJournalEntryLinesByEntryId(journalEntryId: string): Promise<JournalEntryLine[]> {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: { journalEntryId },
      orderBy: { createdAt: 'asc' }
    });

    return lines.map((line: any) => this.toJournalEntryLine(line));
  }

  async getJournalEntryLineById(id: string): Promise<JournalEntryLine> {
    const line = await this.prisma.journalEntryLine.findUnique({
      where: { id }
    });

    if (!line) {
      throw new HttpError(404, `Journal entry line with id "${id}" not found`);
    }

    return this.toJournalEntryLine(line);
  }

  async listReconciliations(
    input: ListReconciliationsQuery
  ): Promise<ReconciliationListQueryResult> {
    const where = this.buildReconciliationWhereInput(input);
    const [reconciliations, total] = await this.prisma.$transaction([
      this.prisma.reconciliation.findMany({
        where,
        orderBy: {
          [input.sortBy]: input.sortOrder
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize
      }),
      this.prisma.reconciliation.count({
        where
      })
    ]);

    return {
      items: reconciliations.map((reconciliation: any) => this.toReconciliation(reconciliation)),
      total
    };
  }

  async getReconciliationById(id: string): Promise<Reconciliation> {
    const reconciliation = await this.prisma.reconciliation.findUnique({
      where: { id }
    });

    if (!reconciliation) {
      throw new HttpError(404, `Reconciliation with id "${id}" not found`);
    }

    return this.toReconciliation(reconciliation);
  }

  async createReconciliation(input: CreateReconciliationInput): Promise<Reconciliation> {
    try {
      const reconciliation = await this.prisma.reconciliation.create({
        data: {
          reconciliationType: input.reconciliationType,
          accountId: input.accountId,
          statementStartDate: new Date(input.statementStartDate),
          statementEndDate: new Date(input.statementEndDate),
          statementBalance: input.statementBalance,
          bookBalance: input.bookBalance,
          status: input.status,
          closedBy: input.status === 'closed' ? input.closedBy ?? null : null,
          closedAt: input.status === 'closed' ? new Date() : null
        }
      });

      return this.toReconciliation(reconciliation);
    } catch (error) {
      this.rethrowKnownError(error, {
        relationMessage: 'The reconciliation account reference is invalid'
      });
    }
  }

  async closeReconciliation(
    id: string,
    input: CloseReconciliationInput
  ): Promise<Reconciliation> {
    try {
      const reconciliation = await this.prisma.reconciliation.update({
        where: { id },
        data: {
          status: 'closed',
          closedBy: input.closedBy ?? null,
          closedAt: new Date()
        }
      });

      return this.toReconciliation(reconciliation);
    } catch (error) {
      this.rethrowKnownError(error, {
        notFoundMessage: `Reconciliation with id "${id}" not found`
      });
    }
  }

  async listReconciliationItemsByReconciliationId(
    reconciliationId: string
  ): Promise<ReconciliationItem[]> {
    const items = await this.prisma.reconciliationItem.findMany({
      where: { reconciliationId },
      orderBy: { matchedAt: 'desc' }
    });

    return items.map((item: any) => this.toReconciliationItem(item));
  }

  async createReconciliationItem(
    reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<ReconciliationItem> {
    try {
      const item = await this.prisma.reconciliationItem.create({
        data: {
          reconciliationId,
          transactionId: input.transactionId ?? null,
          journalEntryLineId: input.journalEntryLineId ?? null
        }
      });

      return this.toReconciliationItem(item);
    } catch (error) {
      this.rethrowKnownError(error, {
        relationMessage: 'The reconciliation source reference is invalid'
      });
    }
  }

  async hasReconciliationItemLink(
    _reconciliationId: string,
    input: CreateReconciliationItemInput
  ): Promise<boolean> {
    return (
      (await this.prisma.reconciliationItem.count({
        where: {
          OR: [
            ...(input.transactionId ? [{ transactionId: input.transactionId }] : []),
            ...(input.journalEntryLineId
              ? [{ journalEntryLineId: input.journalEntryLineId }]
              : [])
          ]
        }
      })) > 0
    );
  }

  private buildTransactionWhereInput(input: ListTransactionsQuery) {
    const search = input.search
      ? {
          OR: [
            {
              accountingCategory: {
                contains: input.search,
                mode: 'insensitive' as const
              }
            },
            {
              referenceNumber: {
                contains: input.search,
                mode: 'insensitive' as const
              }
            },
            {
              description: {
                contains: input.search,
                mode: 'insensitive' as const
              }
            }
          ]
        }
      : undefined;

    return {
      ...(input.transactionTypeId ? { transactionTypeId: input.transactionTypeId } : {}),
      ...(input.paymentMethodId ? { paymentMethodId: input.paymentMethodId } : {}),
      ...(input.treasuryAccountId ? { treasuryAccountId: input.treasuryAccountId } : {}),
      ...(input.assetId ? { assetId: input.assetId } : {}),
      ...(input.accountingCategory ? { accountingCategory: input.accountingCategory } : {}),
      ...(input.dateFrom || input.dateTo
        ? {
            transactionDate: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {})
            }
          }
        : {}),
      ...(search ?? {})
    };
  }

  private buildTreasuryTransferWhereInput(input: ListTreasuryTransfersQuery) {
    const search = input.search
      ? {
          OR: [
            { referenceNumber: { contains: input.search, mode: 'insensitive' as const } },
            { description: { contains: input.search, mode: 'insensitive' as const } }
          ]
        }
      : undefined;

    return {
      ...(input.fromTreasuryAccountId
        ? { fromTreasuryAccountId: input.fromTreasuryAccountId }
        : {}),
      ...(input.toTreasuryAccountId ? { toTreasuryAccountId: input.toTreasuryAccountId } : {}),
      ...(input.dateFrom || input.dateTo
        ? {
            transferDate: {
              ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
              ...(input.dateTo ? { lte: new Date(input.dateTo) } : {})
            }
          }
        : {}),
      ...(search ?? {})
    };
  }

  private buildJournalEntryWhereInput(input: ListJournalEntriesQuery) {
    const search = input.search
      ? {
          OR: [
            { entryNumber: { contains: input.search, mode: 'insensitive' as const } },
            { description: { contains: input.search, mode: 'insensitive' as const } }
          ]
        }
      : undefined;

    return {
      ...(input.status ? { status: input.status } : {}),
      ...(input.periodYear ? { periodYear: input.periodYear } : {}),
      ...(input.periodMonth ? { periodMonth: input.periodMonth } : {}),
      ...(search ?? {})
    };
  }

  private buildReconciliationWhereInput(input: ListReconciliationsQuery) {
    return {
      ...(input.status ? { status: input.status } : {}),
      ...(input.accountId ? { accountId: input.accountId } : {}),
      ...(input.reconciliationType
        ? { reconciliationType: input.reconciliationType }
        : {})
    };
  }

  private rethrowKnownError(
    error: unknown,
    options: {
      notFoundMessage?: string;
      uniqueMessage?: string;
      relationMessage?: string;
    }
  ): never {
    if (error instanceof TenantPrisma.PrismaClientKnownRequestError) {
      const knownError = error as InstanceType<typeof TenantPrisma.PrismaClientKnownRequestError>;

      if (knownError.code === 'P2025' && options.notFoundMessage) {
        throw new HttpError(404, options.notFoundMessage);
      }

      if (knownError.code === 'P2002') {
        throw new HttpError(
          409,
          options.uniqueMessage ?? 'A resource with the same unique value already exists',
          {
            target: knownError.meta?.target ?? null
          }
        );
      }

      if (knownError.code === 'P2003') {
        throw new HttpError(
          409,
          options.relationMessage ?? 'A related resource reference is invalid',
          {
            target: knownError.meta?.field_name ?? null
          }
        );
      }
    }

    throw error;
  }

  private toPaymentMethod(method: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentMethod {
    return {
      id: method.id,
      name: method.name,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString()
    };
  }

  private toTransactionType(transactionType: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): TransactionType {
    return {
      id: transactionType.id,
      name: transactionType.name,
      createdAt: transactionType.createdAt.toISOString(),
      updatedAt: transactionType.updatedAt.toISOString()
    };
  }

  private toAccountingAccount(account: {
    id: string;
    code: string;
    name: string;
    accountType: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AccountingAccount {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType as AccountingAccount['accountType'],
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  }

  private toTreasuryAccount(account: {
    id: string;
    name: string;
    accountType: string;
    currency: string;
    openingBalance: TenantDecimal;
    openingBalanceDate: Date;
    isActive: boolean;
    accountingAccountId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TreasuryAccount {
    return {
      id: account.id,
      name: account.name,
      accountType: account.accountType as TreasuryAccount['accountType'],
      currency: account.currency,
      openingBalance: account.openingBalance.toNumber(),
      openingBalanceDate: account.openingBalanceDate.toISOString().slice(0, 10),
      isActive: account.isActive,
      accountingAccountId: account.accountingAccountId ?? undefined,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  }

  private toTreasuryTransfer(transfer: {
    id: string;
    fromTreasuryAccountId: string;
    toTreasuryAccountId: string;
    amount: TenantDecimal;
    transferDate: Date;
    referenceNumber: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TreasuryTransfer {
    return {
      id: transfer.id,
      fromTreasuryAccountId: transfer.fromTreasuryAccountId,
      toTreasuryAccountId: transfer.toTreasuryAccountId,
      amount: transfer.amount.toNumber(),
      transferDate: transfer.transferDate.toISOString().slice(0, 10),
      referenceNumber: transfer.referenceNumber ?? undefined,
      description: transfer.description ?? undefined,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString()
    };
  }

  private toFinanceTransaction(transaction: {
    id: string;
    transactionTypeId: string;
    accountingCategory: string;
    amount: TenantDecimal;
    paymentMethodId: string;
    treasuryAccountId: string | null;
    referenceNumber: string | null;
    transactionDate: Date;
    description: string | null;
    employeeId: string | null;
    assetId: string | null;
    paySlipId: string | null;
    journalEntryId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): FinanceTransaction {
    return {
      id: transaction.id,
      transactionTypeId: transaction.transactionTypeId,
      accountingCategory: transaction.accountingCategory,
      amount: transaction.amount.toNumber(),
      paymentMethodId: transaction.paymentMethodId,
      treasuryAccountId: transaction.treasuryAccountId ?? undefined,
      referenceNumber: transaction.referenceNumber ?? undefined,
      transactionDate: transaction.transactionDate.toISOString().slice(0, 10),
      description: transaction.description ?? undefined,
      employeeId: transaction.employeeId ?? undefined,
      assetId: transaction.assetId ?? undefined,
      paySlipId: transaction.paySlipId ?? undefined,
      journalEntryId: transaction.journalEntryId ?? undefined,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
  }

  private toJournalEntry(entry: {
    id: string;
    entryNumber: string;
    entryDate: Date;
    description: string | null;
    periodYear: number;
    periodMonth: number;
    status: string;
    postedAt: Date | null;
    postedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): JournalEntry {
    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate.toISOString().slice(0, 10),
      description: entry.description ?? undefined,
      periodYear: entry.periodYear,
      periodMonth: entry.periodMonth,
      status: entry.status as JournalEntry['status'],
      postedBy: entry.postedBy ?? undefined,
      postedAt: entry.postedAt?.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    };
  }

  private toJournalEntryLine(line: {
    id: string;
    journalEntryId: string;
    accountId: string;
    debitAmount: TenantDecimal;
    creditAmount: TenantDecimal;
    description: string | null;
    employeeId: string | null;
    assetId: string | null;
    paySlipId: string | null;
    referenceNumber: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): JournalEntryLine {
    return {
      id: line.id,
      journalEntryId: line.journalEntryId,
      accountId: line.accountId,
      debitAmount: line.debitAmount.toNumber(),
      creditAmount: line.creditAmount.toNumber(),
      description: line.description ?? undefined,
      employeeId: line.employeeId ?? undefined,
      assetId: line.assetId ?? undefined,
      paySlipId: line.paySlipId ?? undefined,
      referenceNumber: line.referenceNumber ?? undefined,
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString()
    };
  }

  private toReconciliation(reconciliation: {
    id: string;
    reconciliationType: string;
    accountId: string;
    statementStartDate: Date;
    statementEndDate: Date;
    statementBalance: TenantDecimal;
    bookBalance: TenantDecimal;
    status: string;
    closedAt: Date | null;
    closedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Reconciliation {
    return {
      id: reconciliation.id,
      reconciliationType: reconciliation.reconciliationType,
      accountId: reconciliation.accountId,
      statementStartDate: reconciliation.statementStartDate.toISOString().slice(0, 10),
      statementEndDate: reconciliation.statementEndDate.toISOString().slice(0, 10),
      statementBalance: reconciliation.statementBalance.toNumber(),
      bookBalance: reconciliation.bookBalance.toNumber(),
      status: reconciliation.status as Reconciliation['status'],
      closedBy: reconciliation.closedBy ?? undefined,
      closedAt: reconciliation.closedAt?.toISOString(),
      createdAt: reconciliation.createdAt.toISOString(),
      updatedAt: reconciliation.updatedAt.toISOString()
    };
  }

  private toReconciliationItem(item: {
    id: string;
    reconciliationId: string;
    transactionId: string | null;
    journalEntryLineId: string | null;
    matchedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): ReconciliationItem {
    return {
      id: item.id,
      reconciliationId: item.reconciliationId,
      transactionId: item.transactionId ?? undefined,
      journalEntryLineId: item.journalEntryLineId ?? undefined,
      matchedAt: item.matchedAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }
}
