import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEmployeesOverviewInsights } from './employees-overview.provider';

test('buildEmployeesOverviewInsights returns an empty-state insight when there are no employees', () => {
  const insights = buildEmployeesOverviewInsights({
    totalEmployees: 0,
    activeEmployees: 0,
    employeesWithoutAssignment: 0,
    activeEmployeesWithoutContract: 0,
    terminatedEmployeesWithActiveContract: 0
  });

  assert.equal(insights.length, 1);
  assert.equal(insights[0]?.code, 'employees_empty');
});

test('buildEmployeesOverviewInsights flags assignment and contract gaps', () => {
  const insights = buildEmployeesOverviewInsights({
    totalEmployees: 10,
    activeEmployees: 8,
    employeesWithoutAssignment: 3,
    activeEmployeesWithoutContract: 2,
    terminatedEmployeesWithActiveContract: 1
  });

  assert.ok(insights.some((insight) => insight.code === 'employees_without_assignment'));
  assert.ok(insights.some((insight) => insight.code === 'employees_active_without_contract'));
  assert.ok(
    insights.some((insight) => insight.code === 'employees_terminated_with_active_contract')
  );
});
