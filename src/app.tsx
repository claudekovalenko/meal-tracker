import { useState } from "preact/hooks";
import { MacroBar, MacroFields, NumberInput, Sheet } from "./components";
import { dayKey, formatDay, shiftDay } from "./dates";
import { estimateMeal, type MealEstimate } from "./estimator";
import { addMacros, adjustedTargets, ZERO, type Goals } from "./goals";
import { readCaloriesFromClipboard, runHealthShortcut, SHORTCUT_NAME } from "./health";
import { MEAL_TYPES, newId, suggestedMeal, useAppData, type AppData, type FoodEntry, type MealType } from "./store";

type Panel = { kind: "add" } | { kind: "settings" } | { kind: "edit"; id: string } | { kind: "burned" } | null;

const title = (m: MealType) => m[0].toUpperCase() + m.slice(1);

export function App() {
  const [data, setData] = useAppData();
  const [day, setDay] = useState(dayKey());
  const [panel, setPanel] = useState<Panel>(null);

  const today = dayKey();
  const entries = data.entries.filter((e) => e.day === day).sort((a, b) => a.createdAt - b.createdAt);
  const active = data.activeCalories[day] ?? 0;
  const targets = adjustedTargets(data.goals, active);
  const eaten = entries.reduce(addMacros, ZERO);
  const remaining = targets.calories - eaten.calories;

  const setActive = (kcal: number) =>
    setData((d) => ({ ...d, activeCalories: { ...d.activeCalories, [day]: kcal } }));

  return (
    <div class="app">
      <header class="topbar">
        <button class="icon" aria-label="Settings" onClick={() => setPanel({ kind: "settings" })}>⚙︎</button>
        <h1>{formatDay(day)}</h1>
        <div class="day-nav">
          <button class="icon" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>‹</button>
          <button class="icon" aria-label="Next day" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}>›</button>
        </div>
      </header>

      <section class="card">
        <div class="summary">
          <div>
            <div class={`big ${remaining < 0 ? "danger" : ""}`}>{Math.abs(Math.round(remaining))}</div>
            <div class="muted">{remaining >= 0 ? "kcal remaining" : "kcal over"}</div>
          </div>
          <div class="summary-side">
            <div>{Math.round(eaten.calories)} eaten</div>
            <div class="muted">{Math.round(targets.calories)} target</div>
          </div>
        </div>
        <MacroBar name="Protein" eaten={eaten.protein} target={targets.protein} color="var(--protein)" />
        <MacroBar name="Carbs" eaten={eaten.carbs} target={targets.carbs} color="var(--carbs)" />
        <MacroBar name="Fat" eaten={eaten.fat} target={targets.fat} color="var(--fat)" />
      </section>

      <section class="card burned">
        <div>
          <div><strong>{active}</strong> kcal burned</div>
          <div class="muted small">
            {active > 0
              ? `+${Math.round(targets.calories - data.goals.calories)} kcal added (${data.goals.eatBackPercent}% eat-back)`
              : "Active calories from Apple Health"}
          </div>
        </div>
        <button class="secondary" onClick={() => setPanel({ kind: "burned" })}>Update</button>
      </section>

      {MEAL_TYPES.map((meal) => {
        const items = entries.filter((e) => e.meal === meal);
        if (items.length === 0) return null;
        return (
          <section class="card meal" key={meal}>
            <div class="meal-header">
              <h3>{title(meal)}</h3>
              <span class="muted">{Math.round(items.reduce((s, e) => s + e.calories, 0))} kcal</span>
            </div>
            {items.map((e) => (
              <button class="entry" key={e.id} onClick={() => setPanel({ kind: "edit", id: e.id })}>
                <div>
                  <div>{e.name}</div>
                  <div class="muted small">
                    {e.portion} · P {Math.round(e.protein)} · C {Math.round(e.carbs)} · F {Math.round(e.fat)}
                  </div>
                </div>
                <span>{Math.round(e.calories)}</span>
              </button>
            ))}
          </section>
        );
      })}

      {entries.length === 0 && (
        <p class="empty muted">Nothing logged yet. Tap <strong>Log food</strong> and describe what you ate.</p>
      )}

      <button class="fab" onClick={() => setPanel({ kind: "add" })}>＋ Log food</button>

      {panel?.kind === "add" && (
        <AddMealSheet
          apiKey={data.apiKey}
          onClose={() => setPanel(null)}
          onAdd={(meal, items) => {
            const now = Date.now();
            const added: FoodEntry[] = items.map((item, i) => ({
              id: newId(),
              day,
              meal,
              name: item.name,
              portion: item.portion,
              calories: item.calories,
              protein: item.protein_g,
              carbs: item.carbs_g,
              fat: item.fat_g,
              createdAt: now + i,
            }));
            setData((d) => ({ ...d, entries: [...d.entries, ...added] }));
            setPanel(null);
          }}
        />
      )}
      {panel?.kind === "edit" && (
        <EditEntrySheet
          entry={data.entries.find((e) => e.id === panel.id)!}
          onClose={() => setPanel(null)}
          onSave={(entry) => {
            setData((d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? entry : e)) }));
            setPanel(null);
          }}
          onDelete={() => {
            setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== panel.id) }));
            setPanel(null);
          }}
        />
      )}
      {panel?.kind === "burned" && (
        <BurnedSheet value={active} isToday={day === today} onClose={() => setPanel(null)} onSave={(n) => { setActive(n); setPanel(null); }} />
      )}
      {panel?.kind === "settings" && (
        <SettingsSheet data={data} onClose={() => setPanel(null)} onSave={(d) => { setData(d); setPanel(null); }} />
      )}
    </div>
  );
}

