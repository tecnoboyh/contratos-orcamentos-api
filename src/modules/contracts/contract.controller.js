const prisma = require('../../config/prisma');

function calculateContractStatus(contract) {
  if (contract.status === 'DRAFT' || contract.status === 'WAITING_SIGNATURE') {
    return contract.status;
  }

  if (!contract.endDate) {
    return contract.status || 'ACTIVE';
  }

  const today = new Date();
  const endDate = new Date(contract.endDate);

  if (endDate < today) {
    return 'EXPIRED';
  }

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) {
    return 'EXPIRING';
  }

  return 'ACTIVE';
}

async function list(req, res) {
  try {
    const { companyId } = req.user;
    const { search, status, type } = req.query;

    const where = {
      companyId
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          relatedParty: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          documentNumber: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const contracts = await prisma.contract.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        signatureRequests: {
          select: {
            id: true,
            channel: true,
            status: true,
            signerName: true,
            signerEmail: true,
            signerPhone: true,
            sentAt: true,
            signedAt: true
          }
        },
        obras: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    const result = contracts.map((contract) => ({
      ...contract,
      currentStatus: calculateContractStatus(contract)
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar contratos.',
      error: error.message
    });
  }
}

async function show(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        template: true,
        signatureRequests: true,
        obras: true,
        uploads: true,
        purchaseOrders: true
      }
    });

    if (!contract) {
      return res.status(404).json({
        message: 'Contrato não encontrado.'
      });
    }

    return res.json({
      ...contract,
      currentStatus: calculateContractStatus(contract)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao buscar contrato.',
      error: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { companyId } = req.user;

    const {
      templateId,
      title,
      type,
      relatedParty,
      documentNumber,
      totalValue,
      monthlyValue,
      startDate,
      endDate,
      content,
      filledFields
    } = req.body;

    if (!title || !type || !relatedParty) {
      return res.status(400).json({
        message: 'Título, tipo e parte relacionada são obrigatórios.'
      });
    }

    if (templateId) {
      const template = await prisma.contractTemplate.findFirst({
        where: {
          id: templateId,
          companyId
        }
      });

      if (!template) {
        return res.status(404).json({
          message: 'Template não encontrado.'
        });
      }
    }

    const contract = await prisma.contract.create({
      data: {
        companyId,
        templateId: templateId || null,
        title,
        type,
        relatedParty,
        documentNumber: documentNumber || null,
        totalValue: totalValue || null,
        monthlyValue: monthlyValue || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        content: content || null,
        filledFields: filledFields || null,
        status: 'DRAFT'
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Contract',
        entityId: contract.id,
        metadata: {
          title: contract.title
        }
      }
    });

    return res.status(201).json(contract);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar contrato.',
      error: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      templateId,
      title,
      type,
      status,
      relatedParty,
      documentNumber,
      totalValue,
      monthlyValue,
      startDate,
      endDate,
      content,
      filledFields
    } = req.body;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!contract) {
      return res.status(404).json({
        message: 'Contrato não encontrado.'
      });
    }

    if (templateId) {
      const template = await prisma.contractTemplate.findFirst({
        where: {
          id: templateId,
          companyId
        }
      });

      if (!template) {
        return res.status(404).json({
          message: 'Template não encontrado.'
        });
      }
    }

    const updatedContract = await prisma.contract.update({
      where: {
        id
      },
      data: {
        templateId: templateId !== undefined ? templateId : contract.templateId,
        title: title !== undefined ? title : contract.title,
        type: type !== undefined ? type : contract.type,
        status: status !== undefined ? status : contract.status,
        relatedParty: relatedParty !== undefined ? relatedParty : contract.relatedParty,
        documentNumber: documentNumber !== undefined ? documentNumber : contract.documentNumber,
        totalValue: totalValue !== undefined ? totalValue : contract.totalValue,
        monthlyValue: monthlyValue !== undefined ? monthlyValue : contract.monthlyValue,
        startDate: startDate !== undefined ? new Date(startDate) : contract.startDate,
        endDate: endDate !== undefined ? new Date(endDate) : contract.endDate,
        content: content !== undefined ? content : contract.content,
        filledFields: filledFields !== undefined ? filledFields : contract.filledFields
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Contract',
        entityId: updatedContract.id,
        metadata: {
          title: updatedContract.title
        }
      }
    });

    return res.json(updatedContract);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao atualizar contrato.',
      error: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!contract) {
      return res.status(404).json({
        message: 'Contrato não encontrado.'
      });
    }

    await prisma.contract.delete({
      where: {
        id
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Contract',
        entityId: id,
        metadata: {
          title: contract.title
        }
      }
    });

    return res.json({
      message: 'Contrato removido com sucesso.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao remover contrato.',
      error: error.message
    });
  }
}

module.exports = {
  list,
  show,
  create,
  update,
  remove
};