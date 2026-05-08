import { Screen } from '@lib/screen/screen';
import { gfx3Manager } from '@lib/gfx3/gfx3_manager';
import { gfx3MeshRenderer } from '@lib/gfx3_mesh/gfx3_mesh_renderer';
import { gfx3PostRenderer, PostParam } from '@lib/gfx3_post/gfx3_post_renderer';
import { Gfx3Camera } from '@lib/gfx3_camera/gfx3_camera';
import { inputManager } from '@lib/input/input_manager';
import { UT } from '@lib/core/utils';
import { Plane } from './Plane';
import { Environment } from './Environment';
import { FlyEnemy } from './FlyEnemy';
import { Explosion } from './Explosion';

export class GameScreen extends Screen {
  camera: Gfx3Camera;
  plane: Plane;
  level: Environment;
  enemies: FlyEnemy[] = [];
  explosions: Explosion[] = [];
  moveDir = { x: 0, y: 0 };
  virtualFire: 'none' | 'normal' | 'grenade' = 'none';
  
  isReady: boolean = false;
  score: number = 0;
  enemySpawnTimer: number = 1.0;
  
  constructor() {
    super();
    this.camera = new Gfx3Camera(0);
    this.plane = new Plane();
    this.level = new Environment();
  }

  async onEnter() {
    gfx3PostRenderer.setParam(PostParam.PIXELATION_ENABLED, 0.0);
    
    // Desktop Controls
    inputManager.registerAction('keyboard', 'KeyW', 'THR_FWD');
    inputManager.registerAction('keyboard', 'KeyS', 'THR_BWD');
    inputManager.registerAction('keyboard', 'KeyA', 'STR_LFT');
    inputManager.registerAction('keyboard', 'KeyD', 'STR_RGT');
    inputManager.registerAction('keyboard', 'Space', 'FIRE');

    // Camera points straight down (Top-Down scrolling shooter view)
    this.camera.setPosition(0, 40, 2);
    this.camera.lookAt(0, 0, -2);
    // Ocean color
    this.camera.getView().setBgColor(0.1, 0.35, 0.75, 1.0); 

    this.isReady = true;
  }

  update(ts: number) {
    if (this.plane.hp <= 0) return;

    inputManager.update(ts);

    let kbX = 0;
    let kbY = 0;
    if (inputManager.isActiveAction('THR_FWD')) kbY += 1;
    if (inputManager.isActiveAction('THR_BWD')) kbY -= 1;
    if (inputManager.isActiveAction('STR_LFT')) kbX -= 1;
    if (inputManager.isActiveAction('STR_RGT')) kbX += 1;

    const combinedMoveDir = { 
      x: kbX + (Math.abs(this.moveDir.x) > 0.1 ? this.moveDir.x : 0),
      y: kbY + (Math.abs(this.moveDir.y) > 0.1 ? this.moveDir.y : 0)
    };
    
    combinedMoveDir.x = Math.max(-1, Math.min(1, combinedMoveDir.x));
    combinedMoveDir.y = Math.max(-1, Math.min(1, combinedMoveDir.y));

    const currentFiringInput = inputManager.isActiveAction('FIRE') || inputManager.isMouseDown();
    const isFiring = this.virtualFire !== 'none' || currentFiringInput;

    this.level.update(ts);

    const targetPos = this.plane.pos;
    
    // Spawn enemies
    this.enemySpawnTimer -= ts / 1000;
    if (this.enemySpawnTimer <= 0) {
       this.enemies.push(new FlyEnemy((Math.random() - 0.5) * 40, -40)); // spawn ahead of camera
       this.enemySpawnTimer = 0.5 + Math.random() * 1.5;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
       const enemy = this.enemies[i];
       const res = enemy.update(ts, targetPos);
       if (res.didShoot && res.muzzlePos && res.dir) {
           this.explosions.push(new Explosion(res.muzzlePos[0], res.muzzlePos[1], res.muzzlePos[2], [1.0, 0.5, 0.1], res.dir, 0.5, 'muzzle'));
       }
       if (enemy.pos[2] > 40) {
           this.enemies.splice(i, 1);
       }
    }
    
    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
        const alive = this.explosions[i].update(ts);
        if (!alive) this.explosions.splice(i, 1);
    }

