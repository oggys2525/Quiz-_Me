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
            ("Fruits Part 1 (水果 ភាគ ១)", "Learn Chinese terms for fruits, Part 1 (Words 1-17) with Khmer meanings."),
            ("Fruits Part 2 (水果 ភាគ ២)", "Learn Chinese terms for fruits, Part 2 (Words 18-34) with Khmer meanings."),
            ("Fruits Part 3 (水果 ភាគ ៣)", "Learn Chinese terms for fruits, Part 3 (Words 35-51) with Khmer meanings."),
            ("Fruits Part 4 (水果 ភាគ ៤)", "Learn Chinese terms for fruits, Part 4 (Words 52-67) with Khmer meanings."),
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

        # Fruits List 1 to 67
        fruits_list = [
            {"chinese": "香蕉", "pinyin": "xiāng jiāo", "khmer": "ចេក", "english": "Banana"},
            {"chinese": "帝王蕉", "pinyin": "dì wáng jiāo", "khmer": "ចេកអំបូង", "english": "Lady Finger Banana"},
            {"chinese": "西贡蕉", "pinyin": "xī gòng jiāo", "khmer": "ចេកអង្កាំ", "english": "Saigon Banana"},
            {"chinese": "苹果", "pinyin": "píng guǒ", "khmer": "ផ្លែប៉ោម", "english": "Apple"},
            {"chinese": "西瓜", "pinyin": "xī guā", "khmer": "ឪឡឹក", "english": "Watermelon"},
            {"chinese": "草莓", "pinyin": "cǎo mei", "khmer": "ផ្លែស្ត្របឺរី", "english": "Strawberry"},
            {"chinese": "橘子", "pinyin": "jú zi", "khmer": "ក្រូចពោធិ៍សាត់", "english": "Mandarin Orange"},
            {"chinese": "番石榴", "pinyin": "fān shí liú", "khmer": "ត្របែក", "english": "Guava"},
            {"chinese": "猕猴桃", "pinyin": "mí hóu táo", "khmer": "គីវី", "english": "Kiwi Fruit"},
            {"chinese": "牛油果", "pinyin": "niú yóu guǒ", "khmer": "អាវ៉ូកាដូ", "english": "Avocado"},
            {"chinese": "荔枝", "pinyin": "lì zhī", "khmer": "លីចី", "english": "Lychee"},
            {"chinese": "火龙果", "pinyin": "huǒ lóng guǒ", "khmer": "ផ្លែស្រកានាគ", "english": "Dragon Fruit"},
            {"chinese": "樱桃", "pinyin": "yīng táo", "khmer": "ផ្លែឆឺរី", "english": "Cherry"},
            {"chinese": "黑莓", "pinyin": "hēi méi", "khmer": "ប្លាក់បឺរី", "english": "Blackberry"},
            {"chinese": "红毛丹", "pinyin": "hóng máo dān", "khmer": "រំដេង (Rambutan)", "english": "Rambutan"},
            {"chinese": "椰枣", "pinyin": "yē zǎo", "khmer": "ផ្លែល្មើ", "english": "Date"},
            {"chinese": "练舞", "pinyin": "liàn wǔ", "khmer": "សាលាក់ (Salak/Snake Fruit) (តាមសៀវភៅ)", "english": "Salak (Snake Fruit)"},
            {"chinese": "木瓜", "pinyin": "mù guā", "khmer": "ល្ហុង", "english": "Papaya"},
            {"chinese": "石榴", "pinyin": "shí liú", "khmer": "ទទឹម", "english": "Pomegranate"},
            {"chinese": "菠萝蜜", "pinyin": "bō luó mì", "khmer": "ខ្នុរ", "english": "Jackfruit"},
            {"chinese": "番荔枝 / 释迦果", "pinyin": "fān lì zhī / shì jiā guǒ", "khmer": "ទៀប", "english": "Sugar Apple (Custard Apple)"},
            {"chinese": "牛奶果", "pinyin": "niú nǎi guǒ", "khmer": "ផ្លែទឹកដោះគោ", "english": "Milk Fruit / Star Apple"},
            {"chinese": "糖棕果", "pinyin": "táng zōng guǒ", "khmer": "ត្នោត", "english": "Sugar Palm Fruit"},
            {"chinese": "椰子", "pinyin": "yē zi", "khmer": "ដូង", "english": "Coconut"},
            {"chinese": "柿子", "pinyin": "shì zi", "khmer": "កាកី", "english": "Persimmon"},
            {"chinese": "桃子", "pinyin": "táo zi", "khmer": "ផ្លែប៉េស", "english": "Peach"},
            {"chinese": "桑葚", "pinyin": "sāng shèn", "khmer": "មាល់បឺរី", "english": "Mulberry"},
            {"chinese": "黄金苹果", "pinyin": "huáng jīn píng guǒ", "khmer": "ផ្លែប៉ោមមាស", "english": "Golden Apple"},
            {"chinese": "腰果", "pinyin": "yāo guǒ", "khmer": "ស្វាយចន្ទី", "english": "Cashew Apple"},
            {"chinese": "哈密果", "pinyin": "hā mì guǒ", "khmer": "ត្រសក់ស្រូវ (ផ្អែម)", "english": "Hami Melon"},
            {"chinese": "木奶果", "pinyin": "mù nǎi guǒ", "khmer": "ម៉ាហ្គោស្ទីន", "english": "Mangosteen"},
            {"chinese": "玛丽安李子", "pinyin": "mǎ lì ān lǐ zi", "khmer": "ម៉ារៀនផ្លាំ", "english": "Marian Plum"},
            {"chinese": "海枣", "pinyin": "hǎi zǎo", "khmer": "ល្មើសមុទ្រ", "english": "Sea Date"},
            {"chinese": "星星锅 / 杨桃", "pinyin": "xīng xīng guǒ / yáng táo", "khmer": "ផ្លែស្ពឺ", "english": "Star Fruit"},
            {"chinese": "蛇皮果", "pinyin": "shé pí guǒ", "khmer": "សាឡាក់ (ស្នេកហ្វ្រូត)", "english": "Snake Fruit (Salak)"},
            {"chinese": "山陀果", "pinyin": "shān tuó guǒ", "khmer": "សន្តោល", "english": "Santol"},
            {"chinese": "百香果", "pinyin": "bǎi xiāng guǒ", "khmer": "ផាសិនហ្វ្រូត", "english": "Passion Fruit"},
            {"chinese": "芒果", "pinyin": "máng guǒ", "khmer": "ស្វាយ", "english": "Mango"},
            {"chinese": "榴莲", "pinyin": "liú lián", "khmer": "ទុរេន", "english": "Durian"},
            {"chinese": "葡萄", "pinyin": "pú táo", "khmer": "ទំពាំងបាយជូរ", "english": "Grape"},
            {"chinese": "菠萝", "pinyin": "bō luó", "khmer": "ម្នាស់", "english": "Pineapple"},
            {"chinese": "人心果", "pinyin": "rén xīn guǒ", "khmer": "សាប៉ូឌីឡា", "english": "Sapodilla"},
            {"chinese": "龙贡果", "pinyin": "lóng gòng guǒ", "khmer": "ឡងកុង", "english": "Longkong (Langsat)"},
            {"chinese": "红毛榴莲", "pinyin": "hóng máo liú lián", "khmer": "ពូឡាសាន (Pulasan)", "english": "Pulasan"},
            {"chinese": "山竹", "pinyin": "shān zhú", "khmer": "មង្ឃុត", "english": "Mangosteen"},
            {"chinese": "柚子", "pinyin": "yòu zi", "khmer": "ក្រូចថ្លុង", "english": "Pomelo"},
            {"chinese": "三敛", "pinyin": "sān liǎn", "khmer": "ម្កាក់", "english": "Ceylon Olive"},
            {"chinese": "面包果", "pinyin": "miàn bāo guǒ", "khmer": "ផ្លែនំប៉័ង", "english": "Breadfruit"},
            {"chinese": "栗子", "pinyin": "lì zi", "khmer": "គ្រាប់ដើមឈែសណាត់", "english": "Chestnut"},
            {"chinese": "青莲子", "pinyin": "qīng lián zǐ", "khmer": "គ្រាប់ឈូក", "english": "Fresh Lotus Seed"},
            {"chinese": "无花果", "pinyin": "wú huā guǒ", "khmer": "ផ្លែល្វា", "english": "Fig"},
            {"chinese": "木橘", "pinyin": "mù jú", "khmer": "ក្រូច", "english": "Orange"},
            {"chinese": "山榄", "pinyin": "shān lǎn", "khmer": "អំពិលផ្អែម", "english": "Black Olive Fruit"},
            {"chinese": "诺丽果", "pinyin": "nuò lì guǒ", "khmer": "ណូនី", "english": "Noni Fruit"},
            {"chinese": "团花果", "pinyin": "tuán huā guǒ", "khmer": "មៀន", "english": "Longan"},
            {"chinese": "罗望果 / 酸豆", "pinyin": "luó wàng guǒ / suān dòu", "khmer": "អំពិលទុំ", "english": "Tamarind"},
            {"chinese": "西印度酸栗", "pinyin": "xī yìn dù suān lì", "khmer": "កន្ទួត", "english": "Otaheite Gooseberry"},
            {"chinese": "仙桃果 / 蛋黄果", "pinyin": "xiān táo guǒ / dàn huáng guǒ", "khmer": "កន្លង់ (Canistel)", "english": "Egg Fruit (Canistel)"},
            {"chinese": "木苹果", "pinyin": "mù píng guǒ", "khmer": "ម្ដិះ", "english": "Wood Apple"},
            {"chinese": "青枣", "pinyin": "qīng zǎo", "khmer": "ពុទ្រា", "english": "Green Jujube"},
            {"chinese": "六月李", "pinyin": "liù yuè lǐ", "khmer": "ផ្លែព្រូន", "english": "June Plum"},
            {"chinese": "牛蹄豆", "pinyin": "niú tí dòu", "khmer": "អំពិលបារាំង", "english": "Manila Tamarind"},
            {"chinese": "扎恩果", "pinyin": "zhā ēn guǒ", "khmer": "ជម្ពូ", "english": "Rose Apple (Wax Apple)"},
            {"chinese": "刺篱子", "pinyin": "cì lí zi", "khmer": "រ៉ាស្បឺរី", "english": "Raspberry"},
            {"chinese": "黑市", "pinyin": "hēi shì", "khmer": "បឺរីខ្មៅ", "english": "Blackcurrant"},
            {"chinese": "黑茶蔗子", "pinyin": "hēi chá páo zi", "khmer": "ផ្លែចាប៉ាង", "english": "Jaboticaba"},
            {"chinese": "龙眼", "pinyin": "lóng yǎn", "khmer": "មៀន", "english": "Longan"}
        ]

        import random
        rng = random.Random(42)
        all_answers = [f"{item['english']} ({item['khmer']})" for item in fruits_list]

        def get_fruit_words_for_range(lesson_id, items_subset):
            words = []
            for f in items_subset:
                correct_ans = f"{f['english']} ({f['khmer']})"
                # Exclude correct answer for distractors
                distractor_pool = [ans for ans in all_answers if ans != correct_ans]
                # Take 3 random options
                distractors = rng.sample(distractor_pool, 3)
                options = [correct_ans] + distractors
                rng.shuffle(options)
                words.append((lesson_id, f['chinese'], f['pinyin'], correct_ans, json.dumps(options)))
            return words

        # Get Lesson IDs for Fruits Parts
        f1_id = lessons_map["Fruits Part 1 (水果 ភាគ ១)"]
        f2_id = lessons_map["Fruits Part 2 (水果 ភាគ ២)"]
        f3_id = lessons_map["Fruits Part 3 (水果 ភាគ ៣)"]
        f4_id = lessons_map["Fruits Part 4 (水果 ភាគ ៤)"]

        fruits_part1_words = get_fruit_words_for_range(f1_id, fruits_list[0:17])
        fruits_part2_words = get_fruit_words_for_range(f2_id, fruits_list[17:34])
        fruits_part3_words = get_fruit_words_for_range(f3_id, fruits_list[34:51])
        fruits_part4_words = get_fruit_words_for_range(f4_id, fruits_list[51:67])

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

        all_words = (greetings_words + numbers_words + food_words + 
                     fruits_part1_words + fruits_part2_words + fruits_part3_words + fruits_part4_words + 
                     sports_words + colors_words + animals_words)
        cursor.executemany("INSERT INTO words (lesson_id, chinese, pinyin, english, options) VALUES (?, ?, ?, ?, ?)", all_words)
        conn.commit()

    print("Database seeding completed.")

if __name__ == '__main__':
    # When run directly, we force a database reset to refresh the seeds
    init_db(force=True)
