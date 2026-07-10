const API_BASE_URL = 'http://localhost:8080/api/auth';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
}

export const authStorage = {
  setTokens: (response: AuthResponse) => {
    localStorage.setItem('access_token', response.accessToken);
    localStorage.setItem('refresh_token', response.refreshToken);
    localStorage.setItem('username', response.username);
    localStorage.setItem('user_role', response.role);
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
  },
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  getUsername: () => localStorage.getItem('username'),
  getUserRole: () => localStorage.getItem('user_role'),
};

// Generic fetch wrapper with automatic token refresh logic
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = authStorage.getAccessToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  let response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  // If unauthorized, attempt to handle dual-token refresh
  if (response.status === 401) {
    const refreshToken = authStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens: AuthResponse = await refreshRes.json();
          authStorage.setTokens(newTokens);

          // Retry the original request with new token
          headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
          response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        } else {
          authStorage.clearTokens();
          window.location.href = '/login';
        }
      } catch (err) {
        authStorage.clearTokens();
        window.location.href = '/login';
      }
    }
  }

  return response;
}