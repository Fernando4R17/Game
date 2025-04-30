import Phaser from 'phaser';

class Menu {
  constructor(scene) {
    this.scene = scene;
    this.menuElements = [];
    this.pauseMenuGroup = null;
    this.pauseMenuButtons = [];
    this.selectedButtonIndex = 0;
  }
  
  showStartMenu() {
    // Set menu state
    this.scene.gameState.inStartMenu = true;
    
    // Reset camera position to be sure
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.setScroll(0, 0);
      this.scene.cameras.main.update(0, 0);
    }
    
    // Make sure any previous menu elements are gone
    this.clearMenuElements();
    
    // Create semi-transparent overlay with gradient effect
    const overlay = this.scene.add.rectangle(
      0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height,
      0x222222, 0.8
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(100);
    
    // Add simple background effects
    const bgEffects = this.scene.add.group();
    
    // Create 20 small glowing dots
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(50, this.scene.cameras.main.width - 50);
      const y = Phaser.Math.Between(50, this.scene.cameras.main.height - 50);
      const size = Phaser.Math.Between(3, 8);
      
      const dot = this.scene.add.circle(x, y, size, 0xcccccc, 0.7);
      dot.setDepth(101);
      dot.setScrollFactor(0); // Ensure it's fixed to camera
      
      // Add glow animation
      this.scene.tweens.add({
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
    
    // Add game title
    const titleText = this.scene.add.text(
      this.scene.cameras.main.width / 2, 
      this.scene.cameras.main.height / 3,
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
    
    // Add title animation
    titleText.setOrigin(0.5);
    titleText.setScrollFactor(0);
    titleText.setDepth(102);
    titleText.alpha = 0;
    
    // Dramatic entrance for the title
    this.scene.tweens.add({
      targets: titleText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 1000,
      ease: 'Bounce.Out'
    });
    
    // Add a start button
    const buttonContainer = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2
    );
    buttonContainer.setDepth(102);
    buttonContainer.setScrollFactor(0);
    
    // Create button background
    const buttonBg = this.scene.add.graphics();
    buttonBg.fillStyle(0x3366ff, 1);
    buttonBg.fillRoundedRect(-110, -30, 220, 60, 30);
    
    // Add metallic border
    buttonBg.lineStyle(4, 0x88ccff, 1);
    buttonBg.strokeRoundedRect(-110, -30, 220, 60, 30);
    
    // Add inner glow
    const buttonGlow = this.scene.add.graphics();
    buttonGlow.fillGradientStyle(
      0x4477ff, 0x4477ff, 0x0033cc, 0x0033cc, 1
    );
    buttonGlow.fillRoundedRect(-100, -25, 200, 50, 25);
    
    // Add button text
    const buttonText = this.scene.add.text(
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
    
    // Remove any existing event listeners
    buttonContainer.removeAllListeners('pointerdown');
    buttonContainer.removeAllListeners('pointerup');
    
    // Add click animation
    buttonContainer.on('pointerdown', () => {
      buttonText.y = 2;
      this.scene.tweens.add({
        targets: buttonContainer,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100
      });
    });
    
    buttonContainer.on('pointerup', () => {
      buttonText.y = 0;
      this.scene.tweens.add({
        targets: buttonContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        onComplete: () => {
          if (typeof this.scene.startGame === 'function') {
            this.scene.startGame();
          }
        }
      });
    });
    
    // Add "Press ENTER to start" text
    const enterText = this.scene.add.text(
      this.scene.cameras.main.width / 2, 
      this.scene.cameras.main.height / 2 + 70,
      'Press ENTER to deploy', 
      { 
        fontSize: '18px',
        fontFamily: 'Verdana, sans-serif',
        fill: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center'
      }
    );
    enterText.setOrigin(0.5);
    enterText.setScrollFactor(0);
    enterText.setDepth(102);
    
    // Pulse animation for the "press ENTER" text
    this.scene.tweens.add({
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
  }
  
  hideStartMenu() {
    if (this.menuElements) {
      this.menuElements.forEach(element => {
        if (element) element.setVisible(false);
      });
    }
    this.scene.gameState.inStartMenu = false;
  }
  
  clearMenuElements() {
    if (this.menuElements) {
      this.menuElements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      this.menuElements = [];
    }
  }
  
  showPauseMenu() {
    // Set menu state
    this.scene.gameState.isPaused = true;
    this.scene.gameState.inPauseMenu = true;
    
    // Create pause menu group to manage all menu elements
    this.pauseMenuGroup = this.scene.add.group();
    
    // Create semi-transparent overlay for pause menu
    const overlay = this.scene.add.rectangle(
      0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height,
      0x000000, 0.7
    );
    overlay.setOrigin(0, 0);
    overlay.setScrollFactor(0);
    overlay.setDepth(200);
    this.pauseMenuGroup.add(overlay);
    
    // Add pause menu title
    const pauseTitle = this.scene.add.text(
      this.scene.cameras.main.width / 2, 
      this.scene.cameras.main.height / 4,
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
    const buttonSpacing = 90;
    const buttonY = this.scene.cameras.main.height / 2;
    const buttonWidth = 200;
    const buttonHeight = 50;
    
    // Create pause menu buttons
    this.pauseMenuButtons = [];
    
    // RESUME button
    const resumeButton = this.createPauseMenuButton(
      this.scene.cameras.main.width / 2, 
      buttonY - buttonSpacing/2,
      buttonWidth, 
      buttonHeight, 
      'RESUME', 
      () => {
        if (typeof this.scene.resumeGame === 'function') {
          this.scene.resumeGame();
        }
      }
    );
    this.pauseMenuButtons.push(resumeButton);
    
    // MAIN MENU button
    const mainMenuButton = this.createPauseMenuButton(
      this.scene.cameras.main.width / 2, 
      buttonY + buttonSpacing/2,
      buttonWidth, 
      buttonHeight, 
      'MAIN MENU', 
      () => {
        if (typeof this.scene.returnToMainMenu === 'function') {
          this.scene.returnToMainMenu();
        }
      }
    );
    this.pauseMenuButtons.push(mainMenuButton);
    
    // Initialize selected button index
    this.selectedButtonIndex = 0;
    
    // Update the visual state of all buttons
    this.updateButtonSelection();
    
    // Set up keyboard controls for selector
    this.pauseMenuKeys = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
    
    // Add instructions
    const instructions = this.scene.add.text(
      this.scene.cameras.main.width / 2, 
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
    this.scene.events.on('update', this.pauseSelectorHandler);
  }
  
  createPauseMenuButton(x, y, width, height, text, callback) {
    // Create button container
    const buttonContainer = this.scene.add.container(x, y);
    buttonContainer.setDepth(201);
    buttonContainer.setScrollFactor(0);
    this.pauseMenuGroup.add(buttonContainer);
    
    // Create button background
    const buttonBg = this.scene.add.graphics();
    buttonBg.fillStyle(0x444444, 1);
    buttonBg.fillRoundedRect(-width/2, -height/2, width, height, 10);
    buttonBg.lineStyle(2, 0x888888, 1);
    buttonBg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    
    // Create button text
    const buttonText = this.scene.add.text(
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
    
    // Add to container
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
  }
  
  hidePauseMenu() {
    if (this.pauseMenuGroup) {
      // Clear all UI elements
      this.pauseMenuGroup.clear(true, true);
      
      // Reset menu state
      this.pauseMenuButtons = [];
      this.scene.gameState.inPauseMenu = false;
      
      // Remove the update event listener if it exists
      if (this.pauseSelectorHandler) {
        this.scene.events.off('update', this.pauseSelectorHandler);
        this.pauseSelectorHandler = null;
      }
    }
  }
  
  updateSelector(time) {
    if (!this.scene.gameState.inPauseMenu || !this.pauseMenuKeys) return;
    
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
  }
  
  updateButtonSelection() {
    if (!this.pauseMenuButtons) return;
    
    // Update button appearances
    this.pauseMenuButtons.forEach((button, index) => {
      const isSelected = index === this.selectedButtonIndex;
      
      // Get button components (background and text)
      const buttonBg = button.getAt(0);
      
      // Skip if buttonBg doesn't exist
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
      
      // Get button text
      const buttonText = button.getAt(1);
      
      // Skip if buttonText doesn't exist
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
  }
  
  destroy() {
    // Clear start menu elements
    this.clearMenuElements();
    
    // Clear pause menu
    this.hidePauseMenu();
  }
}

export default Menu; 