const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
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

    req.user = {
      id: decoded.id,
      companyId: decoded.companyId,
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