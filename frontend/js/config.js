// Configuration file for the Quiz Me frontend
const CONFIG = {
    API_URL: (() => {
        const isLocal = 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.protocol === 'file:' ||
            window.location.hostname.startsWith('192.168.') ||
            window.location.hostname.startsWith('10.') ||
            window.location.hostname.startsWith('172.');
            
        if (isLocal) {
            const host = window.location.hostname || '127.0.0.1';
            return `http://${host}:5000/api`;
        }
        return window.location.origin + '/api';
    })()
};
export default CONFIG;
