type PortalPageData = {
  plans: ReadonlyArray<{
    code: string;
    name: string;
    description: string | null;
    modules: string[];
  }>;
  modules: ReadonlyArray<{
    code: string;
    name: string;
    description: string;
    availability: 'available' | 'coming_soon';
  }>;
  successMessage?: string | null;
  errorMessage?: string | null;
  values?: {
    companyName?: string;
    email?: string;
    notes?: string;
    modules?: string[];
  };
  selectedPresetCode?: string | null;
};

type AdminRequestView = {
  id: string;
  companyName: string;
  email: string;
  notes: string | null;
  status: 'pending' | 'provisioning' | 'approved' | 'failed' | 'rejected';
  requestedModules: string[];
  adminMessage: string | null;
  createdAt: Date;
  processedAt: Date | null;
  emailError: string | null;
  approvedCompany?: {
    slug: string;
    database?: {
      databaseName: string;
      provisioningStatus: 'pending' | 'provisioning' | 'ready' | 'failed';
    } | null;
  } | null;
};

type AdminPageData = {
  token: string;
  requests: ReadonlyArray<AdminRequestView>;
  message?: string | null;
  errorMessage?: string | null;
};

type ApprovalResultData = {
  token: string;
  companyName: string;
  email: string;
  modules: string[];
  key: string;
  planName: string;
  companySlug: string;
  databaseName: string;
  emailSent: boolean;
  emailError: string | null;
  adminMessage: string | null;
  successMessage?: string | null;
};

type EditSubscriptionPageData = {
  token: string;
  request: {
    id: string;
    companyName: string;
    email: string;
    status: 'approved' | 'failed';
    modules: string[];
    companySlug: string | null;
    databaseName: string | null;
  };
  catalog: ReadonlyArray<{
    code: string;
    name: string;
    description: string;
    availability: 'available' | 'coming_soon';
  }>;
  message?: string | null;
  errorMessage?: string | null;
  adminMessage?: string | null;
};

