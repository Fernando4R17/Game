import Phaser from 'phaser';
import HeartPickup from './HeartPickup';

class Enemy {
  constructor(scene, x, y, leftBoundary, rightBoundary) {
    this.scene = scene;
    this.leftBoundary = leftBoundary || (x - 200);
    this.rightBoundary = rightBoundary || (x + 200);
    this.homeX = x;
    this.facingLeft = true;
    this.isShooting = false;
    this.lastShootTime = 0;
    this.shootCooldown = 750; // Changed from 1500 to 750ms between shots
    this.visionRange = 300;
    this.followSpeed = 80;
    
    // Add enemy health system
    this.enemyData = {
      lives: 2,               // Each enemy has 2 lives
      maxLives: 2,            // Maximum lives
      isInvulnerable: false,  // For hit cooldown
      invulnerableUntil: 0,   // Timestamp when invulnerability ends
      isDead: false           // Track if enemy is dead
    };
    
    this.create(x, y);
  }
  
  create(x, y) {
    // Create enemy sprite
    this.sprite = this.scene.physics.add.sprite(x, y, 'enemy-idle');
    
    // Configure enemy
    this.sprite.setScale(1.8);
    this.sprite.setDepth(2);
    this.sprite.setCollideWorldBounds(true);
    
    // Set body size to match player's hitbox - make it skinnier and not extend into ground
    this.sprite.body.setSize(this.sprite.width * 0.5, this.sprite.height * 0.8, true);
    this.sprite.body.setOffset(this.sprite.width * 0.25, this.sprite.height * 0.05);
    
    // Add gravity to ensure they land on platforms
    this.sprite.body.setGravityY(300);
    
    // Store references with the sprite for easier access
    this.sprite.enemyComponent = this;
    
    // Create animations if they don't exist
    this.createAnimations();
    
    // Play idle animation
    this.sprite.anims.play('enemy-idle', true);
    
    // Listen for animation completion
    this.sprite.on('animationcomplete-enemy-shooting', () => {
      this.isShooting = false;
      this.sprite.anims.play('enemy-idle', true);
    });
  }
  
