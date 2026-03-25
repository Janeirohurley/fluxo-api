export type PayrollEmployeeSummary = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email?: string;
  status: string;
};

export type PayrollContract = {
  id: string;
  employeeId: string;
  employee: PayrollEmployeeSummary;
  contractType: string;
  status: string;
  startDate: string;
  endDate?: string;
  salaryAmount: number;
  currency: string;
  paymentFrequency: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPaySlipLine = {
  id: string;
  paySlipId: string;
  lineType: string;
  label: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollLinkedTransaction = {
  id: string;
  amount: number;
  transactionDate: string;
  accountingCategory: string;
  referenceNumber?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollLinkedJournalEntry = {
  id: string;
  entryNumber: string;
  entryDate: string;
  status: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPaySlip = {
  id: string;
  employeeId: string;
  contractId: string;
  employee: PayrollEmployeeSummary;
  contract: PayrollContract;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate?: string;
  issuedAt?: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  currency: string;
  status: string;
  notes?: string;
  lines: PayrollPaySlipLine[];
  linkedTransactionsCount: number;
  linkedJournalLinesCount: number;
  linkedTransactions?: PayrollLinkedTransaction[];
  linkedJournalEntries?: PayrollLinkedJournalEntry[];
  createdAt: string;
  updatedAt: string;
};

export type PayrollContractListQueryResult = {
  items: PayrollContract[];
  total: number;
};

export type PayrollPaySlipListQueryResult = {
  items: PayrollPaySlip[];
  total: number;
};

export type PayrollOverview = {
  module: 'payroll';
  description: string;
  ready: boolean;
  boundaries: string[];
  kpis: {
    activeContracts: number;
    totalPaySlips: number;
    draftPaySlips: number;
    issuedPaySlips: number;
    paidPaySlips: number;
    cancelledPaySlips: number;
    grossAmountTotal: number;
    netAmountTotal: number;
  };
  recentPaySlips: PayrollPaySlip[];
};

export type PayrollJournalEntryLink = {
  paySlip: PayrollPaySlip;
  journalEntry: PayrollLinkedJournalEntry;
};

export type PayrollPaymentRegistration = {
  paySlip: PayrollPaySlip;
  transaction: PayrollLinkedTransaction;
};

export type PayrollPayRunGenerationSkippedItem = {
  contractId: string;
  employeeId: string;
  employeeName: string;
  reason: string;
};

export type PayrollPayRunGenerationResult = {
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate?: string;
  createdCount: number;
  skippedCount: number;
  created: PayrollPaySlip[];
  skipped: PayrollPayRunGenerationSkippedItem[];
};
