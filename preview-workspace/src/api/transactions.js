import Cookies from 'js-cookie';

const BASE_URL = 'https://mi767o4rag.execute-api.eu-north-1.amazonaws.com/api';

export const getTransactions = async (filters = {}) => {
  try {
    const token = Cookies.get('jwt_token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const queryParams = new URLSearchParams();
    if (filters.name) queryParams.append('name', filters.name);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.sort) queryParams.append('sort', filters.sort);

    const url = `${BASE_URL}/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch transactions');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Network error. Please try again.');
  }
};

export default BASE_URL;
