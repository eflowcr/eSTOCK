import { HttpHeaders } from '@angular/common/http';

export const getBearerToken = () => {
  const localToken = localStorage.getItem('auth_estock');
  if (!localToken) return null;
  
  try {
    const authData = JSON.parse(localToken);
    return authData.token || authData.access_token;
  } catch (error) {
    console.error('Error parsing auth token:', error);
    return null;
  }
};

export const requestHeaders = () => {
  const token = getBearerToken();
  
  const headers: any = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const httpOptions = {
    headers: new HttpHeaders(headers),
  };
  
  return httpOptions;
};

export const mediaRequestHeaders = () => {
  const token = getBearerToken();
  
  const headers: any = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const httpOptions = {
    headers: new HttpHeaders(headers),
  };
  
  return httpOptions;
};
