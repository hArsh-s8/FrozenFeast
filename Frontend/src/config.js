export const API_BASE_URL = (() => {
    // If running in browser on localhost or 127.0.0.1, prioritize local backend for development
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:4000';
    }

    if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
        return process.env.REACT_APP_API_URL.replace(/\/+$/, '');
    }

    return 'https://frozenfeast.onrender.com';
})();

export const API_VERSION_URL = `${API_BASE_URL}/api/v1`;
