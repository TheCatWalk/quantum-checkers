import type { RulesConfig } from './types';

export const RULES_STANDARD: RulesConfig = {
  boardSize:                    8,
  rowsPerPlayer:                3,
  entanglementCountdown:        3,
  maxSimultaneousPairs:         -1,
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
