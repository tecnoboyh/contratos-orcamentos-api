api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('@contratos:auth');

  if (auth) {
    const parsedAuth = JSON.parse(auth);

    if (parsedAuth?.token) {
      config.headers.Authorization = `Bearer ${parsedAuth.token}`;
    }

    if (parsedAuth?.company?.id) {
      config.headers['x-company-id'] = parsedAuth.company.id;
    }
  }

  return config;
});