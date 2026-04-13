import {
  type CloseReconciliationInput,
  type CreateAccountingAccountInput,
  type CreateJournalEntryInput,
  type CreateJournalEntryLineInput,
  type CreatePaymentMethodInput,
  type CreateTreasuryAccountInput,
  type CreateTreasuryTransferInput,
  type CreateReconciliationInput,
  type CreateReconciliationItemInput,
  type CreateTransactionInput,
  type CreateTransactionTypeInput
} from './finance.schema';
import { type PaginatedResult } from '../../shared/pagination';

type EntityTimestamps = {
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethod = EntityTimestamps &
  CreatePaymentMethodInput & {
    id: string;
  };

export type TransactionType = EntityTimestamps &
  CreateTransactionTypeInput & {
    id: string;
  };

export type AccountingAccount = EntityTimestamps &
  CreateAccountingAccountInput & {
    id: string;
  };

export type TreasuryAccount = EntityTimestamps &
  CreateTreasuryAccountInput & {
    id: string;
  };

export type TreasuryAccountDetails = TreasuryAccount & {
  accountingAccount: AccountingAccount | null;
  inflowTotal: number;
  outflowTotal: number;
  transferInTotal: number;
  transferOutTotal: number;
  currentBalance: number;
  transactionCount: number;
  transferCount: number;
};

export type TreasuryTransfer = EntityTimestamps &
  CreateTreasuryTransferInput & {
    id: string;
  };

export type TreasuryTransferDetails = TreasuryTransfer & {
  fromTreasuryAccount: TreasuryAccount | null;
  toTreasuryAccount: TreasuryAccount | null;
};

export type TreasuryTransferListResult = PaginatedResult<TreasuryTransferDetails>;

export type TreasuryTransferListQueryResult = {
  items: TreasuryTransfer[];
  total: number;
};

export type FinanceTransaction = EntityTimestamps &
  CreateTransactionInput & {
    id: string;
  };

export type FinanceTransactionDetails = FinanceTransaction & {
  paymentMethod: PaymentMethod | null;
  transactionType: TransactionType | null;
  treasuryAccount: TreasuryAccountDetails | null;
};

export type FinanceTransactionListResult = PaginatedResult<FinanceTransactionDetails>;

export type FinanceTransactionListQueryResult = {
  items: FinanceTransaction[];
  total: number;
};

export type FinanceTransactionRelationSummary = {
  reconciliationItemsCount: number;
};

export type JournalEntryLine = EntityTimestamps &
  CreateJournalEntryLineInput & {
    id: string;
    journalEntryId: string;
  };

export type JournalEntry = EntityTimestamps &
  Omit<CreateJournalEntryInput, 'lines'> & {
    id: string;
    postedAt?: string;
  };

export type JournalEntryDetails = JournalEntry & {
  lines: JournalEntryLine[];
};

export type JournalEntryListResult = PaginatedResult<JournalEntryDetails>;

export type JournalEntryListQueryResult = {
  items: JournalEntry[];
  total: number;
};

export type ReconciliationItem = EntityTimestamps &
  CreateReconciliationItemInput & {
    id: string;
    reconciliationId: string;
    matchedAt: string;
  };

export type Reconciliation = EntityTimestamps &
  CreateReconciliationInput & {
    id: string;
    closedAt?: string;
  };

export type ReconciliationDetails = Reconciliation & {
  account: AccountingAccount | null;
  items: ReconciliationItem[];
};

export type ReconciliationListResult = PaginatedResult<ReconciliationDetails>;

export type ReconciliationListQueryResult = {
  items: Reconciliation[];
  total: number;
};

export type FinanceOverview = {
  module: 'finance';
  description: string;
  ready: boolean;
  extensible: boolean;
  boundaries: string[];
};

export type ReconciliationCloseResult = Reconciliation &
  Required<Pick<CloseReconciliationInput, 'closedBy'>>;
