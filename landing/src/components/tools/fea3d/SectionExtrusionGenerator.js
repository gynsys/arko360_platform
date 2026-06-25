import * as THREE from 'three';

export class SectionExtrusionGenerator {
  static createGeometry(section, length, allSections = [], elem = null) {
    if (!section || !section.type) {
      const geo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
      geo.rotateZ(-Math.PI / 2); // Align with X
      return geo;
    }

    const p = section.params || {};

    if (section.type === 'Rectangular') {
      const b = p.b || p.bf || 0.3;
      const h = p.h || p.d || p.ht || 0.4;
      
      // BoxGeometry(width(X), height(Y), depth(Z))
      // We want length along X, height along Y, width along Z
      const geo = new THREE.BoxGeometry(length, h, b);
      
      const align = (elem && elem.alignment) ? elem.alignment : (p.alignment || 'Center');
      if (align === 'Top Center') {
         geo.translate(0, -h/2, 0);
      } else if (align === 'Bottom Center') {
         geo.translate(0, h/2, 0);
      }
      return geo;
    }

    if (section.type === 'Circular Solid' || section.type === 'Circular') {
      const d = p.d || p.D || 0.3;
      // If it's just 'Circular', it should be a hollow tube, but for 3D lines cylinder is fine unless we really need hollow.
      // To keep it simple, we draw a solid cylinder for both.
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

    if (section.type === 'I/Wide Flange' || section.type === 'I-Shape') {
      const ht = p.ht || p.d || p.h || 0.4;
      const w2 = p.w2 || p.bf || p.b || 0.2;
      const w3 = p.w3 || p.bf || p.b || 0.2;
      const t2 = p.t2 || p.tw || 0.01; 
      const t3 = p.t3 || p.tf || 0.015; 
      
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
      
      const align = (elem && elem.alignment) ? elem.alignment : (p.alignment || 'Center');
      geo.center();
      if (align === 'Top Center') {
         geo.translate(0, -ht/2, 0);
      } else if (align === 'Bottom Center') {
         geo.translate(0, ht/2, 0);
      }
      
      geo.rotateY(Math.PI / 2); // Align extrusion (Z) to X
      return geo;
    }

    if (section.type === 'Channel') {
      const d = p.d || p.h || 0.2;
      const bf = p.bf || p.b || 0.1;
      const tw = p.tw || p.t || 0.01;
      const tf = p.tf || p.t || 0.015;
      
      const shape = new THREE.Shape();
      // Start at bottom left
      shape.moveTo(-bf/2, -d/2);
      shape.lineTo(bf/2, -d/2);
      shape.lineTo(bf/2, -d/2 + tf);
      shape.lineTo(-bf/2 + tw, -d/2 + tf);
      shape.lineTo(-bf/2 + tw, d/2 - tf);
      shape.lineTo(bf/2, d/2 - tf);
      shape.lineTo(bf/2, d/2);
      shape.lineTo(-bf/2, d/2);
      shape.lineTo(-bf/2, -d/2);

      const extrudeSettings = { depth: length, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      const align = (elem && elem.alignment) ? elem.alignment : (p.alignment || 'Center');
      geo.center();
      if (align === 'Top Center') {
         geo.translate(0, -d/2, 0);
      } else if (align === 'Bottom Center') {
         geo.translate(0, d/2, 0);
      }

      geo.rotateY(Math.PI / 2);
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

      // top_slope support for slant columns
      let end_slope_dy = 0;
      if (elem && elem.top_slope) {
         end_slope_dy = Math.tan(elem.top_slope * Math.PI / 180);
      }

      const addBox = (z1_val, z2_val, y1_start, y2_start, y1_end, y2_end, x_start, x_end) => {
        // slant ends using end_slope_dy applied to y
        const dx1 = end_slope_dy * y1_end;
        const dx2 = end_slope_dy * y2_end;
        
        const pts = [
          [x_start, y1_start, z1_val], [x_start, y1_start, z2_val], [x_start, y2_start, z2_val], [x_start, y2_start, z1_val],
          [x_end + dx1, y1_end, z1_val], [x_end + dx1, y1_end, z2_val], [x_end + dx2, y2_end, z2_val], [x_end + dx2, y2_end, z1_val]
        ];
        const base = vIdx;
        pts.forEach(pt => vertices.push(...pt));
        vIdx += 8;

        const faces = [
          [0,2,1], [0,3,2], // Back
          [4,5,6], [4,6,7], // Front
          [0,1,5], [0,5,4], // Bottom
          [3,6,2], [3,7,6], // Top
          [0,4,7], [0,7,3], // Left
          [1,2,6], [1,6,5]  // Right
        ];
        faces.forEach(f => { indices.push(base+f[0], base+f[1], base+f[2]); });
      };

      const x0 = -length/2;
      const x1 = length/2;

      let offsetY1 = 0;
      let offsetY2 = 0;
      const align = (elem && elem.alignment) ? elem.alignment : (p.alignment || 'Center');
      if (align === 'Top Center') {
         offsetY1 = -h1/2; 
         offsetY2 = -h2/2;
      } else if (align === 'Bottom Center') {
         offsetY1 = h1/2;
         offsetY2 = h2/2;
      }

      // Bottom flange
      addBox(-w3/2, w3/2, offsetY1 -h1/2, offsetY1 -h1/2+t3, offsetY2 -h2/2, offsetY2 -h2/2+t3, x0, x1);
      // Top flange
      addBox(-w2/2, w2/2, offsetY1 + h1/2-t3, offsetY1 + h1/2, offsetY2 + h2/2-t3, offsetY2 + h2/2, x0, x1);
      // Web
      addBox(-t2/2, t2/2, offsetY1 -h1/2+t3, offsetY1 + h1/2-t3, offsetY2 -h2/2+t3, offsetY2 + h2/2-t3, x0, x1);

      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      return geom;
    }

    if (section.type === 'Non-Prismatic') {
      let sec1, sec2;
      const defType = p.defType || 'Cartela';
      
      if (defType === 'Interpolate') {
        sec1 = allSections.find(s => s.id === p.start_section_id);
        sec2 = allSections.find(s => s.id === p.end_section_id);
      } else {
        sec1 = allSections.find(s => s.id === p.base_section_id);
        sec2 = sec1;
      }
      
      if (!sec1 || !sec2) {
         const geo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
         geo.rotateZ(-Math.PI / 2);
         return geo;
      }
      
      let h1 = sec1.params?.h || 0.4, h2 = sec2.params?.h || 0.4;
      let w2_1 = sec1.params?.b || 0.2, w2_2 = sec2.params?.b || 0.2;
      let w3_1 = sec1.params?.b || 0.2, w3_2 = sec2.params?.b || 0.2;
      let tf1 = sec1.params?.tf || 0.01, tf2 = sec2.params?.tf || 0.01;
      let tw1 = sec1.params?.tw || 0.01, tw2 = sec2.params?.tw || 0.01;
      
      if (defType === 'Cartela') {
         const haunch_h = p.haunch_h || 0;
         if (p.haunch_pos === 'start') {
           h1 += haunch_h;
         } else {
           h2 += haunch_h;
         }
      }
      
      let offsetY1 = 0;
      let offsetY2 = 0;
      
      const align = p.alignment || 'Center';
      if (align === 'Top Center') {
         offsetY1 = -h1/2; 
         offsetY2 = -h2/2;
      } else if (align === 'Bottom Center') {
         offsetY1 = h1/2;
         offsetY2 = h2/2;
      }
      
      const geom = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      let vIdx = 0;

      const addBox = (z1_1, z2_1, z1_2, z2_2, y1_1, y2_1, y1_2, y2_2, x_start, x_end) => {
        const pts = [
          [x_start, y1_1, z1_1], [x_start, y1_1, z2_1], [x_start, y2_1, z2_1], [x_start, y2_1, z1_1],
          [x_end, y1_2, z1_2], [x_end, y1_2, z2_2], [x_end, y2_2, z2_2], [x_end, y2_2, z1_2]
        ];
        const base = vIdx;
        pts.forEach(pt => vertices.push(...pt));
        vIdx += 8;
        const faces = [
          [0,2,1], [0,3,2], [4,5,6], [4,6,7], [0,1,5], [0,5,4],
          [3,6,2], [3,7,6], [0,4,7], [0,7,3], [1,2,6], [1,6,5]
        ];
        faces.forEach(f => { indices.push(base+f[0], base+f[1], base+f[2]); });
      };

      const x0 = -length/2;
      const x1 = length/2;

      // Bottom flange
      addBox(-w3_1/2, w3_1/2, -w3_2/2, w3_2/2, 
             offsetY1 -h1/2, offsetY1 -h1/2+tf1, 
             offsetY2 -h2/2, offsetY2 -h2/2+tf2, 
             x0, x1);
      // Top flange
      addBox(-w2_1/2, w2_1/2, -w2_2/2, w2_2/2, 
             offsetY1 + h1/2-tf1, offsetY1 + h1/2, 
             offsetY2 + h2/2-tf2, offsetY2 + h2/2, 
             x0, x1);
      // Web
      addBox(-tw1/2, tw1/2, -tw2/2, tw2/2, 
             offsetY1 -h1/2+tf1, offsetY1 + h1/2-tf1, 
             offsetY2 -h2/2+tf2, offsetY2 + h2/2-tf2, 
             x0, x1);

      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      return geom;
    }

    const defaultGeo = new THREE.BoxGeometry(length, 0.1, 0.1);
    return defaultGeo;
  }
}
