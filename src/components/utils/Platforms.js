import Phaser from 'phaser';

class Platforms {
  constructor(scene) {
    this.scene = scene;
    this.platforms = scene.physics.add.staticGroup();
  }
  
  setupGround() {
    // Clear existing platforms
    this.platforms.clear(true, true);
    
    // Get world dimensions
    const bgWidth = this.scene.physics.world.bounds.width;
    const bgHeight = this.scene.physics.world.bounds.height;
    
    // Create a platform that spans the entire background width at the very bottom
    const platformHeight = 20;
    // Move the platform to the absolute bottom of the screen to prevent characters from starting inside it
    const platformY = bgHeight - (platformHeight / 2);
    
    // Store these values for reference by other components
    this.groundPlatformY = platformY;
    this.groundPlatformHeight = platformHeight;
    
    // Create the ground platform
    const platform = this.platforms.create(bgWidth / 2, platformY, null);
    platform.setVisible(false); // Invisible platform
    platform.setDisplaySize(bgWidth, platformHeight);
    platform.refreshBody();
    
    return this.platforms;
  }
  
  addPlatform(x, y, width, height, visible = false) {
    const platform = this.platforms.create(x, y, null);
    platform.setVisible(visible);
    platform.setDisplaySize(width, height);
    platform.refreshBody();
    return platform;
  }
  
  addPlayerCollider(player) {
    if (player && player.sprite) {
      return this.scene.physics.add.collider(player.sprite, this.platforms);
    }
    return null;
  }
  
  addEnemyCollider(enemies) {
    if (enemies) {
      return this.scene.physics.add.collider(enemies, this.platforms);
    }
    return null;
  }
  
  addPickupCollider(pickup) {
    if (pickup && pickup.sprite) {
      return this.scene.physics.add.collider(pickup.sprite, this.platforms);
    }
    return null;
  }
  
  destroy() {
    if (this.platforms) {
      this.platforms.clear(true, true);
    }
  }
}

export default Platforms; 