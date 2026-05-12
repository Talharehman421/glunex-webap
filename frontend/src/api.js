/**
 * API base URL with no trailing slash.
 * - Empty string: same origin (unified FastAPI + React on Render) or CRA dev proxy.
 * - Set REACT_APP_API_URL only if the UI and API are on different hosts.
 */
function stripTrailingSlashes(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

const fromEnv = stripTrailingSlashes(process.env.REACT_APP_API_URL);

let API_URL = fromEnv;

if (process.env.NODE_ENV === 'production') {
  // Avoid shipping a dev-machine URL into a production build (breaks every user’s browser).
  if (/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    API_URL = '';
  }
}

export default API_URL;
