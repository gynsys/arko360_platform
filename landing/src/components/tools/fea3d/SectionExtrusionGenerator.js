import * as THREE from 'three';

export class SectionExtrusionGenerator {
  static createGeometry(section, length) {
    if (!section || !section.type) {
      const geo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
      geo.rotateZ(-Math.PI / 2); // Align with X
      return geo;
    }

    const p = section.params || {};

    if (section.type === 'Rectangular') {
      const b = p.b || 0.3;
      const h = p.h || 0.4;
      // BoxGeometry(width(X), height(Y), depth(Z))
      // We want length along X, height along Y, width along Z
      return new THREE.BoxGeometry(length, h, b);
    }

    if (section.type === 'Circular Solid') {
      const d = p.d || 0.3;
      const geo = new THREE.CylinderGeometry(d/2, d/2, length, 16);
      geo.rotateZ(-Math.PI / 2); // Align with X
      return geo;
    }

    if (section.type === 'Angle') {
      const d = p.d || 0.1;
      const b = p.b || 0.1;
      const t = p.t || 0.01;
      const shape = new THREE.Shape();
      
      shape.moveTo(0, 0);
      shape.lineTo(b, 0);
      shape.lineTo(b, t);
      shape.lineTo(t, t);
      shape.lineTo(t, d);
      shape.lineTo(0, d);
      shape.lineTo(0, 0);
      
      const extrudeSettings = { depth: length, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center(); 
      geo.rotateY(Math.PI / 2); // Align extrusion (Z) to X
      return geo;
    }

    if (section.type === 'I/Wide Flange') {
      const ht = p.ht || 0.4;
      const w2 = p.w2 || 0.2;
      const w3 = p.w3 || 0.2;
      const t2 = p.t2 || 0.01; 
      const t3 = p.t3 || 0.015; 
      
      const shape = new THREE.Shape();
      shape.moveTo(-w3/2, -ht/2);
      shape.lineTo(w3/2, -ht/2);
      shape.lineTo(w3/2, -ht/2 + t3);
      shape.lineTo(t2/2, -ht/2 + t3);
      shape.lineTo(t2/2, ht/2 - t3);
      shape.lineTo(w2/2, ht/2 - t3);
      shape.lineTo(w2/2, ht/2);
      shape.lineTo(-w2/2, ht/2);
      shape.lineTo(-w2/2, ht/2 - t3);
      shape.lineTo(-t2/2, ht/2 - t3);
      shape.lineTo(-t2/2, -ht/2 + t3);
      shape.lineTo(-w3/2, -ht/2 + t3);
      shape.lineTo(-w3/2, -ht/2);

      const extrudeSettings = { depth: length, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center();
      geo.rotateY(Math.PI / 2); // Align extrusion (Z) to X
      return geo;
    }

    if (section.type === 'Tapered I/Wide Flange') {
      const h1 = p.ht_start || 0.8;
      const h2 = p.ht_end || 0.4;
      const w2 = p.w2 || 0.2;
      const w3 = p.w3 || 0.2;
      const t2 = p.t2 || 0.01;
      const t3 = p.t3 || 0.015;

      const geom = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      let vIdx = 0;

      // We want X to be the length axis.
      // x_start to x_end.
      // y is height.
      // z is width.
      const addBox = (z1_val, z2_val, y1_start, y2_start, y1_end, y2_end, x_start, x_end) => {
        // pts order: 8 vertices
        // Back face (at x_start)
        // 0: bottom-left, 1: bottom-right, 2: top-right, 3: top-left (looking from +X)
        const pts = [
          [x_start, y1_start, z1_val], [x_start, y1_start, z2_val], [x_start, y2_start, z2_val], [x_start, y2_start, z1_val],
          [x_end, y1_end, z1_val], [x_end, y1_end, z2_val], [x_end, y2_end, z2_val], [x_end, y2_end, z1_val]
        ];
        const base = vIdx;
        pts.forEach(pt => vertices.push(...pt));
        vIdx += 8;

        const faces = [
          [0,2,1], [0,3,2], // Back (x_start)
          [4,5,6], [4,6,7], // Front (x_end)
          [0,1,5], [0,5,4], // Bottom
          [3,6,2], [3,7,6], // Top
          [0,4,7], [0,7,3], // Left
          [1,2,6], [1,6,5]  // Right
        ];
        faces.forEach(f => {
          indices.push(base+f[0], base+f[1], base+f[2]);
        });
      };

      const x0 = -length/2;
      const x1 = length/2;

      // Bottom flange
      addBox(-w3/2, w3/2, -h1/2, -h1/2+t3, -h2/2, -h2/2+t3, x0, x1);
      // Top flange
      addBox(-w2/2, w2/2, h1/2-t3, h1/2, h2/2-t3, h2/2, x0, x1);
      // Web
      addBox(-t2/2, t2/2, -h1/2+t3, h1/2-t3, -h2/2+t3, h2/2-t3, x0, x1);

      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      return geom;
    }

    const defaultGeo = new THREE.BoxGeometry(length, 0.1, 0.1);
    return defaultGeo;
  }
}
