const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendContractSignatureEmail({
  to,
  signerName,
  contractTitle,
  relatedParty,
  signatureUrl
}) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_EMAIL_FROM,
    to: [to],
    subject: `Assinatura pendente: ${contractTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>Assinatura de contrato</h2>

        <p>Olá, ${signerName}.</p>

        <p>
          Você recebeu um contrato para assinatura:
          <strong>${contractTitle}</strong>.
        </p>

        <p>
          Parte relacionada: <strong>${relatedParty}</strong>
        </p>

        <p>
          Para assinar, acesse o link abaixo:
        </p>

        <p>
          <a href="${signatureUrl}" target="_blank"
             style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">
            Assinar contrato
          </a>
        </p>

        <p style="font-size: 13px; color: #6b7280;">
          Se o botão não funcionar, copie e cole este link no navegador:<br />
          ${signatureUrl}
        </p>
      </div>
    `
  });

  if (error) {
    throw new Error(error.message || 'Erro ao enviar e-mail.');
  }

  return data;
}

module.exports = {
  sendContractSignatureEmail
};