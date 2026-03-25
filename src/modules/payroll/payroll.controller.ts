import { type Request, type Response } from 'express';

import {
  createPaySlipJournalEntrySchema,
  createPaySlipSchema,
  generatePayRunSchema,
  listPayrollContractsQuerySchema,
  listPaySlipsQuerySchema,
  markPaySlipPaidSchema,
  registerPaySlipPaymentSchema,
  updatePaySlipSchema
} from './payroll.schema';
import { getPayrollModuleDocumentation } from './payroll.docs';
import { type PayrollService } from './payroll.service';
import { buildPaginatedHttpResponse } from '../../shared/pagination';

export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  getDocumentation = (_req: Request, res: Response) => {
    res.status(200).json(getPayrollModuleDocumentation());
  };

  overview = async (_req: Request, res: Response) => {
    res.status(200).json(await this.payrollService.getOverview());
  };

  listContracts = async (req: Request, res: Response) => {
    const query = listPayrollContractsQuerySchema.parse(req.query);
    const result = await this.payrollService.listContracts(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getContractById = async (req: Request<{ id: string }>, res: Response) => {
    const contract = await this.payrollService.getContractById(req.params.id);

    res.status(200).json({
      data: contract
    });
  };

  listPaySlips = async (req: Request, res: Response) => {
    const query = listPaySlipsQuerySchema.parse(req.query);
    const result = await this.payrollService.listPaySlips(query);

    res.status(200).json(buildPaginatedHttpResponse(result, req.originalUrl));
  };

  getPaySlipById = async (req: Request<{ id: string }>, res: Response) => {
    const paySlip = await this.payrollService.getPaySlipById(req.params.id);

    res.status(200).json({
      data: paySlip
    });
  };

  createPaySlip = async (req: Request, res: Response) => {
    const payload = createPaySlipSchema.parse(req.body);
    const paySlip = await this.payrollService.createPaySlip(payload);

    res.status(201).json({
      message: 'Payslip created successfully',
      data: paySlip
    });
  };

  generatePayRun = async (req: Request, res: Response) => {
    const payload = generatePayRunSchema.parse(req.body);
    const result = await this.payrollService.generatePayRun(payload);

    res.status(201).json({
      message: 'Payroll pay run generated successfully',
      data: result
    });
  };

  updatePaySlip = async (req: Request<{ id: string }>, res: Response) => {
    const payload = updatePaySlipSchema.parse(req.body);
    const paySlip = await this.payrollService.updatePaySlip(req.params.id, payload);

    res.status(200).json({
      message: 'Payslip updated successfully',
      data: paySlip
    });
  };

  issuePaySlip = async (req: Request<{ id: string }>, res: Response) => {
    const paySlip = await this.payrollService.issuePaySlip(req.params.id);

    res.status(200).json({
      message: 'Payslip issued successfully',
      data: paySlip
    });
  };

  markPaySlipPaid = async (req: Request<{ id: string }>, res: Response) => {
    const payload = markPaySlipPaidSchema.parse(req.body);
    const paySlip = await this.payrollService.markPaySlipPaid(req.params.id, payload);

    res.status(200).json({
      message: 'Payslip marked as paid successfully',
      data: paySlip
    });
  };

  createJournalEntryForPaySlip = async (req: Request<{ id: string }>, res: Response) => {
    const payload = createPaySlipJournalEntrySchema.parse(req.body);
    const result = await this.payrollService.createJournalEntryForPaySlip(req.params.id, payload);

    res.status(201).json({
      message: 'Payroll journal entry created successfully',
      data: result
    });
  };

  registerPaymentForPaySlip = async (req: Request<{ id: string }>, res: Response) => {
    const payload = registerPaySlipPaymentSchema.parse(req.body);
    const result = await this.payrollService.registerPaymentForPaySlip(req.params.id, payload);

    res.status(201).json({
      message: 'Payroll payment registered successfully',
      data: result
    });
  };

  removePaySlip = async (req: Request<{ id: string }>, res: Response) => {
    await this.payrollService.removePaySlip(req.params.id);

    res.status(204).send();
  };
}
