import {
  type OverviewInsight,
  type OverviewModuleResult,
  type OverviewProvider,
  type OverviewProviderContext
} from '../overview.types';

function formatDate(value: Date | string) {
  return typeof value === 'string' ? value : value.toISOString().slice(0, 10);
}

function isCurrentRange(startDate: Date | string, endDate: Date | string | null | undefined, today: string) {
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : '9999-12-31';

  return start <= today && end >= today;
}

export function buildEmployeesOverviewInsights(metrics: {
  totalEmployees: number;
  activeEmployees: number;
  employeesWithoutAssignment: number;
  activeEmployeesWithoutContract: number;
  terminatedEmployeesWithActiveContract: number;
}) {
  const insights: OverviewInsight[] = [];

  if (metrics.totalEmployees === 0) {
    insights.push({
      code: 'employees_empty',
      severity: 'info',
      message: 'No employee has been registered yet.'
    });
    return insights;
  }

  if (metrics.employeesWithoutAssignment > 0) {
    insights.push({
      code: 'employees_without_assignment',
      severity: metrics.employeesWithoutAssignment >= 5 ? 'warning' : 'info',
      message: `${metrics.employeesWithoutAssignment} employees do not have a current assignment.`,
      value: metrics.employeesWithoutAssignment
    });
  }

  if (metrics.activeEmployeesWithoutContract > 0) {
    insights.push({
      code: 'employees_active_without_contract',
      severity: 'warning',
      message: `${metrics.activeEmployeesWithoutContract} active employees do not have an active contract.`,
      value: metrics.activeEmployeesWithoutContract
    });
  }

  if (metrics.terminatedEmployeesWithActiveContract > 0) {
    insights.push({
      code: 'employees_terminated_with_active_contract',
      severity: 'critical',
      message: `${metrics.terminatedEmployeesWithActiveContract} terminated employees still have an active contract.`,
      value: metrics.terminatedEmployeesWithActiveContract
    });
  }

  if (metrics.activeEmployees === 0) {
    insights.push({
      code: 'employees_no_active_staff',
      severity: 'warning',
      message: 'Employees exist, but none of them are currently active.'
    });
  }

  return insights;
}

export class EmployeesOverviewProvider implements OverviewProvider {
  readonly module = 'employees' as const;

