import assert from 'node:assert/strict';
import test from 'node:test';

import { createPaySlipSchema, generatePayRunSchema, updatePaySlipSchema } from './payroll.schema';

test('createPaySlipSchema accepts a valid payload', () => {
  const payload = createPaySlipSchema.parse({
    employeeId: '11111111-1111-4111-8111-111111111111',
    contractId: '22222222-2222-4222-8222-222222222222',
    payPeriodStart: '2026-03-01',
    payPeriodEnd: '2026-03-31',
    paymentDate: '2026-03-31',
    currency: 'BIF',
    lines: [
      {
        lineType: 'earning',
        label: 'Base salary',
        amount: 1000
      },
      {
        lineType: 'tax',
        label: 'PAYE',
        amount: 100
      }
    ]
  });

  assert.equal(payload.lines.length, 2);
  assert.equal(payload.currency, 'BIF');
});

test('createPaySlipSchema rejects invalid pay periods', () => {
  assert.throws(
    () =>
      createPaySlipSchema.parse({
        employeeId: '11111111-1111-4111-8111-111111111111',
        contractId: '22222222-2222-4222-8222-222222222222',
        payPeriodStart: '2026-03-31',
        payPeriodEnd: '2026-03-01',
        lines: [
          {
            lineType: 'earning',
            label: 'Base salary',
            amount: 1000
          }
        ]
      }),
    /Pay period end cannot be before pay period start/
  );
});

test('updatePaySlipSchema rejects empty payloads', () => {
  assert.throws(() => updatePaySlipSchema.parse({}), /At least one field must be provided/);
});

test('generatePayRunSchema accepts a valid batch payload and defaults earningLabel', () => {
  const payload = generatePayRunSchema.parse({
    payPeriodStart: '2026-04-01',
    payPeriodEnd: '2026-04-30',
    paymentDate: '2026-04-30',
    contractIds: ['22222222-2222-4222-8222-222222222222']
  });

  assert.equal(payload.earningLabel, 'Base salary');
  assert.equal(payload.contractIds?.length, 1);
});
