from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import uuid
import random
from werkzeug.utils import secure_filename
try:
    from database import get_db_connection, hash_password, init_db
except ImportError:
    from .database import get_db_connection, hash_password, init_db

import os

frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
uploads_dir = os.path.join(frontend_dir, 'uploads')
os.makedirs(uploads_dir, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
# Enable CORS for all routes so frontend can communicate with backend
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Helper function to check if requester is admin
def is_admin(req):
    role = req.headers.get('X-User-Role')
    return role == 'admin'

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Email, username, and password are required'}), 400
    
    email = data['email'].strip().lower()
    username = data['username'].strip().lower()
    password = data['password']
    requested_role = data.get('role', 'user').strip().lower()
    
    if requested_role not in ['admin', 'user']:
        requested_role = 'user'
    
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email address format'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters long'}), 400
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters long'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        hashed_pw = hash_password(password)
        # Check if first user, if so make admin, else use requested role
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        role = 'admin' if user_count == 0 else requested_role
        
        cursor.execute("INSERT INTO users (email, username, password, role, points) VALUES (?, ?, ?, ?, ?)",
                       (email, username, hashed_pw, role, 0))
        conn.commit()
        
        # Fetch the newly created user
        cursor.execute("SELECT id, email, username, role, points FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'role': user['role'],
                'points': user['points']
            }
        }), 201
    except sqlite3.IntegrityError as e:
        # Check which constraint failed
        error_msg = str(e)
        if 'email' in error_msg:
            return jsonify({'error': 'Email already registered'}), 400
        else:
            return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('username_or_email') or not data.get('password'):
        return jsonify({'error': 'Username/Email and password are required'}), 400
    
    login_id = data['username_or_email'].strip().lower()
    password = data['password']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, email, username, password, role, points FROM users WHERE username = ? OR email = ?", (login_id, login_id))
    user = cursor.fetchone()
    conn.close()
    
    if user and user['password'] == hash_password(password):
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'role': user['role'],
                'points': user['points']
            }
        }), 200
    else:
        return jsonify({'error': 'Invalid username/email or password'}), 401

@app.route('/api/lessons', methods=['GET'])
def get_lessons():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT l.id, l.title, l.description, l.image_url, COUNT(w.id) as word_count 
        FROM lessons l 
        LEFT JOIN words w ON l.id = w.lesson_id 
        GROUP BY l.id, l.title, l.description, l.image_url
        ORDER BY l.id ASC
    """)
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
    image_url = data.get('image_url', '').strip()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO lessons (title, description, image_url) VALUES (?, ?, ?)", (title, description, image_url))
        conn.commit()
        lesson_id = cursor.lastrowid
        return jsonify({'id': lesson_id, 'title': title, 'description': description, 'image_url': image_url}), 201
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

@app.route('/api/words', methods=['GET'])
def get_all_words():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT w.id, w.lesson_id, w.chinese, w.pinyin, w.english, w.options, l.title as lesson_title 
        FROM words w 
        LEFT JOIN lessons l ON w.lesson_id = l.id
        ORDER BY w.id ASC
    """)
    words = []
    for row in cursor.fetchall():
        word = dict(row)
        try:
            word['options'] = json.loads(word['options'])
        except Exception:
            word['options'] = [word['english']]
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

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, username, role, points FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return jsonify({
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'role': user['role'],
                'points': user['points']
            }
        }), 200
    else:
        return jsonify({'error': 'User not found'}), 404

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

@app.route('/api/users', methods=['GET'])
def get_users():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role, points FROM users ORDER BY username ASC")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users), 200

