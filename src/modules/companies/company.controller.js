async function list(req, res) {
  return res.json({
    message: 'Listagem de empresas'
  });
}

module.exports = {
  list
};