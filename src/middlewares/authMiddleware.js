const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não informado.'
    });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({
      message: 'Token inválido.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let companyId = req.headers['x-company-id'] || decoded.companyId;

    const member = await prisma.companyMember.findFirst({
      where: {
        userId: decoded.id,
        companyId
      }
    });

    if (!member) {
      return res.status(403).json({
        message: 'Usuário sem acesso a esta empresa.'
      });
    }

    req.user = {
      id: decoded.id,
      companyId,
      role: decoded.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token expirado ou inválido.'
    });
  }
}

module.exports = authMiddleware;