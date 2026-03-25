import { renderLayout } from "./RenderLayout";
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
          ${data.emailError
            ? `<p style="color: #b91c1c;"><strong>Erreur email:</strong> ${data.emailError}</p>`
            : ''
        }
          ${data.adminMessage
            ? `<p><strong>Message admin:</strong> ${data.adminMessage}</p>`
            : ''
        }
          <p><a href="/admin/subscriptions?token=${encodeURIComponent(data.token)}">Retour a l'administration</a></p>
        </article>
      </section>
    `
    );
}