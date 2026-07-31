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
from typing import Optional
import sqlite3
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
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
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


init_db()


# ---------- Pydantic models: define the "shape" of data coming in from the frontend ----------

class TaskCreate(BaseModel):
    title: str
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
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
            "INSERT INTO tasks (title, due_date, done, created_at) VALUES (?, ?, 0, ?)",
            (task.title, task.due_date, datetime.utcnow().isoformat())
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


# ---------------------------- OVERVIEW (for Phase 1's dashboard stats) ----------------------------

@app.get("/api/overview")
def get_overview():
    """Real stats to replace the dummy data on the Overview/Home screen."""
    with get_db() as conn:
        total_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks").fetchone()["c"]
        done_tasks = conn.execute("SELECT COUNT(*) as c FROM tasks WHERE done = 1").fetchone()["c"]
        completion_pct = round((done_tasks / total_tasks) * 100) if total_tasks > 0 else 0
        return {
            "total_tasks": total_tasks,
            "done_tasks": done_tasks,
            "completion_pct": completion_pct,
        }


@app.get("/")
def health_check():
    return {"status": "Base backend is running"}
