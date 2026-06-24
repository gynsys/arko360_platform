export const ProfileDatabase = {
  IPE: [
    { id: 'IPE100', name: 'IPE 100', type: 'I-Shape', params: { d: 0.1, bf: 0.055, tw: 0.0041, tf: 0.0057 }, A: 0.00103, Ix: 1.71e-6, Iy: 1.59e-7, J: 1.2e-8 },
    { id: 'IPE120', name: 'IPE 120', type: 'I-Shape', params: { d: 0.12, bf: 0.064, tw: 0.0044, tf: 0.0063 }, A: 0.00132, Ix: 3.18e-6, Iy: 2.77e-7, J: 1.74e-8 },
    { id: 'IPE160', name: 'IPE 160', type: 'I-Shape', params: { d: 0.16, bf: 0.082, tw: 0.005, tf: 0.0074 }, A: 0.00201, Ix: 8.69e-6, Iy: 6.83e-7, J: 3.6e-8 },
    { id: 'IPE200', name: 'IPE 200', type: 'I-Shape', params: { d: 0.20, bf: 0.100, tw: 0.0056, tf: 0.0085 }, A: 0.00285, Ix: 1.94e-5, Iy: 1.42e-6, J: 6.98e-8 },
    { id: 'IPE300', name: 'IPE 300', type: 'I-Shape', params: { d: 0.30, bf: 0.150, tw: 0.0071, tf: 0.0107 }, A: 0.00538, Ix: 8.36e-5, Iy: 6.04e-6, J: 2.01e-7 },
    { id: 'IPE400', name: 'IPE 400', type: 'I-Shape', params: { d: 0.40, bf: 0.180, tw: 0.0086, tf: 0.0135 }, A: 0.00845, Ix: 2.31e-4, Iy: 1.32e-5, J: 5.11e-7 },
  ],
  HEB: [
    { id: 'HEB100', name: 'HEB 100', type: 'I-Shape', params: { d: 0.1, bf: 0.1, tw: 0.006, tf: 0.01 }, A: 0.0026, Ix: 4.5e-6, Iy: 1.67e-6, J: 9.25e-8 },
    { id: 'HEB200', name: 'HEB 200', type: 'I-Shape', params: { d: 0.2, bf: 0.2, tw: 0.009, tf: 0.015 }, A: 0.00781, Ix: 5.7e-5, Iy: 2.0e-5, J: 5.93e-7 },
    { id: 'HEB300', name: 'HEB 300', type: 'I-Shape', params: { d: 0.3, bf: 0.3, tw: 0.011, tf: 0.019 }, A: 0.0149, Ix: 2.51e-4, Iy: 8.56e-5, J: 1.85e-6 },
  ],
  IPN: [
    { id: 'IPN100', name: 'IPN 100', type: 'I-Shape', params: { d: 0.1, bf: 0.05, tw: 0.0045, tf: 0.0068 }, A: 0.00106, Ix: 1.71e-6, Iy: 1.22e-7, J: 1.5e-8 },
    { id: 'IPN200', name: 'IPN 200', type: 'I-Shape', params: { d: 0.2, bf: 0.09, tw: 0.0075, tf: 0.0113 }, A: 0.00334, Ix: 2.14e-5, Iy: 1.17e-6, J: 1.05e-7 },
  ],
  UPN: [
    { id: 'UPN100', name: 'UPN 100', type: 'Channel', params: { d: 0.1, bf: 0.05, tw: 0.006, tf: 0.0085 }, A: 0.00135, Ix: 2.06e-6, Iy: 2.93e-7, J: 3.4e-8 },
    { id: 'UPN200', name: 'UPN 200', type: 'Channel', params: { d: 0.2, bf: 0.075, tw: 0.0085, tf: 0.0115 }, A: 0.00322, Ix: 1.91e-5, Iy: 1.48e-6, J: 1.14e-7 },
  ],
  CONDUVEN_ECO: [
    { id: 'ECO_100x100x3', name: 'ECO 100x100x3', type: 'Rectangular', params: { b: 0.1, h: 0.1, t: 0.003 }, A: 0.00116, Ix: 1.83e-6, Iy: 1.83e-6, J: 2.87e-6 },
    { id: 'ECO_150x150x5', name: 'ECO 150x150x5', type: 'Rectangular', params: { b: 0.15, h: 0.15, t: 0.005 }, A: 0.0029, Ix: 1.03e-5, Iy: 1.03e-5, J: 1.63e-5 },
    { id: 'ECO_160x65x3', name: 'ECO 160x65x3', type: 'Rectangular', params: { b: 0.065, h: 0.16, t: 0.003 }, A: 0.0013, Ix: 4.19e-6, Iy: 9.38e-7, J: 2.21e-6 },
  ],
  PROPELCA: [
    { id: 'PROP_100x50x3', name: 'PROPELCA 100x50x3', type: 'Rectangular', params: { b: 0.05, h: 0.10, t: 0.003 }, A: 0.00086, Ix: 1.13e-6, Iy: 3.65e-7, J: 8.6e-7 },
  ],
  Tubo_Circular: [
    { id: 'CIRC_4in_sch40', name: 'Tubo 4" Sch 40', type: 'Circular', params: { D: 0.1143, t: 0.00602 }, A: 0.00205, Ix: 3.01e-6, Iy: 3.01e-6, J: 6.02e-6 },
    { id: 'CIRC_6in_sch40', name: 'Tubo 6" Sch 40', type: 'Circular', params: { D: 0.1683, t: 0.00711 }, A: 0.0036, Ix: 1.17e-5, Iy: 1.17e-5, J: 2.34e-5 },
  ],
  Angulos: [
    { id: 'L_50x50x5', name: 'L 50x50x5', type: 'Angle', params: { b: 0.05, h: 0.05, t: 0.005 }, A: 0.00048, Ix: 1.1e-7, Iy: 1.1e-7, J: 4.0e-9 },
    { id: 'L_100x100x10', name: 'L 100x100x10', type: 'Angle', params: { b: 0.1, h: 0.1, t: 0.01 }, A: 0.00192, Ix: 1.77e-6, Iy: 1.77e-6, J: 6.4e-8 },
  ]
};