  async build(context: OverviewProviderContext): Promise<OverviewModuleResult> {
    const isMounted = context.mountedModules.includes(this.module);
    const isEnabled = isMounted && context.accessSession.modules.includes(this.module);

    if (!isMounted) {
      return {
        module: this.module,
        enabled: false,
        status: 'unavailable',
        description: 'Human resources and personnel management overview',
        boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
        kpis: null,
        charts: null,
        insights: []
      };
    }

    if (!isEnabled) {
      return {
        module: this.module,
        enabled: false,
        status: 'disabled',
        description: 'Human resources and personnel management overview',
        boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
        kpis: null,
        charts: null,
        insights: []
      };
    }

    if (!context.prisma) {
      return {
        module: this.module,
        enabled: true,
        status: 'unavailable',
        description: 'Human resources and personnel management overview',
        boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'employees_overview_unavailable',
            severity: 'warning',
            message: 'Employees overview requires a configured tenant database connection.'
          }
        ]
      };
    }

    try {
      const prisma = context.prisma as any;
      const today = new Date().toISOString().slice(0, 10);
      const [employees, assignments, contracts] = await prisma.$transaction([
        prisma.employee.findMany({
          orderBy: [{ hireDate: 'desc' }, { createdAt: 'desc' }]
        }),
        prisma.employeeAssignment.findMany({
          include: {
            role: true,
            position: true,
            location: true
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }]
        }),
        prisma.employeeContract.findMany({
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }]
        })
      ]);

      const currentAssignments = new Map<string, any>();
      for (const assignment of assignments) {
        if (!isCurrentRange(assignment.startDate, assignment.endDate, today)) {
          continue;
        }

        if (!currentAssignments.has(assignment.employeeId)) {
          currentAssignments.set(assignment.employeeId, assignment);
        }
      }

      const activeContracts = new Map<string, any>();
      for (const contract of contracts) {
        if (contract.status !== 'active') {
          continue;
        }

        if (!isCurrentRange(contract.startDate, contract.endDate, today)) {
          continue;
        }

        if (!activeContracts.has(contract.employeeId)) {
          activeContracts.set(contract.employeeId, contract);
        }
      }

      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((employee: any) => employee.status === 'active').length;
      const terminatedEmployees = employees.filter((employee: any) => employee.status === 'terminated').length;
      const inactiveEmployees = totalEmployees - activeEmployees - terminatedEmployees;
      const employeesWithAssignment = currentAssignments.size;
      const employeesWithoutAssignment = Math.max(totalEmployees - employeesWithAssignment, 0);
      const employeesWithActiveContract = activeContracts.size;
      const activeEmployeesWithoutContract = employees.filter(
        (employee: any) => employee.status === 'active' && !activeContracts.has(employee.id)
      ).length;
      const terminatedEmployeesWithActiveContract = employees.filter(
        (employee: any) => employee.status === 'terminated' && activeContracts.has(employee.id)
      ).length;

      const byLocation = new Map<string, { label: string; value: number }>();
      const byRole = new Map<string, { label: string; value: number }>();

      for (const assignment of currentAssignments.values()) {
        const locationKey = assignment.locationId;
        const roleKey = assignment.roleId;

        byLocation.set(locationKey, {
          label: assignment.location.name,
          value: (byLocation.get(locationKey)?.value ?? 0) + 1
        });
        byRole.set(roleKey, {
          label: assignment.role.name,
          value: (byRole.get(roleKey)?.value ?? 0) + 1
        });
      }

      return {
        module: this.module,
        enabled: true,
        status: totalEmployees === 0 ? 'empty' : 'ready',
        description: 'Human resources and personnel management overview',
        boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
        kpis: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          terminatedEmployees,
          employeesWithAssignment,
          employeesWithoutAssignment,
          employeesWithActiveContract,
          activeEmployeesWithoutContract,
          assignmentCoverageRate:
            totalEmployees > 0 ? Number((employeesWithAssignment / totalEmployees).toFixed(4)) : null,
          contractCoverageRate:
            activeEmployees > 0
              ? Number(((activeEmployees - activeEmployeesWithoutContract) / activeEmployees).toFixed(4))
              : null
        },
        charts: {
          byStatus: [
            { key: 'active', label: 'active', value: activeEmployees },
            { key: 'inactive', label: 'inactive', value: inactiveEmployees },
            { key: 'terminated', label: 'terminated', value: terminatedEmployees }
          ],
          byLocation: Array.from(byLocation.entries()).map(([key, item]) => ({
            key,
            label: item.label,
            value: item.value
          })),
          byRole: Array.from(byRole.entries()).map(([key, item]) => ({
            key,
            label: item.label,
            value: item.value
          })),
          recentHires: employees.slice(0, 5).map((employee: any) => ({
            id: employee.id,
            employeeNumber: employee.employeeNumber,
            fullName: `${employee.firstName} ${employee.lastName}`,
            hireDate: formatDate(employee.hireDate),
            status: employee.status
          }))
        },
        insights: buildEmployeesOverviewInsights({
          totalEmployees,
          activeEmployees,
          employeesWithoutAssignment,
          activeEmployeesWithoutContract,
          terminatedEmployeesWithActiveContract
        })
      };
    } catch (error) {
      return {
        module: this.module,
        enabled: true,
        status: 'unavailable',
        description: 'Human resources and personnel management overview',
        boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
        kpis: null,
        charts: null,
        insights: [
          {
            code: 'employees_overview_query_failed',
            severity: 'warning',
            message: error instanceof Error ? error.message : 'Employees overview query failed.'
          }
        ]
      };
    }
  }
}
