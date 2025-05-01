import Phaser from 'phaser';
import HeartPickup from './HeartPickup';

class Enemy {
  /**
   * Static method to preload all enemy assets
   * @param {Phaser.Scene} scene - The scene to load assets into
   */
  static preloadAssets(scene) {
    // Load regular enemy sprites
    scene.load.spritesheet('enemy-idle', 
      '/assets/characters/Enemy/Enemy-idle.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 2 }
    );
    
    scene.load.spritesheet('enemy-running', 
      '/assets/characters/Enemy/Enemy-runnning.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    scene.load.spritesheet('enemy-shooting', 
      '/assets/characters/Enemy/Enemy-shoot.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    // Load Hulk sprites for special enemy
    scene.load.spritesheet('hulk-idle', 
      '/assets/characters/Hulk/Hulk-idle.png',
      { frameWidth: 125, frameHeight: 110, startFrame: 0, endFrame: 2 }
    );
    
    scene.load.spritesheet('hulk-running', 
      '/assets/characters/Hulk/Hulk-running.png',
      { frameWidth: 125, frameHeight: 110, startFrame: 0, endFrame: 3 }
    );
    
    scene.load.spritesheet('hulk-punching', 
      '/assets/characters/Hulk/Hulk-punch.png',
      { frameWidth: 125, frameHeight: 110, startFrame: 0, endFrame: 3 }
    );
    
    scene.load.spritesheet('hulk-death', 
      '/assets/characters/Hulk/Hulk-death.png',
      { frameWidth: 125, frameHeight: 110, startFrame: 0, endFrame: 2 }
    );
    
    // Load enemy projectile
    scene.load.image('enemyblast', '/assets/objects/enemyblast.png');
  }
  
  /**
   * Get positions for regular enemies throughout the level
   * @param {number} mapWidth - The width of the game map
   * @param {number} groundLevel - The Y position for enemies to be placed at
   * @returns {Array} Array of position objects for regular enemies
   */
  static getRegularEnemyPositions(mapWidth, groundLevel) {
    // Define positions for 10 regular enemies (x, boundaries)
    return [
      // First group of enemies in the first quarter of the map
      { x: Math.floor(mapWidth * 0.1), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.05), rightBoundary: Math.floor(mapWidth * 0.15) },
      { x: Math.floor(mapWidth * 0.15), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.1), rightBoundary: Math.floor(mapWidth * 0.2) },
      { x: Math.floor(mapWidth * 0.2), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.15), rightBoundary: Math.floor(mapWidth * 0.25) },
      
