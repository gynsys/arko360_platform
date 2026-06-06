export const DECK_PROPS = {
  22: { peso: 7.3,  I_s: 15,   S_pos: 5.2,  S_neg: 4.8,  Vn: 2200, Mn_pos: 450,  Mn_neg: 380,  t: 0.76, hr: 3.8, Sr: 15.24, wr: 6.5 },
  20: { peso: 9.1,  I_s: 22,   S_pos: 7.1,  S_neg: 6.5,  Vn: 2800, Mn_pos: 620,  Mn_neg: 520,  t: 0.91, hr: 3.8, Sr: 15.24, wr: 6.5 },
  18: { peso: 11.4, I_s: 32,   S_pos: 9.8,  S_neg: 9.0,  Vn: 3500, Mn_pos: 850,  Mn_neg: 710,  t: 1.21, hr: 3.8, Sr: 15.24, wr: 6.5 },
  16: { peso: 14.6, I_s: 48,   S_pos: 13.2, S_neg: 12.1, Vn: 4500, Mn_pos: 1150, Mn_neg: 960,  t: 1.52, hr: 3.8, Sr: 15.24, wr: 6.5 },
};

export const PHI_B    = 0.90;
export const PHI_V    = 0.90;
export const PHI_C    = 0.75;
export const PHI_CONC = 0.90;
export const PHI_VC   = 0.75;
export const E_ACERO  = 2000000;
export const G_ACERO  = E_ACERO / 2.6;
export const GAMMA_CONC = 2400;

import { CATALOGO_AISC } from './catalogos';

export function getProp(perfil, prop) {
  return (CATALOGO_AISC[perfil] && CATALOGO_AISC[perfil][prop]) || 0;
}

export function getDeckProp(calibre, prop) {
  return (DECK_PROPS[calibre] && DECK_PROPS[calibre][prop]) || 0;
}