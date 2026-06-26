import { create } from 'zustand';

const storageKey = '@contratos:auth';

const storedAuth = localStorage.getItem(storageKey);
const parsedAuth = storedAuth ? JSON.parse(storedAuth) : null;

export const useAuthStore = create((set) => ({
  user: parsedAuth?.user || null,
  company: parsedAuth?.company || null,
  token: parsedAuth?.token || null,

  signIn: ({ user, company, token }) => {
    const data = {
      user,
      company,
      token
    };

    localStorage.setItem(storageKey, JSON.stringify(data));

    set({
      user,
      company,
      token
    });
  },

  setCompany: (company) => {
    const storedAuth = localStorage.getItem(storageKey);
    const parsedAuth = storedAuth ? JSON.parse(storedAuth) : {};

    const data = {
      ...parsedAuth,
      company
    };

    localStorage.setItem(storageKey, JSON.stringify(data));

    set({
      company
    });
  },

  signOut: () => {
    localStorage.removeItem(storageKey);

    set({
      user: null,
      company: null,
      token: null
    });
  }
}));