      // Second group in the second quarter of the map
      { x: Math.floor(mapWidth * 0.3), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.25), rightBoundary: Math.floor(mapWidth * 0.35) },
      { x: Math.floor(mapWidth * 0.4), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.35), rightBoundary: Math.floor(mapWidth * 0.45) },
      
      // Third group in the middle of the map
      { x: Math.floor(mapWidth * 0.5), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.45), rightBoundary: Math.floor(mapWidth * 0.55) },
      { x: Math.floor(mapWidth * 0.55), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.5), rightBoundary: Math.floor(mapWidth * 0.6) },
      
      // Fourth group guarding the approach to the boss
      { x: Math.floor(mapWidth * 0.65), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.6), rightBoundary: Math.floor(mapWidth * 0.7) },
      { x: Math.floor(mapWidth * 0.75), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.7), rightBoundary: Math.floor(mapWidth * 0.8) },
      { x: Math.floor(mapWidth * 0.8), y: groundLevel, leftBoundary: Math.floor(mapWidth * 0.75), rightBoundary: Math.floor(mapWidth * 0.85) }
    ];
  }
  
  /**
   * Get position for the Hulk boss at the end of the level
   * @param {number} mapWidth - The width of the game map
   * @param {number} groundLevel - The Y position for the Hulk to be placed at
   * @returns {Object} Position object for the Hulk boss
   */
  static getHulkPosition(mapWidth, groundLevel) {
    return {
      x: Math.floor(mapWidth * 0.9),
      y: groundLevel,
      leftBoundary: Math.floor(mapWidth * 0.7),
      rightBoundary: Math.floor(mapWidth * 0.95)
    };
  }

  constructor(scene, x, y, leftBoundary, rightBoundary, isSpecialBoss = false) {
    this.scene = scene;
    this.leftBoundary = leftBoundary || (x - 200);
    this.rightBoundary = rightBoundary || (x + 200);
    this.homeX = x;
    this.facingLeft = true;
    this.isShooting = false;
    this.lastShootTime = 0;
    
    // Track if this is the special boss enemy
    this.isSpecialBoss = isSpecialBoss;
    
    // Apply different properties for Hulk vs regular enemies
    if (this.isSpecialBoss) {
      // Hulk has slower attacks but stronger punch
      this.shootCooldown = 1000; // Slower punching rate (1 second)
      this.visionRange = 350;    // Slightly longer vision
      this.followSpeed = 90;     // Faster to increase difficulty
    } else {
      // Regular enemies shoot more frequently
      this.shootCooldown = 750;  // 0.75 seconds between shots
      this.visionRange = 300;    // Standard vision range
      this.followSpeed = 80;     // Regular speed
    }
    
    // Add enemy health system
    this.enemyData = {
      lives: isSpecialBoss ? 10 : 2,      // Special boss has 10 lives, regular enemies have 2
      maxLives: isSpecialBoss ? 10 : 2,   // Maximum lives
      isInvulnerable: false,             // For hit cooldown
      invulnerableUntil: 0,              // Timestamp when invulnerability ends
      isDead: false,                     // Track if enemy is dead
      showHealthBar: isSpecialBoss,       // Show health bar for special boss
      isDying: false                     // Track if enemy is dying
    };
    
    this.create(x, y);
  }
  
  create(x, y) {
    // Determine which sprites to use based on whether this is a special boss
    const idleKey = this.isSpecialBoss ? 'hulk-idle' : 'enemy-idle';
    
    // Create enemy sprite
    this.sprite = this.scene.physics.add.sprite(x, y, idleKey);
    
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
    const animKey = this.isSpecialBoss ? 'hulk-idle' : 'enemy-idle';
    this.sprite.anims.play(animKey, true);
    
    // Listen for animation completion
    if (this.isSpecialBoss) {
      this.sprite.on('animationcomplete-hulk-punching', () => {
        this.isShooting = false;
        this.sprite.anims.play('hulk-idle', true);
      });
      
      // Add listener for death animation completion
      this.sprite.on('animationcomplete-hulk-death', () => {
        // Delay the destroy slightly to let the final frame be visible for a moment
        this.scene.time.delayedCall(300, () => {
          // Clean up health bar and drop heart if needed
          this.finalCleanup();
        });
      });
    } else {
      this.sprite.on('animationcomplete-enemy-shooting', () => {
        this.isShooting = false;
        this.sprite.anims.play('enemy-idle', true);
      });
    }
    
    // Create health bar if needed
    if (this.enemyData.showHealthBar) {
      this.createHealthBar();
    }
  }
  
  createAnimations() {
    const scene = this.scene;
    
    if (this.isSpecialBoss) {
      // Create Hulk animations
      
      // Idle animation
      if (scene.anims.exists('hulk-idle')) {
        scene.anims.remove('hulk-idle');
      }
      scene.anims.create({
        key: 'hulk-idle',
        frames: scene.anims.generateFrameNumbers('hulk-idle', { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1
      });
      
      // Running animation
      if (scene.anims.exists('hulk-running')) {
        scene.anims.remove('hulk-running');
      }
      scene.anims.create({
        key: 'hulk-running',
        frames: scene.anims.generateFrameNumbers('hulk-running', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });
      
      // Punching animation (instead of shooting)
      if (scene.anims.exists('hulk-punching')) {
        scene.anims.remove('hulk-punching');
      }
      scene.anims.create({
        key: 'hulk-punching',
        frames: scene.anims.generateFrameNumbers('hulk-punching', { start: 0, end: 1 }),
        frameRate: 12,
        repeat: 0
      });
      
      // Death animation for Hulk
      if (scene.anims.exists('hulk-death')) {
        scene.anims.remove('hulk-death');
      }
      scene.anims.create({
        key: 'hulk-death',
        frames: scene.anims.generateFrameNumbers('hulk-death', { start: 0, end: 2 }),
        frameRate: 6,
        repeat: 0
      });
    } else {
      // Regular enemy animations
      
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
  }
  
  createHealthBar() {
    // Health bar background (red)
    this.healthBarBackground = this.scene.add.graphics();
    this.healthBarBackground.fillStyle(0xff0000, 1);
    this.healthBarBackground.fillRect(0, 0, 60, 8);
    this.healthBarBackground.setDepth(3);
    
    // Health bar foreground (green)
    this.healthBar = this.scene.add.graphics();
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(0, 0, 60, 8);
    this.healthBar.setDepth(4);
    
    // Update health bar position
    this.updateHealthBarPosition();
  }
  
  updateHealthBarPosition() {
    if (!this.healthBar || !this.healthBarBackground || !this.sprite) return;
    
    // Position the health bar above the enemy
    const barX = this.sprite.x - 30; // Center the 60px width bar
    const barY = this.sprite.y - 60; // Position above head
    
    this.healthBarBackground.setPosition(barX, barY);
    this.healthBar.setPosition(barX, barY);
  }
  
  updateHealthBar() {
    if (!this.healthBar || !this.enemyData) return;
    
    // Clear previous graphics
    this.healthBar.clear();
    
    // Calculate width based on current health
    const healthPercentage = this.enemyData.lives / this.enemyData.maxLives;
    const barWidth = 60 * healthPercentage;
    
    // Draw new health bar
    this.healthBar.fillStyle(0x00ff00, 1);
    this.healthBar.fillRect(0, 0, barWidth, 8);
    
    // Update position
    this.updateHealthBarPosition();
  }
  
  update(player) {
    if (!this.sprite || !this.sprite.active || !player || !player.sprite) return;
    
    // Skip updates if game is paused or enemy is dying
    if ((this.scene.gameState && this.scene.gameState.isPaused) || this.enemyData.isDying) return;
    
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
    
    // Update health bar position if enabled
    if (this.enemyData.showHealthBar) {
      this.updateHealthBarPosition();
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
    
    // Get the correct animation keys based on enemy type
    const idleAnim = this.isSpecialBoss ? 'hulk-idle' : 'enemy-idle';
    const runningAnim = this.isSpecialBoss ? 'hulk-running' : 'enemy-running';
    
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
      
      // Define punch range for Hulk (shorter than vision range)
      const punchRange = this.isSpecialBoss ? 100 : 0;
      
      // Check if it's time to attack (shoot or punch)
      const currentTime = this.scene.time.now;
      if (currentTime > this.lastShootTime + this.shootCooldown && !this.isShooting) {
        // If special boss (Hulk), only attack if in punch range
        if (!this.isSpecialBoss || (this.isSpecialBoss && distanceToPlayer <= punchRange)) {
          // Attack player (shoot for regular enemies, punch for Hulk)
          this.shoot();
        } else if (!this.isShooting) {
          // Not in punch range for Hulk or not shooting for regular enemies
          // Check if moving would exceed boundaries
          const newX = this.sprite.x + (directionToPlayer * this.followSpeed * 0.016); // approx one frame movement
          
          // Only move if within boundaries
          if (newX >= this.leftBoundary && newX <= this.rightBoundary) {
            // Move towards player if not shooting and within boundaries
            this.sprite.setVelocityX(directionToPlayer * this.followSpeed);
            
            // Play running animation
            if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== runningAnim) {
              this.sprite.anims.play(runningAnim, true);
            }
          } else {
            // Stop at boundary
            this.sprite.setVelocityX(0);
            
            // Play idle animation when hitting boundary
            if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== idleAnim) {
              this.sprite.anims.play(idleAnim, true);
            }
          }
        }
      } else if (!this.isShooting) {
        // Check if moving would exceed boundaries
        const newX = this.sprite.x + (directionToPlayer * this.followSpeed * 0.016); // approx one frame movement
        
        // Only move if within boundaries
        if (newX >= this.leftBoundary && newX <= this.rightBoundary) {
          // Move towards player if not shooting and within boundaries
          this.sprite.setVelocityX(directionToPlayer * this.followSpeed);
          
          // Play running animation
          if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== runningAnim) {
            this.sprite.anims.play(runningAnim, true);
          }
        } else {
          // Stop at boundary
          this.sprite.setVelocityX(0);
          
          // Play idle animation when hitting boundary
          if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== idleAnim) {
            this.sprite.anims.play(idleAnim, true);
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
        if (this.sprite.anims && this.sprite.anims.currentAnim && this.sprite.anims.currentAnim.key !== runningAnim) {
          this.sprite.anims.play(runningAnim, true);
        }
      } else {
        // At home position, stop and play idle
        this.sprite.setVelocityX(0);
        
        // Ensure we reset to idle animation when home
        if (this.sprite.anims && this.sprite.anims.currentAnim && 
            this.sprite.anims.currentAnim.key !== idleAnim && !this.isShooting) {
          this.sprite.anims.play(idleAnim, true);
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
    
    // Play shooting animation based on enemy type
    if (this.sprite && this.sprite.anims) {
      const shootAnim = this.isSpecialBoss ? 'hulk-punching' : 'enemy-shooting';
      this.sprite.anims.play(shootAnim, true);
      
      // Auto-reset shooting state after animation completes
      this.scene.time.delayedCall(400, () => {
        this.isShooting = false;
      });
    }
    
    // Handle Hulk's punch attack differently than regular enemies' shooting
    if (this.isSpecialBoss) {
      // Check if player is in punching range (closer than normal shooting)
      const player = this.scene.player;
      if (player && player.sprite && player.sprite.active) {
        const distanceToPlayer = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          player.sprite.x, player.sprite.y
        );
        
        // Punching range is shorter than shooting range (100 pixels)
        if (distanceToPlayer <= 100) {
          // Deal 2 lives of damage with punch
          player.loseLife(2);
          
          // Update HUD lives display if the method exists
          if (this.scene.updateLivesDisplay) {
            this.scene.updateLivesDisplay();
          }
        }
      }
      return; // Hulk doesn't shoot, so exit early
    }
    
    // Get enemy bullets group from scene
    const enemyBullets = this.scene.enemyBullets;
    if (!enemyBullets) {
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
          return;
        }
        
        // If bullet collides with platforms/walls, destroy it
        this.scene.physics.add.collider(bullet, this.scene.groundPlatforms, (bulletSprite) => {
          if (bulletSprite && bulletSprite.active) {
            bulletSprite.destroy();
          }
        });
      } catch (error) {
        console.error('Error creating bullet:', error);
        this.isShooting = false;
      }
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
    // Clean up health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }
    
    if (this.healthBarBackground) {
      this.healthBarBackground.destroy();
      this.healthBarBackground = null;
    }
    
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
    
    // Update health bar if enabled
    if (this.enemyData.showHealthBar) {
      this.updateHealthBar();
    }
    
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
    // For Hulk (special boss), play death animation instead of immediately destroying
    if (this.isSpecialBoss && this.sprite && this.sprite.active) {
      // Stop any movement
      this.sprite.setVelocity(0, 0);
      
      // Play death animation - the cleanup will happen after animation completes
      this.sprite.anims.play('hulk-death', true);
      
      // Disable enemy behavior during death animation
      this.enemyData.isDying = true;
      
      // Trigger victory scene after a short delay
      if (this.scene && this.scene.victory) {
        this.scene.time.delayedCall(500, () => {
          this.scene.victory();
        });
      }
    } else {
      // For regular enemies, immediately clean up
      this.finalCleanup();
    }
  }
  
  /**
   * Final cleanup after death (immediately for regular enemies, after animation for Hulk)
   */
  finalCleanup() {
    // Destroy health bar if it exists
    if (this.healthBar) {
      this.healthBar.destroy();
      this.healthBar = null;
    }
    
    if (this.healthBarBackground) {
      this.healthBarBackground.destroy();
      this.healthBarBackground = null;
    }
    
    // Drop a heart with 50% chance, but only for regular enemies (not for Hulk)
    if (!this.isSpecialBoss && Math.random() < 0.5 && this.scene && this.sprite) {
      try {
        // Create heart pickup and add to scene
        new HeartPickup(this.scene, this.sprite.x, this.sprite.y, this.scene.player);
      } catch (error) {
        console.error("Error creating heart pickup:", error);
      }
    }
    
    // Destroy the enemy
    this.destroy();
  }
}

export default Enemy; 