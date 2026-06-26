const { Router } = require('express');
const obraController = require('./obra.controller');

const routes = Router();

routes.get('/', obraController.list);
routes.post('/', obraController.create);

module.exports = routes;