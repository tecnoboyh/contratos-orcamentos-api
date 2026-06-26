const { Router } = require('express');
const authController = require('./auth.controller');

const routes = Router();

routes.post('/register', authController.register);
routes.post('/login', authController.login);

module.exports = routes;