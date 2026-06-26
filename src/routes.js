const { Router } = require('express');

const authMiddleware = require('./middlewares/authMiddleware');

const authRoutes = require('./modules/auth/auth.routes');
const companyRoutes = require('./modules/companies/company.routes');
const contractRoutes = require('./modules/contracts/contract.routes');
const obraRoutes = require('./modules/obras/obra.routes');

const routes = Router();

routes.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'API funcionando'
  });
});

routes.use('/auth', authRoutes);

routes.use(authMiddleware);

routes.use('/companies', companyRoutes);
routes.use('/contracts', contractRoutes);
routes.use('/obras', obraRoutes);

module.exports = routes;