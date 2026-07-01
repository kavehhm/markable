import { useEffect, useMemo, useState } from "react";
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
  const [difficulty, setDifficulty] = useState<BankFilter["difficulty"]>("all");
  const [category, setCategory] = useState<BankFilter["category"]>("all");
  const [source, setSource] = useState<BankFilter["source"]>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(
    () => filterBank({ difficulty, category, source, search }),
    [difficulty, category, source, search],
  );

  const rows = useMemo(() => {
    const dir = asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort === "difficulty") return dir * (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]);
      if (sort === "category") return dir * a.category.localeCompare(b.category);
      return dir * a.name.localeCompare(b.name);
    });
  }, [filtered, sort, asc]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const paged = rows.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [difficulty, category, source, search, sort, asc, pageSize]);

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
          <Dropdown label="Difficulty" value={difficulty ?? "all"} onChange={(v) => setDifficulty(v as BankFilter["difficulty"])} options={["all", ...BANK_DIFFICULTIES]} />
          <Dropdown label="Category" value={category ?? "all"} onChange={(v) => setCategory(v as BankFilter["category"])} options={["all", ...BANK_CATEGORIES]} />
          <Dropdown label="Source" value={source ?? "all"} onChange={(v) => setSource(v as BankFilter["source"])} options={["all", ...BANK_SOURCES]} />
        </div>
        <div className="bank-search-row">
          <span className="bank-search">
            <Search size={15} />
            <input type="text" value={search} placeholder="Search contracts" onChange={(e) => setSearch(e.target.value)} />
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
              <th className="sortable" onClick={() => toggleSort("name")}>
                Contract {sort === "name" ? (asc ? "↑" : "↓") : ""}
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
            {paged.length === 0 ? (
              <tr>
                <td colSpan={3} className="bank-empty">No contracts match these filters.</td>
              </tr>
            ) : (
              paged.map((entry) => (
                <tr key={entry.id} onClick={() => onSelect(entry)}>
                  <td className="bank-name">
                    <span className="bank-name-main">{entry.name}</span>
                    <span className="bank-sub">{entry.prompt}</span>
                  </td>
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

      <div className="bank-pager">
        <label className="bank-pagesize">
          Rows
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span className="bank-count">{rows.length} contracts</span>
        <div className="bank-pager-controls">
          <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Prev</button>
          <span>Page {page + 1} of {pageCount}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next</button>
        </div>
      </div>
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
