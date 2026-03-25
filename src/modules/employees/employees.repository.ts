import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';

import { HttpError } from '../../shared/http-error';
import { slicePage } from '../../shared/pagination';
import { type PrismaClientLike } from '../../shared/prisma';
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
  type EmployeeListQueryResult,
  type EmployeeReference
} from './employees.types';

export interface EmployeesRepository {
  listRoles(): Promise<EmployeeReference[]>;
  createRole(input: CreateEmployeeRoleInput): Promise<EmployeeReference>;
  getRoleById(id: string): Promise<EmployeeReference>;
  listPositions(): Promise<EmployeeReference[]>;
  createPosition(input: CreateEmployeePositionInput): Promise<EmployeeReference>;
  getPositionById(id: string): Promise<EmployeeReference>;
  listLocations(): Promise<EmployeeReference[]>;
  createLocation(input: CreateEmployeeLocationInput): Promise<EmployeeReference>;
  getLocationById(id: string): Promise<EmployeeReference>;
  listEmployees(input: ListEmployeesQuery): Promise<EmployeeListQueryResult>;
  getEmployeeById(id: string): Promise<Employee>;
  createEmployee(input: CreateEmployeeInput): Promise<Employee>;
  updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee>;
  removeEmployee(id: string): Promise<void>;
  listAssignmentsByEmployeeId(employeeId: string): Promise<EmployeeAssignment[]>;
  createAssignment(employeeId: string, input: CreateEmployeeAssignmentInput): Promise<EmployeeAssignment>;
  listContractsByEmployeeId(employeeId: string): Promise<EmployeeContract[]>;
  createContract(employeeId: string, input: CreateEmployeeContractInput): Promise<EmployeeContract>;
  updateContract(
    employeeId: string,
    contractId: string,
    input: UpdateEmployeeContractInput
  ): Promise<EmployeeContract>;
}

function nowIso() {
  return new Date().toISOString();
}

function comparePrimitive(
  left: string | number | undefined,
  right: string | number | undefined,
  sortOrder: 'asc' | 'desc'
) {
  const leftValue = typeof left === 'number' ? left : (left ?? '').toLowerCase();
  const rightValue = typeof right === 'number' ? right : (right ?? '').toLowerCase();
  const comparison =
    typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));

  return sortOrder === 'asc' ? comparison : comparison * -1;
}

function normalizeDate(date: string | undefined) {
  return date ?? '9999-12-31';
}

function isActiveOnDate(endDate: string | undefined, onDate = new Date().toISOString().slice(0, 10)) {
  return !endDate || endDate >= onDate;
}

function mapReference(entity: {
  id: string;
  name: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}): EmployeeReference {
  return {
    id: entity.id,
    name: entity.name,
    createdAt:
      typeof entity.createdAt === 'string' ? entity.createdAt : entity.createdAt.toISOString(),
    updatedAt:
      typeof entity.updatedAt === 'string' ? entity.updatedAt : entity.updatedAt.toISOString()
  };
}

function toNumber(value: Prisma.Decimal | number) {
  return typeof value === 'number' ? value : value.toNumber();
}

export class InMemoryEmployeesRepository implements EmployeesRepository {
  private readonly roles = new Map<string, EmployeeReference>();
  private readonly positions = new Map<string, EmployeeReference>();
  private readonly locations = new Map<string, EmployeeReference>();
  private readonly employees = new Map<string, Omit<Employee, 'currentAssignment' | 'activeContract'>>();
  private readonly assignments = new Map<string, EmployeeAssignment>();
  private readonly contracts = new Map<string, EmployeeContract>();

  constructor() {
    this.seedReferenceData();
  }

  async listRoles(): Promise<EmployeeReference[]> {
    return this.sortByName(this.roles);
  }

  async createRole(input: CreateEmployeeRoleInput): Promise<EmployeeReference> {
    this.assertUniqueName(this.roles, input.name, 'Role');
    const role = this.createReference(input.name);
    this.roles.set(role.id, role);
    return role;
  }

  async getRoleById(id: string): Promise<EmployeeReference> {
    return this.getReferenceOrThrow(this.roles, id, 'Role');
  }