@app.route('/api/users', methods=['POST'])
def create_user():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    username = data['username'].strip()
    password = data['password']
    role = data.get('role', 'user').strip()
    
    if role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role. Must be user or admin.'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        hashed = hash_password(password)
        cursor.execute("INSERT INTO users (username, password, role, points) VALUES (?, ?, ?, 0)", (username, hashed, role))
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({'id': user_id, 'username': username, 'role': role, 'points': 0}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    data = request.json
    if not data or not data.get('username'):
        return jsonify({'error': 'Username is required'}), 400
        
    username = data['username'].strip()
    role = data.get('role', 'user').strip()
    points = data.get('points', 0)
    password = data.get('password') # Optional password change
    
    if role not in ['user', 'admin']:
        return jsonify({'error': 'Invalid role. Must be user or admin.'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if password:
            hashed = hash_password(password)
            cursor.execute("UPDATE users SET username = ?, role = ?, points = ?, password = ? WHERE id = ?", (username, role, points, hashed, user_id))
        else:
            cursor.execute("UPDATE users SET username = ?, role = ?, points = ? WHERE id = ?", (username, role, points, user_id))
        conn.commit()
        return jsonify({'message': 'User updated successfully'}), 200
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deleted successfully'}), 200

@app.route('/api/lessons/<int:lesson_id>', methods=['PUT'])
def update_lesson(lesson_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    data = request.json
    if not data or not data.get('title'):
        return jsonify({'error': 'Lesson title is required'}), 400
        
    title = data['title'].strip()
    description = data.get('description', '').strip()
    image_url = data.get('image_url', '').strip()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE lessons SET title = ?, description = ?, image_url = ? WHERE id = ?", (title, description, image_url, lesson_id))
        conn.commit()
        return jsonify({'id': lesson_id, 'title': title, 'description': description, 'image_url': image_url}), 200
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Lesson title already exists'}), 400
    finally:
        conn.close()

@app.route('/api/words/<int:word_id>', methods=['PUT'])
def update_word(word_id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    data = request.json
    if not data or not data.get('chinese') or not data.get('pinyin') or not data.get('english') or not data.get('options'):
        return jsonify({'error': 'All fields (chinese, pinyin, english, options) are required'}), 400
        
    chinese = data['chinese'].strip()
    pinyin = data['pinyin'].strip()
    english = data['english'].strip()
    options = data['options'] # list
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE words SET chinese = ?, pinyin = ?, english = ?, options = ? WHERE id = ?", 
                   (chinese, pinyin, english, json.dumps(options), word_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Word updated successfully'}), 200

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
    
    file = None
    if 'file' in request.files:
        file = request.files['file']
    elif 'image' in request.files:
        file = request.files['image']
        
    if not file or file.filename == '':
        return jsonify({'error': 'No file uploaded'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, svg'}), 400
        
    ext = file.filename.rsplit('.', 1)[1].lower()
    unique_filename = f"card_{uuid.uuid4().hex[:10]}.{ext}"
    save_path = os.path.join(uploads_dir, unique_filename)
    file.save(save_path)
    
    file_url = f"/uploads/{unique_filename}"
    return jsonify({'url': file_url, 'filename': unique_filename}), 201

@app.route('/api/words/bulk', methods=['POST'])
def bulk_create_words():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
    data = request.json
    if not data or 'lesson_id' not in data or 'words' not in data:
        return jsonify({'error': 'lesson_id and words array are required'}), 400
        
    lesson_id = int(data['lesson_id'])
    raw_words = data['words']
    if not isinstance(raw_words, list) or len(raw_words) == 0:
        return jsonify({'error': 'words must be a non-empty list'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify lesson exists
    cursor.execute("SELECT id, title FROM lessons WHERE id = ?", (lesson_id,))
    lesson = cursor.fetchone()
    if not lesson:
        conn.close()
        return jsonify({'error': 'Target lesson not found'}), 404
        
    # Fetch a pool of existing english answers for random distractor generation
    cursor.execute("SELECT english FROM words LIMIT 200")
    existing_english_pool = [row['english'] for row in cursor.fetchall() if row['english']]
    
    # Also gather english from the current batch
    batch_english_pool = [str(w.get('english', '')).strip() for w in raw_words if w.get('english')]
    combined_pool = list(set(existing_english_pool + batch_english_pool))
    
    inserted_words = []
    
    try:
        for item in raw_words:
            chinese = str(item.get('chinese', '')).strip()
            pinyin = str(item.get('pinyin', '')).strip()
            english = str(item.get('english', '')).strip()
            
            if not chinese or not english:
                continue
                
            raw_options = item.get('options', [])
            if not isinstance(raw_options, list):
                raw_options = []
            options = [str(o).strip() for o in raw_options if str(o).strip()]
            
            if english not in options:
                options.append(english)
                
            # If fewer than 4 options, auto-generate distractors from pool
            if len(options) < 4:
                distractor_candidates = [ans for ans in combined_pool if ans != english and ans not in options]
                needed = 4 - len(options)
                if len(distractor_candidates) >= needed:
                    picked = random.sample(distractor_candidates, needed)
                else:
                    picked = distractor_candidates[:]
                    fallbacks = ['Yes', 'No', 'Good', 'Water', 'Friend', 'Book', 'Go']
                    for fb in fallbacks:
                        if len(picked) >= needed:
                            break
                        if fb != english and fb not in options and fb not in picked:
                            picked.append(fb)
                options.extend(picked)
                
            random.shuffle(options)
            
            cursor.execute(
                "INSERT INTO words (lesson_id, chinese, pinyin, english, options) VALUES (?, ?, ?, ?, ?)",
                (lesson_id, chinese, pinyin, english, json.dumps(options))
            )
            inserted_words.append({
                'id': cursor.lastrowid,
                'lesson_id': lesson_id,
                'chinese': chinese,
                'pinyin': pinyin,
                'english': english,
                'options': options
            })
            
        conn.commit()
        return jsonify({
            'message': f"Successfully added {len(inserted_words)} words to '{lesson['title']}'",
            'count': len(inserted_words),
            'words': inserted_words
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    # Initialize the database just in case
    init_db()
    # Run the server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
