import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';

import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { replaceRequestSection, toCamelCaseRequest } from '../../shared/http/request-case';
import { toSnakeCaseResponse } from '../../shared/http/response-case';
import { HttpError } from '../../shared/http-error';
import { FinanceController } from './finance.controller';
import { createFinanceRoutes } from './finance.routes';
import { InMemoryFinanceRepository } from './finance.repository';
import { FinanceService } from './finance.service';

function createFinanceTestContext() {
  const repository = new InMemoryFinanceRepository();
  const service = new FinanceService(repository);
  const controller = new FinanceController(service);
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
      replaceRequestSection(req.body, toCamelCaseRequest(req.body));
    }

    if (req.query && typeof req.query === 'object') {
      replaceRequestSection(req.query, toCamelCaseRequest(req.query));
    }

    if (req.params && typeof req.params === 'object') {
      replaceRequestSection(req.params, toCamelCaseRequest(req.params));
    }

    next();
  });
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => originalJson(toSnakeCaseResponse(body))) as Response['json'];

    next();
  });

  app.use('/api/finance', createFinanceRoutes(controller));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        requestId: res.locals.requestId ?? null,
        issues: error.flatten()
      });
    }

    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        message: error.message,
        requestId: res.locals.requestId ?? null,
        details: error.details ?? null
      });
    }

    return res.status(500).json({
      message: 'Internal server error',
      requestId: res.locals.requestId ?? null
    });
  });

  return { app, repository, service };
}

async function withFinanceServer(
  run: (context: {
    repository: InMemoryFinanceRepository;
    service: FinanceService;
    request: (
      path: string,
      init?: Omit<RequestInit, 'body'> & {
        body?: unknown;
      }
    ) => Promise<{ status: number; body: any }>;
  }) => Promise<void>
) {
  const context = createFinanceTestContext();
  const server = context.app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to start finance test server');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run({
      repository: context.repository,
      service: context.service,
      request: async (path, init = {}) => {
        const response = await fetch(`${baseUrl}${path}`, {
          ...init,
          headers: {
            ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
            ...(init.headers ?? {})
          },
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined
        });
        const text = await response.text();

        return {
          status: response.status,
          body: text.length > 0 ? JSON.parse(text) : null
        };
      }
    });
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('finance HTTP routes accept snake_case input and return snake_case pagination', async () => {
  await withFinanceServer(async ({ repository, request }) => {
    const [paymentMethod] = await repository.listPaymentMethods();
    const [transactionType] = await repository.listTransactionTypes();

    if (!paymentMethod || !transactionType) {
      throw new Error('Missing seeded finance references');
    }

    const created = await request('/api/finance/transactions', {
      method: 'POST',
      body: {
        transaction_type_id: transactionType.id,
        accounting_category: 'office-supplies',
        amount: 42,
        payment_method_id: paymentMethod.id,
        reference_number: 'TX-HTTP-001',
        transaction_date: '2026-03-24',
        description: 'Keyboard and mouse'
      }
    });

    assert.equal(created.status, 201);
    assert.equal(created.body?.data?.transaction_type_id, transactionType.id);
    assert.equal(created.body?.data?.payment_method_id, paymentMethod.id);

    const listed = await request('/api/finance/transactions?sort_by=transaction_date&sort_order=asc');

    assert.equal(listed.status, 200);
    assert.equal(listed.body?.pagination?.page_size, 20);
    assert.equal(listed.body?.pagination?.count, 1);
    assert.equal(listed.body?.data?.[0]?.reference_number, 'TX-HTTP-001');
    assert.equal(listed.body?.data?.[0]?.transaction_type?.id, transactionType.id);
  });
});

test('finance HTTP routes reject transaction updates once reconciled', async () => {
  await withFinanceServer(async ({ repository, service, request }) => {
    const [paymentMethod] = await repository.listPaymentMethods();
    const [transactionType] = await repository.listTransactionTypes();
    const [account] = await repository.listAccountingAccounts();

    if (!paymentMethod || !transactionType || !account) {
      throw new Error('Missing seeded finance references');
    }

    const transaction = await service.createTransaction({
      transactionTypeId: transactionType.id,
      accountingCategory: 'bank-fees',
      amount: 30,
      paymentMethodId: paymentMethod.id,
      transactionDate: '2026-03-24'
    });
    const reconciliation = await service.createReconciliation({
      reconciliationType: 'bank',
      accountId: account.id,
      statementStartDate: '2026-03-01',
      statementEndDate: '2026-03-31',
      statementBalance: 900,
      bookBalance: 870,
      status: 'open'
    });

    await service.addReconciliationItem(reconciliation.id, {
      transactionId: transaction.id
    });

    const response = await request(`/api/finance/transactions/${transaction.id}`, {
      method: 'PATCH',
      body: {
        description: 'Should be blocked'
      }
    });

    assert.equal(response.status, 409);
    assert.match(response.body?.message ?? '', /already linked to reconciliation items/i);
  });
});

test('finance HTTP routes reject closing an empty reconciliation', async () => {
  await withFinanceServer(async ({ repository, service, request }) => {
    const [account] = await repository.listAccountingAccounts();

    if (!account) {
      throw new Error('Missing seeded finance account');
    }

    const reconciliation = await service.createReconciliation({
      reconciliationType: 'bank',
      accountId: account.id,
      statementStartDate: '2026-03-01',
      statementEndDate: '2026-03-31',
      statementBalance: 1000,
      bookBalance: 1000,
      status: 'open'
    });

    const response = await request(`/api/finance/reconciliations/${reconciliation.id}/close`, {
      method: 'POST',
      body: {}
    });

    assert.equal(response.status, 409);
    assert.match(response.body?.message ?? '', /without matched items/i);
  });
});

test('finance HTTP routes reject draft journal entry lines in reconciliations', async () => {
  await withFinanceServer(async ({ repository, service, request }) => {
    const accounts = await repository.listAccountingAccounts();
    const expenseAccount = accounts[0];
    const cashAccount = accounts[1];

    if (!expenseAccount || !cashAccount) {
      throw new Error('Missing seeded finance accounts');
    }

    const journalEntry = await service.createJournalEntry({
      entryNumber: 'JE-HTTP-001',
      entryDate: '2026-03-24',
      periodYear: 2026,
      periodMonth: 3,
      status: 'draft',
      lines: [
        {
          accountId: expenseAccount.id,
          debitAmount: 120,
          creditAmount: 0
        },
        {
          accountId: cashAccount.id,
          debitAmount: 0,
          creditAmount: 120
        }
      ]
    });
    const reconciliation = await service.createReconciliation({
      reconciliationType: 'bank',
      accountId: expenseAccount.id,
      statementStartDate: '2026-03-01',
      statementEndDate: '2026-03-31',
      statementBalance: 1000,
      bookBalance: 880,
      status: 'open'
    });

    const response = await request(`/api/finance/reconciliations/${reconciliation.id}/items`, {
      method: 'POST',
      body: {
        journal_entry_line_id: journalEntry.lines[0]?.id
      }
    });

    assert.equal(response.status, 409);
    assert.match(response.body?.message ?? '', /posted journal entries/i);
  });
});