  async listPositions(): Promise<EmployeeReference[]> {
    return this.sortByName(this.positions);
  }

  async createPosition(input: CreateEmployeePositionInput): Promise<EmployeeReference> {
    this.assertUniqueName(this.positions, input.name, 'Position');
    const position = this.createReference(input.name);
    this.positions.set(position.id, position);
    return position;
  }

  async getPositionById(id: string): Promise<EmployeeReference> {
    return this.getReferenceOrThrow(this.positions, id, 'Position');
  }

  async listLocations(): Promise<EmployeeReference[]> {
    return this.sortByName(this.locations);
  }

  async createLocation(input: CreateEmployeeLocationInput): Promise<EmployeeReference> {
    this.assertUniqueName(this.locations, input.name, 'Location');
    const location = this.createReference(input.name);
    this.locations.set(location.id, location);
    return location;
  }

  async getLocationById(id: string): Promise<EmployeeReference> {
    return this.getReferenceOrThrow(this.locations, id, 'Location');
  }

  async listEmployees(input: ListEmployeesQuery): Promise<EmployeeListQueryResult> {
    const today = new Date().toISOString().slice(0, 10);
    const filtered = Array.from(this.employees.values())
      .filter((employee) => {
        if (input.status && employee.status !== input.status) {
          return false;
        }

        if (input.search) {
          const query = input.search.toLowerCase();
          const searchable = [
            employee.employeeNumber,
            employee.firstName,
            employee.lastName,
            employee.fullName,
            employee.email ?? ''
          ]
            .join(' ')
            .toLowerCase();

          if (!searchable.includes(query)) {
            return false;
          }
        }

        const currentAssignment = this.getCurrentAssignment(employee.id, today);
        if (input.roleId && currentAssignment?.roleId !== input.roleId) {
          return false;
        }
        if (input.positionId && currentAssignment?.positionId !== input.positionId) {
          return false;
        }
        if (input.locationId && currentAssignment?.locationId !== input.locationId) {
          return false;
        }

        return true;
      })
      .sort((left, right) =>
        comparePrimitive(
          this.getEmployeeSortValue(left, input.sortBy),
          this.getEmployeeSortValue(right, input.sortBy),
          input.sortOrder
        )
      )
      .map((employee) => this.enrichEmployee(employee, today));

    return {
      items: slicePage(filtered, input),
      total: filtered.length
    };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = this.employees.get(id);
    if (!employee) {
      throw new HttpError(404, `Employee with id "${id}" not found`);
    }

    return this.enrichEmployee(employee);
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    this.assertUniqueEmployee(input.employeeNumber, input.email);
    const id = crypto.randomUUID();
    const timestamp = nowIso();
    const employee = {
      id,
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      hireDate: input.hireDate,
      status: input.status,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.employees.set(id, employee);
    return this.enrichEmployee(employee);
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    const existing = this.employees.get(id);
    if (!existing) {
      throw new HttpError(404, `Employee with id "${id}" not found`);
    }
    this.assertUniqueEmployee(
      input.employeeNumber ?? existing.employeeNumber,
      input.email ?? existing.email,
      id
    );
    const nextFirstName = input.firstName ?? existing.firstName;
    const nextLastName = input.lastName ?? existing.lastName;
    const updated = {
      ...existing,
      ...input,
      firstName: nextFirstName,
      lastName: nextLastName,
      fullName: `${nextFirstName} ${nextLastName}`,
      updatedAt: nowIso()
    };

    this.employees.set(id, updated);

    return this.enrichEmployee(this.employees.get(id)!);
  }

  async removeEmployee(id: string): Promise<void> {
    const exists = this.employees.has(id);
    if (!exists) {
      throw new HttpError(404, `Employee with id "${id}" not found`);
    }

    this.employees.delete(id);
  }

  async listAssignmentsByEmployeeId(employeeId: string): Promise<EmployeeAssignment[]> {
    await this.getEmployeeById(employeeId);
    return Array.from(this.assignments.values())
      .filter((assignment) => assignment.employeeId === employeeId)
      .sort((left, right) => right.startDate.localeCompare(left.startDate));
  }

  async createAssignment(
    employeeId: string,
    input: CreateEmployeeAssignmentInput
  ): Promise<EmployeeAssignment> {
    await this.getEmployeeById(employeeId);
    const assignment: EmployeeAssignment = {
      id: crypto.randomUUID(),
      employeeId,
      roleId: input.roleId,
      positionId: input.positionId,
      locationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
      role: await this.getRoleById(input.roleId),
      position: await this.getPositionById(input.positionId),
      location: await this.getLocationById(input.locationId),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    this.assignments.set(assignment.id, assignment);
    return assignment;
  }

  async listContractsByEmployeeId(employeeId: string): Promise<EmployeeContract[]> {
    await this.getEmployeeById(employeeId);
    return Array.from(this.contracts.values())
      .filter((contract) => contract.employeeId === employeeId)
      .sort((left, right) => right.startDate.localeCompare(left.startDate));
  }

  async createContract(
    employeeId: string,
    input: CreateEmployeeContractInput
  ): Promise<EmployeeContract> {
    await this.getEmployeeById(employeeId);
    const contract: EmployeeContract = {
      id: crypto.randomUUID(),
      employeeId,
      contractType: input.contractType,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      salaryAmount: input.salaryAmount,
      currency: input.currency,
      paymentFrequency: input.paymentFrequency,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    input: UpdateEmployeeContractInput
  ): Promise<EmployeeContract> {
    await this.getEmployeeById(employeeId);
    const existing = this.contracts.get(contractId);
    if (!existing || existing.employeeId !== employeeId) {
      throw new HttpError(404, `Contract with id "${contractId}" not found for this employee`);
    }

    const updated: EmployeeContract = {
      ...existing,
      ...input,
      updatedAt: nowIso()
    };

    this.contracts.set(contractId, updated);
    return updated;
  }

  private seedReferenceData() {
    for (const name of ['Administrator', 'Manager', 'Officer', 'Technician', 'Staff']) {
      const reference = this.createReference(name);
      this.roles.set(reference.id, reference);
    }

    for (const name of ['Operations Officer', 'Accountant', 'HR Officer', 'Technician', 'Driver']) {
      const reference = this.createReference(name);
      this.positions.set(reference.id, reference);
    }

    for (const name of ['Head Office', 'Warehouse', 'Field Office']) {
      const reference = this.createReference(name);
      this.locations.set(reference.id, reference);
    }
  }

  private createReference(name: string): EmployeeReference {
    const timestamp = nowIso();
    return {
      id: crypto.randomUUID(),
      name,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  private sortByName(store: Map<string, EmployeeReference>) {
    return Array.from(store.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  private getReferenceOrThrow(
    store: Map<string, EmployeeReference>,
    id: string,
    label: string
  ): EmployeeReference {
    const reference = store.get(id);
    if (!reference) {
      throw new HttpError(404, `${label} with id "${id}" not found`);
    }

    return reference;
  }

  private assertUniqueName(
    store: Map<string, EmployeeReference>,
    name: string,
    label: string,
    exceptId?: string
  ) {
    const normalized = name.trim().toLowerCase();
    const duplicate = Array.from(store.values()).some(
      (item) => item.id !== exceptId && item.name.trim().toLowerCase() === normalized
    );

    if (duplicate) {
      throw new HttpError(409, `${label} "${name}" already exists`);
    }
  }

  private assertUniqueEmployee(employeeNumber: string, email?: string, exceptId?: string) {
    const duplicate = Array.from(this.employees.values()).find(
      (employee) =>
        employee.id !== exceptId &&
        (employee.employeeNumber.toLowerCase() === employeeNumber.toLowerCase() ||
          (!!email &&
            !!employee.email &&
            employee.email.toLowerCase() === email.toLowerCase()))
    );

    if (duplicate) {
      throw new HttpError(409, 'Employee number or email already exists');
    }
  }

  private getCurrentAssignment(employeeId: string, today = new Date().toISOString().slice(0, 10)) {
    return Array.from(this.assignments.values())
      .filter(
        (assignment) =>
          assignment.employeeId === employeeId &&
          assignment.startDate <= today &&
          isActiveOnDate(assignment.endDate, today)
      )
      .sort((left, right) => right.startDate.localeCompare(left.startDate))[0];
  }

  private getActiveContract(employeeId: string, today = new Date().toISOString().slice(0, 10)) {
    return Array.from(this.contracts.values())
      .filter(
        (contract) =>
          contract.employeeId === employeeId &&
          contract.startDate <= today &&
          isActiveOnDate(contract.endDate, today) &&
          ['active', 'draft', 'suspended'].includes(contract.status)
      )
      .sort((left, right) => right.startDate.localeCompare(left.startDate))[0];
  }

  private getEmployeeSortValue(
    employee: Omit<Employee, 'currentAssignment' | 'activeContract'>,
    sortBy: ListEmployeesQuery['sortBy']
  ) {
    return employee[sortBy];
  }

  private enrichEmployee(
    employee: Omit<Employee, 'currentAssignment' | 'activeContract'>,
    today = new Date().toISOString().slice(0, 10)
  ): Employee {
    return {
      ...employee,
      currentAssignment: this.getCurrentAssignment(employee.id, today) ?? null,
      activeContract: this.getActiveContract(employee.id, today) ?? null
    };
  }
}

export class PrismaEmployeesRepository implements EmployeesRepository {
  constructor(private readonly prismaResolver: PrismaClientLike | (() => PrismaClientLike | null)) {}

  private get prisma() {
    const resolved =
      typeof this.prismaResolver === 'function' ? this.prismaResolver() : this.prismaResolver;
    if (!resolved) {
      throw new HttpError(503, 'Employees repository requires an active tenant database connection');
    }
    return resolved;
  }

  async listRoles(): Promise<EmployeeReference[]> {
    const roles = await this.prisma.employeeRole.findMany({
      orderBy: { name: 'asc' }
    });

    return roles.map(mapReference);
  }

  async createRole(input: CreateEmployeeRoleInput): Promise<EmployeeReference> {
    try {
      const role = await this.prisma.employeeRole.create({
        data: {
          name: input.name
        }
      });
      return mapReference(role);
    } catch (error) {
      throw this.mapPrismaError(error, 'Role');
    }
  }

  async getRoleById(id: string): Promise<EmployeeReference> {
    const role = await this.prisma.employeeRole.findUnique({ where: { id } });
    if (!role) {
      throw new HttpError(404, `Role with id "${id}" not found`);
    }
    return mapReference(role);
  }

  async listPositions(): Promise<EmployeeReference[]> {
    const positions = await this.prisma.employeePosition.findMany({
      orderBy: { name: 'asc' }
    });

    return positions.map(mapReference);
  }

  async createPosition(input: CreateEmployeePositionInput): Promise<EmployeeReference> {
    try {
      const position = await this.prisma.employeePosition.create({
        data: {
          name: input.name
        }
      });
      return mapReference(position);
    } catch (error) {
      throw this.mapPrismaError(error, 'Position');
    }
  }

  async getPositionById(id: string): Promise<EmployeeReference> {
    const position = await this.prisma.employeePosition.findUnique({ where: { id } });
    if (!position) {
      throw new HttpError(404, `Position with id "${id}" not found`);
    }
    return mapReference(position);
  }

  async listLocations(): Promise<EmployeeReference[]> {
    const locations = await this.prisma.employeeLocation.findMany({
      orderBy: { name: 'asc' }
    });

    return locations.map(mapReference);
  }

  async createLocation(input: CreateEmployeeLocationInput): Promise<EmployeeReference> {
    try {
      const location = await this.prisma.employeeLocation.create({
        data: {
          name: input.name
        }
      });
      return mapReference(location);
    } catch (error) {
      throw this.mapPrismaError(error, 'Location');
    }
  }

  async getLocationById(id: string): Promise<EmployeeReference> {
    const location = await this.prisma.employeeLocation.findUnique({ where: { id } });
    if (!location) {
      throw new HttpError(404, `Location with id "${id}" not found`);
    }
    return mapReference(location);
  }

  async listEmployees(input: ListEmployeesQuery): Promise<EmployeeListQueryResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentAssignmentWhere = {
      startDate: { lte: today },
      OR: [{ endDate: null }, { endDate: { gte: today } }]
    } satisfies Prisma.EmployeeAssignmentWhereInput;

    const where: Prisma.EmployeeWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { employeeNumber: { contains: input.search, mode: 'insensitive' } },
              { firstName: { contains: input.search, mode: 'insensitive' } },
              { lastName: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } }
            ]
          }
        : {}),
      ...((input.roleId || input.positionId || input.locationId)
        ? {
            assignments: {
              some: {
                ...currentAssignmentWhere,
                ...(input.roleId ? { roleId: input.roleId } : {}),
                ...(input.positionId ? { positionId: input.positionId } : {}),
                ...(input.locationId ? { locationId: input.locationId } : {})
              }
            }
          }
        : {})
    };

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        assignments: {
          where: currentAssignmentWhere,
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          include: {
            role: true,
            position: true,
            location: true
          }
        },
        contracts: {
          where: {
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: today } }],
            status: { in: ['active', 'draft', 'suspended'] }
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          take: 1
        }
      }
    });

    const sorted = employees.sort((left, right) =>
      comparePrimitive(
        this.getEmployeeSortValue(left, input.sortBy),
        this.getEmployeeSortValue(right, input.sortBy),
        input.sortOrder
      )
    );

    return {
      items: slicePage(sorted.map((employee) => this.mapEmployee(employee)), input),
      total: sorted.length
    };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        assignments: {
          where: {
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: today } }]
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          include: {
            role: true,
            position: true,
            location: true
          }
        },
        contracts: {
          where: {
            startDate: { lte: today },
            OR: [{ endDate: null }, { endDate: { gte: today } }],
            status: { in: ['active', 'draft', 'suspended'] }
          },
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          take: 1
        }
      }
    });

    if (!employee) {
      throw new HttpError(404, `Employee with id "${id}" not found`);
    }

    return this.mapEmployee(employee);
  }

  async createEmployee(input: CreateEmployeeInput): Promise<Employee> {
    try {
      const employee = await this.prisma.employee.create({
        data: {
          employeeNumber: input.employeeNumber,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          hireDate: new Date(input.hireDate),
          status: input.status
        },
        include: {
          assignments: {
            include: {
              role: true,
              position: true,
              location: true
            }
          },
          contracts: true
        }
      });

      return this.mapEmployee(employee);
    } catch (error) {
      throw this.mapPrismaError(error, 'Employee');
    }
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
    await this.getEmployeeById(id);

    try {
      const employee = await this.prisma.employee.update({
        where: { id },
        data: {
          ...(input.employeeNumber !== undefined ? { employeeNumber: input.employeeNumber } : {}),
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.email !== undefined ? { email: input.email ?? null } : {}),
          ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
          ...(input.hireDate !== undefined ? { hireDate: new Date(input.hireDate) } : {}),
          ...(input.status !== undefined ? { status: input.status } : {})
        },
        include: {
          assignments: {
            include: {
              role: true,
              position: true,
              location: true
            }
          },
          contracts: true
        }
      });

      return this.mapEmployee(employee);
    } catch (error) {
      throw this.mapPrismaError(error, 'Employee');
    }
  }

  async removeEmployee(id: string): Promise<void> {
    try {
      await this.prisma.employee.delete({
        where: { id }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new HttpError(404, `Employee with id "${id}" not found`);
      }

      throw error;
    }
  }

  async listAssignmentsByEmployeeId(employeeId: string): Promise<EmployeeAssignment[]> {
    await this.getEmployeeById(employeeId);

    const assignments = await this.prisma.employeeAssignment.findMany({
      where: { employeeId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        role: true,
        position: true,
        location: true
      }
    });

    return assignments.map((assignment) => this.mapAssignment(assignment));
  }

  async createAssignment(
    employeeId: string,
    input: CreateEmployeeAssignmentInput
  ): Promise<EmployeeAssignment> {
    try {
      const assignment = await this.prisma.employeeAssignment.create({
        data: {
          employeeId,
          roleId: input.roleId,
          positionId: input.positionId,
          locationId: input.locationId,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null
        },
        include: {
          role: true,
          position: true,
          location: true
        }
      });

      return this.mapAssignment(assignment);
    } catch (error) {
      throw this.mapPrismaError(error, 'Employee assignment');
    }
  }

  async listContractsByEmployeeId(employeeId: string): Promise<EmployeeContract[]> {
    await this.getEmployeeById(employeeId);

    const contracts = await this.prisma.employeeContract.findMany({
      where: { employeeId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }]
    });

    return contracts.map((contract) => this.mapContract(contract));
  }

  async createContract(
    employeeId: string,
    input: CreateEmployeeContractInput
  ): Promise<EmployeeContract> {
    try {
      const contract = await this.prisma.employeeContract.create({
        data: {
          employeeId,
          contractType: input.contractType,
          status: input.status,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          salaryAmount: input.salaryAmount,
          currency: input.currency,
          paymentFrequency: input.paymentFrequency
        }
      });

      return this.mapContract(contract);
    } catch (error) {
      throw this.mapPrismaError(error, 'Employee contract');
    }
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    input: UpdateEmployeeContractInput
  ): Promise<EmployeeContract> {
    await this.getEmployeeById(employeeId);
    const contract = await this.prisma.employeeContract.findUnique({
      where: { id: contractId }
    });
    if (!contract || contract.employeeId !== employeeId) {
      throw new HttpError(404, `Contract with id "${contractId}" not found for this employee`);
    }

    try {
      const updated = await this.prisma.employeeContract.update({
        where: { id: contractId },
        data: {
          ...(input.contractType !== undefined ? { contractType: input.contractType } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
          ...(input.salaryAmount !== undefined ? { salaryAmount: input.salaryAmount } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.paymentFrequency !== undefined
            ? { paymentFrequency: input.paymentFrequency }
            : {})
        }
      });

      return this.mapContract(updated);
    } catch (error) {
      throw this.mapPrismaError(error, 'Employee contract');
    }
  }

  private mapEmployee(employee: any): Employee {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email ?? undefined,
      phone: employee.phone ?? undefined,
      hireDate: employee.hireDate.toISOString().slice(0, 10),
      status: employee.status,
      currentAssignment:
        employee.assignments?.[0] ? this.mapAssignment(employee.assignments[0]) : null,
      activeContract: employee.contracts?.[0] ? this.mapContract(employee.contracts[0]) : null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString()
    };
  }

  private mapAssignment(assignment: any): EmployeeAssignment {
    return {
      id: assignment.id,
      employeeId: assignment.employeeId,
      roleId: assignment.roleId,
      positionId: assignment.positionId,
      locationId: assignment.locationId,
      startDate: assignment.startDate.toISOString().slice(0, 10),
      endDate: assignment.endDate?.toISOString().slice(0, 10),
      role: mapReference(assignment.role),
      position: mapReference(assignment.position),
      location: mapReference(assignment.location),
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString()
    };
  }

  private mapContract(contract: any): EmployeeContract {
    return {
      id: contract.id,
      employeeId: contract.employeeId,
      contractType: contract.contractType,
      status: contract.status,
      startDate: contract.startDate.toISOString().slice(0, 10),
      endDate: contract.endDate?.toISOString().slice(0, 10),
      salaryAmount: toNumber(contract.salaryAmount),
      currency: contract.currency,
      paymentFrequency: contract.paymentFrequency,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString()
    };
  }

  private getEmployeeSortValue(employee: any, sortBy: ListEmployeesQuery['sortBy']) {
    if (sortBy === 'hireDate') {
      return employee.hireDate?.toISOString?.() ?? employee.hireDate;
    }
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      return employee[sortBy]?.toISOString?.() ?? employee[sortBy];
    }

    return employee[sortBy];
  }

  private mapPrismaError(error: unknown, entityLabel: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new HttpError(409, `${entityLabel} already exists`);
      }
      if (error.code === 'P2003') {
        return new HttpError(409, `${entityLabel} references a record that does not exist`);
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
