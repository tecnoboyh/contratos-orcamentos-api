const { Router } = require('express');
const contractController = require('./contract.controller');

const routes = Router();

routes.get('/', contractController.list);
routes.post('/', contractController.create);

module.exports = routes;