const prisma = require('../../config/prisma');

async function list(req, res) {
  try {
    const { companyId } = req.user;
    const { search, status, obraId, contractId } = req.query;

    const where = {
      companyId
    };

    if (status) {
      where.status = status;
    }

    if (obraId) {
      where.obraId = obraId;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (search) {
      where.OR = [
        {
          number: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          supplier: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          payerCnpj: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        obra: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true,
            relatedParty: true,
            status: true
          }
        }
      }
    });

    return res.json(purchaseOrders);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar ordens de compra.',
      error: error.message
    });
  }
}

async function show(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        obra: true,
        contract: true
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        message: 'Ordem de compra não encontrada.'
      });
    }

    return res.json(purchaseOrder);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao buscar ordem de compra.',
      error: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { companyId } = req.user;

    const {
      obraId,
      contractId,
      number,
      payerCnpj,
      supplier,
      description,
      totalValue,
      status,
      issuedAt
    } = req.body;

    if (!obraId || !number || !payerCnpj || !totalValue) {
      return res.status(400).json({
        message: 'Obra, número, CNPJ pagador e valor total são obrigatórios.'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id: obraId,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    let finalContractId = contractId || obra.contractId || null;

    if (finalContractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          id: finalContractId,
          companyId
        }
      });

      if (!contract) {
        return res.status(404).json({
          message: 'Contrato não encontrado.'
        });
      }
    }

    const numberAlreadyExists = await prisma.purchaseOrder.findFirst({
      where: {
        companyId,
        number
      }
    });

    if (numberAlreadyExists) {
      return res.status(400).json({
        message: 'Já existe uma ordem de compra com este número.'
      });
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        companyId,
        obraId,
        contractId: finalContractId,
        number,
        payerCnpj,
        supplier: supplier || null,
        description: description || null,
        totalValue,
        status: status || 'DRAFT',
        issuedAt: issuedAt ? new Date(issuedAt) : null
      },
      include: {
        obra: true,
        contract: true
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: purchaseOrder.id,
        metadata: {
          number: purchaseOrder.number,
          obraId: purchaseOrder.obraId,
          totalValue: purchaseOrder.totalValue
        }
      }
    });

    return res.status(201).json(purchaseOrder);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar ordem de compra.',
      error: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      obraId,
      contractId,
      number,
      payerCnpj,
      supplier,
      description,
      totalValue,
      status,
      issuedAt
    } = req.body;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        message: 'Ordem de compra não encontrada.'
      });
    }

    if (obraId) {
      const obra = await prisma.obra.findFirst({
        where: {
          id: obraId,
          companyId
        }
      });

      if (!obra) {
        return res.status(404).json({
          message: 'Obra não encontrada.'
        });
      }
    }

    if (contractId) {
      const contract = await prisma.contract.findFirst({
        where: {
          id: contractId,
          companyId
        }
      });

      if (!contract) {
        return res.status(404).json({
          message: 'Contrato não encontrado.'
        });
      }
    }

    if (number && number !== purchaseOrder.number) {
      const numberAlreadyExists = await prisma.purchaseOrder.findFirst({
        where: {
          companyId,
          number
        }
      });

      if (numberAlreadyExists) {
        return res.status(400).json({
          message: 'Já existe uma ordem de compra com este número.'
        });
      }
    }

    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: {
        id
      },
      data: {
        obraId: obraId !== undefined ? obraId : purchaseOrder.obraId,
        contractId: contractId !== undefined ? contractId : purchaseOrder.contractId,
        number: number !== undefined ? number : purchaseOrder.number,
        payerCnpj: payerCnpj !== undefined ? payerCnpj : purchaseOrder.payerCnpj,
        supplier: supplier !== undefined ? supplier : purchaseOrder.supplier,
        description: description !== undefined ? description : purchaseOrder.description,
        totalValue: totalValue !== undefined ? totalValue : purchaseOrder.totalValue,
        status: status !== undefined ? status : purchaseOrder.status,
        issuedAt: issuedAt !== undefined
          ? issuedAt
            ? new Date(issuedAt)
            : null
          : purchaseOrder.issuedAt
      },
      include: {
        obra: true,
        contract: true
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'PurchaseOrder',
        entityId: updatedPurchaseOrder.id,
        metadata: {
          number: updatedPurchaseOrder.number,
          status: updatedPurchaseOrder.status
        }
      }
    });

    return res.json(updatedPurchaseOrder);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao atualizar ordem de compra.',
      error: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        message: 'Ordem de compra não encontrada.'
      });
    }

    await prisma.purchaseOrder.delete({
      where: {
        id
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'DELETE',
        entity: 'PurchaseOrder',
        entityId: id,
        metadata: {
          number: purchaseOrder.number
        }
      }
    });

    return res.json({
      message: 'Ordem de compra removida com sucesso.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao remover ordem de compra.',
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