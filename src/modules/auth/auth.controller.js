async function register(req, res) {
  return res.json({
    message: 'Cadastro de usuário'
  });
}

async function login(req, res) {
  return res.json({
    message: 'Login de usuário'
  });
}

module.exports = {
  register,
  login
};