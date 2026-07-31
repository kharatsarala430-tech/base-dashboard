"""
Base - Personal Dashboard Backend
FastAPI + SQLite

Simple logic: this file creates a web server with "endpoints" (URLs) that the
frontend calls to save/fetch/update/delete Tasks, Notes, and Reminders.
Everything is stored in a single SQLite file (base.db) sitting next to this script.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import os
import httpx
from datetime import datetime
from contextlib import contextmanager

app = FastAPI(title="Base - Personal Dashboard API")

# CORS: allows the frontend (running on a different port/domain) to talk to this backend.
# In production we'll restrict this to your actual Netlify URL instead of "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "base.db"

# Gemini API key — set this as an Environment Variable on Render, never hardcode it here.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-flash-latest"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SYSTEM_PROMPT = """You are "Base", Sarthak's personal AI mentor inside his self-built personal dashboard.

About Sarthak:
- Incoming B.E. Artificial Intelligence & Data Science student at PREC Loni (SPPU), batch of 2030.
- Solo founder building two projects: Sakha (a B2B EdTech platform for Indian engineering colleges) and SAI (his long-term personal agentic AI dream project).
- Currently has no laptop, works entirely from mobile via Replit/GitHub/Netlify/Render.
- Still learning Python, Maths, DSA, and English.
- Prefers Hinglish (Hindi-English mix) communication, with simple explanations and real-life analogies.
- Values honest, mentor-like guidance over fast, assumption-heavy answers.

