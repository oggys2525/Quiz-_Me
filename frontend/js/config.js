// Configuration file for the Quiz Me frontend
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : window.location.origin + '/api'
};
export default CONFIG;
