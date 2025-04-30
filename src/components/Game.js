import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

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
          gravity: { y: 350 }, // Increased gravity from 300 to 600 for faster falling
          debug: false // Set to true to see collision boundaries
        }
      },
      scene: {
        preload: preload,
        create: create,
        update: update
      }
    };
    
    // Initialize the game
    const game = new Phaser.Game(config);
    
    // Preload game assets
    function preload() {
      // Load the new single background image
      this.load.image('background', '/assets/background/background.png');
      
      // Load heart image for lives display
      this.load.image('heart', '/assets/objects/Heart.png'); // Using the new heart asset
      
      // Load blast image as a regular image, not a spritesheet
      this.load.image('blast', '/assets/objects/blast.png');
      
      // Load ironman sprite sheet with frames for idle animation
      this.load.spritesheet('ironman-idle', 
        '/assets/characters/Player/Iron-idle.png',
        { 
          frameWidth: 65,    // Using your updated values
          frameHeight: 60,   // Using your updated values
          startFrame: 0,
          endFrame: 2        // Updated to 2 frames as per your change
        }
      );
      
      // Also load running animation
      this.load.spritesheet('ironman-running', 
        '/assets/characters/Player/Iron-running.png',
        { 
          frameWidth: 65,  
          frameHeight: 60,
          startFrame: 0,
          endFrame: 3
        }
      );
      
      // Load shooting animation
      this.load.spritesheet('ironman-shooting', 
        '/assets/characters/Player/Iron-shooting.png',
        { 
          frameWidth: 65,  
          frameHeight: 60,
          startFrame: 0,
          endFrame: 3
        }
      );
      
      // Load death animation
      this.load.spritesheet('ironman-death', 
        '/assets/characters/Player/Iron-death.png',
        { 
          frameWidth: 65,  
          frameHeight: 60,
          startFrame: 0,
          endFrame: 5
        }
      );
      
      // Log any load errors for debugging
      this.load.on('loaderror', function(fileObj) {
        // Error handling without console.error
      });
    }
    
    // Create game objects
    function create() {
      // Set game state - add inStartMenu flag
      this.gameState = {
        inStartMenu: true,
        isPaused: false,
        inPauseMenu: false
      };
      
      // First, load the background image and get its dimensions
      const background = this.add.image(0, 0, 'background');
      background.setOrigin(0, 0); // Set origin to top-left
      
      // Get the natural dimensions of the background
      const bgWidth = background.width;
      const bgHeight = 600; // Use standard height for visibility
      
      // Set the world bounds to match the background size
      this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
      
      // Set the background's depth
      background.setDepth(0);
      
      // Create invisible platform for collision along the bottom of the world
      const ground = this.physics.add.staticGroup();
      
      // Create a platform that spans the entire background width at the very bottom
      // The platform height is 20px
      const platformHeight = 20;
      // Position it exactly at the bottom of the visible area
      const platformY = bgHeight;
      
      const platform = ground.create(bgWidth / 2, platformY, null);
      platform.setVisible(false);
      platform.setDisplaySize(bgWidth, platformHeight);
      platform.refreshBody();
      
      // Create player data
      this.playerData = {
        lives: 3,
        maxLives: 3,
        isGameOver: false,
        isPlayingDeathAnimation: false,
        isShooting: false,
        lastShootTime: 0,
        shootCooldown: 500 // 500ms cooldown between shots
      };
      
      // Store flash effects in an array for tracking
      this.flashEffects = [];
      
      // Create bullet group
      this.bullets = this.physics.add.group({
        defaultKey: 'blast',
        maxSize: 50 // Increased from 10 to 50 bullets
      });
      
      // Create HUD for lives display
      this.createHUD();
      
      // Set up the Enter key for starting/restarting the game
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      
      // Set up the ESC and P keys for pause menu
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      
      // Check if we're in the initial load or returning from restart
      // If this is a fresh start or restart, show the start menu
      this.showStartMenu();
      
      // Pause physics since we're starting in the menu
      this.physics.pause();
    }
    
    // Show start menu - Fix button positioning
    Phaser.Scene.prototype.showStartMenu = function() {
      // Set menu state
      this.gameState.inStartMenu = true;
      
      // Reset camera position again to be sure (double safety)
      if (this.cameras && this.cameras.main) {
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.update(0, 0);
      }
      
      // Make sure any previous menu elements are truly gone
      if (this.menuElements) {
        this.menuElements.forEach(element => {
          if (element && element.destroy) {
            element.destroy();
          }
        });
      }
      
      // Create semi-transparent overlay with gradient effect (changed to gray)
      const overlay = this.add.rectangle(
        0, 0, this.cameras.main.width, this.cameras.main.height,
        0x222222, 0.8
      );
      overlay.setOrigin(0, 0);
      overlay.setScrollFactor(0);
      overlay.setDepth(100);
      this.menuOverlay = overlay;
      
      // Add simple background effects instead of particles
      const bgEffects = this.add.group();
      
      // Create 20 small glowing dots (updated to match gray theme)
      for (let i = 0; i < 20; i++) {
        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const y = Phaser.Math.Between(50, this.cameras.main.height - 50);
        const size = Phaser.Math.Between(3, 8);
        
        const dot = this.add.circle(x, y, size, 0xcccccc, 0.7);
        dot.setDepth(101);
        dot.setScrollFactor(0); // Ensure it's fixed to camera
        
        // Add glow animation
        this.tweens.add({
          targets: dot,
          alpha: { from: 0.3, to: 0.8 },
          scale: { from: 0.8, to: 1.2 },
          duration: Phaser.Math.Between(1500, 3000),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 1000)
        });
        
        bgEffects.add(dot);
      }
      
      // Add game title with superhero style - with fixed position relative to camera
      const titleText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 3,
        'SMASH PROTOCOL', 
        { 
          fontSize: '64px', 
          fontFamily: 'Impact, fantasy',
          fill: '#ff3333',
          stroke: '#ffffff',
          strokeThickness: 8,
          align: 'center',
          shadow: {
            offsetX: 2,
            offsetY: 2,
            color: '#000000',
            blur: 5,
            stroke: true,
            fill: true
          }
        }
      );
      
      // Add title animation for more impact
      titleText.setOrigin(0.5);
      titleText.setScrollFactor(0); // Fix to camera view
      titleText.setDepth(102);
      titleText.alpha = 0;
      
      // Dramatic entrance for the title
      this.tweens.add({
        targets: titleText,
        alpha: 1,
        scale: { from: 0.5, to: 1 },
        duration: 1000,
        ease: 'Bounce.Out'
      });
      
      // Add a more heroic start button (shield/emblem style) - Moved to center
      // First create a container for the button elements
      const buttonContainer = this.add.container(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2
      );
      buttonContainer.setDepth(102);
      buttonContainer.setScrollFactor(0); // Fix to camera
      
      // Create button background (shield shape)
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x3366ff, 1);
      buttonBg.fillRoundedRect(-110, -30, 220, 60, 30);
      
      // Add metallic border
      buttonBg.lineStyle(4, 0x88ccff, 1);
      buttonBg.strokeRoundedRect(-110, -30, 220, 60, 30);
      
      // Add inner glow
      const buttonGlow = this.add.graphics();
      buttonGlow.fillGradientStyle(
        0x4477ff, 0x4477ff, 0x0033cc, 0x0033cc, 1
      );
      buttonGlow.fillRoundedRect(-100, -25, 200, 50, 25);
      
      // Add button text with superhero style
      const buttonText = this.add.text(
        0, 0,
        'START MISSION', 
        { 
          fontSize: '26px',
          fontFamily: 'Impact, fantasy',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
          align: 'center'
        }
      );
      buttonText.setOrigin(0.5);
      
      // Add elements to the container
      buttonContainer.add(buttonBg);
      buttonContainer.add(buttonGlow);
      buttonContainer.add(buttonText);
      
      // Make the container interactive
      buttonContainer.setSize(220, 60);
      buttonContainer.setInteractive({ useHandCursor: true });
      
      // Add button hover and click effects
      buttonContainer.on('pointerover', function() {
        buttonBg.clear();
        buttonBg.fillStyle(0x4488ff, 1);
        buttonBg.fillRoundedRect(-110, -30, 220, 60, 30);
        buttonBg.lineStyle(4, 0xaaddff, 1);
        buttonBg.strokeRoundedRect(-110, -30, 220, 60, 30);
        
        buttonGlow.clear();
        buttonGlow.fillGradientStyle(
          0x66aaff, 0x66aaff, 0x3366dd, 0x3366dd, 1
        );
        buttonGlow.fillRoundedRect(-100, -25, 200, 50, 25);
        
        buttonText.setScale(1.1);
      });
      
      buttonContainer.on('pointerout', function() {
        buttonBg.clear();
        buttonBg.fillStyle(0x3366ff, 1);
        buttonBg.fillRoundedRect(-110, -30, 220, 60, 30);
        buttonBg.lineStyle(4, 0x88ccff, 1);
        buttonBg.strokeRoundedRect(-110, -30, 220, 60, 30);
        
        buttonGlow.clear();
        buttonGlow.fillGradientStyle(
          0x4477ff, 0x4477ff, 0x0033cc, 0x0033cc, 1
        );
        buttonGlow.fillRoundedRect(-100, -25, 200, 50, 25);
        
        buttonText.setScale(1.0);
      });
      
      // Remove any existing event listeners before adding new ones
      buttonContainer.removeAllListeners('pointerdown');
      buttonContainer.removeAllListeners('pointerup');
      
      // Add click animation
      buttonContainer.on('pointerdown', function() {
        buttonText.y = 2;
        this.scene.tweens.add({
          targets: buttonContainer,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 100
        });
      });
      
      buttonContainer.on('pointerup', function() {
        buttonText.y = 0;
        this.scene.tweens.add({
          targets: buttonContainer,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          onComplete: () => {
            this.scene.startGame();
          }
        });
      });
      
      // Add "Press ENTER to start" text with futuristic style
      const enterText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 2 + 70, // Moved closer to the button
        'Press ENTER to deploy', 
        { 
          fontSize: '18px',
          fontFamily: 'Verdana, sans-serif',
          fill: '#cccccc', // Changed to match gray theme
          stroke: '#000000',
          strokeThickness: 2,
          align: 'center'
        }
      );
      enterText.setOrigin(0.5);
      enterText.setScrollFactor(0); // Fix to camera
      enterText.setDepth(102);
      
      // Pulse animation for the "press ENTER" text
      this.tweens.add({
        targets: enterText,
        alpha: { from: 0.6, to: 1 },
        scale: { from: 0.95, to: 1.05 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
      
      // Store menu elements
      this.menuElements = [
        overlay, bgEffects, titleText, 
        buttonContainer, enterText
      ];
    };
    
    // Start the game
    Phaser.Scene.prototype.startGame = function() {
      // Hide menu elements
      if (this.menuElements) {
        this.menuElements.forEach(element => {
          if (element) element.setVisible(false);
        });
      }
      
      // Set game state
      this.gameState.inStartMenu = false;
      
      // Ensure input handlers are initialized
      this.resetInputHandlers();
      
      // Create player character if not already created
      if (!this.ironman) {
        const platformY = this.physics.world.bounds.height;
        this.createPlayer(platformY);
      }
      
      // Resume physics
      this.physics.resume();
    };
    
    // Create player character and set up level
    Phaser.Scene.prototype.createPlayer = function(platformY) {
      try {
        // Create ironman character - position it above the ground
        const characterY = platformY - 60; // Higher from the ground to match new frame height
        this.ironman = this.physics.add.sprite(400, characterY, 'ironman-idle');
        
        if (this.ironman) {
          // Character scale for normal view
          this.ironman.setScale(1.8); // Slightly smaller scale since the frames are larger
          this.ironman.setDepth(2);
          this.ironman.setCollideWorldBounds(true);
          
          // Add a higher falling gravity for faster descent after jumping
          this.ironman.body.setGravityY(300); // Additional gravity specific to the character
          
          // Create character animations with proper frame counts
          try {
            // Clear any existing animations with these keys first
            ['idle', 'running', 'shooting', 'death'].forEach(key => {
              if (this.anims.exists(key)) {
                this.anims.remove(key);
              }
            });
            
            // Idle animation - with only 3 frames (0, 1, 2)
            this.anims.create({
              key: 'idle',
              frames: this.anims.generateFrameNumbers('ironman-idle', { start: 0, end: 2 }),
              frameRate: 8,
              repeat: -1
            });
            
            // Running animation - with 4 frames (0, 1, 2, 3)
            this.anims.create({
              key: 'running',
              frames: this.anims.generateFrameNumbers('ironman-running', { start: 0, end: 3 }),
              frameRate: 10,
              repeat: -1
            });
            
            // Shooting animation - with 4 frames (0, 1, 2, 3)
            this.anims.create({
              key: 'shooting',
              frames: this.anims.generateFrameNumbers('ironman-shooting', { start: 0, end: 3 }),
              frameRate: 12,
              repeat: 0 // Don't repeat, play once
            });
            
            // Death animation - plays once and then stops
            this.anims.create({
              key: 'death',
              frames: this.anims.generateFrameNumbers('ironman-death', { start: 0, end: 5 }),
              frameRate: 8,
              repeat: 0
            });
            
            // Play the idle animation initially
            this.ironman.anims.play('idle', true);
            
            // Add animation complete listener for death animation
            this.ironman.on('animationcomplete-death', function() {
              // Animation has completed - character stays on last frame
            });
            
            // Add animation complete listener for shooting animation
            this.ironman.on('animationcomplete-shooting', function(animation, frame) {
              // Set shooting flag to false to allow movement again
              if (this.scene) {
                this.scene.playerData.isShooting = false;
                // Force idle animation when shooting completes
                this.anims.play('idle', true);
              }
            });
          } catch (animError) {
            // Error handling without console output
          }
          
          // Add collision between ironman and the ground platforms
          this.physics.add.collider(this.ironman, this.physics.world.staticBodies);
          
          // Input handlers are now set in resetInputHandlers
          // We don't need to duplicate them here
          
          // Set camera to follow the player, bounded by the background dimensions
          const bgWidth = this.physics.world.bounds.width;
          const bgHeight = this.physics.world.bounds.height;
          this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
          this.cameras.main.startFollow(this.ironman, true, 0.1, 0.1);
          
          // No zoom - normal size
          this.cameras.main.setZoom(1);
        }
      } catch (error) {
        // Error handling without console output
      }
    };
    
    // Shoot a blast
    Phaser.Scene.prototype.shoot = function() {
      // Skip shooting if game is paused
      if (this.gameState.isPaused || this.gameState.inPauseMenu) return;
      
      // Check cooldown
      const currentTime = this.time.now;
      if (currentTime < this.playerData.lastShootTime + this.playerData.shootCooldown) {
        return; // Still in cooldown
      }
      
      // Set shooting state
      this.playerData.isShooting = true;
      this.playerData.lastShootTime = currentTime;
      
      // Play shooting animation
      this.ironman.anims.play('shooting', true);
      
      // Create bullet
      const bullet = this.bullets.get();
      if (bullet) {
        try {
          // Determine direction based on character facing
          const direction = this.ironman.flipX ? -1 : 1;
          
          // Calculate the spawn position for the bullet based on character position
          const offsetX = direction * 20; // Offset from center of character
          
          // Position at half height of the player
          // Use frameHeight to determine the character's actual height
          const characterHalfHeight = (this.ironman.height / 2);
          const offsetY = characterHalfHeight / 4; // Adjust to position at mid-height
          
          // Set bullet position, velocity and properties
          bullet.enableBody(true, this.ironman.x + offsetX, this.ironman.y + offsetY, true, true);
          bullet.setVelocityX(direction * 600); // Bullet speed
          bullet.setVelocityY(0); // No vertical velocity
          bullet.body.setAllowGravity(false); // Disable gravity for the bullet
          bullet.setScale(1.5);
          bullet.setDepth(1.5); // Between background and character
          
          // No animation - just use the image
          
          // Add rotation to the bullet based on direction
          if (direction > 0) {
            bullet.rotation = 0; // No rotation when facing right
          } else {
            bullet.rotation = Math.PI; // 180 degrees when facing left
          }
          
          // Make bullet destroy itself when it leaves the screen
          bullet.checkWorldBounds = true;
          bullet.outOfBoundsKill = true;
          
          // Enable data component to store information
          bullet.setDataEnabled();
          
          // Destroy the bullet after half a second
          if (!this.gameState.isPaused) {
            const destroyTimer = this.time.delayedCall(300, function() {
              // Add a small fade-out effect before destroying
              if (!this.gameState.isPaused && bullet.active) {
                this.tweens.add({
                  targets: bullet,
                  alpha: 0,
                  scale: 0.8,
                  duration: 100,
                  onComplete: function() {
                    bullet.destroy();
                  }
                });
              }
            }, [], this);
            
            // Store the timer reference in the bullet for pause handling
            bullet.data.set('destroyTimer', destroyTimer);
          }
          
          // Add a blue muzzle flash effect - also update the flash position
          const flash = this.add.circle(this.ironman.x + offsetX, this.ironman.y + offsetY, 15, 0x1a75ff, 0.8);
          flash.setDepth(3); // Above character
          flash.setName('muzzleFlash'); // Give it a name for easier identification
          
          // Store flash in array for tracking
          if (!this.flashEffects) {
            this.flashEffects = [];
          }
          this.flashEffects.push(flash);
          
          // Fade out the flash with explicit context reference for the scene
          const scene = this;
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 100,
            onComplete: function() { 
              flash.destroy();
              // Make sure flash exists in the array before trying to remove it
              if (scene.flashEffects) {
                const index = scene.flashEffects.indexOf(flash);
                if (index > -1) {
                  scene.flashEffects.splice(index, 1);
                }
              }
            }
          });
        } catch (error) {
          // Error handling without console output
        }
      } else {
        // If we couldn't get a bullet from the group, create a new one directly
        try {
          // Create a new bullet sprite directly
          const direction = this.ironman.flipX ? -1 : 1;
          const offsetX = direction * 20;
          const characterHalfHeight = (this.ironman.height / 2);
          const offsetY = characterHalfHeight / 4;
          
          const newBullet = this.physics.add.sprite(
            this.ironman.x + offsetX, 
            this.ironman.y + offsetY, 
            'blast'
          );
          
          newBullet.setVelocityX(direction * 600);
          newBullet.setVelocityY(0);
          newBullet.body.setAllowGravity(false);
          newBullet.setScale(1.5);
          newBullet.setDepth(1.5);
          
          if (direction > 0) {
            newBullet.rotation = 0;
          } else {
            newBullet.rotation = Math.PI;
          }
          
          newBullet.checkWorldBounds = true;
          newBullet.outOfBoundsKill = true;
          
          // Destroy after a delay
          this.time.delayedCall(300, function() {
            if (newBullet.active) {
              this.tweens.add({
                targets: newBullet,
                alpha: 0,
                scale: 0.8,
                duration: 100,
                onComplete: function() {
                  newBullet.destroy();
                }
              });
            }
          }, [], this);
          
          // Add flash effect
          const flash = this.add.circle(this.ironman.x + offsetX, this.ironman.y + offsetY, 15, 0x1a75ff, 0.8);
          flash.setDepth(3);
          flash.setName('muzzleFlash'); // Give it a name for easier identification
          
          // Store flash in array for tracking
          if (!this.flashEffects) {
            this.flashEffects = [];
          }
          this.flashEffects.push(flash);
          
          // Fade out flash with explicit scene context
          const scene = this;
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 100,
            onComplete: function() {
              flash.destroy();
              // Make sure flash exists before trying to remove it
              if (scene.flashEffects) {
                const index = scene.flashEffects.indexOf(flash);
                if (index > -1) {
                  scene.flashEffects.splice(index, 1);
                }
              }
            }
          });
        } catch (error) {
          // Error handling without console output
        }
      }
    };
    
    // Create HUD for displaying lives
    Phaser.Scene.prototype.createHUD = function() {
      // Create a group for lives display
      this.livesGroup = this.add.group();
      
      // Create the HUD container - fixed to the camera
      this.HUD = this.add.container(10, 10);
      this.HUD.setScrollFactor(0); // Fix to camera
      this.HUD.setDepth(10); // Make sure it's on top
      
      // Add lives text
      this.livesText = this.add.text(0, 0, 'LIVES:', { 
        fontSize: '24px', 
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      });
      this.HUD.add(this.livesText);
      
      // Add heart icons for lives
      this.updateLivesDisplay();
    };
    
    // Update the lives display
    Phaser.Scene.prototype.updateLivesDisplay = function() {
      // Clear existing hearts
      this.livesGroup.clear(true, true);
      
      // Calculate heart positions
      const heartSpacing = 30; // Increased spacing between hearts for larger hearts
      const heartStartX = this.livesText.width + 30; // Start position after text
      const heartY = 20; // Adjusted vertical position of hearts
      
      // Add new hearts based on current lives
      for (let i = 0; i < this.playerData.lives; i++) {
        const heart = this.add.image(
          heartStartX + (i * heartSpacing), // Position hearts with proper spacing
          heartY,  // Center vertically with the text
          'heart'
        );
        
        // Calculate appropriate scale based on the heart image size - 3x larger
        const heartScale = 1.5; // Increased from 0.5 to 1.5 (3x larger)
        heart.setScale(heartScale);
        heart.setScrollFactor(0); // Fix to camera
        heart.setDepth(10);
        
        // Add a subtle pulse animation to the hearts
        this.tweens.add({
          targets: heart,
          scale: { from: heartScale, to: heartScale * 1.1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        
        this.livesGroup.add(heart);
      }
      
      // Add empty/gray hearts for lost lives
      for (let i = this.playerData.lives; i < this.playerData.maxLives; i++) {
        const emptyHeart = this.add.image(
          heartStartX + (i * heartSpacing),
          heartY,
          'heart'
        );
        
        // Make empty hearts gray and smaller
        emptyHeart.setScale(1.2); // Increased from 0.4 to 1.2 (3x larger)
        emptyHeart.setAlpha(0.4);
        emptyHeart.setTint(0x666666);
        emptyHeart.setScrollFactor(0);
        emptyHeart.setDepth(10);
        
        this.livesGroup.add(emptyHeart);
      }
    };
    
    // Player loses a life
    Phaser.Scene.prototype.loseLife = function() {
      if (this.playerData.lives > 0 && !this.playerData.isGameOver && !this.playerData.isPlayingDeathAnimation) {
        this.playerData.lives--;
        this.updateLivesDisplay();
        
        // Flash the character to indicate damage
        this.tweens.add({
          targets: this.ironman,
          alpha: { from: 0.2, to: 1 },
          duration: 200,
          repeat: 2
        });
        
        // Check for game over
        if (this.playerData.lives <= 0) {
          this.gameOver();
        }
      }
    };
    
    // Game over state
    Phaser.Scene.prototype.gameOver = function() {
      // Set game over flag
      this.playerData.isGameOver = true;
      this.playerData.isPlayingDeathAnimation = true;
      
      // Immediately stop all player movement
      if (this.ironman) {
        // Stop all velocity
        this.ironman.setVelocity(0, 0);
        // Disable gravity for the character so it doesn't fall during death animation
        this.ironman.body.setAllowGravity(false);
        // Fix player in place during animation
        this.ironman.body.moves = false;
      }
      
      // Play death animation
      this.ironman.anims.play('death', true);
      
      // Display game over text after a short delay (let death animation play)
      this.time.delayedCall(1000, () => {
        // Display game over text
        const gameOverText = this.add.text(400, 300, 'GAME OVER', {
          fontSize: '48px',
          fill: '#ff0000',
          stroke: '#000000',
          strokeThickness: 6
        });
        gameOverText.setOrigin(0.5);
        gameOverText.setScrollFactor(0);
        gameOverText.setDepth(20);
        
        // Add restart instruction text below game over
        const restartText = this.add.text(400, 350, 'Press ENTER to try again', {
          fontSize: '20px',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3
        });
        restartText.setOrigin(0.5);
        restartText.setScrollFactor(0);
        restartText.setDepth(20);
        
        // Add subtle pulse animation to the restart text
        this.tweens.add({
          targets: restartText,
          alpha: { from: 0.7, to: 1 },
          scale: { from: 0.95, to: 1.05 },
          duration: 800,
          yoyo: true,
          repeat: -1
        });
        
        // Pause the game physics
        this.physics.pause();
      });
    };
    
    // Restart the game - Enhanced for pause menu case
    Phaser.Scene.prototype.restartGame = function() {
      // First, do a complete cleanup of any visual effects - do this FIRST
      this.cleanupVisualEffects();
      
      // Reset player data
      this.playerData.lives = this.playerData.maxLives;
      this.playerData.isGameOver = false;
      this.playerData.isPlayingDeathAnimation = false;
      this.playerData.isShooting = false; // Ensure shooting state is reset
      
      // Clear any active bullets
      if (this.bullets) {
        this.bullets.clear(true, true);
      }
      
      // Update the lives display
      this.updateLivesDisplay();
      
      // Remove the old player and safely clear its data
      if (this.ironman) {
        // Clear any data before destroying
        if (this.ironman.data) {
          // Just clear the values, don't try to destroy the data object
          try {
            this.ironman.data.reset();
          } catch (error) {
            // Error handling without console output
          }
        }
        
        this.ironman.destroy();
        this.ironman = null;
      }
      
      // Remove any game over text
      this.children.list
        .filter(child => child.type === 'Text' && (
          child.text === 'GAME OVER' || 
          child.text === 'Press ENTER to try again'
        ))
        .forEach(text => text.destroy());
      
      // Clear any lingering animations safely
      try {
        // Check if each animation exists before trying to remove it
        ['idle', 'running', 'shooting', 'death'].forEach(key => {
          if (this.anims.exists(key)) {
            this.anims.remove(key);
          }
        });
      } catch (error) {
        // Error handling without console output
      }
      
      // Reset the game state if coming from pause menu
      this.gameState.isPaused = false;
      this.gameState.inPauseMenu = false;
      
      // Make sure to reset all input handlers
      if (this.input && this.input.keyboard) {
        // Reset input handlers and recreate them
        this.resetInputHandlers();
      }
      
      // Create a new player
      const platformY = this.physics.world.bounds.height;
      this.createPlayer(platformY);
      
      // Resume physics
      this.physics.resume();
      
      // Do another cleanup pass to be absolutely sure
      this.cleanupVisualEffects();
    };
    
    // New dedicated function for cleaning up visual effects - fixed tweens.getAll error
    Phaser.Scene.prototype.cleanupVisualEffects = function() {
      // 1. Clean up flash effects array
      if (this.flashEffects && this.flashEffects.length > 0) {
        this.flashEffects.forEach(flash => {
          if (flash && flash.active) {
            flash.destroy();
          }
        });
        this.flashEffects = [];
      }
      
      // 2. Alternative approach to stop tweens since getAll() isn't consistently available
      try {
        // First attempt to use the method if available
        if (this.tweens && typeof this.tweens.getAllTweens === 'function') {
          const allTweens = this.tweens.getAllTweens();
          allTweens.forEach(tween => {
            if (tween.targets && tween.targets.length > 0) {
              tween.targets.forEach(target => {
                if (target && (
                    target.type === 'Arc' || 
                    (target.geometry && target.geometry.type === 'CircleGeometry') ||
                    (target.name && target.name.includes('flash'))
                )) {
                  tween.stop();
                  tween.remove();
                  if (target.destroy) target.destroy();
                }
              });
            }
          });
        } else {
          // Fallback: just destroy circle objects directly
        }
      } catch (error) {
        // Error handling without console output
      }
      
      // 3. Comprehensive search for any circle objects in the scene
      let circlesDestroyed = 0;
      const childrenToDestroy = [];
      
      // First, collect all circle objects to destroy
      if (this.children && this.children.list) {
        this.children.list.forEach(child => {
          if (child && (
              child.type === 'Arc' || 
              (child.geometry && child.geometry.type === 'CircleGeometry') ||
              (child.name && child.name.includes('flash'))
          )) {
            childrenToDestroy.push(child);
          }
        });
      }
      
      // Then destroy them all
      childrenToDestroy.forEach(child => {
        child.destroy();
        circlesDestroyed++;
      });
      
      // 5. Optional: Force a scene update to ensure the display list is refreshed
      try {
        if (this.scene && typeof this.scene.update === 'function') {
          this.scene.update();
        }
      } catch (error) {
        // Error handling without console output
      }
    };
    
    // Reset input handlers with error handling - removed R key
    Phaser.Scene.prototype.resetInputHandlers = function() {
      try {
        // Set up the Enter key for starting/restarting the game
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        
        // R key for restart removed
        
        // Set up the ESC and P keys for pause menu
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        
        // Add A, D, W keys for movement and E for shooting
        this.keys = this.input.keyboard.addKeys({
          a: Phaser.Input.Keyboard.KeyCodes.A,
          d: Phaser.Input.Keyboard.KeyCodes.D,
          w: Phaser.Input.Keyboard.KeyCodes.W,
          e: Phaser.Input.Keyboard.KeyCodes.E, // E key for shooting
          l: Phaser.Input.Keyboard.KeyCodes.L  // L key to lose a life (for testing)
        });
        
        // Set up cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
      } catch (error) {
        // Error handling without console output
      }
    };
    
    // Toggle pause menu
    Phaser.Scene.prototype.togglePauseMenu = function() {
      if (!this.gameState.inStartMenu && !this.playerData.isGameOver) {
        if (this.gameState.inPauseMenu) {
          this.resumeGame();
        } else {
          this.showPauseMenu();
        }
      }
    };
    
    // Enhanced show pause menu with cleanup
    Phaser.Scene.prototype.showPauseMenu = function() {
      // Set menu state
      this.gameState.isPaused = true;
      this.gameState.inPauseMenu = true;
      
      // Force immediate pausing of everything
      this.pauseEverything();
      
      // Create pause menu group to manage all menu elements
      this.pauseMenuGroup = this.add.group();
      
      // Create semi-transparent overlay for pause menu
      const overlay = this.add.rectangle(
        0, 0, this.cameras.main.width, this.cameras.main.height,
        0x000000, 0.7
      );
      overlay.setOrigin(0, 0);
      overlay.setScrollFactor(0);
      overlay.setDepth(200);
      this.pauseMenuGroup.add(overlay);
      
      // Add pause menu title - Positioned higher to avoid button overlap
      const pauseTitle = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 4, // Changed from /3 to /4 for higher position
        'PAUSED', 
        { 
          fontSize: '48px', 
          fontFamily: 'Impact, fantasy',
          fill: '#ffffff',
          stroke: '#000000',
          strokeThickness: 5,
          align: 'center'
        }
      );
      pauseTitle.setOrigin(0.5);
      pauseTitle.setScrollFactor(0);
      pauseTitle.setDepth(201);
      this.pauseMenuGroup.add(pauseTitle);
      
      // Constants for button positioning
      const buttonSpacing = 90; // Increased spacing with fewer buttons
      const buttonY = this.cameras.main.height / 2;
      const buttonWidth = 200;
      const buttonHeight = 50;
      
      // Create pause menu buttons
      this.pauseMenuButtons = [];
      
      // RESUME button - repositioned higher with only two buttons
      const resumeButton = this.createPauseMenuButton(
        this.cameras.main.width / 2, 
        buttonY - buttonSpacing/2, // Adjusted position with only two buttons
        buttonWidth, 
        buttonHeight, 
        'RESUME', 
        () => this.resumeGame()
      );
      this.pauseMenuButtons.push(resumeButton);
      
      // MAIN MENU button - repositioned with only two buttons
      const mainMenuButton = this.createPauseMenuButton(
        this.cameras.main.width / 2, 
        buttonY + buttonSpacing/2, // Adjusted position with only two buttons
        buttonWidth, 
        buttonHeight, 
        'MAIN MENU', 
        () => {
          // Clean up visual effects before returning to main menu
          this.cleanupVisualEffects();
          this.returnToMainMenu();
        }
      );
      this.pauseMenuButtons.push(mainMenuButton);
      
      // Initialize selected button index
      this.selectedButtonIndex = 0;
      
      // Update the visual state of all buttons
      this.updateButtonSelection();
      
      // Set up keyboard controls for selector
      this.pauseMenuKeys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      });
      
      // Add instructions
      const instructions = this.add.text(
        this.cameras.main.width / 2, 
        buttonY + buttonSpacing + 50,
        'Use UP/DOWN or W/S to select, ENTER to confirm', 
        { 
          fontSize: '16px',
          fontFamily: 'Verdana, sans-serif',
          fill: '#cccccc',
          align: 'center'
        }
      );
      instructions.setOrigin(0.5);
      instructions.setScrollFactor(0);
      instructions.setDepth(201);
      this.pauseMenuGroup.add(instructions);
      
      // Add event listener for keyboard navigation
      this.pauseSelectorHandler = (time) => this.updateSelector(time);
      this.events.on('update', this.pauseSelectorHandler);
    };
    
    // New dedicated method for pausing everything in the game
    Phaser.Scene.prototype.pauseEverything = function() {
      // Pause physics
      this.physics.pause();
      
      // Store current animation state for ironman
      if (this.ironman && this.ironman.anims) {
        try {
          // Store the current animation name and frame
          const currentAnim = this.ironman.anims.currentAnim;
          if (currentAnim) {
            // Initialize data component properly if it doesn't exist
            if (!this.ironman.data) {
              this.ironman.setDataEnabled();
            }
            
            // Store animation state in data
            this.ironman.data.set('lastAnimKey', currentAnim.key);
            this.ironman.data.set('lastAnimFrame', this.ironman.anims.currentFrame ? 
                                                this.ironman.anims.currentFrame.index : 0);
          }
          
          // Stop the animation directly
          this.ironman.anims.stop();
        } catch (error) {
          // Error handling without console output
        }
      }
      
      // Pause all game animations - try multiple methods for different Phaser versions
      
      // Method 1: Set global pause flag
      this.anims.pauseAll();
      
      // Method 2: Set scene animations manager paused property
      if (this.anims.hasOwnProperty('paused')) {
        this.anims.paused = true;
      }
      
      // Method 3: Stop all active animations in the scene
      this.children.list.forEach(gameObject => {
        if (gameObject.anims && typeof gameObject.anims.stop === 'function') {
          gameObject.anims.stop();
        }
      });
      
      // Pause all active tweens
      try {
        // Method 1: Use pauseAll if available
        if (this.tweens && typeof this.tweens.pauseAll === 'function') {
          this.tweens.pauseAll();
        }
        
        // Method 2: Pause each tween individually
        if (this.tweens && typeof this.tweens.getAllTweens === 'function') {
          const allTweens = this.tweens.getAllTweens();
          allTweens.forEach(tween => {
            if (tween && typeof tween.pause === 'function') {
              tween.pause();
            }
          });
        }
      } catch (error) {
        // Error handling without console output
      }
      
      // Pause all active bullets
      if (this.bullets) {
        this.bullets.getChildren().forEach(bullet => {
          // Store the bullet's original velocity for later
          if (!bullet.data) {
            bullet.setDataEnabled();
          }
          if (bullet.active) {
            bullet.data.set('velX', bullet.body.velocity.x);
            bullet.data.set('velY', bullet.body.velocity.y);
            bullet.body.setVelocity(0, 0);
            
            // Also stop any animations on bullets
            if (bullet.anims && typeof bullet.anims.stop === 'function') {
              bullet.anims.stop();
            }
          }
        });
      }
      
      // Pause any particle emitters
      this.children.list.forEach(gameObject => {
        if (gameObject.type === 'ParticleEmitterManager' || 
            (gameObject.emitters && gameObject.emitters.list)) {
          if (typeof gameObject.pause === 'function') {
            gameObject.pause();
          }
        }
      });
      
      // Apply a "freeze" effect to signify paused state
      if (this.ironman) {
        // Store the original tint if not already stored
        if (!this.ironman.data || !this.ironman.data.has('originalTint')) {
          if (!this.ironman.data) {
            this.ironman.setDataEnabled();
          }
          this.ironman.data.set('originalTint', this.ironman.tint);
        }
        
        // Apply a slight blue tint to indicate frozen state
        this.ironman.setTint(0xaaccff);
      }
    };
    
    // Improved resume game function
    Phaser.Scene.prototype.resumeGame = function() {
      this.hidePauseMenu();
      this.gameState.isPaused = false;
      
      // Remove the freeze effect
      if (this.ironman && this.ironman.data) {
        const originalTint = this.ironman.data.get('originalTint');
        if (originalTint) {
          this.ironman.setTint(originalTint);
        } else {
          this.ironman.clearTint();
        }
      }
      
      // Resume all animations
      // Method 1: Clear global pause flag
      this.anims.resumeAll();
      
      // Method 2: Clear scene animations manager paused property
      if (this.anims.hasOwnProperty('paused')) {
        this.anims.paused = false;
      }
      
      // Resume all tweens
      try {
        // Method 1: Use resumeAll if available
        if (this.tweens && typeof this.tweens.resumeAll === 'function') {
          this.tweens.resumeAll();
        }
        
        // Method 2: Resume each tween individually
        if (this.tweens && typeof this.tweens.getAllTweens === 'function') {
          const allTweens = this.tweens.getAllTweens();
          allTweens.forEach(tween => {
            if (tween && typeof tween.resume === 'function') {
              tween.resume();
            }
          });
        }
      } catch (error) {
        // Error handling without console output
      }
      
      // Resume all bullets with their original velocities
      if (this.bullets) {
        this.bullets.getChildren().forEach(bullet => {
          if (bullet.active && bullet.data) {
            try {
              const velX = bullet.data.get('velX') || 0;
              const velY = bullet.data.get('velY') || 0;
              bullet.body.setVelocity(velX, velY);
            } catch (error) {
              // Error handling without console output
            }
          }
        });
      }
      
      // Resume any particle emitters
      this.children.list.forEach(gameObject => {
        if (gameObject.type === 'ParticleEmitterManager' || 
            (gameObject.emitters && gameObject.emitters.list)) {
          if (typeof gameObject.resume === 'function') {
            gameObject.resume();
          }
        }
      });
      
      // Resume physics
      this.physics.resume();
      
      // Force animation playing state on the player if they exist
      if (this.ironman && this.ironman.anims) {
        try {
          // Get saved animation data
          let animKey = 'idle'; // Default to idle animation
          let frameIndex = 0;
          
          if (this.ironman.data) {
            animKey = this.ironman.data.get('lastAnimKey') || 'idle';
            frameIndex = this.ironman.data.get('lastAnimFrame') || 0;
          }
          
          this.ironman.anims.play(animKey, true, frameIndex);
        } catch (error) {
          // Error handling without console output
          // Fallback - just play idle animation
          this.ironman.anims.play('idle', true);
        }
      }
    };
    
    // Fix for the main menu issue when returning from pause menu
    Phaser.Scene.prototype.returnToMainMenu = function() {
      // Hide the pause menu first
      this.hidePauseMenu();
      
      // Re-create the player and reset game state
      if (this.ironman) {
        this.ironman.destroy();
        this.ironman = null;
      }
      
      // Clear any active bullets
      if (this.bullets) {
        this.bullets.clear(true, true);
      }
      
      // Reset player data
      this.playerData.lives = this.playerData.maxLives;
      this.playerData.isGameOver = false;
      this.playerData.isPlayingDeathAnimation = false;
      this.playerData.isShooting = false;
      
      // Clean up any existing menu elements before creating new ones
      if (this.menuElements) {
        this.menuElements.forEach(element => {
          if (element && element.destroy) {
            element.destroy();
          }
        });
        this.menuElements = null;
      }
      
      // Reset camera position and settings
      if (this.cameras && this.cameras.main) {
        // Stop camera from following the player
        this.cameras.main.stopFollow();
        
        // Reset camera position explicitly to the top-left
        this.cameras.main.setScroll(0, 0);
        
        // Reset camera zoom
        this.cameras.main.setZoom(1);
        
        // Reset camera bounds to default game size
        this.cameras.main.setBounds(0, 0, this.game.config.width, this.game.config.height);
        
        // Force camera update to apply changes immediately
        this.cameras.main.setPosition(0, 0);
        this.cameras.main.update(0, 0);
      }
      
      // Fully reset and restart the scene for a clean state
      this.scene.restart();
      
      // Force a small delay before recreating the menu to ensure cleanup is complete
      this.time.delayedCall(50, () => {
        // Show a fresh start menu
        this.showStartMenu();
      });
    };
    
    // Update game state
    function update() {
      // Check for pause menu toggle with ESC or P keys
      if ((Phaser.Input.Keyboard.JustDown(this.escKey) || 
           Phaser.Input.Keyboard.JustDown(this.pKey)) && 
          !this.gameState.inStartMenu && 
          !this.playerData.isGameOver) {
        this.togglePauseMenu();
        return;
      }
      
      // Process Enter key in start menu
      if (this.gameState.inStartMenu && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.startGame();
        return;
      }
      
      // Check for restart with Enter key after game over
      if (this.playerData.isGameOver && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.restartGame();
        return;
      }
      
      // Skip all player movement updates if in start menu, pause menu, game over, or playing death animation
      if (this.gameState.inStartMenu || this.gameState.inPauseMenu || !this.ironman || 
          this.playerData.isGameOver || this.playerData.isPlayingDeathAnimation) return;
      
      // Check if keys object exists
      if (!this.keys) {
        this.resetInputHandlers();
      }
      
      // Make sure the keys object exists before accessing its properties
      if (!this.keys) {
        return;
      }
      
      // Movement speed
      const speed = 150;
      
      // Jump power
      const jumpPower = 300;
      
      // Check if the player is touching the ground
      const onGround = this.ironman.body.touching.down || this.ironman.body.blocked.down;
      
      // Reset velocity (horizontal) only if not shooting
      if (!this.playerData.isShooting) {
        this.ironman.setVelocityX(0);
      }
      
      // Increase falling speed when descending after a jump
      if (this.ironman.body.velocity.y > 0) {
        // Adding even more downward velocity when falling
        this.ironman.body.setVelocityY(this.ironman.body.velocity.y * 1.05);
      }
      
      // Shooting with E key
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.e) && !this.playerData.isShooting) {
        this.shoot();
        return; // Exit update early to prevent other inputs during the same frame
      }
      
      // Handle jumping separately to ensure it gets priority
      // Jump (W) - only allow jumping if on the ground and not shooting
      if (this.keys && this.keys.w.isDown && onGround && !this.playerData.isShooting) {
        this.ironman.setVelocityY(-jumpPower);
      }
      
      // Track if player is moving horizontally
      
      // Only process movement and animations if not shooting
      if (!this.playerData.isShooting && this.keys) {
        // Move left (A)
        if (this.keys.a.isDown) {
          this.ironman.setVelocityX(-speed);
          this.ironman.setFlipX(true); // Flip the sprite horizontally
          
          // Force running animation when moving on ground
          if (onGround && this.ironman.anims.currentAnim.key !== 'running') {
            this.ironman.anims.play('running', true);
          }
          // When in air but moving, we should show running animation too
          else if (!onGround && this.ironman.anims.currentAnim.key !== 'running') {
            // Only change to running if we're not already playing it
            this.ironman.anims.play('running', true);
          }
        }
        // Move right (D)
        else if (this.keys.d.isDown) {
          this.ironman.setVelocityX(speed);
          this.ironman.setFlipX(false); // Reset the sprite flip
          
          // Force running animation when moving on ground
          if (onGround && this.ironman.anims.currentAnim.key !== 'running') {
            this.ironman.anims.play('running', true);
          }
          // When in air but moving, we should show running animation too
          else if (!onGround && this.ironman.anims.currentAnim.key !== 'running') {
            this.ironman.anims.play('running', true);
          }
        }
        // Idle when not moving and on ground
        else if (onGround) {
          // Only change to idle if we're not already playing it and not moving
          if (this.ironman.anims.currentAnim.key !== 'idle' && 
              Math.abs(this.ironman.body.velocity.x) < 10) {
            this.ironman.anims.play('idle', true);
          }
        }
      }
      
      // Test losing a life with the 'L' key
      if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.l)) {
        this.loseLife();
      }
      
      // Check if player fell off the world
      if (this.ironman.y > this.cameras.main.height) {
        this.loseLife();
        this.ironman.setPosition(400, 400); // Reset position
      }
    }
    
    // Create a button for the pause menu
    Phaser.Scene.prototype.createPauseMenuButton = function(x, y, width, height, text, callback) {
      // Create button container
      const buttonContainer = this.add.container(x, y);
      buttonContainer.setDepth(201);
      buttonContainer.setScrollFactor(0);
      this.pauseMenuGroup.add(buttonContainer);
      
      // Create button background
      const buttonBg = this.add.graphics();
      buttonBg.fillStyle(0x444444, 1);
      buttonBg.fillRoundedRect(-width/2, -height/2, width, height, 10);
      buttonBg.lineStyle(2, 0x888888, 1);
      buttonBg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
      
      // Create button text
      const buttonText = this.add.text(
        0, 0,
        text, 
        { 
          fontSize: '22px',
          fontFamily: 'Impact, fantasy',
          fill: '#cccccc',
          align: 'center'
        }
      );
      buttonText.setOrigin(0.5);
      
      // Add to container - simplified to just background and text
      buttonContainer.add(buttonBg);
      buttonContainer.add(buttonText);
      
      // Store the width and height for later reference
      buttonContainer.width = width;
      buttonContainer.height = height;
      
      // Store the callback function
      buttonContainer.callback = callback;
      
      // Make interactive
      buttonContainer.setSize(width, height);
      buttonContainer.setInteractive({ useHandCursor: true });
      
      // Add hover effect for mouse
      buttonContainer.on('pointerover', function() {
        // Update button appearance on hover
        buttonBg.clear();
        buttonBg.fillStyle(0x666666, 1);
        buttonBg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        buttonBg.lineStyle(2, 0xaaaaaa, 1);
        buttonBg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        buttonText.setScale(1.05);
      });
      
      buttonContainer.on('pointerout', function() {
        // Restore normal appearance when not hovering
        buttonBg.clear();
        buttonBg.fillStyle(0x444444, 1);
        buttonBg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        buttonBg.lineStyle(2, 0x888888, 1);
        buttonBg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        buttonText.setScale(1);
      });
      
      // Add click effect
      buttonContainer.on('pointerdown', function() {
        buttonText.y = 2;
      });
      
      buttonContainer.on('pointerup', function() {
        buttonText.y = 0;
        callback();
      });
      
      return buttonContainer;
    };
    
    // Hide the pause menu
    Phaser.Scene.prototype.hidePauseMenu = function() {
      if (this.pauseMenuGroup) {
        // Clear all UI elements
        this.pauseMenuGroup.clear(true, true);
        
        // Reset menu state
        this.pauseMenuButtons = [];
        this.gameState.inPauseMenu = false;
        
        // Remove the update event listener if it exists
        if (this.pauseSelectorHandler) {
          this.events.off('update', this.pauseSelectorHandler);
          this.pauseSelectorHandler = null;
        }
      }
    };
    
    // Update the selector position based on keyboard input
    Phaser.Scene.prototype.updateSelector = function(time) {
      if (!this.gameState.inPauseMenu || !this.pauseMenuKeys) return;
      
      // Handle Up key (move selection up)
      if (Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.up) || 
          Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.w)) {
        this.selectedButtonIndex = Math.max(0, this.selectedButtonIndex - 1);
        this.updateButtonSelection();
      }
      
      // Handle Down key (move selection down)
      if (Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.down) || 
          Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.s)) {
        this.selectedButtonIndex = Math.min(this.pauseMenuButtons.length - 1, this.selectedButtonIndex + 1);
        this.updateButtonSelection();
      }
      
      // Handle Enter/Space key (select current button)
      if (Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.enter) || 
          Phaser.Input.Keyboard.JustDown(this.pauseMenuKeys.space)) {
        // Execute the callback of the selected button
        if (this.pauseMenuButtons[this.selectedButtonIndex]) {
          this.pauseMenuButtons[this.selectedButtonIndex].callback();
        }
      }
    };
    
    // Update the visual state of all buttons based on selection
    Phaser.Scene.prototype.updateButtonSelection = function() {
      if (!this.pauseMenuButtons) return;
      
      // Update button appearances
      this.pauseMenuButtons.forEach((button, index) => {
        const isSelected = index === this.selectedButtonIndex;
        
        // Get button components (background and text)
        const buttonBg = button.getAt(0);
        
        // Make sure buttonBg exists before using it
        if (!buttonBg) {
          return;
        }
        
        // Update background based on selection state
        buttonBg.clear();
        
        // Selected button gets a more prominent appearance
        if (isSelected) {
          // Use solid blue color for selected button
          buttonBg.fillStyle(0x3366ff, 1);
          buttonBg.fillRoundedRect(-button.width/2, -button.height/2, button.width, button.height, 10);
          buttonBg.lineStyle(3, 0xaaddff, 1);
          buttonBg.strokeRoundedRect(-button.width/2, -button.height/2, button.width, button.height, 10);
        } else {
          // Non-selected button gets a more subdued appearance
          buttonBg.fillStyle(0x444444, 1);
          buttonBg.fillRoundedRect(-button.width/2, -button.height/2, button.width, button.height, 10);
          buttonBg.lineStyle(2, 0x888888, 1);
          buttonBg.strokeRoundedRect(-button.width/2, -button.height/2, button.width, button.height, 10);
        }
        
        // Get button text - should be at index 1
        const buttonText = button.getAt(1);
        
        // Make sure buttonText exists before using it
        if (!buttonText) {
          return;
        }
        
        // Update text based on selection state
        if (isSelected) {
          buttonText.setScale(1.1);
          buttonText.setColor('#ffffff');
        } else {
          buttonText.setScale(1);
          buttonText.setColor('#cccccc');
        }
      });
    };
    
    // Cleanup function to destroy the game when component unmounts
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

export default Game; 