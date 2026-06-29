import { GameConfig, GameState } from "./types";

/** Enumerate a finite latent-variable prior used by interview inference games. */
export function enumerateLatentStates(config: GameConfig): GameState[] {
  const specs = config.latentStates ?? [];
  const totalWeight = specs.reduce((acc, s) => acc + Math.max(0, s.weight), 0);
  if (!specs.length || totalWeight <= 0) return [];

  return specs.map((spec) => ({
    id: spec.id,
    probability: Math.max(0, spec.weight) / totalWeight,
    latent: spec.values,
    label: spec.label,
  }));
}
