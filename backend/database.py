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
        email TEXT UNIQUE NOT NULL,
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
        description TEXT,
        image_url TEXT
    )
    ''')

    try:
        cursor.execute("ALTER TABLE lessons ADD COLUMN image_url TEXT")
        conn.commit()
    except Exception:
        pass

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
    cursor.execute("SELECT * FROM users WHERE username = 'admin' OR email = 'admin@quiz.me'")
    if not cursor.fetchone():
        admin_pass = hash_password("admin123")
        cursor.execute("INSERT INTO users (email, username, password, role, points) VALUES (?, ?, ?, ?, ?)",
                       ("admin@quiz.me", "admin", admin_pass, "admin", 0))

    # Check if standard user exists
    cursor.execute("SELECT * FROM users WHERE username = 'user' OR email = 'user@quiz.me'")
    if not cursor.fetchone():
        user_pass = hash_password("user123")
        cursor.execute("INSERT INTO users (email, username, password, role, points) VALUES (?, ?, ?, ?, ?)",
                       ("user@quiz.me", "user", user_pass, "user", 100))

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
            ("Animals (动物)", "Learn Chinese vocabulary for 12 common animals with Khmer & English meanings."),
            ("Health & Symptoms (健康与症状)", "Learn Chinese vocabulary for health, illnesses, and symptoms with Khmer & English meanings."),
            ("HSK 1 Part 1 (HSK 1 ភាគ ១)", "Learn HSK 1 vocabulary words 1 to 26 with Khmer & English meanings."),
            ("HSK 1 Part 2 (HSK 1 ភាគ ២)", "Learn HSK 1 vocabulary words 27 to 53 with Khmer & English meanings."),
            ("HSK 1 Part 3 (HSK 1 ភាគ ៣)", "Learn HSK 1 vocabulary words 53 to 78 with Khmer & English meanings."),
            ("HSK 1 Part 4 (HSK 1 ភាគ ៤)", "Learn HSK 1 vocabulary words 79 to 104 with Khmer & English meanings."),
            ("HSK 1 Part 5 (HSK 1 ភាគ ៥)", "Learn HSK 1 vocabulary words 105 to 130 with Khmer & English meanings."),
            ("HSK 1 Part 6 (HSK 1 ភាគ ៦)", "Learn HSK 1 vocabulary words 131 to 156 with Khmer & English meanings."),
            ("HSK 2 Part 1 (HSK 2 ភាគ ១)", "Learn HSK 2 vocabulary words 157 to 182 with Khmer & English meanings."),
            ("HSK 2 Part 2 (HSK 2 ភាគ ២)", "Learn HSK 2 vocabulary words 183 to 208 with Khmer & English meanings."),
            ("HSK 2 Part 3 (HSK 2 ភាគ ៣)", "Learn HSK 2 vocabulary words 209 to 235 with Khmer & English meanings."),
            ("HSK 2 Part 4 (HSK 2 ភាគ ៤)", "Learn HSK 2 vocabulary words 236 to 260 with Khmer & English meanings."),
            ("HSK 2 Part 5 (HSK 2 ភាគ ៥)", "Learn HSK 2 vocabulary words 261 to 286 with Khmer & English meanings."),
            ("HSK 2 Part 6 (HSK 2 ភាគ ៦)", "Learn HSK 2 vocabulary words 287 to 312 with Khmer & English meanings."),
            ("HSK 2 Part 7 (HSK 2 ភាគ ៧)", "Essential HSK 2 Chinese vocabulary words with Khmer & English meanings."),
            ("HSK 3 Part 1 (HSK 3 ភាគ ១)", "Learn HSK 3 vocabulary words 313 to 338 with Khmer & English meanings."),
            ("HSK 3 Part 2 (HSK 3 ភាគ ២)", "Learn HSK 3 vocabulary words 339 to 364 with Khmer & English meanings."),
            ("HSK 3 Part 3 (HSK 3 ភាគ ៣)", "Learn HSK 3 vocabulary words 365 to 389 with Khmer & English meanings."),
            ("HSK 3 Part 4 (HSK 3 ភាគ ៤)", "Learn HSK 3 vocabulary words 390 to 414 with Khmer & English meanings."),
            ("HSK 3 Part 5 (HSK 3 ភាគ ៥)", "Learn HSK 3 vocabulary words 415 to 440 with Khmer & English meanings."),
            ("HSK 3 Part 6 (HSK 3 ភាគ ៦)", "Learn HSK 3 vocabulary words 441 to 466 with Khmer & English meanings."),
            ("HSK 3 Part 7 (HSK 3 ភាគ ៧)", "Learn HSK 3 vocabulary words 467 to 492 with Khmer & English meanings."),
            ("HSK 3 Part 8 (HSK 3 ភាគ ៨)", "Learn HSK 3 vocabulary words 493 to 518 with Khmer & English meanings."),
            ("Chinese New Year (春节)", "Learn common Chinese vocabulary, greetings, and expressions for the Chinese New Year with Khmer translations.")
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
            {"chinese": "牛油果", "pinyin": "niú yۆu guǒ", "khmer": "អាវ៉ូកាដូ", "english": "Avocado"},
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
            {"chinese": "罗望果 / 酸豆", "pinyin": "luۆ wàng guǒ / suān dòu", "khmer": "អំពិលទុំ", "english": "Tamarind"},
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

        # Insert Words for Lesson: Animals (动物)
        animals_id = lessons_map["Animals (动物)"]
        animals_list = [
            {"chinese": "老虎", "pinyin": "lǎohǔ", "khmer": "ខ្លា", "english": "Tiger"},
            {"chinese": "兔子", "pinyin": "tùzi", "khmer": "ទន្សាយ", "english": "Rabbit"},
            {"chinese": "猴子", "pinyin": "hóuzi", "khmer": "ស្វា", "english": "Monkey"},
            {"chinese": "大象", "pinyin": "dàxiàng", "khmer": "ដំរី", "english": "Elephant"},
            {"chinese": "鳄鱼", "pinyin": "èyú", "khmer": "ក្រពើ", "english": "Crocodile / Alligator"},
            {"chinese": "猫", "pinyin": "māo", "khmer": "ឆ្មា", "english": "Cat"},
            {"chinese": "羊", "pinyin": "yáng", "khmer": "ពពែ / កូនចៀម", "english": "Sheep / Goat"},
            {"chinese": "鸡", "pinyin": "jī", "khmer": "មាន់", "english": "Chicken / Rooster"},
            {"chinese": "鱼", "pinyin": "yú", "khmer": "ត្រី", "english": "Fish"},
            {"chinese": "狗", "pinyin": "gǒu", "khmer": "ឆ្កែ", "english": "Dog"},
            {"chinese": "牛", "pinyin": "niú", "khmer": "គោ", "english": "Cow / Ox"},
            {"chinese": "马", "pinyin": "mǎ", "khmer": "សេះ", "english": "Horse"}
        ]
        animals_answers = [f"{item['english']} ({item['khmer']})" for item in animals_list]
        animals_words = []
        for item in animals_list:
            correct_ans = f"{item['english']} ({item['khmer']})"
            distractor_pool = [ans for ans in animals_answers if ans != correct_ans]
            distractors = rng.sample(distractor_pool, 3)
            options = [correct_ans] + distractors
            rng.shuffle(options)
            animals_words.append((animals_id, item['chinese'], item['pinyin'], correct_ans, json.dumps(options)))

                # Insert Words for Lesson: Health & Symptoms (健康与症状)
        health_id = lessons_map["Health & Symptoms (健康与症状)"]
        health_list = [
            {"chinese": "感冒", "pinyin": "gǎnmào", "khmer": "ផ្ដាសាយ", "english": "Catch a cold / Cold"},
            {"chinese": "发烧", "pinyin": "fāshāo", "khmer": "ក្តៅខ្លួន", "english": "Fever / Have a fever"},
            {"chinese": "咳嗽", "pinyin": "késou", "khmer": "ក្អក", "english": "Cough"},
            {"chinese": "腹痛", "pinyin": "fùtòng", "khmer": "ឈឺពោះ", "english": "Stomachache / Abdominal pain"},
            {"chinese": "头晕", "pinyin": "tóuyūn", "khmer": "វិលមុខ", "english": "Dizzy / Dizziness"},
            {"chinese": "呕吐", "pinyin": "ǒutù", "khmer": "ក្អួត", "english": "Vomit / Throw up"},
            {"chinese": "牙疼", "pinyin": "yáténg", "khmer": "ឈឺធ្មេញ", "english": "Toothache"},
            {"chinese": "吃药", "pinyin": "chīyào", "khmer": "ញ៉ាំថ្នាំ", "english": "Take medicine"},
            {"chinese": "打针", "pinyin": "dǎzhēn", "khmer": "ចាក់ថ្នាំ", "english": "Injection / Take a shot"}
        ]
        health_answers = [f"{item['english']} ({item['khmer']})" for item in health_list]
        health_words = []
        for item in health_list:
            correct_ans = f"{item['english']} ({item['khmer']})"
            distractor_pool = [ans for ans in health_answers if ans != correct_ans]
            distractors = rng.sample(distractor_pool, 3)
            options = [correct_ans] + distractors
            rng.shuffle(options)
            health_words.append((health_id, item['chinese'], item['pinyin'], correct_ans, json.dumps(options)))

        # Helper function to generate word tuple list with shuffled options
        def build_words_for_list(lesson_id, item_list):
            answers = [f"{item['english']} ({item['khmer']})" for item in item_list]
            words = []
            for item in item_list:
                correct_ans = f"{item['english']} ({item['khmer']})"
                distractor_pool = [ans for ans in answers if ans != correct_ans]
                distractors = rng.sample(distractor_pool, 3)
                options = [correct_ans] + distractors
                rng.shuffle(options)
                words.append((lesson_id, item['chinese'], item['pinyin'], correct_ans, json.dumps(options)))
            return words

        # HSK 1 Part 1 (Words 1 to 26)
        hsk1_p1_id = lessons_map["HSK 1 Part 1 (HSK 1 ភាគ ១)"]
        hsk1_p1_list = [
            {"chinese": "你", "pinyin": "nǐ", "khmer": "អ្នក / ឯង", "english": "You"},
            {"chinese": "我", "pinyin": "wǒ", "khmer": "ខ្ញុំ", "english": "I / Me"},
            {"chinese": "您", "pinyin": "nín", "khmer": "លោក / អ្នក (គួរសម)", "english": "You (respectful)"},
            {"chinese": "的", "pinyin": "de", "khmer": "របស់", "english": "Of / 's (possessive)"},
            {"chinese": "是", "pinyin": "shì", "khmer": "គឺជា / មែន", "english": "To be (am, is, are)"},
            {"chinese": "了", "pinyin": "le", "khmer": "ហើយ", "english": "Modal particle (completed action)"},
            {"chinese": "不", "pinyin": "bù", "khmer": "ទេ / មិន", "english": "Not / No"},
            {"chinese": "他", "pinyin": "tā", "khmer": "គាត់ (ប្រុស)", "english": "He / Him"},
            {"chinese": "她", "pinyin": "tā", "khmer": "នាង (ស្រី)", "english": "She / Her"},
            {"chinese": "它", "pinyin": "tā", "khmer": "វា", "english": "It"},
            {"chinese": "我们", "pinyin": "wǒmen", "khmer": "ពួកយើង", "english": "We / Us"},
            {"chinese": "好", "pinyin": "hǎo", "khmer": "ល្អ", "english": "Good / Well"},
            {"chinese": "有", "pinyin": "yǒu", "khmer": "មាន", "english": "Have / Possess"},
            {"chinese": "没有", "pinyin": "méiyǒu", "khmer": "គ្មាន / មិនមាន", "english": "Do not have"},
            {"chinese": "这", "pinyin": "zhè", "khmer": "នេះ", "english": "This"},
            {"chinese": "那", "pinyin": "nà", "khmer": "នោះ", "english": "That"},
            {"chinese": "会", "pinyin": "huì", "khmer": "ចេះ / អាច", "english": "Can / Know how to"},
            {"chinese": "吗", "pinyin": "ma", "khmer": "ទេ? (សំណួរ)", "english": "Question particle"},
            {"chinese": "什么", "pinyin": "shénme", "khmer": "អ្វី", "english": "What"},
            {"chinese": "说", "pinyin": "shuō", "khmer": "និយាយ", "english": "Speak / Say"},
            {"chinese": "想", "pinyin": "xiǎng", "khmer": "ចង់ / គិត", "english": "Want to / Think"},
            {"chinese": "很", "pinyin": "hěn", "khmer": "ណាស់ / ខ្លាំង", "english": "Very"},
            {"chinese": "人", "pinyin": "rén", "khmer": "មនុស្ស", "english": "Person / People"},
            {"chinese": "来", "pinyin": "lái", "khmer": "មក", "english": "Come"},
            {"chinese": "去", "pinyin": "qù", "khmer": "ទៅ", "english": "Go"},
            {"chinese": "都", "pinyin": "dōu", "khmer": "ទាំងអស់", "english": "All / Both"}
        ]
        hsk1_p1_words = build_words_for_list(hsk1_p1_id, hsk1_p1_list)

        # HSK 1 Part 2 (Words 27 to 53)
        hsk1_p2_id = lessons_map["HSK 1 Part 2 (HSK 1 ភាគ ២)"]
        hsk1_p2_list = [
            {"chinese": "个", "pinyin": "gè", "khmer": "ក្បាល / គ្រាប់ (ខ្នាត)", "english": "Measure word (general)"},
            {"chinese": "能", "pinyin": "néng", "khmer": "អាច", "english": "Can / Be able to"},
            {"chinese": "和", "pinyin": "hé", "khmer": "និង / ជាមួយ", "english": "And / With"},
            {"chinese": "做", "pinyin": "zuò", "khmer": "ធ្វើ", "english": "Do / Make"},
            {"chinese": "上", "pinyin": "shàng", "khmer": "លើ / ឡើង", "english": "Up / Above / On"},
            {"chinese": "下", "pinyin": "xià", "khmer": "ក្រោម / ចុះ", "english": "Down / Below"},
            {"chinese": "看", "pinyin": "kàn", "khmer": "មើល", "english": "Look / Watch / Read"},
            {"chinese": "怎么", "pinyin": "zěnme", "khmer": "យ៉ាងម៉េច / ដូចម្តេច", "english": "How?"},
            {"chinese": "怎么样", "pinyin": "zěnmeyàng", "khmer": "យ៉ាងម៉េចដែរ?", "english": "How about it? / How is it?"},
            {"chinese": "现在", "pinyin": "xiànzài", "khmer": "ឥឡូវនេះ", "english": "Now"},
            {"chinese": "点", "pinyin": "diǎn", "khmer": "ម៉ោង / ចុច", "english": "O'clock / Point"},
            {"chinese": "太", "pinyin": "tài", "khmer": "ពេក / ណាស់", "english": "Too / Extremely"},
            {"chinese": "听", "pinyin": "tīng", "khmer": "ស្ដាប់", "english": "Listen / Hear"},
            {"chinese": "里", "pinyin": "lǐ", "khmer": "ក្នុង", "english": "Inside"},
            {"chinese": "外", "pinyin": "wài", "khmer": "ក្រៅ", "english": "Outside"},
            {"chinese": "谁", "pinyin": "shéi", "khmer": "នរណា", "english": "Who / Whom"},
            {"chinese": "过来", "pinyin": "guòlái", "khmer": "មកនេះ", "english": "Come over"},
            {"chinese": "过去", "pinyin": "guòqù", "khmer": "ទៅនោះ / អតីតកាល", "english": "Go over / Past"},
            {"chinese": "时候", "pinyin": "shíhou", "khmer": "ពេល / វេលា", "english": "Time / Moment"},
            {"chinese": "谢谢", "pinyin": "xièxie", "khmer": "អរគុណ", "english": "Thank you"},
            {"chinese": "先生", "pinyin": "xiānsheng", "khmer": "លោក / ស្វាមី", "english": "Mister / Sir / Husband"},
            {"chinese": "喜欢", "pinyin": "xǐhuan", "khmer": "ចូលចិត្ត", "english": "Like"},
            {"chinese": "大", "pinyin": "dà", "khmer": "ធំ", "english": "Big / Large"},
            {"chinese": "小", "pinyin": "xiǎo", "khmer": "តូច", "english": "Small / Little"},
            {"chinese": "多", "pinyin": "duō", "khmer": "ច្រើន", "english": "Many / Much"},
            {"chinese": "少", "pinyin": "shǎo", "khmer": "តិច", "english": "Few / Little"}
        ]
        hsk1_p2_words = build_words_for_list(hsk1_p2_id, hsk1_p2_list)

        # HSK 1 Part 3 (Words 53 to 78)
        hsk1_p3_id = lessons_map["HSK 1 Part 3 (HSK 1 ភាគ ៣)"]
        hsk1_p3_list = [
            {"chinese": "叫", "pinyin": "jiào", "khmer": "ហៅ / ឈ្មោះ", "english": "To be called / Call"},
            {"chinese": "爱", "pinyin": "ài", "khmer": "ស្រឡាញ់", "english": "Love"},
            {"chinese": "恨", "pinyin": "hèn", "khmer": "ស្អប់", "english": "Hate"},
            {"chinese": "年", "pinyin": "nián", "khmer": "ឆ្នាំ", "english": "Year"},
            {"chinese": "请", "pinyin": "qǐng", "khmer": "សូម / អញ្ជើញ", "english": "Please / Invite"},
            {"chinese": "回", "pinyin": "huí", "khmer": "ត្រឡប់", "english": "Return / Go back"},
            {"chinese": "工作", "pinyin": "gōngzuò", "khmer": "ការងារ", "english": "Work / Job"},
            {"chinese": "钱", "pinyin": "qián", "khmer": "លុយ", "english": "Money"},
            {"chinese": "吃", "pinyin": "chī", "khmer": "ញ៉ាំ / ហូប", "english": "Eat"},
            {"chinese": "喝", "pinyin": "hē", "khmer": "ផឹក", "english": "Drink"},
            {"chinese": "开", "pinyin": "kāi", "khmer": "បើក", "english": "Open / Drive"},
            {"chinese": "关", "pinyin": "guān", "khmer": "បិទ", "english": "Close / Turn off"},
            {"chinese": "家", "pinyin": "jiā", "khmer": "ផ្ទះ / គ្រួសារ", "english": "Home / Family"},
            {"chinese": "哪里", "pinyin": "nǎli", "khmer": "ឯណា / ឯណោះ?", "english": "Where?"},
            {"chinese": "哪儿", "pinyin": "nǎr", "khmer": "ឯណា?", "english": "Where?"},
            {"chinese": "朋友", "pinyin": "péngyou", "khmer": "មិត្តភក្តិ", "english": "Friend"},
            {"chinese": "妈妈", "pinyin": "māma", "khmer": "ម៉ាក់", "english": "Mother / Mom"},
            {"chinese": "爸爸", "pinyin": "bàba", "khmer": "ពុក / ប៉ា", "english": "Father / Dad"},
            {"chinese": "今天", "pinyin": "jīntiān", "khmer": "ថ្ងៃនេះ", "english": "Today"},
            {"chinese": "明天", "pinyin": "míngtiān", "khmer": "ថ្ងៃស្អែក", "english": "Tomorrow"},
            {"chinese": "昨天", "pinyin": "zuótiān", "khmer": "ម្សិលមិញ", "english": "Yesterday"},
            {"chinese": "后天", "pinyin": "hòutiān", "khmer": "ខានស្អែក", "english": "Day after tomorrow"},
            {"chinese": "大后天", "pinyin": "dàhòutiān", "khmer": "ខាងស្អែកមួយទៀត", "english": "Two days after tomorrow"},
            {"chinese": "些", "pinyin": "xiē", "khmer": "ខ្លះ", "english": "Some / Several"},
            {"chinese": "一些", "pinyin": "yìxiē", "khmer": "មួយចំនួន / ខ្លះៗ", "english": "A few / Some"},
            {"chinese": "几", "pinyin": "jǐ", "khmer": "ប៉ុន្មាន?", "english": "How many? / A few"}
        ]
        hsk1_p3_words = build_words_for_list(hsk1_p3_id, hsk1_p3_list)

        # HSK 1 Part 4 (Words 80 to 104 + Idiom)
        hsk1_p4_id = lessons_map["HSK 1 Part 4 (HSK 1 ភាគ ៤)"]
        hsk1_p4_list = [
            {"chinese": "多少", "pinyin": "duōshao", "khmer": "ប៉ុន្មាន?", "english": "How much / How many?"},
            {"chinese": "对不起", "pinyin": "duìbuqǐ", "khmer": "សុំទោស", "english": "Sorry / Excuse me"},
            {"chinese": "住", "pinyin": "zhù", "khmer": "រស់នៅ", "english": "Live / Stay"},
            {"chinese": "高兴", "pinyin": "gāoxìng", "khmer": "សប្បាយចិត្ត", "english": "Happy / Glad"},
            {"chinese": "买", "pinyin": "mǎi", "khmer": "ទិញ", "english": "Buy"},
            {"chinese": "卖", "pinyin": "mài", "khmer": "លក់", "english": "Sell"},
            {"chinese": "医生", "pinyin": "yīshēng", "khmer": "គ្រូពេទ្យ", "english": "Doctor"},
            {"chinese": "医院", "pinyin": "yīyuàn", "khmer": "មន្ទីរពេទ្យ", "english": "Hospital"},
            {"chinese": "名字", "pinyin": "míngzi", "khmer": "ឈ្មោះ", "english": "Name"},
            {"chinese": "认识", "pinyin": "rènshi", "khmer": "ស្គាល់", "english": "Know / Recognize"},
            {"chinese": "坐", "pinyin": "zuò", "khmer": "អង្គុយ", "english": "Sit"},
            {"chinese": "站", "pinyin": "zhàn", "khmer": "ឈរ / ស្ថានីយ", "english": "Stand / Station"},
            {"chinese": "写", "pinyin": "xiě", "khmer": "សរសេរ", "english": "Write"},
            {"chinese": "读", "pinyin": "dú", "khmer": "អាន", "english": "Read"},
            {"chinese": "号", "pinyin": "hào", "khmer": "លេខ / ថ្ងៃទី", "english": "Number / Date"},
            {"chinese": "狗", "pinyin": "gǒu", "khmer": "ឆ្កែ", "english": "Dog"},
            {"chinese": "猫", "pinyin": "māo", "khmer": "ឆ្មា", "english": "Cat"},
            {"chinese": "岁", "pinyin": "suì", "khmer": "អាវុ / ឆ្នាំ", "english": "Years old"},
            {"chinese": "看见", "pinyin": "kànjiàn", "khmer": "មើលឃើញ", "english": "See / Catch sight of"},
            {"chinese": "打电话", "pinyin": "dǎ diànhuà", "khmer": "លេខទូរស័ព្ទ", "english": "Make a phone call"},
            {"chinese": "喂", "pinyin": "wèi", "khmer": "អាឡូ", "english": "Hello / Hey"},
            {"chinese": "儿子", "pinyin": "érzi", "khmer": "កូនប្រុស", "english": "Son"},
            {"chinese": "女儿", "pinyin": "nǚ'ér", "khmer": "កូនស្រី", "english": "Daughter"},
            {"chinese": "漂亮", "pinyin": "piàoliang", "khmer": "ស្អាត / ស្រស់ស្អាត", "english": "Pretty / Beautiful"},
            {"chinese": "分钟", "pinyin": "fēnzhōng", "khmer": "នាទី", "english": "Minute"},
            {"chinese": "叶落归根", "pinyin": "yè luò guī gēn", "khmer": "ស្លឹកឈើជ្រុះមិនឆ្ងាយពីគល់", "english": "Fallen leaves return to their roots (Idiom)"}
        ]
        hsk1_p4_words = build_words_for_list(hsk1_p4_id, hsk1_p4_list)

        # HSK 1 Part 5 (Words 105 to 130)
        hsk1_p5_id = lessons_map["HSK 1 Part 5 (HSK 1 ភាគ ៥)"]
        hsk1_p5_list = [
            {"chinese": "再见", "pinyin": "zàijiàn", "khmer": "ជួបគ្នា / លាហើយ", "english": "Goodbye / See you again"},
            {"chinese": "本", "pinyin": "běn", "khmer": "ក្បាល (សៀវភៅ)", "english": "Volume / Measure word for books"},
            {"chinese": "块", "pinyin": "kuài", "khmer": "ដុំ / ដុល្លារ", "english": "Piece / Yuan (money)"},
            {"chinese": "书", "pinyin": "shū", "khmer": "សៀវភៅ", "english": "Book"},
            {"chinese": "衣服", "pinyin": "yīfu", "khmer": "ខោអាវ", "english": "Clothes / Clothing"},
            {"chinese": "小姐", "pinyin": "xiǎojiě", "khmer": "ប្អូនស្រី / កញ្ញា", "english": "Miss / Young lady"},
            {"chinese": "水", "pinyin": "shuǐ", "khmer": "ទឹក", "english": "Water"},
            {"chinese": "饭", "pinyin": "fàn", "khmer": "បាយ", "english": "Rice / Meal"},
            {"chinese": "学习", "pinyin": "xuéxí", "khmer": "រៀន / សិក្សា", "english": "Study / Learn"},
            {"chinese": "学生", "pinyin": "xuésheng", "khmer": "សិស្ស", "english": "Student"},
            {"chinese": "学校", "pinyin": "xuéxiào", "khmer": "សាលារៀន", "english": "School"},
            {"chinese": "电影", "pinyin": "diànyǐng", "khmer": "ភ្នែក / ភាពយន្ត", "english": "Movie / Film"},
            {"chinese": "电脑", "pinyin": "diànnǎo", "khmer": "កុំព្យូទ័រ", "english": "Computer"},
            {"chinese": "电视", "pinyin": "diànshì", "khmer": "ទូរទស្សន៍", "english": "Television / TV"},
            {"chinese": "没关系", "pinyin": "méi guānxi", "khmer": "មិនអីទេ", "english": "It doesn't matter / No problem"},
            {"chinese": "飞机", "pinyin": "fēijī", "khmer": "យន្តហោះ", "english": "Airplane"},
            {"chinese": "后面", "pinyin": "hòumiàn", "khmer": "ខាងក្រោយ", "english": "Behind / Back"},
            {"chinese": "前面", "pinyin": "qiánmiàn", "khmer": "ខាងមុខ", "english": "Front / In front of"},
            {"chinese": "睡觉", "pinyin": "shuìjiào", "khmer": "ដេក / គេង", "english": "Sleep"},
            {"chinese": "老师", "pinyin": "lǎoshī", "khmer": "គ្រូបង្រៀន / គ្រូ", "english": "Teacher"},
            {"chinese": "星期", "pinyin": "xīngqī", "khmer": "សប្តាហ៍", "english": "Week"},
            {"chinese": "热", "pinyin": "rè", "khmer": "ក្តៅ", "english": "Hot"},
            {"chinese": "冷", "pinyin": "lěng", "khmer": "ត្រជាក់", "english": "Cold"},
            {"chinese": "中国", "pinyin": "zhōngguó", "khmer": "ប្រទេសចិន", "english": "China"},
            {"chinese": "菜", "pinyin": "cài", "khmer": "បន្លែ / ម្ហូប", "english": "Vegetable / Dish"},
            {"chinese": "字", "pinyin": "zì", "khmer": "អក្សរ", "english": "Character / Word"}
        ]
        hsk1_p5_words = build_words_for_list(hsk1_p5_id, hsk1_p5_list)

        # HSK 1 Part 6 (Words 131 to 156)
        hsk1_p6_id = lessons_map["HSK 1 Part 6 (HSK 1 ភាគ ៦)"]
        hsk1_p6_list = [
            {"chinese": "桌子", "pinyin": "zhuōzi", "khmer": "តុ", "english": "Table / Desk"},
            {"chinese": "椅子", "pinyin": "yǐzi", "khmer": "កៅអី", "english": "Chair"},
            {"chinese": "天气", "pinyin": "tiānqì", "khmer": "អាកាសធាតុ", "english": "Weather"},
            {"chinese": "出租车", "pinyin": "chūzūchē", "khmer": "តាក់ស៊ី", "english": "Taxi"},
            {"chinese": "茶", "pinyin": "chá", "khmer": "តែ", "english": "Tea"},
            {"chinese": "商店", "pinyin": "shāngdiàn", "khmer": "ហាង / ហាងទំនិញ", "english": "Shop / Store"},
            {"chinese": "同学", "pinyin": "tóngxué", "khmer": "មិត្តរួមថ្នាក់", "english": "Classmate"},
            {"chinese": "一点儿", "pinyin": "yìdiǎnr", "khmer": "បន្តិចបន្តួច", "english": "A little / A bit"},
            {"chinese": "苹果", "pinyin": "píngguǒ", "khmer": "ផ្លែប៉ោម", "english": "Apple"},
            {"chinese": "水果", "pinyin": "shuǐguǒ", "khmer": "ផ្លែឈើ", "english": "Fruit"},
            {"chinese": "饭店", "pinyin": "fàndiàn", "khmer": "ភោជនីយដ្ឋាន", "english": "Restaurant / Hotel"},
            {"chinese": "米饭", "pinyin": "mǐfàn", "khmer": "បាយ", "english": "Cooked rice"},
            {"chinese": "上午", "pinyin": "shàngwǔ", "khmer": "ពេលព្រឹក", "english": "Morning"},
            {"chinese": "中午", "pinyin": "zhōngwǔ", "khmer": "ថ្ងៃត្រង់", "english": "Noon"},
            {"chinese": "下午", "pinyin": "xiàwǔ", "khmer": "ពេលរសៀល", "english": "Afternoon"},
            {"chinese": "晚上", "pinyin": "wǎnshang", "khmer": "ពេលយប់", "english": "Evening / Night"},
            {"chinese": "杯子", "pinyin": "bēizi", "khmer": "កែវ", "english": "Cup / Glass"},
            {"chinese": "下雨", "pinyin": "xiàyǔ", "khmer": "ភ្លៀង", "english": "Rain / To rain"},
            {"chinese": "汉语", "pinyin": "hànyǔ", "khmer": "ភាសាចិន", "english": "Chinese language"},
            {"chinese": "中文", "pinyin": "zhōngwén", "khmer": "ភាសាចិន / អក្សរចិន", "english": "Chinese language/written"},
            {"chinese": "汉字", "pinyin": "hànzì", "khmer": "អក្សរចិន", "english": "Chinese character"},
            {"chinese": "不客气", "pinyin": "bú kèqi", "khmer": "មិនបាច់គួរសមទេ", "english": "You're welcome"},
            {"chinese": "要", "pinyin": "yào", "khmer": "ចង់ / ត្រូវ", "english": "Want / Need / Must"},
            {"chinese": "就", "pinyin": "jiù", "khmer": "ក៏ / គឺ", "english": "Just / Then"},
            {"chinese": "知道", "pinyin": "zhīdào", "khmer": "ដឹង / យល់", "english": "Know"},
            {"chinese": "吧", "pinyin": "ba", "khmer": "ចុះ / តោះ", "english": "Modal particle (suggestion)"}
        ]
        hsk1_p6_words = build_words_for_list(hsk1_p6_id, hsk1_p6_list)

        # HSK 2 Part 1 (Words 157 to 182)
        hsk2_p1_id = lessons_map["HSK 2 Part 1 (HSK 2 ភាគ ១)"]
        hsk2_p1_list = [
            {"chinese": "到", "pinyin": "dào", "khmer": "ដល់", "english": "Arrive / Reach"},
            {"chinese": "对", "pinyin": "duì", "khmer": "ត្រូវ / ចំពោះ", "english": "Correct / Towards"},
            {"chinese": "也", "pinyin": "yě", "khmer": "ដែរ", "english": "Also / Too"},
            {"chinese": "还", "pinyin": "hái", "khmer": "នៅ (លទ្ធផលតាមក្រោយ)", "english": "Still / Yet / Also"},
            {"chinese": "让", "pinyin": "ràng", "khmer": "អោយ / អនុញ្ញាត", "english": "Let / Allow"},
            {"chinese": "给", "pinyin": "gěi", "khmer": "ឲ្យ / សម្រាប់", "english": "Give / To / For"},
            {"chinese": "过", "pinyin": "guò", "khmer": "ធ្លាប់", "english": "Pass / Cross / Experiential aspect"},
            {"chinese": "得", "pinyin": "de", "khmer": "បាន / យ៉ាង", "english": "Structural particle"},
            {"chinese": "真", "pinyin": "zhēn", "khmer": "ពិត / មែន", "english": "Real / Really"},
            {"chinese": "可以", "pinyin": "kěyǐ", "khmer": "អាច", "english": "Can / May"},
            {"chinese": "别", "pinyin": "bié", "khmer": "កុំ", "english": "Don't"},
            {"chinese": "走", "pinyin": "zǒu", "khmer": "ដើរ", "english": "Walk / Go"},
            {"chinese": "告诉", "pinyin": "gàosu", "khmer": "ប្រាប់", "english": "Tell / Inform"},
            {"chinese": "因为", "pinyin": "yīnwèi", "khmer": "ព្រោះ", "english": "Because"},
            {"chinese": "快", "pinyin": "kuài", "khmer": "លឿន", "english": "Fast / Quick"},
            {"chinese": "但是", "pinyin": "dànshì", "khmer": "ប៉ុន្តែ", "english": "But / However"},
            {"chinese": "已经", "pinyin": "yǐjīng", "khmer": "បាន (សកម្មភាពបានធ្វើ)", "english": "Already"},
            {"chinese": "为什么", "pinyin": "wèishénme", "khmer": "ហេតុអ្វី?", "english": "Why?"},
            {"chinese": "觉得", "pinyin": "juéde", "khmer": "គិតថា / មានអារម្មណ៍ថា", "english": "Feel / Think"},
            {"chinese": "从", "pinyin": "cóng", "khmer": "ពី (ម៉ោង/ទីកន្លែង)", "english": "From"},
            {"chinese": "找", "pinyin": "zhǎo", "khmer": "រក / រកមើល", "english": "Look for / Seek"},
            {"chinese": "最", "pinyin": "zuì", "khmer": "បំផុត / ជាងគេ", "english": "Most / Best / -est"},
            {"chinese": "可能", "pinyin": "kěnéng", "khmer": "ប្រហែល / អាចនឹង", "english": "Maybe / Possible"},
            {"chinese": "次", "pinyin": "cì", "khmer": "លើក / ដង", "english": "Time / Instance"},
            {"chinese": "出", "pinyin": "chū", "khmer": "ចេញ", "english": "Go out / Exit"},
            {"chinese": "进", "pinyin": "jìn", "khmer": "ចូល", "english": "Enter"}
        ]
        hsk2_p1_words = build_words_for_list(hsk2_p1_id, hsk2_p1_list)

        # HSK 2 Part 2 (Words 183 to 208)
        hsk2_p2_id = lessons_map["HSK 2 Part 2 (HSK 2 ភាគ ២)"]
        hsk2_p2_list = [
            {"chinese": "孩子", "pinyin": "háizi", "khmer": "កូន / កូនក្មេង", "english": "Child / Children"},
            {"chinese": "所以", "pinyin": "suǒyǐ", "khmer": "ដូច្នេះ / ហើយ", "english": "So / Therefore"},
            {"chinese": "错", "pinyin": "cuò", "khmer": "ខុស", "english": "Wrong / Mistake"},
            {"chinese": "等", "pinyin": "děng", "khmer": "រង់ចាំ", "english": "Wait"},
            {"chinese": "问题", "pinyin": "wèntí", "khmer": "សំណួរ / បញ្ហា", "english": "Question / Problem"},
            {"chinese": "一起", "pinyin": "yìqǐ", "khmer": "ជាមួយ / ជុំគ្នា", "english": "Together"},
            {"chinese": "开始", "pinyin": "kāishǐ", "khmer": "ចាប់ផ្តើម", "english": "Start / Begin"},
            {"chinese": "时间", "pinyin": "shíjiān", "khmer": "ពេល / ពេលវេលា", "english": "Time"},
            {"chinese": "事情", "pinyin": "shìqing", "khmer": "រឿង / ភារកិច្ច", "english": "Matter / Thing / Affair"},
            {"chinese": "一下", "pinyin": "yíxià", "khmer": "បន្តិច / ម៉ែភ្លែត", "english": "A bit / A short while"},
            {"chinese": "非常", "pinyin": "fēicháng", "khmer": "ខ្លាំងណាស់ / ណាស់", "english": "Very / Extremely"},
            {"chinese": "希望", "pinyin": "xīwàng", "khmer": "សង្ឃឹម", "english": "Hope / Wish"},
            {"chinese": "准备", "pinyin": "zhǔnbèi", "khmer": "ត្រៀម / រៀបចំ", "english": "Prepare / Get ready"},
            {"chinese": "比", "pinyin": "bǐ", "khmer": "ជាង (ប្រៀបធៀប)", "english": "Compare / Than"},
            {"chinese": "问", "pinyin": "wèn", "khmer": "សួរ", "english": "Ask"},
            {"chinese": "件", "pinyin": "jiàn", "khmer": "ឯកសារ / ខោអាវ (ខ្នាត)", "english": "Measure word for clothes/matters"},
            {"chinese": "意思", "pinyin": "yìsi", "khmer": "ន័យ / អត្ថន័យ", "english": "Meaning"},
            {"chinese": "第一", "pinyin": "dì-yī", "khmer": "ទី ១", "english": "First / Number 1"},
            {"chinese": "大家", "pinyin": "dàjiā", "khmer": "អ្នកទាំងអស់គ្នា", "english": "Everyone / Everybody"},
            {"chinese": "新", "pinyin": "xīn", "khmer": "ថ្មី", "english": "New"},
            {"chinese": "旧", "pinyin": "jiù", "khmer": "ចាស់", "english": "Old (for objects)"},
            {"chinese": "老", "pinyin": "lǎo", "khmer": "ចាស់", "english": "Old (for people)"},
            {"chinese": "穿", "pinyin": "chuān", "khmer": "ស្លៀកពាក់", "english": "Wear / Put on"},
            {"chinese": "送", "pinyin": "sòng", "khmer": "ជូន / ផ្ញើ", "english": "Give as a gift / Escort"},
            {"chinese": "玩", "pinyin": "wán", "khmer": "លេង", "english": "Play / Fun"},
            {"chinese": "长", "pinyin": "cháng", "khmer": "វែង", "english": "Long"}
        ]
        hsk2_p2_words = build_words_for_list(hsk2_p2_id, hsk2_p2_list)

        # HSK 2 Part 3 (Words 209 to 235)
        hsk2_p3_id = lessons_map["HSK 2 Part 3 (HSK 2 ភាគ ៣)"]
        hsk2_p3_list = [
            {"chinese": "小时", "pinyin": "xiǎoshí", "khmer": "ម៉ោង (ប្រវែងពេលវេលា)", "english": "Hour"},
            {"chinese": "完", "pinyin": "wán", "khmer": "រួចរាល់ / បញ្ចប់", "english": "Finished / Complete"},
            {"chinese": "每", "pinyin": "měi", "khmer": "រៀងរាល់", "english": "Every / Each"},
            {"chinese": "每个", "pinyin": "měi gè", "khmer": "រៀងរាល់ / រាល់", "english": "Every single one"},
            {"chinese": "公司", "pinyin": "gōngsī", "khmer": "ក្រុមហ៊ុន", "english": "Company / Firm"},
            {"chinese": "帮助", "pinyin": "bāngzhù", "khmer": "ជួយ", "english": "Help / Assist"},
            {"chinese": "早上", "pinyin": "zǎoshang", "khmer": "ពេលព្រឹក (6-7am)", "english": "Morning"},
            {"chinese": "晚上", "pinyin": "wǎnshang", "khmer": "ពេលយប់", "english": "Evening / Night"},
            {"chinese": "说话", "pinyin": "shuōhuà", "khmer": "និយាយ / ស្តី", "english": "Speak / Talk"},
            {"chinese": "门", "pinyin": "mén", "khmer": "ទ្វារ", "english": "Door / Gate"},
            {"chinese": "女", "pinyin": "nǚ", "khmer": "មនុស្សស្រី", "english": "Female / Woman"},
            {"chinese": "忙", "pinyin": "máng", "khmer": "រវល់", "english": "Busy"},
            {"chinese": "空", "pinyin": "kōng", "khmer": "ទំនេរ", "english": "Free / Empty"},
            {"chinese": "高", "pinyin": "gāo", "khmer": "ខ្ពស់", "english": "Tall / High"},
            {"chinese": "低", "pinyin": "dī", "khmer": "ទាប", "english": "Low / Short"},
            {"chinese": "房间", "pinyin": "fángjiān", "khmer": "បន្ទប់", "english": "Room"},
            {"chinese": "路", "pinyin": "lù", "khmer": "ផ្លូវ", "english": "Road / Path"},
            {"chinese": "懂", "pinyin": "dǒng", "khmer": "យល់ / ដឹង", "english": "Understand"},
            {"chinese": "正在", "pinyin": "zhèngzài", "khmer": "កំពុង", "english": "In the process of / Right now"},
            {"chinese": "正", "pinyin": "zhèng", "khmer": "កំពុង", "english": "Just / Right"},
            {"chinese": "笑", "pinyin": "xiào", "khmer": "សើច", "english": "Laugh / Smile"},
            {"chinese": "哭", "pinyin": "kū", "khmer": "យំ", "english": "Cry"},
            {"chinese": "远", "pinyin": "yuǎn", "khmer": "ឆ្ងាយ", "english": "Far / Distant"},
            {"chinese": "妻子", "pinyin": "qīzi", "khmer": "ប្រពន្ធ", "english": "Wife"},
            {"chinese": "丈夫", "pinyin": "zhàngfu", "khmer": "ប្តី", "english": "Husband"},
            {"chinese": "离", "pinyin": "lí", "khmer": "ចេញពី / ឃ្លាត", "english": "Away from / Distance from"},
            {"chinese": "往", "pinyin": "wǎng", "khmer": "ឆ្ពោះទៅ", "english": "Towards / To"}
        ]
        hsk2_p3_words = build_words_for_list(hsk2_p3_id, hsk2_p3_list)

        # HSK 2 Part 4 (Words 236 to 260)
        hsk2_p4_id = lessons_map["HSK 2 Part 4 (HSK 2 ភាគ ៤)"]
        hsk2_p4_list = [
            {"chinese": "男", "pinyin": "nán", "khmer": "មនុស្សប្រុស", "english": "Male / Man"},
            {"chinese": "眼睛", "pinyin": "yǎnjing", "khmer": "ភ្នែក", "english": "Eye"},
            {"chinese": "快乐", "pinyin": "kuàilè", "khmer": "រីករាយ", "english": "Happy / Joyful"},
            {"chinese": "虽然", "pinyin": "suīrán", "khmer": "ទោះបីជា...ក៏ដោយ", "english": "Although / Even though"},
            {"chinese": "药", "pinyin": "yào", "khmer": "ថ្នាំ", "english": "Medicine / Drug"},
            {"chinese": "身体", "pinyin": "shēntǐ", "khmer": "រាងកាយ / សុខភាព", "english": "Body / Health"},
            {"chinese": "黑", "pinyin": "hēi", "khmer": "ខ្មៅ", "english": "Black / Dark"},
            {"chinese": "白", "pinyin": "bái", "khmer": "ស", "english": "White"},
            {"chinese": "咖啡", "pinyin": "kāfēi", "khmer": "កាហ្វេ", "english": "Coffee"},
            {"chinese": "百", "pinyin": "bǎi", "khmer": "រយ", "english": "Hundred"},
            {"chinese": "休息", "pinyin": "xiūxi", "khmer": "សម្រាក", "english": "Rest / Take a break"},
            {"chinese": "外国人", "pinyin": "wàiguórén", "khmer": "ជនបរទេស", "english": "Foreigner"},
            {"chinese": "生日", "pinyin": "shēngrì", "khmer": "ថ្ងៃកំណើត", "english": "Birthday"},
            {"chinese": "哥哥", "pinyin": "gēge", "khmer": "បងប្រុស", "english": "Older brother"},
            {"chinese": "姐姐", "pinyin": "jiějie", "khmer": "បងស្រី", "english": "Older sister"},
            {"chinese": "票", "pinyin": "piào", "khmer": "សំបុត្រ", "english": "Ticket"},
            {"chinese": "手机", "pinyin": "shǒujī", "khmer": "ទូរស័ព្ទ", "english": "Mobile phone"},
            {"chinese": "洗", "pinyin": "xǐ", "khmer": "លាង / សំអាត", "english": "Wash / Clean"},
            {"chinese": "跳舞", "pinyin": "tiàowǔ", "khmer": "រាំ", "english": "Dance"},
            {"chinese": "弟弟", "pinyin": "dìdi", "khmer": "ប្អូនប្រុស", "english": "Younger brother"},
            {"chinese": "妹妹", "pinyin": "mèimei", "khmer": "ប្អូនស្រី", "english": "Younger sister"},
            {"chinese": "红", "pinyin": "hóng", "khmer": "ក្រហម", "english": "Red"},
            {"chinese": "慢", "pinyin": "màn", "khmer": "យឺត", "english": "Slow"},
            {"chinese": "快", "pinyin": "kuài", "khmer": "លឿន", "english": "Fast"}
        ]
        hsk2_p4_words = build_words_for_list(hsk2_p4_id, hsk2_p4_list)

        # HSK 2 Part 5 (Essential Vocabulary)
        hsk2_p5_id = lessons_map["HSK 2 Part 5 (HSK 2 ភាគ ៥)"]
        hsk2_p5_list = [
            {"chinese": "准备", "pinyin": "zhǔnbèi", "khmer": "ត្រៀមខ្លួន", "english": "To prepare / Get ready"},
            {"chinese": "运动", "pinyin": "yùndòng", "khmer": "កីឡា / ហាត់ប្រាណ", "english": "Sports / Exercise"},
            {"chinese": "旅游", "pinyin": "lǚyóu", "khmer": "ធ្វើដំណើរ / ដើរលេង", "english": "Travel / Tourism"},
            {"chinese": "眼睛", "pinyin": "yǎnjing", "khmer": "ភ្នែក", "english": "Eye"},
            {"chinese": "身体", "pinyin": "shēntǐ", "khmer": "រាងកាយ / សុខភាព", "english": "Body / Health"},
            {"chinese": "生病", "pinyin": "shēngbìng", "khmer": "ឈឺ / ធ្លាក់ខ្លួនឈឺ", "english": "To get sick"},
            {"chinese": "休息", "pinyin": "xiūxi", "khmer": "សម្រាក", "english": "To rest"},
            {"chinese": "介绍", "pinyin": "jièshào", "khmer": "ណែនាំ", "english": "To introduce"},
            {"chinese": "帮助", "pinyin": "bāngzhù", "khmer": "ជួយ", "english": "To help"},
            {"chinese": "知道", "pinyin": "zhīdào", "khmer": "ដឹង / ស្គាល់", "english": "To know"},
            {"chinese": "告诉", "pinyin": "gàosu", "khmer": "ប្រាប់", "english": "To tell"},
            {"chinese": "欢迎", "pinyin": "huānyíng", "khmer": "ស្វាគមន៍", "english": "Welcome"}
        ]
        hsk2_p5_words = build_words_for_list(hsk2_p5_id, hsk2_p5_list)

        # HSK 3 Part 1 (Words 313 to 338)
        hsk3_p1_id = lessons_map["HSK 3 Part 1 (HSK 3 ភាគ ១)"]
        hsk3_p1_list = [
            {"chinese": "别笑", "pinyin": "bié xiào", "khmer": "កុំសើច", "english": "Don't laugh"},
            {"chinese": "别玩", "pinyin": "bié wán", "khmer": "កុំលេង", "english": "Don't play"},
            {"chinese": "如果", "pinyin": "rúguǒ", "khmer": "ប្រសិនបើ", "english": "If / In case"},
            {"chinese": "只", "pinyin": "zhǐ", "khmer": "គ្រាន់តែ / តែ", "english": "Only / Just"},
            {"chinese": "被", "pinyin": "bèi", "khmer": "ត្រូវបាន", "english": "Passive marker (by)"},
            {"chinese": "跟", "pinyin": "gēn", "khmer": "ជាមួយ", "english": "With / Follow"},
            {"chinese": "自己", "pinyin": "zìjǐ", "khmer": "ខ្លួនឯង", "english": "Oneself / Self"},
            {"chinese": "用", "pinyin": "yòng", "khmer": "ប្រើ", "english": "Use"},
            {"chinese": "像", "pinyin": "xiàng", "khmer": "ដូច", "english": "Like / Resemble"},
            {"chinese": "为", "pinyin": "wèi", "khmer": "សម្រាប់ / ដើម្បី", "english": "For / For the sake of"},
            {"chinese": "应该", "pinyin": "yīnggāi", "khmer": "គួរតែ", "english": "Should / Ought to"},
            {"chinese": "才", "pinyin": "cái", "khmer": "ទើប", "english": "Just / Only then"},
            {"chinese": "又", "pinyin": "yòu", "khmer": "ទៀត", "english": "Again"},
            {"chinese": "拿", "pinyin": "ná", "khmer": "យក / កាន់", "english": "Take / Hold"},
            {"chinese": "更", "pinyin": "gèng", "khmer": "ជាង / កាន់តែ", "english": "More / Even more"},
            {"chinese": "带", "pinyin": "dài", "khmer": "យកតាម / នាំ", "english": "Bring / Carry"},
            {"chinese": "然后", "pinyin": "ránhòu", "khmer": "បន្ទាប់មក", "english": "Then / Afterwards"},
            {"chinese": "一样", "pinyin": "yíyàng", "khmer": "ដូចគ្នា", "english": "Same / Alike"},
            {"chinese": "当然", "pinyin": "dāngrán", "khmer": "ប្រាកដណាស់", "english": "Of course / Naturally"},
            {"chinese": "相信", "pinyin": "xiāngxìn", "khmer": "ជឿជាក់", "english": "Believe / Trust"},
            {"chinese": "认为", "pinyin": "rènwéi", "khmer": "យល់ឃើញថា", "english": "Think / Believe / Consider"},
            {"chinese": "明白", "pinyin": "míngbai", "khmer": "យល់ដឹង", "english": "Understand / Clear"},
            {"chinese": "一直", "pinyin": "yìzhí", "khmer": "រហូត", "english": "Continuously / Always"},
            {"chinese": "地方", "pinyin": "dìfang", "khmer": "កន្លែង", "english": "Place / Location"},
            {"chinese": "离开", "pinyin": "líkāi", "khmer": "ចាកចេញ", "english": "Leave / Depart"},
            {"chinese": "一定", "pinyin": "yídìng", "khmer": "ប្រាកដជា", "english": "Definitely / Certain"}
        ]
        hsk3_p1_words = build_words_for_list(hsk3_p1_id, hsk3_p1_list)

        # HSK 3 Part 2 (Words 339 to 364)
        hsk3_p2_id = lessons_map["HSK 3 Part 2 (HSK 3 ភាគ ២)"]
        hsk3_p2_list = [
            {"chinese": "还是", "pinyin": "háishi", "khmer": "ឬក៏ / នៅតែ", "english": "Or / Still"},
            {"chinese": "发现", "pinyin": "fāxiàn", "khmer": "ប្រទះឃើញ / រកឃើញ", "english": "Discover / Find"},
            {"chinese": "而且", "pinyin": "érqiě", "khmer": "ម្យ៉ាងទៀត / លើសពីនេះ", "english": "Moreover / Furthermore"},
            {"chinese": "必须", "pinyin": "bìxū", "khmer": "ដាច់ខាត / ត្រូវតែ", "english": "Must / Have to"},
            {"chinese": "补语", "pinyin": "bǔyǔ", "khmer": "ពាក្យបំពេញន័យ", "english": "Complement (grammar term)"},
            {"chinese": "为了", "pinyin": "wèile", "khmer": "ដើម្បី / សម្រាប់", "english": "For / In order to"},
            {"chinese": "向", "pinyin": "xiàng", "khmer": "ទៅកាន់ / ចំពោះ", "english": "Towards / To"},
            {"chinese": "好茶", "pinyin": "hǎo chá", "khmer": "តែល្អ", "english": "Good tea"},
            {"chinese": "先", "pinyin": "xiān", "khmer": "មុន / ដំបូង", "english": "First / Ahead"},
            {"chinese": "种", "pinyin": "zhǒng", "khmer": "ប្រភេទ", "english": "Type / Kind"},
            {"chinese": "最后", "pinyin": "zuìhòu", "khmer": "ចុងក្រោយ", "english": "Final / Last / Finally"},
            {"chinese": "其他", "pinyin": "qítā", "khmer": "ផ្សេងទៀត", "english": "Other / Else"},
            {"chinese": "记得", "pinyin": "jìde", "khmer": "ចាំ / ចងចាំ", "english": "Remember"},
            {"chinese": "或者", "pinyin": "huòzhě", "khmer": "ឬ / ឬក៏", "english": "Or"},
            {"chinese": "过去过", "pinyin": "guòqù guò", "khmer": "ធ្លាប់ទៅ", "english": "Have been to"},
            {"chinese": "担心", "pinyin": "dānxīn", "khmer": "ព្រួយបារម្ភ", "english": "Worry / Be concerned"},
            {"chinese": "条", "pinyin": "tiáo", "khmer": "ខ្នាត (ប្រើសម្រាប់របស់វែង)", "english": "Measure word for long thin things"},
            {"chinese": "傻", "pinyin": "shǎ", "khmer": "ឆ្កួត / ឆ្កួតឡប់", "english": "Foolish / Silly"},
            {"chinese": "傻瓜", "pinyin": "shǎguā", "khmer": "មនុស្សឆ្កួត", "english": "Fool / Idiot"},
            {"chinese": "疯了", "pinyin": "fēng le", "khmer": "ឆ្កួតហើយ", "english": "Gone crazy / Mad"},
            {"chinese": "疯", "pinyin": "fēng", "khmer": "ឆ្កួត", "english": "Crazy / Insane"},
            {"chinese": "老大", "pinyin": "lǎodà", "khmer": "មេ / កូនច្បង", "english": "Boss / Eldest child"},
            {"chinese": "以前", "pinyin": "yǐqián", "khmer": "ពីមុន", "english": "Before / Previously"},
            {"chinese": "世界", "pinyin": "shìjiè", "khmer": "ពិភពលោក", "english": "World"},
            {"chinese": "重要", "pinyin": "zhòngyào", "khmer": "សំខាន់", "english": "Important"},
            {"chinese": "别人", "pinyin": "biérén", "khmer": "អ្នកផ្សេង / គេ", "english": "Other people / Others"}
        ]
        hsk3_p2_words = build_words_for_list(hsk3_p2_id, hsk3_p2_list)

        # Insert Words for Lesson: Chinese New Year (春节)
        cny_id = lessons_map["Chinese New Year (春节)"]
        cny_list = [
            {"chinese": "春节", "pinyin": "chūn jié", "khmer": "បុណ្យចូលឆ្នាំចិន"},
            {"chinese": "中新年", "pinyin": "zhōng xīn nián", "khmer": "បុណ្យចូលឆ្នាំចិន"},
            {"chinese": "红包", "pinyin": "hóng bāo", "khmer": "អាំងប៉ាវ"},
            {"chinese": "红包多多", "pinyin": "hóng bāo duō duō", "khmer": "សូមឲ្យបានអាំងប៉ាវច្រើនៗ"},
            {"chinese": "发红包", "pinyin": "fā hóng bāo", "khmer": "ចែកអាំងប៉ាវ"},
            {"chinese": "灯笼", "pinyin": "dēng lóng", "khmer": "គោមក្រហម"},
            {"chinese": "拜年", "pinyin": "bài nián", "khmer": "ជូនពរឆ្នាំថ្មី"},
            {"chinese": "舞狮", "pinyin": "wǔ shī", "khmer": "រាំសិង្ហ"},
            {"chinese": "舞龙", "pinyin": "wǔ lóng", "khmer": "រាំនាគ"},
            {"chinese": "祝 / 祝福", "pinyin": "zhù / zhù fú", "khmer": "ជូនពរ / ពាក្យជូនពរ"},
            {"chinese": "新年快乐", "pinyin": "xīn nián kuài lè", "khmer": "រីករាយឆ្នាំថ្មី"},
            {"chinese": "恭贺新年", "pinyin": "gōng hè xīn nián", "khmer": "សូមអបអរសាទរឆ្នាំថ្មី"},
            {"chinese": "恭喜发财", "pinyin": "gōng xǐ fā cái", "khmer": "សូមឲ្យមានទ្រព្យសម្បត្តិ និងមានលាភ"},
            {"chinese": "出入平安", "pinyin": "chū rù píng ān", "khmer": "ទៅមកដោយសុវត្ថិភាព"},
            {"chinese": "一路平安", "pinyin": "yí lù píng ān", "khmer": "សូមឲ្យធ្វើដំណើរដោយសុវត្ថិភាព"},
            {"chinese": "一路顺风", "pinyin": "yí lù shùn fēng", "khmer": "សូមឲ្យដំណើររលូន"},
            {"chinese": "合家平安", "pinyin": "hé jiā píng ān", "khmer": "សូមឲ្យគ្រួសារទាំងមូលមានសុខសាន្ត"},
            {"chinese": "祝你幸福愉快", "pinyin": "zhù nǐ xìng fú yú kuài", "khmer": "សូមឲ្យអ្នកមានសុភមង្គល និងរីករាយ"},
            {"chinese": "祝你身体健康", "pinyin": "zhù nǐ shēn tǐ jiàn kāng", "khmer": "សូមឲ្យអ្នកមានសុខភាពល្អ"},
            {"chinese": "祝你好运", "pinyin": "zhù nǐ hǎo yùn", "khmer": "សូមឲ្យអ្នកមានសំណាងល្អ"},
            {"chinese": "祝你长命百岁", "pinyin": "zhù nǐ cháng mìng bǎi suì", "khmer": "សូមឲ្យអ្នកមានអាយុយឺនយូរ"},
            {"chinese": "祝你长寿", "pinyin": "zhù nǐ cháng shòu", "khmer": "សូមឲ្យអ្នកអាយុវែង"},
            {"chinese": "祝你龙马精神", "pinyin": "zhù nǐ lóng mǎ jīng shén", "khmer": "សូមឲ្យអ្នកមានកម្លាំង និងស្មារតីមាំមួន"},
            {"chinese": "祝你智慧聪敏", "pinyin": "zhù nǐ zhì huì cōng mǐn", "khmer": "សូមឲ្យអ្នកឆ្លាតវៃ និងមានប្រាជ្ញា"},
            {"chinese": "祝你早日康复", "pinyin": "zhù nǐ zǎo rì kāng fù", "khmer": "សូមឲ្យអ្នកឆាប់ជាសះស្បើយ"},
            {"chinese": "祝你学习进步", "pinyin": "zhù nǐ xué xí jìn bù", "khmer": "សូមឲ្យការសិក្សារីកចម្រើន"},
            {"chinese": "祝你取得好成绩", "pinyin": "zhù nǐ qǔ dé hǎo chéng jì", "khmer": "សូមឲ្យអ្នកទទួលបានលទ្ធផលល្អ"},
            {"chinese": "祝你工作顺利", "pinyin": "zhù nǐ gōng zuò shùn lì", "khmer": "សូមឲ្យការងាររលូន"},
            {"chinese": "祝你大吉大利", "pinyin": "zhù nǐ dà jí dà lì", "khmer": "សូមឲ្យមានសំណាងល្អ និងជោគជ័យ"},
            {"chinese": "祝你青春美丽", "pinyin": "zhù nǐ qīng chūn měi lì", "khmer": "សូមឲ្យនៅក្មេងស្រស់ស្អាតជានិច្ច"},
            {"chinese": "祝你更年轻", "pinyin": "zhù nǐ gèng nián qīng", "khmer": "សូមឲ្យអ្នកកាន់តែក្មេងជាងមុន"},
            {"chinese": "祝你万事如意", "pinyin": "zhù nǐ wàn shì rú yì", "khmer": "សូមឲ្យអ្វីៗសម្រេចដូចបំណង"},
            {"chinese": "心想事成", "pinyin": "xīn xiǎng shì chéng", "khmer": "សូមឲ្យបំណងប្រាថ្នាបានសម្រេច"},
            {"chinese": "祝贺新郎新娘 相亲相爱", "pinyin": "zhù hè xīn láng xīn niáng xiāng qīn xiāng ài", "khmer": "សូមអបអរសាទរកូនកំលោះ និងកូនក្រមុំ សូមឲ្យស្រឡាញ់គ្នារហូត"}
        ]

        cny_all_khmer = list(set([item['khmer'] for item in cny_list]))
        cny_words = []
        for item in cny_list:
            correct_ans = item['khmer']
            distractor_pool = [ans for ans in cny_all_khmer if ans != correct_ans]
            distractors = rng.sample(distractor_pool, 3)
            options = [correct_ans] + distractors
            rng.shuffle(options)
            cny_words.append((cny_id, item['chinese'], item['pinyin'], correct_ans, json.dumps(options)))

        
        # HSK 2 Part 5 (Words 261 to 286)
        hsk2_p5_id = lessons_map["HSK 2 Part 5 (HSK 2 ភាគ ៥)"]
        hsk2_p5_list = [
            {"chinese": "近", "pinyin": "jìn", "khmer": "ជិត", "english": "Near / Close"},
            {"chinese": "介绍", "pinyin": "jièshào", "khmer": "ណែនាំ", "english": "Introduce"},
            {"chinese": "鱼", "pinyin": "yú", "khmer": "ត្រី", "english": "Fish"},
            {"chinese": "累", "pinyin": "lèi", "khmer": "ហត់ / ហត់នឿយ", "english": "Tired"},
            {"chinese": "课", "pinyin": "kè", "khmer": "មេរៀន", "english": "Lesson / Class"},
            {"chinese": "上班", "pinyin": "shàngbān", "khmer": "ចូលធ្វើការ", "english": "Go to work"},
            {"chinese": "下班", "pinyin": "xiàbān", "khmer": "ចេញពីធ្វើការ", "english": "Off work / Finish work"},
            {"chinese": "旁边", "pinyin": "pángbiān", "khmer": "ក្បែរ", "english": "Beside / Next to"},
            {"chinese": "运动", "pinyin": "yùndòng", "khmer": "កីឡា / ហាត់ប្រាណ", "english": "Exercise / Sports"},
            {"chinese": "去年", "pinyin": "qùnián", "khmer": "ឆ្នាំមុន", "english": "Last year"},
            {"chinese": "报纸", "pinyin": "bàozhǐ", "khmer": "កាសែត", "english": "Newspaper"},
            {"chinese": "颜色", "pinyin": "yánsè", "khmer": "ពណ៌", "english": "Color"},
            {"chinese": "机场", "pinyin": "jīchǎng", "khmer": "ព្រលានយន្តហោះ", "english": "Airport"},
            {"chinese": "唱歌", "pinyin": "chànggē", "khmer": "ច្រៀងចម្រៀង", "english": "Sing a song"},
            {"chinese": "好吃", "pinyin": "hǎochī", "khmer": "ឆ្ងាញ់", "english": "Delicious / Tasty"},
            {"chinese": "考试", "pinyin": "kǎoshì", "khmer": "ប្រឡង", "english": "Exam / Test"},
            {"chinese": "左边", "pinyin": "zuǒbiān", "khmer": "ខាងឆ្វេង", "english": "Left side"},
            {"chinese": "右边", "pinyin": "yòubiān", "khmer": "ខាងស្តាំ", "english": "Right side"},
            {"chinese": "姓", "pinyin": "xìng", "khmer": "ត្រកូល", "english": "Surname / Family name"},
            {"chinese": "白雪", "pinyin": "báixuě", "khmer": "ព្រិលស", "english": "White snow"},
            {"chinese": "贵", "pinyin": "guì", "khmer": "ថ្លៃ", "english": "Expensive"},
            {"chinese": "生病", "pinyin": "shēngbìng", "khmer": "ឈឺ", "english": "Sick / Fall ill"},
            {"chinese": "游泳", "pinyin": "yóuyǒng", "khmer": "ហែលទឹក", "english": "Swim"},
            {"chinese": "牛奶", "pinyin": "niúnǎi", "khmer": "ទឹកដោះគោ", "english": "Milk"},
            {"chinese": "便宜", "pinyin": "piányi", "khmer": "ថោក / ធូរថ្លៃ", "english": "Cheap / Inexpensive"},
            {"chinese": "起床", "pinyin": "qǐchuáng", "khmer": "ក្រោកពីដំណេក", "english": "Get up / Get out of bed"}
        ]
        hsk2_p5_words = build_words_for_list(hsk2_p5_id, hsk2_p5_list)

        # HSK 2 Part 6 (Words 287 to 312)
        hsk2_p6_id = lessons_map["HSK 2 Part 6 (HSK 2 ភាគ ៦)"]
        hsk2_p6_list = [
            {"chinese": "鸡蛋", "pinyin": "jīdàn", "khmer": "ពងមាន់", "english": "Chicken egg"},
            {"chinese": "鸭蛋", "pinyin": "yādàn", "khmer": "ពងទា", "english": "Duck egg"},
            {"chinese": "题", "pinyin": "tí", "khmer": "លំហាត់", "english": "Question / Problem"},
            {"chinese": "零", "pinyin": "líng", "khmer": "លេខសូន្យ", "english": "Zero"},
            {"chinese": "手表", "pinyin": "shǒubiǎo", "khmer": "នាឡិកាដៃ", "english": "Wristwatch"},
            {"chinese": "服务员", "pinyin": "fúwùyuán", "khmer": "បុគ្គលិកបម្រើ / អ្នករត់តុ", "english": "Waiter / Attendant"},
            {"chinese": "旅游", "pinyin": "lǚyóu", "khmer": "ទេសចរណ៍", "english": "Travel / Tourism"},
            {"chinese": "宾馆", "pinyin": "bīnguǎn", "khmer": "សណ្ឋាគារ", "english": "Hotel"},
            {"chinese": "教室", "pinyin": "jiàoshì", "khmer": "ថ្នាក់រៀន", "english": "Classroom"},
            {"chinese": "跑步", "pinyin": "pǎobù", "khmer": "រត់", "english": "Run / Jog"},
            {"chinese": "阴", "pinyin": "yīn", "khmer": "ស្រអាប់", "english": "Cloudy / Overcast"},
            {"chinese": "面条", "pinyin": "miàntiáo", "khmer": "មី", "english": "Noodles"},
            {"chinese": "铅笔", "pinyin": "qiānbǐ", "khmer": "ខ្មៅដៃ", "english": "Pencil"},
            {"chinese": "火车站", "pinyin": "huǒchēzhàn", "khmer": "ស្ថានីយរថភ្លើង", "english": "Train station"},
            {"chinese": "西瓜", "pinyin": "xīguā", "khmer": "ឪឡឹក", "english": "Watermelon"},
            {"chinese": "羊肉", "pinyin": "yángròu", "khmer": "សាច់ពពែ", "english": "Mutton / Lamb"},
            {"chinese": "晴", "pinyin": "qíng", "khmer": "ស្រឡះ (មេឃស្រឡះ)", "english": "Sunny / Clear sky"},
            {"chinese": "打篮球", "pinyin": "dǎ lánqiú", "khmer": "លេងបាល់បោះ", "english": "Play basketball"},
            {"chinese": "公共汽车", "pinyin": "gōnggòng qìchē", "khmer": "ឡានក្រុង", "english": "Bus"},
            {"chinese": "踢足球", "pinyin": "tī zúqiú", "khmer": "ទាត់បាល់", "english": "Play soccer"},
            {"chinese": "学过", "pinyin": "xuéguò", "khmer": "ធ្លាប់រៀន", "english": "Learned before"},
            {"chinese": "把", "pinyin": "bǎ", "khmer": "យក / នាំ (ខ្នាតកាន់/បញ្ជា)", "english": "Take / Structural particle"},
            {"chinese": "别哭", "pinyin": "bié kū", "khmer": "កុំយំ", "english": "Don't cry"},
            {"chinese": "别睡", "pinyin": "bié shuì", "khmer": "កុំដេក", "english": "Don't sleep"},
            {"chinese": "别说", "pinyin": "bié shuō", "khmer": "កុំនិយាយ", "english": "Don't speak"},
            {"chinese": "别打", "pinyin": "bié dǎ", "khmer": "កុំវាយ (កុំលេង)", "english": "Don't hit / Don't play"}
        ]
        hsk2_p6_words = build_words_for_list(hsk2_p6_id, hsk2_p6_list)

        # HSK 2 Part 7 (Essential Vocabulary)
        hsk2_p7_id = lessons_map["HSK 2 Part 7 (HSK 2 ភាគ ៧)"]
        hsk2_p7_list = [
            {"chinese": "准备", "pinyin": "zhǔnbèi", "khmer": "ត្រៀមខ្លួន", "english": "To prepare / Get ready"},
            {"chinese": "运动", "pinyin": "yùndòng", "khmer": "កីឡា / ហាត់ប្រាណ", "english": "Sports / Exercise"},
            {"chinese": "旅游", "pinyin": "lǚyóu", "khmer": "ធ្វើដំណើរ / ដើរលេង", "english": "Travel / Tourism"},
            {"chinese": "眼睛", "pinyin": "yǎnjing", "khmer": "ភ្នែក", "english": "Eye"},
            {"chinese": "身体", "pinyin": "shēntǐ", "khmer": "រាងកាយ / សុខភាព", "english": "Body / Health"},
            {"chinese": "生病", "pinyin": "shēngbìng", "khmer": "ឈឺ / ធ្លាក់ខ្លួនឈឺ", "english": "To get sick"},
            {"chinese": "休息", "pinyin": "xiūxi", "khmer": "សម្រាក", "english": "To rest"},
            {"chinese": "介绍", "pinyin": "jièshào", "khmer": "ណែនាំ", "english": "To introduce"},
            {"chinese": "帮助", "pinyin": "bāngzhù", "khmer": "ជួយ", "english": "To help"},
            {"chinese": "知道", "pinyin": "zhīdào", "khmer": "ដឹង / ស្គាល់", "english": "To know"},
            {"chinese": "告诉", "pinyin": "gàosu", "khmer": "ប្រាប់", "english": "To tell"},
            {"chinese": "欢迎", "pinyin": "huānyíng", "khmer": "ស្វាគមន៍", "english": "Welcome"}
        ]
        hsk2_p7_words = build_words_for_list(hsk2_p7_id, hsk2_p7_list)

        # HSK 3 Part 3 (Words 365 to 389)
        hsk3_p3_id = lessons_map["HSK 3 Part 3 (HSK 3 ភាគ ៣)"]
        hsk3_p3_list = [
            {"chinese": "机会", "pinyin": "jīhuì", "khmer": "ឱកាស", "english": "Opportunity / Chance"},
            {"chinese": "画图", "pinyin": "huàtú", "khmer": "គូររូប", "english": "Draw a picture / Map"},
            {"chinese": "接", "pinyin": "jiē", "khmer": "ទទួល", "english": "Receive / Pick up"},
            {"chinese": "比赛", "pinyin": "bǐsài", "khmer": "ប្រកួត", "english": "Match / Competition"},
            {"chinese": "关系", "pinyin": "guānxi", "khmer": "ទំនាក់ទំនង", "english": "Relationship / Relation"},
            {"chinese": "马上", "pinyin": "mǎshàng", "khmer": "បន្ទាន់", "english": "Immediately / Right away"},
            {"chinese": "决定", "pinyin": "juédìng", "khmer": "សម្រេចចិត្ត", "english": "Decide / Decision"},
            {"chinese": "关于", "pinyin": "guānyú", "khmer": "អំពី", "english": "Regarding / About"},
            {"chinese": "难", "pinyin": "nán", "khmer": "ពិបាក", "english": "Difficult / Hard"},
            {"chinese": "了解", "pinyin": "liǎojiě", "khmer": "យល់ / ដឹង", "english": "Understand / Know well"},
            {"chinese": "站", "pinyin": "zhàn", "khmer": "ឈរ", "english": "Stand / Station"},
            {"chinese": "坐", "pinyin": "zuò", "khmer": "អង្គុយ", "english": "Sit"},
            {"chinese": "结束", "pinyin": "jiéshù", "khmer": "បញ្ចប់ / ឈប់", "english": "End / Finish"},
            {"chinese": "清楚", "pinyin": "qīngchu", "khmer": "ច្បាស់ / ច្បាស់លាស់", "english": "Clear / Distinct"},
            {"chinese": "愿意", "pinyin": "yuànyì", "khmer": "ស្ម័គ្រចិត្ត / ព្រម", "english": "Willing / Ready"},
            {"chinese": "花", "pinyin": "huā", "khmer": "ផ្កា / ចំណាយ", "english": "Flower / Spend"},
            {"chinese": "照片", "pinyin": "zhàopiàn", "khmer": "រូបថត", "english": "Photo / Picture"},
            {"chinese": "欢迎", "pinyin": "huānyíng", "khmer": "ស្វាគមន៍", "english": "Welcome"},
            {"chinese": "总是", "pinyin": "zǒngshì", "khmer": "តែងតែ", "english": "Always"},
            {"chinese": "嘴", "pinyin": "zuǐ", "khmer": "មាត់", "english": "Mouth"},
            {"chinese": "参加", "pinyin": "cānjiā", "khmer": "ចូលរួម", "english": "Participate / Join"},
            {"chinese": "办法", "pinyin": "bànfǎ", "khmer": "វិធីសាស្ត្រ", "english": "Method / Way"},
            {"chinese": "选择", "pinyin": "xuǎnzé", "khmer": "ជ្រើសរើស", "english": "Choose / Choice"},
            {"chinese": "坏", "pinyin": "huài", "khmer": "អាក្រក់", "english": "Bad / Broken"},
            {"chinese": "打算", "pinyin": "dǎsuàn", "khmer": "គ្រោង / គម្រោង", "english": "Plan / Intend"}
        ]
        hsk3_p3_words = build_words_for_list(hsk3_p3_id, hsk3_p3_list)

        # HSK 3 Part 4 (Words 390 to 414)
        hsk3_p4_id = lessons_map["HSK 3 Part 4 (HSK 3 ភាគ ៤)"]
        hsk3_p4_list = [
            {"chinese": "试", "pinyin": "shì", "khmer": "សាកល្បង", "english": "Try / Test"},
            {"chinese": "特别", "pinyin": "tèbié", "khmer": "ពិសេស", "english": "Special / Especially"},
            {"chinese": "注意", "pinyin": "zhùyì", "khmer": "ប្រុងប្រយ័ត្ន", "english": "Pay attention / Notice"},
            {"chinese": "其实", "pinyin": "qíshí", "khmer": "តាមពិតទៅ", "english": "Actually / In fact"},
            {"chinese": "小心", "pinyin": "xiǎoxīn", "khmer": "ប្រយ័ត្ន", "english": "Careful / Watch out"},
            {"chinese": "久", "pinyin": "jiǔ", "khmer": "យូរ", "english": "Long time"},
            {"chinese": "再", "pinyin": "zài", "khmer": "ទៀត (សកម្មភាពមិនទាន់ធ្វើ)", "english": "Again / Further"},
            {"chinese": "只有", "pinyin": "zhǐyǒu", "khmer": "មានតែ", "english": "Only"},
            {"chinese": "吗", "pinyin": "ma", "khmer": "ទេ?", "english": "Question particle"},
            {"chinese": "讲", "pinyin": "jiǎng", "khmer": "និយាយ / ពន្យល់", "english": "Speak / Tell / Explain"},
            {"chinese": "故事", "pinyin": "gùshi", "khmer": "រឿងនិទាន / រឿងរ៉ាវ", "english": "Story / Tale"},
            {"chinese": "换", "pinyin": "huàn", "khmer": "ដូរ", "english": "Change / Exchange"},
            {"chinese": "结婚", "pinyin": "jiéhūn", "khmer": "រៀបការ", "english": "Marry / Get married"},
            {"chinese": "批评", "pinyin": "pīpíng", "khmer": "រះគន់ / ស្ដីបន្ទោស", "english": "Criticize"},
            {"chinese": "努力", "pinyin": "nǔlì", "khmer": "ខិតខំប្រឹងប្រែង", "english": "Hardworking / Effort"},
            {"chinese": "害怕", "pinyin": "hàipà", "khmer": "ភ័យខ្លាច", "english": "Fear / Be afraid"},
            {"chinese": "发", "pinyin": "fā", "khmer": "ផ្ញើ", "english": "Send / Issue"},
            {"chinese": "刚才", "pinyin": "gāngcái", "khmer": "អម្បាញ់មិញ / ទើបតែ", "english": "Just now"},
            {"chinese": "节目", "pinyin": "jiémù", "khmer": "កម្មវិធី", "english": "Program / Show"},
            {"chinese": "辆", "pinyin": "liàng", "khmer": "គ្រឿង (ខ្នាតយានយន្ត)", "english": "Measure word for vehicles"},
            {"chinese": "万", "pinyin": "wàn", "khmer": "ម៉ឺន", "english": "Ten thousand"},
            {"chinese": "关", "pinyin": "guān", "khmer": "បិទ", "english": "Close / Turn off"},
            {"chinese": "开", "pinyin": "kāi", "khmer": "បើក", "english": "Open / Drive"},
            {"chinese": "解决", "pinyin": "jiějué", "khmer": "ដោះស្រាយ", "english": "Solve / Resolve"},
            {"chinese": "办公室", "pinyin": "bàngōngshì", "khmer": "ការិយាល័យ", "english": "Office"}
        ]
        hsk3_p4_words = build_words_for_list(hsk3_p4_id, hsk3_p4_list)

        # HSK 3 Part 5 (Words 415 to 440)
        hsk3_p5_id = lessons_map["HSK 3 Part 5 (HSK 3 ភាគ ៥)"]
        hsk3_p5_list = [
            {"chinese": "奇怪", "pinyin": "qíguài", "khmer": "ចម្លែក", "english": "Strange / Odd"},
            {"chinese": "同意", "pinyin": "tóngyì", "khmer": "យល់ព្រម / សុខចិត្ត", "english": "Agree"},
            {"chinese": "游戏", "pinyin": "yóuxì", "khmer": "ល្បែងកម្សាន្ត", "english": "Game / Play"},
            {"chinese": "帮忙", "pinyin": "bāngmáng", "khmer": "ជួយ (មនុស្សជួយគ្នា)", "english": "Help / Do a favor"},
            {"chinese": "国家", "pinyin": "guójiā", "khmer": "ប្រទេសជាតិ", "english": "Country / Nation"},
            {"chinese": "最近", "pinyin": "zuìjìn", "khmer": "ថ្មីៗនេះ / ជិតៗនេះ", "english": "Recently / Lately"},
            {"chinese": "声音", "pinyin": "shēngyīn", "khmer": "សំឡេង", "english": "Sound / Voice"},
            {"chinese": "可爱", "pinyin": "kě'ài", "khmer": "គួរឱ្យស្រឡាញ់", "english": "Cute / Lovely"},
            {"chinese": "分", "pinyin": "fēn", "khmer": "នាទី / ពិន្ទុ", "english": "Minute / Divide / Point"},
            {"chinese": "完成", "pinyin": "wánchéng", "khmer": "រួចរាល់", "english": "Complete / Finish"},
            {"chinese": "半", "pinyin": "bàn", "khmer": "កន្លះ", "english": "Half"},
            {"chinese": "要求", "pinyin": "yāoqiú", "khmer": "តម្រូវការ / សំណើ", "english": "Request / Requirement"},
            {"chinese": "除了", "pinyin": "chúle", "khmer": "ក្រៅពី", "english": "Except / Besides"},
            {"chinese": "容易", "pinyin": "róngyì", "khmer": "ងាយស្រួល", "english": "Easy / Simple"},
            {"chinese": "教", "pinyin": "jiāo", "khmer": "បង្រៀន", "english": "Teach"},
            {"chinese": "脸", "pinyin": "liǎn", "khmer": "ផ្ទៃមុខ", "english": "Face"},
            {"chinese": "简单", "pinyin": "jiǎndān", "khmer": "ងាយស្រួល / ធម្មតា", "english": "Simple / Easy"},
            {"chinese": "检查", "pinyin": "jiǎnchá", "khmer": "ពិនិត្យ / ត្រួតពិនិត្យ", "english": "Check / Examine"},
            {"chinese": "音乐", "pinyin": "yīnyuè", "khmer": "តន្ត្រី", "english": "Music"},
            {"chinese": "音乐会", "pinyin": "yīnyuèhuì", "khmer": "ការប្រគុំតន្ត្រី", "english": "Concert"},
            {"chinese": "越", "pinyin": "yuè", "khmer": "កាន់តែ", "english": "The more..."},
            {"chinese": "照顾", "pinyin": "zhàogù", "khmer": "ថែរក្សា", "english": "Take care of / Look after"},
            {"chinese": "聪明", "pinyin": "cōngming", "khmer": "ឆ្លាត", "english": "Smart / Clever"},
            {"chinese": "甜", "pinyin": "tián", "khmer": "ផ្អែម", "english": "Sweet"},
            {"chinese": "突然", "pinyin": "tūrán", "khmer": "ភ្លាមៗ / ភ្លាមៗនោះ", "english": "Suddenly"},
            {"chinese": "终于", "pinyin": "zhōngyú", "khmer": "ទីបំផុត / ចុងបញ្ចប់", "english": "Finally / At last"}
        ]
        hsk3_p5_words = build_words_for_list(hsk3_p5_id, hsk3_p5_list)

        # HSK 3 Part 6 (Words 441 to 466)
        hsk3_p6_id = lessons_map["HSK 3 Part 6 (HSK 3 ភាគ ៦)"]
        hsk3_p6_list = [
            {"chinese": "船", "pinyin": "chuán", "khmer": "ទូក", "english": "Boat / Ship"},
            {"chinese": "口", "pinyin": "kǒu", "khmer": "មាត់", "english": "Mouth / Measure word"},
            {"chinese": "回答", "pinyin": "huídá", "khmer": "ឆ្លើយតប", "english": "Answer / Reply"},
            {"chinese": "礼物", "pinyin": "lǐwù", "khmer": "កាដូ", "english": "Gift / Present"},
            {"chinese": "头发", "pinyin": "tóufa", "khmer": "សក់", "english": "Hair"},
            {"chinese": "关心", "pinyin": "guānxīn", "khmer": "យកចិត្តទុកដាក់", "english": "Care about / Concerned"},
            {"chinese": "脚", "pinyin": "jiǎo", "khmer": "ជើង", "english": "Foot / Leg"},
            {"chinese": "忘记", "pinyin": "wàngjì", "khmer": "ភ្លេច", "english": "Forget"},
            {"chinese": "搬", "pinyin": "bān", "khmer": "រើ", "english": "Move (objects/house)"},
            {"chinese": "楼", "pinyin": "lóu", "khmer": "ជាន់ / អគារ", "english": "Building / Floor"},
            {"chinese": "遇到", "pinyin": "yùdào", "khmer": "បានជួប / ជួបប្រទះ", "english": "Meet / Encounter"},
            {"chinese": "新闻", "pinyin": "xīnwén", "khmer": "ព័ត៌មាន", "english": "News"},
            {"chinese": "比较", "pinyin": "bǐjiào", "khmer": "ធៀបនឹង / ជាង", "english": "Compare / Relatively"},
            {"chinese": "双", "pinyin": "shuāng", "khmer": "គូ", "english": "Pair"},
            {"chinese": "见面", "pinyin": "jiànmiàn", "khmer": "ជួបគ្នា", "english": "Meet up / See each other"},
            {"chinese": "经常", "pinyin": "jīngcháng", "khmer": "ញឹកញាប់", "english": "Often / Frequently"},
            {"chinese": "城市", "pinyin": "chéngshì", "khmer": "ទីក្រុង", "english": "City"},
            {"chinese": "一会儿", "pinyin": "yíhuìr", "khmer": "មួយភ្លែត", "english": "A little while"},
            {"chinese": "附近", "pinyin": "fùjìn", "khmer": "ជិតៗនេះ", "english": "Nearby / Vicinity"},
            {"chinese": "借", "pinyin": "jiè", "khmer": "ខ្ចី", "english": "Borrow / Lend"},
            {"chinese": "影响", "pinyin": "yǐngxiǎng", "khmer": "ឥទ្ធិពល", "english": "Influence / Effect"},
            {"chinese": "认真", "pinyin": "rènzhēn", "khmer": "ម៉ត់ចត់", "english": "Serious / Earnest"},
            {"chinese": "米", "pinyin": "mǐ", "khmer": "អង្ករ / ម៉ែត្រ", "english": "Rice (uncooked) / Meter"},
            {"chinese": "差", "pinyin": "chà", "khmer": "ខ្វះ", "english": "Short of / Poor"},
            {"chinese": "银行", "pinyin": "yínháng", "khmer": "ធនាគារ", "english": "Bank"},
            {"chinese": "安静", "pinyin": "ānjìng", "khmer": "ស្ងប់ស្ងាត់", "english": "Quiet / Peaceful"}
        ]
        hsk3_p6_words = build_words_for_list(hsk3_p6_id, hsk3_p6_list)

        # HSK 3 Part 7 (Words 467 to 492)
        hsk3_p7_id = lessons_map["HSK 3 Part 7 (HSK 3 ភាគ ៧)"]
        hsk3_p7_list = [
            {"chinese": "多么", "pinyin": "duōme", "khmer": "បែបនេះ", "english": "How (wonderful, etc.) / So"},
            {"chinese": "饿", "pinyin": "è", "khmer": "ឃ្លាន", "english": "Hungry"},
            {"chinese": "包", "pinyin": "bāo", "khmer": "កាបូប", "english": "Bag / Wrap"},
            {"chinese": "几乎", "pinyin": "jīhū", "khmer": "ស្ទើរតែ", "english": "Almost / Nearly"},
            {"chinese": "后来", "pinyin": "hòulái", "khmer": "ក្រោយមកទៀត", "english": "Later / Afterwards"},
            {"chinese": "动物", "pinyin": "dòngwù", "khmer": "សត្វ", "english": "Animal"},
            {"chinese": "一边", "pinyin": "yìbiān", "khmer": "បណ្តើរ", "english": "On one hand / Simultaneously"},
            {"chinese": "舒服", "pinyin": "shūfu", "khmer": "ស្រួលខ្លួន", "english": "Comfortable"},
            {"chinese": "一般", "pinyin": "yìbān", "khmer": "ធម្មតា / ជាទូទៅ", "english": "General / Ordinary / Usually"},
            {"chinese": "叔叔", "pinyin": "shūshu", "khmer": "លោកពូ", "english": "Uncle"},
            {"chinese": "疼", "pinyin": "téng", "khmer": "ឈឺ", "english": "Painful / Hurt"},
            {"chinese": "歌声", "pinyin": "gēshēng", "khmer": "សំឡេងចម្រៀង", "english": "Singing voice"},
            {"chinese": "歌谱", "pinyin": "gēpǔ", "khmer": "សំរាប់បទចម្រៀង", "english": "Sheet music / Song score"},
            {"chinese": "不变", "pinyin": "búbiàn", "khmer": "មិនប្រែប្រួល", "english": "Unchanging / Constant"},
            {"chinese": "不妨", "pinyin": "bùfáng", "khmer": "មិនអីទេ", "english": "Might as well"},
            {"chinese": "不够", "pinyin": "búgòu", "khmer": "មិនគ្រប់គ្រាន់", "english": "Not enough / Insufficient"},
            {"chinese": "水沟", "pinyin": "shuǐgōu", "khmer": "ប្រឡាយទឹក", "english": "Ditch / Drain"},
            {"chinese": "水军", "pinyin": "shuǐjūn", "khmer": "កងទ័ពជើងទឹក", "english": "Navy / Water troops"},
            {"chinese": "水蛇", "pinyin": "shuǐshé", "khmer": "ពស់ទឹក", "english": "Water snake"},
            {"chinese": "水面", "pinyin": "shuǐmiàn", "khmer": "ផ្ទៃទឹក", "english": "Water surface"},
            {"chinese": "顽固", "pinyin": "wángù", "khmer": "រឹងរូស", "english": "Stubborn / Obstinate"},
            {"chinese": "悲歌", "pinyin": "bēigē", "khmer": "ចម្រៀងកម្សត់", "english": "Sad song / Elegy"},
            {"chinese": "悲惨", "pinyin": "bēicǎn", "khmer": "សោកសៅខ្លាំង", "english": "Tragic / Miserable"},
            {"chinese": "不幸", "pinyin": "búxìng", "khmer": "កំសត់/អកុសល", "english": "Unfortunate / Misfortune"},
            {"chinese": "保留", "pinyin": "bǎoliú", "khmer": "រក្សា", "english": "Preserve / Retain"},
            {"chinese": "迟到", "pinyin": "chídào", "khmer": "មកយឺត", "english": "Arrive late"}
        ]
        hsk3_p7_words = build_words_for_list(hsk3_p7_id, hsk3_p7_list)

        # HSK 3 Part 8 (Words 493 to 518)
        hsk3_p8_id = lessons_map["HSK 3 Part 8 (HSK 3 ភាគ ៨)"]
        hsk3_p8_list = [
            {"chinese": "历史", "pinyin": "lìshǐ", "khmer": "ប្រវត្តិសាស្ត្រ", "english": "History"},
            {"chinese": "啤酒", "pinyin": "píjiǔ", "khmer": "ស្រាបៀរ", "english": "Beer"},
            {"chinese": "短", "pinyin": "duǎn", "khmer": "ខ្លី", "english": "Short (length)"},
            {"chinese": "经过", "pinyin": "jīngguò", "khmer": "ឆ្លងកាត់", "english": "Pass through / Process"},
            {"chinese": "周末", "pinyin": "zhōumò", "khmer": "ចុងសប្តាហ៍", "english": "Weekend"},
            {"chinese": "班", "pinyin": "bān", "khmer": "ថ្នាក់", "english": "Class / Shift"},
            {"chinese": "习惯", "pinyin": "xíguàn", "khmer": "ទម្លាប់", "english": "Habit / Custom"},
            {"chinese": "公园", "pinyin": "gōngyuán", "khmer": "សួនច្បារ", "english": "Park"},
            {"chinese": "干净", "pinyin": "gānjìng", "khmer": "ស្អាតស្អំ", "english": "Clean"},
            {"chinese": "鸟", "pinyin": "niǎo", "khmer": "សត្វបក្សី", "english": "Bird"},
            {"chinese": "健康", "pinyin": "jiànkāng", "khmer": "សុខភាពល្អ", "english": "Healthy / Health"},
            {"chinese": "树", "pinyin": "shù", "khmer": "ដើមឈើ", "english": "Tree"},
            {"chinese": "蛋糕", "pinyin": "dàngāo", "khmer": "នំខេក", "english": "Cake"},
            {"chinese": "客人", "pinyin": "kèrén", "khmer": "ភ្ញៀវ", "english": "Guest / Customer"},
            {"chinese": "会议", "pinyin": "huìyì", "khmer": "ការប្រជុំ", "english": "Meeting / Conference"},
            {"chinese": "奶奶", "pinyin": "nǎinai", "khmer": "លោកយាយ", "english": "Paternal grandmother"},
            {"chinese": "爷爷", "pinyin": "yéye", "khmer": "លោកតា", "english": "Paternal grandfather"},
            {"chinese": "裤子", "pinyin": "kùzi", "khmer": "ខោ", "english": "Pants / Trousers"},
            {"chinese": "邻居", "pinyin": "línjū", "khmer": "អ្នកជិតខាង", "english": "Neighbor"},
            {"chinese": "经理", "pinyin": "jīnglǐ", "khmer": "អ្នកគ្រប់គ្រង", "english": "Manager"},
            {"chinese": "层", "pinyin": "céng", "khmer": "ជាន់", "english": "Layer / Story (floor)"},
            {"chinese": "灯", "pinyin": "dēng", "khmer": "សំភារៈភ្លើង / ចង្កៀង", "english": "Lamp / Light"},
            {"chinese": "练习", "pinyin": "liànxí", "khmer": "ធ្វើលំហាត់ / អនុវត្ត", "english": "Practice / Exercise"},
            {"chinese": "蓝", "pinyin": "lán", "khmer": "ខៀវ", "english": "Blue"},
            {"chinese": "难过", "pinyin": "nánguò", "khmer": "ពិបាកចិត្ត", "english": "Sad / Feel sorry"},
            {"chinese": "中间", "pinyin": "zhōngjiān", "khmer": "កណ្តាល", "english": "Middle / Between"}
        ]
        hsk3_p8_words = build_words_for_list(hsk3_p8_id, hsk3_p8_list)


        all_words = (greetings_words + numbers_words + food_words + 
                     fruits_part1_words + fruits_part2_words + fruits_part3_words + fruits_part4_words + 
                     sports_words + colors_words + animals_words + health_words + 
                     hsk1_p1_words + hsk1_p2_words + hsk1_p3_words + hsk1_p4_words + hsk1_p5_words + hsk1_p6_words + 
                     hsk2_p1_words + hsk2_p2_words + hsk2_p3_words + hsk2_p4_words + hsk2_p5_words + hsk2_p6_words + hsk2_p7_words + 
                     hsk3_p1_words + hsk3_p2_words + hsk3_p3_words + hsk3_p4_words + hsk3_p5_words + hsk3_p6_words + hsk3_p7_words + hsk3_p8_words + cny_words)
        cursor.executemany("INSERT INTO words (lesson_id, chinese, pinyin, english, options) VALUES (?, ?, ?, ?, ?)", all_words)
        conn.commit()
        print("Database seeding completed.")

if __name__ == '__main__':
    # When run directly, we force a database reset to refresh the seeds
    init_db(force=True)
