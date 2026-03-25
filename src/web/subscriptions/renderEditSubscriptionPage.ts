import { renderLayout } from "./RenderLayout";

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

export function renderEditSubscriptionPage(data: EditSubscriptionPageData) {
    const editStyles = `
        <style>
            /* Variables de vibrance */
            :root {
                --brand-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                --card-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }

            .edit-wrapper { max-width: 1100px; margin: 0 auto; padding-bottom: 100px; }

            /* Header Info Bar */
            .subscription-header {
                display: flex;
                background: white;
                padding: 24px;
                border-radius: 9px;
                border: 1px solid var(--line);
                margin-bottom: 40px;
                gap: 40px;
              
            }
            .header-stat { display: flex; flex-direction: column; gap: 4px; }
            .header-stat label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 700; }
            .header-stat span { font-weight: 600; color: var(--ink); }

            /* Modules Grid */
            .modules-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }

            .module-card {
                position: relative;
                background: white;
                border: 2px solid var(--line);
                border-radius: 9px;
                padding: 24px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .module-card:hover { transform: translateY(-4px); border-color: #d1d5db; }

            /* État Actif Vibrante */
            .module-card.active {
                border-color: #6366f1;
                background: linear-gradient(to bottom right, #ffffff, #f5f3ff);
              
            }

            .module-card.active .module-icon {
                background: var(--brand-gradient);
                color: white;
                transform: scale(1.1);
            }

            /* Icône du module */
            .module-icon {
                width: 45px;
                height: 45px;
                border-radius: 9px;
                background: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                transition: all 0.3s ease;
            }

            .module-title { font-size: 1.25rem; font-weight: 800; color: var(--ink); }
            .module-description { font-size: 0.95rem; color: var(--muted); line-height: 1.5; flex-grow: 1; }

            /* Custom Switch/Checkbox */
            .module-switch {
                position: absolute;
                top: 24px;
                right: 24px;
                width: 44px;
                height: 24px;
                background: #e5e7eb;
                border-radius: 999px;
                transition: all 0.3s;
            }
            .module-switch::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                transition: all 0.3s;
            }
            input:checked + .module-switch { background: #6366f1; }
            input:checked + .module-switch::after { transform: translateX(20px); }
            
            input[type="checkbox"] { display: none; }

            /* Note & Footer */
            .admin-footer {
                background: white;
                padding: 32px;
                border-radius: 9px;
                border: 1px solid var(--line);
                
            }

            .save-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 24px;
            }

            button[type="submit"] {
                background: var(--brand-gradient);
                color: white;
                padding: 14px 32px;
                border-radius: 9px;
                font-weight: 700;
                border: none;
                cursor: pointer;
                box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.3);
                transition: opacity 0.2s;
            }
            button[type="submit"]:hover { opacity: 0.9; }

            .coming-soon-tag {
                font-size: 0.7rem;
                padding: 2px 8px;
                background: #fef3c7;
                color: #92400e;
                border-radius: 6px;
                font-weight: 700;
            }
        </style>
    `;

    // Map des emojis par module pour rendre ça "vibrant"
    const icons: Record<string, string> = {
        'assets': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cassette-tape-icon lucide-cassette-tape"><rect width="20" height="16" x="2" y="4" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M8 12h8"/><circle cx="16" cy="10" r="2"/><path d="m6 20 .7-2.9A1.4 1.4 0 0 1 8.1 16h7.8a1.4 1.4 0 0 1 1.4 1l.7 3"/></svg>',
        'finance': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet-cards-icon lucide-wallet-cards"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"/></svg>',
        'employees': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-id-card-lanyard-icon lucide-id-card-lanyard"><path d="M13.5 8h-3"/><path d="m15 2-1 2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3"/><path d="M16.899 22A5 5 0 0 0 7.1 22"/><path d="m9 2 3 6"/><circle cx="12" cy="15" r="3"/></svg>',
        'payroll': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg>',
    };

    return renderLayout(
        `Plan ${data.request.companyName}`,
        `
        ${editStyles}
        <div class="edit-wrapper">
            <section class="hero">
                <div class="eyebrow">Abonnement Professionnel</div>
                <h1>${data.request.companyName}</h1>
                <p>Configurez les fonctionnalités disponibles pour ce client.</p>
            </section>

            <div class="subscription-header">
                <div class="header-stat">
                    <label>Email Contact</label>
                    <span>${data.request.email}</span>
                </div>
                <div class="header-stat">
                    <label>Identifiant Tenant</label>
                    <code>${data.request.companySlug ?? 'N/A'}</code>
                </div>
                <div class="header-stat">
                    <label>Base de données</label>
                    <span>${data.request.databaseName ?? 'Standard'}</span>
                </div>
                <div class="header-stat" style="margin-left: auto;">
                    <label>Statut</label>
                    <span class="status-badge ${data.request.status}">${data.request.status}</span>
                </div>
            </div>

            <form method="post" action="/admin/subscriptions/${data.request.id}/modules">
                <input type="hidden" name="token" value="${data.token}" />

                <div class="modules-container">
                    ${data.catalog.map(module => {
            const isChecked = data.request.modules.includes(module.code);
            const isDisabled = module.availability !== 'available';
            const icon = icons[module.code.toLowerCase()] || '🧩';

            return `
                            <label class="module-card ${isChecked ? 'active' : ''} ${isDisabled ? 'disabled' : ''}">
                                <input 
                                    type="checkbox" 
                                    name="modules" 
                                    value="${module.code}"
                                    ${isChecked ? 'checked' : ''}
                                    ${isDisabled ? 'disabled' : ''}
                                    onchange="this.closest('.module-card').classList.toggle('active', this.checked)"
                                />
                                <div class="module-switch"></div>
                                <div class="module-icon">${icon}</div>
                                <div class="module-title">
                                    ${module.name}
                                    ${isDisabled ? '<span class="coming-soon-tag">Bientôt</span>' : ''}
                                </div>
                                <p class="module-description">${module.description}</p>
                            </label>
                        `;
        }).join('')}
                </div>

                <div class="admin-footer">
                    <label style="font-weight: 800; margin-bottom: 12px; display: block;">Note Interne</label>
                    <textarea 
                        name="adminMessage" 
                        placeholder="Notez ici la raison du changement (ex: Upgrade annuel)"
                        style="width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 16px; min-height: 80px;"
                    >${data.adminMessage ?? ''}</textarea>

                    <div class="save-bar">
                        <a href="/admin/subscriptions?token=${encodeURIComponent(data.token)}" style="color: var(--muted); text-decoration: none; font-weight: 600;">
                            ← Abandonner les modifications
                        </a>
                        <button type="submit">Mettre à jour le plan</button>
                    </div>
                </div>
            </form>
        </div>
        `
    );
}