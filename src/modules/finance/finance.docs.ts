export function getFinanceModuleDocumentation() {
  return {
    module: 'finance',
    version: '1.0.0',
    basePath: '/api/finance',
    description:
      'Finance module based on the PDF schema, covering transactions, accounting accounts, journal entries, reconciliations and supporting references.',
    storage: {
      default: 'prisma',
      fallback: 'memory',
      overrideEnv: 'FINANCE_STORAGE=memory'
    },
    authentication: {
      type: 'apiKey',
      headers: ['x-module-key', 'x-api-key', 'Authorization: Bearer <key>'],
      requiredPlanModules: ['finance']
    },
    routes: [
      { method: 'GET', path: '/api/finance/docs', description: 'Returns this module documentation' },
      { method: 'GET', path: '/api/finance/payment-methods', description: 'Lists payment methods' },
      { method: 'POST', path: '/api/finance/payment-methods', description: 'Creates a payment method' },
      { method: 'PATCH', path: '/api/finance/payment-methods/:id', description: 'Updates a payment method' },
      { method: 'DELETE', path: '/api/finance/payment-methods/:id', description: 'Deletes a payment method when it is unused' },
      { method: 'GET', path: '/api/finance/transaction-types', description: 'Lists transaction types' },
      { method: 'POST', path: '/api/finance/transaction-types', description: 'Creates a transaction type' },
      { method: 'PATCH', path: '/api/finance/transaction-types/:id', description: 'Updates a transaction type' },
      { method: 'DELETE', path: '/api/finance/transaction-types/:id', description: 'Deletes a transaction type when it is unused' },
      { method: 'GET', path: '/api/finance/accounts', description: 'Lists accounting accounts' },
      { method: 'POST', path: '/api/finance/accounts', description: 'Creates an accounting account' },
      { method: 'PATCH', path: '/api/finance/accounts/:id', description: 'Updates an accounting account' },
      { method: 'DELETE', path: '/api/finance/accounts/:id', description: 'Deletes an accounting account when it is unused' },
      { method: 'GET', path: '/api/finance/treasury-accounts', description: 'Lists treasury accounts with current balances' },
      { method: 'POST', path: '/api/finance/treasury-accounts', description: 'Creates a treasury account' },
      { method: 'PATCH', path: '/api/finance/treasury-accounts/:id', description: 'Updates a treasury account' },
      { method: 'DELETE', path: '/api/finance/treasury-accounts/:id', description: 'Deletes a treasury account when it is unused' },
      { method: 'GET', path: '/api/finance/transfers', description: 'Lists internal treasury transfers with pagination and filters' },
      { method: 'POST', path: '/api/finance/transfers', description: 'Creates an internal treasury transfer' },
      { method: 'PATCH', path: '/api/finance/transfers/:id', description: 'Updates an internal treasury transfer' },
      { method: 'DELETE', path: '/api/finance/transfers/:id', description: 'Deletes an internal treasury transfer' },
      { method: 'GET', path: '/api/finance/transactions', description: 'Lists transactions with pagination and filters' },
      { method: 'POST', path: '/api/finance/transactions', description: 'Creates a transaction' },
      { method: 'GET', path: '/api/finance/transactions/:id', description: 'Returns one transaction with reference details' },
      { method: 'PATCH', path: '/api/finance/transactions/:id', description: 'Updates a transaction' },
      { method: 'DELETE', path: '/api/finance/transactions/:id', description: 'Deletes a transaction when it is not used in reconciliation' },
      { method: 'GET', path: '/api/finance/journal-entries', description: 'Lists journal entries with pagination and filters' },
      { method: 'POST', path: '/api/finance/journal-entries', description: 'Creates a balanced journal entry with its lines' },
      { method: 'GET', path: '/api/finance/journal-entries/:id', description: 'Returns one journal entry with its lines' },
      { method: 'POST', path: '/api/finance/journal-entries/:id/post', description: 'Posts a draft journal entry' },
      { method: 'GET', path: '/api/finance/reconciliations', description: 'Lists reconciliations with pagination and filters' },
      { method: 'POST', path: '/api/finance/reconciliations', description: 'Creates a reconciliation' },
      { method: 'GET', path: '/api/finance/reconciliations/:id', description: 'Returns one reconciliation with its items' },
      { method: 'POST', path: '/api/finance/reconciliations/:id/close', description: 'Closes a reconciliation' },
      { method: 'POST', path: '/api/finance/reconciliations/:id/items', description: 'Attaches a transaction or journal entry line to a reconciliation' }
    ],
    samplePayloads: {
      createPaymentMethod: {
        name: 'bank-transfer'
      },
      createTransactionType: {
        name: 'expense'
      },
      createAccountingAccount: {
        code: '5000',
        name: 'Operating Expense',
        accountType: 'expense',
        isActive: true
      },
      createTreasuryTransfer: {
        fromTreasuryAccountId: 'f0f0f0f0-0000-4000-8000-000000000001',
        toTreasuryAccountId: 'f0f0f0f0-0000-4000-8000-000000000002',
        amount: 100000,
        transferDate: '2026-04-13',
        referenceNumber: 'TR-2026-001',
        description: 'Bank withdrawal to petty cash'
      },
      createTransaction: {
        transactionTypeId: '11111111-1111-1111-1111-111111111111',
        accountingCategory: 'office-supplies',
        amount: 120.5,
        paymentMethodId: '22222222-2222-2222-2222-222222222222',
        treasuryAccountId: '77777777-7777-7777-7777-777777777777',
        referenceNumber: 'TXN-1001',
        transactionDate: '2026-03-24',
        description: 'Office supplies purchase'
      },
      createTreasuryAccount: {
        name: 'Main Bank',
        accountType: 'bank',
        currency: 'BIF',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        isActive: true
      },
      createJournalEntry: {
        entryNumber: 'JE-2026-0001',
        entryDate: '2026-03-24',
        description: 'Office supplies expense booking',
        periodYear: 2026,
        periodMonth: 3,
        status: 'draft',
        lines: [
          {
            accountId: '33333333-3333-3333-3333-333333333333',
            debitAmount: 120.5,
            creditAmount: 0
          },
          {
            accountId: '44444444-4444-4444-4444-444444444444',
            debitAmount: 0,
            creditAmount: 120.5
          }
        ]
      },
      createReconciliation: {
        reconciliationType: 'bank',
        accountId: '55555555-5555-5555-5555-555555555555',
        statementStartDate: '2026-03-01',
        statementEndDate: '2026-03-31',
        statementBalance: 15230.4,
        bookBalance: 15190.4,
        status: 'open'
      },
      createReconciliationItem: {
        transactionId: '66666666-6666-6666-6666-666666666666'
      }
    }
  };
}
