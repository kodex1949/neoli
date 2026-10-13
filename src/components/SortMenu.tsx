"use client";

import { useEffect, useRef, useState } from "react";

export type SortOption<T extends string> = { value: T; label: string };

/** Menu de tri : verre dépoli comme les panneaux du site, fondu doux, navigation au clavier. */
export function SortMenu<T extends string>({ value, options, onChange }: { value: T; options: SortOption<T>[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (v: T) => {
    onChange(v);
    setOpen(false);
    btn.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
    if (!["ArrowDown", "ArrowUp", "Enter", " ", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    if (!open) { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); return; }
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % options.length);
    else if (e.key === "ArrowUp") setActive((i) => (i - 1 + options.length) % options.length);
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else choose(options[active].value);
  };

  return (
    <div className="sort" ref={root} onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        className="sort__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen((o) => !o); }}
      >
        <span className="sort__label">Trier par</span>
        <span className="sort__value">{current.label}</span>
        <svg viewBox="0 0 10 6" aria-hidden="true"><path d="m1 1 4 4 4-4" /></svg>
      </button>
      <ul className="sort__list" role="listbox" aria-label="Trier par" data-open={open} inert={!open}>
        {options.map((o, i) => (
          <li
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            data-active={open && i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(o.value)}
          >
            {o.label}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.5 4.2 4.2L18.5 7.8" /></svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
