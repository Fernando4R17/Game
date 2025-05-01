class Player {
  /**
   * Static method to preload all player assets
   * @param {Phaser.Scene} scene - The scene to load assets into
   */
  static preloadAssets(scene) {
    // Load player sprites
    scene.load.spritesheet('ironman-idle', 
      '/assets/characters/Player/Iron-idle.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 2 }
    );
    
    scene.load.spritesheet('ironman-running', 
      '/assets/characters/Player/Iron-running.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    scene.load.spritesheet('ironman-shooting', 
      '/assets/characters/Player/Iron-shooting.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    scene.load.spritesheet('ironman-death', 
      '/assets/characters/Player/Iron-death.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 2 }
    );
    
    // Load projectile
    scene.load.image('blast', '/assets/objects/blast.png');
  }

  constructor(scene, x, y) {
    this.scene = scene;
    
    // Player data storage
    this.playerData = {
      lives: 5,
      maxLives: 5,
      isMoving: false,
      isShooting: false,
      isJumping: false,
      maxJumpHeight: 250,
      jumpSpeed: 300,
      moveSpeed: 160,
      airSpeed: 100,
      isPlayingDeathAnimation: false,
      isGameOver: false,
      facingLeft: false,
      lastShootTime: 0,
      shootCooldown: 400, // milliseconds
      isInvulnerable: false,
      invulnerableUntil: 0
    };
    
    this.create(x, y);
  }
  
  create(x, y) {
    // Create player character
    this.sprite = this.scene.physics.add.sprite(x, y, 'ironman-idle');
    
    if (this.sprite) {
      // Set character scale
      this.sprite.setScale(1.8);
      this.sprite.setDepth(10);
      this.sprite.setCollideWorldBounds(true);
      
      // Set body size to match actual visual character but not extend into ground
      this.sprite.body.setSize(this.sprite.width * 0.5, this.sprite.height * 0.8, true);
      this.sprite.body.setOffset(this.sprite.width * 0.25, this.sprite.height * 0.05);
      
      // Add gravity to ensure player lands on platforms
      this.sprite.body.setGravityY(300);
      
      // Create animations if they don't exist yet
      this.createAnimations();
      
      // Play the idle animation initially
      this.sprite.anims.play('idle', true);
      
      // Listen for animation complete events
      this.sprite.on('animationcomplete-death', () => {
        this.playerData.isPlayingDeathAnimation = false;
        this.playerData.isGameOver = true;
        
        // Force Game Over to appear by calling the scene's gameOver method
        if (this.scene && this.scene.gameOver) {
          this.scene.gameOver();
        }
      });
      
      this.sprite.on('animationcomplete-shoot', () => {
        this.playerData.isShooting = false;
        // Return to idle or running animation based on movement
        if (this.playerData.isMoving) {
          this.sprite.anims.play('running', true);
        } else {
          this.sprite.anims.play('idle', true);
        }
      });
    }
  }
  
  createAnimations() {
    const scene = this.scene;
    
    // Idle animation
    scene.anims.create({
      key: 'idle',
      frames: scene.anims.generateFrameNumbers('ironman-idle', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });
    
    // Running animation
    scene.anims.create({
      key: 'running',
      frames: scene.anims.generateFrameNumbers('ironman-running', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: -1
    });
    
    // Shooting animation
    scene.anims.create({
      key: 'shoot',
      frames: scene.anims.generateFrameNumbers('ironman-shooting', { start: 0, end: 1 }),
      frameRate: 12,
      repeat: 0
    });
    
    // Death animation
    scene.anims.create({
      key: 'death',
      frames: scene.anims.generateFrameNumbers('ironman-death', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: 0
    });
  }
  
  /**
   * Make the player temporarily invulnerable to prevent repeated damage
   * @param {number} duration Time in milliseconds to stay invulnerable
   */
  makeInvulnerable(duration = 1000) {
    this.playerData.isInvulnerable = true;
    this.playerData.invulnerableUntil = this.scene.time.now + duration;
    
    // Visual indicator of invulnerability - flashing effect
    if (this.sprite && this.sprite.active) {
      // Stop any existing flash effect
      if (this.invulnerabilityTween) {
        this.invulnerabilityTween.stop();
        this.sprite.alpha = 1;
        this.sprite.clearTint();
      }
      
      // Create a new flashing effect
      this.invulnerabilityTween = this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.5, to: 1 },
        duration: 100,
        repeat: Math.floor(duration / 200) - 1, // Reduce repeats to avoid overlap
        yoyo: true,
        onComplete: () => {
          if (this.sprite && this.sprite.active) {
            this.sprite.alpha = 1; // Ensure full opacity at the end
            this.sprite.clearTint(); // Also clear any tint
          }
        }
      });
    }
  }
  
  update(keys) {
    // Skip all player movement updates if game is paused or player is dead
    if (this.playerData.isGameOver || this.playerData.isPlayingDeathAnimation) return;
    
    // Check if keys object exists
    if (!keys) return;
    
    // Update invulnerability status
    if (this.playerData.isInvulnerable && this.scene.time.now > this.playerData.invulnerableUntil) {
      this.playerData.isInvulnerable = false;
      
      // Make sure we completely reset visual effects
      if (this.invulnerabilityTween) {
        this.invulnerabilityTween.stop();
      }
      
      // Double-check sprite is fully visible and untinted
      if (this.sprite && this.sprite.active) {
        this.sprite.alpha = 1;
        this.sprite.clearTint();
      }
    }
    
    // Movement speed
    const speed = 150;
    
    // Jump power
    const jumpPower = 300;
    
    // Check if the player is touching the ground
    const onGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
    
    // If player just landed, ensure they're exactly at the right height
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
    
    // Reset velocity (horizontal) - don't prevent movement during shooting
    this.sprite.setVelocityX(0);
    
    // Handle jumping separately to ensure it gets priority
    // Jump (W) - only allow jumping if on the ground
    if (keys.w && keys.w.isDown && onGround) {
      this.sprite.setVelocityY(-jumpPower);
    }
    
    // Process movement and animations
    // Move left (A)
    if (keys.a && keys.a.isDown) {
      this.sprite.setVelocityX(-speed);
      this.sprite.setFlipX(true); // Flip the sprite horizontally
      this.playerData.facingLeft = true;
      this.playerData.isMoving = true;
      
      // Force running animation when moving on ground if not shooting
      if (onGround && !this.playerData.isShooting && this.sprite.anims.currentAnim.key !== 'running') {
        this.sprite.anims.play('running', true);
      }
      // When in air but moving, we should show running animation too if not shooting
      else if (!onGround && !this.playerData.isShooting && this.sprite.anims.currentAnim.key !== 'running') {
        // Only change to running if we're not already playing it
        this.sprite.anims.play('running', true);
      }
    }
    // Move right (D)
    else if (keys.d && keys.d.isDown) {
      this.sprite.setVelocityX(speed);
      this.sprite.setFlipX(false); // Reset the sprite flip
      this.playerData.facingLeft = false;
      this.playerData.isMoving = true;
      
      // Force running animation when moving on ground if not shooting
      if (onGround && !this.playerData.isShooting && this.sprite.anims.currentAnim.key !== 'running') {
        this.sprite.anims.play('running', true);
      }
      // When in air but moving, we should show running animation too if not shooting
      else if (!onGround && !this.playerData.isShooting && this.sprite.anims.currentAnim.key !== 'running') {
        this.sprite.anims.play('running', true);
      }
    }
    // Idle when not moving and on ground
    else {
      this.playerData.isMoving = false;
      
      if (onGround && !this.playerData.isShooting) {
        // Only change to idle if we're not already playing it and not moving
        if (this.sprite.anims.currentAnim.key !== 'idle' && 
            Math.abs(this.sprite.body.velocity.x) < 10) {
          this.sprite.anims.play('idle', true);
        }
      }
    }
  }
  
  shoot(bulletGroup) {
    // Skip if already shooting or dead
    if (this.playerData.isShooting || this.playerData.isGameOver || this.playerData.isPlayingDeathAnimation) {
      return;
    }
    
    // Skip if the scene or bullet group is not valid
    if (!this.scene || !bulletGroup) return;
    
    // Check cooldown
    const currentTime = this.scene.time.now;
    if (currentTime < this.playerData.lastShootTime + this.playerData.shootCooldown) {
      return; // Still in cooldown
    }
    
    // Set shooting state and reset cooldown
    this.playerData.isShooting = true;
    this.playerData.lastShootTime = currentTime;
    
    // Play shooting animation
    this.sprite.anims.play('shoot', true);
    
    // Create a bullet
    try {
      const bullet = bulletGroup.get();
      if (bullet) {
        const direction = this.playerData.facingLeft ? -1 : 1;
        const offsetX = direction * 20; // Offset to start bullet from gun position
        
        bullet.enableBody(true, this.sprite.x + offsetX, this.sprite.y, true, true);
        bullet.setVelocityX(direction * 600); // Fast bullet
        bullet.setVelocityY(0);
        
        // Auto-remove bullets that go off screen
        bullet.checkWorldBounds = true;
        bullet.outOfBoundsKill = true;
      }
    } catch (error) {
      console.error("Error creating bullet:", error);
      // Reset shooting state if bullet creation failed
      this.playerData.isShooting = false;
    }
  }
  
  loseLife(amount = 1) {
    // Skip if already in death animation or game over
    if (this.playerData.isPlayingDeathAnimation || this.playerData.isGameOver) {
      return;
    }
    
    // Skip if invulnerable
    if (this.playerData.isInvulnerable) {
      return;
    }
    
    // Reduce lives by the amount (default 1)
    this.playerData.lives -= amount;
    
    // Create initial hit flash effect (shorter than invulnerability period)
    if (this.sprite && this.sprite.active) {
      // Make flash effect shorter to avoid conflict with invulnerability effect
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.3,
        tint: 0xff0000,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          if (this.sprite && this.sprite.active) {
            this.sprite.clearTint(); // Clear tint after effect
            // Don't set alpha here, let invulnerability tween handle it
          }
        }
      });
      
      // Apply a small upward knockback to prevent falling through floor
      // This gives player a small hop when hit
      this.sprite.setVelocityY(-150);
      
      // Ensure player position doesn't go below ground
      this.resetToGround(false);
      
      // Add a slight delay to check ground position again (after physics update)
      if (this.scene && this.scene.time) {
        this.scene.time.delayedCall(100, () => {
          this.resetToGround(true);
        });
      }
    }
    
    // Make invulnerable briefly (reduced from 1500ms)
    this.makeInvulnerable(800);
    
    // Check for game over - ensure lives don't go below 0
    if (this.playerData.lives <= 0) {
      this.playerData.lives = 0;
      this.die();
    }
  }
  
  /**
   * Reset player to proper ground level if they're below it
   * @param {boolean} forceReset - Whether to force reset even if not below ground
   */
  resetToGround(forceReset = false) {
    if (!this.sprite || !this.sprite.active) return;
    
    // Calculate the proper ground level
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
    
    // Check if player is below ground level or force reset is enabled
    if (forceReset || this.sprite.y > groundLevel) {
      // Reset to ground level
      this.sprite.y = groundLevel;
      
      // Stop any downward velocity to prevent falling again
      if (this.sprite.body.velocity.y > 0) {
        this.sprite.body.velocity.y = 0;
      }
    }
  }
  
  die() {
    if (!this.playerData.isPlayingDeathAnimation && !this.playerData.isGameOver) {
      // Set death animation flag
      this.playerData.isPlayingDeathAnimation = true;
      
      // Stop any movement
      if (this.sprite && this.sprite.body) {
        this.sprite.body.setVelocity(0, 0);
      }
      
      // Play death animation
      if (this.sprite && this.sprite.anims) {
        this.sprite.anims.play('death', true);
      }
    }
  }
  
  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}

export default Player; 