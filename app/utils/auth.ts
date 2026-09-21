export interface AuthResponse {
  id: number;
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  permissions: string[];
  imageUrl: string;
}

export interface RegisterUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  farmIds?: number[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
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

export const registerUserByAdmin = async (
  userData: RegisterUserPayload | FormData,
  file?: File | null
): Promise<void> => {
  let body: BodyInit;

  if (userData instanceof FormData) {
    body = userData;
  } else {
    const formData = new FormData();
    formData.append(
      "user",
      new Blob([JSON.stringify(userData)], { type: "application/json" })
    );

    if (file) {
      formData.append("file", file);
    }
    body = formData;
  }

  const response = await fetchWithAuth("/api/auth/register", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(errorData.message || "Failed to register user");
  }
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

  // FORCE REMOVAL of Content-Type for FormData so browser auto-generates the multipart boundary
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
  } else if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  options.headers = headers;

  let response = await fetch(fullUrl, options);

  if (response.status === 401) {
    try {
      authData = await refreshTokens();
      headers.set("Authorization", `Bearer ${authData.accessToken}`);

      if (options.body instanceof FormData) {
        headers.delete("Content-Type");
      }

      options.headers = headers;

      response = await fetch(fullUrl, options);
    } catch (refreshError) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
};