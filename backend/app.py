from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
try:
    from database import get_db_connection, hash_password, init_db
except ImportError:
    from .database import get_db_connection, hash_password, init_db

app = Flask(__name__)
# Enable CORS for all routes so frontend can communicate with backend
CORS(app)

# Helper function to check if requester is admin
def is_admin(req):
    role = req.headers.get('X-User-Role')
    return role == 'admin'

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters long'}), 400
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters long'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        hashed_pw = hash_password(password)
        # Check if first user, if so make admin, else user
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        role = 'admin' if user_count == 0 else 'user'
        
        cursor.execute("INSERT INTO users (username, password, role, points) VALUES (?, ?, ?, ?)",
                       (username, hashed_pw, role, 0))
        conn.commit()
        
        # Fetch the newly created user
        cursor.execute("SELECT id, username, role, points FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'points': user['points']
            }
        }), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, username, password, role, points FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and user['password'] == hash_password(password):
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'points': user['points']
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lessons")
    lessons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(lessons), 200

@app.route('/api/lessons', methods=['POST'])
def create_lesson():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    
    data = request.json
    if not data or not data.get('title'):
        return jsonify({'error': 'Lesson title is required'}), 400
        
    title = data['title'].strip()
    description = data.get('description', '').strip()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO lessons (title, description) VALUES (?, ?)", (title, description))
        conn.commit()
        lesson_id = cursor.lastrowid
        return jsonify({'id': lesson_id, 'title': title, 'description': description}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Lesson title already exists'}), 400
    finally:
        conn.close()

@app.route('/api/lessons/<int:lesson_id>', methods=['DELETE'])
def delete_lesson(lesson_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    # Enable foreign keys so cascading delete works
    cursor.execute("PRAGMA foreign_keys = ON;")
    cursor.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Lesson deleted successfully'}), 200

@app.route('/api/lessons/<int:lesson_id>/words', methods=['GET'])
def get_lesson_words(lesson_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM words WHERE lesson_id = ?", (lesson_id,))
    words = []
    for row in cursor.fetchall():
        word = dict(row)
        # Parse JSON-encoded options
        try:
            word['options'] = json.loads(word['options'])
        except Exception:
            word['options'] = [word['english']] # Fallback
        words.append(word)
    conn.close()
    return jsonify(words), 200

@app.route('/api/words', methods=['POST'])
def create_word():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
    data = request.json
    required_fields = ['lesson_id', 'chinese', 'pinyin', 'english', 'options']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'error': 'Missing required fields: lesson_id, chinese, pinyin, english, options'}), 400
        
    lesson_id = data['lesson_id']
    chinese = data['chinese'].strip()
    pinyin = data['pinyin'].strip()
    english = data['english'].strip()
    options = data['options'] # Expect list
    
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({'error': 'Options must be a list with at least 2 choices'}), 400
        
    # Standardize options to include english correct choice if not present, and strip spaces
    options = [o.strip() for o in options if o.strip()]
    if english not in options:
        options.append(english)
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO words (lesson_id, chinese, pinyin, english, options) VALUES (?, ?, ?, ?, ?)",
                       (lesson_id, chinese, pinyin, english, json.dumps(options)))
        conn.commit()
        word_id = cursor.lastrowid
        return jsonify({
            'id': word_id,
            'lesson_id': lesson_id,
            'chinese': chinese,
            'pinyin': pinyin,
            'english': english,
            'options': options
        }), 201
    except sqlite3.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/words/<int:word_id>', methods=['DELETE'])
def delete_word(word_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM words WHERE id = ?", (word_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Word deleted successfully'}), 200

@app.route('/api/users/<int:user_id>/points', methods=['POST'])
def update_points(user_id):
    data = request.json
    if not data or 'points' not in data:
        return jsonify({'error': 'Points value is required'}), 400
        
    points_to_add = int(data['points'])
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT points FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
        
    new_points = max(0, user['points'] + points_to_add)
    cursor.execute("UPDATE users SET points = ? WHERE id = ?", (new_points, user_id))
    conn.commit()
    
    # Fetch updated user points
    cursor.execute("SELECT id, username, role, points FROM users WHERE id = ?", (user_id,))
    updated_user = cursor.fetchone()
    conn.close()
    
    return jsonify({
        'message': 'Points updated successfully',
        'user': {
            'id': updated_user['id'],
            'username': updated_user['username'],
            'role': updated_user['role'],
            'points': updated_user['points']
        }
    }), 200

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role, points FROM users ORDER BY points DESC LIMIT 10")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users), 200

if __name__ == '__main__':
    # Initialize the database just in case
    init_db()
    # Run the server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
