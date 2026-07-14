/**
 * Mobile Back Button Handler for PWA
 * Prevents app closure and enables proper navigation
 */

class MobileBackButtonHandler {
  constructor() {
    this.navigationStack = [];
    this.currentPage = 'home';
    this.isAppStartup = true;
    this.init();
  }

  init() {
    // Handle popstate (back button pressed)
    window.addEventListener('popstate', (e) => this.handleBackButton(e));
    
    // Prevent default app closure
    window.addEventListener('beforeunload', (e) => this.preventClose(e));
    
    // Initial state
    this.pushHistory('home');
    
    // For iOS: intercept back swipe
    if (this.isIOS()) {
      this.setupIOSBackSwipe();
    }
    
    console.log('✓ Back button handler initialized');
  }

  /**
   * Track navigation to specific page
   */
  navigateTo(pageName, skipHistory = false) {
    if (pageName === this.currentPage && !skipHistory) {
      return; // Don't re-push same page
    }
    
    this.currentPage = pageName;
    
    if (!skipHistory) {
      this.pushHistory(pageName);
    }
  }

  /**
   * Push page to navigation stack
   */
  pushHistory(pageName) {
    if (this.navigationStack[this.navigationStack.length - 1] !== pageName) {
      this.navigationStack.push(pageName);
    }
    
    // Update browser history
    history.pushState(
      { 
        page: pageName, 
        stack: this.navigationStack.slice(),
        timestamp: Date.now() 
      },
      pageName,
      window.location.href
    );
  }

  /**
   * Go back to previous page
   */
  goBack() {
    if (this.navigationStack.length <= 1) {
      // Already at home - don't close, stay in app
      this.currentPage = 'home';
      this.triggerPageChange('home');
      return false;
    }

    // Remove current page
    this.navigationStack.pop();
    
    // Get previous page
    const previousPage = this.navigationStack[this.navigationStack.length - 1] || 'home';
    this.currentPage = previousPage;
    
    // Navigate to previous page
    this.triggerPageChange(previousPage);
    
    return true;
  }

  /**
   * Handle back button press
   */
  handleBackButton(event) {
    event.preventDefault();
    
    if (event.state && event.state.page) {
      const targetPage = event.state.page;
      this.currentPage = targetPage;
      this.navigationStack = event.state.stack || [targetPage];
      this.triggerPageChange(targetPage);
    } else {
      this.goBack();
    }
  }

  /**
   * Trigger page change in your app
   * Override this based on your app's structure
   */
  triggerPageChange(pageName) {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pageChanged', { 
      detail: { page: pageName } 
    }));
    
    // Call your render function if it exists
    if (typeof window.render === 'function') {
      window.render();
    }
    
    // Or update state and render
    if (typeof window.state !== 'undefined') {
      window.state.currentPage = pageName;
      if (typeof window.render === 'function') {
        window.render();
      }
    }
  }

  /**
   * Prevent app from closing
   */
  preventClose(event) {
    // For PWAs, this helps prevent accidental closure
    if (this.isAppMode()) {
      // Silently prevent the default behavior
      return;
    }
  }

  /**
   * Setup iOS back swipe handling
   */
  setupIOSBackSwipe() {
    let touchStartX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, false);

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      
      // Swipe from left edge (back gesture)
      if (touchStartX < 50 && touchEndX > 100) {
        this.goBack();
      }
    }, false);
  }

  /**
   * Check if running in standalone app mode
   */
  isAppMode() {
    return window.navigator.standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Check if iOS device
   */
  isIOS() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent);
  }

  /**
   * Get current page
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Get navigation history
   */
  getHistory() {
    return this.navigationStack.slice();
  }

  /**
   * Reset history (useful on logout)
   */
  resetHistory() {
    this.navigationStack = ['home'];
    this.currentPage = 'home';
    this.pushHistory('home');
  }
}

// Initialize globally
window.backButtonHandler = new MobileBackButtonHandler();

// Custom event listener for page changes in your app
window.addEventListener('pageChanged', (e) => {
  console.log('📄 Page changed to:', e.detail.page);
  // Your app's page change logic here
});
