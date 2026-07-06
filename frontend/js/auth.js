import CONFIG from './config.js';

export function getSessionUser() {
    const userJson = localStorage.getItem('quiz_me_user');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch (e) {
        localStorage.removeItem('quiz_me_user');
        return null;
    }
}

export function saveSessionUser(user) {
    localStorage.setItem('quiz_me_user', JSON.stringify(user));
}

export function clearSessionUser() {
    localStorage.removeItem('quiz_me_user');
}

export async function login(usernameOrEmail, password) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username_or_email: usernameOrEmail, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        saveSessionUser(data.user);
        return data.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function register(email, username, password) {
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        saveSessionUser(data.user);
        return data.user;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

export async function updateSessionPoints(pointsToAdd) {
    const user = getSessionUser();
    if (!user) return null;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${user.id}/points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ points: pointsToAdd })
        });
        
        const data = await response.json();
        if (response.ok && data.user) {
            saveSessionUser(data.user);
            return data.user;
        }
    } catch (error) {
        console.error('Error updating points:', error);
    }
    return user;
}
