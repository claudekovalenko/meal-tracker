import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

export function Sheet(props: { title: string; onClose: () => void; action?: ComponentChildren; children: ComponentChildren }) {
  useEffect(() => {
    document.body.classList.add("sheet-open");
    return () => document.body.classList.remove("sheet-open");
  }, []);
  return (
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="sheet" role="dialog" aria-label={props.title}>
        <header class="sheet-header">
          <button class="link" onClick={props.onClose}>Cancel</button>
          <h2>{props.title}</h2>
          <div class="sheet-action">{props.action}</div>
        </header>
        <div class="sheet-body">{props.children}</div>
      </div>
    </div>
  );
}

/** Numeric input that lets you clear the field while typing. */
export function NumberInput(props: { value: number; onChange: (n: number) => void; label?: string; step?: string }) {
  const [text, setText] = useState(format(props.value));
  useEffect(() => {
    if (Number(text) !== props.value) setText(format(props.value));
  }, [props.value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={props.step ?? "any"}
      aria-label={props.label}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onInput={(e) => {
        const next = e.currentTarget.value;
        setText(next);
        const n = Number(next);
        if (next !== "" && Number.isFinite(n)) props.onChange(n);
        if (next === "") props.onChange(0);
      }}
    />
  );
}

const format = (n: number) => String(Math.round(n * 10) / 10);

export function MacroBar(props: { name: string; eaten: number; target: number; color: string }) {
  const pct = props.target > 0 ? Math.min(props.eaten / props.target, 1) * 100 : 0;
  const over = props.eaten > props.target * 1.05;
  return (
    <div class="macro">
      <div class="macro-label">
        <span>{props.name}</span>
        <span class="muted">{Math.round(props.eaten)} / {Math.round(props.target)} g</span>
      </div>
      <div class="bar">
        <div class="bar-fill" style={{ width: `${pct}%`, background: over ? "var(--danger)" : props.color }} />
      </div>
    </div>
  );
}

export interface MacroFieldsValue {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroFields<T extends MacroFieldsValue>(props: { value: T; onChange: (v: T) => void }) {
  const field = (key: keyof MacroFieldsValue, label: string) => (
    <label class="macro-field">
      <NumberInput label={label} value={props.value[key]} onChange={(n) => props.onChange({ ...props.value, [key]: n })} />
      <span>{label}</span>
    </label>
  );
  return (
    <div class="macro-fields">
      {field("calories", "kcal")}
      {field("protein", "P g")}
      {field("carbs", "C g")}
      {field("fat", "F g")}
    </div>
  );
}
