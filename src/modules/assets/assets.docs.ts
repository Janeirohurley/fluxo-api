export function getAssetsModuleDocumentation() {
  return {
    module: 'assets',
    version: '1.0.0',
    basePath: '/api/assets',
    description:
      'Asset management module based on the PDF schema, covering asset references, core assets, finance data, assignments and maintenance logs.',
    storage: {
      default: 'prisma',
      fallback: 'memory',
      overrideEnv: 'ASSETS_STORAGE=memory'
    },
    authentication: {
      type: 'apiKey',
      headers: ['x-module-key', 'x-api-key', 'Authorization: Bearer <key>'],
      requiredPlanModules: ['assets']
    },
    routes: [
      {
        method: 'GET',
        path: '/api/assets/docs',
        description: 'Returns this module documentation'
      },
      {
        method: 'GET',
        path: '/api/assets',
        description:
          'Lists assets with pagination, filters and search across inventory code, name, brand, model and serial number'
      },
      {
        method: 'POST',
        path: '/api/assets',
        description: 'Creates an asset'
      },
      {
        method: 'GET',
        path: '/api/assets/:id',
        description: 'Returns one asset with aggregated details'
      },
      {
        method: 'PATCH',
        path: '/api/assets/:id',
        description: 'Updates an asset'
      },
      {
        method: 'DELETE',
        path: '/api/assets/:id',
        description:
          'Deletes an asset only when it has no finance, assignment or maintenance history'
      },
      {
        method: 'GET',
        path: '/api/assets/categories',
        description: 'Lists asset categories'
      },
      {
        method: 'POST',
        path: '/api/assets/categories',
        description: 'Creates an asset category'
      },
      {
        method: 'GET',
        path: '/api/assets/statuses',
        description: 'Lists asset statuses'
      },
      {
        method: 'POST',
        path: '/api/assets/statuses',
        description: 'Creates an asset status'
      },
      {
        method: 'GET',
        path: '/api/assets/intervention-types',
        description: 'Lists maintenance intervention types'
      },
      {
        method: 'POST',
        path: '/api/assets/intervention-types',
        description: 'Creates a maintenance intervention type'
      },
      {
        method: 'GET',
        path: '/api/assets/:id/finance',
        description: 'Returns the 1:1 finance record of an asset'
      },
      {
        method: 'PUT',
        path: '/api/assets/:id/finance',
        description: 'Creates or updates the 1:1 finance record of an asset'
      },
      {
        method: 'GET',
        path: '/api/assets/:id/assignments',
        description: 'Lists assignment history for an asset'
      },
      {
        method: 'POST',
        path: '/api/assets/:id/assignments',
        description: 'Creates a new asset assignment'
      },
      {
        method: 'GET',
        path: '/api/assets/:id/maintenance',
        description: 'Lists maintenance logs for an asset'
      },
      {
        method: 'POST',
        path: '/api/assets/:id/maintenance',
        description: 'Creates a maintenance log for an asset'
      }
    ],
    samplePayloads: {
      listAssetsQuery: {
        page: 1,
        pageSize: 20,
        search: 'Dell',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      },
      createCategory: {
        name: 'IT Equipment'
      },
      createStatus: {
        name: 'active'
      },
      createInterventionType: {
        name: 'preventive'
      },
      createAsset: {
        inventoryCode: 'AST-001',
        name: 'Dell Latitude 5440',
        brand: 'Dell',
        model: 'Latitude 5440',
        serialNumber: 'SN-0001',
        categoryId: '11111111-1111-1111-1111-111111111111',
        statusId: '22222222-2222-2222-2222-222222222222'
      },
      upsertFinance: {
        acquisitionDate: '2026-03-24',
        purchaseValue: 1250,
        estimatedLifeYears: 4,
        residualValue: 150
      },
      createAssignment: {
        employeeId: '33333333-3333-3333-3333-333333333333',
        locationId: '44444444-4444-4444-4444-444444444444',
        startDate: '2026-03-24'
      },
      createMaintenanceLog: {
        interventionTypeId: '55555555-5555-5555-5555-555555555555',
        description: 'Battery diagnostic and preventive maintenance',
        interventionCost: 35,
        provider: 'Internal IT'
      }
    }
  };
}
