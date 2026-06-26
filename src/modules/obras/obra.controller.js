const prisma = require('../../config/prisma');

const defaultSteps = [
  {
    title: 'Planejamento da obra',
    description: 'Definir escopo, prazos, responsáveis e orçamento previsto.',
    phase: 'PLANEJAMENTO',
    order: 1
  },
  {
    title: 'Vistoria inicial',
    description: 'Registrar o estado inicial do local antes do início da obra.',
    phase: 'PLANEJAMENTO',
    order: 2
  },
  {
    title: 'Compra de materiais',
    description: 'Levantar materiais necessários e emitir ordem de compra.',
    phase: 'EXECUCAO',
    order: 3
  },
  {
    title: 'Execução dos serviços',
    description: 'Acompanhar o andamento da obra e registrar custos.',
    phase: 'EXECUCAO',
    order: 4
  },
  {
    title: 'Vistoria final',
    description: 'Conferir o resultado final e registrar a conclusão.',
    phase: 'ENTREGA',
    order: 5
  },
  {
    title: 'Entrega da obra',
    description: 'Finalizar a obra e atualizar o status.',
    phase: 'ENTREGA',
    order: 6
  }
];

async function list(req, res) {
  try {
    const { companyId } = req.user;
    const { search, status, contractId } = req.query;

    const where = {
      companyId
    };

    if (status) {
      where.status = status;
    }

    if (contractId) {
      where.contractId = contractId;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          location: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const obras = await prisma.obra.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        contract: {
          select: {
            id: true,
            title: true,
            relatedParty: true,
            status: true
          }
        },
        steps: {
          select: {
            id: true,
            title: true,
            phase: true,
            isCompleted: true,
            order: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        custos: {
          select: {
            id: true,
            amount: true,
            category: true
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            number: true,
            totalValue: true,
            status: true
          }
        }
      }
    });

    const result = obras.map((obra) => {
      const realizedBudget = obra.custos.reduce((total, custo) => {
        return total + Number(custo.amount);
      }, 0);

      const completedSteps = obra.steps.filter((step) => step.isCompleted).length;

      return {
        ...obra,
        realizedBudget,
        progress: obra.steps.length > 0
          ? Math.round((completedSteps / obra.steps.length) * 100)
          : 0
      };
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar obras.',
      error: error.message
    });
  }
}

async function show(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        contract: true,
        steps: {
          orderBy: {
            order: 'asc'
          }
        },
        vistorias: {
          include: {
            uploads: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        custos: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        purchaseOrders: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        uploads: true
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    const realizedBudget = obra.custos.reduce((total, custo) => {
      return total + Number(custo.amount);
    }, 0);

    const completedSteps = obra.steps.filter((step) => step.isCompleted).length;

    return res.json({
      ...obra,
      realizedBudget,
      progress: obra.steps.length > 0
        ? Math.round((completedSteps / obra.steps.length) * 100)
        : 0
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao buscar obra.',
      error: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { companyId } = req.user;

    const {
      contractId,
      name,
      description,
      location,
      expectedBudget,
      startDate,
      endDate
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'Nome da obra é obrigatório.'
      });
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
          message: 'Contrato não encontrado para vincular à obra.'
        });
      }

      if (contract.status === 'DRAFT' || contract.status === 'CANCELED') {
        return res.status(400).json({
          message: 'Não é possível iniciar obra para contrato em rascunho ou cancelado.'
        });
      }
    }

    const obra = await prisma.obra.create({
      data: {
        companyId,
        contractId: contractId || null,
        name,
        description: description || null,
        location: location || null,
        expectedBudget: expectedBudget || null,
        realizedBudget: 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'PLANNING',
        steps: {
          create: defaultSteps
        }
      },
      include: {
        contract: true,
        steps: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Obra',
        entityId: obra.id,
        metadata: {
          name: obra.name,
          contractId: obra.contractId
        }
      }
    });

    return res.status(201).json(obra);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar obra.',
      error: error.message
    });
  }
}