  createAnimations() {
    const scene = this.scene;
    
    // Always recreate animations to ensure they work after game restart
    
    // Idle animation
    if (scene.anims.exists('enemy-idle')) {
      scene.anims.remove('enemy-idle');
    }
    scene.anims.create({
      key: 'enemy-idle',
      frames: scene.anims.generateFrameNumbers('enemy-idle', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Running animation
    if (scene.anims.exists('enemy-running')) {
      scene.anims.remove('enemy-running');
    }
    scene.anims.create({
      key: 'enemy-running',
      frames: scene.anims.generateFrameNumbers('enemy-running', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Shooting animation
    if (scene.anims.exists('enemy-shooting')) {
      scene.anims.remove('enemy-shooting');
    }
    scene.anims.create({
      key: 'enemy-shooting',
      frames: scene.anims.generateFrameNumbers('enemy-shooting', { start: 0, end: 1 }),
      frameRate: 12,
      repeat: 0
    });
  }
  
  update(player) {
    if (!this.sprite || !this.sprite.active || !player || !player.sprite) return;
    
    // Skip updates if game is paused
    if (this.scene.gameState && this.scene.gameState.isPaused) return;
    
    // Update invulnerability status
    if (this.enemyData.isInvulnerable && this.scene.time && 
        this.scene.time.now > this.enemyData.invulnerableUntil) {
      this.enemyData.isInvulnerable = false;
      if (this.invulnerabilityTween) {
        this.invulnerabilityTween.stop();
        if (this.sprite && this.sprite.active) {
          this.sprite.alpha = 1;
        }
      }
    }
    
    // Check if touching ground and set exact Y position
    const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
    if (onGround && this.sprite.body.velocity.y > 0) {
      // Calculate the proper ground level from platform position if available
      let groundLevel;
      
      if (this.scene.platforms && 
          typeof this.scene.platforms.groundPlatformY !== 'undefined' && 
          typeof this.scene.platforms.groundPlatformHeight !== 'undefined') {
        // Use platform properties
        const platformY = this.scene.platforms.groundPlatformY;
        const platformHeight = this.scene.platforms.groundPlatformHeight;
        groundLevel = platformY - (platformHeight / 2) - 35;
      } else {
        // Fallback calculation
        const platformHeight = 20;
        groundLevel = this.scene.physics.world.bounds.height - platformHeight - 30;
      }
      
      // Set exact Y position when landing
      this.sprite.y = groundLevel;
      this.sprite.body.velocity.y = 0;
    }
    
    // Calculate distance to player
    const distanceToPlayer = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y, 
      player.sprite.x, player.sprite.y
    );
    
    // Check if player is in vision range
    if (distanceToPlayer <= this.visionRange) {
      // Determine direction to player
      const directionToPlayer = (player.sprite.x < this.sprite.x) ? -1 : 1;
      
      // Update enemy facing direction
      this.facingLeft = directionToPlayer < 0;
      this.sprite.setFlipX(this.facingLeft);
      
      // Check if it's time to shoot
      const currentTime = this.scene.time.now;
      if (currentTime > this.lastShootTime + this.shootCooldown && !this.isShooting) {
        // Shoot at player
        this.shoot();
      } else if (!this.isShooting) {
        // Check if moving would exceed boundaries
        const newX = this.sprite.x + (directionToPlayer * this.followSpeed * 0.016); // approx one frame movement
        
        // Only move if within boundaries
        if (newX >= this.leftBoundary && newX <= this.rightBoundary) {
          // Move towards player if not shooting and within boundaries
          this.sprite.setVelocityX(directionToPlayer * this.followSpeed);
          
          // Play running animation
          if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== 'enemy-running') {
            this.sprite.anims.play('enemy-running', true);
          }
        } else {
          // Stop at boundary
          this.sprite.setVelocityX(0);
          
          // Play idle animation when hitting boundary
          if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== 'enemy-idle') {
            this.sprite.anims.play('enemy-idle', true);
          }
        }
      }
    } else {
      // Outside vision range, return to home position
      const distanceToHome = Math.abs(this.sprite.x - this.homeX);
      
      if (distanceToHome > 10) { // Only move if not close to home position
        const directionToHome = (this.homeX < this.sprite.x) ? -1 : 1;
        
        // Update facing direction
        this.facingLeft = directionToHome < 0;
        this.sprite.setFlipX(this.facingLeft);
        
        // Move towards home position
        this.sprite.setVelocityX(directionToHome * (this.followSpeed * 0.5)); // Move slower when returning
        
        // Play running animation
        if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== 'enemy-running') {
          this.sprite.anims.play('enemy-running', true);
        }
      } else {
        // At home position, stop and play idle
        this.sprite.setVelocityX(0);
        
        // Ensure we reset to idle animation when home
        if (this.sprite.anims && this.sprite.anims.currentAnim && 
            this.sprite.anims.currentAnim.key !== 'enemy-idle' && !this.isShooting) {
          this.sprite.anims.play('enemy-idle', true);
        }
        
        // Definitely make sure we're at the exact home position
        if (Math.abs(this.sprite.x - this.homeX) < 2) {
          this.sprite.x = this.homeX;
        }
      }
    }
  }
  
  shoot() {
    // Skip if already shooting
    if (this.isShooting) return;
    
    // Skip if the scene is not valid
    if (!this.scene || !this.scene.time) return;
    
    // Set shooting state
    this.isShooting = true;
    this.lastShootTime = this.scene.time.now;
    
    // Play shooting animation
    if (this.sprite && this.sprite.anims) {
      this.sprite.anims.play('enemy-shooting', true);
      
      // Auto-reset shooting state after animation completes
      this.scene.time.delayedCall(400, () => {
        this.isShooting = false;
      });
    }
    
    // Get enemy bullets group from scene
    const enemyBullets = this.scene.enemyBullets;
    if (!enemyBullets) {
      console.log('Enemy bullets group not found');
      this.isShooting = false; // Reset shooting state
      return;
    }
    
    // Create bullet
    const bullet = enemyBullets.get();
    if (bullet) {
      try {
        // Make sure sprite exists
        if (!this.sprite || !this.sprite.active) {
          this.isShooting = false;
          return;
        }
        
        // Determine direction based on enemy facing
        const direction = this.facingLeft ? -1 : 1;
        
        // Calculate position adjustments
        const offsetX = direction * 20;
        const offsetY = this.sprite.height / 8; // Adjust as needed for proper position
        
        // Set bullet position and properties
        bullet.enableBody(true, this.sprite.x + offsetX, this.sprite.y + offsetY, true, true);
        bullet.setVelocityX(direction * 300); // Slower than player's bullets (600)
        bullet.setVelocityY(0);
        
        if (bullet.body) {
          bullet.body.setAllowGravity(false);
        }
        
        bullet.setScale(1.3); // Slightly smaller than player bullets
        bullet.setDepth(1.5);
        
        // Tint enemy bullet to green
        bullet.setTint(0x00ff00);
        
        if (direction > 0) {
          bullet.rotation = 0;
        } else {
          bullet.rotation = Math.PI;
        }
        
        // Ensure scene still exists
        if (!this.scene || !this.scene.time) {
          this.isShooting = false;
          return;
        }
        
        // Bullet has limited range - destroy after covering less distance than player bullets
        this.scene.time.delayedCall(800, function() { // Only 800ms vs player's 1200ms
          if (bullet && bullet.active) {
            if (this.scene && this.scene.tweens) {
              this.scene.tweens.add({
                targets: bullet,
                alpha: 0,
                scale: 0.8,
                duration: 100,
                onComplete: function() {
                  if (bullet && bullet.active) bullet.destroy();
                }
              });
            } else {
              // No tweens available, destroy directly
              if (bullet && bullet.active) bullet.destroy();
            }
          }
        }, [], this.scene);
        
        // Make sure scene still exists before adding flash effect
        if (!this.scene || !this.scene.add) {
          this.isShooting = false;
          return;
        }
        
        // Add a green muzzle flash
        const flash = this.scene.add.circle(this.sprite.x + offsetX, this.sprite.y + offsetY, 12, 0x00ff00, 0.8);
        if (flash) {
          flash.setDepth(3);
          flash.setName('enemyMuzzleFlash');
          
          // Store flash for tracking
          if (!this.scene.flashEffects) {
            this.scene.flashEffects = [];
          }
          this.scene.flashEffects.push(flash);
          
          // Make sure scene still exists before adding tween
          if (this.scene && this.scene.tweens) {
            // Fade out the flash
            this.scene.tweens.add({
              targets: flash,
              alpha: 0,
              scale: 2,
              duration: 100,
              onComplete: () => {
                if (flash && flash.active) flash.destroy();
                if (this.scene && this.scene.flashEffects) {
                  const index = this.scene.flashEffects.indexOf(flash);
                  if (index > -1) {
                    this.scene.flashEffects.splice(index, 1);
                  }
                }
              }
            });
          }
        }
      } catch (error) {
        console.error("Error in enemy shoot method:", error);
        this.isShooting = false;
      }
    } else {
      // No available bullet in the pool, force shooting to complete
      this.isShooting = false;
    }
  }
  
  reset() {
    // Reset the enemy to initial state
    this.isShooting = false;
    this.lastShootTime = 0;
    
    // Calculate the proper ground level from platform position if available
    let groundLevel;
    
    if (this.scene.platforms && 
        typeof this.scene.platforms.groundPlatformY !== 'undefined' && 
        typeof this.scene.platforms.groundPlatformHeight !== 'undefined') {
      // Use platform properties
      const platformY = this.scene.platforms.groundPlatformY;
      const platformHeight = this.scene.platforms.groundPlatformHeight;
      groundLevel = platformY - (platformHeight / 2) - 35;
    } else {
      // Fallback calculation
      const platformHeight = 20;
      groundLevel = this.scene.physics.world.bounds.height - platformHeight - 30;
    }
    
    // Reset position to the exact position
    this.sprite.setPosition(this.homeX, groundLevel);
    
    // Reset velocities
    this.sprite.setVelocity(0, 0);
    
    // Reset animation and state
    this.sprite.anims.play('enemy-idle', true);
    
    // Reset tint if any
    this.sprite.clearTint();
  }
  
  destroy() {
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }
  }
  
  /**
   * Make the enemy lose a life, similar to player
   * @param {number} amount Number of lives to lose
   */
  loseLife(amount = 1) {
    // Skip if dead or invulnerable
    if (this.enemyData.isDead || this.enemyData.isInvulnerable) {
      return;
    }
    
    // Reduce lives
    this.enemyData.lives -= amount;
    
    // Flash red to indicate damage
    if (this.scene && this.scene.tweens && this.sprite) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: { start: 0.5, to: 1 },
        tint: { start: 0xff0000, to: 0xffffff },
        duration: 200,
        ease: 'Linear',
        repeat: 0,
        onComplete: () => {
          // Clear any tint when the effect is done
          if (this.sprite && this.sprite.active) {
            this.sprite.clearTint();
          }
        }
      });
    }
    
    // Make invulnerable briefly
    this.makeInvulnerable(300);
    
    // Check if dead
    if (this.enemyData.lives <= 0) {
      this.enemyData.isDead = true;
      this.die();
    }
  }
  
  /**
   * Make the enemy temporarily invulnerable
   * @param {number} duration Time in milliseconds
   */
  makeInvulnerable(duration = 300) {
    this.enemyData.isInvulnerable = true;
    this.enemyData.invulnerableUntil = this.scene.time ? this.scene.time.now + duration : 0;
    
    // Visual indicator of invulnerability - flashing effect
    if (this.sprite && this.sprite.active) {
      // Create a flashing effect
      this.invulnerabilityTween = this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.7, to: 1 },
        duration: 50,
        repeat: Math.floor(duration / 100) - 1,
        yoyo: true,
        onComplete: () => {
          if (this.sprite && this.sprite.active) {
            this.sprite.alpha = 1;
          }
        }
      });
    }
  }
  
  /**
   * Handle enemy death
   */
  die() {
    // Drop a heart with 50% chance
    if (Math.random() < 0.5 && this.scene && this.sprite) {
      try {
        // Safely create heart pickup
        const heart = new HeartPickup(this.scene, this.sprite.x, this.sprite.y, this.scene.player);
      } catch (error) {
        console.error("Error creating heart pickup:", error);
      }
    }
    
    // Destroy the enemy
    this.destroy();
  }
}

export default Enemy; 