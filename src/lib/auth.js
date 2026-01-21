import { jwtDecode } from 'jwt-decode';

export const getTokenData = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};

export const getUserId = () => {
  const tokenData = getTokenData();
  return tokenData?.nameid || tokenData?.userId || tokenData?.sub || null;
};

export const getUserRole = () => {
  const tokenData = getTokenData();
  return tokenData?.role ||
         tokenData?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
         null;
};

export const getProducerId = () => {
  const tokenData = getTokenData();
  return tokenData?.producerId || tokenData?.ProducerId || null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
