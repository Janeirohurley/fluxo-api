import { buildPaginatedResult, type PaginatedResult } from '../../shared/pagination';
import { HttpError } from '../../shared/http-error';
import {
  type CreateEmployeeAssignmentInput,
  type CreateEmployeeContractInput,
  type CreateEmployeeInput,
  type CreateEmployeeLocationInput,
  type CreateEmployeePositionInput,
  type CreateEmployeeRoleInput,
  type ListEmployeesQuery,
  type UpdateEmployeeContractInput,
  type UpdateEmployeeInput
} from './employees.schema';
import {
  type Employee,
  type EmployeeAssignment,
  type EmployeeContract,
  type EmployeeReference
} from './employees.types';
import { type EmployeesRepository } from './employees.repository';

export class EmployeesService {
  constructor(private readonly repository: EmployeesRepository) {}

  listRoles(): Promise<EmployeeReference[]> {
    return this.repository.listRoles();
  }

  createRole(input: CreateEmployeeRoleInput): Promise<EmployeeReference> {
    return this.repository.createRole(input);
  }

  listPositions(): Promise<EmployeeReference[]> {
    return this.repository.listPositions();
  }

  createPosition(input: CreateEmployeePositionInput): Promise<EmployeeReference> {
    return this.repository.createPosition(input);
  }

  listLocations(): Promise<EmployeeReference[]> {
    return this.repository.listLocations();
  }

  createLocation(input: CreateEmployeeLocationInput): Promise<EmployeeReference> {
    return this.repository.createLocation(input);
  }

  async listEmployees(input: ListEmployeesQuery): Promise<PaginatedResult<Employee>> {
    const result = await this.repository.listEmployees(input);
    return buildPaginatedResult(result.items, input, result.total);
  }

  getEmployeeById(id: string): Promise<Employee> {
    return this.repository.getEmployeeById(id);
  }

  createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    return this.repository.createEmployee(input);
  }

  updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    return this.repository.updateEmployee(id, input);
  }

  async removeEmployee(id: string): Promise<void> {
    const [assignments, contracts] = await Promise.all([
      this.repository.listAssignmentsByEmployeeId(id),
      this.repository.listContractsByEmployeeId(id)
    ]);

    if (assignments.length > 0 || contracts.length > 0) {
      throw new HttpError(
        409,
        'This employee cannot be deleted because assignment or contract history already exists'
      );
    }

    await this.repository.removeEmployee(id);
  }

  listAssignmentsByEmployeeId(employeeId: string): Promise<EmployeeAssignment[]> {
    return this.repository.listAssignmentsByEmployeeId(employeeId);
  }

  async createAssignment(
    employeeId: string,
    input: CreateEmployeeAssignmentInput
  ): Promise<EmployeeAssignment> {
    await Promise.all([
      this.repository.getEmployeeById(employeeId),
      this.repository.getRoleById(input.roleId),
      this.repository.getPositionById(input.positionId),
      this.repository.getLocationById(input.locationId)
    ]);
    await this.assertNoAssignmentOverlap(employeeId, input);

    return this.repository.createAssignment(employeeId, input);
  }

  listContractsByEmployeeId(employeeId: string): Promise<EmployeeContract[]> {
    return this.repository.listContractsByEmployeeId(employeeId);
  }

  async createContract(
    employeeId: string,
    input: CreateEmployeeContractInput
  ): Promise<EmployeeContract> {
    await this.repository.getEmployeeById(employeeId);
    await this.assertNoContractOverlap(employeeId, input);

    return this.repository.createContract(employeeId, input);
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    input: UpdateEmployeeContractInput
  ): Promise<EmployeeContract> {
    const contracts = await this.repository.listContractsByEmployeeId(employeeId);
    const existing = contracts.find((contract) => contract.id === contractId);

    if (!existing) {
      throw new HttpError(404, `Contract with id "${contractId}" not found for this employee`);
    }

    const nextStartDate = input.startDate ?? existing.startDate;
    const nextEndDate = input.endDate ?? existing.endDate;
    const nextStatus = input.status ?? existing.status;

    if (
      ['active', 'draft', 'suspended'].includes(nextStatus) &&
      contracts.some(
        (contract) =>
          contract.id !== contractId &&
          ['active', 'draft', 'suspended'].includes(contract.status) &&
          this.dateRangesOverlap(nextStartDate, nextEndDate, contract.startDate, contract.endDate)
      )
    ) {
      throw new HttpError(
        409,
        'This employee already has another contract covering the requested period'
      );
    }

    return this.repository.updateContract(employeeId, contractId, input);
  }

  private async assertNoAssignmentOverlap(
    employeeId: string,
    input: CreateEmployeeAssignmentInput
  ) {
    const assignments = await this.repository.listAssignmentsByEmployeeId(employeeId);
    const hasOverlap = assignments.some((assignment) =>
      this.dateRangesOverlap(
        input.startDate,
        input.endDate,
        assignment.startDate,
        assignment.endDate
      )
    );

    if (hasOverlap) {
      throw new HttpError(
        409,
        'This employee already has an assignment covering the requested period'
      );
    }
  }

  private async assertNoContractOverlap(
    employeeId: string,
    input: CreateEmployeeContractInput
  ) {
    if (!['active', 'draft', 'suspended'].includes(input.status)) {
      return;
    }

    const contracts = await this.repository.listContractsByEmployeeId(employeeId);
    const hasOverlap = contracts.some(
      (contract) =>
        ['active', 'draft', 'suspended'].includes(contract.status) &&
        this.dateRangesOverlap(input.startDate, input.endDate, contract.startDate, contract.endDate)
    );

    if (hasOverlap) {
      throw new HttpError(
        409,
        'This employee already has a contract covering the requested period'
      );
    }
  }

  private dateRangesOverlap(
    startDate: string,
    endDate: string | undefined,
    existingStartDate: string,
    existingEndDate: string | undefined
  ) {
    const start = startDate;
    const end = endDate ?? '9999-12-31';
    const existingStart = existingStartDate;
    const existingEnd = existingEndDate ?? '9999-12-31';

    return start <= existingEnd && existingStart <= end;
  }
}
