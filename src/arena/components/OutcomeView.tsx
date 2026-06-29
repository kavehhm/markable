import { GameState } from "../engine";

/** Renders the realised hidden state (cards / dice / coins) as visual chips. */
export function OutcomeView({ state }: { state: GameState }) {
  if (state.cards) {
    return (
      <div className="outcome outcome-cards">
        {state.cards.map((card, i) => (
          <div key={i} className={`playing-card ${card.color}`}>
            <span className="pc-rank">{card.label.slice(0, -1)}</span>
            <span className="pc-suit">{card.label.slice(-1)}</span>
            <span className="pc-value">{card.value}</span>
          </div>
        ))}
      </div>
    );
  }
  if (state.dice) {
    return (
      <div className="outcome outcome-dice">
        {state.dice.map((d, i) => (
          <div key={i} className="die">
            {d}
          </div>
        ))}
      </div>
    );
  }
  if (state.coins) {
    return (
      <div className="outcome outcome-coins">
        {state.coins.map((h, i) => (
          <div key={i} className={`coin ${h ? "heads" : "tails"}`}>
            {h ? "H" : "T"}
          </div>
        ))}
      </div>
    );
  }
  if (state.latent) {
    const value = state.latent.value;
    return (
      <div className="outcome latent-outcome">
        <span className="latent-chip">
          <span>state</span>
          <strong>{state.label}</strong>
        </span>
        {typeof value === "number" ? (
          <span className="latent-chip accent">
            <span>value</span>
            <strong>{value}</strong>
          </span>
        ) : null}
      </div>
    );
  }
  return <div className="outcome">{state.label}</div>;
}
