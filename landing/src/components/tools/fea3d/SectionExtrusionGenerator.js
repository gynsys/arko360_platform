import * as THREE from 'three';

export class SectionExtrusionGenerator {
  static createGeometry(section, length) {
    if (!section || !section.type) return new THREE.CylinderGeometry(0.05, 0.05, length, 8);

    const p = section.params || {};

    if (section.type === 'Rectangular') {
      const b = p.b || 0.3;
      const h = p.h || 0.4;
      return new THREE.BoxGeometry(b, h, length);
    }

    if (section.type === 'Circular Solid') {
      const d = p.d || 0.3;
      const geo = new THREE.CylinderGeometry(d/2, d/2, length, 16);
      geo.rotateX(Math.PI / 2);
      return geo;
    }

    if (section.type === 'Angle') {
      const d = p.d || 0.1;
      const b = p.b || 0.1;
      const t = p.t || 0.01;
      const shape = new THREE.Shape();
      
      // Center of gravity approx (assuming bottom-left corner at 0,0 before centering)
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

      const addBox = (x1, x2, y1_start, y2_start, y1_end, y2_end, z_start, z_end) => {
        const pts = [
          [x1, y1_start, z_start], [x2, y1_start, z_start], [x2, y2_start, z_start], [x1, y2_start, z_start],
          [x1, y1_end, z_end], [x2, y1_end, z_end], [x2, y2_end, z_end], [x1, y2_end, z_end]
        ];
        const base = vIdx;
        pts.forEach(pt => vertices.push(...pt));
        vIdx += 8;

        const faces = [
          [0,1,2], [0,2,3], // Back
          [4,6,5], [4,7,6], // Front
          [0,4,5], [0,5,1], // Bottom
          [3,2,6], [3,6,7], // Top
          [0,3,7], [0,7,4], // Left
          [1,5,6], [1,6,2]  // Right
        ];
        faces.forEach(f => {
          indices.push(base+f[0], base+f[1], base+f[2]);
        });
      };

      const z0 = -length/2;
      const z1 = length/2;

      // Bottom flange
      addBox(-w3/2, w3/2, -h1/2, -h1/2+t3, -h2/2, -h2/2+t3, z0, z1);
      // Top flange
      addBox(-w2/2, w2/2, h1/2-t3, h1/2, h2/2-t3, h2/2, z0, z1);
      // Web
      addBox(-t2/2, t2/2, -h1/2+t3, h1/2-t3, -h2/2+t3, h2/2-t3, z0, z1);

      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      return geom;
    }

    return new THREE.BoxGeometry(0.1, 0.1, length);
  }
}
