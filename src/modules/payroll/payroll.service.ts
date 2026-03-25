import { HttpError } from '../../shared/http-error';
import { buildPaginatedResult } from '../../shared/pagination';
import {
  type CreatePaySlipJournalEntryInput,
  type CreatePaySlipInput,
  type CreatePaySlipLineInput,
  type GeneratePayRunInput,
  type ListPayrollContractsQuery,
  type ListPaySlipsQuery,
  type MarkPaySlipPaidInput,
  type RegisterPaySlipPaymentInput,
  type UpdatePaySlipInput
} from './payroll.schema';
import { type PayrollRepository } from './payroll.repository';
import { type PayrollOverview, type PayrollPayRunGenerationResult } from './payroll.types';

export class PayrollService {
  constructor(private readonly payrollRepository: PayrollRepository) {}

  async getOverview(): Promise<PayrollOverview> {
    const overview = await this.payrollRepository.getOverview();

    return {
      module: 'payroll',
      description:
        'Payroll module for contract-based payslips, payment lifecycle and tenant payroll visibility.',
      ready: true,
      boundaries: ['contracts', 'pay-slips', 'pay-slip-lines'],
      ...overview
    };
  }

  async listContracts(query: ListPayrollContractsQuery) {
    const result = await this.payrollRepository.listContracts(query);

    return buildPaginatedResult(result.items, query, result.total);
  }

  getContractById(id: string) {
    return this.payrollRepository.getContractById(id);
  }

  async listPaySlips(query: ListPaySlipsQuery) {
    const result = await this.payrollRepository.listPaySlips(query);

    return buildPaginatedResult(result.items, query, result.total);
  }

  getPaySlipById(id: string) {
    return this.payrollRepository.getPaySlipById(id);
  }

  async generatePayRun(input: GeneratePayRunInput): Promise<PayrollPayRunGenerationResult> {
    const contracts = await this.payrollRepository.listContractsEligibleForPayRun(input);
    const created: PayrollPayRunGenerationResult['created'] = [];
    const skipped: PayrollPayRunGenerationResult['skipped'] = [];

    for (const contract of contracts) {
      try {
        const paySlip = await this.createPaySlip({
          employeeId: contract.employeeId,
          contractId: contract.id,
          payPeriodStart: input.payPeriodStart,
          payPeriodEnd: input.payPeriodEnd,
          paymentDate: input.paymentDate,
          currency: contract.currency,
          notes: input.notes,
          lines: [
            {
              lineType: 'earning',
              label: input.earningLabel ?? 'Base salary',
              amount: contract.salaryAmount
            }
          ]
        });

        created.push(paySlip);
      } catch (error) {
        if (
          input.skipExisting !== false &&
          error instanceof HttpError &&
          error.statusCode === 409 &&
          /already exists for this contract and pay period/i.test(error.message)
        ) {
          skipped.push({
            contractId: contract.id,
            employeeId: contract.employeeId,
            employeeName: contract.employee.fullName,
            reason: 'payslip_already_exists'
          });
          continue;
        }

        throw error;
      }
    }

    return {
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd,
      paymentDate: input.paymentDate,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped
    };
  }

  async createPaySlip(input: CreatePaySlipInput) {
    const contract = await this.assertContractContext(input.employeeId, input.contractId, {
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd
    });
    const totals = this.computeTotals(input.lines);

    return this.payrollRepository.createPaySlip({
      employeeId: contract.employeeId,
      contractId: contract.id,
      payPeriodStart: input.payPeriodStart,
      payPeriodEnd: input.payPeriodEnd,
      paymentDate: input.paymentDate,
      currency: input.currency ?? 'BIF',
      notes: input.notes,
      lines: input.lines,
      ...totals
    });
  }

  async updatePaySlip(id: string, input: UpdatePaySlipInput) {
    const existing = await this.payrollRepository.getPaySlipById(id);
    this.assertDraft(existing.status, 'Only draft payslips can be updated');

    const nextPayPeriodStart = input.payPeriodStart ?? existing.payPeriodStart;
    const nextPayPeriodEnd = input.payPeriodEnd ?? existing.payPeriodEnd;
    const nextLines = input.lines ?? this.serializeLines(existing.lines);
    const contract = await this.assertContractContext(existing.employeeId, existing.contractId, {
      payPeriodStart: nextPayPeriodStart,
      payPeriodEnd: nextPayPeriodEnd
    });
    const totals = this.computeTotals(nextLines);

    return this.payrollRepository.updatePaySlip(id, {
      employeeId: contract.employeeId,
      contractId: contract.id,
      payPeriodStart: nextPayPeriodStart,
      payPeriodEnd: nextPayPeriodEnd,
      paymentDate: input.paymentDate ?? existing.paymentDate,
      currency: input.currency ?? existing.currency ?? 'BIF',
      notes: input.notes ?? existing.notes,
      lines: nextLines,
      ...totals
    });
  }

