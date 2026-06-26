const { Router } = require('express');
const reportController = require('./report.controller');

const routes = Router();

routes.get('/obras', reportController.listObraReports);
routes.get('/obras/:id', reportController.generateObraReport);

module.exports = routes;