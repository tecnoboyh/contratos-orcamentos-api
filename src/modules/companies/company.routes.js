const { Router } = require('express');
const companyController = require('./company.controller');

const routes = Router();

routes.get('/', companyController.list);

module.exports = routes;