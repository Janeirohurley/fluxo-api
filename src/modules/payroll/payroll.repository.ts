import crypto from 'node:crypto';

import { HttpError } from '../../shared/http-error';
import { slicePage } from '../../shared/pagination';
import { type TenantDecimal, TenantPrisma, type TenantPrismaClientLike } from '../../shared/tenant-prisma';
import {
  type CreatePaySlipJournalEntryInput,
  type CreatePaySlipLineInput,
  type GeneratePayRunInput,
  type ListPayrollContractsQuery,
  type ListPaySlipsQuery,
  type RegisterPaySlipPaymentInput
} from './payroll.schema';
import {
  type PayrollContract,
  type PayrollContractListQueryResult,
  type PayrollEmployeeSummary,
  type PayrollJournalEntryLink,
  type PayrollLinkedJournalEntry,
  type PayrollLinkedTransaction,
  type PayrollOverview,
  type PayrollPaymentRegistration,
  type PayrollPaySlip,
  type PayrollPaySlipLine,
  type PayrollPaySlipListQueryResult
} from './payroll.types';

type UpsertPaySlipRecordInput = {
  employeeId: string;
  contractId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate?: string;
  currency: string;
  notes?: string;
  grossAmount: number;
  totalDeductions: number;
  netAmount: number;
  lines: CreatePaySlipLineInput[];
};

type PayrollOverviewResult = Omit<PayrollOverview, 'module' | 'description' | 'ready' | 'boundaries'>;

