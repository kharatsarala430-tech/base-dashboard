import React, { useState, useEffect } from "react";
import { CheckSquare, FileText, MessageSquare, Bell, Plus, Send, Circle, CheckCircle2, Home, Flame, Clock, TrendingUp, Trash2, X } from "lucide-react";

// IMPORTANT: change this to your deployed backend URL once Render is live.
// For local testing on Replit, this points to the same Repl's backend port.
const API_BASE = "https://base-dashboard-dc4m.onrender.com/api";

export default function Dashboard() {
  const [tab, setTab] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [overview, setOverview] = useState({ total_tasks: 0, done_tasks: 0, completion_pct: 0 });
  const [loading, setLoading] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hey Sarthak. Base is online. Real AI chat comes in Phase 3." }
  ]);

  // ---------- Load everything from backend on first render ----------
  const fetchAll = async () => {
    try {
      const [tRes, nRes, rRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/notes`),
        fetch(`${API_BASE}/reminders`),
        fetch(`${API_BASE}/overview`),
      ]);
      setTasks(await tRes.json());
      setNotes(await nRes.json());
      setReminders(await rRes.json());
      setOverview(await oRes.json());
    } catch (err) {
      console.error("Failed to load data — is the backend running?", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ---------- Tasks ----------
  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle, due_date: newTaskDue || null }),
    });
    const created = await res.json();
    setTasks([created, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDue("");
    setShowTaskForm(false);
    fetchAll(); // refresh overview stats too
  };

  const toggleTask = async (task) => {
    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const updated = await res.json();
    setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    fetchAll();
  };

  const deleteTask = async (id) => {
    await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    setTasks(tasks.filter((t) => t.id !== id));
    fetchAll();
  };

  // ---------- Notes ----------
  const addNote = async () => {
    if (!newNoteTitle.trim()) return;
    const res = await fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newNoteTitle, content: newNoteContent }),
    });
    const created = await res.json();
    setNotes([created, ...notes]);
    setNewNoteTitle("");
    setNewNoteContent("");
    setShowNoteForm(false);
  };

  const deleteNote = async (id) => {
    await fetch(`${API_BASE}/notes/${id}`, { method: "DELETE" });
    setNotes(notes.filter((n) => n.id !== id));
  };

  // ---------- Reminders ----------
  const addReminder = async () => {
    if (!newReminderTitle.trim() || !newReminderTime) return;
    const res = await fetch(`${API_BASE}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newReminderTitle, remind_time: newReminderTime }),
    });
    const created = await res.json();
    setReminders([...reminders, created]);
    setNewReminderTitle("");
    setNewReminderTime("");
    setShowReminderForm(false);
  };

  const deleteReminder = async (id) => {
    await fetch(`${API_BASE}/reminders/${id}`, { method: "DELETE" });
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { from: "user", text: chatInput }, { from: "ai", text: "AI response coming soon — wired up in Phase 3." }]);
    setChatInput("");
  };

  const navItems = [
    { id: "home", label: "Overview", icon: Home },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
    { id: "reminders", label: "Reminders", icon: Bell },
  ];
  const titles = { home: "Overview", tasks: "Tasks", notes: "Notes", chat: "AI Chat", reminders: "Reminders" };

  return (
    <div style={{ minHeight: "100vh", background: "#0F1419", color: "#E6EDF3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #1C2530" }}>
        <div style={{ fontSize: "13px", letterSpacing: "1.5px", color: "#4FD1C5", fontWeight: 600, textTransform: "uppercase" }}>Base</div>
        <div style={{ fontSize: "22px", fontWeight: 700, marginTop: "2px" }}>{titles[tab]}</div>
      </div>

      <div style={{ flex: 1, padding: "16px", overflowY: "auto", paddingBottom: "90px" }}>

        {loading && <div style={{ textAlign: "center", color: "#5A6772", padding: "40px 0" }}>Loading...</div>}

        {!loading && tab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F5A623" }}>
                  <Flame size={18} />
                  <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Total Tasks</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "6px", fontFamily: "monospace" }}>{overview.total_tasks}</div>
              </div>
              <div style={{ flex: 1, background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4FD1C5" }}>
                  <TrendingUp size={18} />
                  <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Completed</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "6px", fontFamily: "monospace" }}>{overview.completion_pct}%</div>
              </div>
            </div>
            <div style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "13px", color: "#8B98A5" }}>{overview.done_tasks} of {overview.total_tasks} tasks done. Add tasks in the Tasks tab to see this grow.</div>
            </div>
          </div>
        )}

        {!loading && tab === "tasks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tasks.length === 0 && <div style={{ color: "#5A6772", textAlign: "center", padding: "20px 0" }}>No tasks yet. Add your first one below.</div>}
            {tasks.map((t) => (
              <div key={t.id} style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={() => toggleTask(t)} style={{ background: "none", border: "none", padding: 0, display: "flex" }}>
                  {t.done ? <CheckCircle2 size={20} color="#4FD1C5" /> : <Circle size={20} color="#3A4650" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", textDecoration: t.done ? "line-through" : "none", color: t.done ? "#5A6772" : "#E6EDF3" }}>{t.title}</div>
                  {t.due_date && <div style={{ fontSize: "12px", color: "#5A6772", marginTop: "2px", fontFamily: "monospace" }}>{t.due_date}</div>}
                </div>
                <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", padding: 4 }}>
                  <Trash2 size={16} color="#5A6772" />
                </button>
              </div>
            ))}

            {!showTaskForm && <button onClick={() => setShowTaskForm(true)} style={addButtonStyle}><Plus size={18} /> Add Task</button>}
            {showTaskForm && (
              <div style={{ background: "#151C24", border: "1px solid #2A3540", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" style={inputStyle} autoFocus />
                <input value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} placeholder="Due date (e.g. Fri, Tomorrow)" style={inputStyle} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addTask} style={saveButtonStyle}>Save</button>
                  <button onClick={() => setShowTaskForm(false)} style={cancelButtonStyle}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notes.length === 0 && <div style={{ color: "#5A6772", textAlign: "center", padding: "20px 0" }}>No notes yet.</div>}
            {notes.map((n) => (
              <div key={n.id} style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "12px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "15px", fontWeight: 600 }}>{n.title}</div>
                  <button onClick={() => deleteNote(n.id)} style={{ background: "none", border: "none", padding: 2 }}>
                    <Trash2 size={14} color="#5A6772" />
                  </button>
                </div>
                <div style={{ fontSize: "13px", color: "#8B98A5", marginTop: "4px" }}>{n.content}</div>
              </div>
            ))}

            {!showNoteForm && <button onClick={() => setShowNoteForm(true)} style={addButtonStyle}><Plus size={18} /> Add Note</button>}
            {showNoteForm && (
              <div style={{ background: "#151C24", border: "1px solid #2A3540", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} placeholder="Note title" style={inputStyle} autoFocus />
                <textarea value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} placeholder="Write something..." style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addNote} style={saveButtonStyle}>Save</button>
                  <button onClick={() => setShowNoteForm(false)} style={cancelButtonStyle}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                  background: m.from === "user" ? "#4FD1C5" : "#151C24",
                  color: m.from === "user" ? "#0F1419" : "#E6EDF3",
                  border: m.from === "ai" ? "1px solid #1C2530" : "none",
                  borderRadius: "14px", padding: "10px 14px", maxWidth: "80%", fontSize: "14px"
                }}>{m.text}</div>
              ))}
            </div>
          </div>
        )}

        {!loading && tab === "reminders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reminders.length === 0 && <div style={{ color: "#5A6772", textAlign: "center", padding: "20px 0" }}>No reminders yet.</div>}
            {reminders.map((r) => (
              <div key={r.id} style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "12px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "15px" }}>{r.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#F5A623", fontFamily: "monospace", fontWeight: 600 }}>{r.remind_time}</span>
                  <button onClick={() => deleteReminder(r.id)} style={{ background: "none", border: "none", padding: 2 }}>
                    <Trash2 size={14} color="#5A6772" />
                  </button>
                </div>
              </div>
            ))}

            {!showReminderForm && <button onClick={() => setShowReminderForm(true)} style={addButtonStyle}><Plus size={18} /> Add Reminder</button>}
            {showReminderForm && (
              <div style={{ background: "#151C24", border: "1px solid #2A3540", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input value={newReminderTitle} onChange={(e) => setNewReminderTitle(e.target.value)} placeholder="Reminder title" style={inputStyle} autoFocus />
                <input value={newReminderTime} onChange={(e) => setNewReminderTime(e.target.value)} placeholder="Time (e.g. 6:00 PM)" style={inputStyle} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addReminder} style={saveButtonStyle}>Save</button>
                  <button onClick={() => setShowReminderForm(false)} style={cancelButtonStyle}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {tab === "chat" && (
        <div style={{ position: "fixed", bottom: "64px", left: 0, right: 0, padding: "10px 16px", background: "#0F1419", borderTop: "1px solid #1C2530", display: "flex", gap: "8px" }}>
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Ask anything..." style={{ flex: 1, background: "#151C24", border: "1px solid #1C2530", borderRadius: "20px", padding: "10px 16px", color: "#E6EDF3", fontSize: "14px", outline: "none" }} />
          <button onClick={sendMessage} style={{ background: "#4FD1C5", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={18} color="#0F1419" />
          </button>
        </div>
      )}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0B0F13", borderTop: "1px solid #1C2530", display: "flex", justifyContent: "space-around", padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: active ? "#4FD1C5" : "#5A6772", padding: "4px 8px" }}>
              <Icon size={19} />
              <span style={{ fontSize: "10px", fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const addButtonStyle = { background: "transparent", border: "1px dashed #2A3540", borderRadius: "12px", padding: "12px", color: "#8B98A5", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "4px" };
const inputStyle = { background: "#0F1419", border: "1px solid #2A3540", borderRadius: "8px", padding: "10px 12px", color: "#E6EDF3", fontSize: "14px", outline: "none", fontFamily: "inherit" };
const saveButtonStyle = { flex: 1, background: "#4FD1C5", border: "none", borderRadius: "8px", padding: "10px", color: "#0F1419", fontWeight: 600, fontSize: "14px" };
const cancelButtonStyle = { flex: 1, background: "transparent", border: "1px solid #2A3540", borderRadius: "8px", padding: "10px", color: "#8B98A5", fontSize: "14px" };