function formatDateTime(value: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

function renderLayout(title: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          :root {
            --bg: #f7f4ef;
            --panel: #fffcf8;
            --panel-alt: #181312;
            --ink: #161616;
            --muted: #5f6167;
            --line: #d8d3cb;
            --accent: #1f1716;
            --accent-soft: #f0ebe4;
            --ok: #0f766e;
            --warn: #b45309;
            --bad: #b91c1c;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background:
              linear-gradient(90deg, rgba(33, 33, 33, 0.05) 0, rgba(33, 33, 33, 0.05) 1px, transparent 1px, transparent 12px),
              linear-gradient(180deg, #fbfaf7 0%, var(--bg) 100%);
            background-size: 12px 12px, auto;
            color: var(--ink);
          }
          a { color: var(--accent); }
          .shell { max-width: 1180px; margin: 0 auto; padding: 28px 20px 72px; }
         
          .eyebrow {
            color: #7c6351;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 0.76rem;
            font-weight: 700;
          }
          
          .hero h1 {
            margin: 12px 0 10px;
            max-width: 760px;
            font-size: clamp(2.2rem, 4vw, 3.6rem);
            line-height: 1.06;
            letter-spacing: -0.04em;
          }
          .eyebrow-title{
           max-width: 80% !important;
            margin:auto !important;
             text-align: center;
          }

          
          .hero p {
            margin: 0;
            max-width: 760px;
            color: #4b5563;
            font-size: 1.02rem;
          } 
            
         .hero .para{
           max-width: 80% !important;
            margin:auto !important;
             text-align: center;
          }
          .switcher {
            display: inline-flex;
            gap: 6px;
            background: #f2efe9;
            border: 1px solid #d9d2c8;
            border-radius: 14px;
            padding: 5px;
            margin-top: 28px;
          }
          .switcher span {
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 0.88rem;
            color: #4b5563;
          }
          .switcher .active {
            background: #171413;
            color: #f9fafb;
            box-shadow: 0 8px 20px rgba(20, 16, 16, 0.18);
          }
          .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
          .card, .panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 9px;
            padding: 24px;
            box-shadow: 0 18px 42px rgba(55, 38, 20, 0.05);
          }
          .card h3, .panel h2 { margin-top: 0; }
          .muted { color: var(--muted); }
          .pill {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 9px;
            background: var(--accent-soft);
            color: #5e3c1e;
            margin: 4px 8px 0 0;
            font-size: 0.88rem;
            line-height: 1.25;
          }
          form { display: grid; gap: 16px; }
          label { display: grid; gap: 8px; font-size: 0.96rem; }
          input, textarea {
            width: 100%;
            border: 1px solid #cbbba7;
            border-radius: 9px;
            padding: 12px 14px;
            font: inherit;
            background: #fffefb;
          }
          textarea { min-height: 120px; resize: vertical; }
          .modules-list { display: grid; gap: 12px; }
          .module-option {
            display: flex;
            align-items: start;
            gap: 12px;
            border: 1px solid var(--line);
            border-radius: 9px;
            padding: 14px;
            background: #fffefb;
          }
          .module-option input { width: auto; margin-top: 3px; }
          .module-option.disabled {
            opacity: 0.58;
            background: #f7f3ec;
          }
          .module-meta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .coming-soon {
            display: inline-flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 999px;
            background: #efe7da;
            color: #7c6351;
            font-size: 0.76rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .actions { display: flex; flex-wrap: wrap; gap: 12px; }
          button {
            border: none;
            border-radius: 9px;
            padding: 13px 18px;
            font: inherit;
            cursor: pointer;
            background: var(--accent);
            color: white;
          }
          button.secondary { background: #374151; }
          button.danger { background: #9f1239; }
          .notice {
            border-radius: 9px;
            padding: 14px 16px;
            margin-block: 16px;
            border: 1px solid transparent;
          }
          .notice.ok { background: #ecfdf5; border-color: #99f6e4; color: var(--ok); }
          .notice.bad { background: #fef2f2; border-color: #fecaca; color: var(--bad); }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
            min-width: 920px;
          }
          .table-wrap {
            overflow-x: auto;
            border: 1px solid #e7e0d6;
            border-radius: 12px;
            background: #fffefb;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
          }
          th, td {
            text-align: left;
            padding: 12px 10px;
            border-bottom: 1px solid #e8dfd3;
            vertical-align: top;
          }
          th {
            background: #f7f2ea;
            color: #4b5563;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .stack { display: grid; gap: 8px; }
          .stack span {
            word-break: break-word;
          }
          .admin-summary {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 18px;
          }
          .admin-summary p {
            margin: 0;
          }
          .admin-empty {
            border: 1px dashed #d4cabd;
            border-radius: 12px;
            padding: 24px;
            background: #fcfaf7;
            color: #5f6167;
          }
          .admin-cards {
            display: none;
            gap: 16px;
          }
          .admin-card {
            border: 1px solid #e1dbd2;
            border-radius: 12px;
            padding: 16px;
            background: #fffefb;
            box-shadow: 0 10px 24px rgba(45, 32, 18, 0.05);
          }
          .admin-card-row {
            display: grid;
            gap: 6px;
            margin-bottom: 12px;
          }
          .admin-card-label {
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #7c6351;
            font-weight: 700;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 9px;
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid #d7d0c5;
            background: #f3eee6;
          }
          .status-badge.pending {
            color: #9a6700;
            background: #fff7db;
            border-color: #f3d98b;
          }
          .status-badge.approved {
            color: #0f766e;
            background: #ecfdf5;
            border-color: #99f6e4;
          }
          .status-badge.rejected {
            color: #b91c1c;
            background: #fef2f2;
            border-color: #fecaca;
          }
          .status-badge.provisioning {
            color: #1d4ed8;
            background: #eff6ff;
            border-color: #bfdbfe;
          }
          .status-badge.failed {
            color: #b91c1c;
            background: #fff1f2;
            border-color: #fecdd3;
          }
          .admin-action-form {
            display: grid;
            gap: 10px;
            margin-top: 10px;
          }
          .admin-action-form textarea {
            min-height: 90px;
          }
          .codebox {
            background: #111827;
            color: #f9fafb;
            border-radius: 9px;
            padding: 16px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
          }
          .pricing-shell {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 20px;
            margin-top: 26px;
          }
          .pricing-card {
            position: relative;
            border-radius: 9px;
            border: 1px solid #d8d3cb;
            background: rgba(255, 255, 255, 0.9);
            padding: 18px 18px 16px;
            box-shadow: 0 16px 36px rgba(38, 29, 24, 0.07);
            display: flex;
            flex-direction: column;
            min-height: 100%;
          }
          .pricing-card.featured {
            background: linear-gradient(180deg, #1e1818 0%, #181312 100%);
            color: #f5f5f4;
            border-color: #221918;
            transform: translateY(-1px);
          }
          .pricing-card.featured .muted,
          .pricing-card.featured .pricing-note,
          .pricing-card.featured .feature-list li {
            color: #d4d4d8;
          }
          .pricing-label {
            font-size: 0.82rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #5c6066;
            margin-bottom: 8px;
          }
          .pricing-card.featured .pricing-label { color: #e6d8c9; }
          .pricing-title {
            margin: 0 0 8px;
            font-size: 1.2rem;
          }
          .pricing-note {
            margin: 0 0 18px !important;
            color: #52525b !important;
            min-height: 52px !important;
            font-size: 0.95rem !important;
          }
          .price-row {
            display: flex;
            align-items: flex-end;
            gap: 6px;
            margin-bottom: 16px;
          }
          .price-amount {
            font-size: 1.3rem;
            font-weight: 600;
            letter-spacing: -0.05em;
            color: #5c6066;
          }
          .price-unit {
            color: #5c6066;
            margin-bottom: 4px;
          }
          .pricing-card.featured .price-unit { color: #d4d4d8; }
          .feature-list {
            list-style: none;
            margin: 0;
            padding: 16px 0 0;
            border-top: 2px dotted rgba(60, 60, 60, 0.35);
           
            gap: 11px;
            flex: 1;
          }
          .feature-list li {
            color: #2f3136;
            padding-left: 26px;
            position: relative;
            padding-block:2px;
          }
          .feature-list li::before {
            content: '●';
            position: absolute;
            left: 0;
            top: -1px;
            color: #4b5563;
            font-size: 0.82rem;
          }
          .pricing-card.featured .feature-list li::before { color: #f4e6d6; }
          .pricing-cta {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            text-decoration: none;
            margin-top: 18px;
            background: #171413;
            color: #fff;
            border-radius: 9px;
            padding: 13px 16px;
            font-weight: 600;
          }
          .pricing-card.featured .pricing-cta {
            background: #f7f4ef;
            color: #171413;
          }
          .pricing-card.selected {
            outline: 2px solid #1f1716;
            outline-offset: 3px;
          }
          .portal-bottom {
            display: grid;
            grid-template-columns: 1.25fr 0.95fr;
            gap: 20px;
            margin-top: 28px;
          }
          .module-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .helper-list {
            display: grid;
            gap: 12px;
            margin-top: 16px;
          }
          .helper-item {
            border: 1px solid #e6ded2;
            border-radius: 9px;
            padding: 14px;
            background: #fffefb;
          }
          @media (max-width: 980px) {
            .pricing-shell,
            .portal-bottom {
              grid-template-columns: 1fr;
            }
            .hero {
              padding: 28px 24px 24px;
            }
          }
          @media (max-width: 860px) {
            .shell {
              padding-inline: 14px;
            }
            .table-wrap {
              display: none;
            }
            .admin-cards {
              display: grid;
            }
            .actions button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="shell">${body}</div>
      </body>
    </html>
  `;
}

export function renderPortalPage(data: PortalPageData) {
  const featuredPlans = data.plans.slice(0, 3);
  const selectedModules = data.values?.modules ?? [];
  const planPresets = featuredPlans.map((plan, index) => ({
    ...plan,
    tierLabel:
      index === 0 ? 'Starter Plan' : index === 1 ? 'Growth Plan' : 'Enterprise Plan',
    priceLabel:
      index === 0 ? '1 module' : index === 1 ? `${Math.max(plan.modules.length, 2)} modules` : 'suite complete',
    isFeatured: index === 1,
    isSelected: data.selectedPresetCode === plan.code
  }));

  return renderLayout(
    'Fluxo Subscription Portal',
    `
      <section class="hero">
        <div class="eyebrow">Fluxo SaaS</div>
        <h1 class="eyebrow-title">Les bons modules pour chaque entreprise</h1>
        <p class="para">
          Choisissez un cadre de souscription ou composez votre propre combinaison. Le client demande
          les modules voulus, l admin valide, puis une cle d acces est envoyee par email.
        </p>
        <div class="switcher" aria-hidden="true">
          <span class="active">Modules</span>
          <span>Custom</span>
        </div>

        <section class="pricing-shell">
          ${planPresets
            .map(
              (plan) => `
                <article class="pricing-card ${plan.isFeatured ? 'featured' : ''} ${plan.isSelected ? 'selected' : ''}">
                  <div class="pricing-label">${plan.tierLabel}</div>
                  <h3 class="pricing-title">${plan.name}</h3>
                  <p class="pricing-note">${plan.description ?? 'Souscription prete a l emploi pour demarrer rapidement.'}</p>
                  <div class="price-row">
                    <div class="price-amount">${plan.priceLabel}</div>
                    <div class="price-unit">inclus</div>
                  </div>
                  <ul class="feature-list">
                    ${plan.modules.map((moduleName) => `<li>${moduleName}</li>`).join('')}
                  </ul>
                  <a class="pricing-cta" href="/portal?preset=${encodeURIComponent(plan.code)}#request-form">Choisir ce plan</a>
                </article>
              `
            )
            .join('')}
        </section>
      </section>

      ${data.successMessage ? `<div class="notice ok">${data.successMessage}</div>` : ''}
      ${data.errorMessage ? `<div class="notice bad">${data.errorMessage}</div>` : ''}

      <section class="portal-bottom">
        <section class="panel" id="request-form">
          <div class="eyebrow">Demande</div>
          <h2>Composez votre abonnement</h2>
          <p class="muted">Selectionnez librement les modules voulus. Vous pouvez partir d un preset, puis ajuster avant l envoi.</p>
          <form method="post" action="/portal/subscribe">
            <label>
              Entreprise
              <input name="companyName" value="${data.values?.companyName ?? ''}" placeholder="Ex: Horizon Trading" required />
            </label>
            <label>
              Email de reception
              <input type="email" name="email" value="${data.values?.email ?? ''}" placeholder="contact@entreprise.com" required />
            </label>
            <div class="modules-list">
              ${data.modules
                .map(
                  (module) => `
                    <label class="module-option ${module.availability !== 'available' ? 'disabled' : ''}">
                      <input
                        type="checkbox"
                        name="modules"
                        value="${module.code}"
                        ${selectedModules.includes(module.code) ? 'checked' : ''}
                        ${module.availability !== 'available' ? 'disabled' : ''}
                      />
                      <span>
                        <span class="module-meta">
                          <strong>${module.name}</strong>
                          ${module.availability !== 'available' ? '<span class="coming-soon">Coming soon</span>' : ''}
                        </span><br />
                        <span class="muted">${module.description}</span>
                      </span>
                    </label>
                  `
                )
                .join('')}
            </div>
            <label>
              Notes
              <textarea name="notes" placeholder="Ex: Nous voulons commencer avec Assets et Finance, puis ajouter Payroll plus tard.">${data.values?.notes ?? ''}</textarea>
            </label>
            <div class="actions">
              <button type="submit">Envoyer la demande</button>
            </div>
          </form>
        </section>

        <aside class="panel">
          <div class="eyebrow">Resume</div>
          <h2>Modules selectionnes</h2>
          <p class="muted">Le commercial ou l administrateur pourra valider exactement cette combinaison et generer une cle adaptee.</p>
          <div class="module-pills">
            ${
              selectedModules.length > 0
                ? selectedModules.map((moduleName) => `<span class="pill">${moduleName}</span>`).join('')
                : '<span class="muted">Aucun module selectionne pour le moment.</span>'
            }
          </div>
          <div class="helper-list">
            <div class="helper-item">
              <strong>1. Choix</strong>
              <div class="muted">Le client choisit un preset ou compose librement ses modules.</div>
            </div>
            <div class="helper-item">
              <strong>2. Validation</strong>
              <div class="muted">L admin approuve la demande depuis le portail d administration.</div>
            </div>
            <div class="helper-item">
              <strong>3. Activation</strong>
              <div class="muted">Une cle unique est generee et envoyee a l email de reception.</div>
            </div>
          </div>
        </aside>
      </section>
    `
  );
}

export function renderAdminPage(data: AdminPageData) {
  const requestsCount = data.requests.length;

  return renderLayout(
    'Fluxo Admin Subscriptions',
    `
      <section class="hero">
        <div class="eyebrow">Administration</div>
        <h1>Demandes de souscription</h1>
        <p>Acceptez ou refusez les demandes. Une approbation genere un plan custom, une cle et tente l'envoi par email.</p>
      </section>

      ${data.message ? `<div class="notice ok">${data.message}</div>` : ''}
      ${data.errorMessage ? `<div class="notice bad">${data.errorMessage}</div>` : ''}

      <section class="panel">
        <div class="admin-summary">
          <h2>Demandes</h2>
          <p class="muted">${requestsCount} demande${requestsCount > 1 ? 's' : ''} au total</p>
        </div>
        ${
          requestsCount === 0
            ? '<div class="admin-empty">Aucune demande n a encore ete recue. Les nouvelles souscriptions apparaitront ici.</div>'
            : `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Entreprise</th>
                      <th>Email</th>
                      <th>Modules</th>
                      <th>Etat</th>
                      <th>Details</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.requests
                      .map(
                        (request) => `
                          <tr>
                            <td><strong>${request.companyName}</strong><br /><span class="muted">${formatDateTime(request.createdAt)}</span></td>
                            <td>${request.email}</td>
                            <td>${request.requestedModules.map((moduleName) => `<span class="pill">${moduleName}</span>`).join('')}</td>
                            <td><span class="status-badge ${request.status}">${request.status}</span></td>
                            <td class="stack">
                              ${request.notes ? `<span><strong>Note:</strong> ${request.notes}</span>` : '<span class="muted">Aucune note</span>'}
                              ${request.adminMessage ? `<span><strong>Admin:</strong> ${request.adminMessage}</span>` : ''}
                              ${request.approvedCompany?.slug ? `<span><strong>Tenant:</strong> ${request.approvedCompany.slug}</span>` : ''}
                              ${request.approvedCompany?.database?.databaseName ? `<span><strong>Base:</strong> ${request.approvedCompany.database.databaseName}</span>` : ''}
                              ${request.approvedCompany?.database?.provisioningStatus ? `<span><strong>Provisioning:</strong> ${request.approvedCompany.database.provisioningStatus}</span>` : ''}
                              ${request.emailError ? `<span style="color: #b91c1c;"><strong>Email:</strong> ${request.emailError}</span>` : ''}
                            </td>
                            <td>
                              ${
                                request.status === 'pending'
                                  ? `
                                    <form method="post" action="/admin/subscriptions/${request.id}/approve" class="admin-action-form" style="margin-bottom: 12px;">
                                      <input type="hidden" name="token" value="${data.token}" />
                                      <textarea name="adminMessage" placeholder="Message optionnel pour le client"></textarea>
                                      <div class="actions">
                                        <button type="submit">Accepter</button>
                                      </div>
                                    </form>
                                    <form method="post" action="/admin/subscriptions/${request.id}/reject" class="admin-action-form">
                                      <input type="hidden" name="token" value="${data.token}" />
                                      <textarea name="adminMessage" placeholder="Motif du refus"></textarea>
                                      <div class="actions">
                                        <button type="submit" class="danger">Refuser</button>
                                      </div>
                                    </form>
                                  `
                                  : request.status === 'failed'
                                    ? `
                                      <div class="actions" style="margin-bottom: 12px;">
                                        <a class="pricing-cta" href="/admin/subscriptions/${request.id}/edit?token=${encodeURIComponent(data.token)}">Edit modules</a>
                                      </div>
                                      <form method="post" action="/admin/subscriptions/${request.id}/retry" class="admin-action-form">
                                        <input type="hidden" name="token" value="${data.token}" />
                                        <textarea name="adminMessage" placeholder="Message optionnel pour relancer le tenant"></textarea>
                                        <div class="actions">
                                          <button type="submit" class="secondary">Retry</button>
                                        </div>
                                      </form>
                                    `
                                  : `
                                      <form method="post" action="/admin/subscriptions/${request.id}/resync" class="admin-action-form" style="margin-bottom: 12px;">
                                        <input type="hidden" name="token" value="${data.token}" />
                                        <textarea name="adminMessage" placeholder="Message optionnel pour la resynchronisation"></textarea>
                                        <div class="actions">
                                          <button type="submit" class="secondary">Resync</button>
                                        </div>
                                      </form>
                                      <div class="actions">
                                        <a class="pricing-cta" href="/admin/subscriptions/${request.id}/edit?token=${encodeURIComponent(data.token)}">Edit modules</a>
                                      </div>
                                      <span class="muted">Traitee${request.processedAt ? ` le ${formatDateTime(request.processedAt)}` : ''}</span>
                                    `
                              }
                            </td>
                          </tr>
                        `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>

              <div class="admin-cards">
                ${data.requests
                  .map(
                    (request) => `
                      <article class="admin-card">
                        <div class="admin-card-row">
                          <div class="admin-card-label">Entreprise</div>
                          <div><strong>${request.companyName}</strong></div>
                          <div class="muted">${formatDateTime(request.createdAt)}</div>
                        </div>
                        <div class="admin-card-row">
                          <div class="admin-card-label">Email</div>
                          <div>${request.email}</div>
                        </div>
                        <div class="admin-card-row">
                          <div class="admin-card-label">Modules</div>
                          <div>${request.requestedModules.map((moduleName) => `<span class="pill">${moduleName}</span>`).join('')}</div>
                        </div>
                        <div class="admin-card-row">
                          <div class="admin-card-label">Etat</div>
                          <div><span class="status-badge ${request.status}">${request.status}</span></div>
                        </div>
                        <div class="admin-card-row">
                          <div class="admin-card-label">Details</div>
                          <div class="stack">
                            ${request.notes ? `<span><strong>Note:</strong> ${request.notes}</span>` : '<span class="muted">Aucune note</span>'}
                            ${request.adminMessage ? `<span><strong>Admin:</strong> ${request.adminMessage}</span>` : ''}
                            ${request.approvedCompany?.slug ? `<span><strong>Tenant:</strong> ${request.approvedCompany.slug}</span>` : ''}
                            ${request.approvedCompany?.database?.databaseName ? `<span><strong>Base:</strong> ${request.approvedCompany.database.databaseName}</span>` : ''}
                            ${request.approvedCompany?.database?.provisioningStatus ? `<span><strong>Provisioning:</strong> ${request.approvedCompany.database.provisioningStatus}</span>` : ''}
                            ${request.emailError ? `<span style="color: #b91c1c;"><strong>Email:</strong> ${request.emailError}</span>` : ''}
                          </div>
                        </div>
                        ${
                          request.status === 'pending'
                            ? `
                              <form method="post" action="/admin/subscriptions/${request.id}/approve" class="admin-action-form" style="margin-bottom: 12px;">
                                <input type="hidden" name="token" value="${data.token}" />
                                <textarea name="adminMessage" placeholder="Message optionnel pour le client"></textarea>
                                <div class="actions">
                                  <button type="submit">Accepter</button>
                                </div>
                              </form>
                              <form method="post" action="/admin/subscriptions/${request.id}/reject" class="admin-action-form">
                                <input type="hidden" name="token" value="${data.token}" />
                                <textarea name="adminMessage" placeholder="Motif du refus"></textarea>
                                <div class="actions">
                                  <button type="submit" class="danger">Refuser</button>
                                </div>
                              </form>
                              `
                            : request.status === 'failed'
                              ? `
                                <div class="actions" style="margin-bottom: 12px;">
                                  <a class="pricing-cta" href="/admin/subscriptions/${request.id}/edit?token=${encodeURIComponent(data.token)}">Edit modules</a>
                                </div>
                                <form method="post" action="/admin/subscriptions/${request.id}/retry" class="admin-action-form">
                                  <input type="hidden" name="token" value="${data.token}" />
                                  <textarea name="adminMessage" placeholder="Message optionnel pour relancer le tenant"></textarea>
                                  <div class="actions">
                                    <button type="submit" class="secondary">Retry</button>
                                  </div>
                                </form>
                              `
                            : `
                                <form method="post" action="/admin/subscriptions/${request.id}/resync" class="admin-action-form" style="margin-bottom: 12px;">
                                  <input type="hidden" name="token" value="${data.token}" />
                                  <textarea name="adminMessage" placeholder="Message optionnel pour la resynchronisation"></textarea>
                                  <div class="actions">
                                    <button type="submit" class="secondary">Resync</button>
                                  </div>
                                </form>
                                <div class="actions" style="margin-bottom: 12px;">
                                  <a class="pricing-cta" href="/admin/subscriptions/${request.id}/edit?token=${encodeURIComponent(data.token)}">Edit modules</a>
                                </div>
                                <div class="muted">Traitee${request.processedAt ? ` le ${formatDateTime(request.processedAt)}` : ''}</div>
                              `
                        }
                      </article>
                    `
                  )
                  .join('')}
              </div>
            `
        }
      </section>
    `
  );
}

export function renderApprovalResultPage(data: ApprovalResultData) {
  return renderLayout(
    'Fluxo Approval Result',
    `
      ${data.successMessage ? `<div class="notice ok">${data.successMessage}</div>` : ''}
      <section class="hero">
        <div class="eyebrow">Souscription acceptee</div>
        <h1>${data.companyName}</h1>
        <p>Le plan custom a ete cree et la cle d'acces a ete generee.</p>
      </section>

      <section class="grid">
        <article class="panel">
          <h2>Cle d'acces</h2>
          <p class="muted">Cette valeur n'est visible en clair qu'ici. Copiez-la maintenant si necessaire.</p>
          <div class="codebox">${data.key}</div>
        </article>
        <article class="panel">
          <h2>Resume</h2>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Plan:</strong> ${data.planName}</p>
          <p><strong>Tenant:</strong> ${data.companySlug}</p>
          <p><strong>Base dediee:</strong> ${data.databaseName}</p>
          <p><strong>Modules:</strong> ${data.modules.join(', ')}</p>
          <p><strong>Email envoye:</strong> ${data.emailSent ? 'oui' : 'non'}</p>
          ${
            data.emailError
              ? `<p style="color: #b91c1c;"><strong>Erreur email:</strong> ${data.emailError}</p>`
              : ''
          }
          ${
            data.adminMessage
              ? `<p><strong>Message admin:</strong> ${data.adminMessage}</p>`
              : ''
          }
          <p><a href="/admin/subscriptions?token=${encodeURIComponent(data.token)}">Retour a l'administration</a></p>
        </article>
      </section>
    `
  );
}

export function renderEditSubscriptionPage(data: EditSubscriptionPageData) {
  return renderLayout(
    'Fluxo Edit Subscription',
    `
      <section class="hero">
        <div class="eyebrow">Administration</div>
        <h1>Modifier l abonnement</h1>
        <p>Ajustez les modules actifs pour ${data.request.companyName}. Les cles existantes restent valides et reliront les droits depuis le plan mis a jour.</p>
      </section>

      ${data.message ? `<div class="notice ok">${data.message}</div>` : ''}
      ${data.errorMessage ? `<div class="notice bad">${data.errorMessage}</div>` : ''}

      <section class="grid">
        <article class="panel">
          <h2>Entreprise</h2>
          <p><strong>Nom:</strong> ${data.request.companyName}</p>
          <p><strong>Email:</strong> ${data.request.email}</p>
          <p><strong>Etat:</strong> ${data.request.status}</p>
          <p><strong>Tenant:</strong> ${data.request.companySlug ?? 'non defini'}</p>
          <p><strong>Base:</strong> ${data.request.databaseName ?? 'non definie'}</p>
          <p class="muted">Un changement de modules ne regenere pas automatiquement la cle. Les droits sont relus a chaque requete depuis le plan en base.</p>
        </article>

        <article class="panel">
          <h2>Modules actifs</h2>
          <form method="post" action="/admin/subscriptions/${data.request.id}/modules">
            <input type="hidden" name="token" value="${data.token}" />
            <div class="modules-list">
              ${data.catalog
                .map(
                  (module) => `
                    <label class="module-option ${module.availability !== 'available' ? 'disabled' : ''}">
                      <input
                        type="checkbox"
                        name="modules"
                        value="${module.code}"
                        ${data.request.modules.includes(module.code) ? 'checked' : ''}
                        ${module.availability !== 'available' ? 'disabled' : ''}
                      />
                      <span>
                        <span class="module-meta">
                          <strong>${module.name}</strong>
                          ${module.availability !== 'available' ? '<span class="coming-soon">Coming soon</span>' : ''}
                        </span><br />
                        <span class="muted">${module.description}</span>
                      </span>
                    </label>
                  `
                )
                .join('')}
            </div>
            <label>
              Note admin
              <textarea name="adminMessage" placeholder="Message interne ou motif du changement">${data.adminMessage ?? ''}</textarea>
            </label>
            <div class="actions">
              <button type="submit">Enregistrer</button>
              <a class="pricing-cta" href="/admin/subscriptions?token=${encodeURIComponent(data.token)}">Retour</a>
            </div>
          </form>
        </article>
      </section>
    `
  );
}
