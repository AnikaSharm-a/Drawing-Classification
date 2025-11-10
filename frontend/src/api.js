export const BACKEND_URL = "https://drawing-classification.onrender.com"; // "http://127.0.0.1:8000"

export async function apiFetch(path, options = {}) {
  const url = `${BACKEND_URL}${path}`;
  const response = await fetch(url, options);
  return response;
}
