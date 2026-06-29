import { useState } from "react";
import { CounterpartyType, Difficulty, SourceKind } from "./engine";
import { ArenaHome } from "./pages/ArenaHome";
import { FairValueDrill } from "./pages/FairValueDrill";
import { MakeMarket } from "./pages/MakeMarket";
import { HiddenInference } from "./pages/HiddenInference";
import { ObjectiveLab } from "./pages/ObjectiveLab";
import { FermiMarket } from "./pages/FermiMarket";
import { FiveDiceMarket } from "./pages/FiveDiceMarket";
import { TanzaniaMarket } from "./pages/TanzaniaMarket";
import { XyzTightenDuel } from "./pages/XyzTightenDuel";
import { ConfidenceIntervalGame } from "./pages/ConfidenceIntervalGame";
import { TraderMemoryArena } from "./pages/TraderMemoryArena";

export type ArenaMode =
  | "fair_value"
  | "make_market"
  | "inference"
  | "objective"
  | "fermi"
  | "five_dice"
  | "tanzania"
  | "xyz_tighten"
  | "confidence_interval"
  | "trader_memory";

/** The rule you are playing for over a session. It changes how to quote. */
export type SessionObjective =
  | "free"
  | "max_ev"
  | "min_variance"
  | "max_worst_case";

export type ArenaSession = {
  mode: ArenaMode;
  difficulty: Difficulty;
  source?: SourceKind;
  payoffId?: string;
  counterparty?: CounterpartyType;
  scenarioId?: string;
  /** Number of quote rounds. Ignored when endless is true. */
  rounds?: number;
  /** Make a Market only: keep quoting until a PnL target or bust. */
  endless?: boolean;
  /** Hidden State Inference only: selected interview scenario. */
  inferenceId?: string;
  /** Endless target PnL that wins the session. */
  target?: number;
  /** Make a Market only: the objective you are scored on. */
  objective?: SessionObjective;
};

export function ArenaApp() {
  const [session, setSession] = useState<ArenaSession | null>(null);
  if (!session) return <ArenaHome onStart={setSession} />;

  const back = () => setSession(null);
  switch (session.mode) {
    case "fair_value":
      return <FairValueDrill session={session} onExit={back} />;
    case "make_market":
      return <MakeMarket session={session} onExit={back} />;
    case "inference":
      return <HiddenInference session={session} onExit={back} />;
    case "objective":
      return <ObjectiveLab session={session} onExit={back} />;
    case "fermi":
      return <FermiMarket session={session} onExit={back} />;
    case "five_dice":
      return <FiveDiceMarket session={session} onExit={back} />;
    case "tanzania":
      return <TanzaniaMarket session={session} onExit={back} />;
    case "xyz_tighten":
      return <XyzTightenDuel session={session} onExit={back} />;
    case "confidence_interval":
      return <ConfidenceIntervalGame session={session} onExit={back} />;
    case "trader_memory":
      return <TraderMemoryArena session={session} onExit={back} />;
  }
}