type Item = MealEstimate["items"][number];

function AddMealSheet(props: { apiKey: string; onClose: () => void; onAdd: (meal: MealType, items: Item[]) => void }) {
  const [meal, setMeal] = useState<MealType>(suggestedMeal());
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await estimateMeal(text.trim(), props.apiKey);
      setItems(result.items);
      setNotes(result.notes);
      if (result.items.length === 0) setError("Couldn't find any food in that description.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce(
    (t, i) => addMacros(t, { calories: i.calories, protein: i.protein_g, carbs: i.carbs_g, fat: i.fat_g }),
    ZERO,
  );

  return (
    <Sheet
      title="Log food"
      onClose={props.onClose}
      action={<button class="link strong" disabled={items.length === 0} onClick={() => props.onAdd(meal, items)}>Add</button>}
    >
      <div class="segmented">
        {MEAL_TYPES.map((m) => (
          <button class={m === meal ? "selected" : ""} onClick={() => setMeal(m)}>{title(m)}</button>
        ))}
      </div>

      <label class="field-label" for="meal-text">What did you eat?</label>
      <textarea
        id="meal-text"
        rows={4}
        placeholder="e.g. Chipotle chicken burrito bowl with white rice, black beans, cheese and guac"
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
      />
      <button class="primary wide" disabled={!text.trim() || loading} onClick={calculate}>
        {loading ? "Calculating…" : items.length ? "Recalculate" : "Calculate macros"}
      </button>
      {error && <p class="error">{error}</p>}

      {items.length > 0 && (
        <>
          <h4>Review &amp; adjust</h4>
          {items.map((item, idx) => {
            const update = (patch: Partial<Item>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
            return (
              <div class="item-editor" key={idx}>
                <div class="item-row">
                  <input class="item-name" value={item.name} onInput={(e) => update({ name: e.currentTarget.value })} />
                  <button class="link danger" aria-label="Remove item" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Remove</button>
                </div>
                <input class="item-portion" value={item.portion} onInput={(e) => update({ portion: e.currentTarget.value })} />
                <MacroFields
                  value={{ calories: item.calories, protein: item.protein_g, carbs: item.carbs_g, fat: item.fat_g }}
                  onChange={(v) => update({ calories: v.calories, protein_g: v.protein, carbs_g: v.carbs, fat_g: v.fat })}
                />
              </div>
            );
          })}
          {notes && <p class="muted small">{notes}</p>}
          <div class="total">
            <strong>{Math.round(total.calories)} kcal</strong>
            <span class="muted">P {Math.round(total.protein)} · C {Math.round(total.carbs)} · F {Math.round(total.fat)} g</span>
          </div>
        </>
      )}
    </Sheet>
  );
}

function EditEntrySheet(props: { entry: FoodEntry; onClose: () => void; onSave: (e: FoodEntry) => void; onDelete: () => void }) {
  const [entry, setEntry] = useState(props.entry);
  return (
    <Sheet title="Edit entry" onClose={props.onClose} action={<button class="link strong" onClick={() => props.onSave(entry)}>Save</button>}>
      <label class="field-label">Food</label>
      <input value={entry.name} onInput={(e) => setEntry({ ...entry, name: e.currentTarget.value })} />
      <label class="field-label">Portion</label>
      <input value={entry.portion} onInput={(e) => setEntry({ ...entry, portion: e.currentTarget.value })} />
      <div class="segmented">
        {MEAL_TYPES.map((m) => (
          <button class={m === entry.meal ? "selected" : ""} onClick={() => setEntry({ ...entry, meal: m })}>{title(m)}</button>
        ))}
      </div>
      <MacroFields value={entry} onChange={setEntry} />
      <button class="danger-button wide" onClick={props.onDelete}>Delete entry</button>
    </Sheet>
  );
}

function BurnedSheet(props: { value: number; isToday: boolean; onClose: () => void; onSave: (n: number) => void }) {
  const [value, setValue] = useState(props.value);
  const [message, setMessage] = useState("");

  const paste = async () => {
    const n = await readCaloriesFromClipboard();
    if (n === null) setMessage("No number found on the clipboard. Run the shortcut first.");
    else props.onSave(n);
  };

  return (
    <Sheet title="Calories burned" onClose={props.onClose} action={<button class="link strong" onClick={() => props.onSave(value)}>Save</button>}>
      {props.isToday && (
        <>
          <p class="muted small">
            Run the “{SHORTCUT_NAME}” shortcut to copy today's active calories from Apple Health, then come back here and tap Paste.
          </p>
          <div class="button-row">
            <button class="secondary" onClick={runHealthShortcut}>1. Run shortcut</button>
            <button class="primary" onClick={paste}>2. Paste</button>
          </div>
          {message && <p class="error">{message}</p>}
          <p class="muted small">Or type it in (Fitness app → Move ring):</p>
        </>
      )}
      <label class="field-label">Active calories</label>
      <NumberInput value={value} onChange={setValue} label="Active calories" />
    </Sheet>
  );
}

function SettingsSheet(props: { data: AppData; onClose: () => void; onSave: (d: AppData) => void }) {
  const [goals, setGoals] = useState<Goals>(props.data.goals);
  const [apiKey, setApiKey] = useState(props.data.apiKey);
  const macroCalories = goals.protein * 4 + goals.carbs * 4 + goals.fat * 9;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ ...props.data, apiKey: "" }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `meal-tracker-backup-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const imported = JSON.parse(await file.text()) as Partial<AppData>;
      if (!Array.isArray(imported.entries)) throw new Error();
      if (!confirm(`Replace your log with ${imported.entries.length} entries from this backup?`)) return;
      props.onSave({ ...props.data, ...imported, goals: { ...goals, ...imported.goals }, apiKey });
    } catch {
      alert("That file isn't a Meal Tracker backup.");
    }
  };

  const goalField = (key: keyof Goals, label: string, unit: string) => (
    <label class="setting-row">
      <span>{label}</span>
      <span class="setting-input">
        <NumberInput label={label} value={goals[key]} onChange={(n) => setGoals({ ...goals, [key]: n })} />
        <span class="muted">{unit}</span>
      </span>
    </label>
  );

  return (
    <Sheet title="Settings" onClose={props.onClose} action={<button class="link strong" onClick={() => props.onSave({ ...props.data, goals, apiKey: apiKey.trim() })}>Save</button>}>
      <h4>Daily goals (rest day)</h4>
      {goalField("calories", "Calories", "kcal")}
      {goalField("protein", "Protein", "g")}
      {goalField("carbs", "Carbs", "g")}
      {goalField("fat", "Fat", "g")}
      <p class="muted small">
        Your macros add up to {Math.round(macroCalories)} kcal. Set calories for a day without exercise; calories burned are added on top.
      </p>

      <h4>Exercise adjustment</h4>
      <label class="field-label">Eat back {goals.eatBackPercent}% of active calories</label>
      <input type="range" min={0} max={100} step={5} value={goals.eatBackPercent}
        onInput={(e) => setGoals({ ...goals, eatBackPercent: Number(e.currentTarget.value) })} />
      <p class="muted small">
        Watches tend to overestimate calories burned, so eating back only part of them (often 50–75%) is common. Extra calories go to carbs and fat; protein stays the same.
      </p>

      <h4>Apple Health shortcut</h4>
      <p class="muted small">One-time setup in the Shortcuts app. Create a new shortcut named <strong>{SHORTCUT_NAME}</strong> with these actions:</p>
      <ol class="small steps">
        <li><strong>Find Health Samples</strong> where Type is <em>Active Energy</em> and Start Date is <em>Today</em></li>
        <li><strong>Calculate Statistics</strong>: Sum of Health Samples</li>
        <li><strong>Round Number</strong> to Ones Place</li>
        <li><strong>Copy to Clipboard</strong></li>
      </ol>

      <h4>Anthropic API key</h4>
      <input type="password" autocomplete="off" placeholder="sk-ant-..." value={apiKey} onInput={(e) => setApiKey(e.currentTarget.value)} />
      <p class="muted small">Used to calculate macros from your meal descriptions. Stored only on this device. Get one at console.anthropic.com.</p>

      <h4>Backup</h4>
      <div class="button-row">
        <button class="secondary" onClick={exportData}>Export</button>
        <label class="secondary button-like">
          Import
          <input type="file" accept="application/json" hidden onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) importData(file);
          }} />
        </label>
      </div>
    </Sheet>
  );
}
