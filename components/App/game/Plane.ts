import { Gfx3Mesh } from '@lib/gfx3_mesh/gfx3_mesh';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { Quaternion } from '@lib/core/quaternion';
import { UT } from '@lib/core/utils';
import { createBoxMesh } from './GameUtils';

export class Plane {
  body: Gfx3Mesh;
  wingScale: Gfx3Mesh;
  tail: Gfx3Mesh;
  propeller: Gfx3Mesh;
  
  pos: vec3 = [0, 10, 0];
  velocity: vec3 = [0, 0, 0];
  rotationX: number = 0; // banking
  rotationZ: number = 0; // pitch
  recoil: number = 0;
  
  projectiles: { pos: vec3, life: number }[] = [];
  static projMesh: Gfx3Mesh | null = null;
  hp = 100;

  constructor() {
    this.body = createBoxMesh(1.0, 1.0, 3.0, [0.85, 0.85, 0.9]);
    this.wingScale = createBoxMesh(4.5, 0.2, 1.2, [0.75, 0.15, 0.15]);
    this.tail = createBoxMesh(1.8, 0.2, 0.8, [0.75, 0.15, 0.15]);
    this.propeller = createBoxMesh(0.2, 2.0, 0.2, [0.2, 0.2, 0.2]);

    if (!Plane.projMesh) {
      Plane.projMesh = createBoxMesh(0.25, 0.25, 1.0, [1.0, 0.9, 0.2]);
    }
  }

  update(ts: number, moveDir: { x: number, y: number }, isFiring: boolean): boolean {
    const speed = 25;
    this.velocity[0] = UT.LERP(this.velocity[0], moveDir.x * speed, 0.15);
    this.velocity[2] = UT.LERP(this.velocity[2], -moveDir.y * speed, 0.15);

    this.pos[0] += this.velocity[0] * (ts / 1000);
    this.pos[2] += this.velocity[2] * (ts / 1000);

    // Boundary
    if (this.pos[0] < -25) this.pos[0] = -25;
    if (this.pos[0] > 25) this.pos[0] = 25;
    if (this.pos[2] < -18) this.pos[2] = -18;
    if (this.pos[2] > 18) this.pos[2] = 18;

    // Banking relative to movement
    this.rotationZ = -this.velocity[0] * 0.03; // Roll
    this.rotationX = this.velocity[2] * 0.03;  // Pitch

    this.recoil -= ts / 1000;
    
    let didShoot = false;
    if (isFiring && this.recoil <= 0) {
      this.projectiles.push({ pos: [this.pos[0] - 0.6, this.pos[1], this.pos[2] - 1.5], life: 1.5 });
      this.projectiles.push({ pos: [this.pos[0] + 0.6, this.pos[1], this.pos[2] - 1.5], life: 1.5 });
      this.recoil = 0.15;
      didShoot = true;
    }

    const projSpeed = 70;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.pos[2] -= projSpeed * (ts / 1000);
      p.life -= ts / 1000;
      if (p.life <= 0) this.projectiles.splice(i, 1);
    }
    
    return didShoot;
  }

  draw() {
    const ZERO: vec3 = [0,0,0];
    const q = Quaternion.createFromEuler(0, this.rotationX, this.rotationZ, 'YXZ');
    const scale: vec3 = [1,1,1];
    
    const matBody = UT.MAT4_TRANSFORM(this.pos, ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(this.body, matBody);
    
    // Wings
    const matWing = UT.MAT4_TRANSFORM(UT.VEC3_ADD(this.pos, q.rotateVector([0, 0.1, 0.2])), ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(this.wingScale, matWing);
    
    // Tail
    const matTail = UT.MAT4_TRANSFORM(UT.VEC3_ADD(this.pos, q.rotateVector([0, 0.2, 1.2])), ZERO, scale, q);
    gfx3MeshRenderer.drawMesh(this.tail, matTail);

    // Propeller spinning rapidly
    const propRot = Quaternion.createFromEuler(0, 0, (Date.now() / 15) % (Math.PI * 2), 'YXZ');
    const matProp = UT.MAT4_TRANSFORM(UT.VEC3_ADD(this.pos, q.rotateVector([0, 0, -1.6])), ZERO, scale, Quaternion.multiply(q, propRot));
    gfx3MeshRenderer.drawMesh(this.propeller, matProp);

    if (Plane.projMesh) {
      for (const p of this.projectiles) {
         const matProj = UT.MAT4_TRANSFORM(p.pos, ZERO, scale, Quaternion.createFromEuler(0,0,0, 'ZYX'));
         gfx3MeshRenderer.drawMesh(Plane.projMesh, matProj);
      }
    }
  }
}
