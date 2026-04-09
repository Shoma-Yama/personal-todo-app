"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabase";

type Priority = "high" | "medium" | "low";
type ViewMode = "all" | "category" | "completed";
type Task = { id: string; title: string; dueDate: string | null; priority: Priority; category: string; notes: string; completed: boolean };
type Draft = { title: string; dueDate: string; priority: Priority; category: string; notes: string };
type Row = { id: string; title: string; due_date: string | null; priority: string; category: string | null; notes: string | null; is_completed: boolean };

const supabase = getSupabaseClient();
const emptyDraft: Draft = { title: "", dueDate: "", priority: "medium", category: "", notes: "" };
const seed: Task[] = [
  { id: "1", title: "サプライヤーへ見積もり確認の返信", dueDate: "2026-04-10", priority: "high", category: "仕事", notes: "午前中に返したい", completed: false },
  { id: "2", title: "PWA導入の流れを整理する", dueDate: "2026-04-12", priority: "medium", category: "開発", notes: "", completed: false },
];
const rank = { high: 0, medium: 1, low: 2 } as const;
const labels = { high: "High", medium: "Medium", low: "Low" } as const;

function mapRow(row: Row): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    priority: (row.priority as Priority) || "medium",
    category: row.category ?? "",
    notes: row.notes ?? "",
    completed: row.is_completed,
  };
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return rank[a.priority] - rank[b.priority];
  });
}

function formatDate(input: string | null) {
  if (!input) return "期限なし";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(input));
}