async function update(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      contractId,
      name,
      description,
      location,
      status,
      expectedBudget,
      startDate,
      endDate
    } = req.body;

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
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
          message: 'Contrato não encontrado para vincular à obra.'
        });
      }
    }

    const updatedObra = await prisma.obra.update({
      where: {
        id
      },
      data: {
        contractId: contractId !== undefined ? contractId : obra.contractId,
        name: name !== undefined ? name : obra.name,
        description: description !== undefined ? description : obra.description,
        location: location !== undefined ? location : obra.location,
        status: status !== undefined ? status : obra.status,
        expectedBudget: expectedBudget !== undefined ? expectedBudget : obra.expectedBudget,
        startDate: startDate !== undefined ? new Date(startDate) : obra.startDate,
        endDate: endDate !== undefined ? new Date(endDate) : obra.endDate
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Obra',
        entityId: updatedObra.id,
        metadata: {
          name: updatedObra.name,
          status: updatedObra.status
        }
      }
    });

    return res.json(updatedObra);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao atualizar obra.',
      error: error.message
    });
  }
}

async function remove(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    await prisma.obra.delete({
      where: {
        id
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'DELETE',
        entity: 'Obra',
        entityId: id,
        metadata: {
          name: obra.name
        }
      }
    });

    return res.json({
      message: 'Obra removida com sucesso.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao remover obra.',
      error: error.message
    });
  }
}

async function createStep(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      title,
      description,
      phase,
      order
    } = req.body;

    if (!title || !phase) {
      return res.status(400).json({
        message: 'Título e fase da etapa são obrigatórios.'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    const step = await prisma.obraStep.create({
      data: {
        obraId: obra.id,
        title,
        description: description || null,
        phase,
        order: order || 0
      }
    });

    return res.status(201).json(step);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar etapa.',
      error: error.message
    });
  }
}

async function completeStep(req, res) {
  try {
    const { companyId } = req.user;
    const { id, stepId } = req.params;

    const step = await prisma.obraStep.findFirst({
      where: {
        id: stepId,
        obraId: id,
        obra: {
          companyId
        }
      }
    });

    if (!step) {
      return res.status(404).json({
        message: 'Etapa não encontrada.'
      });
    }

    const updatedStep = await prisma.obraStep.update({
      where: {
        id: step.id
      },
      data: {
        isCompleted: true,
        completedAt: new Date()
      }
    });

    return res.json(updatedStep);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao concluir etapa.',
      error: error.message
    });
  }
}

async function createCost(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      description,
      category,
      amount,
      paidAt
    } = req.body;

    if (!description || !category || !amount) {
      return res.status(400).json({
        message: 'Descrição, categoria e valor são obrigatórios.'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    const cost = await prisma.obraCusto.create({
      data: {
        obraId: obra.id,
        description,
        category,
        amount,
        paidAt: paidAt ? new Date(paidAt) : null
      }
    });

    const totalCosts = await prisma.obraCusto.aggregate({
      where: {
        obraId: obra.id
      },
      _sum: {
        amount: true
      }
    });

    await prisma.obra.update({
      where: {
        id: obra.id
      },
      data: {
        realizedBudget: totalCosts._sum.amount || 0
      }
    });

    return res.status(201).json(cost);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao lançar custo.',
      error: error.message
    });
  }
}

async function createVistoria(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      type,
      description,
      performedAt
    } = req.body;

    if (!type) {
      return res.status(400).json({
        message: 'Tipo da vistoria é obrigatório.'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
    }

    const vistoria = await prisma.obraVistoria.create({
      data: {
        obraId: obra.id,
        type,
        description: description || null,
        performedAt: performedAt ? new Date(performedAt) : new Date()
      }
    });

    return res.status(201).json(vistoria);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar vistoria.',
      error: error.message
    });
  }
}

async function createPurchaseOrder(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      number,
      payerCnpj,
      supplier,
      description,
      totalValue,
      status,
      issuedAt
    } = req.body;

    if (!number || !payerCnpj || !totalValue) {
      return res.status(400).json({
        message: 'Número, CNPJ pagador e valor total são obrigatórios.'
      });
    }

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!obra) {
      return res.status(404).json({
        message: 'Obra não encontrada.'
      });
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
        obraId: obra.id,
        contractId: obra.contractId || null,
        number,
        payerCnpj,
        supplier: supplier || null,
        description: description || null,
        totalValue,
        status: status || 'DRAFT',
        issuedAt: issuedAt ? new Date(issuedAt) : null
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
          obraId: obra.id,
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

module.exports = {
  list,
  show,
  create,
  update,
  remove,
  createStep,
  completeStep,
  createCost,
  createVistoria,
  createPurchaseOrder
};