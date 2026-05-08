import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { UT } from '@lib/core/utils';
import { Quaternion } from '@lib/core/quaternion';
import { createBoxMesh } from './GameUtils';

export class Environment {
  static islandMesh: Gfx3Mesh;
  static cloudMesh: Gfx3Mesh;
  
  items: { type: 'island' | 'cloud', pos: vec3, scale: vec3, speed: number }[] = [];

  constructor() {
    if (!Environment.islandMesh) {
      Environment.islandMesh = createBoxMesh(1, 1, 1, [0.3, 0.6, 0.2]); // Green islands
      Environment.cloudMesh = createBoxMesh(1, 1, 1, [0.95, 0.95, 0.95]); // White clouds
    }
    
    // Initial population
    for (let i = 0; i < 40; i++) {
        this.spawnItem('island', Math.random() * 200 - 100);
    }
    for (let i = 0; i < 30; i++) {
        this.spawnItem('cloud', Math.random() * 200 - 100);
    }
  }

  spawnItem(type: 'island' | 'cloud', z: number) {
      const x = (Math.random() - 0.5) * 80;
      if (type === 'island') {
          const w = 5 + Math.random() * 15;
          const d = 5 + Math.random() * 15;
          this.items.push({ type, pos: [x, 0, z], scale: [w, 2 + Math.random() * 2, d], speed: 10 });
      } else {
          const w = 8 + Math.random() * 15;
          const d = 6 + Math.random() * 10;
          this.items.push({ type, pos: [x, 5 + Math.random() * 3, z], scale: [w, 2, d], speed: 15 });
      }
  }

  update(ts: number) {
      for (const item of this.items) {
          item.pos[2] += item.speed * (ts / 1000);
          if (item.pos[2] > 40) {
              item.pos[2] = -120;
              item.pos[0] = (Math.random() - 0.5) * 80;
          }
      }
  }

  draw() {
    const ZERO: vec3 = [0,0,0];
    const q = new Quaternion();
    for (const item of this.items) {
        const mat = UT.MAT4_TRANSFORM(item.pos, ZERO, item.scale, q);
        const mesh = item.type === 'island' ? Environment.islandMesh : Environment.cloudMesh;
        gfx3MeshRenderer.drawMesh(mesh, mat);
    }
  }
}
