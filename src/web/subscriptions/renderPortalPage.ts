import { renderLayout } from "./RenderLayout";
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

export function renderPortalPage(data: PortalPageData) {
    const featuredPlans = data.plans.slice(0, 3);
    const selectedModules = data.values?.modules ?? [];

    const planPresets = featuredPlans.map((plan, index) => ({
        ...plan,
        tierLabel: index === 0 ? 'Essentiel' : index === 1 ? 'Recommandé' : 'Entreprise',
        priceLabel: index === 0 ? '1 module' : index === 1 ? `${Math.max(plan.modules.length, 2)} modules` : 'Accès Total',
        isFeatured: index === 1,
        isSelected: data.selectedPresetCode === plan.code
    }));

    const portalStyles = `
        <style>
            .portal-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
            
            /* Hero & Pricing */
            .hero { text-align: center; padding: 60px 0; }
            .pricing-shell { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                gap: 24px; 
                margin-top: 48px; 
            }
            
            .pricing-card {
                background: white;
                border: 1px solid var(--line);
                border-radius: 9px;
                padding: 34px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
                position: relative;
            }
            .pricing-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
            .pricing-card.featured { border: 2px solid #6366f1; scale: 1.05; z-index: 2; }
            .pricing-card.selected { background: #f5f3ff; border-color: #6366f1; }
            
            .badge-popular {
                position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
                background: linear-gradient(135deg, #6366f1, #a855f7);
                color: white; padding: 4px 16px; border-radius: 9px; font-size: 0.8rem; font-weight: 700;
            }

            .price-row { margin: 24px 0; display: flex; align-items: baseline; gap: 8px; }
            .price-amount { font-size: 1.5rem; font-weight: 800; color: var(--ink); }
            .feature-list { list-style: none; padding: 0; margin: 24px 0; flex-grow: 1; }
            .feature-list li { 
                padding: 10px 0; border-bottom: 1px solid #f0f0f0; 
                display: flex; align-items: center; gap: 10px; font-size: 0.95rem;
            }
            .feature-list li::before { content: ''; color: #10b981; font-weight: 900; }

            /* Bottom Section Layout */
            .portal-grid { 
                display: grid; 
                grid-template-columns: 1fr 380px; 
                gap: 40px; 
                margin-top: 80px; 
                align-items: start;
            }

            /* Module Selection Cards */
            .modules-selector { display: grid; gap: 12px; margin: 24px 0; }
            .module-row {
                display: flex; align-items: center; gap: 16px;
                padding: 16px; border: 1.5px solid var(--line); border-radius: 9px;
                cursor: pointer; transition: all 0.2s;
            }
            .module-row:hover { border-color: var(--muted); background: #fafafa; }
            .module-row.active { border-color: #6366f1; background: #f5f3ff; }
            .module-row input { width: 20px; height: 20px; accent-color: #6366f1; }

            /* Sticky Summary Sidebar */
            .sticky-summary { 
                position: sticky; top: 40px; 
                background: #1e1b4b; color: white; 
                padding: 32px; border-radius: 9px;
            }
            .summary-pill { 
                display: inline-block; background: rgba(255,255,255,0.1); 
                padding: 6px 12px; border-radius: 8px; margin: 4px; font-size: 0.85rem;
            }
            
            @media (max-width: 900px) {
                .portal-grid { grid-template-columns: 1fr; }
                .pricing-card.featured { scale: 1; }
            }
        </style>
    `;

    return renderLayout(
        'Souscription Fluxo',
        `
        ${portalStyles}
        <div class="portal-container">
            <section class="hero">
                <div class="eyebrow">Abonnements SaaS</div>
                <h1 style="font-size: 3.5rem; letter-spacing: -0.02em;">Le moteur de votre croissance</h1>
                <p class="para" style="max-width: 700px; margin: 0 auto;">
                    Choisissez un pack prêt à l'emploi ou composez votre suite d'outils sur mesure. 
                    Activation immédiate après validation admin.
                </p>

                <section class="pricing-shell">
                    ${planPresets.map((plan) => `
                        <article class="pricing-card ${plan.isFeatured ? 'featured' : ''} ${plan.isSelected ? 'selected' : ''}">
                            ${plan.isFeatured ? '<div class="badge-popular">RECOMMANDÉ</div>' : ''}
                            <div class="pricing-label" style="text-transform: uppercase; font-weight: 700; color: #6366f1; font-size: 0.8rem;">${plan.tierLabel}</div>
                            <h3 class="pricing-title" style="font-size: 1.75rem; margin: 8px 0;">${plan.name}</h3>
                            <div class="price-row">
                                <div class="price-amount">${plan.priceLabel}</div>
                            </div>
                            <p class="muted" style="font-size: 0.9rem; margin-bottom: 20px;">${plan.description ?? 'Configuration optimale.'}</p>
                            <ul class="feature-list">
                                ${plan.modules.map(m => `<li>
                                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>${m}</li>`).join('')}
                            </ul>
                            <a class="pricing-cta" href="/portal?preset=${encodeURIComponent(plan.code)}#request-form" 
                               style="width:100%; text-align:center; padding: 14px; border-radius: 12px; font-weight: 700;">
                                Sélectionner ce plan
                            </a>
                        </article>
                    `).join('')}
                </section>
            </section>

            ${data.successMessage ? `<div class="notice ok">${data.successMessage}</div>` : ''}
            ${data.errorMessage ? `<div class="notice bad">${data.errorMessage}</div>` : ''}

            <div class="portal-grid" id="request-form">
                <section class="panel" >
                    <h2 style="font-size: 2rem; margin-bottom: 32px;">Personnalisez votre offre</h2>
                    
                    <form method="post" action="/portal/subscribe">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
                            <label>
                                <strong>Nom de l'entreprise</strong>
                                <input name="companyName" value="${data.values?.companyName ?? ''}" placeholder="Horizon Trading" required />
                            </label>
                            <label>
                                <strong>Email professionnel</strong>
                                <input type="email" name="email" value="${data.values?.email ?? ''}" placeholder="dirigeant@horizon.com" required />
                            </label>
                        </div>

                        <label><strong>Modules disponibles</strong></label>
                        <div class="modules-selector">
                            ${data.modules.map(module => {
            const isChecked = selectedModules.includes(module.code);
            const isComing = module.availability !== 'available';
            return `
                                    <label class="module-row ${isChecked ? 'active' : ''} ${isComing ? 'disabled' : ''}">
                                        <input 
                                            type="checkbox" 
                                            name="modules" 
                                            value="${module.code}" 
                                            ${isChecked ? 'checked' : ''} 
                                            ${isComing ? 'disabled' : ''}
                                            onchange="this.parentElement.classList.toggle('active', this.checked)"
                                        />
                                        <div style="flex-grow: 1;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <strong style="color: var(--ink);">${module.name}</strong>
                                                ${isComing ? '<span class="coming-soon">Bientôt</span>' : ''}
                                            </div>
                                            <div class="muted" style="font-size: 0.85rem;">${module.description}</div>
                                        </div>
                                    </label>
                                `;
        }).join('')}
                        </div>

                        <label style="margin-top: 32px;">
                            <strong>Notes particulières</strong>
                            <textarea name="notes" style="min-height: 120px;" placeholder="Besoins spécifiques, nombre d'utilisateurs estimé...">${data.values?.notes ?? ''}</textarea>
                        </label>

                        <div class="actions" style="margin-top: 40px;">
                            <button type="submit" style="padding: 18px 48px; font-size: 1.1rem; border-radius: 9px; background: #6366f1; color: white; border: none; font-weight: 700; cursor: pointer; width: 100%;">
                                Soumettre ma demande d'accès
                            </button>
                        </div>
                    </form>
                </section>

                <aside class="sticky-summary">
                    <h3 style="color: white; margin-top: 0; font-size: 1.5rem;">Votre Récapitulatif</h3>
                    <p style="color: #a5b4fc; font-size: 0.9rem; line-height: 1.6;">
                        Voici les modules qui seront inclus dans votre demande de provisionnement :
                    </p>
                    
                    <div style="margin: 9px 0;">
                        ${selectedModules.length > 0
            ? selectedModules.map(m => `<span class="summary-pill">${m}</span>`).join('')
            : '<div style="color: rgba(255,255,255,0.4); font-style: italic;">Aucun module sélectionné</div>'
        }
                    </div>

                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                            <div style="width: 32px; height: 32px; background: #4338ca; border-radius: 25%; display: flex; align-items: center; justify-content: center; font-weight: 800;">1</div>
                            <div style="font-size: 0.85rem; color: #e0e7ff;"><strong>Soumission</strong> de la configuration personnalisée.</div>
                        </div>
                        <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                            <div style="width: 32px; height: 32px; background: #4338ca; border-radius: 25%; display: flex; align-items: center; justify-content: center; font-weight: 800;">2</div>
                            <div style="font-size: 0.85rem; color: #e0e7ff;"><strong>Validation</strong> technique par nos équipes (sous 24h).</div>
                        </div>
                        <div style="display: flex; gap: 16px;">
                            <div style="width: 32px; height: 32px; background: #4338ca; border-radius: 25%; display: flex; align-items: center; justify-content: center; font-weight: 800;">3</div>
                            <div style="font-size: 0.85rem; color: #e0e7ff;"><strong>Activation</strong> et envoi de votre clé d'accès unique.</div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
        `
    );
}