function deadlineState(input: string | null) {
  if (!input) return "none";
  const today = new Date("2026-04-10T00:00:00");
  const target = new Date(`${input}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return "future";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [categories, setCategories] = useState<string[]>(["仕事", "開発"]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [query, setQuery] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [newCategory, setNewCategory] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setReady(true);
        return;
      }
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = sortTasks((data as Row[]).map(mapRow));
        setTasks(mapped);
        setCategories(Array.from(new Set(mapped.map((t) => t.category).filter(Boolean))));
      }
      setReady(true);
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTasks(tasks).filter((t) => {
      if (viewMode === "completed" && !t.completed) return false;
      if (viewMode !== "completed" && t.completed) return false;
      if (!q) return true;
      return [t.title, t.category, t.notes].join(" ").toLowerCase().includes(q);
    });
  }, [query, tasks, viewMode]);

  const groups = useMemo(() => {
    if (viewMode !== "category") return [{ title: viewMode === "completed" ? "完了済み" : "全体", tasks: filtered }];
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => map.set(t.category || "未分類", [...(map.get(t.category || "未分類") ?? []), t]));
    return Array.from(map.entries()).map(([title, items]) => ({ title, tasks: items }));
  }, [filtered, viewMode]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((d) => ({ ...d, [key]: value })); }
  function resetDraft() { setDraft(emptyDraft); setEditingId(null); setShowComposer(false); }
  function openCreate() { setDraft(emptyDraft); setEditingId(null); setShowComposer(true); }
  function openEdit(task: Task) { setDraft({ title: task.title, dueDate: task.dueDate ?? "", priority: task.priority, category: task.category, notes: task.notes }); setEditingId(task.id); setShowComposer(true); }

  async function refreshFromDb() {
    if (!supabase) return;
    const { data } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (data) {
      const mapped = sortTasks((data as Row[]).map(mapRow));
      setTasks(mapped);
      setCategories(Array.from(new Set(mapped.map((t) => t.category).filter(Boolean))));
    }
  }

  async function submitTask() {
    if (!draft.title.trim()) return;
    const payload = { title: draft.title.trim(), due_date: draft.dueDate || null, priority: draft.priority, category: draft.category.trim(), notes: draft.notes.trim() };
    if (supabase) {
      if (editingId) await supabase.from("tasks").update(payload).eq("id", editingId);
      else await supabase.from("tasks").insert(payload);
      await refreshFromDb();
    } else {
      const local: Task = { id: editingId ?? String(Date.now()), title: payload.title, dueDate: payload.due_date, priority: payload.priority, category: payload.category, notes: payload.notes, completed: false };
      setTasks((cur) => editingId ? sortTasks(cur.map((t) => t.id === editingId ? { ...t, ...local } : t)) : sortTasks([local, ...cur]));
      if (local.category) setCategories((cur) => cur.includes(local.category) ? cur : [...cur, local.category]);
    }
    resetDraft();
  }

  async function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (supabase) {
      await supabase.from("tasks").update({ is_completed: !task.completed }).eq("id", id);
      await refreshFromDb();
    } else {
      setTasks((cur) => sortTasks(cur.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)));
    }
  }

  async function deleteTask(id: string) {
    if (supabase) {
      await supabase.from("tasks").delete().eq("id", id);
      await refreshFromDb();
    } else {
      setTasks((cur) => cur.filter((t) => t.id !== id));
    }
    if (editingId === id) resetDraft();
  }

  function createCategory() {
    const value = newCategory.trim();
    if (!value) return;
    setCategories((cur) => cur.includes(value) ? cur : [...cur, value]);
    setNewCategory("");
  }

  function renameCategory(prev: string, next: string) {
    const value = next.trim();
    if (!value || value === prev) return;
    setCategories((cur) => cur.map((c) => c === prev ? value : c));
    setTasks((cur) => cur.map((t) => t.category === prev ? { ...t, category: value } : t));
  }

  function removeCategory(name: string) {
    setCategories((cur) => cur.filter((c) => c !== name));
    setTasks((cur) => cur.map((t) => t.category === name ? { ...t, category: "" } : t));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <section className="flex items-center justify-between">
          <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-slate-300">{ready ? "Mission Board" : "Loading"}</div>
          <div className="relative">
            <motion.button type="button" onClick={() => setShowMenu((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/85 text-slate-200" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <span className="flex flex-col gap-1.5"><span className="block h-0.5 w-5 rounded-full bg-current" /><span className="block h-0.5 w-5 rounded-full bg-current" /><span className="block h-0.5 w-5 rounded-full bg-current" /></span>
            </motion.button>
            <AnimatePresence>
              {showMenu && (
                <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.18 }} className="absolute top-13 right-0 z-20 min-w-72 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                  <div className="px-2 pb-2">
                    <label className="flex flex-col gap-2 text-xs text-slate-400">検索
                      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="タイトル、カテゴリ、メモを検索" className="h-11 rounded-xl border border-white/10 bg-white/6 px-3 text-sm text-white outline-none placeholder:text-slate-500" />
                    </label>
                  </div>
                  <button type="button" onClick={() => { setShowCategoryManager(true); setShowMenu(false); }} className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-200 hover:bg-white/8">カテゴリ管理</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {[["all", "全体"], ["category", "カテゴリ別"], ["completed", "完了済み"]].map(([key, label]) => (
            <motion.button key={key} type="button" onClick={() => setViewMode(key as ViewMode)} className={["rounded-full border px-4 py-2 text-sm", viewMode === key ? "border-cyan-300/45 bg-cyan-300/14 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]" : "border-white/10 bg-slate-900/80 text-slate-300"].join(" ")} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>{label}</motion.button>
          ))}
        </section>

        <section className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {groups.map((group) => (
              <motion.div key={group.title} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="rounded-[22px] border border-white/10 bg-slate-950/82 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                  <p className="text-sm text-slate-400">{group.tasks.length} tasks</p>
                </div>
                {group.tasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-slate-400">該当するタスクはありません</div>
                ) : (
                  <motion.div layout className="space-y-2.5">
                    <AnimatePresence mode="popLayout">
                      {group.tasks.map((task) => (
                        <motion.article key={task.id} layout initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.2 }} className="rounded-2xl border border-white/8 bg-[#0b1120] p-3">
                          <div className="flex items-start gap-3">
                            <motion.button type="button" onClick={() => void toggleTask(task.id)} className={["mt-0.5 h-5 w-5 rounded-full border", task.completed ? "border-cyan-300 bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.55)]" : "border-white/20 bg-transparent"].join(" ")} whileTap={{ scale: 0.86 }} />
                            <div className="min-w-0 flex-1">
                              <motion.button type="button" onClick={() => openEdit(task)} className="w-full text-left" whileHover={{ x: 2 }}>
                                <div className="flex flex-col gap-2">
                                  <h3 className="truncate text-sm font-medium leading-6 text-white sm:text-[15px]">{task.title}</h3>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                                    <MetaBadge label={formatDate(task.dueDate)} tone="date" />
                                    <MetaBadge label={labels[task.priority]} tone={task.priority} />
                                    <MetaBadge label={task.category || "未分類"} tone="category" />
                                    {deadlineState(task.dueDate) === "overdue" && !task.completed && <MetaBadge label="期限切れ" tone="high" />}
                                  </div>
                                </div>
                                {task.notes && <p className="mt-2 text-xs leading-5 text-slate-400">{task.notes}</p>}
                              </motion.button>
                            </div>
                            <div className="flex gap-2">
                              <motion.button type="button" onClick={() => openEdit(task)} className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>編集</motion.button>
                              <motion.button type="button" onClick={() => void deleteTask(task.id)} className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-100" whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>削除</motion.button>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      </motion.div>

      <AnimatePresence>{showComposer && <TaskModal title={editingId ? "タスクを編集" : "タスクを追加"} draft={draft} categories={categories} onChange={setField} onClose={resetDraft} onSubmit={() => void submitTask()} onDelete={editingId ? () => void deleteTask(editingId) : undefined} submitLabel={editingId ? "保存" : "追加"} />}</AnimatePresence>
      <AnimatePresence>{showCategoryManager && <CategoryModal categories={categories} newCategoryName={newCategory} onChangeNewCategory={setNewCategory} onClose={() => { setShowCategoryManager(false); setNewCategory(""); }} onCreate={createCategory} onRename={renameCategory} onDelete={removeCategory} />}</AnimatePresence>

      <motion.button type="button" onClick={openCreate} className="fixed right-5 bottom-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-300 text-4xl font-light text-slate-950 shadow-[0_18px_45px_rgba(34,211,238,0.35)]" initial={{ opacity: 0, y: 18, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, delay: 0.18 }} whileHover={{ scale: 1.06, boxShadow: "0 22px 55px rgba(34,211,238,0.38)" }} whileTap={{ scale: 0.94 }}>+</motion.button>
    </main>
  );
}

function TaskModal({ title, draft, categories, onChange, onClose, onSubmit, onDelete, submitLabel }: { title: string; draft: Draft; categories: string[]; onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void; onClose: () => void; onSubmit: () => void; onDelete?: () => void; submitLabel: string; }) {
  return (
    <motion.div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.985 }} transition={{ duration: 0.24 }} className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,17,27,0.96),rgba(5,9,15,0.98))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:p-5">
        <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-semibold text-white">{title}</h2><button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-slate-300">閉じる</button></div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs text-slate-300">タイトル
            <input value={draft.title} onChange={(e) => onChange("title", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }} placeholder="新しいタスクを入力" className="h-13 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500" />
          </label>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs text-slate-300">期限<input type="date" value={draft.dueDate} onChange={(e) => onChange("dueDate", e.target.value)} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="flex flex-col gap-2 text-xs text-slate-300">優先度<div className="grid grid-cols-3 gap-2">{([["high", "High"], ["medium", "Medium"], ["low", "Low"]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => onChange("priority", value)} className={["rounded-xl border px-3 py-2 text-sm", draft.priority === value ? value === "high" ? "border-rose-300/40 bg-rose-300/16 text-rose-100" : value === "medium" ? "border-amber-300/40 bg-amber-300/16 text-amber-100" : "border-cyan-300/40 bg-cyan-300/16 text-cyan-100" : "border-white/10 bg-white/6 text-slate-300"].join(" ")}>{label}</button>)}</div></label>
            <label className="flex flex-col gap-2 text-xs text-slate-300 sm:col-span-2">カテゴリ<input list="category-options" value={draft.category} onChange={(e) => onChange("category", e.target.value)} placeholder="仕事" className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" /><datalist id="category-options">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="flex flex-col gap-2 text-xs text-slate-300 sm:col-span-2">メモ<input value={draft.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="補足メモ" className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500" /></label>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1"><div>{onDelete && <button type="button" onClick={onDelete} className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">削除</button>}</div><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">キャンセル</button><button type="button" onClick={onSubmit} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950">{submitLabel}</button></div></div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CategoryModal({ categories, newCategoryName, onChangeNewCategory, onClose, onCreate, onRename, onDelete }: { categories: string[]; newCategoryName: string; onChangeNewCategory: (value: string) => void; onClose: () => void; onCreate: () => void; onRename: (previous: string, next: string) => void; onDelete: (name: string) => void; }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  return (
    <motion.div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ opacity: 0, y: 26, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.985 }} transition={{ duration: 0.24 }} className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,17,27,0.96),rgba(5,9,15,0.98))] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.45)] sm:p-5">
        <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-semibold text-white">カテゴリ管理</h2><button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-slate-300">閉じる</button></div>
        <div className="mt-4 flex gap-3"><input value={newCategoryName} onChange={(e) => onChangeNewCategory(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onCreate(); }} placeholder="新しいカテゴリを追加" className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-slate-500" /><button type="button" onClick={onCreate} className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-medium text-slate-950">追加</button></div>
        <div className="mt-4 space-y-3">{categories.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-slate-400">まだカテゴリはありません</div> : categories.map((category) => <div key={category} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">{editing === category ? <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onRename(category, value); setEditing(null); } }} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/6 px-3 text-sm text-white outline-none" /> : <p className="flex-1 text-sm text-white">{category}</p>}{editing === category ? <><button type="button" onClick={() => { onRename(category, value); setEditing(null); }} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200">保存</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200">戻す</button></> : <><button type="button" onClick={() => { setEditing(category); setValue(category); }} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-200">名前変更</button><button type="button" onClick={() => onDelete(category)} className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">削除</button></>}</div>)}</div>
      </motion.div>
    </motion.div>
  );
}

function MetaBadge({ label, tone }: { label: string; tone: Priority | "date" | "category" }) {
  const classes: Record<typeof tone, string> = { high: "border-rose-300/30 bg-rose-300/12 text-rose-100", medium: "border-amber-300/30 bg-amber-300/12 text-amber-100", low: "border-cyan-300/30 bg-cyan-300/12 text-cyan-100", date: "border-white/12 bg-white/8 text-slate-200", category: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100" };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${classes[tone]}`}>{label}</span>;
}
