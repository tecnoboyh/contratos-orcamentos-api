async function sendWhatsappText({
  phone,
  message,
  messageId,
  delayMessage = 0
}) {
  const baseUrl = process.env.WAPI_BASE_URL;
  const token = process.env.WAPI_TOKEN;
  const instanceId = process.env.WAPI_INSTANCE_ID;

  if (!baseUrl || !token || !instanceId) {
    throw new Error('Configuração da W-API incompleta.');
  }

  const url = `${baseUrl}/v1/message/send-text?instanceId=${instanceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone,
      message,
      messageId: messageId || '',
      delayMessage
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || 'Erro ao enviar mensagem pelo WhatsApp.');
  }

  return result;
}

function buildSignatureWhatsappMessage({
  signerName,
  contractTitle,
  relatedParty,
  signatureUrl
}) {
  return [
    `Olá, ${signerName}.`,
    '',
    `Você recebeu um contrato para assinatura:`,
    `*${contractTitle}*`,
    '',
    `Parte relacionada: *${relatedParty}*`,
    '',
    `Para assinar, acesse o link abaixo:`,
    signatureUrl
  ].join('\n');
}

module.exports = {
  sendWhatsappText,
  buildSignatureWhatsappMessage
};