async function list(req, res) {
  return res.json({
    message: 'Listagem de obras'
  });
}

async function create(req, res) {
  return res.json({
    message: 'Obra criada'
  });
}

module.exports = {
  list,
  create
};