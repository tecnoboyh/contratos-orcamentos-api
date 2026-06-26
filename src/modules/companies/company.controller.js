const prisma = require('../../config/prisma');

async function list(req, res) {
  try {
    const { id: userId } = req.user;

    const companies = await prisma.company.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json(companies);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao listar empresas.',
      error: error.message
    });
  }
}

async function create(req, res) {
  try {
    const { id: userId } = req.user;
    const { name, cnpj, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'Nome da empresa é obrigatório.'
      });
    }

    if (cnpj) {
      const companyAlreadyExists = await prisma.company.findUnique({
        where: {
          cnpj
        }
      });

      if (companyAlreadyExists) {
        return res.status(400).json({
          message: 'Já existe uma empresa cadastrada com este CNPJ.'
        });
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        cnpj: cnpj || null,
        email: email || null,
        phone: phone || null,
        members: {
          create: {
            userId,
            role: 'OWNER'
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        metadata: {
          name: company.name,
          cnpj: company.cnpj
        }
      }
    });

    return res.status(201).json(company);
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao criar empresa.',
      error: error.message
    });
  }
}

module.exports = {
  list,
  create
};