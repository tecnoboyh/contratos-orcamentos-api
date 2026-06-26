const prisma = require('../../config/prisma');

function getContractDisplayStatus(contract) {
  if (contract.archivedAt || contract.status === 'SIGNED') {
    return 'SIGNED';
  }

  if (contract.status === 'CLOSED') {
    return 'CLOSED';
  }

  if (contract.status === 'CANCELED') {
    return 'CANCELED';
  }

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

async function summary(req, res) {
  try {
    const { companyId } = req.user;

    const [
      contracts,
      obras,
      costsSum,
      purchaseOrdersCount,
      purchaseOrdersSum
    ] = await Promise.all([
      prisma.contract.findMany({
        where: {
          companyId
        },
        select: {
          id: true,
          status: true,
          totalValue: true,
          monthlyValue: true,
          startDate: true,
          endDate: true,
          signedAt: true,
          archivedAt: true
        }
      }),

      prisma.obra.findMany({
        where: {
          companyId
        },
        select: {
          id: true,
          status: true,
          expectedBudget: true,
          realizedBudget: true
        }
      }),

      prisma.obraCusto.aggregate({
        where: {
          obra: {
            companyId
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),

      prisma.purchaseOrder.count({
        where: {
          companyId
        }
      }),

      prisma.purchaseOrder.aggregate({
        where: {
          companyId
        },
        _sum: {
          totalValue: true
        }
      })
    ]);

    const contractStatusMap = contracts.reduce((acc, contract) => {
      const status = getContractDisplayStatus(contract);

      acc[status] = (acc[status] || 0) + 1;

      return acc;
    }, {});

    const obraStatusMap = obras.reduce((acc, obra) => {
      acc[obra.status] = (acc[obra.status] || 0) + 1;

      return acc;
    }, {});

    const totalContractValue = contracts.reduce((total, contract) => {
      return total + Number(contract.totalValue || contract.monthlyValue || 0);
    }, 0);

    const expectedBudget = obras.reduce((total, obra) => {
      return total + Number(obra.expectedBudget || 0);
    }, 0);

    const realizedBudgetFromObras = obras.reduce((total, obra) => {
      return total + Number(obra.realizedBudget || 0);
    }, 0);

    const realizedBudgetFromCosts = Number(costsSum._sum.amount || 0);

    const realizedBudget =
      realizedBudgetFromCosts > 0
        ? realizedBudgetFromCosts
        : realizedBudgetFromObras;

    const budgetUsagePercent =
      expectedBudget > 0
        ? Math.round((realizedBudget / expectedBudget) * 100)
        : 0;

    const activeContracts =
      (contractStatusMap.ACTIVE || 0) +
      (contractStatusMap.EXPIRING || 0) +
      (contractStatusMap.SIGNED || 0);

    return res.json({
      contracts: {
        total: contracts.length,
        draft: contractStatusMap.DRAFT || 0,
        active: activeContracts,
        waitingSignature: contractStatusMap.WAITING_SIGNATURE || 0,
        signed: contractStatusMap.SIGNED || 0,
        expiring: contractStatusMap.EXPIRING || 0,
        expired: contractStatusMap.EXPIRED || 0,
        closed: contractStatusMap.CLOSED || 0,
        canceled: contractStatusMap.CANCELED || 0,
        totalValue: totalContractValue
      },

      obras: {
        total: obras.length,
        planning: obraStatusMap.PLANNING || 0,
        inProgress: obraStatusMap.IN_PROGRESS || 0,
        finished: obraStatusMap.FINISHED || 0,
        canceled: obraStatusMap.CANCELED || 0,
        expectedBudget,
        realizedBudget,
        budgetUsagePercent
      },

      purchaseOrders: {
        total: purchaseOrdersCount,
        totalValue: Number(purchaseOrdersSum._sum.totalValue || 0)
      },

      costs: {
        total: costsSum._count.id || 0,
        totalValue: realizedBudget
      },

      alerts: {
        contractsExpiring: contractStatusMap.EXPIRING || 0,
        contractsWaitingSignature: contractStatusMap.WAITING_SIGNATURE || 0,
        obrasInProgress: obraStatusMap.IN_PROGRESS || 0,
        budgetOverLimit: expectedBudget > 0 && realizedBudget > expectedBudget
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao carregar dashboard.',
      error: error.message
    });
  }
}

module.exports = {
  summary
};