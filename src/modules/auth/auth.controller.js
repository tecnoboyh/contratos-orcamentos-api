const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { generateToken } = require('../../utils/jwt');

async function register(req, res) {
  try {
    const { companyName, cnpj, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        message: 'Preencha os campos obrigatórios.'
      });
    }

    const userAlreadyExists = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (userAlreadyExists) {
      return res.status(400).json({
        message: 'Este e-mail já está em uso.'
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

    const passwordHash = await bcrypt.hash(password, 8);

    const company = await prisma.company.create({
      data: {
        name: companyName,
        cnpj: cnpj || null,
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: 'ADMIN'
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = company.users[0];

    await prisma.companyMember.create({
      data: {
        companyId: company.id,
        userId: user.id,
        role: 'OWNER'
      }
    });

    const token = generateToken(user);

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company: {
        id: company.id,
        name: company.name,
        cnpj: company.cnpj
      },
      token
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao cadastrar usuário.',
      error: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Informe e-mail e senha.'
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      include: {
        company: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'E-mail ou senha inválidos.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Usuário inativo.'
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'E-mail ou senha inválidos.'
      });
    }

    const token = generateToken(user);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        cnpj: user.company.cnpj
      },
      token
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Erro ao fazer login.',
      error: error.message
    });
  }
}

module.exports = {
  register,
  login
};