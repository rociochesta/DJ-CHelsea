// Shared pacing keeps dice, token movement, and landing cards in order.
export const DICE_ROLL_MS = 2200;
export const DICE_SETTLE_MS = 450;
export const TOKEN_STEP_MS = 140;
export const LANDING_PAUSE_MS = 400;
export const rollPresentationMs = dice => DICE_ROLL_MS + DICE_SETTLE_MS + (dice || [6,6]).reduce((a,b)=>a+b,0)*TOKEN_STEP_MS + LANDING_PAUSE_MS;
export const latestBoardRoll = game => Object.values(game?.events || {}).filter(event=>/ rolled [1-6] \+ [1-6]\./.test(event.text)).sort((a,b)=>b.at-a.at)[0];
