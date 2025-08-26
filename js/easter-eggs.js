
// Group overlays + persistent backdrops
(function(){
    // ensure overlay container
    function ensureFxOverlay(){
      let fx = document.getElementById('fxGroup');
      if(!fx){
        fx = document.createElement('div');
        fx.id = 'fxGroup';
        document.body.appendChild(fx);
      }
      return fx;
    }
    // ensure persistent background container
    function ensureFxBackdrop(){
      let bg = document.getElementById('groupBg');
      if(!bg){
        bg = document.createElement('div');
        bg.id = 'groupBg';
        bg.className = 'egg-backdrop';
        document.body.insertBefore(bg, document.body.firstChild);
      }
      return bg;
    }
  
    const GROUP_EGGS = {
      'the-jews':            { cls: 'egg-the-jews', label: 'The Jews ✡️', emoji: '✡️' },
      'churchill-baseball':  { cls: 'egg-churchill-baseball', label: 'Churchill Baseball ⚾', emoji: '⚾' },
      'blue-bloods':         { cls: 'egg-blue-bloods', label: 'Blue Bloods 👑', emoji: '👑' },
      'commish':             { cls: 'egg-commish', label: 'Commish 🔨', emoji: '🔨' },
      'fathers':             { cls: 'egg-fathers', label: 'Fathers 👶', emoji: '🍼' },
      'hoosiers':            { cls: 'egg-hoosiers', label: 'Hoosiers 🏀', emoji: '🏀' },
      'married':             { cls: 'egg-married', label: 'Married 💍', emoji: '💖' },
      'birthday-boys':       { cls: 'egg-birthday-boys', label: 'Birthday Boys 🎂', emoji: '🎈' },
      'former-champions':    { cls: 'egg-former-champions', label: 'Former Champions 🏆', emoji: '🏆' },
      'educated':            { cls: 'egg-educated', label: 'Educated 🎓', emoji: '🎓' },
      'birds-clinch':        { cls: 'egg-birds-clinch', label: 'CLINCHED', emoji: '🐦' },
      'sec':                 { cls: 'egg-sec', label: 'SEC 🏈', emoji: '🏈' },
      // "pairs" treated as groups for visuals
      'nuss-rishi':          { cls: 'egg-terps', label: 'Terps 🐢', emoji: '🐢' },
      'singer-nuss':         { cls: 'egg-butter-bowl', label: 'Butter Bowl 🧈', emoji: '🧈' }
    };
  
    // one-shot celebratory overlay
    window.triggerGroupEgg = function(slug){
      const egg = GROUP_EGGS[slug]; if(!egg) return;
      const fx = ensureFxOverlay();
      const ov = document.createElement('div');
      ov.className = 'egg-overlay ' + egg.cls;
  
      const lbl = document.createElement('div');
      lbl.className = (slug === 'birds-clinch') ? 'clinch-stamp' : 'egg-label';
      lbl.textContent = egg.label || slug;
      ov.appendChild(lbl);
  
      fx.appendChild(ov);
      setTimeout(()=>{ ov.classList.add('hide'); setTimeout(()=>ov.remove(), 600); }, 2200);
    };
  
    // persistent animated background (until changed/cleared)
    window.setGroupBackdrop = function(slugOrNull){
      const bg = ensureFxBackdrop();
      // reset classes and contents
      bg.className = 'egg-backdrop';
      bg.innerHTML = '';
      document.body.classList.remove('group-active');
  
      if(!slugOrNull){ return; }
  
      const egg = GROUP_EGGS[slugOrNull];
      const cls = egg ? egg.cls : null;
      if(cls){
        // add a stable class per group
        bg.classList.add('bg-'+slugOrNull);
        document.body.classList.add('group-active');
        // add a handful of floating emoji for flash
        const emo = egg.emoji || '✨';
        for(let i=0;i<14;i++){
          const e = document.createElement('i');
          e.className = 'float';
          e.textContent = emo;
          e.style.left = (Math.random()*100)+'vw';
          e.style.animationDelay = (Math.random()*2)+'s';
          e.style.fontSize = (28 + Math.random()*20) + 'px';
          bg.appendChild(e);
        }
      }
    };
  })();