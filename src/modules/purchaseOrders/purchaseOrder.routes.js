const { Router } = require('express');
const purchaseOrderController = require('./purchaseOrder.controller');

const routes = Router();

routes.get('/', purchaseOrderController.list);
routes.get('/:id', purchaseOrderController.show);
routes.post('/', purchaseOrderController.create);
routes.put('/:id', purchaseOrderController.update);
routes.delete('/:id', purchaseOrderController.remove);

module.exports = routes;