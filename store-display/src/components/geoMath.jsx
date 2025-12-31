/**
 * @file geoMath.js
 * @description
 * Pure mathematics module for handling "2.5D" perspective projections.
 * It translates between Screen Pixels (x,y) and Floor UV Coordinates (u,v).
 */

export const Geo = {
  /**
   * Projects a UV point (0..1) on the floor to a Screen Pixel (x,y).
   * Uses Bilinear Interpolation based on the 4 floor corners.
   * @param {number} u - Horizontal floor position (0-1)
   * @param {number} v - Vertical floor position (0-1)
   * @param {Array} corners - [TL, TR, BR, BL] objects with {x,y}
   */
  project: (u, v, corners) => {
    const [tl, tr, br, bl] = corners;
    const x = tl.x*(1-u)*(1-v) + tr.x*u*(1-v) + br.x*u*v + bl.x*(1-u)*v;
    const y = tl.y*(1-u)*(1-v) + tr.y*u*(1-v) + br.y*u*v + bl.y*(1-u)*v;
    return { x, y };
  },

  /**
   * Unprojects a Screen Pixel (x,y) back to Floor UV (u,v).
   * Uses an Iterative Solver (Newton-Raphson) for high precision.
   * This allows us to know exactly where on the floor the mouse is hovering.
   */
  unproject: (px, py, corners) => {
    let u = 0.5, v = 0.5;
    for(let i=0; i<8; i++){
        const p = Geo.project(u, v, corners);
        const pu = Geo.project(u+0.001, v, corners);
        const pv = Geo.project(u, v+0.001, corners);
        
        const dxdu = (pu.x - p.x)*1000; const dydu = (pu.y - p.y)*1000;
        const dxdv = (pv.x - p.x)*1000; const dydv = (pv.y - p.y)*1000;
        
        const errX = px - p.x; const errY = py - p.y;
        const det = dxdu*dydv - dxdv*dydu;
        if(Math.abs(det) < 0.00001) break;
        
        u += (errX*dydv - errY*dxdv)/det;
        v += (errY*dxdu - errX*dydu)/det;
    }
    return {u, v};
  }
};