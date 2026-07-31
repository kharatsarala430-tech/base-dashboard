import React, { useState, useEffect } from "react";
import { CheckSquare, FileText, MessageSquare, Bell, Plus, Send, Circle, CheckCircle2, Home, Flame, Clock, TrendingUp, Trash2, X } from "lucide-react";

// IMPORTANT: change this to your deployed backend URL once Render is live.
// For local testing on Replit, this points to the same Repl's backend port.
const API_BASE = "http://localhost:8000/api";

export default function Dashboard() {
  const [tab, setTab] = useState("home");
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [overview, setOverview] = useState({ total_tasks: 0, done_tasks: 0, completion_pct: 0, streak: 0, daily_counts: [0,0,0,0,0,0,0], day_labels: ["M","T","W","T","F","S","S"], category_split: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("Other");
  const CATEGORIES = ["Sakha", "SAI", "DSA", "Other"];
  const CATEGORY_COLORS = { Sakha: "#4FD1C5", SAI: "#8B7EFF", DSA: "#F5A623", Other: "#5A6772" };

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // ---------- Load everything from backend on first render ----------
  const fetchAll = async () => {
    try {
      const [tRes, nRes, rRes, oRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks`),
        fetch(`${API_BASE}/notes`),
        fetch(`${API_BASE}/reminders`),
        fetch(`${API_BASE}/overview`),
        fetch(`${API_BASE}/chat`),
      ]);
      setTasks(await tRes.json());
      setNotes(await nRes.json());
      setReminders(await rRes.json());
      setOverview(await oRes.json());
      const chatHistory = await cRes.json();
      setMessages(chatHistory.map(m => ({ from: m.role, text: m.content })));
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
      body: JSON.stringify({ title: newTaskTitle, due_date: newTaskDue || null, category: newTaskCategory }),
    });
    const created = await res.json();
    setTasks([created, ...tasks]);
    setNewTaskTitle("");
    setNewTaskDue("");
    setNewTaskCategory("Other");
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

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput;
    setMessages([...messages, { from: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { from: "ai", text: data.content }]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: "ai", text: "Connection error — backend se baat nahi ho payi." }]);
    } finally {
      setChatLoading(false);
    }
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

            {/* Streak + Completion row */}
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F5A623" }}>
                  <Flame size={18} />
                  <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Streak</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "6px", fontFamily: "monospace" }}>{overview.streak}</div>
                <div style={{ fontSize: "11px", color: "#5A6772" }}>day{overview.streak === 1 ? "" : "s"} active</div>
              </div>
              <div style={{ flex: 1, background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4FD1C5" }}>
                  <TrendingUp size={18} />
                  <span style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>Completed</span>
                </div>
                <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "6px", fontFamily: "monospace" }}>{overview.completion_pct}%</div>
                <div style={{ fontSize: "11px", color: "#5A6772" }}>{overview.done_tasks} of {overview.total_tasks} tasks</div>
              </div>
            </div>

            {/* Daily bar chart - last 7 days */}
            <div style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B98A5", marginBottom: "14px" }}>Tasks Completed (Last 7 Days)</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
                {overview.daily_counts.map((val, i) => {
                  const maxVal = Math.max(...overview.daily_counts, 1);
                  const heightPct = (val / maxVal) * 100;
                  const isToday = i === overview.daily_counts.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "100%", height: `${Math.max(heightPct, val > 0 ? 8 : 2)}%`, background: isToday ? "#4FD1C5" : "#2A3540", borderRadius: "4px", minHeight: "4px" }} />
                      <span style={{ fontSize: "10px", color: "#5A6772" }}>{overview.day_labels[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category split */}
            {overview.category_split.length > 0 && (
              <div style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B98A5", marginBottom: "12px" }}>Where Your Tasks Go</div>
                <div style={{ display: "flex", width: "100%", height: "10px", borderRadius: "6px", overflow: "hidden", marginBottom: "12px" }}>
                  {overview.category_split.map((c, i) => (
                    <div key={i} style={{ width: `${c.pct}%`, background: CATEGORY_COLORS[c.label] || "#5A6772" }} />
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {overview.category_split.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: CATEGORY_COLORS[c.label] || "#5A6772" }} />
                        <span style={{ color: "#C5D0DB" }}>{c.label}</span>
                      </div>
                      <span style={{ fontFamily: "monospace", color: "#8B98A5" }}>{c.pct}% ({c.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {overview.upcoming.length > 0 && (
              <div style={{ background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <Clock size={16} color="#8B98A5" />
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#8B98A5" }}>Coming Up</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {overview.upcoming.map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: "12px", borderLeft: "2px solid #2A3540" }}>
                      <span style={{ fontSize: "14px", color: "#E6EDF3" }}>{t.title}</span>
                      <span style={{ fontSize: "12px", color: "#5A6772", fontFamily: "monospace" }}>{t.due_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {overview.total_tasks === 0 && (
              <div style={{ fontSize: "13px", color: "#5A6772", textAlign: "center", padding: "20px 0" }}>
                Add your first task to see your progress here.
              </div>
            )}
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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                    {t.due_date && <span style={{ fontSize: "12px", color: "#5A6772", fontFamily: "monospace" }}>{t.due_date}</span>}
                    {t.category && <span style={{ fontSize: "10px", color: CATEGORY_COLORS[t.category] || "#5A6772", fontWeight: 600 }}>{t.category}</span>}
                  </div>
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
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewTaskCategory(cat)}
                      style={{
                        background: newTaskCategory === cat ? CATEGORY_COLORS[cat] : "transparent",
                        color: newTaskCategory === cat ? "#0F1419" : "#8B98A5",
                        border: `1px solid ${newTaskCategory === cat ? CATEGORY_COLORS[cat] : "#2A3540"}`,
                        borderRadius: "16px", padding: "5px 12px", fontSize: "12px", fontWeight: 600
                      }}
                    >{cat}</button>
                  ))}
                </div>
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
              {messages.length === 0 && (
                <div style={{ alignSelf: "flex-start", background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "10px 14px", maxWidth: "80%", fontSize: "14px" }}>
                  Hey Sarthak. Base is online — kuch bhi pooch sakta hai.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                  background: m.from === "user" ? "#4FD1C5" : "#151C24",
                  color: m.from === "user" ? "#0F1419" : "#E6EDF3",
                  border: m.from === "ai" ? "1px solid #1C2530" : "none",
                  borderRadius: "14px", padding: "10px 14px", maxWidth: "80%", fontSize: "14px", whiteSpace: "pre-wrap"
                }}>{m.text}</div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", background: "#151C24", border: "1px solid #1C2530", borderRadius: "14px", padding: "10px 14px", fontSize: "14px", color: "#5A6772" }}>
                  Typing...
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "reminders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {reminders.length === 0 && <div style={{ color: "#5A6772", textAlign: "center", padding: "20px 0" }}>No reminders yet.</div>}
            {reminders.map((r) => 
