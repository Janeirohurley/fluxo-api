export function getEmployeesModuleDocumentation() {
  return {
    module: 'employees',
    description: 'Human resources and personnel management module',
    storage: {
      default: 'tenant-prisma',
      fallback: 'memory',
      overrideEnv: 'EMPLOYEES_STORAGE=memory'
    },
    boundaries: ['employees', 'roles', 'positions', 'locations', 'assignments', 'contracts'],
    endpoints: [
      { method: 'GET', path: '/api/employees/docs', description: 'Employees module documentation' },
      { method: 'GET', path: '/api/employees/roles', description: 'List employee roles' },
      { method: 'POST', path: '/api/employees/roles', description: 'Create employee role' },
      { method: 'GET', path: '/api/employees/positions', description: 'List employee positions' },
      { method: 'POST', path: '/api/employees/positions', description: 'Create employee position' },
      { method: 'GET', path: '/api/employees/locations', description: 'List employee locations' },
      { method: 'POST', path: '/api/employees/locations', description: 'Create employee location' },
      { method: 'GET', path: '/api/employees', description: 'List employees with pagination and filters' },
      { method: 'POST', path: '/api/employees', description: 'Create employee' },
      { method: 'GET', path: '/api/employees/:id', description: 'Get employee details' },
      { method: 'PATCH', path: '/api/employees/:id', description: 'Update employee' },
      { method: 'DELETE', path: '/api/employees/:id', description: 'Delete employee without history' },
      { method: 'GET', path: '/api/employees/:id/assignments', description: 'List assignment history' },
      { method: 'POST', path: '/api/employees/:id/assignments', description: 'Create employee assignment' },
      { method: 'GET', path: '/api/employees/:id/contracts', description: 'List contract history' },
      { method: 'POST', path: '/api/employees/:id/contracts', description: 'Create employee contract' },
      { method: 'PATCH', path: '/api/employees/:id/contracts/:contractId', description: 'Update employee contract' }
    ]
  };
}
