import Phaser from 'phaser';

class HUD {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    // Create a group for lives display
    this.livesGroup = this.scene.add.group();
    this.heartSprites = []; // Store references to all heart sprites
    
    // Create the HUD container - fixed to the camera
    this.container = this.scene.add.container(10, 10);
    this.container.setScrollFactor(0); // Fix to camera
    this.container.setDepth(10); // Make sure it's on top
    
    // Add lives text
    this.livesText = this.scene.add.text(0, 0, 'LIVES:', { 
      fontSize: '24px', 
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    this.container.add(this.livesText);
    
    // Create initial hearts display
    this.createHearts();
    this.updateLives();
  }
  
  createHearts() {
    // Clear any existing hearts first
    this.livesGroup.clear(true, true);
    this.heartSprites = [];
    
    if (!this.player) return;
    
    // Calculate heart positions
    const heartSpacing = 25; // Slightly reduced spacing for 5 hearts
    const heartStartX = this.livesText.width + 30; // Start position after text
    const heartY = 20; // Vertical position of hearts
    
    // Create all hearts initially - we'll update their appearance based on current lives
    for (let i = 0; i < this.player.playerData.maxLives; i++) {
      const heart = this.scene.add.image(
        heartStartX + (i * heartSpacing),
        heartY,
        'heart'
      );
      
      // Set appropriate scale
      const heartScale = 1.3; // Slightly smaller hearts for better fit
      heart.setScale(heartScale);
      heart.setScrollFactor(0); // Fix to camera
      heart.setDepth(10);
      
      // Add a subtle pulse animation to the hearts
      this.scene.tweens.add({
        targets: heart,
        scale: { from: heartScale, to: heartScale * 1.1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      this.livesGroup.add(heart);
      this.heartSprites.push(heart); // Store reference
    }
  }
  
  updateLives() {
    if (!this.player || !this.heartSprites) return;
    
    // Update heart appearances based on current lives
    for (let i = 0; i < this.heartSprites.length; i++) {
      const heart = this.heartSprites[i];
      
      if (i < this.player.playerData.lives) {
        // Active heart
        heart.setAlpha(1);
        heart.clearTint();
      } else {
        // Inactive/gray heart
        heart.setAlpha(0.5);
        heart.setTint(0x666666);
      }
    }
  }
  
  showGameOver() {
    // Check if game over text already exists
    if (this.gameOverText) {
      return;
    }
    
    try {
      // Create game over text
      this.gameOverText = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 - 50,
        'GAME OVER',
        {
          fontFamily: 'Arial',
          fontSize: '48px',
          color: '#ff0000',
          stroke: '#000000',
          strokeThickness: 6
        }
      );
      this.gameOverText.setOrigin(0.5);
      this.gameOverText.setScrollFactor(0);
      this.gameOverText.setDepth(10);
      
      // Create restart instruction text
      this.restartText = this.scene.add.text(
        this.scene.cameras.main.width / 2,
        this.scene.cameras.main.height / 2 + 20,
        'Press ENTER to return to Main Menu',
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4
        }
      );
      this.restartText.setOrigin(0.5);
      this.restartText.setScrollFactor(0);
      this.restartText.setDepth(10);
    } catch (error) {
      console.error("Error showing game over:", error);
    }
  }
  
  hideGameOver() {
    if (this.gameOverText) {
      this.gameOverText.destroy();
      this.gameOverText = null;
    }
    
    if (this.restartText) {
      this.restartText.destroy();
      this.restartText = null;
    }
  }
  
  destroy() {
    // Clear lives group
    if (this.livesGroup) {
      this.livesGroup.clear(true, true);
    }
    
    // Destroy HUD container
    if (this.container) {
      this.container.destroy();
    }
    
    // Clear heart sprites array
    this.heartSprites = [];
    
    // Hide game over text if shown
    this.hideGameOver();
  }
}

export default HUD; 