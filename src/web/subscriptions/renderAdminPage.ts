import { renderLayout } from "./RenderLayout";


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
function formatDateTime(value: Date | null) {
    if (!value) {
        return null;
    }

    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(value);
}



export function renderAdminPage(data: AdminPageData) {
    const requestsCount = data.requests.length;

    // Style additionnel spécifique à la table admin pour ne pas surcharger le layout de base
    const adminStyles = `
        <style>
            .admin-panel { padding: 0; overflow: hidden; }
            .admin-header { padding: 24px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
            
            table { width: 100%; border-collapse: collapse; background: white; }
            th { background: #faf9f6; font-weight: 600; color: var(--muted); text-transform: uppercase; font-size: 0.7rem; padding: 16px 24px; border-bottom: 1px solid var(--line); }
            td { padding: 20px 24px; vertical-align: middle; border-bottom: 1px solid #f0ede8; }
            tr:hover td { background-color: #fdfcfb; }
            
            .comp-name { font-size: 1.05rem; font-weight: 700; color: var(--ink); display: block; margin-bottom: 4px; }
            .comp-meta { font-size: 0.85rem; color: var(--muted); }
            
            .module-group { display: flex; flex-wrap: wrap; gap: 4px; max-width: 200px; }
            .pill-sm { font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; background: var(--accent-soft); color: var(--accent); border: 1px solid var(--line); }
            
            .action-box { display: flex; flex-direction: column; gap: 10px; min-width: 220px; }
            .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .compact-input { font-size: 0.85rem; padding: 8px; min-height: 60px !important; margin-bottom: 4px; }
            
            .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
            .pending .status-dot { background: var(--warn); }
            .approved .status-dot { background: var(--ok); }
            .rejected .status-dot { background: var(--bad); }
        </style>
    `;

    const tableRows = data.requests.map((request) => `
        <tr>
            <td>
                <span class="comp-name">${request.companyName}</span>
                <span class="comp-meta">Reçu le ${formatDateTime(request.createdAt)}</span>
            </td>
            <td>
                <code style="font-size: 0.9rem; color: var(--muted);">${request.email}</code>
            </td>
            <td>
                <div class="module-group">
                    ${request.requestedModules.map(m => `<span class="pill-sm">${m}</span>`).join('')}
                </div>
            </td>
            <td>
                <span class="status-badge ${request.status}">
                    <span class="status-dot"></span>${request.status}
                </span>
            </td>
            <td>
                <div class="stack" style="font-size: 0.85rem;">
                    ${request.notes ? `<div><strong>Note:</strong> ${request.notes}</div>` : ''}
                    ${request.approvedCompany?.slug ? `<div class="muted">ID: ${request.approvedCompany.slug}</div>` : ''}
                    ${request.emailError ? `<div style="color:var(--bad)">⚠${request.emailError}</div>` : ''}
                </div>
            </td>
            <td>
                <div class="action-box">
                    ${request.status === 'pending' ? `
                        <form method="post" action="/admin/subscriptions/${request.id}/approve">
                            <input type="hidden" name="token" value="${data.token}" />
                            <textarea name="adminMessage" class="compact-input" placeholder="Message client..."></textarea>
                            <div class="btn-group">
                                <button type="submit" style="padding: 8px;">Accepter</button>
                                <button type="submit" formaction="/admin/subscriptions/${request.id}/reject" class="danger" style="padding: 8px;">Refuser</button>
                            </div>
                        </form>
                    ` : `
                        <div class="btn-group">
                            <a class="pricing-cta" style="margin:0; font-size:0.8rem; padding:8px;" href="/admin/subscriptions/${request.id}/edit?token=${encodeURIComponent(data.token)}">Modifier</a>
                            <form method="post" action="/admin/subscriptions/${request.id}/resync">
                                <input type="hidden" name="token" value="${data.token}" />
                                <button type="submit" class="secondary" style="width:100%; padding: 8px; font-size:0.8rem;">Resync</button>
                            </form>
                        </div>
                    `}
                </div>
            </td>
        </tr>
    `).join('');

    return renderLayout(
        'Fluxo Admin',
        `
        ${adminStyles}
        <section class="hero">
            <div class="eyebrow">Dashboard</div>
            <h1>Gestion des Souscriptions</h1>
            <p>Validez les demandes entrantes et supervisez le provisioning des instances clients.</p>
        </section>

        ${data.message ? `<div class="notice ok">${data.message}</div>` : ''}
        ${data.errorMessage ? `<div class="notice bad">${data.errorMessage}</div>` : ''}

        <section class="panel admin-panel">
            <div class="admin-header">
                <h2>Demandes Récentes</h2>
                <span class="pill">${requestsCount} total</span>
            </div>
            
            <div class="table-wrap" style="border:none; border-radius:0;">
                ${requestsCount === 0
            ? '<div class="admin-empty" style="margin:24px;">Aucune demande en attente.</div>'
            : `<table>
                        <thead>
                            <tr>
                                <th>Entreprise</th>
                                <th>Contact</th>
                                <th>Modules</th>
                                <th>Statut</th>
                                <th>Détails</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                       </table>`
        }
            </div>
        </section>
        `
    );
}