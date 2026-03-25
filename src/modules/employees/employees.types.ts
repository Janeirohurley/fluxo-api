export type EmployeeReference = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  hireDate: string;
  status: string;
  currentAssignment?: EmployeeAssignment | null;
  activeContract?: EmployeeContract | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeAssignment = {
  id: string;
  employeeId: string;
  roleId: string;
  positionId: string;
  locationId: string;
  startDate: string;
  endDate?: string;
  role: EmployeeReference;
  position: EmployeeReference;
  location: EmployeeReference;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeContract = {
  id: string;
  employeeId: string;
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

export type EmployeeListQueryResult = {
  items: Employee[];
  total: number;
};
