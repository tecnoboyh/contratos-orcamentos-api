const { Router } = require('express');
const signatureController = require('./signature.controller');

const routes = Router();

routes.get('/:id/view', signatureController.view);
routes.post('/:id/sign', signatureController.sign);

module.exports = routes;