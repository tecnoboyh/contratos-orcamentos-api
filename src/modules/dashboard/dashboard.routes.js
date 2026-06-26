const { Router } = require('express');
const dashboardController = require('./dashboard.controller');

const routes = Router();

routes.get('/', dashboardController.summary);

module.exports = routes;