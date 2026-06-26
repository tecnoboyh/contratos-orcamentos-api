const { Router } = require('express');

const authMiddleware = require('./middlewares/authMiddleware');

const authRoutes = require('./modules/auth/auth.routes');
const companyRoutes = require('./modules/companies/company.routes');
const contractRoutes = require('./modules/contracts/contract.routes');
const obraRoutes = require('./modules/obras/obra.routes');
const signatureRoutes = require('./modules/signatures/signature.routes');
const purchaseOrderRoutes = require('./modules/purchaseOrders/purchaseOrder.routes');

const routes = Router();

routes.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'API funcionando'
  });
});

routes.use('/auth', authRoutes);
routes.use('/signatures', signatureRoutes);

routes.use(authMiddleware);

routes.use('/companies', companyRoutes);
routes.use('/contracts', contractRoutes);
routes.use('/obras', obraRoutes);
routes.use('/purchase-orders', purchaseOrderRoutes);

module.exports = routes;