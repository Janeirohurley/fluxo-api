
// function to convert camelCase to snake_case
function toSnakeCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
// Type guard to check if a value is a record (object with string keys)
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
// Recursive function to convert example values to snake_case keys
function convertExampleValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convertExampleValue(item));
  }
// If it's not a record, return the value as is (primitive types)
  if (!isRecord(value)) {
    return value;
  }
// If it's a record, convert its keys to snake_case and recursively convert its values
  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entryValue]) => {
    result[toSnakeCase(key)] = convertExampleValue(entryValue);
    return result;
  }, {});
}
// Recursive function to transform schema objects to follow OpenAPI conventions (snake_case properties and required fields)
function transformSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => transformSchema(item));
  }

  if (!isRecord(schema)) {
    return schema;
  }

  return Object.entries(schema).reduce<Record<string, unknown>>((result, [key, value]) => {
    if (key === 'properties' && isRecord(value)) {
      result.properties = Object.fromEntries(
        Object.entries(value).map(([propertyName, propertySchema]) => [
          toSnakeCase(propertyName),
          transformSchema(propertySchema)
        ])
      );
      return result;
    }

    if (key === 'required' && Array.isArray(value)) {
      result.required = value.map((entry) => (typeof entry === 'string' ? toSnakeCase(entry) : entry));
      return result;
    }

    if (key === 'example') {
      result.example = convertExampleValue(value);
      return result;
    }

    if (key === 'items' || key === 'additionalProperties' || key === 'not') {
      result[key] = transformSchema(value);
      return result;
    }

    if (['allOf', 'anyOf', 'oneOf'].includes(key) && Array.isArray(value)) {
      result[key] = value.map((entry) => transformSchema(entry));
      return result;
    }

    result[key] = value;
    return result;
  }, {});
}
// Main function to apply OpenAPI conventions to the entire document, including paths, parameters and components
function applyOpenApiConventions<T extends Record<string, unknown>>(document: T): T {
  const normalized = structuredClone(document);

  if (isRecord(normalized.components) && isRecord(normalized.components.schemas)) {
    for (const [schemaName, schema] of Object.entries(normalized.components.schemas)) {
      normalized.components.schemas[schemaName] = transformSchema(schema);
    }
  }

  if (isRecord(normalized.paths)) {
    for (const pathItem of Object.values(normalized.paths)) {
      if (!isRecord(pathItem)) {
        continue;
      }

      for (const operation of Object.values(pathItem)) {
        if (!isRecord(operation)) {
          continue;
        }

        if (Array.isArray(operation.parameters)) {
          operation.parameters = operation.parameters.map((parameter) => {
            if (!isRecord(parameter)) {
              return parameter;
            }

            if (parameter.in === 'query' && typeof parameter.name === 'string') {
              return {
                ...parameter,
                name: toSnakeCase(parameter.name)
              };
            }

            return parameter;
          });
        }

        if (isRecord(operation.requestBody) && isRecord(operation.requestBody.content)) {
          for (const mediaType of Object.values(operation.requestBody.content)) {
            if (isRecord(mediaType) && 'schema' in mediaType) {
              mediaType.schema = transformSchema(mediaType.schema);
            }
          }
        }

        if (isRecord(operation.responses)) {
          for (const response of Object.values(operation.responses)) {
            if (!isRecord(response) || !isRecord(response.content)) {
              continue;
            }

            for (const mediaType of Object.values(response.content)) {
              if (isRecord(mediaType) && 'schema' in mediaType) {
                mediaType.schema = transformSchema(mediaType.schema);
              }
            }
          }
        }
      }
    }
  }

  return normalized;
}
// Function to create the OpenAPI document with the defined structure and apply conventions
export function createOpenApiDocument() {
  return applyOpenApiConventions({
    openapi: '3.0.3',
    info: {
      title: 'Fluxo API',
      version: '1.0.0',
      description:
        'Modular API for Fluxo. The current Swagger coverage focuses on the assets, finance and employees modules, plus core discovery endpoints.'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'System', description: 'General API discovery endpoints' },
      { name: 'Overview', description: 'Adaptive dashboard overview across active modules' },
      { name: 'Access', description: 'Subscription plans and access key inspection' },
      { name: 'Assets', description: 'Assets domain operations' },
      { name: 'Asset Categories', description: 'Asset category reference data' },
      { name: 'Asset Statuses', description: 'Asset status reference data' },
      { name: 'Intervention Types', description: 'Maintenance intervention reference data' },
      { name: 'Asset Finance', description: 'One-to-one finance data for assets' },
      { name: 'Asset Assignments', description: 'Assignment history for assets' },
      { name: 'Asset Maintenance', description: 'Maintenance logs for assets' },
      { name: 'Finance', description: 'Finance domain operations' },
      { name: 'Payment Methods', description: 'Finance payment method reference data' },
      { name: 'Transaction Types', description: 'Finance transaction type reference data' },
      { name: 'Accounting Accounts', description: 'Chart of accounts and finance reference data' },
      { name: 'Transactions', description: 'Cash movement and transaction tracking' },
      { name: 'Journal Entries', description: 'Journal entries and their accounting lines' },
      { name: 'Reconciliations', description: 'Account reconciliation operations' },
      { name: 'Employees', description: 'Employee directory and personnel operations' },
      { name: 'Employee Roles', description: 'Employee role reference data' },
      { name: 'Employee Positions', description: 'Employee position reference data' },
      { name: 'Employee Locations', description: 'Employee location reference data' },
      { name: 'Employee Assignments', description: 'Employee assignment history' },
      { name: 'Employee Contracts', description: 'Employee contract history' }
    ],
    paths: {
      '/': {
        get: {
          tags: ['System'],
          summary: 'API landing endpoint',
          responses: {
            '200': {
              description: 'Welcome payload with documentation links',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LandingResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service status',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/metrics': {
        get: {
          tags: ['System'],
          summary: 'Prometheus metrics endpoint',
          responses: {
            '200': {
              description: 'Prometheus-compatible metrics payload',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      },
      '/observability': {
        get: {
          tags: ['System'],
          summary: 'Application monitoring snapshot',
          responses: {
            '200': {
              description: 'Aggregated request metrics snapshot',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/MonitoringSnapshotResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/modules': {
        get: {
          tags: ['System'],
          summary: 'List mounted modules',
          responses: {
            '200': {
              description: 'Registered modules',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/ModuleInfo'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/access/plans': {
        get: {
          tags: ['Access'],
          summary: 'List active subscription plans',
          responses: {
            '200': {
              description: 'Active plans with their allowed modules',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AccessPlanListResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/api/access/me': {
        get: {
          tags: ['Access'],
          summary: 'Inspect the current access key',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Current access key context',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AccessSessionResponse'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      },
      '/api/overview': {
        get: {
          tags: ['Overview'],
          summary: 'Get the progressive dashboard overview for the active modules',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Overview payload tailored to the active modules in the current access key',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OverviewResponse'
                  }
                }
              }
            },
            '401': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      },
      '/openapi.json': {
        get: {
          tags: ['System'],
          summary: 'OpenAPI document',
          responses: {
            '200': {
              description: 'OpenAPI JSON'
            }
          }
        }
      },
      '/api/assets/docs': {
        get: {
          tags: ['Assets'],
          summary: 'Assets module documentation',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Assets module documentation payload'
            }
          }
        }
      },
      '/api/assets': {
        get: {
          tags: ['Assets'],
          summary: 'List assets',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 }
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
            },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string', example: 'Dell' },
              description: 'Search in inventory code, name, brand, model and serial number'
            },
            {
              name: 'categoryId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' }
            },
            {
              name: 'statusId',
              in: 'query',
              schema: { type: 'string', format: 'uuid' }
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['createdAt', 'updatedAt', 'name', 'inventoryCode'],
                default: 'createdAt'
              }
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['asc', 'desc'],
                default: 'desc'
              }
            }
          ],
          responses: {
            '200': {
              description: 'Asset list',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ListAssetsResponse'
                  }
                }
              }
            },
            '429': {
              $ref: '#/components/responses/TooManyRequests'
            }
          }
        },
        post: {
          tags: ['Assets'],
          summary: 'Create asset',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateAssetInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created asset',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Asset created successfully' },
                      data: { $ref: '#/components/schemas/AssetDetails' }
                    }
                  }
                }
              }
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      },
      '/api/assets/{id}': {
        get: {
          tags: ['Assets'],
          summary: 'Get asset by id',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          responses: {
            '200': {
              description: 'Asset with details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        $ref: '#/components/schemas/AssetDetails'
                      }
                    }
                  }
                }
              }
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        patch: {
          tags: ['Assets'],
          summary: 'Update asset',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateAssetInput'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Updated asset',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Asset updated successfully' },
                      data: { $ref: '#/components/schemas/AssetDetails' }
                    }
                  }
                }
              }
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        delete: {
          tags: ['Assets'],
          summary: 'Delete asset',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          responses: {
            '204': {
              description: 'Asset deleted'
            },
            '409': {
              description: 'Asset cannot be deleted because it has related history records',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ErrorResponse'
                  }
                }
              }
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            },
            '429': {
              $ref: '#/components/responses/TooManyRequests'
            }
          }
        }
      },
      '/api/assets/categories': {
        get: {
          tags: ['Asset Categories'],
          summary: 'List asset categories',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Category list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/AssetCategory'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Asset Categories'],
          summary: 'Create asset category',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateAssetCategoryInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created category'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      },
      '/api/assets/statuses': {
        get: {
          tags: ['Asset Statuses'],
          summary: 'List asset statuses',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Status list'
            }
          }
        },
        post: {
          tags: ['Asset Statuses'],
          summary: 'Create asset status',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateAssetStatusInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created status'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      },
      '/api/assets/intervention-types': {
        get: {
          tags: ['Intervention Types'],
          summary: 'List intervention types',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Intervention type list'
            }
          }
        },
        post: {
          tags: ['Intervention Types'],
          summary: 'Create intervention type',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateInterventionTypeInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created intervention type'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            }
          }
        }
      },
      '/api/assets/{id}/finance': {
        get: {
          tags: ['Asset Finance'],
          summary: 'Get asset finance data',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          responses: {
            '200': {
              description: 'Finance data or null'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        put: {
          tags: ['Asset Finance'],
          summary: 'Create or update asset finance data',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpsertAssetFinanceInput'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Saved finance data'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      },
      '/api/assets/{id}/assignments': {
        get: {
          tags: ['Asset Assignments'],
          summary: 'List asset assignments',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          responses: {
            '200': {
              description: 'Assignment list'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        post: {
          tags: ['Asset Assignments'],
          summary: 'Create asset assignment',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateAssetAssignmentInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created assignment'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '409': {
              $ref: '#/components/responses/Conflict'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      },
      '/api/assets/{id}/maintenance': {
        get: {
          tags: ['Asset Maintenance'],
          summary: 'List maintenance logs',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          responses: {
            '200': {
              description: 'Maintenance log list'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        },
        post: {
          tags: ['Asset Maintenance'],
          summary: 'Create maintenance log',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          parameters: [
            {
              $ref: '#/components/parameters/AssetId'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateMaintenanceLogInput'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created maintenance log'
            },
            '400': {
              $ref: '#/components/responses/ValidationError'
            },
            '404': {
              $ref: '#/components/responses/NotFound'
            }
          }
        }
      },
      '/api/finance/docs': {
        get: {
          tags: ['Finance'],
          summary: 'Finance module documentation',
          security: [
            {
              ModuleKeyAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Finance module documentation payload'
            }
          }
        }
      },
      '/api/finance/payment-methods': {
        get: {
          tags: ['Payment Methods'],
          summary: 'List payment methods',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Payment method list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/PaymentMethod' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Payment Methods'],
          summary: 'Create payment method',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePaymentMethodInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created payment method' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/transaction-types': {
        get: {
          tags: ['Transaction Types'],
          summary: 'List transaction types',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Transaction type list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/TransactionType' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Transaction Types'],
          summary: 'Create transaction type',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTransactionTypeInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created transaction type' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/accounts': {
        get: {
          tags: ['Accounting Accounts'],
          summary: 'List accounting accounts',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Accounting account list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/AccountingAccount' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Accounting Accounts'],
          summary: 'Create accounting account',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAccountingAccountInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created accounting account' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/accounts/{id}': {
        patch: {
          tags: ['Accounting Accounts'],
          summary: 'Update accounting account',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateAccountingAccountInput' }
              }
            }
          },
          responses: {
            '200': { description: 'Updated accounting account' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/transactions': {
        get: {
          tags: ['Transactions'],
          summary: 'List finance transactions',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'transactionTypeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'paymentMethodId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'accountingCategory', in: 'query', schema: { type: 'string' } },
            { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
            {
              name: 'sortBy',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['transactionDate', 'amount', 'createdAt', 'updatedAt'],
                default: 'transactionDate'
              }
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
            }
          ],
          responses: {
            '200': {
              description: 'Finance transaction list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListFinanceTransactionsResponse' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Transactions'],
          summary: 'Create transaction',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTransactionInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created transaction' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/transactions/{id}': {
        get: {
          tags: ['Transactions'],
          summary: 'Get transaction by id',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          responses: {
            '200': {
              description: 'Transaction details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/FinanceTransactionDetails' }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        },
        patch: {
          tags: ['Transactions'],
          summary: 'Update transaction',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateTransactionInput' }
              }
            }
          },
          responses: {
            '200': { description: 'Updated transaction' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        },
        delete: {
          tags: ['Transactions'],
          summary: 'Delete transaction',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          responses: {
            '204': { description: 'Transaction deleted' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/journal-entries': {
        get: {
          tags: ['Journal Entries'],
          summary: 'List journal entries',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Journal entry list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListJournalEntriesResponse' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Journal Entries'],
          summary: 'Create journal entry',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateJournalEntryInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created journal entry' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/journal-entries/{id}': {
        get: {
          tags: ['Journal Entries'],
          summary: 'Get journal entry by id',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          responses: {
            '200': {
              description: 'Journal entry details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/JournalEntryDetails' }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/finance/journal-entries/{id}/post': {
        post: {
          tags: ['Journal Entries'],
          summary: 'Post journal entry',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    postedBy: { type: 'string', format: 'uuid' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Posted journal entry' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/reconciliations': {
        get: {
          tags: ['Reconciliations'],
          summary: 'List reconciliations',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Reconciliation list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListReconciliationsResponse' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Reconciliations'],
          summary: 'Create reconciliation',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateReconciliationInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created reconciliation' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/reconciliations/{id}': {
        get: {
          tags: ['Reconciliations'],
          summary: 'Get reconciliation by id',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          responses: {
            '200': {
              description: 'Reconciliation details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/ReconciliationDetails' }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        }
      },
      '/api/finance/reconciliations/{id}/close': {
        post: {
          tags: ['Reconciliations'],
          summary: 'Close reconciliation',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    closedBy: { type: 'string', format: 'uuid' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Closed reconciliation' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/finance/reconciliations/{id}/items': {
        post: {
          tags: ['Reconciliations'],
          summary: 'Add reconciliation item',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/AssetId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateReconciliationItemInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created reconciliation item' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/docs': {
        get: {
          tags: ['Employees'],
          summary: 'Employees module documentation',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Employees module documentation payload'
            }
          }
        }
      },
      '/api/employees/roles': {
        get: {
          tags: ['Employee Roles'],
          summary: 'List employee roles',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Employee role list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EmployeeReference' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Employee Roles'],
          summary: 'Create employee role',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeRoleInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee role' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/positions': {
        get: {
          tags: ['Employee Positions'],
          summary: 'List employee positions',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Employee position list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EmployeeReference' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Employee Positions'],
          summary: 'Create employee position',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeePositionInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee position' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/locations': {
        get: {
          tags: ['Employee Locations'],
          summary: 'List employee locations',
          security: [{ ModuleKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Employee location list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EmployeeReference' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ['Employee Locations'],
          summary: 'Create employee location',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeLocationInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee location' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees': {
        get: {
          tags: ['Employees'],
          summary: 'List employees',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
            { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'on_leave', 'terminated'] } },
            { name: 'roleId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'positionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'locationId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            {
              name: 'sortBy',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['createdAt', 'updatedAt', 'employeeNumber', 'firstName', 'lastName', 'hireDate'],
                default: 'createdAt'
              }
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
            }
          ],
          responses: {
            '200': {
              description: 'Employee list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListEmployeesResponse' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Employees'],
          summary: 'Create employee',
          security: [{ ModuleKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/{id}': {
        get: {
          tags: ['Employees'],
          summary: 'Get employee by id',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          responses: {
            '200': {
              description: 'Employee details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Employee' }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        },
        patch: {
          tags: ['Employees'],
          summary: 'Update employee',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateEmployeeInput' }
              }
            }
          },
          responses: {
            '200': { description: 'Updated employee' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        },
        delete: {
          tags: ['Employees'],
          summary: 'Delete employee',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          responses: {
            '204': { description: 'Employee deleted' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/{id}/assignments': {
        get: {
          tags: ['Employee Assignments'],
          summary: 'List employee assignments',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          responses: {
            '200': {
              description: 'Employee assignment history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EmployeeAssignment' }
                      }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        },
        post: {
          tags: ['Employee Assignments'],
          summary: 'Create employee assignment',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeAssignmentInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee assignment' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/{id}/contracts': {
        get: {
          tags: ['Employee Contracts'],
          summary: 'List employee contracts',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          responses: {
            '200': {
              description: 'Employee contract history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/EmployeeContract' }
                      }
                    }
                  }
                }
              }
            },
            '404': { $ref: '#/components/responses/NotFound' }
          }
        },
        post: {
          tags: ['Employee Contracts'],
          summary: 'Create employee contract',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [{ $ref: '#/components/parameters/EmployeeId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateEmployeeContractInput' }
              }
            }
          },
          responses: {
            '201': { description: 'Created employee contract' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      },
      '/api/employees/{id}/contracts/{contractId}': {
        patch: {
          tags: ['Employee Contracts'],
          summary: 'Update employee contract',
          security: [{ ModuleKeyAuth: [] }],
          parameters: [
            { $ref: '#/components/parameters/EmployeeId' },
            { $ref: '#/components/parameters/ContractId' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateEmployeeContractInput' }
              }
            }
          },
          responses: {
            '200': { description: 'Updated employee contract' },
            '400': { $ref: '#/components/responses/ValidationError' },
            '404': { $ref: '#/components/responses/NotFound' },
            '409': { $ref: '#/components/responses/Conflict' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        ModuleKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-module-key',
          description:
            'Access key required for protected modules. You can also send it as x-api-key or Authorization: Bearer <key>.'
        }
      },
      parameters: {
        AssetId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        EmployeeId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        },
        ContractId: {
          name: 'contractId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          }
        }
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        Conflict: {
          description: 'Business rule conflict',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      },
      schemas: {
        ModuleInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'assets' },
            version: { type: 'string', example: '1.0.0' },
            basePath: { type: 'string', example: '/api/assets' },
            docsPath: { type: 'string', example: '/api/assets/docs' }
          },
          required: ['name', 'version', 'basePath']
        },
        LandingResponse: {
          type: 'object',
          properties: {
            service: { type: 'string', example: 'fluxo-api' },
            message: { type: 'string', example: 'Welcome to Fluxo API' },
            docs: {
              type: 'object',
              properties: {
                health: { type: 'string', example: '/health' },
                metrics: { type: 'string', example: '/metrics' },
                modules: { type: 'string', example: '/modules' },
                overview: { type: 'string', example: '/api/overview' },
                assets: { type: 'string', example: '/api/assets/docs' },
                finance: { type: 'string', example: '/api/finance/docs' },
                employees: { type: 'string', example: '/api/employees/docs' },
                accessPlans: { type: 'string', example: '/api/access/plans' },
                accessMe: { type: 'string', example: '/api/access/me' },
                swagger: { type: 'string', example: '/docs' },
                openApi: { type: 'string', example: '/openapi.json' }
              }
            },
            modules: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ModuleInfo'
              }
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            service: { type: 'string', example: 'fluxo-api' },
            timestamp: { type: 'string', format: 'date-time' },
            uptimeSeconds: { type: 'integer', example: 3600 },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' }
              }
            },
            rateLimit: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', example: true },
                activeBuckets: { type: 'integer', example: 4 },
                windowMs: { type: 'integer', example: 60000 },
                maxRequests: { type: 'integer', example: 120 }
              }
            },
            metrics: {
              type: 'object',
              properties: {
                requests: { type: 'integer', example: 42 },
                errors: { type: 'integer', example: 2 },
                averageResponseMs: { type: 'number', example: 18.5 }
              }
            },
            modules: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ModuleInfo'
              }
            }
          }
        },
        MonitoringRouteMetric: {
          type: 'object',
          properties: {
            route: { type: 'string', example: 'GET /api/assets/:id' },
            requests: { type: 'integer', example: 12 },
            errors: { type: 'integer', example: 1 },
            averageResponseMs: { type: 'number', example: 16.2 },
            maxResponseMs: { type: 'number', example: 41 }
          }
        },
        MonitoringSnapshotResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                uptimeSeconds: { type: 'integer', example: 3600 },
                totals: {
                  type: 'object',
                  properties: {
                    requests: { type: 'integer', example: 42 },
                    errors: { type: 'integer', example: 2 },
                    averageResponseMs: { type: 'number', example: 18.5 }
                  }
                },
                statusCounts: {
                  type: 'object',
                  additionalProperties: {
                    type: 'integer'
                  }
                },
                routes: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MonitoringRouteMetric'
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Route not found' },
            requestId: { type: 'string', example: '5d20f4c4-7302-4f8f-8b64-8e9a9d6e0ba8' },
            details: {
              nullable: true
            }
          },
          required: ['message']
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            count: { type: 'integer', example: 48 },
            page_size: { type: 'integer', example: 20 },
            current_page: { type: 'integer', example: 1 },
            total_pages: { type: 'integer', example: 3 },
            next: { type: 'string', nullable: true, example: '/api/assets?page=2&page_size=20' },
            previous: { type: 'string', nullable: true, example: null }
          },
          required: ['count', 'page_size', 'current_page', 'total_pages', 'next', 'previous']
        },
        AccessPlan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'assets-starter' },
            name: { type: 'string', example: 'Assets Starter' },
            description: { type: 'string', nullable: true },
            modules: {
              type: 'array',
              items: {
                type: 'string',
                example: 'assets'
              }
            }
          },
          required: ['id', 'code', 'name', 'modules']
        },
        AccessPlanListResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AccessPlan'
              }
            }
          },
          required: ['data']
        },
        AccessSessionResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              nullable: true,
              properties: {
                keyId: { type: 'string', format: 'uuid' },
                keyPrefix: { type: 'string', example: 'flx_live_123456' },
                label: { type: 'string', nullable: true },
                expiresAt: { type: 'string', nullable: true, format: 'date-time' },
                company: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    slug: { type: 'string', example: 'kithub' },
                    name: { type: 'string', example: 'Kithub' }
                  }
                },
                plan: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    code: { type: 'string', example: 'assets-starter' },
                    name: { type: 'string', example: 'Assets Starter' },
                    description: { type: 'string', nullable: true }
                  }
                },
                modules: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        OverviewInsight: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'assets_low_utilization' },
            severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
            message: { type: 'string', example: '12 assets are currently unassigned.' },
            value: {
              nullable: true
            }
          },
          required: ['code', 'severity', 'message']
        },
        OverviewChartPoint: {
          type: 'object',
          properties: {
            key: { type: 'string', example: 'active' },
            label: { type: 'string', example: 'Active' },
            value: { type: 'integer', example: 12 }
          },
          required: ['key', 'label', 'value']
        },
        OverviewModuleResult: {
          type: 'object',
          properties: {
            module: { type: 'string', example: 'assets' },
            enabled: { type: 'boolean', example: true },
            status: {
              type: 'string',
              enum: ['disabled', 'ready', 'empty', 'not_implemented', 'unavailable']
            },
            description: { type: 'string' },
            boundaries: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            kpis: {
              nullable: true
            },
            charts: {
              nullable: true,
              type: 'object',
              properties: {
                byStatus: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/OverviewChartPoint'
                  }
                },
                byCategory: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/OverviewChartPoint'
                  }
                },
                byLocation: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/OverviewChartPoint'
                  }
                }
              }
            },
            insights: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OverviewInsight'
              }
            }
          },
          required: ['module', 'enabled', 'status', 'description', 'boundaries', 'insights']
        },
        OverviewResponse: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string', format: 'date-time' },
            companyContext: {
              type: 'object',
              properties: {
                company: {
                  nullable: true,
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    slug: { type: 'string' },
                    name: { type: 'string' }
                  }
                },
                accessKey: {
                  type: 'object',
                  properties: {
                    keyId: { type: 'string', format: 'uuid' },
                    keyPrefix: { type: 'string' },
                    label: { type: 'string', nullable: true },
                    planCode: { type: 'string' },
                    planName: { type: 'string' }
                  }
                },
                enabledModules: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                mountedModules: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                activeModulesCount: { type: 'integer', example: 1 },
                readyModulesCount: { type: 'integer', example: 1 },
                insightsCount: { type: 'integer', example: 2 },
                criticalInsightsCount: { type: 'integer', example: 0 }
              }
            },
            modules: {
              type: 'object',
              properties: {
                assets: { $ref: '#/components/schemas/OverviewModuleResult' },
                finance: { $ref: '#/components/schemas/OverviewModuleResult' },
                employees: { $ref: '#/components/schemas/OverviewModuleResult' },
                payroll: { $ref: '#/components/schemas/OverviewModuleResult' }
              }
            },
            crossModule: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', example: false },
                status: {
                  type: 'string',
                  enum: ['insufficient_modules', 'not_implemented']
                },
                kpis: {
                  nullable: true
                },
                insights: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/OverviewInsight'
                  }
                }
              }
            }
          },
          required: ['generatedAt', 'companyContext', 'summary', 'modules', 'crossModule']
        },
        TimestampedEntity: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'createdAt', 'updatedAt']
        },
        PaymentMethod: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'bank-transfer' }
              },
              required: ['name']
            }
          ]
        },
        TransactionType: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'expense' }
              },
              required: ['name']
            }
          ]
        },
        AccountingAccount: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                code: { type: 'string', example: '5000' },
                name: { type: 'string', example: 'Operating Expense' },
                accountType: {
                  type: 'string',
                  enum: ['asset', 'liability', 'equity', 'revenue', 'expense']
                },
                isActive: { type: 'boolean', example: true }
              },
              required: ['code', 'name', 'accountType', 'isActive']
            }
          ]
        },
        CreatePaymentMethodInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'bank-transfer' }
          },
          required: ['name']
        },
        CreateTransactionTypeInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'expense' }
          },
          required: ['name']
        },
        CreateAccountingAccountInput: {
          type: 'object',
          properties: {
            code: { type: 'string', example: '5000' },
            name: { type: 'string', example: 'Operating Expense' },
            accountType: {
              type: 'string',
              enum: ['asset', 'liability', 'equity', 'revenue', 'expense']
            },
            isActive: { type: 'boolean', example: true }
          },
          required: ['code', 'name', 'accountType']
        },
        UpdateAccountingAccountInput: {
          type: 'object',
          properties: {
            code: { type: 'string', example: '5000' },
            name: { type: 'string', example: 'Operating Expense' },
            accountType: {
              type: 'string',
              enum: ['asset', 'liability', 'equity', 'revenue', 'expense']
            },
            isActive: { type: 'boolean', example: true }
          }
        },
        CreateTransactionInput: {
          type: 'object',
          properties: {
            transactionTypeId: { type: 'string', format: 'uuid' },
            accountingCategory: { type: 'string', example: 'office-supplies' },
            amount: { type: 'number', example: 120.5 },
            paymentMethodId: { type: 'string', format: 'uuid' },
            referenceNumber: { type: 'string', nullable: true, example: 'TXN-1001' },
            transactionDate: { type: 'string', format: 'date', example: '2026-03-24' },
            description: { type: 'string', nullable: true, example: 'Office supplies purchase' },
            employeeId: { type: 'string', format: 'uuid', nullable: true },
            assetId: { type: 'string', format: 'uuid', nullable: true },
            paySlipId: { type: 'string', format: 'uuid', nullable: true },
            journalEntryId: { type: 'string', format: 'uuid', nullable: true }
          },
          required: [
            'transactionTypeId',
            'accountingCategory',
            'amount',
            'paymentMethodId',
            'transactionDate'
          ]
        },
        UpdateTransactionInput: {
          type: 'object',
          properties: {
            transactionTypeId: { type: 'string', format: 'uuid' },
            accountingCategory: { type: 'string' },
            amount: { type: 'number' },
            paymentMethodId: { type: 'string', format: 'uuid' },
            referenceNumber: { type: 'string', nullable: true },
            transactionDate: { type: 'string', format: 'date' },
            description: { type: 'string', nullable: true },
            employeeId: { type: 'string', format: 'uuid', nullable: true },
            assetId: { type: 'string', format: 'uuid', nullable: true },
            paySlipId: { type: 'string', format: 'uuid', nullable: true },
            journalEntryId: { type: 'string', format: 'uuid', nullable: true }
          }
        },
        FinanceTransaction: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                transactionTypeId: { type: 'string', format: 'uuid' },
                accountingCategory: { type: 'string', example: 'office-supplies' },
                amount: { type: 'number', example: 120.5 },
                paymentMethodId: { type: 'string', format: 'uuid' },
                referenceNumber: { type: 'string', nullable: true },
                transactionDate: { type: 'string', format: 'date' },
                description: { type: 'string', nullable: true },
                employeeId: { type: 'string', format: 'uuid', nullable: true },
                assetId: { type: 'string', format: 'uuid', nullable: true },
                paySlipId: { type: 'string', format: 'uuid', nullable: true },
                journalEntryId: { type: 'string', format: 'uuid', nullable: true }
              },
              required: [
                'transactionTypeId',
                'accountingCategory',
                'amount',
                'paymentMethodId',
                'transactionDate'
              ]
            }
          ]
        },
        FinanceTransactionDetails: {
          allOf: [
            { $ref: '#/components/schemas/FinanceTransaction' },
            {
              type: 'object',
              properties: {
                paymentMethod: {
                  anyOf: [
                    { $ref: '#/components/schemas/PaymentMethod' },
                    { type: 'null' }
                  ]
                },
                transactionType: {
                  anyOf: [
                    { $ref: '#/components/schemas/TransactionType' },
                    { type: 'null' }
                  ]
                }
              }
            }
          ]
        },
        ListFinanceTransactionsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/FinanceTransactionDetails' }
            },
            pagination: { $ref: '#/components/schemas/PaginationInfo' }
          },
          required: ['data', 'pagination']
        },
        CreateJournalEntryLineInput: {
          type: 'object',
          properties: {
            accountId: { type: 'string', format: 'uuid' },
            debitAmount: { type: 'number', example: 120.5 },
            creditAmount: { type: 'number', example: 0 },
            description: { type: 'string', nullable: true },
            employeeId: { type: 'string', format: 'uuid', nullable: true },
            assetId: { type: 'string', format: 'uuid', nullable: true },
            paySlipId: { type: 'string', format: 'uuid', nullable: true },
            referenceNumber: { type: 'string', nullable: true }
          },
          required: ['accountId']
        },
        CreateJournalEntryInput: {
          type: 'object',
          properties: {
            entryNumber: { type: 'string', example: 'JE-2026-0001' },
            entryDate: { type: 'string', format: 'date' },
            description: { type: 'string', nullable: true },
            periodYear: { type: 'integer', example: 2026 },
            periodMonth: { type: 'integer', example: 3 },
            status: { type: 'string', enum: ['draft', 'posted'], example: 'draft' },
            postedBy: { type: 'string', format: 'uuid', nullable: true },
            lines: {
              type: 'array',
              minItems: 2,
              items: { $ref: '#/components/schemas/CreateJournalEntryLineInput' }
            }
          },
          required: ['entryNumber', 'entryDate', 'periodYear', 'periodMonth', 'lines']
        },
        JournalEntryLine: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                journalEntryId: { type: 'string', format: 'uuid' },
                accountId: { type: 'string', format: 'uuid' },
                debitAmount: { type: 'number' },
                creditAmount: { type: 'number' },
                description: { type: 'string', nullable: true },
                employeeId: { type: 'string', format: 'uuid', nullable: true },
                assetId: { type: 'string', format: 'uuid', nullable: true },
                paySlipId: { type: 'string', format: 'uuid', nullable: true },
                referenceNumber: { type: 'string', nullable: true }
              },
              required: ['journalEntryId', 'accountId', 'debitAmount', 'creditAmount']
            }
          ]
        },
        JournalEntryDetails: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                entryNumber: { type: 'string' },
                entryDate: { type: 'string', format: 'date' },
                description: { type: 'string', nullable: true },
                periodYear: { type: 'integer' },
                periodMonth: { type: 'integer' },
                status: { type: 'string', enum: ['draft', 'posted'] },
                postedBy: { type: 'string', format: 'uuid', nullable: true },
                postedAt: { type: 'string', format: 'date-time', nullable: true },
                lines: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/JournalEntryLine' }
                }
              },
              required: ['entryNumber', 'entryDate', 'periodYear', 'periodMonth', 'status', 'lines']
            }
          ]
        },
        ListJournalEntriesResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/JournalEntryDetails' }
            },
            pagination: { $ref: '#/components/schemas/PaginationInfo' }
          },
          required: ['data', 'pagination']
        },
        CreateReconciliationInput: {
          type: 'object',
          properties: {
            reconciliationType: { type: 'string', example: 'bank' },
            accountId: { type: 'string', format: 'uuid' },
            statementStartDate: { type: 'string', format: 'date' },
            statementEndDate: { type: 'string', format: 'date' },
            statementBalance: { type: 'number', example: 15230.4 },
            bookBalance: { type: 'number', example: 15190.4 },
            status: { type: 'string', enum: ['open', 'closed'], example: 'open' },
            closedBy: { type: 'string', format: 'uuid', nullable: true }
          },
          required: [
            'reconciliationType',
            'accountId',
            'statementStartDate',
            'statementEndDate',
            'statementBalance',
            'bookBalance'
          ]
        },
        CreateReconciliationItemInput: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', format: 'uuid', nullable: true },
            journalEntryLineId: { type: 'string', format: 'uuid', nullable: true }
          }
        },
        ReconciliationItem: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                reconciliationId: { type: 'string', format: 'uuid' },
                transactionId: { type: 'string', format: 'uuid', nullable: true },
                journalEntryLineId: { type: 'string', format: 'uuid', nullable: true },
                matchedAt: { type: 'string', format: 'date-time' }
              },
              required: ['reconciliationId', 'matchedAt']
            }
          ]
        },
        ReconciliationDetails: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                reconciliationType: { type: 'string' },
                accountId: { type: 'string', format: 'uuid' },
                statementStartDate: { type: 'string', format: 'date' },
                statementEndDate: { type: 'string', format: 'date' },
                statementBalance: { type: 'number' },
                bookBalance: { type: 'number' },
                status: { type: 'string', enum: ['open', 'closed'] },
                closedBy: { type: 'string', format: 'uuid', nullable: true },
                closedAt: { type: 'string', format: 'date-time', nullable: true },
                account: {
                  anyOf: [
                    { $ref: '#/components/schemas/AccountingAccount' },
                    { type: 'null' }
                  ]
                },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ReconciliationItem' }
                }
              },
              required: [
                'reconciliationType',
                'accountId',
                'statementStartDate',
                'statementEndDate',
                'statementBalance',
                'bookBalance',
                'status',
                'items'
              ]
            }
          ]
        },
        ListReconciliationsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/ReconciliationDetails' }
            },
            pagination: { $ref: '#/components/schemas/PaginationInfo' }
          },
          required: ['data', 'pagination']
        },
        EmployeeReference: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Manager' }
              },
              required: ['name']
            }
          ]
        },
        CreateEmployeeRoleInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Manager' }
          },
          required: ['name']
        },
        CreateEmployeePositionInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Accountant' }
          },
          required: ['name']
        },
        CreateEmployeeLocationInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Head Office' }
          },
          required: ['name']
        },
        CreateEmployeeInput: {
          type: 'object',
          properties: {
            employeeNumber: { type: 'string', example: 'EMP-001' },
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', nullable: true, example: 'jane@example.com' },
            phone: { type: 'string', nullable: true, example: '+257700000001' },
            hireDate: { type: 'string', format: 'date', example: '2026-03-24' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'on_leave', 'terminated'],
              example: 'active'
            }
          },
          required: ['employeeNumber', 'firstName', 'lastName', 'hireDate']
        },
        UpdateEmployeeInput: {
          type: 'object',
          properties: {
            employeeNumber: { type: 'string', example: 'EMP-001' },
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            hireDate: { type: 'string', format: 'date' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'on_leave', 'terminated']
            }
          }
        },
        CreateEmployeeAssignmentInput: {
          type: 'object',
          properties: {
            roleId: { type: 'string', format: 'uuid' },
            positionId: { type: 'string', format: 'uuid' },
            locationId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date', example: '2026-03-24' },
            endDate: { type: 'string', format: 'date', nullable: true, example: '2026-06-24' }
          },
          required: ['roleId', 'positionId', 'locationId', 'startDate']
        },
        CreateEmployeeContractInput: {
          type: 'object',
          properties: {
            contractType: { type: 'string', example: 'full-time' },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'suspended', 'terminated', 'expired'],
              example: 'active'
            },
            startDate: { type: 'string', format: 'date', example: '2026-03-24' },
            endDate: { type: 'string', format: 'date', nullable: true, example: '2027-03-24' },
            salaryAmount: { type: 'number', example: 1500000 },
            currency: { type: 'string', example: 'BIF' },
            paymentFrequency: {
              type: 'string',
              enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual'],
              example: 'monthly'
            }
          },
          required: ['contractType', 'startDate', 'salaryAmount']
        },
        UpdateEmployeeContractInput: {
          type: 'object',
          properties: {
            contractType: { type: 'string', example: 'full-time' },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'suspended', 'terminated', 'expired']
            },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date', nullable: true },
            salaryAmount: { type: 'number' },
            currency: { type: 'string' },
            paymentFrequency: {
              type: 'string',
              enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']
            }
          }
        },
        EmployeeAssignment: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                employeeId: { type: 'string', format: 'uuid' },
                roleId: { type: 'string', format: 'uuid' },
                positionId: { type: 'string', format: 'uuid' },
                locationId: { type: 'string', format: 'uuid' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date', nullable: true },
                role: { $ref: '#/components/schemas/EmployeeReference' },
                position: { $ref: '#/components/schemas/EmployeeReference' },
                location: { $ref: '#/components/schemas/EmployeeReference' }
              },
              required: [
                'employeeId',
                'roleId',
                'positionId',
                'locationId',
                'startDate',
                'role',
                'position',
                'location'
              ]
            }
          ]
        },
        EmployeeContract: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                employeeId: { type: 'string', format: 'uuid' },
                contractType: { type: 'string', example: 'full-time' },
                status: {
                  type: 'string',
                  enum: ['draft', 'active', 'suspended', 'terminated', 'expired']
                },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date', nullable: true },
                salaryAmount: { type: 'number', example: 1500000 },
                currency: { type: 'string', example: 'BIF' },
                paymentFrequency: {
                  type: 'string',
                  enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']
                }
              },
              required: [
                'employeeId',
                'contractType',
                'status',
                'startDate',
                'salaryAmount',
                'currency',
                'paymentFrequency'
              ]
            }
          ]
        },
        Employee: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                employeeNumber: { type: 'string', example: 'EMP-001' },
                firstName: { type: 'string', example: 'Jane' },
                lastName: { type: 'string', example: 'Doe' },
                fullName: { type: 'string', example: 'Jane Doe' },
                email: { type: 'string', format: 'email', nullable: true },
                phone: { type: 'string', nullable: true },
                hireDate: { type: 'string', format: 'date' },
                status: {
                  type: 'string',
                  enum: ['active', 'inactive', 'on_leave', 'terminated']
                },
                currentAssignment: {
                  anyOf: [
                    { $ref: '#/components/schemas/EmployeeAssignment' },
                    { type: 'null' }
                  ]
                },
                activeContract: {
                  anyOf: [
                    { $ref: '#/components/schemas/EmployeeContract' },
                    { type: 'null' }
                  ]
                }
              },
              required: ['employeeNumber', 'firstName', 'lastName', 'fullName', 'hireDate', 'status']
            }
          ]
        },
        ListEmployeesResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/Employee' }
            },
            pagination: { $ref: '#/components/schemas/PaginationInfo' }
          },
          required: ['data', 'pagination']
        },
        AssetCategory: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'IT Equipment' }
              },
              required: ['name']
            }
          ]
        },
        AssetStatus: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'active' }
              },
              required: ['name']
            }
          ]
        },
        InterventionType: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'preventive' }
              },
              required: ['name']
            }
          ]
        },
        CreateAssetCategoryInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'IT Equipment' }
          },
          required: ['name']
        },
        CreateAssetStatusInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'active' }
          },
          required: ['name']
        },
        CreateInterventionTypeInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'preventive' }
          },
          required: ['name']
        },
        CreateAssetInput: {
          type: 'object',
          properties: {
            inventoryCode: { type: 'string', example: 'AST-001' },
            name: { type: 'string', example: 'Dell Latitude 5440' },
            brand: { type: 'string', example: 'Dell' },
            model: { type: 'string', example: 'Latitude 5440' },
            serialNumber: { type: 'string', example: 'SN-0001' },
            categoryId: { type: 'string', format: 'uuid' },
            statusId: { type: 'string', format: 'uuid' }
          },
          required: ['inventoryCode', 'name', 'categoryId', 'statusId']
        },
        UpdateAssetInput: {
          type: 'object',
          properties: {
            inventoryCode: { type: 'string', example: 'AST-001' },
            name: { type: 'string', example: 'Dell Latitude 5440' },
            brand: { type: 'string', example: 'Dell' },
            model: { type: 'string', example: 'Latitude 5440' },
            serialNumber: { type: 'string', example: 'SN-0001' },
            categoryId: { type: 'string', format: 'uuid' },
            statusId: { type: 'string', format: 'uuid' }
          }
        },
        UpsertAssetFinanceInput: {
          type: 'object',
          properties: {
            acquisitionDate: { type: 'string', format: 'date', example: '2026-03-24' },
            purchaseValue: { type: 'number', example: 1250 },
            estimatedLifeYears: { type: 'integer', example: 4 },
            residualValue: { type: 'number', example: 150 }
          },
          required: ['acquisitionDate', 'purchaseValue', 'estimatedLifeYears']
        },
        CreateAssetAssignmentInput: {
          type: 'object',
          properties: {
            employeeId: { type: 'string', format: 'uuid' },
            locationId: { type: 'string', format: 'uuid' },
            startDate: { type: 'string', format: 'date', example: '2026-03-24' },
            endDate: { type: 'string', format: 'date', example: '2026-06-24' }
          },
          required: ['employeeId', 'locationId', 'startDate']
        },
        CreateMaintenanceLogInput: {
          type: 'object',
          properties: {
            interventionTypeId: { type: 'string', format: 'uuid' },
            description: { type: 'string', example: 'Battery diagnostic and preventive maintenance' },
            interventionCost: { type: 'number', example: 35 },
            provider: { type: 'string', example: 'Internal IT' }
          },
          required: ['interventionTypeId']
        },
        Asset: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                inventoryCode: { type: 'string', example: 'AST-001' },
                name: { type: 'string', example: 'Dell Latitude 5440' },
                brand: { type: 'string', example: 'Dell', nullable: true },
                model: { type: 'string', example: 'Latitude 5440', nullable: true },
                serialNumber: { type: 'string', example: 'SN-0001', nullable: true },
                categoryId: { type: 'string', format: 'uuid' },
                statusId: { type: 'string', format: 'uuid' }
              },
              required: ['inventoryCode', 'name', 'categoryId', 'statusId']
            }
          ]
        },
        AssetFinanceData: {
          type: 'object',
          properties: {
            assetId: { type: 'string', format: 'uuid' },
            acquisitionDate: { type: 'string', format: 'date' },
            purchaseValue: { type: 'number', example: 1250 },
            estimatedLifeYears: { type: 'integer', example: 4 },
            residualValue: { type: 'number', nullable: true, example: 150 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: [
            'assetId',
            'acquisitionDate',
            'purchaseValue',
            'estimatedLifeYears',
            'createdAt',
            'updatedAt'
          ]
        },
        AssetAssignment: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                assetId: { type: 'string', format: 'uuid' },
                employeeId: { type: 'string', format: 'uuid' },
                locationId: { type: 'string', format: 'uuid' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date', nullable: true }
              },
              required: ['assetId', 'employeeId', 'locationId', 'startDate']
            }
          ]
        },
        MaintenanceLog: {
          allOf: [
            { $ref: '#/components/schemas/TimestampedEntity' },
            {
              type: 'object',
              properties: {
                assetId: { type: 'string', format: 'uuid' },
                interventionTypeId: { type: 'string', format: 'uuid' },
                description: { type: 'string', nullable: true },
                interventionCost: { type: 'number', nullable: true },
                provider: { type: 'string', nullable: true }
              },
              required: ['assetId', 'interventionTypeId']
            }
          ]
        },
        AssetDetails: {
          allOf: [
            { $ref: '#/components/schemas/Asset' },
            {
              type: 'object',
              properties: {
                category: {
                  anyOf: [
                    { $ref: '#/components/schemas/AssetCategory' },
                    { type: 'null' }
                  ]
                },
                status: {
                  anyOf: [
                    { $ref: '#/components/schemas/AssetStatus' },
                    { type: 'null' }
                  ]
                },
                financeData: {
                  anyOf: [
                    { $ref: '#/components/schemas/AssetFinanceData' },
                    { type: 'null' }
                  ]
                },
                assignments: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/AssetAssignment'
                  }
                },
                maintenanceLogs: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MaintenanceLog'
                  }
                }
              },
              required: ['assignments', 'maintenanceLogs']
            }
          ]
        },
        ListAssetsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AssetDetails'
              }
            },
            pagination: {
              $ref: '#/components/schemas/PaginationInfo'
            }
          },
          required: ['data', 'pagination']
        }
      }
    }
  });
}
