const prisma = require('../../config/prisma');

function toNumber(value) {
  return Number(value || 0);
}

function calculateProgress(steps) {
  if (!steps || steps.length === 0) {
    return 0;
  }

  const completed = steps.filter((step) => step.isCompleted).length;

  return Math.round((completed / steps.length) * 100);
}

function calculateBudgetStatus(expectedBudget, realizedBudget) {
  const expected = toNumber(expectedBudget);
  const realized = toNumber(realizedBudget);

  if (expected <= 0) {
    return {
      status: 'WITHOUT_BUDGET',
      label: 'Sem orçamento previsto',
      usagePercent: 0,
      difference: 0
    };
  }

  const usagePercent = Math.round((realized / expected) * 100);
  const difference = expected - realized;

  if (realized > expected) {
    return {
      status: 'OVER_BUDGET',
      label: 'Acima do orçamento',
      usagePercent,
      difference
    };
  }

  if (usagePercent >= 90) {
    return {
      status: 'NEAR_LIMIT',
      label: 'Próximo do limite',
      usagePercent,
      difference
    };
  }

  return {
    status: 'ON_TRACK',
    label: 'Dentro do orçamento',
    usagePercent,
    difference
  };
}

async function listObraReports(req, res) {
  try {
    const { companyId } = req.user;
    const { search, status } = req.query;

    const where = {
      companyId
    };

    if (status) {
      where.status = status;
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
            isCompleted: true
          }
        },
        custos: {
          select: {
            id: true,
            amount: true
          }
        },
        vistorias: {
          select: {
            id: true,
            type: true
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            totalValue: true,
            status: true
          }
        }
      }
    });

    const reports = obras.map((obra) => {
      const realizedBudget = obra.custos.reduce((total, custo) => {
        return total + toNumber(custo.amount);
      }, 0);

      const purchaseOrdersValue = obra.purchaseOrders.reduce((total, order) => {
        return total + toNumber(order.totalValue);
      }, 0);

      const progress = calculateProgress(obra.steps);
      const budget = calculateBudgetStatus(obra.expectedBudget, realizedBudget);

      return {
        id: obra.id,
        name: obra.name,
        status: obra.status,
        location: obra.location,
        contract: obra.contract,
        startDate: obra.startDate,
        endDate: obra.endDate,
        progress,
        expectedBudget: toNumber(obra.expectedBudget),
        realizedBudget,
        budget,
        totals: {
          steps: obra.steps.length,
          completedSteps: obra.steps.filter((step) => step.isCompleted).length,
          costs: obra.custos.length,
          vistorias: obra.vistorias.length,
          purchaseOrders: obra.purchaseOrders.length,
          purchaseOrdersValue
        }
      };
    });

    return res.json(reports);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar relatórios de obras.',
      error: error.message
    });
  }
}

async function generateObraReport(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const obra = await prisma.obra.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            email: true,
            phone: true
          }
        },
        contract: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            relatedParty: true,
            documentNumber: true,
            totalValue: true,
            monthlyValue: true,
            startDate: true,
            endDate: true
          }
        },
        steps: {
          orderBy: {
            order: 'asc'
          }
        },
        custos: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        vistorias: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            uploads: true
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
      return total + toNumber(custo.amount);
    }, 0);

    const purchaseOrdersValue = obra.purchaseOrders.reduce((total, order) => {
      return total + toNumber(order.totalValue);
    }, 0);

    const progress = calculateProgress(obra.steps);
    const budget = calculateBudgetStatus(obra.expectedBudget, realizedBudget);

    const initialInspection = obra.vistorias.find((vistoria) => {
      return vistoria.type === 'INITIAL';
    });

    const finalInspection = obra.vistorias.find((vistoria) => {
      return vistoria.type === 'FINAL';
    });

    const costsByCategory = obra.custos.reduce((acc, cost) => {
      const category = cost.category;

      if (!acc[category]) {
        acc[category] = {
          category,
          total: 0,
          items: 0
        };
      }

      acc[category].total += toNumber(cost.amount);
      acc[category].items += 1;

      return acc;
    }, {});

    const purchaseOrdersByStatus = obra.purchaseOrders.reduce((acc, order) => {
      const status = order.status;

      acc[status] = (acc[status] || 0) + 1;

      return acc;
    }, {});

    const report = {
      generatedAt: new Date(),
      company: obra.company,

      obra: {
        id: obra.id,
        name: obra.name,
        description: obra.description,
        location: obra.location,
        status: obra.status,
        startDate: obra.startDate,
        endDate: obra.endDate,
        expectedBudget: toNumber(obra.expectedBudget),
        realizedBudget,
        progress
      },

      contract: obra.contract,

      summary: {
        progress,
        expectedBudget: toNumber(obra.expectedBudget),
        realizedBudget,
        budget,
        totalCosts: obra.custos.length,
        totalVistorias: obra.vistorias.length,
        totalPurchaseOrders: obra.purchaseOrders.length,
        purchaseOrdersValue,
        hasInitialInspection: Boolean(initialInspection),
        hasFinalInspection: Boolean(finalInspection)
      },

      steps: obra.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        phase: step.phase,
        isCompleted: step.isCompleted,
        completedAt: step.completedAt,
        order: step.order
      })),

      costs: {
        total: realizedBudget,
        byCategory: Object.values(costsByCategory),
        items: obra.custos.map((cost) => ({
          id: cost.id,
          description: cost.description,
          category: cost.category,
          amount: toNumber(cost.amount),
          paidAt: cost.paidAt,
          createdAt: cost.createdAt
        }))
      },

      vistorias: {
        initial: initialInspection || null,
        final: finalInspection || null,
        items: obra.vistorias
      },

      purchaseOrders: {
        total: obra.purchaseOrders.length,
        totalValue: purchaseOrdersValue,
        byStatus: purchaseOrdersByStatus,
        items: obra.purchaseOrders.map((order) => ({
          id: order.id,
          number: order.number,
          payerCnpj: order.payerCnpj,
          supplier: order.supplier,
          description: order.description,
          totalValue: toNumber(order.totalValue),
          status: order.status,
          issuedAt: order.issuedAt,
          createdAt: order.createdAt
        }))
      },

      uploads: obra.uploads
    };

    await prisma.auditLog.create({
      data: {
        companyId,
        userId: req.user.id,
        action: 'GENERATE',
        entity: 'ObraReport',
        entityId: obra.id,
        metadata: {
          obraName: obra.name
        }
      }
    });

    return res.json(report);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao gerar relatório da obra.',
      error: error.message
    });
  }
}

module.exports = {
  listObraReports,
  generateObraReport
};