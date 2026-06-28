import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";
const ARKO_APP_URL = `${API_BASE}/arko_app`;

export const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('arko_token', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('arko_token');
  }
};

export const loadTokenFromStorage = () => {
  const token = localStorage.getItem('arko_token');
  if (token) {
    setAuthToken(token);
    return token;
  }
  return null;
};

export const apiLogin = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  
  const response = await axios.post(`${ARKO_APP_URL}/auth/login`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data; // { access_token, user }
};

export const apiRegister = async (fullName, email, password) => {
  const response = await axios.post(`${ARKO_APP_URL}/auth/register`, {
    full_name: fullName,
    email: email,
    password: password
  });
  return response.data;
};

export const getProjects = async () => {
  const response = await axios.get(`${ARKO_APP_URL}/projects`);
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await axios.post(`${ARKO_APP_URL}/projects`, projectData);
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await axios.put(`${ARKO_APP_URL}/projects/${id}`, projectData);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await axios.delete(`${ARKO_APP_URL}/projects/${id}`);
  return response.data;
};
