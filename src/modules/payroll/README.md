# Payroll Module

The `payroll` module manages payslips inside each tenant database. It relies on employee contracts from the `employees` module and keeps payroll records isolated per company.

## Scope

- payroll overview
- payroll-ready contract listing
- batch pay run generation
- draft payslip creation
- draft payslip update
- payslip issue workflow
- payslip payment workflow

## Main Routes

- `GET /api/payroll`
- `GET /api/payroll/docs`
- `GET /api/payroll/contracts`
- `GET /api/payroll/contracts/:id`
- `GET /api/payroll/payslips`
- `POST /api/payroll/payslips/generate`
- `POST /api/payroll/payslips`
- `GET /api/payroll/payslips/:id`
- `PATCH /api/payroll/payslips/:id`
- `DELETE /api/payroll/payslips/:id`
- `POST /api/payroll/payslips/:id/issue`
- `POST /api/payroll/payslips/:id/mark-paid`
- `POST /api/payroll/payslips/:id/journal-entry`
- `POST /api/payroll/payslips/:id/register-payment`

## Business Rules

- a payslip is always linked to one employee and one contract
- one contract can only have one payslip for the same period
- batch generation creates one draft payslip per eligible active contract
- the contract must belong to the selected employee
- the contract must be active for the requested pay period
- only draft payslips can be updated, issued or deleted
- only issued payslips can be marked as paid
- a payslip linked to finance activity cannot be deleted
- a payslip must be issued before finance integration can be created
- only one finance payment transaction is allowed per payslip in v1

## Amount Calculation

- `gross_amount` = sum of `earning` + `benefit`
- `total_deductions` = sum of `deduction` + `tax`
- `net_amount` = `gross_amount - total_deductions`

## Tenant Behavior

- data is stored in the tenant database, not in the global admin database
- payroll routes require a valid access key with the `payroll` module enabled
- tenant resync provisions `pay_slips` and `pay_slip_lines` across existing tenant databases

## Finance Integration

The module can now communicate with `finance` in two practical ways:

- create a journal entry linked to a payslip
- register a payment transaction linked to a payslip

This allows payroll records to stay connected to accounting and cash movement without forcing the caller to use raw `finance` endpoints first.