How to respond:
- Always reply in Hinglish, warm and encouraging but honest — like a trusted mentor, not a generic assistant.
- Keep explanations simple and step-by-step for technical topics; use analogies where helpful.
- If Sarthak seems to be avoiding an urgent real-world task (like customer interviews) in favor of new side projects, gently flag it — this is a known pattern for him.
- Be concise on mobile — avoid overly long responses unless he asks for depth.
"""


@contextmanager
def get_db():
    """Opens a database connection, yields it, always closes it after (even on error)."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name, like a dict
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Creates the tables if they don't already exist. Safe to run every startup."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                due_date TEXT,
                category TEXT NOT NULL DEFAULT 'Other',
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
        """)
        # Migration: add columns if upgrading from an older version of the table
        existing_cols = [row["name"] for row in conn.execute("PRAGMA table_info(tasks)").fetchall()]
        if "category" not in existing_cols:
            conn.execute("ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'")
        if "completed_at" not in existing_cols:
            conn.execute("ALTER TABLE tasks ADD COLUMN completed_at TEXT")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                remind_time TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


init_db()


# ---------- Pydantic models: define the "shape" of data coming in from the frontend ----------

class TaskCreate(BaseModel):
    title: str
    due_date: Optional[str] = None
    category: Optional[str] = "Other"  # Sakha, SAI, DSA, Other


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    done: Optional[bool] = None


class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = ""


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class ReminderCreate(BaseModel):
    title: str
    remind_time: str


class ChatMessageCreate(BaseModel):
    content: str


# ---------------------------- TASKS ----------------------------

@app.get("/api/tasks")
def list_tasks():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM tasks ORDER BY done ASC, id DESC").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/tasks")
def create_task(task: TaskCreate):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO tasks (title, due_date, category, done, created_at) VALUES (?, ?, ?, 0, ?)",
            (task.title, task.due_date, task.category or "Other", datetime.utcnow().isoformat())
        )
        return {"id": cur.lastrowid, **task.dict(), "done": False}


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        updates = task.dict(exclude_unset=True)
        if "done" in updates:
            updates["done"] = 1 if updates["done"] else 0
            # Track when it was completed (for streaks and daily graphs). Clear it if un-done.
            updates["completed_at"] = datetime.utcnow().isoformat() if updates["done"] else None
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            conn.execute(f"UPDATE tasks SET {set_clause} WHERE id = ?", (*updates.values(), task_id))
        return dict(conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone())


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        return {"deleted": True}


# ---------------------------- NOTES ----------------------------

@app.get("/api/notes")
def list_notes():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM notes ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/notes")
def create_note(note: NoteCreate):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO notes (title, content, created_at) VALUES (?, ?, ?)",
            (note.title, note.content, datetime.utcnow().isoformat())
        )
        return {"id": cur.lastrowid, **note.dict()}


@app.patch("/api/notes/{note_id}")
def update_note(note_id: int, note: NoteUpdate):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")
        updates = note.dict(exclude_unset=True)
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", (*updates.values(), note_id))
        return dict(conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone())


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        return {"deleted": True}


# ---------------------------- REMINDERS ----------------------------

@app.get("/api/reminders")
def list_reminders():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM reminders ORDER BY remind_time ASC").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/reminders")
def create_reminder(reminder: ReminderCreate):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO reminders (title, remind_time, created_at) VALUES (?, ?, ?)",
            (reminder.title, reminder.remind_time, datetime.utcnow().isoformat())
        )
        return {"id": cur.lastrowid, **reminder.dict()}


@app.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        return {"deleted": True}


# ---------------------------- AI CHAT ----------------------------

@app.get("/api/chat")
def get_chat_history():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM chat_messages ORDER BY id ASC").fetchall()
        return [dict(r) for r in rows]


@app.post("/api/chat")
async def send_chat_message(message: ChatMessageCreate):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")

    with get_db() as conn:
        # Save the user's message first
        conn.execute(
            "INSERT INTO chat_messages (role, content, created_at) VALUES (?, ?, ?)",
            ("user", message.content, datetime.utcnow().isoformat())
        )

        # Pull recent history (last 20 messages) to give Gemini conversational context
        history_rows = conn.execute(
            "SELECT role, content FROM chat_messages ORDER BY id DESC LIMIT 20"
        ).fetchall()
        history_rows = list(reversed(history_rows))  # oldest first

        # Build Gemini's expected "contents" format
        contents = []
        for row in history_rows:
            gemini_role = "model" if row["role"] == "ai" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": row["content"]}]})

        payload = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            ai_text = f"Sorry, AI se connect nahi ho paya. Error: {str(e)}"

        # Save the AI's reply
        conn.execute(
            "INSERT INTO chat_messages (role, content, created_at) VALUES (?, ?, ?)",
            ("ai", ai_text, datetime.utcnow().isoformat())
        )

        return {"role": "ai", "content": ai_text}


@app.delete("/api/chat")
def clear_chat_history():
    with get_db() as conn:
        conn.execute("DELETE FROM chat_messages")
        return {"cleared": True}


# ---------------------------- OVERVIEW (for Phase 1's dashboard stats) ----------------------------

@app.get("/api/overview")
def get_overview():
    """Real stats to power the Overview/Home screen: totals, 7-day trend, streak, category split."""
    from datetime import timedelta

    with get_db() as conn:
        total_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks").fetchone()["c"]
        done_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks WHERE done = 1").fetchone()["c"]
        completion_pct = round((done_tasks / total_tasks) * 100) if total_tasks > 0 else 0

        # ---- Last 7 days: how many tasks completed each day ----
        today = datetime.utcnow().date()
        daily_counts = []
        day_labels = []
        for i in range(6, -1, -1):  # 6 days ago ... today
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            count = conn.execute(
                "SELECT COUNT(*) as c FROM tasks WHERE completed_at IS NOT NULL AND date(completed_at) = ?",
                (day_str,)
            ).fetchone()["c"]
            daily_counts.append(count)
            day_labels.append(day.strftime("%a")[0])  # first letter: M, T, W...

        # ---- Streak: consecutive days (ending today or yesterday) with at least 1 completed task ----
        streak = 0
        check_day = today
        while True:
            count = conn.execute(
                "SELECT COUNT(*) as c FROM tasks WHERE completed_at IS NOT NULL AND date(completed_at) = ?",
                (check_day.isoformat(),)
            ).fetchone()["c"]
            if count > 0:
                streak += 1
                check_day = check_day - timedelta(days=1)
            else:
                # Allow today to be "in progress" without breaking the streak
                if check_day == today:
                    check_day = check_day - timedelta(days=1)
                    continue
                break

        # ---- Category split: % of tasks per category ----
        category_rows = conn.execute(
            "SELECT category, COUNT(*) as c FROM tasks GROUP BY category"
        ).fetchall()
        category_split = []
        if total_tasks > 0:
            for row in category_rows:
                pct = round((row["c"] / total_tasks) * 100)
                category_split.append({"label": row["category"], "count": row["c"], "pct": pct})

        # ---- Upcoming: tasks with a due_date that aren't done yet ----
        upcoming = conn.execute(
            "SELECT title, due_date FROM tasks WHERE done = 0 AND due_date IS NOT NULL AND due_date != '' ORDER BY id DESC LIMIT 5"
        ).fetchall()

        # ---- Reminders: show the next few upcoming ones on the Overview screen too ----
        reminders_preview = conn.execute(
            "SELECT title, remind_time FROM reminders ORDER BY remind_time ASC LIMIT 3"
        ).fetchall()

        return {
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "completion_pct": completion_pct,
            "streak": streak,
            "daily_counts": daily_counts,
            "day_labels": day_labels,
            "category_split": category_split,
            "upcoming": [dict(u) for u in upcoming],
            "reminders_preview": [dict(r) for r in reminders_preview],
        }


@app.get("/")
def health_check():
    return {"status": "Base backend is running"}