export interface PayrollRepository {
  listContracts(query: ListPayrollContractsQuery): Promise<PayrollContractListQueryResult>;
  listContractsEligibleForPayRun(input: GeneratePayRunInput): Promise<PayrollContract[]>;
  getContractById(id: string): Promise<PayrollContract>;
  listPaySlips(query: ListPaySlipsQuery): Promise<PayrollPaySlipListQueryResult>;
  getPaySlipById(id: string): Promise<PayrollPaySlip>;
  createPaySlip(input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip>;
  updatePaySlip(id: string, input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip>;
  issuePaySlip(id: string, issuedAt: string): Promise<PayrollPaySlip>;
  markPaySlipPaid(id: string, paymentDate: string): Promise<PayrollPaySlip>;
  removePaySlip(id: string): Promise<void>;
  createJournalEntryForPaySlip(
    id: string,
    input: CreatePaySlipJournalEntryInput
  ): Promise<PayrollJournalEntryLink>;
  registerPaymentForPaySlip(
    id: string,
    input: RegisterPaySlipPaymentInput
  ): Promise<PayrollPaymentRegistration>;
  getOverview(): Promise<PayrollOverviewResult>;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeDate(date: string | undefined) {
  return date ?? '9999-12-31';
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

function toNumber(value: TenantDecimal | number) {
  return typeof value === 'number' ? value : value.toNumber();
}

function mapEmployeeSummary(employee: {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  status: string;
}): PayrollEmployeeSummary {
  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    fullName: `${employee.firstName} ${employee.lastName}`,
    email: employee.email ?? undefined,
    status: employee.status
  };
}

export class InMemoryPayrollRepository implements PayrollRepository {
  private readonly employees = new Map<string, PayrollEmployeeSummary>();
  private readonly contracts = new Map<string, PayrollContract>();
  private readonly paySlips = new Map<string, PayrollPaySlip>();

  constructor() {
    this.seedContracts();
  }

  async listContracts(query: ListPayrollContractsQuery): Promise<PayrollContractListQueryResult> {
    const filtered = Array.from(this.contracts.values())
      .filter((contract) => {
        if (query.status && contract.status !== query.status) {
          return false;
        }
        if (query.employeeId && contract.employeeId !== query.employeeId) {
          return false;
        }
        if (query.paymentFrequency && contract.paymentFrequency !== query.paymentFrequency) {
          return false;
        }
        if (query.search) {
          const haystack = [
            contract.employee.employeeNumber,
            contract.employee.fullName,
            contract.contractType,
            contract.currency
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(query.search.toLowerCase())) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) =>
        comparePrimitive(
          this.getContractSortValue(left, query.sortBy),
          this.getContractSortValue(right, query.sortBy),
          query.sortOrder
        )
      );

    return {
      items: slicePage(filtered, query),
      total: filtered.length
    };
  }

  async listContractsEligibleForPayRun(input: GeneratePayRunInput): Promise<PayrollContract[]> {
    return Array.from(this.contracts.values())
      .filter((contract) => {
        if (contract.status !== 'active') {
          return false;
        }

        if (input.contractIds && !input.contractIds.includes(contract.id)) {
          return false;
        }

        return (
          contract.startDate <= input.payPeriodEnd &&
          normalizeDate(contract.endDate) >= input.payPeriodStart
        );
      })
      .sort((left, right) => left.employee.fullName.localeCompare(right.employee.fullName));
  }

  async getContractById(id: string): Promise<PayrollContract> {
    const contract = this.contracts.get(id);
    if (!contract) {
      throw new HttpError(404, `Payroll contract with id "${id}" not found`);
    }

    return contract;
  }

  async listPaySlips(query: ListPaySlipsQuery): Promise<PayrollPaySlipListQueryResult> {
    const filtered = Array.from(this.paySlips.values())
      .filter((paySlip) => {
        if (query.status && paySlip.status !== query.status) {
          return false;
        }
        if (query.employeeId && paySlip.employeeId !== query.employeeId) {
          return false;
        }
        if (query.contractId && paySlip.contractId !== query.contractId) {
          return false;
        }
        if (query.search) {
          const haystack = [
            paySlip.employee.employeeNumber,
            paySlip.employee.fullName,
            paySlip.contract.contractType,
            paySlip.notes ?? ''
          ]
            .join(' ')
            .toLowerCase();

          if (!haystack.includes(query.search.toLowerCase())) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) =>
        comparePrimitive(
          this.getPaySlipSortValue(left, query.sortBy),
          this.getPaySlipSortValue(right, query.sortBy),
          query.sortOrder
        )
      );

    return {
      items: slicePage(filtered, query),
      total: filtered.length
    };
  }

  async getPaySlipById(id: string): Promise<PayrollPaySlip> {
    const paySlip = this.paySlips.get(id);
    if (!paySlip) {
      throw new HttpError(404, `Payslip with id "${id}" not found`);
    }

    return paySlip;
  }

  async createPaySlip(input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip> {
    const duplicate = Array.from(this.paySlips.values()).find(
      (paySlip) =>
        paySlip.contractId === input.contractId &&
        paySlip.payPeriodStart === input.payPeriodStart &&
        paySlip.payPeriodEnd === input.payPeriodEnd
    );
    if (duplicate) {
      throw new HttpError(409, 'A payslip already exists for this contract and pay period');
    }

    const contract = await this.getContractById(input.contractId);
    const timestamp = nowIso();
    const paySlipId = crypto.randomUUID();
    const lines = input.lines.map((line) => this.createPaySlipLine(paySlipId, line));

    const paySlip: PayrollPaySlip = {
      id: paySlipId,
      employeeId: input.employeeId,
      contractId: input.contractId,
      employee: contract.employee,
      contract,
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd,
      paymentDate: input.paymentDate,
      issuedAt: undefined,
      grossAmount: input.grossAmount,
      totalDeductions: input.totalDeductions,
      netAmount: input.netAmount,
      currency: input.currency,
      status: 'draft',
      notes: input.notes,
      lines,
      linkedTransactionsCount: 0,
      linkedJournalLinesCount: 0,
      linkedTransactions: [],
      linkedJournalEntries: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.paySlips.set(paySlip.id, paySlip);
    return paySlip;
  }

  async updatePaySlip(id: string, input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip> {
    const existing = await this.getPaySlipById(id);
    const contract = await this.getContractById(input.contractId);
    const updated: PayrollPaySlip = {
      ...existing,
      employeeId: input.employeeId,
      contractId: input.contractId,
      employee: contract.employee,
      contract,
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd,
      paymentDate: input.paymentDate,
      currency: input.currency,
      notes: input.notes,
      grossAmount: input.grossAmount,
      totalDeductions: input.totalDeductions,
      netAmount: input.netAmount,
      lines: input.lines.map((line) => this.createPaySlipLine(id, line)),
      updatedAt: nowIso()
    };

    this.paySlips.set(id, updated);
    return updated;
  }

  async issuePaySlip(id: string, issuedAt: string): Promise<PayrollPaySlip> {
    const existing = await this.getPaySlipById(id);
    const updated = {
      ...existing,
      status: 'issued',
      issuedAt,
      updatedAt: nowIso()
    };

    this.paySlips.set(id, updated);
    return updated;
  }

  async markPaySlipPaid(id: string, paymentDate: string): Promise<PayrollPaySlip> {
    const existing = await this.getPaySlipById(id);
    const updated = {
      ...existing,
      status: 'paid',
      paymentDate,
      updatedAt: nowIso()
    };

    this.paySlips.set(id, updated);
    return updated;
  }

  async removePaySlip(id: string): Promise<void> {
    const removed = this.paySlips.delete(id);
    if (!removed) {
      throw new HttpError(404, `Payslip with id "${id}" not found`);
    }
  }

  async createJournalEntryForPaySlip(
    id: string,
    input: CreatePaySlipJournalEntryInput
  ): Promise<PayrollJournalEntryLink> {
    const paySlip = await this.getPaySlipById(id);
    const timestamp = nowIso();
    const journalEntry: PayrollLinkedJournalEntry = {
      id: crypto.randomUUID(),
      entryNumber:
        input.entryNumber ?? `PAY-${paySlip.payPeriodStart.replaceAll('-', '')}-${paySlip.id.slice(0, 8)}`,
      entryDate: input.entryDate ?? paySlip.paymentDate ?? paySlip.payPeriodEnd,
      status: input.status ?? 'draft',
      postedAt: input.status === 'posted' ? timestamp : undefined,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const nextPaySlip: PayrollPaySlip = {
      ...paySlip,
      linkedJournalLinesCount:
        paySlip.linkedJournalLinesCount + (paySlip.totalDeductions > 0 ? 3 : 2),
      linkedJournalEntries: [...(paySlip.linkedJournalEntries ?? []), journalEntry],
      updatedAt: timestamp
    };

    this.paySlips.set(id, nextPaySlip);

    return {
      paySlip: nextPaySlip,
      journalEntry
    };
  }

  async registerPaymentForPaySlip(
    id: string,
    input: RegisterPaySlipPaymentInput
  ): Promise<PayrollPaymentRegistration> {
    const paySlip = await this.getPaySlipById(id);
    const transactionDate = input.transactionDate ?? paySlip.paymentDate ?? paySlip.payPeriodEnd;
    const timestamp = nowIso();
    const transaction: PayrollLinkedTransaction = {
      id: crypto.randomUUID(),
      amount: paySlip.netAmount,
      transactionDate,
      accountingCategory: 'payroll',
      referenceNumber: input.referenceNumber,
      description: input.description,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const nextPaySlip: PayrollPaySlip = {
      ...paySlip,
      status: input.markAsPaid === false ? paySlip.status : 'paid',
      paymentDate: input.markAsPaid === false ? paySlip.paymentDate : transactionDate,
      linkedTransactionsCount: paySlip.linkedTransactionsCount + 1,
      linkedTransactions: [...(paySlip.linkedTransactions ?? []), transaction],
      updatedAt: timestamp
    };

    this.paySlips.set(id, nextPaySlip);

    return {
      paySlip: nextPaySlip,
      transaction
    };
  }

  async getOverview(): Promise<PayrollOverviewResult> {
    const paySlips = Array.from(this.paySlips.values());
    const activeContracts = Array.from(this.contracts.values()).filter(
      (contract) => contract.status === 'active'
    ).length;

    return {
      kpis: {
        activeContracts,
        totalPaySlips: paySlips.length,
        draftPaySlips: paySlips.filter((paySlip) => paySlip.status === 'draft').length,
        issuedPaySlips: paySlips.filter((paySlip) => paySlip.status === 'issued').length,
        paidPaySlips: paySlips.filter((paySlip) => paySlip.status === 'paid').length,
        cancelledPaySlips: paySlips.filter((paySlip) => paySlip.status === 'cancelled').length,
        grossAmountTotal: paySlips.reduce((sum, paySlip) => sum + paySlip.grossAmount, 0),
        netAmountTotal: paySlips.reduce((sum, paySlip) => sum + paySlip.netAmount, 0)
      },
      recentPaySlips: paySlips
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
    };
  }

  private createPaySlipLine(paySlipId: string, input: CreatePaySlipLineInput): PayrollPaySlipLine {
    const timestamp = nowIso();

    return {
      id: crypto.randomUUID(),
      paySlipId,
      lineType: input.lineType,
      label: input.label,
      amount: input.amount,
      description: input.description,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  private seedContracts() {
    const sampleEmployees: PayrollEmployeeSummary[] = [
      {
        id: crypto.randomUUID(),
        employeeNumber: 'EMP-001',
        fullName: 'Alice Nduwimana',
        email: 'alice@fluxo.local',
        status: 'active'
      },
      {
        id: crypto.randomUUID(),
        employeeNumber: 'EMP-002',
        fullName: 'Jean Niyonzima',
        email: 'jean@fluxo.local',
        status: 'active'
      }
    ];

    for (const employee of sampleEmployees) {
      this.employees.set(employee.id, employee);

      const timestamp = nowIso();
      const contract: PayrollContract = {
        id: crypto.randomUUID(),
        employeeId: employee.id,
        employee,
        contractType: employee.employeeNumber === 'EMP-001' ? 'full-time' : 'consultant',
        status: 'active',
        startDate: '2026-01-01',
        salaryAmount: employee.employeeNumber === 'EMP-001' ? 1_500_000 : 900_000,
        currency: 'BIF',
        paymentFrequency: 'monthly',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      this.contracts.set(contract.id, contract);
    }
  }

  private getContractSortValue(contract: PayrollContract, sortBy: ListPayrollContractsQuery['sortBy']) {
    return contract[sortBy];
  }

  private getPaySlipSortValue(paySlip: PayrollPaySlip, sortBy: ListPaySlipsQuery['sortBy']) {
    return paySlip[sortBy];
  }
}

export class PrismaPayrollRepository implements PayrollRepository {
  constructor(
    private readonly prismaResolver:
      | TenantPrismaClientLike
      | (() => TenantPrismaClientLike | null)
  ) {}

  private get prisma() {
    const resolved =
      typeof this.prismaResolver === 'function' ? this.prismaResolver() : this.prismaResolver;
    if (!resolved) {
      throw new HttpError(503, 'Payroll repository requires an active tenant database connection');
    }
    return resolved;
  }

  async listContracts(query: ListPayrollContractsQuery): Promise<PayrollContractListQueryResult> {
    const contracts = await this.prisma.employeeContract.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.paymentFrequency ? { paymentFrequency: query.paymentFrequency } : {})
      },
      include: {
        employee: true
      }
    });

    const filtered = contracts
      .filter((contract) => {
        if (!query.search) {
          return true;
        }

        const haystack = [
          contract.employee.employeeNumber,
          contract.employee.firstName,
          contract.employee.lastName,
          contract.contractType,
          contract.currency
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query.search.toLowerCase());
      })
      .sort((left, right) =>
        comparePrimitive(
          this.getContractSortValue(left, query.sortBy),
          this.getContractSortValue(right, query.sortBy),
          query.sortOrder
        )
      );

    return {
      items: slicePage(filtered.map((contract) => this.mapContract(contract)), query),
      total: filtered.length
    };
  }

  async listContractsEligibleForPayRun(input: GeneratePayRunInput): Promise<PayrollContract[]> {
    const contracts = await this.prisma.employeeContract.findMany({
      where: {
        status: 'active',
        startDate: {
          lte: new Date(input.payPeriodEnd)
        },
        OR: [
          {
            endDate: null
          },
          {
            endDate: {
              gte: new Date(input.payPeriodStart)
            }
          }
        ],
        ...(input.contractIds
          ? {
              id: {
                in: input.contractIds
              }
            }
          : {})
      },
      include: {
        employee: true
      },
      orderBy: [
        {
          employee: {
            lastName: 'asc'
          }
        },
        {
          employee: {
            firstName: 'asc'
          }
        }
      ]
    });

    return contracts.map((contract) => this.mapContract(contract));
  }

  async getContractById(id: string): Promise<PayrollContract> {
    const contract = await this.prisma.employeeContract.findUnique({
      where: { id },
      include: {
        employee: true
      }
    });
    if (!contract) {
      throw new HttpError(404, `Payroll contract with id "${id}" not found`);
    }

    return this.mapContract(contract);
  }

  async listPaySlips(query: ListPaySlipsQuery): Promise<PayrollPaySlipListQueryResult> {
    const paySlips = await this.prisma.paySlip.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...(query.contractId ? { contractId: query.contractId } : {})
      },
      include: {
        employee: true,
        contract: {
          include: {
            employee: true
          }
        },
        lines: {
          orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
        },
        transactions: {
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
        },
        journalEntryLines: {
          include: {
            journalEntry: true
          },
          orderBy: [{ createdAt: 'desc' }]
        }
      }
    });

    const filtered = paySlips
      .filter((paySlip) => {
        if (!query.search) {
          return true;
        }

        const haystack = [
          paySlip.employee.employeeNumber,
          paySlip.employee.firstName,
          paySlip.employee.lastName,
          paySlip.contract.contractType,
          paySlip.notes ?? ''
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query.search.toLowerCase());
      })
      .sort((left, right) =>
        comparePrimitive(
          this.getPaySlipSortValue(left, query.sortBy),
          this.getPaySlipSortValue(right, query.sortBy),
          query.sortOrder
        )
      );

    return {
      items: slicePage(filtered.map((paySlip) => this.mapPaySlip(paySlip)), query),
      total: filtered.length
    };
  }

  async getPaySlipById(id: string): Promise<PayrollPaySlip> {
    const paySlip = await this.prisma.paySlip.findUnique({
      where: { id },
      include: {
        employee: true,
        contract: {
          include: {
            employee: true
          }
        },
        lines: {
          orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
        },
        transactions: {
          orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
        },
        journalEntryLines: {
          include: {
            journalEntry: true
          },
          orderBy: [{ createdAt: 'desc' }]
        }
      }
    });
    if (!paySlip) {
      throw new HttpError(404, `Payslip with id "${id}" not found`);
    }

    return this.mapPaySlip(paySlip);
  }

  async createPaySlip(input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip> {
    try {
      const paySlip = await this.prisma.paySlip.create({
        data: {
          employeeId: input.employeeId,
          contractId: input.contractId,
          payPeriodStart: new Date(input.payPeriodStart),
          payPeriodEnd: new Date(input.payPeriodEnd),
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : null,
          currency: input.currency,
          notes: input.notes ?? null,
          grossAmount: input.grossAmount,
          totalDeductions: input.totalDeductions,
          netAmount: input.netAmount,
          lines: {
            create: input.lines.map((line) => ({
              lineType: line.lineType,
              label: line.label,
              amount: line.amount,
              description: line.description ?? null
            }))
          }
        },
        include: {
          employee: true,
          contract: {
            include: {
              employee: true
            }
          },
          lines: {
            orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
          },
          transactions: {
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
          },
          journalEntryLines: {
            include: {
              journalEntry: true
            },
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      });

      return this.mapPaySlip(paySlip);
    } catch (error) {
      throw this.mapPrismaError(error, 'Payslip');
    }
  }

  async updatePaySlip(id: string, input: UpsertPaySlipRecordInput): Promise<PayrollPaySlip> {
    try {
      const paySlip = await this.prisma.paySlip.update({
        where: { id },
        data: {
          employeeId: input.employeeId,
          contractId: input.contractId,
          payPeriodStart: new Date(input.payPeriodStart),
          payPeriodEnd: new Date(input.payPeriodEnd),
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : null,
          currency: input.currency,
          notes: input.notes ?? null,
          grossAmount: input.grossAmount,
          totalDeductions: input.totalDeductions,
          netAmount: input.netAmount,
          lines: {
            deleteMany: {},
            create: input.lines.map((line) => ({
              lineType: line.lineType,
              label: line.label,
              amount: line.amount,
              description: line.description ?? null
            }))
          }
        },
        include: {
          employee: true,
          contract: {
            include: {
              employee: true
            }
          },
          lines: {
            orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
          },
          transactions: {
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
          },
          journalEntryLines: {
            include: {
              journalEntry: true
            },
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      });

      return this.mapPaySlip(paySlip);
    } catch (error) {
      throw this.mapPrismaError(error, 'Payslip');
    }
  }

  async issuePaySlip(id: string, issuedAt: string): Promise<PayrollPaySlip> {
    try {
      const paySlip = await this.prisma.paySlip.update({
        where: { id },
        data: {
          status: 'issued',
          issuedAt: new Date(issuedAt)
        },
        include: {
          employee: true,
          contract: {
            include: {
              employee: true
            }
          },
          lines: {
            orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
          },
          transactions: {
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
          },
          journalEntryLines: {
            include: {
              journalEntry: true
            },
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      });

      return this.mapPaySlip(paySlip);
    } catch (error) {
      throw this.mapPrismaError(error, 'Payslip');
    }
  }

  async markPaySlipPaid(id: string, paymentDate: string): Promise<PayrollPaySlip> {
    try {
      const paySlip = await this.prisma.paySlip.update({
        where: { id },
        data: {
          status: 'paid',
          paymentDate: new Date(paymentDate)
        },
        include: {
          employee: true,
          contract: {
            include: {
              employee: true
            }
          },
          lines: {
            orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
          },
          transactions: {
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
          },
          journalEntryLines: {
            include: {
              journalEntry: true
            },
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      });

      return this.mapPaySlip(paySlip);
    } catch (error) {
      throw this.mapPrismaError(error, 'Payslip');
    }
  }

  async removePaySlip(id: string): Promise<void> {
    try {
      await this.prisma.paySlip.delete({
        where: { id }
      });
    } catch (error) {
      if (
        error instanceof TenantPrisma.PrismaClientKnownRequestError &&
        (error as InstanceType<typeof TenantPrisma.PrismaClientKnownRequestError>).code === 'P2025'
      ) {
        throw new HttpError(404, `Payslip with id "${id}" not found`);
      }

      throw error;
    }
  }

  async createJournalEntryForPaySlip(
    id: string,
    input: CreatePaySlipJournalEntryInput
  ): Promise<PayrollJournalEntryLink> {
    const paySlip = await this.getPaySlipById(id);
    const entryDate = input.entryDate ?? paySlip.paymentDate ?? paySlip.payPeriodEnd;
    const entryNumber =
      input.entryNumber ?? `PAY-${entryDate.replaceAll('-', '')}-${id.slice(0, 8)}`;
    const journalEntry = await this.prisma.journalEntry.create({
      data: {
        entryNumber,
        entryDate: new Date(entryDate),
        description:
          input.description ??
          `Payroll accrual for ${paySlip.employee.fullName} (${paySlip.payPeriodStart} to ${paySlip.payPeriodEnd})`,
        periodYear: Number(entryDate.slice(0, 4)),
        periodMonth: Number(entryDate.slice(5, 7)),
        status: input.status ?? 'draft',
        postedAt: input.status === 'posted' ? new Date() : null,
        postedBy: input.postedBy ?? null,
        lines: {
          create: [
            {
              accountId: input.expenseAccountId,
              debitAmount: paySlip.grossAmount,
              creditAmount: 0,
              description: 'Gross payroll expense',
              employeeId: paySlip.employeeId,
              paySlipId: id,
              referenceNumber: paySlip.id
            },
            {
              accountId: input.payrollPayableAccountId,
              debitAmount: 0,
              creditAmount: paySlip.netAmount,
              description: 'Net payroll payable',
              employeeId: paySlip.employeeId,
              paySlipId: id,
              referenceNumber: paySlip.id
            },
            ...(paySlip.totalDeductions > 0
              ? [
                  {
                    accountId: input.deductionsPayableAccountId!,
                    debitAmount: 0,
                    creditAmount: paySlip.totalDeductions,
                    description: 'Payroll deductions payable',
                    employeeId: paySlip.employeeId,
                    paySlipId: id,
                    referenceNumber: paySlip.id
                  }
                ]
              : [])
          ]
        }
      }
    });

    const nextPaySlip = await this.getPaySlipById(id);

    return {
      paySlip: nextPaySlip,
      journalEntry: this.mapJournalEntry(journalEntry)
    };
  }

  async registerPaymentForPaySlip(
    id: string,
    input: RegisterPaySlipPaymentInput
  ): Promise<PayrollPaymentRegistration> {
    const paySlipRecord = await this.getPaySlipById(id);
    const transactionDate = input.transactionDate ?? new Date().toISOString().slice(0, 10);
    const transaction = await this.prisma.financeTransaction.create({
      data: {
        transactionTypeId: input.transactionTypeId,
        accountingCategory: 'payroll',
        amount: paySlipRecord.netAmount,
        paymentMethodId: input.paymentMethodId,
        referenceNumber: input.referenceNumber ?? `PAY-${id.slice(0, 8)}`,
        transactionDate: new Date(transactionDate),
        description: input.description ?? 'Payroll payment',
        employeeId: paySlipRecord.employeeId,
        paySlipId: id
      }
    });

    if (input.markAsPaid !== false) {
      await this.prisma.paySlip.update({
        where: { id },
        data: {
          status: 'paid',
          paymentDate: new Date(transactionDate)
        }
      });
    }

    const paySlip = await this.getPaySlipById(id);

    return {
      paySlip,
      transaction: this.mapTransaction(transaction)
    };
  }

  async getOverview(): Promise<PayrollOverviewResult> {
    const [activeContracts, paySlips] = await Promise.all([
      this.prisma.employeeContract.count({
        where: { status: 'active' }
      }),
      this.prisma.paySlip.findMany({
        include: {
          employee: true,
          contract: {
            include: {
              employee: true
            }
          },
          lines: {
            orderBy: [{ lineType: 'asc' }, { createdAt: 'asc' }]
          },
          transactions: {
            orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]
          },
          journalEntryLines: {
            include: {
              journalEntry: true
            },
            orderBy: [{ createdAt: 'desc' }]
          }
        }
      })
    ]);

    const mapped = paySlips.map((paySlip) => this.mapPaySlip(paySlip));

    return {
      kpis: {
        activeContracts,
        totalPaySlips: mapped.length,
        draftPaySlips: mapped.filter((paySlip) => paySlip.status === 'draft').length,
        issuedPaySlips: mapped.filter((paySlip) => paySlip.status === 'issued').length,
        paidPaySlips: mapped.filter((paySlip) => paySlip.status === 'paid').length,
        cancelledPaySlips: mapped.filter((paySlip) => paySlip.status === 'cancelled').length,
        grossAmountTotal: mapped.reduce((sum, paySlip) => sum + paySlip.grossAmount, 0),
        netAmountTotal: mapped.reduce((sum, paySlip) => sum + paySlip.netAmount, 0)
      },
      recentPaySlips: mapped
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, 5)
    };
  }

  private mapContract(contract: any): PayrollContract {
    return {
      id: contract.id,
      employeeId: contract.employeeId,
      employee: mapEmployeeSummary(contract.employee),
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

  private mapPaySlip(paySlip: any): PayrollPaySlip {
    const linkedJournalEntries = new Map<string, PayrollLinkedJournalEntry>();
    for (const line of paySlip.journalEntryLines) {
      if (!line.journalEntry) {
        continue;
      }

      linkedJournalEntries.set(line.journalEntry.id, this.mapJournalEntry(line.journalEntry));
    }

    return {
      id: paySlip.id,
      employeeId: paySlip.employeeId,
      contractId: paySlip.contractId,
      employee: mapEmployeeSummary(paySlip.employee),
      contract: this.mapContract(paySlip.contract),
      payPeriodStart: paySlip.payPeriodStart.toISOString().slice(0, 10),
      payPeriodEnd: paySlip.payPeriodEnd.toISOString().slice(0, 10),
      paymentDate: paySlip.paymentDate?.toISOString().slice(0, 10),
      issuedAt: paySlip.issuedAt?.toISOString(),
      grossAmount: toNumber(paySlip.grossAmount),
      totalDeductions: toNumber(paySlip.totalDeductions),
      netAmount: toNumber(paySlip.netAmount),
      currency: paySlip.currency,
      status: paySlip.status,
      notes: paySlip.notes ?? undefined,
      lines: paySlip.lines.map((line: any) => this.mapLine(line)),
      linkedTransactionsCount: paySlip.transactions.length,
      linkedJournalLinesCount: paySlip.journalEntryLines.length,
      linkedTransactions: paySlip.transactions.map((transaction: any) => this.mapTransaction(transaction)),
      linkedJournalEntries: Array.from(linkedJournalEntries.values()),
      createdAt: paySlip.createdAt.toISOString(),
      updatedAt: paySlip.updatedAt.toISOString()
    };
  }

  private mapLine(line: any): PayrollPaySlipLine {
    return {
      id: line.id,
      paySlipId: line.paySlipId,
      lineType: line.lineType,
      label: line.label,
      amount: toNumber(line.amount),
      description: line.description ?? undefined,
      createdAt: line.createdAt.toISOString(),
      updatedAt: line.updatedAt.toISOString()
    };
  }

  private mapTransaction(transaction: any): PayrollLinkedTransaction {
    return {
      id: transaction.id,
      amount: toNumber(transaction.amount),
      transactionDate: transaction.transactionDate.toISOString().slice(0, 10),
      accountingCategory: transaction.accountingCategory,
      referenceNumber: transaction.referenceNumber ?? undefined,
      description: transaction.description ?? undefined,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
  }

  private mapJournalEntry(journalEntry: any): PayrollLinkedJournalEntry {
    return {
      id: journalEntry.id,
      entryNumber: journalEntry.entryNumber,
      entryDate: journalEntry.entryDate.toISOString().slice(0, 10),
      status: journalEntry.status,
      postedAt: journalEntry.postedAt?.toISOString(),
      createdAt: journalEntry.createdAt.toISOString(),
      updatedAt: journalEntry.updatedAt.toISOString()
    };
  }

  private getContractSortValue(contract: any, sortBy: ListPayrollContractsQuery['sortBy']) {
    if (sortBy === 'salaryAmount') {
      return toNumber(contract.salaryAmount);
    }
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      return contract[sortBy]?.toISOString?.() ?? contract[sortBy];
    }
    if (sortBy === 'startDate' || sortBy === 'endDate') {
      return contract[sortBy]?.toISOString?.()?.slice(0, 10) ?? normalizeDate(undefined);
    }

    return contract[sortBy];
  }

  private getPaySlipSortValue(paySlip: any, sortBy: ListPaySlipsQuery['sortBy']) {
    if (sortBy === 'grossAmount' || sortBy === 'netAmount') {
      return toNumber(paySlip[sortBy]);
    }
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      return paySlip[sortBy]?.toISOString?.() ?? paySlip[sortBy];
    }
    if (sortBy === 'payPeriodStart' || sortBy === 'payPeriodEnd') {
      return paySlip[sortBy]?.toISOString?.()?.slice(0, 10) ?? normalizeDate(undefined);
    }

    return paySlip[sortBy];
  }

  private mapPrismaError(error: unknown, entityLabel: string) {
    if (error instanceof TenantPrisma.PrismaClientKnownRequestError) {
      const knownError = error as InstanceType<typeof TenantPrisma.PrismaClientKnownRequestError>;

      if (knownError.code === 'P2002') {
        return new HttpError(409, `${entityLabel} already exists`);
      }
      if (knownError.code === 'P2003') {
        return new HttpError(409, `${entityLabel} references a record that does not exist`);
      }
      if (knownError.code === 'P2025') {
        return new HttpError(404, `${entityLabel} not found`);
      }
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
