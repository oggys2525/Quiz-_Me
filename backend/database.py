import sqlite3
import os
import hashlib
import json
import shutil

# If running on Vercel, copy the pre-seeded database to /tmp to make it writable
if os.environ.get('VERCEL'):
    DB_FILE = '/tmp/database.db'
    original_db = os.path.join(os.path.dirname(__file__), 'database.db')
    if not os.path.exists(DB_FILE) and os.path.exists(original_db):
        try:
            shutil.copy2(original_db, DB_FILE)
            os.chmod(DB_FILE, 0o666)
        except Exception as e:
            print(f"Error copying database to /tmp: {e}")
else:
    DB_FILE = os.path.join(os.path.dirname(__file__), 'database.db')

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force=False):
    print(f"Initializing database at: {DB_FILE}")
    conn = get_db_connection()
    cursor = conn.cursor()

    # Drop existing tables if forcing a reset (used when updating seeds)
    if force:
        print("Forcing reset: Dropping old tables...")
        cursor.execute("DROP TABLE IF EXISTS words")
        cursor.execute("DROP TABLE IF EXISTS lessons")
        cursor.execute("DROP TABLE IF EXISTS users")

    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Create Users Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        points INTEGER NOT NULL DEFAULT 0
    )
    ''')

    # 2. Create Lessons Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE NOT NULL,
        description TEXT
    )
    ''')

    # 3. Create Words Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lesson_id INTEGER NOT NULL,
        chinese TEXT NOT NULL,
        pinyin TEXT NOT NULL,
        english TEXT NOT NULL,
        options TEXT NOT NULL, -- JSON-encoded array of options/choices for quiz
        FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()

    # Seed Default Data
    seed_data(conn)
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # Check if admin user exists, if not create
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_pass = hash_password("admin123")
        cursor.execute("INSERT INTO users (username, password, role, points) VALUES (?, ?, ?, ?)",
                       ("admin", admin_pass, "admin", 0))

    # Check if standard user exists
    cursor.execute("SELECT * FROM users WHERE username = 'user'")
    if not cursor.fetchone():
        user_pass = hash_password("user123")
        cursor.execute("INSERT INTO users (username, password, role, points) VALUES (?, ?, ?, ?)",
                       ("user", user_pass, "user", 100))

    # Check if lessons exist, if not create default lessons
    cursor.execute("SELECT COUNT(*) FROM lessons")
    if cursor.fetchone()[0] == 0:
        # Insert Lessons
        lessons_data = [
            ("Greetings (问候)", "Learn basic Chinese greetings like Hello, Goodbye, and Thank you."),
            ("Numbers (数字)", "Learn to count from 1 to 10 in Chinese characters and Pinyin."),
            ("Food & Drink (饮食)", "Essential vocabulary for ordering and talking about food."),
            ("Fruits (水果)", "Common Chinese terms for delicious fruits."),
            ("Sports (运动)", "Vocabulary about sports, exercises, and physical activities."),
            ("Colors (颜色)", "Basic colors and shades in Chinese characters and pinyin."),
            ("Animals (动物)", "Learn how to say common pets and wild animals in Chinese.")
        ]
        
        cursor.executemany("INSERT INTO lessons (title, description) VALUES (?, ?)", lessons_data)
        conn.commit()

        # Get Lesson IDs
        cursor.execute("SELECT id, title FROM lessons")
        lessons_map = {row['title']: row['id'] for row in cursor.fetchall()}

        # Insert Words for Lesson 1: Greetings
        greetings_id = lessons_map["Greetings (问候)"]
        greetings_words = [
            (greetings_id, "你好", "nǐ hǎo", "hello", json.dumps(["hello", "goodbye", "thank you", "sorry"])),
            (greetings_id, "谢谢", "xièxie", "thank you", json.dumps(["thank you", "hello", "please", "excuse me"])),
            (greetings_id, "再见", "zàijiàn", "goodbye", json.dumps(["goodbye", "good morning", "welcome", "see you tomorrow"])),
            (greetings_id, "对不起", "duìbuqǐ", "sorry", json.dumps(["sorry", "hello", "no problem", "excuse me"])),
            (greetings_id, "没关系", "méi guānxi", "no problem", json.dumps(["no problem", "sorry", "thank you", "my pleasure"]))
        ]
        
        # Insert Words for Lesson 2: Numbers
        numbers_id = lessons_map["Numbers (数字)"]
        numbers_words = [
            (numbers_id, "一", "yī", "one", json.dumps(["one", "two", "three", "five"])),
            (numbers_id, "二", "èr", "two", json.dumps(["two", "one", "four", "six"])),
            (numbers_id, "三", "sān", "three", json.dumps(["three", "four", "eight", "two"])),
            (numbers_id, "五", "wǔ", "five", json.dumps(["five", "nine", "zero", "seven"])),
            (numbers_id, "十", "shí", "ten", json.dumps(["ten", "one", "five", "hundred"]))
        ]

        # Insert Words for Lesson 3: Food & Drink
        food_id = lessons_map["Food & Drink (饮食)"]
        food_words = [
            (food_id, "米饭", "mǐfàn", "cooked rice", json.dumps(["cooked rice", "noodles", "bread", "water"])),
            (food_id, "面条", "miàntiáo", "noodles", json.dumps(["noodles", "rice", "dumplings", "tea"])),
            (food_id, "水", "shuǐ", "water", json.dumps(["water", "milk", "tea", "coffee"])),
            (food_id, "茶", "chá", "tea", json.dumps(["tea", "water", "juice", "beer"])),
            (food_id, "苹果", "píngguǒ", "apple", json.dumps(["apple", "banana", "orange", "grape"]))
        ]

        # Insert Words for Lesson 4: Fruits (水果)
        fruits_id = lessons_map["Fruits (水果)"]
        fruits_words = [
            (fruits_id, "苹果", "píngguǒ", "apple", json.dumps(["apple", "banana", "orange", "grape"])),
            (fruits_id, "香蕉", "xiāngjiāo", "banana", json.dumps(["banana", "apple", "mango", "pear"])),
            (fruits_id, "西瓜", "xīguā", "watermelon", json.dumps(["watermelon", "melon", "papaya", "pineapple"])),
            (fruits_id, "葡萄", "pútáo", "grape", json.dumps(["grape", "cherry", "peach", "strawberry"])),
            (fruits_id, "草莓", "cǎoméi", "strawberry", json.dumps(["strawberry", "lemon", "blueberry", "raspberry"])),
            (fruits_id, "橙子", "chéngzi", "orange", json.dumps(["orange", "lemon", "apple", "lime"]))
        ]

        # Insert Words for Lesson 5: Sports (运动)
        sports_id = lessons_map["Sports (运动)"]
        sports_words = [
            (sports_id, "足球", "zúqiú", "soccer", json.dumps(["soccer", "basketball", "tennis", "swimming"])),
            (sports_id, "篮球", "lánqiú", "basketball", json.dumps(["basketball", "soccer", "baseball", "volleyball"])),
            (sports_id, "跑步", "pǎobù", "running", json.dumps(["running", "walking", "jumping", "swimming"])),
            (sports_id, "游泳", "yóuyǒng", "swimming", json.dumps(["swimming", "diving", "running", "rowing"])),
            (sports_id, "网球", "wǎngqiú", "tennis", json.dumps(["tennis", "badminton", "table tennis", "golf"])),
            (sports_id, "乒乓球", "pīngpāngqiú", "table tennis", json.dumps(["table tennis", "tennis", "squash", "hockey"]))
        ]

        # Insert Words for Lesson 6: Colors (颜色)
        colors_id = lessons_map["Colors (颜色)"]
        colors_words = [
            (colors_id, "红色", "hóngsè", "red", json.dumps(["red", "blue", "green", "yellow"])),
            (colors_id, "蓝色", "lánsè", "blue", json.dumps(["blue", "red", "black", "white"])),
            (colors_id, "绿色", "lǜsè", "green", json.dumps(["green", "yellow", "orange", "purple"])),
            (colors_id, "黄色", "huángsè", "yellow", json.dumps(["yellow", "pink", "brown", "white"])),
            (colors_id, "黑色", "hēisè", "black", json.dumps(["black", "white", "gray", "red"])),
            (colors_id, "白色", "báisè", "white", json.dumps(["white", "black", "gray", "silver"]))
        ]

        # Insert Words for Lesson 7: Animals (动物)
        animals_id = lessons_map["Animals (动物)"]
        animals_words = [
            (animals_id, "猫", "māo", "cat", json.dumps(["cat", "dog", "rabbit", "lion"])),
            (animals_id, "狗", "gǒu", "dog", json.dumps(["dog", "cat", "wolf", "fox"])),
            (animals_id, "熊猫", "xióngmāo", "panda", json.dumps(["panda", "bear", "koala", "tiger"])),
            (animals_id, "鸟", "niǎo", "bird", json.dumps(["bird", "fish", "butterfly", "bee"])),
            (animals_id, "鱼", "yú", "fish", json.dumps(["fish", "shark", "frog", "turtle"])),
            (animals_id, "兔子", "tùzi", "rabbit", json.dumps(["rabbit", "hamster", "squirrel", "deer"]))
        ]

        all_words = greetings_words + numbers_words + food_words + fruits_words + sports_words + colors_words + animals_words
        cursor.executemany("INSERT INTO words (lesson_id, chinese, pinyin, english, options) VALUES (?, ?, ?, ?, ?)", all_words)
        conn.commit()

    print("Database seeding completed.")

if __name__ == '__main__':
    # When run directly, we force a database reset to refresh the seeds
    init_db(force=True)
