async function list(req, res) {
  return res.json({
    message: 'Listagem de contratos'
  });
}

async function create(req, res) {
  return res.json({
    message: 'Contrato criado'
  });
}

module.exports = {
  list,
  create
};