  async issuePaySlip(id: string) {
    const paySlip = await this.payrollRepository.getPaySlipById(id);
    this.assertDraft(paySlip.status, 'Only draft payslips can be issued');
    if (paySlip.lines.length === 0) {
      throw new HttpError(409, 'A payslip cannot be issued without at least one payroll line');
    }
    if (paySlip.netAmount < 0) {
      throw new HttpError(409, 'A payslip with negative net amount cannot be issued');
    }

    return this.payrollRepository.issuePaySlip(id, new Date().toISOString());
  }

  async markPaySlipPaid(id: string, input?: MarkPaySlipPaidInput) {
    const paySlip = await this.payrollRepository.getPaySlipById(id);
    if (paySlip.status !== 'issued') {
      throw new HttpError(409, 'Only issued payslips can be marked as paid');
    }

    const paymentDate = input?.paymentDate ?? new Date().toISOString().slice(0, 10);
    if (paymentDate < paySlip.payPeriodStart) {
      throw new HttpError(409, 'Payment date cannot be before the pay period start');
    }

    return this.payrollRepository.markPaySlipPaid(id, paymentDate);
  }

  async createJournalEntryForPaySlip(id: string, input: CreatePaySlipJournalEntryInput) {
    const paySlip = await this.payrollRepository.getPaySlipById(id);
    if (!['issued', 'paid'].includes(paySlip.status)) {
      throw new HttpError(
        409,
        'A payslip must be issued before creating a linked accounting journal entry'
      );
    }
    if (paySlip.linkedJournalLinesCount > 0) {
      throw new HttpError(409, 'This payslip already has linked journal entry lines');
    }
    if (paySlip.totalDeductions > 0 && !input.deductionsPayableAccountId) {
      throw new HttpError(
        409,
        'A deductions payable account is required when the payslip contains deductions or taxes'
      );
    }

    return this.payrollRepository.createJournalEntryForPaySlip(id, input);
  }

  async registerPaymentForPaySlip(id: string, input: RegisterPaySlipPaymentInput) {
    const paySlip = await this.payrollRepository.getPaySlipById(id);
    if (!['issued', 'paid'].includes(paySlip.status)) {
      throw new HttpError(409, 'Only issued or paid payslips can register a finance payment');
    }
    if (paySlip.linkedTransactionsCount > 0) {
      throw new HttpError(409, 'This payslip already has a linked finance transaction');
    }

    return this.payrollRepository.registerPaymentForPaySlip(id, input);
  }

  async removePaySlip(id: string) {
    const paySlip = await this.payrollRepository.getPaySlipById(id);
    this.assertDraft(paySlip.status, 'Only draft payslips can be deleted');
    if (paySlip.linkedTransactionsCount > 0 || paySlip.linkedJournalLinesCount > 0) {
      throw new HttpError(
        409,
        'A payslip linked to finance transactions or journal lines cannot be deleted'
      );
    }

    await this.payrollRepository.removePaySlip(id);
  }

  private async assertContractContext(
    employeeId: string,
    contractId: string,
    period: { payPeriodStart: string; payPeriodEnd: string }
  ) {
    const contract = await this.payrollRepository.getContractById(contractId);
    if (contract.employeeId !== employeeId) {
      throw new HttpError(409, 'The selected contract does not belong to the selected employee');
    }
    if (contract.employee.status === 'terminated') {
      throw new HttpError(409, 'Payslips cannot be created for terminated employees');
    }
    if (contract.status !== 'active') {
      throw new HttpError(409, 'Payslips can only be created for active contracts');
    }
    if (period.payPeriodStart < contract.startDate) {
      throw new HttpError(409, 'Pay period cannot start before the contract start date');
    }
    if (contract.endDate && period.payPeriodEnd > contract.endDate) {
      throw new HttpError(409, 'Pay period cannot extend beyond the contract end date');
    }

    return contract;
  }

  private computeTotals(lines: CreatePaySlipLineInput[]) {
    const grossAmount = lines
      .filter((line) => line.lineType === 'earning' || line.lineType === 'benefit')
      .reduce((sum, line) => sum + line.amount, 0);
    const totalDeductions = lines
      .filter((line) => line.lineType === 'deduction' || line.lineType === 'tax')
      .reduce((sum, line) => sum + line.amount, 0);
    const netAmount = grossAmount - totalDeductions;

    if (grossAmount <= 0) {
      throw new HttpError(409, 'A payslip must contain at least one earning or benefit line');
    }
    if (netAmount < 0) {
      throw new HttpError(409, 'Total deductions cannot exceed gross amount');
    }

    return {
      grossAmount,
      totalDeductions,
      netAmount
    };
  }

  private serializeLines(
    lines: Array<{ lineType: string; label: string; amount: number; description?: string }>
  ) {
    return lines.map((line) => ({
      lineType: line.lineType as CreatePaySlipLineInput['lineType'],
      label: line.label,
      amount: line.amount,
      description: line.description
    }));
  }

  private assertDraft(status: string, message: string) {
    if (status !== 'draft') {
      throw new HttpError(409, message);
    }
  }
}
