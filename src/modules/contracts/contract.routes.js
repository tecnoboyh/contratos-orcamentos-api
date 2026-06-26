const { Router } = require('express');
const contractController = require('./contract.controller');

const routes = Router();

routes.get('/', contractController.list);
routes.get('/:id', contractController.show);
routes.post('/', contractController.create);
routes.post('/:id/send-signature', contractController.sendSignature);
routes.put('/:id', contractController.update);
routes.delete('/:id', contractController.remove);

module.exports = routes;