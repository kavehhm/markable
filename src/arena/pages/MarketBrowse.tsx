import { useMemo, useState } from "react";
import { Dices, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  BANK_CATEGORIES,
  BANK_DIFFICULTIES,
  BANK_SOURCES,
  BankEntry,
  BankFilter,
  filterBank,
  randomEntry,
} from "../marketBank";

type SortKey = "name" | "difficulty" | "category";
const DIFF_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export function MarketBrowse({
  onSelect,
  controls,
}: {
  onSelect: (entry: BankEntry) => void;
  controls?: ReactNode;
}) {
  const [kind, setKind] = useState<BankFilter["kind"]>("all");
  const [difficulty, setDifficulty] = useState<BankFilter["difficulty"]>("all");
  const [category, setCategory] = useState<BankFilter["category"]>("all");
  const [source, setSource] = useState<BankFilter["source"]>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);

  const filtered = useMemo(
    () => filterBank({ kind, difficulty, category, source, search }),
    [kind, difficulty, category, source, search],
  );

  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort === "difficulty") return dir * (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
      if (sort === "category") return dir * a.category.localeCompare(b.category);
      return dir * a.name.localeCompare(b.name);
    });
  }, [filtered, sort, asc]);

  function toggleSort(key: SortKey) {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(true);
    }
  }

  function roll() {
    const pick = randomEntry(filtered);
    if (pick) onSelect(pick);
  }

  return (
    <div className="bank">
      {controls ? <div className="bank-controls">{controls}</div> : null}

      <div className="bank-filter">
        <div className="bank-filter-row">
          <Segmented
            value={kind ?? "all"}
            onChange={(v) => setKind(v as BankFilter["kind"])}
            options={[
              { value: "all", label: "All types" },
              { value: "market", label: "Markets" },
              { value: "estimate", label: "Estimates" },
            ]}
          />
          <Dropdown
            label="Difficulty"
            value={difficulty ?? "all"}
            onChange={(v) => setDifficulty(v as BankFilter["difficulty"])}
            options={["all", ...BANK_DIFFICULTIES]}
          />
          <Dropdown
            label="Category"
            value={category ?? "all"}
            onChange={(v) => setCategory(v as BankFilter["category"])}
            options={["all", ...BANK_CATEGORIES]}
          />
          <Dropdown
            label="Source"
            value={source ?? "all"}
            onChange={(v) => setSource(v as BankFilter["source"])}
            options={["all", ...BANK_SOURCES]}
          />
        </div>
        <div className="bank-search-row">
          <span className="bank-search">
            <Search size={15} />
            <input
              type="text"
              value={search}
              placeholder="Search questions"
              onChange={(e) => setSearch(e.target.value)}
            />
          </span>
          <button type="button" className="bank-dice" onClick={roll} disabled={!filtered.length}>
            <Dices size={15} /> Roll the dice
          </button>
        </div>
      </div>

      <div className="bank-table-wrap">
        <table className="bank-table">
          <thead>
            <tr>
              <th className="col-type">Type</th>
              <th className="sortable" onClick={() => toggleSort("name")}>
                Question {sort === "name" ? (asc ? "↑" : "↓") : ""}
              </th>
              <th className="sortable col-cat" onClick={() => toggleSort("category")}>
                Category {sort === "category" ? (asc ? "↑" : "↓") : ""}
              </th>
              <th className="sortable col-diff" onClick={() => toggleSort("difficulty")}>
                Difficulty {sort === "difficulty" ? (asc ? "↑" : "↓") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="bank-empty">No questions match these filters.</td>
              </tr>
            ) : (
              rows.map((entry) => (
                <tr key={entry.id} onClick={() => onSelect(entry)}>
                  <td className="col-type">
                    <span className={`bank-kind ${entry.kind}`}>
                      {entry.kind === "market" ? "Market" : "Estimate"}
                    </span>
                  </td>
                  <td className="bank-name">{entry.name}</td>
                  <td className="col-cat bank-muted">{entry.category}</td>
                  <td className="col-diff">
                    <span className={`bank-diff ${entry.difficulty}`}>{entry.difficulty}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="bank-count">{rows.length} questions</p>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-btn ${value === o.value ? "active" : ""}`}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className={`bank-dd ${value !== "all" ? "active" : ""}`}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? `All ${label.toLowerCase()}` : o}
          </option>
        ))}
      </select>
    </label>
  );
}