    // Hit Detection - Player projectiles vs Enemies
    for (const p of this.plane.projectiles) {
        if (p.life <= 0) continue;
        
        let hitEnemy = false;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0) continue;
            
            const dx = p.pos[0] - enemy.pos[0];
            const dy = p.pos[1] - enemy.pos[1];
            const dz = p.pos[2] - enemy.pos[2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < 2.5) {
                hitEnemy = true;
                enemy.hp -= 34; // 3 hits to kill
                p.life = 0; 
                this.explosions.push(new Explosion(p.pos[0], p.pos[1], p.pos[2], [1.0, 0.7, 0.2], undefined, 0.5));

                if (enemy.hp <= 0) {
                    this.explosions.push(new Explosion(enemy.pos[0], enemy.pos[1], enemy.pos[2], [0.8, 0.2, 0.2], undefined, 2.0));
                    this.score += 100;
                    this.enemies.splice(i, 1);
                }
                break;
            }
        }
    }
    
    // Enemy projectiles vs Player
    for (const enemy of this.enemies) {
        for (const p of enemy.projectiles) {
            if (p.life <= 0) continue;
            
            const dx = p.pos[0] - targetPos[0];
            const dy = p.pos[1] - targetPos[1];
            const dz = p.pos[2] - targetPos[2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (dist < 2.0) {
                p.life = 0;
                this.explosions.push(new Explosion(p.pos[0], p.pos[1], p.pos[2]));
                this.plane.hp -= 10;
                if (this.plane.hp <= 0) {
                    this.explosions.push(new Explosion(targetPos[0], targetPos[1], targetPos[2], [1.0, 0.3, 0.1], undefined, 3.0));
                }
            } 
        }
    }

    // Update player
    const didShoot = this.plane.update(ts, combinedMoveDir, isFiring);
    if (didShoot) {
       this.explosions.push(new Explosion(this.plane.pos[0]-0.6, this.plane.pos[1], this.plane.pos[2]-1.5, [1.0, 0.8, 0.2], undefined, 0.5, 'muzzle'));
       this.explosions.push(new Explosion(this.plane.pos[0]+0.6, this.plane.pos[1], this.plane.pos[2]-1.5, [1.0, 0.8, 0.2], undefined, 0.5, 'muzzle'));
    }

    // Camera Follow
    const lerpedCamX = UT.LERP(this.camera.getPosition()[0], this.plane.pos[0] * 0.3, 0.05);
    const lerpedCamZ = UT.LERP(this.camera.getPosition()[2], this.plane.pos[2] * 0.3, 0.05);

    let shakeX = 0, shakeZ = 0;
    if (this.plane.recoil > 0) {
        const mag = this.plane.recoil * 0.5;
        shakeX = (Math.random() - 0.5) * mag;
        shakeZ = (Math.random() - 0.5) * mag;
    }

    this.camera.setPosition(lerpedCamX + shakeX, 40, lerpedCamZ + shakeZ + 5);
    this.camera.lookAt(lerpedCamX + shakeX, 0, lerpedCamZ + shakeZ - 5);
  }

  draw() {
    gfx3Manager.beginDrawing();
    gfx3MeshRenderer.drawDirLight([0.3, -1.0, 0.4], [1.0, 0.95, 0.85], [1.0, 1.0, 1.0], 1.2);
    gfx3MeshRenderer.setAmbientColor([0.5, 0.5, 0.6]);

    this.level.draw();
    if (this.plane.hp > 0) this.plane.draw();
    for (const enemy of this.enemies) {
       enemy.draw();
    }
    for (const exp of this.explosions) {
       exp.draw();
    }
    
    gfx3Manager.endDrawing();
  }

  render(ts: number) {
    if (!this.isReady) return;
    
    gfx3Manager.beginRender();
    
    // 1. Render scene to post-processing source texture
    gfx3Manager.setDestinationTexture(gfx3PostRenderer.getSourceTexture());
    gfx3Manager.beginPassRender(0);
    gfx3MeshRenderer.render(ts);
    gfx3Manager.endPassRender();
    
    // 2. Render post-processing to canvas
    gfx3Manager.setDestinationTexture(null);
    gfx3PostRenderer.render(ts, gfx3Manager.getCurrentRenderingTexture());
    
    gfx3Manager.endRender();
  }
}
