import { useState } from "react";
import { CounterpartyType, Difficulty, SourceKind } from "./engine";
import { ArenaHome } from "./pages/ArenaHome";
import { MakeMarket } from "./pages/MakeMarket";
import { HiddenInference } from "./pages/HiddenInference";
import { ObjectiveLab } from "./pages/ObjectiveLab";
import { FermiMarket } from "./pages/FermiMarket";
import { FiveDiceMarket } from "./pages/FiveDiceMarket";
import { XyzTightenDuel } from "./pages/XyzTightenDuel";
import { ConfidenceIntervalGame } from "./pages/ConfidenceIntervalGame";
import { TraderMemoryArena } from "./pages/TraderMemoryArena";
import { TradingFloor } from "./pages/TradingFloor";

export type ArenaMode =
  | "make_market"
  | "trade_floor"
  | "inference"
  | "objective"
  | "fermi"
  | "five_dice"
  | "xyz_tighten"
  | "confidence_interval"
  | "trader_memory";

export type ArenaSession = {
  mode: ArenaMode;
  difficulty: Difficulty;
  source?: SourceKind;
  payoffId?: string;
  counterparty?: CounterpartyType;
  scenarioId?: string;
  /** Number of quote rounds. */
  rounds?: number;
  /** Hidden State Inference only: selected interview scenario. */
  inferenceId?: string;
};

export function ArenaApp() {
  const [session, setSession] = useState<ArenaSession | null>(null);
  if (!session) return <ArenaHome onStart={setSession} />;

  const back = () => setSession(null);
  switch (session.mode) {
    case "make_market":
      return <MakeMarket onExit={back} />;
    case "trade_floor":
      return <TradingFloor onExit={back} />;
    case "inference":
      return <HiddenInference session={session} onExit={back} />;
    case "objective":
      return <ObjectiveLab session={session} onExit={back} />;
    case "fermi":
      return <FermiMarket session={session} onExit={back} />;
    case "five_dice":
      return <FiveDiceMarket session={session} onExit={back} />;
    case "xyz_tighten":
      return <XyzTightenDuel onExit={back} />;
    case "confidence_interval":
      return <ConfidenceIntervalGame session={session} onExit={back} />;
    case "trader_memory":
      return <TraderMemoryArena onExit={back} />;
  }
}
