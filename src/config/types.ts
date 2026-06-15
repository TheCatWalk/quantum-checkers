export interface CollapseTriggers {
  onAttack:    boolean;
  onCountdown: boolean;
  onOwnAttack: boolean;
}

export interface RulesConfig {
  boardSize:                    6 | 8;
  rowsPerPlayer:                number;
  entanglementCountdown:        number;
  maxSimultaneousPairs:         number;  // -1 = limited by free squares
  safePairsEnabled:             boolean;
  gamblePairsEnabled:           boolean;
  forcedCaptures:               boolean;
  kingsCanEntangle:             boolean;
  advancedQuantumInteractions:  boolean;
  collapseTriggers:             CollapseTriggers;
}
