const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(
  /\/+$/,
  "",
);

export const API_BASE_URL = configuredApiBaseUrl || window.location.origin;
