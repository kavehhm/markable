import { useMemo, useState } from "react";
import { Minus, Plus, Sparkles } from "lucide-react";
import {
  LabObjective,
  Position,
  evaluatePortfolio,
  findLabScenario,
  findOptimalPortfolio,
  hasArbitrage,
  instrumentEv,
} from "../engine";
import { ArenaSession } from "../ArenaApp";
import { Panel, PanelHead, Pill, Stat } from "../components/ui";
import { fmt, fmtSigned } from "../format";
import { Topline } from "./FairValueDrill";

const OBJECTIVES: Array<{ id: LabObjective; label: string; blurb: string }> = [
  { id: "max_ev", label: "Max EV", blurb: "Chase the highest expected profit, risk allowed." },
  { id: "max_sharpe", label: "Max Sharpe", blurb: "Best return per unit of risk. Riskless edges win." },
  { id: "max_worst_case", label: "Max worst case", blurb: "Largest guaranteed floor across every state." },
];

function sharpeText(s: number): string {
  if (!Number.isFinite(s)) return s > 0 ? "riskless" : "0";
  return fmt(s);
}

export function ObjectiveLab({
  session,
  onExit,
}: {
  session: ArenaSession;
  onExit: () => void;
}) {
  const scenario = useMemo(
    () => findLabScenario(session.scenarioId ?? "race")!,
    [session],
  );
  const [objective, setObjective] = useState<LabObjective>("max_worst_case");
  const [position, setPosition] = useState<Position>(() =>
    Object.fromEntries(scenario.instruments.map((i) => [i.id, 0])),
  );
  const [showOptimal, setShowOptimal] = useState(false);

  const result = useMemo(() => evaluatePortfolio(scenario, position), [scenario, position]);
  const optimal = useMemo(
    () => findOptimalPortfolio(scenario, objective),
    [scenario, objective],
  );
  const arb = useMemo(() => hasArbitrage(scenario), [scenario]);

  function setQty(id: string, qty: number) {
    const clamped = Math.max(-scenario.qtyRange, Math.min(scenario.qtyRange, qty));
    setPosition((p) => ({ ...p, [id]: clamped }));
  }
  function reset() {
    setPosition(Object.fromEntries(scenario.instruments.map((i) => [i.id, 0])));
    setShowOptimal(false);
  }
  function loadOptimal() {
    setPosition(optimal.position);
    setShowOptimal(true);
  }

  const maxAbsPnl = Math.max(1, ...result.pnlByState.map((x) => Math.abs(x.pnl)));

  return (
    <div className="arena-shell">
      <Topline title="Objective Lab" onExit={onExit} right={arb ? <Pill tone="good">arbitrage exists</Pill> : <Pill tone="warn">no riskless edge</Pill>} />

      <div className="config-block" style={{ marginBottom: 16 }}>
        <span className="config-legend">Optimise for</span>
        <div className="seg">
          {OBJECTIVES.map((o) => (
            <button
              key={o.id}
              className={`seg-btn ${objective === o.id ? "active" : ""}`}
              onClick={() => { setObjective(o.id); setShowOptimal(false); }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="prompt-sub">{OBJECTIVES.find((o) => o.id === objective)!.blurb}</p>
      </div>

      <div className="play-grid">
        <Panel className="prompt-panel">
          <PanelHead kicker={scenario.title} title="Build your portfolio" />
          <p className="prompt-text">{scenario.prompt}</p>

          <div className="instrument-list">
            {scenario.instruments.map((inst) => {
              const edge = instrumentEv(inst, scenario.states) - inst.price;
              const qty = position[inst.id] ?? 0;
              return (
                <div key={inst.id} className="instrument">
                  <div className="instrument-info">
                    <strong>{inst.name}</strong>
                    <span>{inst.note}</span>
                    <span className={`edge ${edge > 0.001 ? "pos" : edge < -0.001 ? "neg" : ""}`}>
                      edge {fmtSigned(edge)} per unit
                    </span>
                  </div>
                  <div className="stepper">
                    <button onClick={() => setQty(inst.id, qty - 1)} aria-label="sell one"><Minus size={16} /></button>
                    <strong className={qty > 0 ? "long" : qty < 0 ? "short" : ""}>{qty > 0 ? `+${qty}` : qty}</strong>
                    <button onClick={() => setQty(inst.id, qty + 1)} aria-label="buy one"><Plus size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lab-actions">
            <button className="ghost-btn" onClick={reset}>Reset</button>
            <button className="arena-start compact" onClick={loadOptimal}>
              <Sparkles size={16} /> Show optimal
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHead kicker="Your portfolio" title="Risk and reward" />
          <div className="stat-grid">
            <Stat label="Expected PnL" value={fmtSigned(result.ev)} tone={result.ev > 0 ? "good" : result.ev < 0 ? "bad" : "neutral"} />
            <Stat label="Worst case" value={fmt(result.worstCase)} tone={result.worstCase > 0 ? "good" : result.worstCase < 0 ? "bad" : "neutral"} />
            <Stat label="Best case" value={fmt(result.bestCase)} />
            <Stat label="Std dev" value={fmt(result.std)} />
            <Stat label="Sharpe" value={sharpeText(result.sharpe)} tone={!Number.isFinite(result.sharpe) && result.sharpe > 0 ? "accent" : "neutral"} />
            <Stat label="Net cost" value={fmt(result.cost)} />
          </div>

          <div className="pnl-rail">
            <span className="pnl-rail-title">PnL in every state</span>
            {result.pnlByState.map((x) => (
              <div key={x.state.id} className="pnl-row">
                <span className="pnl-label">{x.state.label}</span>
                <div className="pnl-track">
                  <div className="pnl-zero" />
                  <div
                    className={`pnl-fill ${x.pnl >= 0 ? "pos" : "neg"}`}
                    style={{ width: `${(Math.abs(x.pnl) / maxAbsPnl) * 50}%`, left: x.pnl >= 0 ? "50%" : undefined, right: x.pnl < 0 ? "50%" : undefined }}
                  />
                </div>
                <strong className={x.pnl >= 0 ? "pos" : "neg"}>{fmtSigned(x.pnl)}</strong>
              </div>
            ))}
          </div>
        </Panel>

        {showOptimal ? (
          <Panel className="full-span">
            <PanelHead kicker={`Optimal for ${OBJECTIVES.find((o) => o.id === objective)!.label}`} title="The textbook answer" right={<Sparkles size={18} className="hint-icon" />} />
            <div className="optimal-pos">
              {scenario.instruments.map((inst) => {
                const q = optimal.position[inst.id] ?? 0;
                return (
                  <div key={inst.id} className="optimal-chip">
                    <span>{inst.name}</span>
                    <strong className={q > 0 ? "long" : q < 0 ? "short" : "flat"}>{q > 0 ? `buy ${q}` : q < 0 ? `sell ${-q}` : "flat"}</strong>
                  </div>
                );
              })}
            </div>
            <div className="stat-grid">
              <Stat label="Expected PnL" value={fmtSigned(optimal.result.ev)} tone="good" />
              <Stat label="Worst case" value={fmt(optimal.result.worstCase)} tone={optimal.result.worstCase > 0 ? "good" : "neutral"} />
              <Stat label="Sharpe" value={sharpeText(optimal.result.sharpe)} tone="accent" />
            </div>
            <div className="lesson good">
              <strong>Lesson</strong>
              <p>{scenario.lesson}</p>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
