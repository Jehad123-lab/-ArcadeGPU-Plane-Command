import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh } from './GameUtils';

export class FlyEnemy {
  pos: vec3;
  hp: number = 30;
  static bodyMesh: Gfx3Mesh | null = null;
  static wingMesh: Gfx3Mesh | null = null;
  static projMesh: Gfx3Mesh | null = null;
  projectiles: { pos: vec3, life: number, dir: vec3 }[] = [];
  shootTimer: number = 2.0;

  constructor(x: number, z: number) {
    this.pos = [x, 10, z];
    if (!FlyEnemy.bodyMesh) {
      FlyEnemy.bodyMesh = createBoxMesh(1.2, 1.2, 2.5, [0.4, 0.4, 0.4]);
      FlyEnemy.wingMesh = createBoxMesh(3.5, 0.3, 1.2, [0.35, 0.35, 0.35]);
      FlyEnemy.projMesh = createBoxMesh(0.4, 0.4, 0.4, [1.0, 0.3, 0.1]);
    }
    this.shootTimer = 1.0 + Math.random() * 2.0;
  }

  update(ts: number, targetPos: vec3): { didShoot: boolean, muzzlePos?: vec3, dir?: vec3 } {
    let didShoot = false;
    let muzzlePos: vec3 | undefined = undefined;
    let dir: vec3 | undefined = undefined;
      
    // Update projectiles ALWAYS
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.pos[0] += p.dir[0] * 35 * (ts / 1000);
      p.pos[2] += p.dir[2] * 35 * (ts / 1000);
      p.life -= ts / 1000;
      if (p.life <= 0) this.projectiles.splice(i, 1);
    }

    if (this.hp <= 0) return { didShoot };
    
    this.pos[2] += 12 * (ts / 1000); // fly down continually
    
    this.shootTimer -= ts / 1000;
    
    if (this.shootTimer <= 0 && this.pos[2] < targetPos[2] - 5) { // Shoot if above player
       const dx = targetPos[0] - this.pos[0];
       const dz = targetPos[2] - this.pos[2];
       const dNorm = UT.VEC3_NORMALIZE([dx, 0, dz]);
       this.projectiles.push({ pos: [this.pos[0], this.pos[1], this.pos[2]], life: 3.0, dir: dNorm });
       this.shootTimer = 1.5 + Math.random() * 1.0;
       didShoot = true;
       muzzlePos = [this.pos[0], this.pos[1], this.pos[2] + 1.5];
       dir = dNorm;
    }
    
    return { didShoot, muzzlePos, dir };
  }

  draw() {
    const scale: vec3 = [1,1,1];
    const ZERO: vec3 = [0,0,0];
    const q = Quaternion.createFromEuler(Math.PI, 0, 0, 'YXZ');
    
    if (FlyEnemy.projMesh) {
       for (const p of this.projectiles) {
         const matProj = UT.MAT4_TRANSFORM(p.pos, ZERO, scale, Quaternion.createFromEuler(0,0,0,'YXZ'));
         gfx3MeshRenderer.drawMesh(FlyEnemy.projMesh, matProj);
       }
    }

    if (this.hp <= 0) return;

    if (FlyEnemy.bodyMesh && FlyEnemy.wingMesh) {
      const matBody = UT.MAT4_TRANSFORM(this.pos, ZERO, scale, q);
      gfx3MeshRenderer.drawMesh(FlyEnemy.bodyMesh, matBody);
      
      const matWing = UT.MAT4_TRANSFORM(UT.VEC3_ADD(this.pos, [0, 0.2, -0.2]), ZERO, scale, q);
      gfx3MeshRenderer.drawMesh(FlyEnemy.wingMesh, matWing);
    }
  }
}
