import type { RulesConfig } from './types';

// Shorter, more accessible ruleset for event-booth play.
export const RULES_EVENT: RulesConfig = {
  boardSize:                    6,
  rowsPerPlayer:                2,
  entanglementCountdown:        2,
  maxSimultaneousPairs:         2,
  safePairsEnabled:             true,
  gamblePairsEnabled:           true,
  forcedCaptures:               false,
  kingsCanEntangle:             true,
  advancedQuantumInteractions:  false,
  collapseTriggers: {
    onAttack:    true,
    onCountdown: true,
    onOwnAttack: true,
  },
};
