import React, { useState, useMemo, useRef } from 'react';

// ==================== CONSTANTES Y UTILIDADES ====================
const AREAS_BARRA = {
  '3/8': 0.71,
  '1/2': 1.27,
  '5/8': 1.98,
  '3/4': 2.85,
  '1': 5.07,
};

const PESO_LINEAL_VIGA = {
  'W12x26': 38.7, 'W10x22': 32.9, 'W8x18': 26.8, 'W6x15': 22.3,
  'C6x10.5': 15.6, 'C5x9': 13.4, 'C4x7.25': 10.8,
};

const PESO_STEEL_DECK_M2 = {
  22: 7.3, 20: 9.1, 18: 11.4, 16: 14.6,
};

const CAPACIDAD_MOMENTO_DECK_KGM = {
  22: 450, 20: 620, 18: 850, 16: 1150,
};

const CAPACIDAD_CORTANTE_DECK_KGM = {
  22: 2200, 20: 2800, 18: 3500, 16: 4500,
};

const SEPARACIONES_COMERCIALES = [10, 12.5, 15, 17.5, 20, 22.5, 25, 30];

function redondearSep(s) {
  return SEPARACIONES_COMERCIALES.reduce((prev, curr) => Math.abs(curr - s) < Math.abs(prev - s) ? curr : prev, 15);
}

function calcBarraYSep(AsReq, areaBarra) {
  if (AsReq <= 0 || areaBarra <= 0) return { sep: 0, cantidad: 0 };
  const s = (areaBarra / AsReq) * 100; // cm
  const sep = redondearSep(s);
  const cantidadPorMetro = 100 / sep;
  return { sep, cantidadPorMetro };
}

