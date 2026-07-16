/**
 * Mobile Back Button Handler — Max Heights Majestic Inspection
 *
 * Behaviour:
 *   1. If a photo lightbox or a modal/sheet is open, back closes it.
 *   2. Otherwise, back takes the user to the previous in-app page.
 *   3. At the root/home screen (nothing left to go back to), back shows
 *      a confirmation dialog before actually exiting the app.
 *
 * This app has no client-side router — state.view changes via goto(),
 * direct assignment, role switches, member login, etc. Rather than hook
 * every one of those call sites individually, this wraps render() itself:
 * any navigation only ever becomes visible once render() runs, so diffing
 * state.view before/after each render reliably catches every navigation
 * no matter how it happened. Each detected navigation pushes a fresh
 * browser history entry ("arms" it) so the next physical back press
 * always has something to intercept, instead of running out of history
 * and letting the OS close the app outright.
 */
(function(){
  var viewStack = ['home'];
  var lastSeenView = 'home';
  var exiting = false; // true once the user has confirmed Exit
  var primed = false; // true once the first real render() has told us the actual starting view

  // A modal is open exactly when index.html's renderModalLayer() has put
  // something into #modalLayer — every branch there ends with
  // `layer.innerHTML = someModal(); return;`, and the one fallback path
  // (nothing open) clears it to ''. Checking the DOM directly like this
  // means back correctly closes any modal that exists today AND any
  // modal added later, with no separate list here to remember to update.
  function isModalOpen(){
    var layer = document.getElementById('modalLayer');
    return !!(layer && layer.innerHTML && layer.innerHTML.trim());
  }

  // Push a fresh history entry so there's always one to "consume" on the
  // next back press — same URL, just a new state marker.
  function arm(){
    try{ history.pushState({mhmGuard:true, ts:Date.now()}, '', window.location.href); }catch(e){}
  }

  function goExit(){
    exiting = true;
    // The popstate that triggered the exit-confirm already moved the
    // browser back one step; go one more. A PWA opened from the home
    // screen normally starts with a single history entry, so there is
    // nothing left before it and the OS closes the app right here.
    try{ history.back(); }catch(e){}
  }

  function requestExit(){
    arm(); // absorb this back press so the UI stays on the home screen underneath the dialog
    if(typeof window.askConfirm==='function'){
      window.askConfirm({
        title: 'Exit app?',
        message: 'Are you sure you want to exit Max Heights Majestic Inspection?',
        confirmLabel: 'Exit',
        danger: false,
        onConfirm: goExit
      });
    } else if(window.confirm('Exit Max Heights Majestic Inspection?')){
      goExit();
    }
  }

  function goToPreviousPage(){
    viewStack.pop();
    var prev = viewStack[viewStack.length-1] || 'home';
    try{
      // index.html declares its app state as `let state = {...}` — a
      // top-level let/const never becomes a window property, only a
      // plain top-level var/function does. render(), closeModals(),
      // closeLightbox() and askConfirm() are all declared with `function`,
      // so window.render etc. work fine — but `state` only exists as the
      // bare identifier below (both files are classic <script>s sharing
      // one global scope, so this resolves correctly at call time).
      var s = state;
      if(s){
        s.view = prev;
        s._isNavigating = true;
        lastSeenView = prev;
        if(typeof window.render==='function') window.render();
        if(typeof window.scrollTo==='function') window.scrollTo(0,0);
      }
    } finally {
      arm();
    }
  }

  function handleBack(){
    if(exiting) return;
    var s = state;
    if(!s){ return; }

    // Photo lightbox has its own dedicated close function.
    if(s._lightbox){
      try{ if(typeof window.closeLightbox==='function') window.closeLightbox(); }
      finally{ arm(); }
      return;
    }
    // Urgent task popup is deliberately sticky in this app (tapping
    // outside it doesn't close it either) — back shouldn't either.
    if(s._taskPopup){
      arm();
      return;
    }
    if(isModalOpen()){
      try{ if(typeof window.closeModals==='function') window.closeModals(); }
      finally{ arm(); }
      return;
    }
    if(viewStack.length>1){ goToPreviousPage(); return; }
    requestExit();
  }

  // Detect navigation after every render — this covers goto(), direct
  // state.view assignment, setRole(), member login, everything, without
  // needing every one of those call sites to announce itself.
  function wrapRender(){
    if(typeof window.render!=='function') return false;
    if(window.render.__mhmWrapped) return true;
    var original = window.render;
    var wrapped = function(){
      var out = original.apply(this, arguments);
      var s = state;
      if(s && s.view){
        // init() has to guess the starting view before login/auth (async)
        // resolves, so it can be wrong — e.g. a vendor/worker account ends
        // up on 'mydefects', not the 'home' default init() saw first. The
        // first real render is ground truth: adopt it as the stack's root
        // instead of treating it as a navigation away from a guessed page
        // the user never actually saw.
        if(!primed){
          primed = true;
          lastSeenView = s.view;
          viewStack = [s.view];
        } else if(s.view!==lastSeenView){
          if(viewStack[viewStack.length-1]!==s.view){
            viewStack.push(s.view);
          }
          lastSeenView = s.view;
          arm();
        }
      }
      return out;
    };
    wrapped.__mhmWrapped = true;
    window.render = wrapped;
    return true;
  }

  function isIOS(){ return /iPhone|iPad|iPod/.test(navigator.userAgent); }
  function setupIOSBackSwipe(){
    if(!isIOS()) return;
    var touchStartX = 0;
    document.addEventListener('touchstart', function(e){ touchStartX = e.touches[0].clientX; }, false);
    document.addEventListener('touchend', function(e){
      var touchEndX = e.changedTouches[0].clientX;
      if(touchStartX<50 && touchEndX>100) handleBack();
    }, false);
  }

  function init(){
    var s = state;
    lastSeenView = (s && s.view) || 'home';
    viewStack = [lastSeenView];
    if(!wrapRender()) setTimeout(wrapRender, 300);
    arm();
    setupIOSBackSwipe();
    console.log('✓ Back button handler initialized');
  }

  window.addEventListener('popstate', function(e){
    try{ handleBack(); }catch(err){ console.error('Back button handler error:', err); }
  });

  init();
})();
