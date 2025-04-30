import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// Import our modular components
import Player from './entities/Player';
import EnemyManager from './entities/EnemyManager';
import HeartPickup from './entities/HeartPickup';
import Platforms from './utils/Platforms';
import HUD from './ui/HUD';
import Menu from './ui/Menu';

function Game() {
  const gameContainerRef = useRef(null);
  
  useEffect(() => {
    // Define game configuration
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 350 }, 
          debug: true // Set to true to see collision boundaries
        }
      },
      scene: MainScene
    };
    
    // Initialize the game
    const game = new Phaser.Game(config);
    
    // Cleanup function
    return () => {
      game.destroy(true);
    };
  }, []);
  
  return (
    <div>
      <div ref={gameContainerRef} />
    </div>
  );
}

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    
    // Game state
    this.gameState = {
      inStartMenu: true,
      isPaused: false,
      inPauseMenu: false
    };
    
    // Track visual effects
    this.flashEffects = [];
  }
  
  preload() {
    // Load background
    this.load.image('background', '/assets/background/background.png');
    
    // Load heart image
    this.load.image('heart', '/assets/objects/Heart.png');
    
    // Load projectiles
    this.load.image('blast', '/assets/objects/blast.png');
    this.load.image('enemyblast', '/assets/objects/enemyblast.png');
    
    // Load player sprites
    this.load.spritesheet('ironman-idle', 
      '/assets/characters/Player/Iron-idle.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 2 }
    );
    
    this.load.spritesheet('ironman-running', 
      '/assets/characters/Player/Iron-running.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    this.load.spritesheet('ironman-shooting', 
      '/assets/characters/Player/Iron-shooting.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    this.load.spritesheet('ironman-death', 
      '/assets/characters/Player/Iron-death.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 5 }
    );
    
    // Load enemy sprites
    this.load.spritesheet('enemy-idle', 
      '/assets/characters/Enemy/Enemy-idle.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 2 }
    );
    
    this.load.spritesheet('enemy-running', 
      '/assets/characters/Enemy/Enemy-runnning.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
    
    this.load.spritesheet('enemy-shooting', 
      '/assets/characters/Enemy/Enemy-shoot.png',
      { frameWidth: 65, frameHeight: 60, startFrame: 0, endFrame: 3 }
    );
  }
  
  create() {
    // Set up the background
    this.setupBackground();
    
    // Create bullets group for player
    this.bullets = this.physics.add.group({
      defaultKey: 'blast',
      maxSize: 50
    });
    
    // Configure bullets to not have gravity and disappear after a time
    this.bullets.createCallback = (bullet) => {
      // Disable gravity
      bullet.body.setAllowGravity(false);
      
      // Set bullet to disappear after 600ms (reduced from 750ms)
      if (this.time) {
        this.time.delayedCall(600, () => {
          if (bullet && bullet.active) {
            bullet.destroy();
          }
        });
      }
    };
    
    // Create enemy bullets group
    this.enemyBullets = this.physics.add.group({
      defaultKey: 'enemyblast',
      maxSize: 30
    });
    
    // Configure enemy bullets
    this.enemyBullets.createCallback = (bullet) => {
      // Disable gravity
      bullet.body.setAllowGravity(false);
      
      // Set enemy bullet to disappear after 1 second
      if (this.time) {
        this.time.delayedCall(1000, () => {
          if (bullet && bullet.active) {
            bullet.destroy();
          }
        });
      }
      
      // Make enemy bullets look green
      bullet.setTint(0x00ff00);
    };
    
    // Setup input keys
    this.setupInputHandlers();
    
    // Create menus
    this.menu = new Menu(this);
    
    // Show start menu
    this.menu.showStartMenu();
    
    // Pause physics since we're starting in the menu
    this.physics.pause();
  }
  
  setupBackground() {
    // Load the background image and get its dimensions
    const background = this.add.image(0, 0, 'background');
    background.setOrigin(0, 0);
    
    // Get the natural dimensions of the background
    const bgWidth = background.width;
    const bgHeight = 600; // Use standard height for visibility
    
    // Set the world bounds to match the background size
    this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
    
    // Set the background's depth
    background.setDepth(0);
  }
  
  setupInputHandlers() {
    // Enter key for starting/restarting
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    
    // Escape and P keys for pause menu
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    
    // Movement keys
    this.keys = this.input.keyboard.addKeys({
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      e: Phaser.Input.Keyboard.KeyCodes.E, // Shooting
      l: Phaser.Input.Keyboard.KeyCodes.L  // Test lose life
    });
    
    // Cursor keys (alternative controls)
    this.cursors = this.input.keyboard.createCursorKeys();
  }
  
  startGame() {
    // Hide menu elements
    this.menu.hideStartMenu();
    
    // Set game state
    this.gameState.inStartMenu = false;
    this.gameState.isPaused = false;
    
    // Set up platforms
    this.platforms = new Platforms(this);
    this.groundPlatforms = this.platforms.setupGround();
    
    // Calculate ground level based on platform position
    // This ensures player will be positioned properly above the platform
    const platformY = this.platforms.groundPlatformY;
    const platformHeight = this.platforms.groundPlatformHeight;
    
    // Position player above the ground with enough clearance
    // Subtract half platform height to account for the platform's center-based positioning
    // Subtract an additional offset to ensure the player is clearly above the platform
    const groundLevel = platformY - (platformHeight / 2) - 35;
    
    console.log("Platform Y:", platformY, "Ground Level:", groundLevel);
    
    // Create player at precise ground level
    this.player = new Player(this, 400, groundLevel);
    
    // Add collision between player and platforms
    this.platforms.addPlayerCollider(this.player);
    
    // Add collision between enemy bullets and player
    if (this.enemyBullets) {
      this.physics.add.overlap(this.player.sprite, this.enemyBullets, (playerSprite, bullet) => {
        // Skip if player is invulnerable
        if (this.player.playerData.isInvulnerable) return;
        
        // Player takes damage
        this.player.loseLife(1);
        this.updateLivesDisplay();
        
        // Destroy the bullet AFTER damage is applied (to match player bullet behavior)
        bullet.destroy();
      });
    }
    
    // Set up camera to follow player
    this.setupCamera();
    
    // Create HUD
    this.hud = new HUD(this, this.player);
    
    // Update HUD method for the scene to refresh lives display
    this.updateLivesDisplay = () => {
      if (this.hud) {
        this.hud.updateLives();
      }
    };
    
    // Create bullets group for player if it doesn't exist
    try {
      if (!this.bullets) {
        this.bullets = this.physics.add.group({
          defaultKey: 'blast',
          maxSize: 50
        });
        
        // Pre-create some bullets to ensure they're ready
        for (let i = 0; i < 20; i++) {
          const bullet = this.bullets.create(-100, -100, 'blast');
          bullet.setActive(false);
          bullet.setVisible(false);
        }
      } else {
        // Clear any existing bullets
        this.bullets.clear(true, true);
        
        // Recreate the group if it somehow lost its methods
        if (!this.bullets.get || typeof this.bullets.get !== 'function') {
          console.log("Recreating bullets group due to missing methods");
          this.bullets = this.physics.add.group({
            defaultKey: 'blast',
            maxSize: 50
          });
          
          // Pre-create some bullets
          for (let i = 0; i < 20; i++) {
            const bullet = this.bullets.create(-100, -100, 'blast');
            bullet.setActive(false);
            bullet.setVisible(false);
          }
        }
      }
    } catch (error) {
      console.error("Error initializing bullets group:", error);
      // Create a new group as fallback
      this.bullets = this.physics.add.group({
        defaultKey: 'blast',
        maxSize: 50
      });
    }
    
    // Create enemy manager
    this.enemyManager = new EnemyManager(this, this.player);
    
    // Get the world width from physics world
    const worldWidth = this.physics.world.bounds.width;
    
    // Calculate the usable width (80% of the total width)
    const usableWidth = worldWidth * 0.8;
    
    // Create enemy positions array
    const enemyPositions = [];
    
    // Set the minimum and maximum X positions for enemies
    const minX = 800; // Start enemies closer to player
    const maxX = usableWidth;
    
    // Add 10 enemies spaced across the usable width
    for (let i = 0; i < 10; i++) {
      // Calculate x position to distribute enemies evenly across the usable width
      const x = minX + (i * ((maxX - minX) / 9));
      
      // All enemies at the same y position (groundLevel)
      enemyPositions.push({ x: x, y: groundLevel });
    }
    
    // Setup enemies
    this.enemyManager.setupEnemies(enemyPositions);
    
    // Add collision between enemies and platforms
    this.platforms.addEnemyCollider(this.enemyManager.group);
    
    // Set up bullet collisions
    this.enemyManager.setupBulletCollisions(this.player);
    this.enemyManager.setupPlayerBulletCollisions(this.bullets);
    
    // Resume physics
    this.physics.resume();
  }
  
  setupCamera() {
    if (this.player && this.player.sprite) {
      const bgWidth = this.physics.world.bounds.width;
      const bgHeight = this.physics.world.bounds.height;
      this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
      this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
      this.cameras.main.setZoom(1);
    }
  }
  
  gameOver() {
    // Pause physics
    this.physics.pause();
    
    // Set game state
    if (this.player && this.player.playerData) {
      this.player.playerData.isGameOver = true;
    }
    
    // Display game over text immediately and again after a short delay
    // (The immediate call helps when player calls this directly from death animation)
    if (this.hud) {
      this.hud.showGameOver();
      
      // Also call again with a delay to ensure it works in all scenarios
      this.time.delayedCall(1000, () => {
        if (this.hud) {
          this.hud.showGameOver();
        }
      });
    }
  }
  
  createHeartPickup(x, y) {
    return new HeartPickup(this, x, y, this.player);
  }
  
  restartGame() {
    // Instead of restarting, just return to the main menu
    console.log("Game restart requested - redirecting to main menu");
    this.returnToMainMenu();
  }
  
  cleanupVisualEffects() {
    // Clean up flash effects array
    if (this.flashEffects && this.flashEffects.length > 0) {
      this.flashEffects.forEach(flash => {
        if (flash && flash.active) {
          flash.destroy();
        }
      });
      this.flashEffects = [];
    }
    
    // Find and clean up any circle objects
    if (this.children && this.children.list) {
      const childrenToDestroy = [];
      
      this.children.list.forEach(child => {
        if (child && (
            child.type === 'Arc' || 
            (child.geometry && child.geometry.type === 'CircleGeometry') ||
            (child.name && child.name.includes('flash'))
        )) {
          childrenToDestroy.push(child);
        }
      });
      
      childrenToDestroy.forEach(child => {
        child.destroy();
      });
    }
  }
  
  togglePauseMenu() {
    try {
      const playerExists = this.player && this.player.sprite && this.player.sprite.active;
      const playerIsGameOver = playerExists && this.player.playerData && this.player.playerData.isGameOver;
      
      if (!this.gameState.inStartMenu && playerExists && !playerIsGameOver) {
        if (this.gameState.inPauseMenu) {
          this.resumeGame();
        } else {
          this.showPauseMenu();
        }
      }
    } catch (error) {
      console.error("Error toggling pause menu:", error);
    }
  }
  
  showPauseMenu() {
    // Pause everything
    this.pauseEverything();
    
    // Show menu
    this.menu.showPauseMenu();
  }
  
  pauseEverything() {
    // Set pause state
    this.gameState.isPaused = true;
    
    // Pause physics
    this.physics.pause();
    
    // Apply visual pause effects to player
    if (this.player && this.player.sprite) {
      this.player.sprite.anims.pause();
      this.player.sprite.setTint(0xaaccff);
    }
    
    // Pause enemy animations and apply tint
    if (this.enemyManager && this.enemyManager.enemies) {
      this.enemyManager.enemies.forEach(enemy => {
        if (enemy && enemy.sprite) {
          enemy.sprite.anims.pause();
          enemy.sprite.setTint(0xaaccff);
        }
      });
    }
    
    // Pause all bullets
    if (this.bullets) {
      this.bullets.getChildren().forEach(bullet => {
        if (bullet.active) {
          bullet.body.setVelocity(0, 0);
        }
      });
    }
    
    // Pause enemy bullets
    if (this.enemyBullets) {
      this.enemyBullets.getChildren().forEach(bullet => {
        if (bullet.active) {
          bullet.body.setVelocity(0, 0);
        }
      });
    }
  }
  
  resumeGame() {
    // Hide the pause menu
    this.menu.hidePauseMenu();
    
    // Set game state
    this.gameState.isPaused = false;
    
    // Resume player animation and remove tint
    if (this.player && this.player.sprite) {
      this.player.sprite.clearTint();
      this.player.sprite.anims.resume();
    }
    
    // Resume enemy animations and remove tints
    if (this.enemyManager && this.enemyManager.enemies) {
      this.enemyManager.enemies.forEach(enemy => {
        if (enemy && enemy.sprite) {
          enemy.sprite.clearTint();
          enemy.sprite.anims.resume();
        }
      });
    }
    
    // Resume all animations
    this.anims.resumeAll();
    
    // Resume physics
    this.physics.resume();
  }
  
  returnToMainMenu() {
    try {
      console.log("Returning to main menu");
      
      // Hide the pause menu
      if (this.menu) {
        this.menu.hidePauseMenu();
      }
      
      // Ensure physics is paused to prevent additional errors
      if (this.physics) {
        this.physics.pause();
      }
      
      // Clear bullet references first to avoid errors
      if (this.enemyBullets) {
        try {
          console.log("Cleaning up enemy bullets reference");
          
          // Safe clear of enemy bullets
          if (typeof this.enemyBullets.getChildren === 'function') {
            const bullets = this.enemyBullets.getChildren();
            bullets.forEach(bullet => {
              if (bullet && bullet.active) {
                bullet.destroy();
              }
            });
          }
          
          if (typeof this.enemyBullets.clear === 'function') {
            this.enemyBullets.clear(true, true);
          }
          
          // Null the reference
          this.enemyBullets = null;
        } catch (error) {
          console.error("Error cleaning up enemy bullets", error);
          this.enemyBullets = null;
        }
      }
      
      // Same for player bullets
      if (this.bullets) {
        try {
          console.log("Cleaning up player bullets reference");
          
          // Safe clear of player bullets
          if (typeof this.bullets.getChildren === 'function') {
            const bullets = this.bullets.getChildren();
            bullets.forEach(bullet => {
              if (bullet && bullet.active) {
                bullet.destroy();
              }
            });
          }
          
          if (typeof this.bullets.clear === 'function') {
            this.bullets.clear(true, true);
          }
          
          // Null the reference
          this.bullets = null;
        } catch (error) {
          console.error("Error cleaning up player bullets", error);
          this.bullets = null;
        }
      }
      
      // Clean up entities
      this.cleanupEntities();
      
      // Reset camera
      this.resetCamera();
      
      // Reset game state completely
      this.gameState = {
        inStartMenu: true,
        isPaused: false,
        inPauseMenu: false
      };
      
      // Clear any remaining flashEffects
      this.flashEffects = [];
      
      // Fully reset the scene
      if (this.scene && typeof this.scene.restart === 'function') {
        this.scene.restart();
      } else {
        console.error("Cannot restart scene - scene object is invalid");
        // As a fallback, reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error("Fatal error returning to main menu:", error);
      // Emergency recovery - reload the page
      alert("An error occurred. The game will reload.");
      window.location.reload();
    }
  }
  
  resetCamera() {
    if (this.cameras && this.cameras.main) {
      // Stop camera from following the player
      this.cameras.main.stopFollow();
      
      // Reset camera position
      this.cameras.main.setScroll(0, 0);
      
      // Reset camera zoom
      this.cameras.main.setZoom(1);
      
      // Reset camera bounds
      this.cameras.main.setBounds(0, 0, this.game.config.width, this.game.config.height);
      
      // Force camera update
      this.cameras.main.setPosition(0, 0);
      this.cameras.main.update(0, 0);
    }
  }
  
  cleanupEntities() {
    // Clean up visual effects
    this.cleanupVisualEffects();
    
    // Clean up player
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    
    // Clean up enemies
    if (this.enemyManager) {
      this.enemyManager.destroy();
      this.enemyManager = null;
    }
    
    // Clean up HUD
    if (this.hud) {
      this.hud.destroy();
      this.hud = null;
    }
    
    // Clean up platforms
    if (this.platforms) {
      this.platforms.destroy();
      this.platforms = null;
    }
    
    // Safely clear bullets
    try {
      if (this.bullets) {
        // Check if the group still has required methods
        if (this.bullets && typeof this.bullets.clear === 'function') {
          this.bullets.clear(true, true);
        } else {
          console.log('Bullets group missing clear method, destroying directly');
          this.bullets.destroy && this.bullets.destroy();
        }
        this.bullets = null;
      }
    } catch (error) {
      console.error("Error clearing bullets:", error);
      this.bullets = null;
    }
    
    // Safely clear enemy bullets
    try {
      if (this.enemyBullets) {
        // Check if the group still has required methods
        if (this.enemyBullets && typeof this.enemyBullets.clear === 'function') {
          this.enemyBullets.clear(true, true);
        } else {
          console.log('Enemy bullets group missing clear method, destroying directly');
          this.enemyBullets.destroy && this.enemyBullets.destroy();
        }
        this.enemyBullets = null;
      }
    } catch (error) {
      console.error("Error clearing enemy bullets:", error);
      this.enemyBullets = null;
    }
  }
  
  update() {
    try {
      // Safely check for a valid player object
      const playerExists = this.player && this.player.sprite && this.player.sprite.active;
      const playerIsGameOver = playerExists && this.player.playerData && this.player.playerData.isGameOver;
      const playerIsDeathAnimating = playerExists && this.player.playerData && this.player.playerData.isPlayingDeathAnimation;
      
      // Handle game over restart with ENTER key 
      if (playerIsGameOver && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        console.log("ENTER key pressed in game over state");
        this.returnToMainMenu();
        return;
      }
      
      // Check for pause menu toggle with ESC or P keys
      if ((Phaser.Input.Keyboard.JustDown(this.escKey) || 
          Phaser.Input.Keyboard.JustDown(this.pKey)) && 
          !this.gameState.inStartMenu && 
          playerExists && !playerIsGameOver) {
        this.togglePauseMenu();
        return;
      }
      
      // Process Enter key in start menu
      if (this.gameState.inStartMenu && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.startGame();
        return;
      }
      
      // Skip all updates if in menu, paused, or game over
      if (this.gameState.inStartMenu || this.gameState.inPauseMenu || 
          playerIsGameOver || playerIsDeathAnimating) {
        return;
      }
      
      // Update enemies
      if (this.enemyManager) {
        this.enemyManager.update();
      }
      
      // Update player
      if (playerExists) {
        this.player.update(this.keys);
        
        // Check for shooting
        if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.e) && 
            this.player.playerData && !this.player.playerData.isShooting) {
          this.player.shoot(this.bullets);
        }
        
        // Test losing a life with the 'L' key
        if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.l)) {
          this.player.loseLife();
          this.updateLivesDisplay();
        }
        
        // Check if player fell off the world
        if (this.player.sprite.y > this.cameras.main.height) {
          this.player.loseLife();
          this.updateLivesDisplay();
          this.player.sprite.setPosition(400, 400); // Reset position
        }
        
        // Check if player is dead
        if (this.player.playerData.lives <= 0 && !this.player.playerData.isGameOver && !this.player.playerData.isPlayingDeathAnimation) {
          this.gameOver();
        }
      }
    } catch (error) {
      console.error("Error in game update:", error);
    }
  }
}

export default Game; 