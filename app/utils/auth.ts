export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  permissions: string[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const API_URL = `${BASE_URL}/api/auth`;

export const setAuthData = (data: AuthResponse) => {
  localStorage.setItem("token_data", JSON.stringify(data));
};

export const getAuthData = (): AuthResponse | null => {
  const data = localStorage.getItem("token_data");
  return data ? JSON.parse(data) : null;
};

export const logout = () => {
  localStorage.removeItem("token_data");
  window.location.href = "/login";
};

export const loginRequest = async (username: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  return response.json();
};

export const refreshTokens = async (): Promise<AuthResponse> => {
  const currentData = getAuthData();
  if (!currentData?.refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: currentData.refreshToken }),
  });

  if (!response.ok) {
    logout();
    throw new Error("Session expired");
  }

  const newData: AuthResponse = await response.json();
  setAuthData(newData);
  return newData;
};

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  let authData = getAuthData();

  const fullUrl = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (authData?.accessToken) {
    headers.set("Authorization", `Bearer ${authData.accessToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  options.headers = headers;

  let response = await fetch(fullUrl, options);

  if (response.status === 401) {
    try {
      authData = await refreshTokens();
      headers.set("Authorization", `Bearer ${authData.accessToken}`);
      options.headers = headers;

      response = await fetch(fullUrl, options);
    } catch (refreshError) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
};