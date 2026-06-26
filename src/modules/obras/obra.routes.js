const { Router } = require('express');
const obraController = require('./obra.controller');

const routes = Router();

routes.get('/', obraController.list);
routes.get('/:id', obraController.show);
routes.post('/', obraController.create);
routes.put('/:id', obraController.update);
routes.delete('/:id', obraController.remove);

routes.post('/:id/steps', obraController.createStep);
routes.patch('/:id/steps/:stepId/complete', obraController.completeStep);

routes.post('/:id/custos', obraController.createCost);
routes.post('/:id/vistorias', obraController.createVistoria);

module.exports = routes;