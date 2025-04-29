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
        console.error('Error loading asset:', fileObj.src);
      });
    }
    
    // Create game objects
    function create() {
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
      
      // Create bullet group
      this.bullets = this.physics.add.group({
        defaultKey: 'blast',
        maxSize: 10 // Maximum number of bullets on screen at once
      });
      
      // Create HUD for lives display
      this.createHUD();
      
      // Set up the Enter key for restarting the game
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      
      // Create player character and set up the level
      this.createPlayer(platformY);
    }
    
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
          
          console.log('Ironman created successfully');
          
          // Create character animations with proper frame counts
          try {
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
            console.log('Animations created');
            
            // Add animation complete listener for death animation
            this.ironman.on('animationcomplete-death', function() {
              // Animation has completed - character stays on last frame
              console.log('Death animation completed');
            });
            
            // Add animation complete listener for shooting animation
            this.ironman.on('animationcomplete-shooting', function(animation, frame) {
              console.log('Shooting animation completed');
              // Set shooting flag to false to allow movement again
              if (this.scene) {
                this.scene.playerData.isShooting = false;
                // Force idle animation when shooting completes
                this.anims.play('idle', true);
              }
            });
            
            // Log animation info for debugging
            console.log('Idle animation frames:', this.anims.get('idle').frames.length);
            console.log('Running animation frames:', this.anims.get('running').frames.length);
            console.log('Shooting animation frames:', this.anims.get('shooting').frames.length);
            console.log('Death animation frames:', this.anims.get('death').frames.length);
          } catch (animError) {
            console.error('Error creating animations:', animError);
          }
          
          // Add collision between ironman and the ground platforms
          this.physics.add.collider(this.ironman, this.physics.world.staticBodies);
          
          // Set up keyboard input
          this.cursors = this.input.keyboard.createCursorKeys();
          
          // Add A, D, W keys for movement and E for shooting
          this.keys = this.input.keyboard.addKeys({
            a: Phaser.Input.Keyboard.KeyCodes.A,
            d: Phaser.Input.Keyboard.KeyCodes.D,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            e: Phaser.Input.Keyboard.KeyCodes.E, // E key for shooting
            l: Phaser.Input.Keyboard.KeyCodes.L // L key to lose a life (for testing)
          });
          
          // Set camera to follow the player, bounded by the background dimensions
          const bgWidth = this.physics.world.bounds.width;
          const bgHeight = this.physics.world.bounds.height;
          this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
          this.cameras.main.startFollow(this.ironman, true, 0.1, 0.1);
          
          // No zoom - normal size
          this.cameras.main.setZoom(1);
        }
      } catch (error) {
        console.error('Error creating ironman:', error);
      }
    };
    
    // Shoot a blast
    Phaser.Scene.prototype.shoot = function() {
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
          
          // Destroy the bullet after half a second
          this.time.delayedCall(300, function() {
            // Add a small fade-out effect before destroying
            this.tweens.add({
              targets: bullet,
              alpha: 0,
              scale: 0.8,
              duration: 100,
              onComplete: function() {
                bullet.destroy();
              }
            });
          }, [], this);
          
          // Add a blue muzzle flash effect - also update the flash position
          const flash = this.add.circle(this.ironman.x + offsetX, this.ironman.y + offsetY, 15, 0x1a75ff, 0.8);
          flash.setDepth(3); // Above character
          
          // Fade out the flash
          this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 100,
            onComplete: function() { flash.destroy(); }
          });
        } catch (error) {
          console.error('Error creating bullet:', error);
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
    
    // Restart the game
    Phaser.Scene.prototype.restartGame = function() {
      // Reset player data
      this.playerData.lives = this.playerData.maxLives;
      this.playerData.isGameOver = false;
      this.playerData.isPlayingDeathAnimation = false;
      
      // Clear any active bullets
      this.bullets.clear(true, true);
      
      // Update the lives display
      this.updateLivesDisplay();
      
      // Remove the old player
      if (this.ironman) {
        this.ironman.destroy();
      }
      
      // Remove any game over text
      this.children.list
        .filter(child => child.type === 'Text')
        .forEach(text => text.destroy());
      
      // Create a new player
      const platformY = this.physics.world.bounds.height;
      this.createPlayer(platformY);
      
      // Resume physics
      this.physics.resume();
      
      console.log('Game restarted');
    };
    
    // Update game state
    function update() {
      // Check for restart with Enter key after game over
      if (this.playerData.isGameOver && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.restartGame();
        return;
      }
      
      // Skip all player movement updates if game over or playing death animation
      if (!this.ironman || this.playerData.isGameOver || this.playerData.isPlayingDeathAnimation) return;
      
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
      if (Phaser.Input.Keyboard.JustDown(this.keys.e) && !this.playerData.isShooting) {
        this.shoot();
        return; // Exit update early to prevent other inputs during the same frame
      }
      
      // Handle jumping separately to ensure it gets priority
      // Jump (W) - only allow jumping if on the ground and not shooting
      if (this.keys.w.isDown && onGround && !this.playerData.isShooting) {
        console.log("Jump key pressed, onGround:", onGround);
        this.ironman.setVelocityY(-jumpPower);
      }
      
      // Only process movement and animations if not shooting
      if (!this.playerData.isShooting) {
        // Move left (A)
        if (this.keys.a.isDown) {
          this.ironman.setVelocityX(-speed);
          this.ironman.setFlipX(true); // Flip the sprite horizontally
          
          // Force running animation when moving
          if (onGround && this.ironman.anims.currentAnim.key !== 'running') {
            console.log("Playing running animation (left)");
            this.ironman.anims.play('running', true);
          }
        }
        // Move right (D)
        else if (this.keys.d.isDown) {
          this.ironman.setVelocityX(speed);
          this.ironman.setFlipX(false); // Reset the sprite flip
          
          // Force running animation when moving
          if (onGround && this.ironman.anims.currentAnim.key !== 'running') {
            console.log("Playing running animation (right)");
            this.ironman.anims.play('running', true);
          }
        }
        // Idle when not moving and on ground
        else if (onGround) {
          // Only change to idle if we're not already playing it and not moving
          if (this.ironman.anims.currentAnim.key !== 'idle' && 
              Math.abs(this.ironman.body.velocity.x) < 10) {
            console.log("Playing idle animation");
            this.ironman.anims.play('idle', true);
          }
        }
      }
      
      // Log key states for debugging
      if (Phaser.Input.Keyboard.JustDown(this.keys.w)) {
        console.log("W key pressed, onGround:", onGround, "isShooting:", this.playerData.isShooting);
      }
      
      // Test losing a life with the 'L' key
      if (Phaser.Input.Keyboard.JustDown(this.keys.l)) {
        this.loseLife();
      }
      
      // Check if player fell off the world
      if (this.ironman.y > this.cameras.main.height) {
        this.loseLife();
        this.ironman.setPosition(400, 400); // Reset position
      }
    }
    
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