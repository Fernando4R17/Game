import Phaser from 'phaser';

class HeartPickup {
  constructor(scene, x, y, player) {
    this.scene = scene;
    this.player = player;
    this.create(x, y);
  }
  
  create(x, y) {
    try {
      // Create a heart sprite
      this.sprite = this.scene.physics.add.sprite(x, y, 'heart');
      
      if (!this.sprite) {
        console.error("Failed to create heart sprite");
        return;
      }
      
      // Set properties - increased scale for visibility
      this.sprite.setScale(1.5);
      this.sprite.setDepth(1);
      this.sprite.setBounce(0.2);
      this.sprite.setCollideWorldBounds(true);
      
      // Apply gravity with minimal horizontal velocity for initial drop
      if (this.sprite.body) {
        this.sprite.body.setGravityY(300);
        // Small initial vertical velocity for a small hop, no horizontal velocity
        this.sprite.setVelocity(0, -100);
      }
      
      // Add subtle pulsing animation
      if (this.scene && this.scene.tweens) {
        this.pulseAnimation = this.scene.tweens.add({
          targets: this.sprite,
          scale: { from: 1.5, to: 1.8 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      
      // Add collision with ground to stop movement
      if (this.scene && this.scene.groundPlatforms && this.scene.physics) {
        this.groundCollider = this.scene.physics.add.collider(this.sprite, this.scene.groundPlatforms, (heart) => {
          if (heart && heart.active) {
            // Once the heart collides with the ground, stop horizontal movement
            heart.setVelocityX(0);
            // Reduce bounce further after first landing
            heart.setBounce(0);
          }
        });
      }
      
      // Add overlap with player to collect
      if (this.scene && this.player && this.player.sprite && this.scene.physics) {
        this.playerCollider = this.scene.physics.add.overlap(this.player.sprite, this.sprite, this.collect, null, this);
      }
      
      // Set timeout for automatic destruction if not collected
      if (this.scene && this.scene.time) {
        this.destroyTimer = this.scene.time.delayedCall(10000, this.fadeOut, [], this);
      }
    } catch (error) {
      console.error("Error creating heart pickup:", error);
      this.destroy();
    }
  }
  
  collect() {
    try {
      // Check if we already collected this heart to prevent double collection
      if (!this.sprite || !this.sprite.active) {
        return;
      }
      
      // Only collect if player exists and is not at max health
      if (!this.player || !this.player.playerData) {
        this.destroy();
        return;
      }
      
      // Only collect if player is not at max health
      if (this.player.playerData.lives < this.player.playerData.maxLives) {
        // Restore one life
        this.player.playerData.lives++;
        
        // Update the HUD if it exists
        if (this.scene && typeof this.scene.updateLivesDisplay === 'function') {
          this.scene.updateLivesDisplay();
        }
        
        // Remove the player collider immediately to prevent multiple collections
        if (this.playerCollider) {
          try {
            if (typeof this.playerCollider.destroy === 'function') {
              this.playerCollider.destroy();
            } else if (this.scene && this.scene.physics && typeof this.scene.physics.world.removeCollider === 'function') {
              this.scene.physics.world.removeCollider(this.playerCollider);
            }
            // Set to null to prevent future access
            this.playerCollider = null;
          } catch (error) {
            console.error("Error removing player collider during collection:", error);
          }
        }
        
        // Play collection effect
        if (this.scene && this.scene.tweens && this.sprite && this.sprite.active) {
          this.scene.tweens.add({
            targets: this.sprite,
            scale: 3,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              this.destroy();
            }
          });
        } else {
          // If tweens not available, just destroy directly
          this.destroy();
        }
      } else {
        // Can't collect if already at max health, just make it hop in place
        if (this.sprite && this.sprite.active) {
          this.sprite.setVelocityY(-100);
          this.sprite.setVelocityX(0); // Keep it in place horizontally
        }
      }
    } catch (error) {
      console.error("Error in heart pickup collection:", error);
      // If any error occurs, clean up to prevent further issues
      this.destroy();
    }
  }
  
  fadeOut() {
    try {
      if (!this.sprite || !this.sprite.active) {
        this.destroy();
        return;
      }
      
      if (this.scene && this.scene.tweens) {
        this.scene.tweens.add({
          targets: this.sprite,
          alpha: 0,
          scale: 0.5,
          duration: 300,
          onComplete: () => {
            this.destroy();
          }
        });
      } else {
        // If tweens not available, just destroy directly
        this.destroy();
      }
    } catch (error) {
      console.error("Error in heart pickup fadeOut:", error);
      this.destroy();
    }
  }
  
  destroy() {
    // Remove any active timers
    if (this.destroyTimer && this.destroyTimer.remove) {
      try {
        this.destroyTimer.remove();
      } catch (error) {
        console.error("Error removing destroy timer:", error);
      }
    }
    
    // Stop animations
    if (this.pulseAnimation && this.pulseAnimation.stop) {
      try {
        this.pulseAnimation.stop();
      } catch (error) {
        console.error("Error stopping pulse animation:", error);
      }
    }
    
    // Remove colliders - with proper null and function existence checks
    try {
      if (this.groundCollider) {
        if (typeof this.groundCollider.destroy === 'function') {
          this.groundCollider.destroy();
        } else if (this.scene && this.scene.physics && typeof this.scene.physics.world.removeCollider === 'function') {
          this.scene.physics.world.removeCollider(this.groundCollider);
        }
      }
    } catch (error) {
      console.error("Error removing ground collider:", error);
    }
    
    try {
      if (this.playerCollider) {
        if (typeof this.playerCollider.destroy === 'function') {
          this.playerCollider.destroy();
        } else if (this.scene && this.scene.physics && typeof this.scene.physics.world.removeCollider === 'function') {
          this.scene.physics.world.removeCollider(this.playerCollider);
        }
      }
    } catch (error) {
      console.error("Error removing player collider:", error);
    }
    
    // Destroy the sprite
    if (this.sprite) {
      try {
        if (typeof this.sprite.destroy === 'function') {
          this.sprite.destroy();
        }
      } catch (error) {
        console.error("Error destroying heart sprite:", error);
      }
    }
  }
}

export default HeartPickup; 