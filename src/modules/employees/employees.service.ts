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
  type UpdateEmployeeAssignmentInput,
  type UpdateEmployeeLocationInput,
  type UpdateEmployeePositionInput,
  type UpdateEmployeeRoleInput,
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

  updateRole(id: string, input: UpdateEmployeeRoleInput): Promise<EmployeeReference> {
    return this.repository.updateRole(id, input);
  }

  removeRole(id: string): Promise<void> {
    return this.repository.removeRole(id);
  }

  listPositions(): Promise<EmployeeReference[]> {
    return this.repository.listPositions();
  }

  createPosition(input: CreateEmployeePositionInput): Promise<EmployeeReference> {
    return this.repository.createPosition(input);
  }

  updatePosition(id: string, input: UpdateEmployeePositionInput): Promise<EmployeeReference> {
    return this.repository.updatePosition(id, input);
  }

  removePosition(id: string): Promise<void> {
    return this.repository.removePosition(id);
  }

  listLocations(): Promise<EmployeeReference[]> {
    return this.repository.listLocations();
  }

  createLocation(input: CreateEmployeeLocationInput): Promise<EmployeeReference> {
    return this.repository.createLocation(input);
  }

  updateLocation(id: string, input: UpdateEmployeeLocationInput): Promise<EmployeeReference> {
    return this.repository.updateLocation(id, input);
  }

  removeLocation(id: string): Promise<void> {
    return this.repository.removeLocation(id);
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

  async updateAssignment(
    employeeId: string,
    assignmentId: string,
    input: UpdateEmployeeAssignmentInput
  ): Promise<EmployeeAssignment> {
    const assignments = await this.repository.listAssignmentsByEmployeeId(employeeId);
    const existing = assignments.find((assignment) => assignment.id === assignmentId);

    if (!existing) {
      throw new HttpError(404, `Assignment with id "${assignmentId}" not found for this employee`);
    }

    const nextInput: CreateEmployeeAssignmentInput = {
      roleId: input.roleId ?? existing.roleId,
      positionId: input.positionId ?? existing.positionId,
      locationId: input.locationId ?? existing.locationId,
      startDate: input.startDate ?? existing.startDate,
      endDate: input.endDate ?? existing.endDate
    };

    await Promise.all([
      this.repository.getRoleById(nextInput.roleId),
      this.repository.getPositionById(nextInput.positionId),
      this.repository.getLocationById(nextInput.locationId)
    ]);

    const hasOverlap = assignments.some(
      (assignment) =>
        assignment.id !== assignmentId &&
        this.dateRangesOverlap(
          nextInput.startDate,
          nextInput.endDate,
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

    return this.repository.updateAssignment(employeeId, assignmentId, input);
  }

  removeAssignment(employeeId: string, assignmentId: string): Promise<void> {
    return this.repository.removeAssignment(employeeId, assignmentId);
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

  removeContract(employeeId: string, contractId: string): Promise<void> {
    return this.repository.removeContract(employeeId, contractId);
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
