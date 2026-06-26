const prisma = require('../../config/prisma');

async function view(req, res) {
  try {
    const { id } = req.params;

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: {
        id
      },
      include: {
        contract: true
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({
        message: 'Solicitação de assinatura não encontrada.'
      });
    }

    if (signatureRequest.expiresAt && signatureRequest.expiresAt < new Date()) {
      await prisma.signatureRequest.update({
        where: {
          id
        },
        data: {
          status: 'EXPIRED'
        }
      });

      return res.status(400).json({
        message: 'Este link de assinatura expirou.'
      });
    }

    return res.json({
      id: signatureRequest.id,
      status: signatureRequest.status,
      signerName: signatureRequest.signerName,
      contract: {
        id: signatureRequest.contract.id,
        title: signatureRequest.contract.title,
        type: signatureRequest.contract.type,
        status: signatureRequest.contract.status,
        relatedParty: signatureRequest.contract.relatedParty,
        content: signatureRequest.contract.content,
        signedAt: signatureRequest.contract.signedAt,
        archivedAt: signatureRequest.contract.archivedAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao carregar assinatura.',
      error: error.message
    });
  }
}

async function sign(req, res) {
  try {
    const { id } = req.params;

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: {
        id
      },
      include: {
        contract: true
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({
        message: 'Solicitação de assinatura não encontrada.'
      });
    }

    if (signatureRequest.status === 'SIGNED') {
      return res.status(400).json({
        message: 'Este assinante já assinou o contrato.'
      });
    }

    if (signatureRequest.expiresAt && signatureRequest.expiresAt < new Date()) {
      await prisma.signatureRequest.update({
        where: {
          id
        },
        data: {
          status: 'EXPIRED'
        }
      });

      return res.status(400).json({
        message: 'Este link de assinatura expirou.'
      });
    }

    const signedAt = new Date();

    await prisma.signatureRequest.update({
      where: {
        id
      },
      data: {
        status: 'SIGNED',
        signedAt
      }
    });

    const pendingSignatures = await prisma.signatureRequest.count({
      where: {
        contractId: signatureRequest.contractId,
        status: {
          not: 'SIGNED'
        }
      }
    });

    let contractStatus = 'WAITING_SIGNATURE';
    let contractArchived = false;

    if (pendingSignatures === 0) {
      contractStatus = 'SIGNED';
      contractArchived = true;

      await prisma.contract.update({
        where: {
          id: signatureRequest.contractId
        },
        data: {
          status: 'SIGNED',
          signedAt,
          archivedAt: signedAt
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        companyId: signatureRequest.contract.companyId,
        action: 'SIGN_CONTRACT',
        entity: 'Contract',
        entityId: signatureRequest.contractId,
        metadata: {
          signerName: signatureRequest.signerName,
          signerEmail: signatureRequest.signerEmail,
          contractStatus
        }
      }
    });

    return res.json({
      message:
        contractStatus === 'SIGNED'
          ? 'Contrato assinado por todos os assinantes e arquivado com sucesso.'
          : 'Assinatura registrada com sucesso. Ainda existem assinaturas pendentes.',
      contractStatus,
      contractArchived
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao assinar contrato.',
      error: error.message
    });
  }
}

module.exports = {
  view,
  sign
};