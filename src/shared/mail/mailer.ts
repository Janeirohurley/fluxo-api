import nodemailer from 'nodemailer';

type ApprovalEmailPayload = {
  to: string;
  companyName: string;
  modules: string[];
  accessKey: string;
  planName: string;
  adminMessage: string | null;
};

export type MailDeliveryResult =
  | {
      sent: true;
      messageId: string;
    }
  | {
      sent: false;
      error: string;
    };

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
}

export async function sendSubscriptionApprovalEmail(
  payload: ApprovalEmailPayload
): Promise<MailDeliveryResult> {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM;

  if (!transporter || !from) {
    return {
      sent: false,
      error: 'SMTP is not configured. Set SMTP_HOST and SMTP_FROM to enable email delivery.'
    };
  }

  try {
    const result = await transporter.sendMail({
      from,
      to: payload.to,
      subject: `Fluxo subscription approved - ${payload.planName}`,
      text: [
        `Bonjour ${payload.companyName},`,
        '',
        `Votre souscription Fluxo a ete approuvee.`,
        `Plan: ${payload.planName}`,
        `Modules: ${payload.modules.join(', ')}`,
        '',
        `Votre cle d'acces: ${payload.accessKey}`,
        '',
        payload.adminMessage ? `Message admin: ${payload.adminMessage}` : '',
        'Conservez cette cle en lieu sur.',
        '',
        'Equipe Fluxo'
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin-bottom: 0.5rem;">Fluxo Subscription Approved</h2>
          <p>Bonjour <strong>${payload.companyName}</strong>,</p>
          <p>Votre souscription a ete approuvee.</p>
          <p><strong>Plan:</strong> ${payload.planName}<br /><strong>Modules:</strong> ${payload.modules.join(', ')}</p>
          <div style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 1rem; border-radius: 12px; margin: 1rem 0;">
            <div style="font-size: 0.85rem; color: #6b7280;">Cle d'acces</div>
            <div style="font-family: 'Courier New', monospace; font-size: 1rem; word-break: break-all;">${payload.accessKey}</div>
          </div>
          ${
            payload.adminMessage
              ? `<p><strong>Message admin:</strong> ${payload.adminMessage}</p>`
              : ''
          }
          <p>Conservez cette cle en lieu sur.</p>
          <p>Equipe Fluxo</p>
        </div>
      `
    });

    return {
      sent: true,
      messageId: result.messageId
    };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error'
    };
  }
}
