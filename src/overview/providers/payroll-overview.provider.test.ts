import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPayrollInsights } from './payroll-overview.provider';

test('buildPayrollInsights returns an empty-state insight when there are no payslips', () => {
  const insights = buildPayrollInsights({
    totalPaySlips: 0,
    draftPaySlips: 0,
    issuedPaySlips: 0,
    paidPaySlips: 0,
    activeContracts: 3
  });

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.code, 'payroll_empty');
});

test('buildPayrollInsights flags pending drafts and unpaid issued payslips', () => {
  const insights = buildPayrollInsights({
    totalPaySlips: 8,
    draftPaySlips: 2,
    issuedPaySlips: 3,
    paidPaySlips: 0,
    activeContracts: 5
  });

  assert.ok(insights.some((insight) => insight.code === 'payroll_drafts_pending'));
  assert.ok(insights.some((insight) => insight.code === 'payroll_issued_pending_payment'));
  assert.ok(insights.some((insight) => insight.code === 'payroll_no_paid_payslips'));
});
