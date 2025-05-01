import Phaser from 'phaser';
import Enemy from './Enemy';
import HeartPickup from './HeartPickup';

class EnemyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];
    this.group = scene.physics.add.group({
      allowGravity: true, // Ensure enemies have gravity
      collideWorldBounds: true // Ensure enemies stay within world bounds
    });
    
    // Create enemy bullets group and make it accessible directly from the scene
    this.enemyBullets = scene.physics.add.group({
      defaultKey: 'enemyblast',
      maxSize: 50, // Increase max size to allow more bullets
      createCallback: (bullet) => {
        // Make sure each new enemy bullet is green
        bullet.setTint(0x00ff00);
      }
    });
    
    // Assign the bullets to the scene so Enemy instances can access it
    scene.enemyBullets = this.enemyBullets;
    
    // Pre-create some bullets to ensure they're ready
    for (let i = 0; i < 20; i++) {
      const bullet = this.enemyBullets.create(-100, -100, 'enemyblast');
      bullet.setTint(0x00ff00);
      bullet.setActive(false);
      bullet.setVisible(false);
    }
  }
  
  createEnemy(x, y, leftBoundary, rightBoundary, isSpecialBoss = false) {
    const enemy = new Enemy(this.scene, x, y, leftBoundary, rightBoundary, isSpecialBoss);
    this.enemies.push(enemy);
    this.group.add(enemy.sprite);
    
    // Ensure enemy has proper collision with ground
    if (this.scene.groundPlatforms) {
      this.scene.physics.add.collider(enemy.sprite, this.scene.groundPlatforms);
    }
    
    return enemy;
  }
  
  setupEnemies(positions) {
    // Clear any existing enemies
    this.clearEnemies();
    
    // Create enemies at the specified positions
    positions.forEach(pos => {
      this.createEnemy(pos.x, pos.y, pos.leftBoundary, pos.rightBoundary);
    });
    
    return this.enemies;
  }
  
  update() {
    this.enemies.forEach(enemy => {
      if (enemy && enemy.sprite && enemy.sprite.active) {
        enemy.update(this.player);
      }
    });
  }
  
  setupBulletCollisions(player) {
    if (player && player.sprite && this.scene && this.scene.physics && this.enemyBullets) {
      // Add collision between player and enemy bullets
      try {
        this.scene.physics.add.overlap(player.sprite, this.enemyBullets, (playerSprite, bullet) => {
          // Player gets hit by enemy bullet
          if (bullet && bullet.active) {
            bullet.destroy();
          }
          
          if (player && typeof player.loseLife === 'function') {
            player.loseLife();
            
            // Update HUD
            if (this.scene && typeof this.scene.updateLivesDisplay === 'function') {
              this.scene.updateLivesDisplay();
            }
          }
        }, null, this.scene);
      } catch (error) {
        console.error("Error setting up enemy bullet collisions:", error);
      }
    }
  }
  
  setupPlayerBulletCollisions(playerBullets) {
    if (playerBullets) {
      // Add collision between player bullets and enemies
      try {
        // Check if the bullets group has a size property before attempting to use it
        if (!playerBullets.getLength && !playerBullets.size && typeof playerBullets.getChildren !== 'function') {
          console.error("Warning: playerBullets group does not have expected properties");
          return;
        }
        
        this.scene.physics.add.overlap(playerBullets, this.group, (bullet, enemySprite) => {
          try {
            // Find the enemy that was hit
            const enemy = this.findEnemyBySprite(enemySprite);
            
            // Destroy the bullet
            if (bullet && bullet.active) {
              bullet.destroy();
            }
            
            if (enemy) {
              // Instead of destroying enemy, make it lose a life
              enemy.loseLife(1);
            } else if (enemySprite && enemySprite.active) {
              // Fallback if we can't find the enemy object
              enemySprite.destroy();
            }
          } catch (error) {
            console.error("Error in bullet-enemy collision handling:", error);
          }
        }, null, this.scene);
      } catch (error) {
        console.error("Error setting up player bullet collisions:", error);
      }
    }
  }
  
  findEnemyBySprite(sprite) {
    if (!sprite) return null;
    
    // First try to get the reference from the sprite itself
    if (sprite.enemyComponent) {
      return sprite.enemyComponent;
    }
    
    // If that fails, search through our enemies array
    return this.enemies.find(enemy => enemy.sprite === sprite);
  }
  
  removeEnemy(enemy) {
    // Remove from array
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
    
    // Destroy the enemy
    enemy.destroy();
  }
  
  clearEnemies() {
    try {
      // Destroy all enemies
      if (this.enemies && this.enemies.length > 0) {
        // Create a copy of the array to avoid modification during iteration
        const enemiesToDestroy = [...this.enemies];
        
        enemiesToDestroy.forEach(enemy => {
          if (enemy) {
            try {
              enemy.destroy();
            } catch (error) {
              console.error("Error destroying enemy:", error);
            }
          }
        });
      }
      
      // Clear the array
      this.enemies = [];
      
      // Clear the group
      if (this.group) {
        try {
          if (typeof this.group.clear === 'function') {
            this.group.clear(true, true);
          }
        } catch (error) {
          console.error("Error clearing enemy group:", error);
        }
      }
      
      // Clear bullets - with better error handling
      if (this.enemyBullets) {
        try {
          if (typeof this.enemyBullets.clear === 'function' && 
              typeof this.enemyBullets.getChildren === 'function') {
            
            // First destroy each bullet individually (safer approach)
            const bullets = this.enemyBullets.getChildren();
            bullets.forEach(bullet => {
              if (bullet && bullet.active) {
                bullet.destroy();
              }
            });
            
            // Then clear the group
            this.enemyBullets.clear(true, true);
          }
        } catch (error) {
          console.error("Error clearing enemy bullets:", error);
          // Just set the bullets to null to prevent further errors
          this.enemyBullets = null;
        }
      }
    } catch (error) {
      console.error("Error in clearEnemies:", error);
    }
  }
  
  destroy() {
    try {
      // Clear and destroy all enemies
      this.clearEnemies();
      
      // Safely destroy enemy bullets group
      if (this.enemyBullets) {
        try {
          // Check if methods exist before calling
          if (typeof this.enemyBullets.clear === 'function') {
            try {
              // First destroy each bullet individually
              const bullets = this.enemyBullets.getChildren();
              bullets.forEach(bullet => {
                if (bullet && bullet.active) {
                  bullet.destroy();
                }
              });
            } catch (err) {
              // Ignore errors when getting children
            }
            
            // Then clear the group
            this.enemyBullets.clear(true, true);
          }
          
          // Then destroy the group if possible
          if (typeof this.enemyBullets.destroy === 'function') {
            this.enemyBullets.destroy();
          }
          
          // Remove the reference from scene
          if (this.scene) {
            this.scene.enemyBullets = null;
          }
          
          // Finally null the reference
          this.enemyBullets = null;
        } catch (error) {
          console.error("Error destroying enemy bullets:", error);
          // Ensure it's set to null even if an error occurred
          if (this.scene) {
            this.scene.enemyBullets = null;
          }
          this.enemyBullets = null;
        }
      }
      
      // Safely destroy enemy group
      if (this.group) {
        try {
          // Check if methods exist before calling
          if (typeof this.group.clear === 'function') {
            // First clear the group
            this.group.clear(true, true);
          }
          
          // Then destroy the group if possible
          if (typeof this.group.destroy === 'function') {
            this.group.destroy();
          }
          
          // Finally null the reference
          this.group = null;
        } catch (error) {
          console.error("Error destroying enemy group:", error);
          this.group = null;
        }
      }
    } catch (error) {
      console.error("Error in EnemyManager destroy:", error);
    }
  }
}

export default EnemyManager; 