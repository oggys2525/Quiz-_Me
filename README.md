# 🐉 Quiz Me - Chinese Vocabulary Learning App

A premium, highly responsive web application designed to help users learn Chinese words through gamified quizzes. 

Built with a **Pink, White, and Black** modern dark aesthetic, featuring fluid animations, timing elements, live score tracking, an interactive leaderboard, and an admin dashboard for adding lessons and vocabulary.

---

## 🚀 How to Run the App

Both servers are currently running in your environment. You can open and test the app right away by visiting:
👉 **[http://localhost:8000](http://localhost:8000)**

### 🔑 Test Accounts
The database has been seeded with two default accounts:

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Student** | `user` | `user123` |

---

## 🛠️ Project Structure
As requested, the code has been split into neat, distinct folders to separate the Python backend and web frontend:

```
Quiz_Me/
├── backend/
│   ├── app.py           # Python Flask API Server (Ports & routing)
│   ├── database.py      # SQLite Database setup and initial seed data
│   └── database.db      # SQLite database file (auto-generated)
├── frontend/
│   ├── index.html       # Main HTML UI structure
│   ├── css/
│   │   └── style.css    # Premium CSS design, animations, & variables
│   └── js/
│       ├── config.js    # Global API URL configuration
│       ├── auth.js      # Session login, register, and point management
│       ├── quiz.js      # Quiz core gameplay logic, timer, and score summaries
│       ├── admin.js     # Admin panels, adding/deleting words & lessons
│       └── app.js       # Main orchestrator (tab switching, UI updates)
└── README.md            # App Documentation
```

---

## ✨ Features Implemented

1. **User Authentication**:
   - Clean register and login forms.
   - Sessions are persistent (reloading page keeps you logged in).
   - Dynamic user header showing active username, points, and role badges.

2. **Gamified Quizzes**:
   - Dynamic query of words from the selected lesson.
   - Question counter & progress bar.
   - **Immediate Correct/Wrong feedback**: Selected options animate instantly (green glow/pulse for correct, red shake for incorrect). Incorrect answers also reveal the correct one.
   - **10-Second Countdowns**: A smooth shrinking timer bar represents the limit. Speed-bonus points are awarded for fast correct answers.

3. **Global Leaderboard**:
   - Real-time ranking of students based on their accumulated points.
   - Special gold, silver, and bronze badges for the top 3 spots.

4. **Full Admin Control Panel**:
   - Only visible to users with the `admin` role.
   - Create new lessons with custom titles and descriptions.
   - Add new Chinese words to lessons (supports inputting character, pinyin, correct English translation, and 4 distractors).
   - Delete lessons or words dynamically with instant updates.

5. **Premium Design**:
   - Stunning pink-accented dark mode (`#ff2a74` main pink, white fonts, and deep black backgrounds).
   - Card-based layouts, gradient overlays, and dynamic hover scales.
   - Highly responsive (optimized for both desktop monitors and mobile touchscreens).