// ==================== COMPONENTE PRINCIPAL ====================
const CalculadoraLosas = () => {
  const [grid, setGrid] = useState({
    filas: 2,
    cols: 3,
    luzX: 4.5,
    luzY: 4.0,
  });

  const [datos, setDatos] = useState({
    cv: 250,
    cmExtra: 150,
    fc: 210,
    fy: 4200,
    recubrimiento: 2.0,
  });

  const [costos, setCostos] = useState({
    concretoM3: 130,
    aceroKg: 1.5,
    bloqueArcillaUnd: 2.5,
    bloqueEPSUnd: 3.5,
    steelDeckM2: 22,
    mallaM2: 3.0,
    correaKg: 2.0,
    vigaPrincipalKg: 2.2,
    studUnd: 4.0,
  });

  const [losaActiva, setLosaActiva] = useState('maciza');

  // Configuración específica por tipo de losa
  const [aligeradaConfig, setAligeradaConfig] = useState({
    tipoBloque: 'eps', // 'eps' | 'arcilla'
    anchoBloque: 50,   // cm entre ejes de nervios
    anchoNervio: 10,   // cm
    espesorRoseta: 5,  // cm
    dirNervios: 'auto', // 'auto' | 'x' | 'y' | 'ambos'
  });

  const [steelDeckConfig, setSteelDeckConfig] = useState({
    espesorConcreto: 6,   // cm sobre crestas
    calibre: 22,
    sepCorreas: 1.5,      // m entre correas
    tipoVigaPrincipal: 'W12x26',
    tipoCorrea: 'C6x10.5',
    densidadStuds: 2,     // studs/m en vigas principales
    alturaDeck: 7.5,      // cm (altura del perfil acanalado)
  });

  const [macizaConfig, setMacizaConfig] = useState({
    diametroPosX: '1/2',
    diametroPosY: '1/2',
    diametroNegX: '1/2',
    diametroNegY: '1/2',
  });

  const printRef = useRef();

  // ==================== HANDLERS ====================
  const handleGrid = (e) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    setGrid({ ...grid, [name]: isNaN(val) || val <= 0 ? 1 : val });
  };

  const handleDatos = (e) => {
    const val = parseFloat(e.target.value);
    setDatos({ ...datos, [e.target.name]: isNaN(val) ? 0 : val });
  };

  const handleCostos = (e) => {
    const val = parseFloat(e.target.value);
    setCostos({ ...costos, [e.target.name]: isNaN(val) ? 0 : val });
  };

  const handleAligerada = (e) => {
    const { name, value } = e.target;
    const val = name === 'tipoBloque' || name === 'dirNervios' ? value : parseFloat(value);
    setAligeradaConfig({ ...aligeradaConfig, [name]: val });
  };

  const handleSteelDeck = (e) => {
    const { name, value } = e.target;
    const val = name.startsWith('tipo') ? value : parseFloat(value);
    setSteelDeckConfig({ ...steelDeckConfig, [name]: val });
  };

  const handleMaciza = (e) => {
    setMacizaConfig({ ...macizaConfig, [e.target.name]: e.target.value });
  };

  // ==================== CÁLCULOS ACI 318-19 / SDI ====================
  const calc = useMemo(() => {
    const { filas, cols, luzX, luzY } = grid;
    const nTramosX = Math.max(cols - 1, 1);
    const nTramosY = Math.max(filas - 1, 1);
    const areaTotal = luzX * nTramosX * luzY * nTramosY;

    const ratio = Math.max(luzX, luzY) / Math.min(luzX, luzY);
    const esDosDirecciones = ratio <= 2;
    const luzMayor = Math.max(luzX, luzY);
    const luzMenor = Math.min(luzX, luzY);

    // Resultados base
    let h, pesoPropio, wu, wServicio;
    let volConcreto = 0, kgAcero = 0, numBloques = 0, costoTotal = 0;
    let detalleArmado = {};
    let steelDeckData = {};
    let aligeradaData = {};
    let macizaData = {};

    // ==================== MACIZA ====================
    if (losaActiva === 'maciza') {
      h = Math.max(Math.ceil((luzMayor * 100) / 20), 10) / 100;
      pesoPropio = h * 2400;

      const wD = pesoPropio + datos.cmExtra;
      wu = 1.2 * wD + 1.6 * datos.cv;
      wServicio = wD + datos.cv;

      // Momentos según ACI 318-19 para losas
      // Para losas en dos direcciones: usar coeficientes aproximados de franjas
      // Para una dirección: viga continua
      let mPosX, mNegX, mPosY, mNegY;

      if (esDosDirecciones) {
        // Losa en dos direcciones - Método simplificado de franjas (ACI 8.3, 8.4)
        // Franja de columna toma ~65% del momento total, franja central ~35%
        // Coeficientes aproximados para panel interior
        const wuPanel = wu * luzMenor; // carga por metro en dirección mayor
        const MoX = (wuPanel * Math.pow(luzMayor, 2)) / 8;
        const MoY = (wu * luzMayor * Math.pow(luzMenor, 2)) / 8;

        // Distribución aproximada: franja de columna 65%, franja media 35%
        // Momento negativo ~0.65Mo, positivo ~0.35Mo en franja de columna
        mNegX = 0.65 * MoX * 0.65; // 65% de Mo, 65% en franja col
        mPosX = 0.35 * MoX * 0.65;
        mNegY = 0.65 * MoY * 0.65;
        mPosY = 0.35 * MoY * 0.65;
      } else {
        // Losa en una dirección - viga continua
        const wuLineal = wu * luzMenor;
        mPosX = (wuLineal * Math.pow(luzMayor, 2)) / 14; // Extremo
        mNegX = (wuLineal * Math.pow(luzMayor, 2)) / 11;
        mPosY = (wu * Math.pow(luzMenor, 2)) / 14; // Transversal, luz menor
        mNegY = (wu * Math.pow(luzMenor, 2)) / 11;
      }

      // Ajuste para tramo único
      if (nTramosX === 1 && !esDosDirecciones) {
        mPosX = (wu * luzMenor * Math.pow(luzMayor, 2)) / 8;
        mNegX = 0;
      }
      if (nTramosY === 1 && !esDosDirecciones) {
        mPosY = (wu * luzMayor * Math.pow(luzMenor, 2)) / 8;
        mNegY = 0;
      }

      const maxMomentoX = Math.max(mPosX, mNegX);
      const maxMomentoY = Math.max(mPosY, mNegY);
      const maxMomento = Math.max(maxMomentoX, maxMomentoY);

      // Diseño a flexión por dirección
      const d = (h * 100) - datos.recubrimiento;
      const b = 100;

      const calcDir = (Mu) => {
        const mu_kg_cm = Mu * 100;
        const Ru = mu_kg_cm / (0.90 * b * Math.pow(d, 2));
        let rho = (0.85 * datos.fc / datos.fy) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * datos.fc))));
        if (isNaN(rho) || rho < 0) rho = 0;
        const As_min = 0.0018 * b * (h * 100);
        const As_req = Math.max(rho * b * d, As_min);
        return { As_req, As_min, rho, Ru };
      };

      const flexX = calcDir(maxMomentoX);
      const flexY = calcDir(maxMomentoY);
      const flexGov = calcDir(maxMomento);

      // Selección de barras y separaciones
      const armadoDir = (AsReq, diametroPos, diametroNeg) => {
        const areaPos = AREAS_BARRA[diametroPos];
        const areaNeg = AREAS_BARRA[diametroNeg];
        const pos = calcBarraYSep(AsReq, areaPos);
        const neg = calcBarraYSep(AsReq * 1.3, areaNeg); // Negativo ~30% más
        return { pos, neg, diametroPos, diametroNeg };
      };

      const armX = armadoDir(flexX.As_req, macizaConfig.diametroPosX, macizaConfig.diametroNegX);
      const armY = armadoDir(flexY.As_req, macizaConfig.diametroPosY, macizaConfig.diametroNegY);

      macizaData = {
        mPosX, mNegX, mPosY, mNegY,
        maxMomentoX, maxMomentoY, maxMomento,
        flexX, flexY,
        armX, armY,
        d, b,
      };

      // Cortante
      const Vc = 0.53 * Math.sqrt(datos.fc) * b * d;
      const φVc = 0.75 * Vc;
      const vuMax = (wu * luzMayor) / 2;
      const cumpleCortante = vuMax <= φVc;

      // Materiales
      volConcreto = areaTotal * h;
      const kgAceroX = (flexX.As_req / 10000) * areaTotal * 7850 * 1.15;
      const kgAceroY = esDosDirecciones ? (flexY.As_req / 10000) * areaTotal * 7850 * 1.15 : 0;
      kgAcero = kgAceroX + kgAceroY;

      costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg);

      // Verificaciones
      const h_min = (luzMayor * 100) / 20;
      const cumpleEspesor = (h * 100) >= h_min;
      const β1 = datos.fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (datos.fc - 280) / 70);
      const a = flexGov.rho * datos.fy * d / (0.85 * datos.fc);
      const c = a / β1;
      const εty = datos.fy / 2_000_000;
      const εt = c > 0 ? ((d - c) / c) * 0.003 : 0;
      const tensionControlada = εt >= εty + 0.003;

      let deflexion = null;
      if (!cumpleEspesor) {
        const Ec = 15100 * Math.sqrt(datos.fc);
        const Ig = (b * Math.pow(h * 100, 3)) / 12;
        const wServCm = wServicio / 100;
        const Lcm = luzMayor * 100;
        const δ = (5 * wServCm * Math.pow(Lcm, 4)) / (384 * Ec * Ig);
        const δLim = Lcm / 360;
        deflexion = { δ: δ.toFixed(3), δLim: δLim.toFixed(2), cumple: δ <= δLim };
      }

      const s_max = Math.min(3 * (h * 100), 45.7);

      detalleArmado = {
        h: (h * 100).toFixed(1),
        h_min: h_min.toFixed(1),
        pesoPropio: pesoPropio.toFixed(0),
        wu: wu.toFixed(2),
        wServicio: wServicio.toFixed(2),
        d: d.toFixed(1),
        maxMomentoX: maxMomentoX.toFixed(2),
        maxMomentoY: maxMomentoY.toFixed(2),
        maxMomento: maxMomento.toFixed(2),
        As_reqX: flexX.As_req.toFixed(2),
        As_reqY: flexY.As_req.toFixed(2),
        As_min: flexX.As_min.toFixed(2),
        ρ: flexGov.rho.toFixed(6),
        εt: εt.toFixed(5),
        εty: εty.toFixed(5),
        tensionControlada,
        Vc: Vc.toFixed(0),
        φVc: φVc.toFixed(0),
        vuMax: vuMax.toFixed(2),
        cumpleCortante,
        cumpleEspesor,
        deflexion,
        s_max: s_max.toFixed(1),
        volConcreto: volConcreto.toFixed(2),
        kgAcero: kgAcero.toFixed(0),
        costoTotal: costoTotal.toFixed(2),
        costoM2: (costoTotal / areaTotal).toFixed(2),
        // Armado detallado
        armX: {
          posSep: armX.pos.sep,
          negSep: armX.neg.sep,
          posDiam: armX.diametroPos,
          negDiam: armX.diametroNeg,
          posCant: (armX.pos.cantidadPorMetro * areaTotal).toFixed(0),
          negCant: (armX.neg.cantidadPorMetro * areaTotal * 0.5).toFixed(0), // Negativo en apoyos ~50% del área
        },
        armY: {
          posSep: armY.pos.sep,
          negSep: armY.neg.sep,
          posDiam: armY.diametroPos,
          negDiam: armY.diametroNeg,
          posCant: (armY.pos.cantidadPorMetro * areaTotal).toFixed(0),
          negCant: (armY.neg.cantidadPorMetro * areaTotal * 0.5).toFixed(0),
        },
      };
    }

    // ==================== ALIGERADA ====================
    else if (losaActiva === 'aligerada') {
      h = Math.max(Math.ceil((luzMayor * 100) / 16), 15) / 100;
      const { anchoNervio, espesorRoseta, anchoBloque, tipoBloque, dirNervios } = aligeradaConfig;

      // Determinar dirección de nervios
      let nerviosEnX = false, nerviosEnY = false;
      if (dirNervios === 'auto') {
        if (esDosDirecciones) {
          nerviosEnX = true;
          nerviosEnY = true;
        } else {
          nerviosEnX = luzX >= luzY; // Nervios en dirección de luz mayor
          nerviosEnY = luzY > luzX;
        }
      } else if (dirNervios === 'x') { nerviosEnX = true; }
      else if (dirNervios === 'y') { nerviosEnY = true; }
      else if (dirNervios === 'ambos') { nerviosEnX = true; nerviosEnY = true; }

      // Volumen de concreto por m²
      const volM2 = (espesorRoseta / 100) + ((anchoNervio / 100) * (h - espesorRoseta / 100) * (100 / anchoBloque));
      pesoPropio = volM2 * 2400;

      // Peso de bloques
      const pesoBloqueM2 = tipoBloque === 'arcilla' ? 25 : 0.5; // kg/m² aprox

      const wD = pesoPropio + datos.cmExtra + pesoBloqueM2;
      wu = 1.2 * wD + 1.6 * datos.cv;
      wServicio = wD + datos.cv;

      // Momentos - viga continua en dirección de nervios
      const calcMomentosNervios = (luz, nTramos, wuLineal) => {
        const tramos = [];
        for (let i = 0; i < nTramos; i++) {
          const isExtremo = (i === 0 || i === nTramos - 1);
          let mPos, mNegIzq, mNegDer;
          if (nTramos === 1) {
            mPos = (wuLineal * luz * luz) / 8;
            mNegIzq = 0; mNegDer = 0;
          } else if (isExtremo) {
            mPos = (wuLineal * luz * luz) / 14;
            mNegIzq = (wuLineal * luz * luz) / 16;
            mNegDer = (wuLineal * luz * luz) / 11;
          } else {
            mPos = (wuLineal * luz * luz) / 16;
            mNegIzq = (wuLineal * luz * luz) / 11;
            mNegDer = (wuLineal * luz * luz) / 11;
          }
          tramos.push({ id: i, luz, mPos, mNegIzq, mNegDer, isExtremo });
        }
        return tramos;
      };

      // Carga por nervio
      const cargaPorNervioX = wu * (anchoBloque / 100); // kg/m de nervio
      const cargaPorNervioY = wu * (anchoBloque / 100);

      const tramosX = nerviosEnX ? calcMomentosNervios(luzX, nTramosX, cargaPorNervioX) : [];
      const tramosY = nerviosEnY ? calcMomentosNervios(luzY, nTramosY, cargaPorNervioY) : [];

      const maxMomentoX = nerviosEnX ? Math.max(...tramosX.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer))) : 0;
      const maxMomentoY = nerviosEnY ? Math.max(...tramosY.map(t => Math.max(t.mPos, t.mNegIzq, t.mNegDer))) : 0;
      const maxMomento = Math.max(maxMomentoX, maxMomentoY);

      // Diseño a flexión del nervio (sección rectangular b x h)
      const dNervio = (h * 100) - datos.recubrimiento;
      const bNervio = anchoNervio;
      const mu_kg_cm = maxMomento * 100;
      const Ru = mu_kg_cm / (0.90 * bNervio * Math.pow(dNervio, 2));
      let rho = (0.85 * datos.fc / datos.fy) * (1 - Math.sqrt(1 - (2 * Ru / (0.85 * datos.fc))));
      if (isNaN(rho) || rho < 0) rho = 0;
      const As_min = 0.0018 * bNervio * (h * 100);
      const As_req = Math.max(rho * bNervio * dNervio, As_min);

      // Cortante en nervio
      const Vc = 0.53 * Math.sqrt(datos.fc) * bNervio * dNervio;
      const φVc = 0.75 * Vc;
      const vuMax = (wu * anchoBloque / 100 * Math.max(luzX, luzY)) / 2;
      const cumpleCortante = vuMax <= φVc;

      const h_min = (luzMayor * 100) / 16;
      const cumpleEspesor = (h * 100) >= h_min;

      const β1 = datos.fc <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (datos.fc - 280) / 70);
      const a = rho * datos.fy * dNervio / (0.85 * datos.fc);
      const c = a / β1;
      const εty = datos.fy / 2_000_000;
      const εt = c > 0 ? ((dNervio - c) / c) * 0.003 : 0;
      const tensionControlada = εt >= εty + 0.003;

      // Materiales
      volConcreto = areaTotal * volM2;
      const numNerviosX = nerviosEnX ? Math.ceil((luzY * nTramosY) / (anchoBloque / 100)) * nTramosX : 0;
      const numNerviosY = nerviosEnY ? Math.ceil((luzX * nTramosX) / (anchoBloque / 100)) * nTramosY : 0;
      const kgAceroX = nerviosEnX ? (As_req / 10000) * luzX * numNerviosX * 7850 * 1.3 : 0;
      const kgAceroY = nerviosEnY ? (As_req / 10000) * luzY * numNerviosY * 7850 * 1.3 : 0;
      kgAcero = kgAceroX + kgAceroY;

      // Malla en roseta
      const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1; // 6x6 10/10 ~0.142 cm²/m

      // Bloques
      const areaPorBloque = (anchoBloque / 100) * (luzX < luzY ? luzX : luzY); // aprox
      numBloques = Math.ceil(areaTotal / areaPorBloque);

      const costoBloques = numBloques * (tipoBloque === 'arcilla' ? costos.bloqueArcillaUnd : costos.bloqueEPSUnd);
      costoTotal = (volConcreto * costos.concretoM3) + (kgAcero * costos.aceroKg) + costoBloques + (kgMalla * costos.aceroKg);

      aligeradaData = {
        nerviosEnX, nerviosEnY,
        numNerviosX, numNerviosY,
        tramosX, tramosY,
        maxMomentoX, maxMomentoY, maxMomento,
        dNervio, bNervio, As_req, As_min, rho, Ru,
        volM2,
        kgMalla,
      };

      detalleArmado = {
        h: (h * 100).toFixed(1),
        h_min: h_min.toFixed(1),
        pesoPropio: pesoPropio.toFixed(0),
        wu: wu.toFixed(2),
        wServicio: wServicio.toFixed(2),
        d: dNervio.toFixed(1),
        maxMomentoX: maxMomentoX.toFixed(2),
        maxMomentoY: maxMomentoY.toFixed(2),
        maxMomento: maxMomento.toFixed(2),
        As_req: As_req.toFixed(2),
        As_min: As_min.toFixed(2),
        ρ: rho.toFixed(6),
        εt: εt.toFixed(5),
        εty: εty.toFixed(5),
        tensionControlada,
        Vc: Vc.toFixed(0),
        φVc: φVc.toFixed(0),
        vuMax: vuMax.toFixed(2),
        cumpleCortante,
        cumpleEspesor,
        deflexion: null,
        s_max: Math.min(3 * h * 100, 45.7).toFixed(1),
        volConcreto: volConcreto.toFixed(2),
        kgAcero: kgAcero.toFixed(0),
        numBloques,
        costoTotal: costoTotal.toFixed(2),
        costoM2: (costoTotal / areaTotal).toFixed(2),
        kgMalla: kgMalla.toFixed(0),
      };
    }

    // ==================== STEEL DECK (SDI) ====================
    else {
      const { espesorConcreto, calibre, sepCorreas, tipoVigaPrincipal, tipoCorrea, densidadStuds, alturaDeck } = steelDeckConfig;
      h = (espesorConcreto + alturaDeck) / 100; // h total en metros

      // Peso propio del sistema compuesto
      const pesoConcreto = (espesorConcreto / 100) * 2400; // kg/m² (sobre crestas)
      const pesoDeck = PESO_STEEL_DECK_M2[calibre] || 9;
      const pesoCorreas = (PESO_LINEAL_VIGA[tipoCorrea] || 15) / sepCorreas;
      const pesoVigas = (PESO_LINEAL_VIGA[tipoVigaPrincipal] || 30) / (esDosDirecciones ? Math.min(luzX, luzY) : Math.max(luzX, luzY));

      pesoPropio = pesoConcreto + pesoDeck + pesoCorreas + pesoVigas + 15; // +15 misceláneos

      const wD = pesoPropio + datos.cmExtra;
      wu = 1.2 * wD + 1.6 * datos.cv;
      wServicio = wD + datos.cv;

      // Verificación del deck en fase de construcción (SDI)
      const wConstruccion = pesoConcreto + 100; // +100 kg/m² personal/equipos
      const luzDeck = sepCorreas; // m, el deck apoya en correas
      const mConstruccion = (wConstruccion * luzDeck * luzDeck) / 8; // kg-m/m
      const vConstruccion = (wConstruccion * luzDeck) / 2; // kg/m
      const capMoment = CAPACIDAD_MOMENTO_DECK_KGM[calibre] || 450;
      const capCortante = CAPACIDAD_CORTANTE_DECK_KGM[calibre] || 2200;
      const cumpleDeck = mConstruccion <= capMoment && vConstruccion <= capCortante;
      const deflDeck = (5 * (wConstruccion / 100) * Math.pow(luzDeck * 100, 4)) / (384 * 2_000_000 * 15); // I aprox ~15 cm⁴/m
      const cumpleDeflDeck = deflDeck <= (luzDeck * 100) / 180;

      // Momentos de la losa compuesta (diseño como losa reforzada)
      // El steel deck actúa como refuerzo inferior (positivo)
      // Usar malla de temperatura en la parte superior
      const wuLosa = wu; // kg/m²
      const luzLosa = Math.min(luzX, luzY); // la losa se diseña en la luz menor entre correas/vigas
      const mPosLosa = (wuLosa * luzLosa * luzLosa) / 14;
      const mNegLosa = (wuLosa * luzLosa * luzLosa) / 11;

      // Conectores de corte (shear studs)
      // Cantidad total estimada: densidad * longitud de vigas principales
      const longVigasPrincipalesX = (filas) * (luzX * nTramosX);
      const longVigasPrincipalesY = (cols) * (luzY * nTramosY);
      const totalStuds = Math.ceil((longVigasPrincipalesX + longVigasPrincipalesY) * densidadStuds);

      // Materiales
      const areaDeck = areaTotal * 1.15; // 15% solapes y cortes
      volConcreto = areaTotal * (espesorConcreto / 100);
      const kgCorreas = (PESO_LINEAL_VIGA[tipoCorrea] || 15) * (
        Math.ceil((luzX * nTramosX) / sepCorreas) * (luzY * nTramosY) +
        Math.ceil((luzY * nTramosY) / sepCorreas) * (luzX * nTramosX)
      );
      const kgVigas = (PESO_LINEAL_VIGA[tipoVigaPrincipal] || 30) * (longVigasPrincipalesX + longVigasPrincipalesY);
      const kgMalla = (0.142 / 10000) * areaTotal * 7850 * 1.1; // malla de temperatura

      costoTotal =
        (volConcreto * costos.concretoM3) +
        (areaDeck * costos.steelDeckM2) +
        (kgMalla * costos.aceroKg) +
        (kgCorreas * costos.correaKg) +
        (kgVigas * costos.vigaPrincipalKg) +
        (totalStuds * costos.studUnd);

      steelDeckData = {
        espesorConcreto, calibre, sepCorreas, tipoVigaPrincipal, tipoCorrea,
        densidadStuds, alturaDeck,
        mConstruccion, vConstruccion, capMoment, capCortante,
        cumpleDeck, deflDeck, cumpleDeflDeck,
        mPosLosa, mNegLosa,
        totalStuds,
        kgCorreas, kgVigas, kgMalla, areaDeck,
        longVigasPrincipalesX, longVigasPrincipalesY,
      };

      detalleArmado = {
        h: h.toFixed(1),
        h_min: '--',
        pesoPropio: pesoPropio.toFixed(0),
        wu: wu.toFixed(2),
        wServicio: wServicio.toFixed(2),
        d: (espesorConcreto - 2).toFixed(1),
        maxMomentoX: mPosLosa.toFixed(2),
        maxMomentoY: mNegLosa.toFixed(2),
        maxMomento: Math.max(mPosLosa, mNegLosa).toFixed(2),
        As_req: 'Malla temp.',
        As_min: '0.142 cm²/m',
        ρ: 'N/A',
        εt: 'N/A',
        εty: 'N/A',
        tensionControlada: true,
        Vc: capCortante.toFixed(0),
        φVc: (capCortante * 0.75).toFixed(0),
        vuMax: vConstruccion.toFixed(2),
        cumpleCortante: cumpleDeck,
        cumpleEspesor: cumpleDeflDeck,
        deflexion: { δ: deflDeck.toFixed(3), δLim: (luzDeck * 100 / 180).toFixed(2), cumple: cumpleDeflDeck },
        s_max: '30.0',
        volConcreto: volConcreto.toFixed(2),
        kgAcero: (kgMalla + kgCorreas + kgVigas).toFixed(0),
        numBloques: totalStuds,
        costoTotal: costoTotal.toFixed(2),
        costoM2: (costoTotal / areaTotal).toFixed(2),
      };
    }

    return {
      areaTotal,
      nTramosX,
      nTramosY,
      ratio,
      esDosDirecciones,
      ...detalleArmado,
      macizaData,
      aligeradaData,
      steelDeckData,
    };
  }, [grid, datos, costos, losaActiva, macizaConfig, aligeradaConfig, steelDeckConfig]);

  // ==================== SVG RETÍCULA ====================
  const renderGrid = () => {
    const { filas, cols, luzX, luzY } = grid;
    const nTramosX = Math.max(cols - 1, 1);
    const nTramosY = Math.max(filas - 1, 1);

    const svgW = 720;
    const svgH = 520;
    const mL = 80;
    const mR = 40;
    const mT = 50;
    const mB = 60;

    const totalW = nTramosX * luzX;
    const totalH = nTramosY * luzY;
    const scale = Math.min((svgW - mL - mR) / totalW, (svgH - mT - mB) / totalH);

    const ox = mL + (svgW - mL - mR - totalW * scale) / 2;
    const oy = mT + (svgH - mT - mB - totalH * scale) / 2;

    const apoyos = [];
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < cols; c++) {
        apoyos.push({
          x: ox + c * luzX * scale,
          y: oy + r * luzY * scale,
          id: `${r}-${c}`,
        });
      }
    }

    // Elementos de steel deck: correas y vigas principales
    const correasElements = [];
    const vigasElements = [];
    const studsElements = [];

    if (losaActiva === 'colaborante') {
      const { sepCorreas } = steelDeckConfig;
      const sepPx = sepCorreas * scale;

      // Correas en dirección X (entre apoyos en X)
      // Se colocan entre las vigas principales (que están en Y)
      for (let r = 0; r < filas; r++) {
        const numCorreas = Math.max(Math.ceil((luzY * nTramosY) / sepCorreas) - 1, 0);
        for (let k = 1; k <= numCorreas; k++) {
          const y = oy + k * sepPx;
          if (y < oy + nTramosY * luzY * scale) {
            correasElements.push(
              <line key={`cx-${r}-${k}`}
                x1={ox + r * luzY * scale * 0} y1={y}
                x2={ox + nTramosX * luzX * scale} y2={y}
                stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8"
              />
            );
          }
        }
      }

      // Correas en dirección Y
      for (let c = 0; c < cols; c++) {
        const numCorreas = Math.max(Math.ceil((luzX * nTramosX) / sepCorreas) - 1, 0);
        for (let k = 1; k <= numCorreas; k++) {
          const x = ox + k * sepPx;
          if (x < ox + nTramosX * luzX * scale) {
            correasElements.push(
              <line key={`cy-${c}-${k}`}
                x1={x} y1={oy}
                x2={x} y2={oy + nTramosY * luzY * scale}
                stroke="#8e44ad" strokeWidth="3" strokeDasharray="4,2" opacity="0.8"
              />
            );
          }
        }
      }

      // Vigas principales (en perimetros y en líneas de columnas)
      for (let r = 0; r < filas; r++) {
        vigasElements.push(
          <line key={`vpx-${r}`}
            x1={ox} y1={oy + r * luzY * scale}
            x2={ox + nTramosX * luzX * scale} y2={oy + r * luzY * scale}
            stroke="#2c3e50" strokeWidth="6" opacity="0.9"
          />
        );
      }
      for (let c = 0; c < cols; c++) {
        vigasElements.push(
          <line key={`vpy-${c}`}
            x1={ox + c * luzX * scale} y1={oy}
            x2={ox + c * luzX * scale} y2={oy + nTramosY * luzY * scale}
            stroke="#2c3e50" strokeWidth="6" opacity="0.9"
          />
        );
      }

      // Conectores de corte (studs) en vigas principales
      for (let r = 0; r < filas; r++) {
        for (let c = 0; c < cols; c++) {
          studsElements.push(
            <circle key={`stud-${r}-${c}`}
              cx={ox + c * luzX * scale + 10}
              cy={oy + r * luzY * scale + 10}
              r="4" fill="#e67e22" stroke="#d35400" strokeWidth="1"
            />
          );
        }
      }
    }

    // Nervios para aligerada
    const nerviosElements = [];
    if (losaActiva === 'aligerada') {
      const { anchoBloque, nerviosEnX, nerviosEnY } = calc.aligeradaData;
      const sepNervios = (anchoBloque / 100) * scale;

      if (nerviosEnX) {
        for (let r = 0; r < filas; r++) {
          const numNervios = Math.ceil((luzY * nTramosY) / (anchoBloque / 100));
          for (let k = 0; k < numNervios; k++) {
            const y = oy + k * sepNervios;
            if (y <= oy + nTramosY * luzY * scale + 1) {
              nerviosElements.push(
                <line key={`nx-${r}-${k}`}
                  x1={ox} y1={y}
                  x2={ox + nTramosX * luzX * scale} y2={y}
                  stroke="#d35400" strokeWidth="2" opacity="0.7"
                />
              );
              // Indicación de armado
              if (k % 2 === 0) {
                nerviosElements.push(
                  <text key={`nxl-${r}-${k}`} x={ox + 5} y={y - 3} fill="#d35400" fontSize="8">As+</text>
                );
              }
            }
          }
        }
      }

      if (nerviosEnY) {
        for (let c = 0; c < cols; c++) {
          const numNervios = Math.ceil((luzX * nTramosX) / (anchoBloque / 100));
          for (let k = 0; k < numNervios; k++) {
            const x = ox + k * sepNervios;
            if (x <= ox + nTramosX * luzX * scale + 1) {
              nerviosElements.push(
                <line key={`ny-${c}-${k}`}
                  x1={x} y1={oy}
                  x2={x} y2={oy + nTramosY * luzY * scale}
                  stroke="#d35400" strokeWidth="2" opacity="0.7"
                />
              );
              if (k % 2 === 0) {
                nerviosElements.push(
                  <text key={`nyl-${c}-${k}`} x={x + 3} y={oy + 10} fill="#d35400" fontSize="8">As+</text>
                );
              }
            }
          }
        }
      }
    }

    // Diagramas de momento (solo para maciza y aligerada)
    const momentPathsX = [];
    const momentPathsY = [];

    if (losaActiva !== 'colaborante') {
      // X
      const tramosX = calc.aligeradaData?.tramosX || [];
      const usetrX = tramosX.length > 0 ? tramosX : Array(nTramosX).fill(0).map((_, i) => ({
        mPos: (calc.wu * luzX * luzX) / (i === 0 || i === nTramosX - 1 ? 14 : 16),
        mNegIzq: (calc.wu * luzX * luzX) / (i === 0 ? 16 : 11),
        mNegDer: (calc.wu * luzX * luzX) / (i === nTramosX - 1 ? 16 : 11),
      }));

      for (let r = 0; r < filas; r++) {
        for (let i = 0; i < nTramosX; i++) {
          const tramo = usetrX[i];
          const x1 = ox + i * luzX * scale;
          const x2 = ox + (i + 1) * luzX * scale;
          const y = oy + r * luzY * scale;
          const midX = (x1 + x2) / 2;
          const maxM = Math.max(tramo.mPos || 0, tramo.mNegIzq || 0, tramo.mNegDer || 0);
          const scaleM = maxM > 0 ? 25 / maxM : 0;

          momentPathsX.push(
            <g key={`mx-${r}-${i}`}>
              <path d={`M ${x1},${y} Q ${midX},${y + (tramo.mPos || 0) * scaleM} ${x2},${y}`}
                fill="none" stroke="#0d6efd" strokeWidth="2" opacity="0.7" />
              <path d={`M ${x1},${y} Q ${x1 + (x2 - x1) * 0.25},${y - (tramo.mNegIzq || 0) * scaleM} ${midX},${y}`}
                fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
              <path d={`M ${midX},${y} Q ${x2 - (x2 - x1) * 0.25},${y - (tramo.mNegDer || 0) * scaleM} ${x2},${y}`}
                fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
            </g>
          );
        }
      }

      // Y
      const tramosY = calc.aligeradaData?.tramosY || [];
      const usetrY = tramosY.length > 0 ? tramosY : Array(nTramosY).fill(0).map((_, i) => ({
        mPos: (calc.wu * luzY * luzY) / (i === 0 || i === nTramosY - 1 ? 14 : 16),
        mNegIzq: (calc.wu * luzY * luzY) / (i === 0 ? 16 : 11),
        mNegDer: (calc.wu * luzY * luzY) / (i === nTramosY - 1 ? 16 : 11),
      }));

      for (let c = 0; c < cols; c++) {
        for (let i = 0; i < nTramosY; i++) {
          const tramo = usetrY[i];
          const y1 = oy + i * luzY * scale;
          const y2 = oy + (i + 1) * luzY * scale;
          const x = ox + c * luzX * scale;
          const midY = (y1 + y2) / 2;
          const maxM = Math.max(tramo.mPos || 0, tramo.mNegIzq || 0, tramo.mNegDer || 0);
          const scaleM = maxM > 0 ? 25 / maxM : 0;

          momentPathsY.push(
            <g key={`my-${c}-${i}`}>
              <path d={`M ${x},${y1} Q ${x + (tramo.mPos || 0) * scaleM},${midY} ${x},${y2}`}
                fill="none" stroke="#0d6efd" strokeWidth="2" opacity="0.7" />
              <path d={`M ${x},${y1} Q ${x - (tramo.mNegIzq || 0) * scaleM},${y1 + (y2 - y1) * 0.25} ${x},${midY}`}
                fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
              <path d={`M ${x},${midY} Q ${x - (tramo.mNegDer || 0) * scaleM},${y2 - (y2 - y1) * 0.25} ${x},${y2}`}
                fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.7" />
            </g>
          );
        }
      }
    }

    return (
      <div style={styles.svgPanel}>
        <h3 style={styles.svgTitle}>Retícula de Apoyos y Elementos Estructurales</h3>
        <svg width={svgW} height={svgH} style={styles.svg}>
          {/* Grid de fondo */}
          {Array.from({ length: Math.ceil(svgW / 40) }, (_, i) => (
            <line key={`gv${i}`} x1={i * 40} y1={0} x2={i * 40} y2={svgH} stroke="#f0f0f0" strokeWidth="1" />
          ))}
          {Array.from({ length: Math.ceil(svgH / 40) }, (_, i) => (
            <line key={`gh${i}`} x1={0} y1={i * 40} x2={svgW} y2={i * 40} stroke="#f0f0f0" strokeWidth="1" />
          ))}

          {/* Vigas principales Steel Deck */}
          {vigasElements}

          {/* Correas Steel Deck */}
          {correasElements}

          {/* Nervios Aligerada */}
          {nerviosElements}

          {/* Vigas X (líneas base) */}
          {Array.from({ length: filas }, (_, r) =>
            Array.from({ length: nTramosX }, (_, i) => (
              <line key={`vx-${r}-${i}`}
                x1={ox + i * luzX * scale} y1={oy + r * luzY * scale}
                x2={ox + (i + 1) * luzX * scale} y2={oy + r * luzY * scale}
                stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
              />
            ))
          )}

          {/* Vigas Y */}
          {Array.from({ length: cols }, (_, c) =>
            Array.from({ length: nTramosY }, (_, i) => (
              <line key={`vy-${c}-${i}`}
                x1={ox + c * luzX * scale} y1={oy + i * luzY * scale}
                x2={ox + c * luzX * scale} y2={oy + (i + 1) * luzY * scale}
                stroke={losaActiva === 'colaborante' ? "#bdc3c7" : "#7f8c8d"} strokeWidth={losaActiva === 'colaborante' ? "1" : "2"}
              />
            ))
          )}

          {/* Diagramas de momento */}
          {momentPathsX}
          {momentPathsY}

          {/* Apoyos / Columnas */}
          {apoyos.map((a) => (
            <g key={a.id}>
              <circle cx={a.x} cy={a.y} r="8" fill="#2c3e50" stroke="#fff" strokeWidth="2" />
              <circle cx={a.x} cy={a.y} r="4" fill="#e74c3c" />
            </g>
          ))}

          {/* Studs */}
          {studsElements}

          {/* Cotas X */}
          {Array.from({ length: nTramosX }, (_, i) => (
            <g key={`cx-${i}`}>
              <line x1={ox + i * luzX * scale} y1={oy + nTramosY * luzY * scale + 20}
                x2={ox + (i + 1) * luzX * scale} y2={oy + nTramosY * luzY * scale + 20} stroke="#333" strokeWidth="1" />
              <line x1={ox + i * luzX * scale} y1={oy + nTramosY * luzY * scale + 15}
                x2={ox + i * luzX * scale} y2={oy + nTramosY * luzY * scale + 25} stroke="#333" strokeWidth="1" />
              <line x1={ox + (i + 1) * luzX * scale} y1={oy + nTramosY * luzY * scale + 15}
                x2={ox + (i + 1) * luzX * scale} y2={oy + nTramosY * luzY * scale + 25} stroke="#333" strokeWidth="1" />
              <text x={ox + (i + 0.5) * luzX * scale - 15} y={oy + nTramosY * luzY * scale + 38} fill="#333" fontSize="11">{luzX}m</text>
            </g>
          ))}

          {/* Cotas Y */}
          {Array.from({ length: nTramosY }, (_, i) => (
            <g key={`cy-${i}`}>
              <line x1={ox - 25} y1={oy + i * luzY * scale}
                x2={ox - 25} y2={oy + (i + 1) * luzY * scale} stroke="#333" strokeWidth="1" />
              <line x1={ox - 30} y1={oy + i * luzY * scale}
                x2={ox - 20} y2={oy + i * luzY * scale} stroke="#333" strokeWidth="1" />
              <line x1={ox - 30} y1={oy + (i + 1) * luzY * scale}
                x2={ox - 20} y2={oy + (i + 1) * luzY * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 55} y={oy + (i + 0.5) * luzY * scale + 4} fill="#333" fontSize="11">{luzY}m</text>
            </g>
          ))}

          {/* Leyenda */}
          <g transform={`translate(${svgW - 180}, ${mT})`}>
            <rect x="0" y="0" width="170" height="110" fill="white" stroke="#ddd" strokeWidth="1" rx="6" opacity="0.95" />
            <circle cx="15" cy="18" r="6" fill="#2c3e50" />
            <text x="28" y="22" fill="#333" fontSize="11">Columna / Apoyo</text>
            <line x1="10" y1="38" x2="30" y2="38" stroke="#0d6efd" strokeWidth="2" />
            <text x="38" y="42" fill="#333" fontSize="11">M(+) Tramo</text>
            <line x1="10" y1="55" x2="30" y2="55" stroke="#e74c3c" strokeWidth="2" />
            <text x="38" y="59" fill="#333" fontSize="11">M(-) Apoyo</text>
            {losaActiva === 'colaborante' && (
              <>
                <line x1="10" y1="72" x2="30" y2="72" stroke="#2c3e50" strokeWidth="4" />
                <text x="38" y="76" fill="#333" fontSize="11">Viga Principal</text>
                <line x1="10" y1="88" x2="30" y2="88" stroke="#8e44ad" strokeWidth="2" strokeDasharray="4,2" />
                <text x="38" y="92" fill="#333" fontSize="11">Correa (Joist)</text>
                <circle cx="20" cy="102" r="4" fill="#e67e22" />
                <text x="38" y="106" fill="#333" fontSize="11">Stud (corte)</text>
              </>
            )}
            {losaActiva === 'aligerada' && (
              <>
                <line x1="10" y1="72" x2="30" y2="72" stroke="#d35400" strokeWidth="2" />
                <text x="38" y="76" fill="#333" fontSize="11">Nervio + Armado</text>
              </>
            )}
          </g>

          {/* Título de relación */}
          <text x={svgW / 2} y={25} fill="#2c3e50" fontSize="14" fontWeight="bold" textAnchor="middle">
            {calc.esDosDirecciones
              ? `LOSA EN DOS DIRECCIONES (ratio ${calc.ratio.toFixed(2)} ≤ 2)`
              : `LOSA EN UNA DIRECCIÓN (ratio ${calc.ratio.toFixed(2)} > 2)`}
          </text>
        </svg>
      </div>
    );
  };

  // ==================== SVG SECCIÓN TRANSVERSAL ====================
  const renderSeccion = () => {
    const h = parseFloat(calc.h) || 10;
    const svgW = 560;
    const svgH = 320;
    const ox = 60;
    const oy = 240;
    const scale = 3.5;

    return (
      <div style={styles.svgPanel}>
        <h3 style={styles.svgTitle}>Sección Transversal Típica</h3>
        <svg width={svgW} height={svgH} style={styles.svg}>
          <defs>
            <pattern id="hatchBloque" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#f1c40f" strokeWidth="1" />
            </pattern>
            <pattern id="hatchConcreto" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#95a5a6" strokeWidth="0.8" />
            </pattern>
            <pattern id="hatchMaciza" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#7f8c8d" strokeWidth="1" />
            </pattern>
          </defs>

          {/* MACIZA */}
          {losaActiva === 'maciza' && (
            <g>
              <rect x={ox} y={oy - h * scale} width={340} height={h * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <rect x={ox} y={oy - h * scale} width={340} height={h * scale} fill="url(#hatchMaciza)" opacity="0.3" />

              {/* Acero inferior X */}
              <line x1={ox + 20} y1={oy - 2.5 * scale} x2={ox + 320} y2={oy - 2.5 * scale}
                stroke="#c0392b" strokeWidth="3" strokeDasharray="6,4" />
              <text x={ox + 325} y={oy - 2.5 * scale + 4} fill="#c0392b" fontSize="11">
                As X(+) Ø{calc.macizaData?.armX?.posDiam} @{calc.macizaData?.armX?.posSep}cm
              </text>

              {/* Acero inferior Y (perspectiva) */}
              <line x1={ox + 20} y1={oy - 4.0 * scale} x2={ox + 320} y2={oy - 4.0 * scale}
                stroke="#8e44ad" strokeWidth="2" strokeDasharray="4,4" />
              <text x={ox + 325} y={oy - 4.0 * scale + 4} fill="#8e44ad" fontSize="11">
                As Y(+) Ø{calc.macizaData?.armY?.posDiam} @{calc.macizaData?.armY?.posSep}cm
              </text>

              {/* Acero superior (negativo) */}
              <line x1={ox + 20} y1={oy - (h - 2.5) * scale} x2={ox + 320} y2={oy - (h - 2.5) * scale}
                stroke="#c0392b" strokeWidth="2" strokeDasharray="4,4" />
              <text x={ox + 325} y={oy - (h - 2.5) * scale + 4} fill="#c0392b" fontSize="11">
                As(-) Ø{calc.macizaData?.armX?.negDiam} @{calc.macizaData?.armX?.negSep}cm
              </text>

              {/* Cota h */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <line x1={ox - 25} y1={oy} x2={ox - 15} y2={oy} stroke="#333" strokeWidth="1" />
              <line x1={ox - 25} y1={oy - h * scale} x2={ox - 15} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 55} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

              {/* Cota d */}
              <line x1={ox + 350} y1={oy} x2={ox + 350} y2={oy - (h - 2.5) * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ox + 355} y={oy - ((h - 2.5) * scale) / 2 + 4} fill="#666" fontSize="11">d = {calc.d} cm</text>
            </g>
          )}

          {/* ALIGERADA */}
          {losaActiva === 'aligerada' && (
            <g>
              {/* Roseta */}
              <rect x={ox} y={oy - 5 * scale} width={340} height={5 * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <rect x={ox} y={oy - 5 * scale} width={340} height={5 * scale} fill="url(#hatchConcreto)" opacity="0.4" />

              {/* Nervios */}
              {[0, 70, 140, 210, 280].map((offset, i) => (
                <g key={i}>
                  <rect x={ox + offset} y={oy - h * scale} width={10 * scale} height={(h - 5) * scale}
                    fill="#bdc3c7" stroke="#2c3e50" strokeWidth="1.5" />
                  <rect x={ox + offset} y={oy - h * scale} width={10 * scale} height={(h - 5) * scale}
                    fill="url(#hatchConcreto)" opacity="0.4" />
                  {/* Acero en nervio */}
                  <circle cx={ox + offset + 5 * scale} cy={oy - 3 * scale} r="3" fill="#c0392b" />
                  <text x={ox + offset + 5 * scale - 8} y={oy - 5 * scale - 5} fill="#c0392b" fontSize="9">As+</text>
                </g>
              ))}

              {/* Bloques */}
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect x={ox + 10 * scale + i * 70} y={oy - h * scale} width={60} height={(h - 5) * scale}
                    fill="url(#hatchBloque)" stroke="#f1c40f" strokeWidth="1" strokeDasharray="2,2" />
                  <text x={ox + 10 * scale + i * 70 + 20} y={oy - (h * scale) / 2} fill="#b7950b" fontSize="9">
                    {aligeradaConfig.tipoBloque === 'arcilla' ? 'ARC' : 'EPS'}
                  </text>
                </g>
              ))}

              {/* Cota h */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 50} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

              {/* Cota roseta */}
              <line x1={ox + 360} y1={oy} x2={ox + 360} y2={oy - 5 * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ox + 365} y={oy - 2.5 * scale + 4} fill="#666" fontSize="11">5 cm</text>

              {/* Ancho de bloque */}
              <line x1={ox + 10 * scale} y1={oy + 15} x2={ox + 80 * scale} y2={oy + 15} stroke="#333" strokeWidth="1" markerEnd="url(#ar)" markerStart="url(#ar)" />
              <text x={ox + 45 * scale} y={oy + 30} fill="#333" fontSize="11" textAnchor="middle">S = {aligeradaConfig.anchoBloque} cm</text>
            </g>
          )}

          {/* STEEL DECK */}
          {losaActiva === 'colaborante' && (
            <g>
              {/* Concreto sobre deck */}
              <rect x={ox} y={oy - steelDeckConfig.espesorConcreto * scale} width={340}
                height={steelDeckConfig.espesorConcreto * scale} fill="#bdc3c7" stroke="#2c3e50" strokeWidth="2" />
              <rect x={ox} y={oy - steelDeckConfig.espesorConcreto * scale} width={340}
                height={steelDeckConfig.espesorConcreto * scale} fill="url(#hatchConcreto)" opacity="0.4" />

              {/* Steel Deck (perfil acanalado) */}
              <path d={`M ${ox} ${oy} 
                L ${ox + 25} ${oy} L ${ox + 35} ${oy - 3 * scale} L ${ox + 55} ${oy - 3 * scale} 
                L ${ox + 65} ${oy} L ${ox + 90} ${oy} L ${ox + 100} ${oy - 3 * scale} L ${ox + 120} ${oy - 3 * scale}
                L ${ox + 130} ${oy} L ${ox + 155} ${oy} L ${ox + 165} ${oy - 3 * scale} L ${ox + 185} ${oy - 3 * scale}
                L ${ox + 195} ${oy} L ${ox + 220} ${oy} L ${ox + 230} ${oy - 3 * scale} L ${ox + 250} ${oy - 3 * scale}
                L ${ox + 260} ${oy} L ${ox + 285} ${oy} L ${ox + 295} ${oy - 3 * scale} L ${ox + 315} ${oy - 3 * scale}
                L ${ox + 325} ${oy} L ${ox + 340} ${oy}`}
                fill="none" stroke="#2980b9" strokeWidth="3" />

              {/* Malla de temperatura */}
              <line x1={ox + 10} y1={oy - (steelDeckConfig.espesorConcreto - 2) * scale}
                x2={ox + 330} y2={oy - (steelDeckConfig.espesorConcreto - 2) * scale}
                stroke="#c0392b" strokeWidth="1" strokeDasharray="3,3" />
              <text x={ox + 335} y={oy - (steelDeckConfig.espesorConcreto - 2) * scale + 4} fill="#c0392b" fontSize="10">Malla 6x6-10/10</text>

              {/* Conector de corte (stud) */}
              <rect x={ox + 80} y={oy - (steelDeckConfig.espesorConcreto + 1) * scale} width="6" height={steelDeckConfig.espesorConcreto * scale + 8} fill="#e67e22" stroke="#d35400" strokeWidth="1" rx="2" />
              <circle cx={ox + 83} cy={oy - (steelDeckConfig.espesorConcreto + 1) * scale} r="5" fill="#e67e22" stroke="#d35400" strokeWidth="1" />
              <text x={ox + 95} y={oy - (steelDeckConfig.espesorConcreto + 2) * scale} fill="#e67e22" fontSize="10">Stud Ø3/4"</text>

              {/* Cota h total */}
              <line x1={ox - 20} y1={oy} x2={ox - 20} y2={oy - h * scale} stroke="#333" strokeWidth="1" />
              <text x={ox - 55} y={oy - (h * scale) / 2 + 4} fill="#333" fontSize="12">h = {h} cm</text>

              {/* Cota concreto */}
              <line x1={ox + 360} y1={oy - 3 * scale} x2={ox + 360} y2={oy - h * scale} stroke="#666" strokeWidth="1" strokeDasharray="3,2" />
              <text x={ox + 365} y={oy - (h * scale + 3 * scale) / 2 + 4} fill="#666" fontSize="11">t = {steelDeckConfig.espesorConcreto} cm</text>

              {/* Viga principal debajo */}
              <rect x={ox + 60} y={oy} width="40" height="30" fill="#2c3e50" stroke="#1a252f" strokeWidth="2" rx="2" />
              <text x={ox + 80} y={oy + 20} fill="#fff" fontSize="9" textAnchor="middle">W</text>
              <text x={ox + 80} y={oy + 45} fill="#2c3e50" fontSize="10" textAnchor="middle">Viga Principal</text>

              {/* Correa intermedia */}
              <rect x={ox + 200} y={oy} width="30" height="20" fill="#8e44ad" stroke="#6c3483" strokeWidth="2" rx="2" />
              <text x={ox + 215} y={oy + 14} fill="#fff" fontSize="8" textAnchor="middle">C</text>
              <text x={ox + 215} y={oy + 35} fill="#8e44ad" fontSize="10" textAnchor="middle">Correa</text>
            </g>
          )}

          {/* Suelo / Apoyo */}
          <line x1={ox - 20} y1={oy} x2={ox + 380} y2={oy} stroke="#555" strokeWidth="3" />
          <text x={ox + 385} y={oy + 4} fill="#555" fontSize="11">Viga / Apoyo</text>
        </svg>
      </div>
    );
  };

  // ==================== PDF / IMPRESIÓN ====================
  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getArmadoMaciza = () => {
      if (losaActiva !== 'maciza') return '';
      return `
        <h2>4.1 Armado de Losa Maciza</h2>
        <table>
          <tr><th>Dirección</th><th>Ubicación</th><th>Diámetro</th><th>Separación</th><th>Cantidad Aprox.</th></tr>
          <tr><td rowspan="2">X (Luz ${grid.luzX}m)</td><td>Tramo (+)</td><td>Ø${calc.macizaData?.armX?.posDiam}"</td><td>@ ${calc.macizaData?.armX?.posSep} cm</td><td>${calc.macizaData?.armX?.posCant} und</td></tr>
          <tr><td>Apoyo (-)</td><td>Ø${calc.macizaData?.armX?.negDiam}"</td><td>@ ${calc.macizaData?.armX?.negSep} cm</td><td>${calc.macizaData?.armX?.negCant} und</td></tr>
          <tr><td rowspan="2">Y (Luz ${grid.luzY}m)</td><td>Tramo (+)</td><td>Ø${calc.macizaData?.armY?.posDiam}"</td><td>@ ${calc.macizaData?.armY?.posSep} cm</td><td>${calc.macizaData?.armY?.posCant} und</td></tr>
          <tr><td>Apoyo (-)</td><td>Ø${calc.macizaData?.armY?.negDiam}"</td><td>@ ${calc.macizaData?.armY?.negSep} cm</td><td>${calc.macizaData?.armY?.negCant} und</td></tr>
        </table>
      `;
    };

    const getAligeradaDetails = () => {
      if (losaActiva !== 'aligerada') return '';
      return `
        <h2>4.1 Configuración Aligerada</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Tipo de bloque</td><td>${aligeradaConfig.tipoBloque === 'eps' ? 'Poliestireno (EPS)' : 'Arcilla'}</td></tr>
          <tr><td>Ancho entre ejes (S)</td><td>${aligeradaConfig.anchoBloque} cm</td></tr>
          <tr><td>Ancho de nervio</td><td>${aligeradaConfig.anchoNervio} cm</td></tr>
          <tr><td>Espesor de roseta</td><td>${aligeradaConfig.espesorRoseta} cm</td></tr>
          <tr><td>Dirección de nervios</td><td>${calc.aligeradaData?.nerviosEnX ? 'X' : ''} ${calc.aligeradaData?.nerviosEnY ? 'Y' : ''}</td></tr>
          <tr><td>Nervios en X</td><td>${calc.aligeradaData?.numNerviosX || 0} und</td></tr>
          <tr><td>Nervios en Y</td><td>${calc.aligeradaData?.numNerviosY || 0} und</td></tr>
          <tr><td>As en nervio</td><td>${calc.aligeradaData?.As_req?.toFixed(2)} cm²</td></tr>
          <tr><td>Malla en roseta</td><td>${calc.aligeradaData?.kgMalla?.toFixed(0)} kg</td></tr>
        </table>
      `;
    };

    const getSteelDeckDetails = () => {
      if (losaActiva !== 'colaborante') return '';
      const sd = calc.steelDeckData;
      return `
        <h2>4.1 Sistema Steel Deck (SDI)</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Espesor concreto sobre crestas</td><td>${sd?.espesorConcreto} cm</td></tr>
          <tr><td>Altura perfil deck</td><td>${sd?.alturaDeck} cm</td></tr>
          <tr><td>Calibre steel deck</td><td>${sd?.calibre}</td></tr>
          <tr><td>Separación de correas</td><td>${sd?.sepCorreas} m</td></tr>
          <tr><td>Viga principal</td><td>${sd?.tipoVigaPrincipal}</td></tr>
          <tr><td>Correa (joist)</td><td>${sd?.tipoCorrea}</td></tr>
          <tr><td>Verif. construcción (M)</td><td>${sd?.mConstruccion?.toFixed(0)} kg-m/m ≤ ${sd?.capMoment} kg-m/m → ${sd?.cumpleDeck ? 'CUMPLE' : 'NO CUMPLE'}</td></tr>
          <tr><td>Verif. construcción (V)</td><td>${sd?.vConstruccion?.toFixed(0)} kg/m ≤ ${sd?.capCortante} kg/m → ${sd?.cumpleDeck ? 'CUMPLE' : 'NO CUMPLE'}</td></tr>
          <tr><td>Deflexión construcción</td><td>${sd?.deflDeck?.toFixed(3)} cm ≤ ${(sd?.luzDeck * 100 / 180)?.toFixed(2)} cm → ${sd?.cumpleDeflDeck ? 'CUMPLE' : 'NO CUMPLE'}</td></tr>
          <tr><td>Conectores de corte (studs)</td><td>${sd?.totalStuds} und</td></tr>
          <tr><td>Long. vigas principales X</td><td>${sd?.longVigasPrincipalesX?.toFixed(1)} m</td></tr>
          <tr><td>Long. vigas principales Y</td><td>${sd?.longVigasPrincipalesY?.toFixed(1)} m</td></tr>
        </table>
        <h3>Materiales Steel Deck</h3>
        <table>
          <tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr>
          <tr><td>Steel deck (incl. solapes)</td><td>${sd?.areaDeck?.toFixed(2)}</td><td>m²</td></tr>
          <tr><td>Concreto</td><td>${calc.volConcreto}</td><td>m³</td></tr>
          <tr><td>Malla de temperatura</td><td>${sd?.kgMalla?.toFixed(0)}</td><td>kg</td></tr>
          <tr><td>Vigas principales</td><td>${sd?.kgVigas?.toFixed(0)}</td><td>kg</td></tr>
          <tr><td>Correas (joists)</td><td>${sd?.kgCorreas?.toFixed(0)}</td><td>kg</td></tr>
          <tr><td>Studs (conectores)</td><td>${sd?.totalStuds}</td><td>und</td></tr>
        </table>
      `;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Memoria de Cálculo - Losa ${losaActiva.toUpperCase()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
          h2 { color: #34495e; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f6f8; font-weight: bold; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 24px; font-weight: bold; color: #3498db; }
          .status-ok { color: #27ae60; font-weight: bold; }
          .status-fail { color: #e74c3c; font-weight: bold; }
          .total { font-size: 20px; font-weight: bold; color: #2c3e50; background: #ecf0f1; padding: 15px; border-radius: 8px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏗️ Calculadora Estructural</div>
          <div>Fecha: ${new Date().toLocaleDateString()}</div>
        </div>
        <h1>Memoria de Cálculo - Losa ${losaActiva === 'colaborante' ? 'STEEL DECK' : losaActiva.toUpperCase()}</h1>

        <h2>1. Geometría y Retícula</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Filas de apoyos (Y)</td><td>${grid.filas}</td></tr>
          <tr><td>Columnas de apoyos (X)</td><td>${grid.cols}</td></tr>
          <tr><td>Luz en X</td><td>${grid.luzX} m</td></tr>
          <tr><td>Luz en Y</td><td>${grid.luzY} m</td></tr>
          <tr><td>Tramos en X</td><td>${calc.nTramosX}</td></tr>
          <tr><td>Tramos en Y</td><td>${calc.nTramosY}</td></tr>
          <tr><td>Área total</td><td>${calc.areaTotal.toFixed(2)} m²</td></tr>
          <tr><td>Relación luz mayor/menor</td><td>${calc.ratio.toFixed(2)} ${calc.esDosDirecciones ? '(≤ 2, losa en dos direcciones)' : '(> 2, losa en una dirección)'}</td></tr>
        </table>

        <h2>2. Cargas</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Carga viva (CV)</td><td>${datos.cv} kg/m²</td></tr>
          <tr><td>Sobrecarga muerta (CM extra)</td><td>${datos.cmExtra} kg/m²</td></tr>
          <tr><td>Peso propio del sistema</td><td>${calc.pesoPropio} kg/m²</td></tr>
          <tr><td>W servicio</td><td>${calc.wServicio} kg/m²</td></tr>
          <tr><td>Wu (carga mayorada)</td><td>${calc.wu} kg/m²</td></tr>
        </table>

        <h2>3. Momentos y Diseño a Flexión (ACI 318-19)</h2>
        <table>
          <tr><th>Parámetro</th><th>Valor</th></tr>
          <tr><td>Espesor h</td><td>${calc.h} cm</td></tr>
          <tr><td>Espesor mínimo</td><td>${calc.h_min} cm</td></tr>
          <tr><td>Peralte efectivo d</td><td>${calc.d} cm</td></tr>
          <tr><td>Momento máximo X</td><td>${calc.maxMomentoX} kg-m</td></tr>
          <tr><td>Momento máximo Y</td><td>${calc.maxMomentoY} kg-m</td></tr>
          <tr><td>Momento gobernante</td><td>${calc.maxMomento} kg-m</td></tr>
          <tr><td>As requerido</td><td>${calc.As_req} cm²/m</td></tr>
          <tr><td>As mínimo</td><td>${calc.As_min} cm²/m</td></tr>
          <tr><td>ρ (cuantía)</td><td>${calc.ρ}</td></tr>
          <tr><td>Separación máxima</td><td>${calc.s_max} cm</td></tr>
        </table>

        ${getArmadoMaciza()}
        ${getAligeradaDetails()}
        ${getSteelDeckDetails()}

        <h2>5. Verificaciones ACI 318-19 / SDI</h2>
        <table>
          <tr><th>Verificación</th><th>Valor</th><th>Estado</th></tr>
          <tr><td>Espesor mínimo</td><td>h = ${calc.h} cm ≥ ${calc.h_min} cm</td><td class="${calc.cumpleEspesor ? 'status-ok' : 'status-fail'}">${calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          <tr><td>Tensión controlada (εt ≥ εty + 0.003)</td><td>εt = ${calc.εt} ≥ ${calc.εty}</td><td class="${calc.tensionControlada ? 'status-ok' : 'status-fail'}">${calc.tensionControlada ? '✅ CUMPLE (φ = 0.90)' : '❌ NO CUMPLE'}</td></tr>
          <tr><td>Cortante (Vu ≤ φVc)</td><td>Vu = ${calc.vuMax} kg ≤ φVc = ${calc.φVc} kg</td><td class="${calc.cumpleCortante ? 'status-ok' : 'status-fail'}">${calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          ${calc.deflexion ? `<tr><td>Deflexión (δ ≤ δ_lim)</td><td>δ = ${calc.deflexion.δ} cm ≤ ${calc.deflexion.δLim} cm</td><td class="${calc.deflexion.cumple ? 'status-ok' : 'status-fail'}">${calc.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>` : ''}
          ${losaActiva === 'colaborante' ? `
          <tr><td>Deck fase construcción (M)</td><td>${calc.steelDeckData?.mConstruccion?.toFixed(0)} ≤ ${calc.steelDeckData?.capMoment}</td><td class="${calc.steelDeckData?.cumpleDeck ? 'status-ok' : 'status-fail'}">${calc.steelDeckData?.cumpleDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          <tr><td>Deck fase construcción (defl)</td><td>${calc.steelDeckData?.deflDeck?.toFixed(3)} cm ≤ ${(calc.steelDeckData?.luzDeck * 100 / 180)?.toFixed(2)} cm</td><td class="${calc.steelDeckData?.cumpleDeflDeck ? 'status-ok' : 'status-fail'}">${calc.steelDeckData?.cumpleDeflDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}</td></tr>
          ` : ''}
        </table>

        <h2>6. Lista de Materiales y Costos</h2>
        <table>
          <tr><th>Material</th><th>Cantidad</th><th>Unidad</th><th>Precio Unit.</th><th>Subtotal</th></tr>
          <tr><td>Concreto</td><td>${calc.volConcreto}</td><td>m³</td><td>$${costos.concretoM3}</td><td>$${(calc.volConcreto * costos.concretoM3).toFixed(2)}</td></tr>
          ${losaActiva !== 'colaborante' ? `<tr><td>Acero de refuerzo</td><td>${calc.kgAcero}</td><td>kg</td><td>$${costos.aceroKg}</td><td>$${(calc.kgAcero * costos.aceroKg).toFixed(2)}</td></tr>` : ''}
          ${losaActiva === 'aligerada' ? `<tr><td>Bloques ${aligeradaConfig.tipoBloque === 'eps' ? 'EPS' : 'Arcilla'}</td><td>${calc.numBloques}</td><td>und</td><td>$${aligeradaConfig.tipoBloque === 'eps' ? costos.bloqueEPSUnd : costos.bloqueArcillaUnd}</td><td>$${(calc.numBloques * (aligeradaConfig.tipoBloque === 'eps' ? costos.bloqueEPSUnd : costos.bloqueArcillaUnd)).toFixed(2)}</td></tr>` : ''}
          ${losaActiva === 'colaborante' ? `
          <tr><td>Steel Deck (incl. solapes)</td><td>${calc.steelDeckData?.areaDeck?.toFixed(2)}</td><td>m²</td><td>$${costos.steelDeckM2}</td><td>$${(calc.steelDeckData?.areaDeck * costos.steelDeckM2).toFixed(2)}</td></tr>
          <tr><td>Malla electrosoldada</td><td>${calc.areaTotal.toFixed(2)}</td><td>m²</td><td>$${costos.mallaM2}</td><td>$${(calc.areaTotal * costos.mallaM2).toFixed(2)}</td></tr>
          <tr><td>Vigas principales (${calc.steelDeckData?.tipoVigaPrincipal})</td><td>${calc.steelDeckData?.kgVigas?.toFixed(0)}</td><td>kg</td><td>$${costos.vigaPrincipalKg}</td><td>$${(calc.steelDeckData?.kgVigas * costos.vigaPrincipalKg).toFixed(2)}</td></tr>
          <tr><td>Correas (${calc.steelDeckData?.tipoCorrea})</td><td>${calc.steelDeckData?.kgCorreas?.toFixed(0)}</td><td>kg</td><td>$${costos.correaKg}</td><td>$${(calc.steelDeckData?.kgCorreas * costos.correaKg).toFixed(2)}</td></tr>
          <tr><td>Studs conectores</td><td>${calc.steelDeckData?.totalStuds}</td><td>und</td><td>$${costos.studUnd}</td><td>$${(calc.steelDeckData?.totalStuds * costos.studUnd).toFixed(2)}</td></tr>
          ` : ''}
        </table>

        <div class="total">
          💰 COSTO TOTAL: $${calc.costoTotal} &nbsp;|&nbsp; $${calc.costoM2} / m²
        </div>

        <p style="margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px;">
          Calculado según ACI 318-19 ${losaActiva === 'colaborante' ? 'y criterios SDI (Steel Deck Institute)' : ''}. 
          Este documento es para fines de pre-dimensionamiento. Verificar con análisis estructural detallado antes de construcción.
        </p>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // ==================== RENDER ====================
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🏗️ Calculadora Comparativa de Losas (ACI 318-19 / SDI)</h2>

      <div style={styles.layout}>
        {/* PANEL RETÍCULA */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#3498db')}>1. Retícula de Apoyos</h3>
          <p style={styles.hint}>Intersección de cada vertical y horizontal = columna de apoyo.</p>

          {[
            { label: 'Filas de apoyos (Y)', name: 'filas' },
            { label: 'Columnas de apoyos (X)', name: 'cols' },
            { label: 'Luz en X (m)', name: 'luzX', step: 0.1 },
            { label: 'Luz en Y (m)', name: 'luzY', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step={f.step || 1} name={f.name} value={grid[f.name]} onChange={handleGrid} style={styles.input} />
            </div>
          ))}

          <div style={styles.highlightBox}>
            <div><strong>Tramos X:</strong> {calc.nTramosX} &nbsp;|&nbsp; <strong>Tramos Y:</strong> {calc.nTramosY}</div>
            <div><strong>Área total:</strong> {calc.areaTotal.toFixed(2)} m²</div>
            <div><strong>Ratio luz mayor/menor:</strong> {calc.ratio.toFixed(2)}</div>
            {calc.esDosDirecciones && (
              <div style={{ color: '#e67e22', fontWeight: 'bold', marginTop: '6px' }}>⚠️ LOSA EN DOS DIRECCIONES (ratio ≤ 2)</div>
            )}
          </div>
        </div>

        {/* PANEL TIPO DE LOSA */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#e67e22')}>2. Tipo de Losa</h3>

          <div style={styles.typeSelector}>
            {[
              { id: 'maciza', label: 'Maciza', color: '#2980b9', desc: 'L/20' },
              { id: 'aligerada', label: 'Aligerada', color: '#d35400', desc: 'L/16' },
              { id: 'colaborante', label: 'Steel Deck', color: '#27ae60', desc: 'SDI' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLosaActiva(t.id)}
                style={{
                  ...styles.typeBtn,
                  borderColor: t.color,
                  background: losaActiva === t.id ? t.color : '#fff',
                  color: losaActiva === t.id ? '#fff' : t.color,
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.label}</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>{t.desc}</div>
              </button>
            ))}
          </div>

          <h3 style={styles.sectionTitle('#27ae60')}>3. Cargas y Materiales</h3>
          {[
            { label: 'Carga Viva CV (kg/m²)', name: 'cv' },
            { label: 'CM Extra (kg/m²)', name: 'cmExtra' },
            { label: "f'c (kg/cm²)", name: 'fc' },
            { label: 'fy (kg/cm²)', name: 'fy' },
            { label: 'Recubrimiento (cm)', name: 'recubrimiento', step: 0.1 },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step={f.step || 1} name={f.name} value={datos[f.name]} onChange={handleDatos} style={styles.input} />
            </div>
          ))}
        </div>

        {/* PANEL CONFIGURACIÓN ESPECÍFICA */}
        <div style={styles.panel}>
          {losaActiva === 'maciza' && (
            <>
              <h3 style={styles.sectionTitle('#2980b9')}>4. Armado de Losa Maciza</h3>
              <p style={styles.hint}>Seleccione diámetros comerciales para cada dirección y ubicación.</p>
              {[
                { label: 'Diámetro As X(+) Tramo', name: 'diametroPosX' },
                { label: 'Diámetro As X(-) Apoyo', name: 'diametroNegX' },
                { label: 'Diámetro As Y(+) Tramo', name: 'diametroPosY' },
                { label: 'Diámetro As Y(-) Apoyo', name: 'diametroNegY' },
              ].map((f) => (
                <div key={f.name} style={styles.field}>
                  <label style={styles.label}>{f.label}</label>
                  <select name={f.name} value={macizaConfig[f.name]} onChange={handleMaciza} style={styles.input}>
                    <option value="3/8">3/8" (0.71 cm²)</option>
                    <option value="1/2">1/2" (1.27 cm²)</option>
                    <option value="5/8">5/8" (1.98 cm²)</option>
                    <option value="3/4">3/4" (2.85 cm²)</option>
                    <option value="1">1" (5.07 cm²)</option>
                  </select>
                </div>
              ))}
              <div style={styles.highlightBox}>
                <strong>Armado calculado:</strong><br />
                X(+) Ø{calc.macizaData?.armX?.posDiam}" @{calc.macizaData?.armX?.posSep}cm<br />
                X(-) Ø{calc.macizaData?.armX?.negDiam}" @{calc.macizaData?.armX?.negSep}cm<br />
                Y(+) Ø{calc.macizaData?.armY?.posDiam}" @{calc.macizaData?.armY?.posSep}cm<br />
                Y(-) Ø{calc.macizaData?.armY?.negDiam}" @{calc.macizaData?.armY?.negSep}cm
              </div>
            </>
          )}

          {losaActiva === 'aligerada' && (
            <>
              <h3 style={styles.sectionTitle('#d35400')}>4. Configuración Aligerada</h3>
              <div style={styles.field}>
                <label style={styles.label}>Tipo de Bloque</label>
                <select name="tipoBloque" value={aligeradaConfig.tipoBloque} onChange={handleAligerada} style={styles.input}>
                  <option value="eps">Poliestireno (EPS) - Liviano, aislante</option>
                  <option value="arcilla">Arcilla - Pesado, tradicional</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Ancho entre ejes S (cm)</label>
                <select name="anchoBloque" value={aligeradaConfig.anchoBloque} onChange={handleAligerada} style={styles.input}>
                  <option value={40}>40 cm</option>
                  <option value={50}>50 cm</option>
                  <option value={60}>60 cm</option>
                  <option value={70}>70 cm</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Dirección de Nervios</label>
                <select name="dirNervios" value={aligeradaConfig.dirNervios} onChange={handleAligerada} style={styles.input}>
                  <option value="auto">Auto (mayor luz / ambos si ratio ≤ 2)</option>
                  <option value="x">Dirección X</option>
                  <option value="y">Dirección Y</option>
                  <option value="ambos">Ambas direcciones (cuadricula)</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Ancho de Nervio (cm)</label>
                <input type="number" name="anchoNervio" value={aligeradaConfig.anchoNervio} onChange={handleAligerada} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Espesor Roseta (cm)</label>
                <input type="number" name="espesorRoseta" value={aligeradaConfig.espesorRoseta} onChange={handleAligerada} style={styles.input} />
              </div>
              <div style={styles.highlightBox}>
                <strong>Nervios en X:</strong> {calc.aligeradaData?.numNerviosX || 0} und<br />
                <strong>Nervios en Y:</strong> {calc.aligeradaData?.numNerviosY || 0} und<br />
                <strong>As por nervio:</strong> {calc.aligeradaData?.As_req?.toFixed(2)} cm²
              </div>
            </>
          )}

          {losaActiva === 'colaborante' && (
            <>
              <h3 style={styles.sectionTitle('#27ae60')}>4. Configuración Steel Deck (SDI)</h3>
              <div style={styles.field}>
                <label style={styles.label}>Espesor concreto sobre crestas (cm)</label>
                <input type="number" step="0.5" name="espesorConcreto" value={steelDeckConfig.espesorConcreto} onChange={handleSteelDeck} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Calibre del perfil</label>
                <select name="calibre" value={steelDeckConfig.calibre} onChange={handleSteelDeck} style={styles.input}>
                  <option value={22}>22 (más liviano)</option>
                  <option value={20}>20</option>
                  <option value={18}>18</option>
                  <option value={16}>16 (más pesado)</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Separación de Correas (m)</label>
                <input type="number" step="0.1" name="sepCorreas" value={steelDeckConfig.sepCorreas} onChange={handleSteelDeck} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Viga Principal</label>
                <select name="tipoVigaPrincipal" value={steelDeckConfig.tipoVigaPrincipal} onChange={handleSteelDeck} style={styles.input}>
                  <option value="W12x26">W12x26</option>
                  <option value="W10x22">W10x22</option>
                  <option value="W8x18">W8x18</option>
                  <option value="W6x15">W6x15</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Correa (Joist)</label>
                <select name="tipoCorrea" value={steelDeckConfig.tipoCorrea} onChange={handleSteelDeck} style={styles.input}>
                  <option value="C6x10.5">C6x10.5</option>
                  <option value="C5x9">C5x9</option>
                  <option value="C4x7.25">C4x7.25</option>
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Studs / metro de viga</label>
                <input type="number" step="0.5" name="densidadStuds" value={steelDeckConfig.densidadStuds} onChange={handleSteelDeck} style={styles.input} />
              </div>
              <div style={styles.highlightBox}>
                <strong>Verif. construcción:</strong> {calc.steelDeckData?.cumpleDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}<br />
                <strong>Deflexión deck:</strong> {calc.steelDeckData?.cumpleDeflDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}<br />
                <strong>Studs totales:</strong> {calc.steelDeckData?.totalStuds} und
              </div>
            </>
          )}
        </div>

        {/* PANEL COSTOS */}
        <div style={styles.panel}>
          <h3 style={styles.sectionTitle('#9b59b6')}>5. Costos Unitarios (USD)</h3>
          {[
            { label: 'Concreto ($/m³)', name: 'concretoM3' },
            { label: 'Acero refuerzo ($/kg)', name: 'aceroKg' },
            { label: 'Bloque Arcilla ($/und)', name: 'bloqueArcillaUnd' },
            { label: 'Bloque EPS ($/und)', name: 'bloqueEPSUnd' },
            { label: 'Steel Deck ($/m²)', name: 'steelDeckM2' },
            { label: 'Malla ($/m²)', name: 'mallaM2' },
            { label: 'Correa acero ($/kg)', name: 'correaKg' },
            { label: 'Viga principal ($/kg)', name: 'vigaPrincipalKg' },
            { label: 'Stud conector ($/und)', name: 'studUnd' },
          ].map((f) => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input type="number" step="0.1" name={f.name} value={costos[f.name]} onChange={handleCostos} style={styles.input} />
            </div>
          ))}

          <div style={styles.divider} />

          <div style={styles.costBox}>
            <div style={{ fontSize: '13px', color: '#666' }}>Costo Total</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50' }}>${calc.costoTotal}</div>
            <div style={{ fontSize: '14px', color: '#888' }}>${calc.costoM2} / m²</div>
          </div>

          <button onClick={handlePrintPDF} style={styles.pdfBtn}>
            📄 Descargar PDF con Memoria de Cálculo
          </button>
        </div>
      </div>

      {/* SVG RETÍCULA */}
      {renderGrid()}

      {/* SVG SECCIÓN TRANSVERSAL */}
      {renderSeccion()}

      {/* PANEL RESULTADOS ACI */}
      <div style={styles.resultPanel}>
        <h3 style={styles.sectionTitle('#e74c3c')}>Verificaciones ACI 318-19 / SDI</h3>
        <div style={styles.resultGrid}>
          <div style={styles.statusBox(calc.cumpleEspesor)}>
            <div style={{ fontWeight: 'bold' }}>Espesor Mínimo</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              h = {calc.h} cm ≥ h_min = {calc.h_min} cm
              <br />{calc.cumpleEspesor ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>

          <div style={styles.statusBox(calc.tensionControlada)}>
            <div style={{ fontWeight: 'bold' }}>Tensión Controlada (ACI 7.3.3)</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              εt = {calc.εt} ≥ εty + 0.003 = {calc.εty}
              <br />{calc.tensionControlada ? '✅ CUMPLE (φ = 0.90)' : '❌ NO CUMPLE'}
            </div>
          </div>

          <div style={styles.statusBox(calc.cumpleCortante)}>
            <div style={{ fontWeight: 'bold' }}>Cortante (ACI 22.5.5)</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Vu = {calc.vuMax} kg ≤ φVc = {calc.φVc} kg
              <br />{calc.cumpleCortante ? '✅ CUMPLE' : '❌ NO CUMPLE'}
            </div>
          </div>

          {calc.deflexion && (
            <div style={styles.statusBox(calc.deflexion.cumple)}>
              <div style={{ fontWeight: 'bold' }}>Deflexión (ACI 24.2 / SDI)</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                δ = {calc.deflexion.δ} cm ≤ δ_lim = {calc.deflexion.δLim} cm
                <br />{calc.deflexion.cumple ? '✅ CUMPLE' : '❌ NO CUMPLE'}
              </div>
            </div>
          )}

          {losaActiva === 'colaborante' && (
            <>
              <div style={styles.statusBox(calc.steelDeckData?.cumpleDeck)}>
                <div style={{ fontWeight: 'bold' }}>Deck Fase Construcción (SDI)</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  M = {calc.steelDeckData?.mConstruccion?.toFixed(0)} ≤ {calc.steelDeckData?.capMoment} kg-m/m
                  <br />{calc.steelDeckData?.cumpleDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                </div>
              </div>
              <div style={styles.statusBox(calc.steelDeckData?.cumpleDeflDeck)}>
                <div style={{ fontWeight: 'bold' }}>Deflexión Deck (L/180)</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  δ = {calc.steelDeckData?.deflDeck?.toFixed(3)} cm
                  <br />{calc.steelDeckData?.cumpleDeflDeck ? '✅ CUMPLE' : '❌ NO CUMPLE'}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.divider} />

        <div style={styles.resultGrid}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Diseño a Flexión</h4>
            <p style={styles.resultLine}><span>As req:</span> <strong>{calc.As_req} cm²/m</strong></p>
            <p style={styles.resultLine}><span>As min:</span> <strong>{calc.As_min} cm²/m</strong></p>
            <p style={styles.resultLine}><span>ρ:</span> <strong>{calc.ρ}</strong></p>
            <p style={styles.resultLine}><span>Sep. máx:</span> <strong>{calc.s_max} cm</strong></p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Momentos y Cargas</h4>
            <p style={styles.resultLine}><span>M(+) max X:</span> <strong>{calc.maxMomentoX} kg-m</strong></p>
            <p style={styles.resultLine}><span>M(+) max Y:</span> <strong>{calc.maxMomentoY} kg-m</strong></p>
            <p style={styles.resultLine}><span>M gobernante:</span> <strong>{calc.maxMomento} kg-m</strong></p>
            <p style={styles.resultLine}><span>Wu:</span> <strong>{calc.wu} kg/m²</strong></p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0d6efd' }}>Materiales</h4>
            <p style={styles.resultLine}><span>Concreto:</span> <strong>{calc.volConcreto} m³</strong></p>
            {losaActiva !== 'colaborante' && <p style={styles.resultLine}><span>Acero:</span> <strong>{calc.kgAcero} kg</strong></p>}
            {losaActiva === 'aligerada' && (
              <>
                <p style={styles.resultLine}><span>Bloques:</span> <strong>{calc.numBloques} und ({aligeradaConfig.tipoBloque})</strong></p>
                <p style={styles.resultLine}><span>Malla roseta:</span> <strong>{calc.aligeradaData?.kgMalla?.toFixed(0)} kg</strong></p>
              </>
            )}
            {losaActiva === 'colaborante' && (
              <>
                <p style={styles.resultLine}><span>Steel Deck:</span> <strong>{calc.steelDeckData?.areaDeck?.toFixed(2)} m²</strong></p>
                <p style={styles.resultLine}><span>Vigas principales:</span> <strong>{calc.steelDeckData?.kgVigas?.toFixed(0)} kg</strong></p>
                <p style={styles.resultLine}><span>Correas:</span> <strong>{calc.steelDeckData?.kgCorreas?.toFixed(0)} kg</strong></p>
                <p style={styles.resultLine}><span>Studs:</span> <strong>{calc.steelDeckData?.totalStuds} und</strong></p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== ESTILOS ====================
const styles = {
  container: {
    padding: '20px',
    fontFamily: '"Segoe UI", Roboto, Arial, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '24px',
    fontSize: '26px',
    fontWeight: '600',
  },
  layout: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  panel: {
    flex: '0 0 300px',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '14px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  sectionTitle: (color) => ({
    marginTop: 0,
    color: '#34495e',
    borderBottom: `3px solid ${color}`,
    paddingBottom: '8px',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '14px',
  }),
  field: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#555',
    marginBottom: '5px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '9px 11px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  highlightBox: {
    padding: '12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#2980b9',
    lineHeight: '1.6',
  },
  typeSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '18px',
  },
  typeBtn: {
    flex: 1,
    padding: '12px 8px',
    border: '2px solid',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  costBox: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '14px',
  },
  pdfBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  svgPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
    marginBottom: '20px',
  },
  svgTitle: {
    marginTop: 0,
    color: '#34495e',
    fontSize: '17px',
    fontWeight: '600',
    marginBottom: '10px',
  },
  svg: {
    background: '#fafbfc',
    borderRadius: '10px',
    border: '1px solid #e0e0e0',
  },
  resultPanel: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    border: '1px solid #e0e0e0',
  },
  resultGrid: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  statusBox: (ok) => ({
    flex: '1 1 220px',
    marginBottom: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: ok ? '#d4edda' : '#f8d7da',
    border: `1px solid ${ok ? '#c3e6cb' : '#f5c6cb'}`,
  }),
  divider: {
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '16px 0',
  },
  resultLine: {
    margin: '5px 0',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
  },
};

export default CalculadoraLosas;