const BASE_URL = 'https://mi767o4rag.execute-api.eu-north-1.amazonaws.com/api/auth';

export const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Network error. Please try again.');
  }
};

export default BASE_URL;
