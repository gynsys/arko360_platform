import { GAMMA_CONC, PHI_B, PHI_V, getProp, getDeckProp, E_ACERO } from './normas';
import { PERFILES_I_H_TUBO } from './catalogos';
import { calcularMomentoNominalAISC, calcularCortanteNominalAISC, calcularArriostramiento } from './calculosAISC';
import { calcularFactorR, calcularQnStud, verificarCompatibilidadStud } from './calculosStuds';
import { EcConcreto, calcularVcLosa, calcularVcPunzonamiento, calcularAsMinLosa, deflexionViga, deflexionLosaDosDirecciones, frecuenciaNaturalLosa } from './calculosLosa';
import { calcularSeccionCompuesta, calcularMomentoCompuesto } from './calculosCompuestos';
import { optimizarPerfil } from './optimizador';

export function calcularLosaColaboranteNormativo(grid, datos, steelDeckConfig, costos) {
  const { filas, cols, luzX, luzY } = grid;
  const nTramosX = Math.max(cols - 1, 1);
  const nTramosY = Math.max(filas - 1, 1);
  const areaTotal = luzX * nTramosX * luzY * nTramosY;

  const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
  const esDosDirecciones = ratio <= 2;
  const luzMayor = Math.max(luzX, luzY);
  const luzMenor = Math.min(luzX, luzY);

  const {
    espesorConcreto, calibre, sepCorreas,
    tipoVigaPrincipal, tipoCorrea,
    diametroStud = 0.75, alturaDeck, f_c, fy_rebar,
    alturaStud, numStudsPorReborde, anchoReborde,
    mallaTruskon,
  } = steelDeckConfig;

  // Espesor mínimo ACI 318-19: mínimo 5 cm sobre la cresta del deck (Sección 26.3.3)
  const espesorMinimoACI = 5.0; // cm
  const espesorConcreto_efectivo = Math.max(espesorConcreto, espesorMinimoACI);

  const h_total = (espesorConcreto_efectivo + alturaDeck) / 100;
  const h_cm = h_total * 100;
  const h_sobre_deck = espesorConcreto_efectivo;

  // Distribución real uniforme de correas
  const nEspacios = Math.ceil(luzMayor / sepCorreas);
  const sepReal = nEspacios > 0 ? luzMayor / nEspacios : sepCorreas;
  const nCorreasPerBay = Math.max(0, nEspacios - 1);

  // 1. CARGAS
  const pesoConcreto = (espesorConcreto_efectivo / 100) * GAMMA_CONC;
  const pesoDeck = getDeckProp(calibre, 'peso') || 9;
  const pesoCorreas = (getProp(tipoCorrea, 'peso') || 15) / sepReal;
  const pesoVigas = (getProp(tipoVigaPrincipal, 'peso') || 30) * (1 / luzX + 1 / luzY);
  const pesoPropio = pesoConcreto + pesoDeck + pesoCorreas + pesoVigas + 15;

  const wD = pesoPropio + (datos.cmExtra || 0);
  const wL = datos.cv || 0;
  const wu = 1.2 * wD + 1.6 * wL;
  const wServicio = wD + wL;
  const wViva = wL;

  // 2. CONCRETO
  const f_c_val = f_c || 210;
  const fy_rebar_val = fy_rebar || 4200;
  const Ec = EcConcreto(f_c_val);
  const n = E_ACERO / Ec;

  // 3. DECK CONSTRUCCIÓN
  const wConstruccion = pesoConcreto + 100;
  const luzDeck = sepReal;
  const luzDeck_cm = luzDeck * 100;
  const mConstruccion = (wConstruccion * luzDeck * luzDeck) / 8;
  const vConstruccion = (wConstruccion * luzDeck) / 2;
  const Mn_pos_deck = getDeckProp(calibre, 'Mn_pos');
  const Mn_neg_deck = getDeckProp(calibre, 'Mn_neg');
  const Vn_deck = getDeckProp(calibre, 'Vn');
  const phiMn_pos_deck = PHI_B * Mn_pos_deck;
  const phiMn_neg_deck = PHI_B * Mn_neg_deck;
  const phiVn_deck = PHI_V * Vn_deck;
  const cumpleDeckMomentoPos = mConstruccion <= phiMn_pos_deck;
  const cumpleDeckMomentoNeg = mConstruccion <= phiMn_neg_deck;
  const cumpleDeckCortante = vConstruccion <= phiVn_deck;
  const I_s = getDeckProp(calibre, 'I_s');
  const wCons_kgcm = wConstruccion / 100;
  const deflDeck = (5 * wCons_kgcm * Math.pow(luzDeck_cm, 4)) / (384 * E_ACERO * I_s);
  const deflLimDeck = luzDeck_cm / 180;
  const cumpleDeflDeck = deflDeck <= deflLimDeck;

  // 4. LOSA COMPUESTA
  const wuLosa = wu;
  const luzLosa = sepReal; // Steel deck spans 1-way between correas
  const luzLosa_cm = luzLosa * 100;
  // Aproximación de losa continua en una dirección (ACI 318)
  const mPosLosa = (wuLosa * luzLosa * luzLosa) / 14;
  const mNegExtLosa = (wuLosa * luzLosa * luzLosa) / 10;
  const mNegIntLosa = (wuLosa * luzLosa * luzLosa) / 10;

  // 5. CONECTORES - SIZING GEOMÉTRICO
  const d_stud_in = parseFloat(diametroStud) || 0.75;
  const d_stud_cm = d_stud_in * 2.54;
  const Asc_stud = (Math.PI * Math.pow(d_stud_cm, 2)) / 4;
  const Fu_stud = 4500;
  const hr = getDeckProp(calibre, 'hr') || 3.8;
  const Hs = alturaStud || 10;

  // AISC 360-16 I8.2: Hs mínimo = hr + 1.5" (3.81 cm)
  const Hs_min = hr + 3.81;
  // ACI 318-19 §20.5.1: recubrimiento mínimo sobre stud = 0.5" (1.27 cm)
  const Hs_max = (espesorConcreto_efectivo + alturaDeck) - 1.27;
  const cumpleHs = Hs >= Hs_min && Hs <= Hs_max;
  const Hs_rec = Math.max(Hs_min, Math.min(Hs, Hs_max));

  const tf_vp = getProp(tipoVigaPrincipal, 'tf');
  const tf_correa = getProp(tipoCorrea, 'tf');
  const cumpleTf_vp = tf_vp > 0 && d_stud_cm <= 2.5 * tf_vp;
  const cumpleTf_correa = tf_correa > 0 && d_stud_cm <= 2.5 * tf_correa;

  // 6. SECCIÓN COMPUESTA - VIGA PRINCIPAL (VP)
  const luzVigaPrincipal_cm = luzMayor * 100;
  const b_eff_vp_1 = luzVigaPrincipal_cm / 4;
  const b_eff_vp_2 = 16 * espesorConcreto_efectivo + getProp(tipoVigaPrincipal, 'bf');
  const b_eff_vp_3 = luzMenor * 100;
  const b_eff_vp = Math.min(b_eff_vp_1, b_eff_vp_2, b_eff_vp_3);
  const secComp_vp = calcularSeccionCompuesta(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec);

  // REDUCCIÓN STUDS - VP (perpendicular deck)
  const Nc_vp = numStudsPorReborde || 1;
  const wr_vp = anchoReborde || 15;
  const R_vp = calcularFactorR(hr, Hs, Nc_vp, wr_vp);
  const resStud_vp = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, R_vp);
  const phiQn_vp = resStud_vp.phiQn;

  // VIGA PRINCIPAL - DEMANDA Y CAPACIDAD
  const wuVigaPrincipal = wu * luzMenor;
  const Mu_vp = (wuVigaPrincipal * Math.pow(luzVigaPrincipal_cm / 100, 2)) / 8 * 100;
  const Vu_vp = (wuVigaPrincipal * luzVigaPrincipal_cm / 100) / 2;
  const Lb_vp = luzVigaPrincipal_cm;

  const P_acero_vp = getProp(tipoVigaPrincipal, 'A') * getProp(tipoVigaPrincipal, 'Fy');
  const P_conc_vp = 0.85 * f_c_val * b_eff_vp * espesorConcreto_efectivo;
  const phiMn_steel_vp = PHI_B * getProp(tipoVigaPrincipal, 'Fy') * getProp(tipoVigaPrincipal, 'Zx');

  let P_studs_req_vp = 0;
  if (Mu_vp <= phiMn_steel_vp) {
    P_studs_req_vp = 0.25 * Math.min(P_acero_vp, P_conc_vp);
  } else {
    let low = 0.25 * Math.min(P_acero_vp, P_conc_vp);
    let high = Math.min(P_acero_vp, P_conc_vp);
    P_studs_req_vp = high;
    for (let iter = 0; iter < 15; iter++) {
      const mid = (low + high) / 2;
      const res = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, mid);
      if (res && res.phiMn_comp >= Mu_vp) {
        P_studs_req_vp = mid;
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const N_half_vp = P_studs_req_vp / phiQn_vp;
  let N_total_vp = Math.ceil(2 * N_half_vp);
  if (N_total_vp % 2 !== 0) N_total_vp += 1;
  if (N_total_vp < 4) N_total_vp = 4;

  // Separación máxima: usar espesor efectivo (CORREGIDO)
  const s_max = Math.min(8 * (espesorConcreto_efectivo + alturaDeck), 90);
  const s_min = 6 * d_stud_cm;

  let s_vp = luzVigaPrincipal_cm / N_total_vp;

  if (s_vp > s_max) {
    N_total_vp = Math.ceil(luzVigaPrincipal_cm / s_max);
    if (N_total_vp % 2 !== 0) N_total_vp += 1;
    s_vp = luzVigaPrincipal_cm / N_total_vp;
  }

  const capComp_vp = calcularMomentoCompuesto(tipoVigaPrincipal, b_eff_vp, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, N_total_vp * phiQn_vp);
  const phiMn_vp = capComp_vp ? capComp_vp.phiMn_comp : phiMn_steel_vp;
  const cumpleFlex_vp = Mu_vp <= phiMn_vp;

  const resCort_vp = calcularCortanteNominalAISC(tipoVigaPrincipal);
  const phiVn_vp = resCort_vp.phiVn;
  const cumpleCort_vp = Vu_vp <= phiVn_vp;

  const wServ_vp = wServicio * luzMenor / 100;
  const Ix_vp = getProp(tipoVigaPrincipal, 'Ix');
  // Deflexión: usar inercia compuesta (I_tr) si disponible; si no, acero solo
  const I_defl_vp = secComp_vp ? secComp_vp.I_tr : Ix_vp;
  const defl_vp = deflexionViga(wServ_vp, luzVigaPrincipal_cm, E_ACERO, I_defl_vp);
  const deflLim_vp = luzVigaPrincipal_cm / 360;
  const cumpleDefl_vp = defl_vp <= deflLim_vp;
  // Para deflexión compuesta usamos la misma (ya es compuesta)
  const defl_vp_comp = defl_vp;
  const cumpleDefl_vp_comp = cumpleDefl_vp;
  const resFlex_vp = calcularMomentoNominalAISC(tipoVigaPrincipal, Lb_vp, 1.14);
  const arriostre_vp = calcularArriostramiento(tipoVigaPrincipal, Lb_vp, 1.14);

  // 7. SECCIÓN COMPUESTA - CORREAS (Joists)
  const luzCorrea_cm = luzMenor * 100;
  const b_eff_correa_1 = luzCorrea_cm / 4;
  const b_eff_correa_2 = 16 * espesorConcreto_efectivo + getProp(tipoCorrea, 'bf');
  const b_eff_correa_3 = sepReal * 100;
  const b_eff_correa = Math.min(b_eff_correa_1, b_eff_correa_2, b_eff_correa_3);
  const secComp_correa = calcularSeccionCompuesta(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec);

  // REDUCCIÓN STUDS - Correa: calcular R dinámicamente (CORREGIDO)
  // Para correas secundarias se asume 1 stud por reborde como default
  const R_correa = calcularFactorR(hr, Hs, 1, wr_vp);
  const resStud_correa = calcularQnStud(f_c_val, Ec, Asc_stud, Fu_stud, R_correa);
  const phiQn_correa = resStud_correa.phiQn;

  // CORREA - DEMANDA Y CAPACIDAD
  const wuCorrea = wu * sepReal;
  const Mu_correa = (wuCorrea * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa = (wuCorrea * luzCorrea_cm / 100) / 2;
  const Lb_correa = luzCorrea_cm;

  const P_acero_correa = getProp(tipoCorrea, 'A') * getProp(tipoCorrea, 'Fy');
  const P_conc_correa = 0.85 * f_c_val * b_eff_correa * espesorConcreto_efectivo;
  const phiMn_steel_correa = PHI_B * getProp(tipoCorrea, 'Fy') * getProp(tipoCorrea, 'Zx');

  let P_studs_req_correa = 0;
  if (Mu_correa <= phiMn_steel_correa) {
    P_studs_req_correa = 0.25 * Math.min(P_acero_correa, P_conc_correa);
  } else {
    let low = 0.25 * Math.min(P_acero_correa, P_conc_correa);
    let high = Math.min(P_acero_correa, P_conc_correa);
    P_studs_req_correa = high;
    for (let iter = 0; iter < 15; iter++) {
      const mid = (low + high) / 2;
      const res = calcularMomentoCompuesto(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, mid);
      if (res && res.phiMn_comp >= Mu_correa) {
        P_studs_req_correa = mid;
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const N_half_correa = P_studs_req_correa / phiQn_correa;
  let N_total_correa = Math.ceil(2 * N_half_correa);
  if (N_total_correa % 2 !== 0) N_total_correa += 1;
  if (N_total_correa < 4) N_total_correa = 4;

  let s_correa = luzCorrea_cm / N_total_correa;
  if (s_correa > s_max) {
    N_total_correa = Math.ceil(luzCorrea_cm / s_max);
    if (N_total_correa % 2 !== 0) N_total_correa += 1;
    s_correa = luzCorrea_cm / N_total_correa;
  }

  const capComp_correa = calcularMomentoCompuesto(tipoCorrea, b_eff_correa, espesorConcreto_efectivo, f_c_val, Ec, Asc_stud, N_total_correa * phiQn_correa);
  const phiMn_correa = capComp_correa ? capComp_correa.phiMn_comp : phiMn_steel_correa;
  const cumpleFlex_correa = Mu_correa <= phiMn_correa;

  const resCort_correa = calcularCortanteNominalAISC(tipoCorrea);
  const phiVn_correa = resCort_correa.phiVn;
  const cumpleCort_correa = Vu_correa <= phiVn_correa;

  const wServ_correa = wServicio * sepReal / 100;
  const Ix_correa = getProp(tipoCorrea, 'Ix');
  // Deflexión: usar inercia compuesta (I_tr) si disponible
  const I_defl_correa = secComp_correa ? secComp_correa.I_tr : Ix_correa;
  const defl_correa = deflexionViga(wServ_correa, luzCorrea_cm, E_ACERO, I_defl_correa);
  const deflLim_correa = luzCorrea_cm / 360;
  const cumpleDefl_correa = defl_correa <= deflLim_correa;
  const defl_correa_comp = defl_correa;
  const cumpleDefl_correa_comp = cumpleDefl_correa;
  const arriostre_correa = calcularArriostramiento(tipoCorrea, Lb_correa, 1.14);

  // 8. CÁLCULO DE CANTIDAD DE VIGAS Y CORREAS TOTALES PARA LA ESTRUCTURA
  const correasHorizontales = luzX < luzY;
  const numVigasPrincipales = correasHorizontales ? cols : filas;
  const numCorreas = (correasHorizontales ? nTramosY : nTramosX) * nCorreasPerBay;

  const numVPSpans = (correasHorizontales ? nTramosY : nTramosX) * numVigasPrincipales;
  const numCorreaSpans = nTramosX * nTramosY * nCorreasPerBay;

  const totalStuds = (N_total_vp * numVPSpans) + (N_total_correa * numCorreaSpans);
  const capacidadTotalStuds = (N_total_vp * phiQn_vp * numVPSpans) + (N_total_correa * phiQn_correa * numCorreaSpans);

  // 9. CORTANTE CONCRETO
  const bw = 100;
  const d_eff = espesorConcreto_efectivo - 2.5; // Solo concreto sobre la cresta del deck
  const resVc = calcularVcLosa(f_c_val, bw, d_eff);
  const phiVc = resVc.phiVc;
  const Vu_losa = wuLosa * luzLosa / 2;
  const Vu_losa_cm = Vu_losa / 100;
  const cumpleVcLosa = Vu_losa_cm <= phiVc;

  // 10. ACERO MÍNIMO - Solo sobre la cresta del deck (el deck mismo es la armadura de tracción)
  const As_min = calcularAsMinLosa(espesorConcreto_efectivo, 100, fy_rebar_val);
  const mallaTruskon_val = mallaTruskon || 1.88; // cm²/m Truskon T-188
  const As_prov = mallaTruskon_val;
  const cumpleAsMin = As_prov >= As_min;

  // 11. DEFLEXIONES Y VIBRACIÓN
  const deflLosa = deflexionLosaDosDirecciones(wServicio, luzLosa, Ec, h_total);
  const deflLimLosa = luzLosa / 360;
  const cumpleDeflLosa = deflLosa <= deflLimLosa;
  const deflLosaViva = deflexionLosaDosDirecciones(wViva, luzLosa, Ec, h_total);
  const deflLimLosaViva = luzLosa / 480;
  const cumpleDeflLosaViva = deflLosaViva <= deflLimLosaViva;
  const f_natural = frecuenciaNaturalLosa(wServicio, luzLosa, Ec, h_total);
  const cumpleVibracion = f_natural >= 3.0;

  // 12. OPTIMIZADOR
  const costoVigaKg = costos.vigaPrincipalKg || 2.5;
  const costoCorreaKg = costos.correaKg || 2.0;

  const compDataVP = { b_eff: b_eff_vp, espesorConcreto: espesorConcreto_efectivo, f_c_val, Ec, phiQn: phiQn_vp, s_min, Lb: luzVigaPrincipal_cm };
  const optViga = optimizarPerfil(PERFILES_I_H_TUBO, Mu_vp, Vu_vp, luzVigaPrincipal_cm, wServ_vp, deflLim_vp, costoVigaKg, 'viga', compDataVP, d_stud_cm);

  const compDataCorrea = { b_eff: b_eff_correa, espesorConcreto: espesorConcreto_efectivo, f_c_val, Ec, phiQn: phiQn_correa, s_min, Lb: luzCorrea_cm };
  const optCorrea = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa, Vu_correa, luzCorrea_cm, wServ_correa, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea, d_stud_cm);

  const wuCorreaBorde = wu * sepReal / 2;
  const Mu_correa_borde = (wuCorreaBorde * Math.pow(luzCorrea_cm / 100, 2)) / 8 * 100;
  const Vu_correa_borde = (wuCorreaBorde * luzCorrea_cm / 100) / 2;
  const wServ_correa_borde = wServ_correa / 2;
  const optCorreaBorde = optimizarPerfil(PERFILES_I_H_TUBO, Mu_correa_borde, Vu_correa_borde, luzCorrea_cm, wServ_correa_borde, deflLim_correa, costoCorreaKg, 'correa', compDataCorrea, d_stud_cm);

  // 13. MATERIALES Y COSTOS
  const areaDeck = areaTotal * 1.15;
  const wr_deck = getDeckProp(calibre, 'wr') || 6.5;
  const Sr_deck = getDeckProp(calibre, 'Sr') || 15.24;
  const volConcreto = areaTotal * ((espesorConcreto_efectivo / 100) + (wr_deck / Sr_deck) * (hr / 100));
  const longVigasPrincipalesX = filas * (luzX * nTramosX);
  const longVigasPrincipalesY = cols * (luzY * nTramosY);
  const totalLengthCorreas = numCorreas * (correasHorizontales ? (luzX * nTramosX) : (luzY * nTramosY));
  const kgCorreas = (getProp(tipoCorrea, 'peso') || 15) * totalLengthCorreas;
  const kgVigas = (getProp(tipoVigaPrincipal, 'peso') || 30) * (longVigasPrincipalesX + longVigasPrincipalesY);
  const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1;

  const costoTotal =
    (volConcreto * (costos.concretoM3 || 0)) +
    (areaDeck * (costos.steelDeckM2 || 0)) +
    (kgMalla * (costos.aceroKg || 0)) +
    (kgCorreas * (costos.correaKg || 0)) +
    (kgVigas * (costos.vigaPrincipalKg || 0)) +
    (totalStuds * (costos.studUnd || 0));

  // 14. RESUMEN
  const verificaciones = {
    deckConstruccion: {
      descripcion: 'Deck en fase de construcción (AISC 360 I3)',
      momentoPos: { demanda: mConstruccion.toFixed(2), capacidad: phiMn_pos_deck.toFixed(2), cumple: cumpleDeckMomentoPos, ratio: (mConstruccion / phiMn_pos_deck).toFixed(2) },
      momentoNeg: { demanda: mConstruccion.toFixed(2), capacidad: phiMn_neg_deck.toFixed(2), cumple: cumpleDeckMomentoNeg, ratio: (mConstruccion / phiMn_neg_deck).toFixed(2) },
      cortante: { demanda: vConstruccion.toFixed(2), capacidad: phiVn_deck.toFixed(2), cumple: cumpleDeckCortante, ratio: (vConstruccion / phiVn_deck).toFixed(2) },
      deflexion: { demanda: deflDeck.toFixed(3), limite: deflLimDeck.toFixed(2), cumple: cumpleDeflDeck, ratio: (deflDeck / deflLimDeck).toFixed(2) },
      cumpleGlobal: cumpleDeckMomentoPos && cumpleDeckMomentoNeg && cumpleDeckCortante && cumpleDeflDeck,
    },
    seccionCompuesta: {
      descripcion: 'Sección compuesta – Transformada (AISC 360 I3)',
      anchoEfectivo: b_eff_vp.toFixed(1) + ' cm',
      n: n.toFixed(1),
      bTransformado: secComp_vp ? secComp_vp.b_transf.toFixed(2) + ' cm' : 'N/A',
      inerciaTransformada: secComp_vp ? secComp_vp.I_tr.toFixed(0) + ' cm⁴' : 'N/A',
      yBar: secComp_vp ? secComp_vp.y_bar.toFixed(2) + ' cm' : 'N/A',
      S_sup: secComp_vp ? secComp_vp.S_sup.toFixed(1) + ' cm³' : 'N/A',
      S_inf: secComp_vp ? secComp_vp.S_inf.toFixed(1) + ' cm³' : 'N/A',
    },
    momentoCompuesto: {
      descripcion: 'Momento resistente compuesto (AISC 360 I3)',
      P_acero: capComp_vp ? (capComp_vp.P_acero / 1000).toFixed(2) + ' t' : 'N/A',
      P_conc: capComp_vp ? (capComp_vp.P_conc / 1000).toFixed(2) + ' t' : 'N/A',
      P_studs: capComp_vp ? (capComp_vp.P_studs / 1000).toFixed(2) + ' t' : 'N/A',
      PNA: capComp_vp ? capComp_vp.PNA_tipo : 'N/A',
      a: capComp_vp ? capComp_vp.a.toFixed(2) + ' cm' : 'N/A',
      Y2: capComp_vp ? capComp_vp.Y2.toFixed(2) + ' cm' : 'N/A',
      Mn_comp: capComp_vp ? (capComp_vp.Mn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      phiMn_comp: capComp_vp ? (capComp_vp.phiMn_comp / 100000).toFixed(2) + ' t·m' : 'N/A',
      completa: capComp_vp ? capComp_vp.completa : false,
    },
    vigaPrincipal: {
      descripcion: `Viga principal ${tipoVigaPrincipal} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_vp / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_vp / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_vp, ratio: (Mu_vp / phiMn_vp).toFixed(2) },
      cortante: { demanda: (Vu_vp / 1000).toFixed(2) + ' t', capacidad: (phiVn_vp / 1000).toFixed(2) + ' t', cumple: cumpleCort_vp, ratio: (Vu_vp / phiVn_vp).toFixed(2) },
      deflexion: { demanda: defl_vp.toFixed(2) + ' cm', limite: deflLim_vp.toFixed(2) + ' cm', cumple: cumpleDefl_vp, ratio: (defl_vp / deflLim_vp).toFixed(2) },
      deflexionCompuesta: { demanda: defl_vp_comp.toFixed(2) + ' cm', limite: deflLim_vp.toFixed(2) + ' cm', cumple: cumpleDefl_vp_comp, ratio: (defl_vp_comp / deflLim_vp).toFixed(2) },
      pandeo: { Lb: (Lb_vp / 100).toFixed(2) + ' m', Lp: (resFlex_vp.Lp / 100).toFixed(2) + ' m', Lr: (resFlex_vp.Lr / 100).toFixed(2) + ' m', zona: resFlex_vp.zona === 1 ? 'Zona 1 (Plástica)' : (resFlex_vp.zona === 2 ? 'Zona 2 (Inelástica)' : 'Zona 3 (Elástica)') },
      arriostramiento: arriostre_vp,
      cumpleGlobal: cumpleFlex_vp && cumpleCort_vp && cumpleDefl_vp && cumpleDefl_vp_comp,
    },
    correas: {
      descripcion: `Correas ${tipoCorrea} (AISC 360 Cap F/G)`,
      momento: { demanda: (Mu_correa / 100000).toFixed(2) + ' t·m', capacidad: (phiMn_correa / 100000).toFixed(2) + ' t·m', cumple: cumpleFlex_correa, ratio: (Mu_correa / phiMn_correa).toFixed(2) },
      cortante: { demanda: (Vu_correa / 1000).toFixed(2) + ' t', capacidad: (phiVn_correa / 1000).toFixed(2) + ' t', cumple: cumpleCort_correa, ratio: (Vu_correa / phiVn_correa).toFixed(2) },
      deflexion: { demanda: defl_correa.toFixed(2) + ' cm', limite: deflLim_correa.toFixed(2) + ' cm', cumple: cumpleDefl_correa, ratio: (defl_correa / deflLim_correa).toFixed(2) },
      deflexionCompuesta: { demanda: defl_correa_comp.toFixed(2) + ' cm', limite: deflLim_correa.toFixed(2) + ' cm', cumple: cumpleDefl_correa_comp, ratio: (defl_correa_comp / deflLim_correa).toFixed(2) },
      arriostramiento: arriostre_correa,
      cumpleGlobal: cumpleFlex_correa && cumpleCort_correa && cumpleDefl_correa && cumpleDefl_correa_comp,
    },
    conectoresCorte: {
      descripcion: 'Conectores de corte (AISC 360 I2 + I8)',
      diametroStud: d_stud_in + '" (' + (d_stud_cm * 10).toFixed(1) + ' mm)',
      alturaStud: Hs + ' cm',
      Hs_min: Hs_min.toFixed(2) + ' cm',
      Hs_max: Hs_max.toFixed(2) + ' cm',
      cumpleHs: cumpleHs,
      cumpleTf_vp: cumpleTf_vp,
      cumpleTf_correa: cumpleTf_correa,
      tf_vp: tf_vp.toFixed(2) + ' cm',
      tf_correa: tf_correa.toFixed(2) + ' cm',

      // VP
      Qn_vp: resStud_vp.Qn.toFixed(0) + ' kg',
      phiQn_vp: phiQn_vp.toFixed(0) + ' kg',
      N_total_vp: N_total_vp,
      s_vp: s_vp.toFixed(1) + ' cm',
      cumpleS_vp: s_vp >= s_min && s_vp <= s_max,
      s_max_vp: s_max.toFixed(1) + ' cm',
      s_min_vp: s_min.toFixed(1) + ' cm',
      P_acero_vp: (P_acero_vp / 1000).toFixed(1) + ' t',
      P_conc_vp: (P_conc_vp / 1000).toFixed(1) + ' t',
      ratio_vp: (capComp_vp ? (capComp_vp.P_studs / Math.min(P_acero_vp, P_conc_vp)) : 0).toFixed(2),

      // Correa
      Qn_correa: resStud_correa.Qn.toFixed(0) + ' kg',
      phiQn_correa: phiQn_correa.toFixed(0) + ' kg',
      N_total_correa: N_total_correa,
      s_correa: s_correa.toFixed(1) + ' cm',
      cumpleS_correa: s_correa >= s_min && s_correa <= s_max,
      s_max_correa: s_max.toFixed(1) + ' cm',
      s_min_correa: s_min.toFixed(1) + ' cm',
      P_acero_correa: (P_acero_correa / 1000).toFixed(1) + ' t',
      P_conc_correa: (P_conc_correa / 1000).toFixed(1) + ' t',
      ratio_correa: (capComp_correa ? (capComp_correa.P_studs / Math.min(P_acero_correa, P_conc_correa)) : 0).toFixed(2),

      totalStuds,
      capacidadTotal: capacidadTotalStuds.toFixed(0) + ' kg',
      cumple: cumpleHs && cumpleTf_vp && cumpleTf_correa && (s_vp >= s_min && s_vp <= s_max) && (s_correa >= s_min && s_correa <= s_max),
    },
    losaConcreto: {
      descripcion: 'Losa de concreto (ACI 318 - Losa en 1 dirección)',
      momentoPos: { demanda: mPosLosa.toFixed(2) + ' kg·m/m', coef: '1/14' },
      momentoNegExt: { demanda: mNegExtLosa.toFixed(2) + ' kg·m/m', coef: '1/10' },
      momentoNegInt: { demanda: mNegIntLosa.toFixed(2) + ' kg·m/m', coef: '1/10' },
      cortante: { demanda: Vu_losa_cm.toFixed(2) + ' kg/cm', capacidad: phiVc.toFixed(2) + ' kg/cm', cumple: cumpleVcLosa, ratio: (Vu_losa_cm / phiVc).toFixed(2) },
      asMinimo: { requerido: As_min.toFixed(3) + ' cm²/m', provisto: As_prov.toFixed(3) + ' cm²/m', cumple: cumpleAsMin },
      deflexion: { demanda: (deflLosa * 100).toFixed(3) + ' cm', limite: (deflLimLosa * 100).toFixed(3) + ' cm', cumple: cumpleDeflLosa, ratio: (deflLosa / deflLimLosa).toFixed(2) },
      deflexionViva: { demanda: (deflLosaViva * 100).toFixed(3) + ' cm', limite: (deflLimLosaViva * 100).toFixed(3) + ' cm', cumple: cumpleDeflLosaViva, ratio: (deflLosaViva / deflLimLosaViva).toFixed(2) },
      vibracion: { frecuencia: f_natural.toFixed(2) + ' Hz', limite: '3.0 Hz', cumple: cumpleVibracion },
      cumpleGlobal: cumpleVcLosa && cumpleAsMin && cumpleDeflLosa && cumpleDeflLosaViva && cumpleVibracion,
    },
    correaBorde: {
      descripcion: `Correa de Borde (AISC 360) - Mitad de carga tributaria`,
      momento: { demanda: (Mu_correa_borde / 100000).toFixed(2) + ' t·m' },
      optimo: optCorreaBorde.optimo.perfil,
      cumpleGlobal: optCorreaBorde.optimo.cumple,
    },
  };

  const cumpleGlobal = verificaciones.deckConstruccion.cumpleGlobal &&
                       verificaciones.vigaPrincipal.cumpleGlobal &&
                       verificaciones.correas.cumpleGlobal &&
                       verificaciones.conectoresCorte.cumple &&
                       verificaciones.losaConcreto.cumpleGlobal;

  return {
    h: h_total.toFixed(2),
    pesoPropio: pesoPropio.toFixed(0),
    wu: wu.toFixed(2),
    wServicio: wServicio.toFixed(2),
    maxMomentoX: mPosLosa.toFixed(2),
    maxMomentoY: mNegIntLosa.toFixed(2),
    As_min: As_min.toFixed(3) + ' cm²/m',
    volConcreto: volConcreto.toFixed(2),
    kgAcero: (kgMalla + kgCorreas + kgVigas).toFixed(0),
    numBloques: totalStuds,
    costoTotal: costoTotal.toFixed(2),
    costoM2: (costoTotal / areaTotal).toFixed(2),
    cumpleGlobal,
    cumpleCortante: cumpleVcLosa,
    ratioCortante: (Vu_losa_cm / phiVc).toFixed(2),
    cumpleEspesor: espesorConcreto >= espesorMinimoACI,
    ratioEspesor: espesorConcreto > 0 ? (espesorMinimoACI / espesorConcreto).toFixed(2) : "N/A",
    verificaciones,
    optimizador: { viga: optViga, correa: optCorrea },
    steelDeckData: {
      espesorConcreto: espesorConcreto_efectivo,
      espesorMinimo: espesorMinimoACI,
      calibre,
      sepCorreas,
      sepReal,
      tipoVigaPrincipal,
      tipoCorrea,
      diametroStud,
      alturaDeck,
      f_c: f_c_val,
      fy_rebar: fy_rebar_val,
      mConstruccion,
      vConstruccion,
      phiMn_pos_deck,
      phiMn_neg_deck,
      phiVn_deck,
      mPosLosa,
      mNegExtLosa,
      mNegIntLosa,
      totalStuds,
      phiQn: phiQn_vp,
      capacidadTotalStuds,
      R: R_vp,
      kgCorreas,
      kgVigas,
      kgMalla,
      areaDeck,
      longVigasPrincipalesX,
      longVigasPrincipalesY,
      Mu_vp,
      phiMn_vp,
      Vu_vp,
      phiVn_vp,
      defl_vp,
      deflLim_vp,
      Mu_correa,
      phiMn_correa,
      Vu_correa,
      phiVn_correa,
      defl_correa,
      deflLim_correa,
      As_min,
      As_prov,
      phiVc,
      Vu_losa_cm,
      cumpleVcLosa,
      secComp: secComp_vp,
      resComp: capComp_vp,
      f_natural,
      arriostre_vp,
      arriostre_correa,
    },
  };
}

// =============================================================================
// COMPONENTE REACT PROFESIONAL
// =============================================================================
