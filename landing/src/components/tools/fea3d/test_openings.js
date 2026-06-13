const fs = require('fs');
const lFactor = 3.2808;

const state = {
  openings: [
    {
      id: "ops1",
      offsetX: 0,
      offsetY: 0,
      type: "LINEAR",
      params: { width: 1, length: 3 }
    }
  ]
};

const round = (val) => Math.round(val * 1e6) / 1e6;

const newOpenings = state.openings.map(o => {
  const scaledParams = {};
  for (const k in o.params) {
    scaledParams[k] = round(o.params[k] * lFactor);
  }
  return {
    ...o,
    offsetX: round(o.offsetX * lFactor),
    offsetY: round(o.offsetY * lFactor),
    params: scaledParams
  };
});

console.log(JSON.stringify(newOpenings, null, 2));
