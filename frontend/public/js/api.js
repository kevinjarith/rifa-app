class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'fetch',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 204) return null;

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new ApiError(
      body?.error?.message || 'Ocurrió un error inesperado',
      res.status,
      body?.error?.code,
      body?.error?.details
    );
  }
  return body;
}

const api = {
  get: (path) => apiFetch(path),
  post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
};

window.api = api;
window.ApiError = ApiError;
