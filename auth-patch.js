// ===== LEGEND BARTENDING — MULTI-USER AUTH PATCH =====
// This script replaces the single-password login with Supabase multi-user auth.
// Include this file just before </body> in index.html.

(function() {
  const SUPABASE_URL = 'https://dcydmngafvdhxxjptexh.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeWRtbmdhZnZkaHh4anB0ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTIxNzcsImV4cCI6MjA5NjA2ODE3N30.bqSr83R3PGNNJN0FlFTjwGJyXOFz6RMlge95HquCw3E';
  const ADMIN_EMAIL  = 'aerubio1@yahoo.com';
  const STORAGE_KEY  = 'legend_cocktail_cost_menu_builder_v25_ppt_import';

  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let currentUser = null;
  let _authMode = 'signin';

  // ===== INJECT STYLES =====
  const style = document.createElement('style');
  style.textContent = `
    .login-tabs { display:flex; background:#f1f3f5; border-radius:8px; padding:3px; margin-bottom:20px; }
    .login-tab { flex:1; padding:8px; border:none; border-radius:6px; background:transparent; color:#8492a6; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; }
    .login-tab.active { background:#0070f2; color:white; }
    .loginBox input { text-align:left !important; letter-spacing:normal !important; }
    .modal-overlay { position:fixed; inset:0; z-index:8000; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; }
    .modal-overlay.hidden { display:none !important; }
    .modal-box { background:#fff; border-radius:16px; padding:32px; min-width:360px; max-width:440px; width:100%; box-shadow:0 8px 40px rgba(0,0,0,.2); }
    .modal-box h3 { font-size:18px; font-weight:700; color:#1d2b3a; margin-bottom:6px; }
    .modal-user-email { font-size:13px; color:#8492a6; margin-bottom:20px; }
    .modal-section { border-top:1px solid #e0e3e8; margin-top:20px; padding-top:16px; }
    .modal-section h4 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8492a6; margin-bottom:10px; }
    .modal-input { width:100%; padding:9px 12px; border:1px solid #c8cdd6; border-radius:6px; font-size:14px; font-family:inherit; background:#f6f7f9; color:#1d2b3a; outline:none; margin-bottom:8px; }
    .modal-input:focus { border-color:#0070f2; background:#fff; }
    .modal-share-row { display:flex; gap:8px; }
    .modal-share-row .modal-input { margin-bottom:0; font-family:monospace; text-transform:uppercase; letter-spacing:.1em; }
    .modal-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
    .modal-btn { padding:9px 18px; border:none; border-radius:6px; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; }
    .modal-btn-primary { background:#0070f2; color:white; }
    .modal-btn-secondary { background:#f6f7f9; color:#4a5568; border:1px solid #e0e3e8; }
    .modal-btn-danger { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; margin-left:auto; }
    .account-topbar-btn { background:#f6f7f9; border:1px solid #e0e3e8; border-radius:6px; padding:5px 10px; font-size:12px; font-weight:600; color:#4a5568; cursor:pointer; }
    #loginError { min-height:18px; }
  `;
  document.head.appendChild(style);

  // ===== REPLACE LOGIN OVERLAY HTML =====
  window.addEventListener('DOMContentLoaded', () => {
    // Replace login box content
    const overlay = document.getElementById('loginOverlay');
    if (overlay) {
      overlay.innerHTML = `
        <div class="loginBox">
          <div class="loginLogo">L</div>
          <h2>Legend Bartending</h2>
          <p>Cocktail Cost &amp; Menu Builder</p>
          <div class="login-tabs">
            <button class="login-tab active" id="tabSignIn" onclick="patchSwitchTab('signin')">Sign In</button>
            <button class="login-tab" id="tabRegister" onclick="patchSwitchTab('register')">Create Account</button>
          </div>
          <input type="email" id="authEmail" placeholder="Email address" onkeydown="if(event.key==='Enter')patchSubmitAuth()"/>
          <input type="password" id="authPassword" placeholder="Password" onkeydown="if(event.key==='Enter')patchSubmitAuth()"/>
          <div id="authConfirmWrap" style="display:none">
            <input type="password" id="authConfirm" placeholder="Confirm password" onkeydown="if(event.key==='Enter')patchSubmitAuth()"/>
          </div>
          <button class="loginBtn" id="authSubmitBtn" onclick="patchSubmitAuth()">Sign In</button>
          <div class="loginError" id="loginError"></div>
        </div>
      `;
    }

    // Add account button to topbar actions
    const topbarActions = document.querySelector('.topbar-actions');
    if (topbarActions) {
      const btn = document.createElement('button');
      btn.className = 'account-topbar-btn';
      btn.textContent = '👤 Account';
      btn.onclick = openAccountModal;
      topbarActions.appendChild(btn);
    }

    // Inject account modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay hidden';
    modal.id = 'accountModal';
    modal.innerHTML = `
      <div class="modal-box">
        <h3>My Account</h3>
        <div class="modal-user-email" id="modalUserEmail"></div>

        <div class="modal-section">
          <h4>Change Password</h4>
          <input type="password" class="modal-input" id="newPwdInput" placeholder="New password"/>
          <input type="password" class="modal-input" id="confirmPwdInput" placeholder="Confirm new password"/>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-primary" onclick="patchChangePassword()">Update Password</button>
          </div>
        </div>

        <div class="modal-section">
          <h4>Unlock Share Key</h4>
          <p style="font-size:12px;color:#8492a6;margin-bottom:8px;">Enter a 6-character key from the administrator to access shared ingredients &amp; recipes.</p>
          <div class="modal-share-row">
            <input type="text" class="modal-input" id="shareKeyInput" maxlength="6" placeholder="ABC123"/>
            <button class="modal-btn modal-btn-primary" onclick="patchUnlockKey()">Unlock</button>
          </div>
          <div style="font-size:12px;color:#8492a6;margin-top:6px;" id="shareKeyMsg"></div>
        </div>

        <div class="modal-section" id="adminKeySection" style="display:none">
          <h4>Your Share Key (Admin)</h4>
          <p style="font-size:12px;color:#8492a6;margin-bottom:8px;">Give this 6-character key to users to share your ingredients &amp; recipes with them.</p>
          <div class="modal-share-row">
            <input type="text" class="modal-input" id="myShareKeyInput" maxlength="6" placeholder="ABC123"/>
            <button class="modal-btn modal-btn-primary" onclick="patchSaveShareKey()">Save Key</button>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:24px;">
          <button class="modal-btn modal-btn-secondary" onclick="document.getElementById('accountModal').classList.add('hidden')">Close</button>
          <button class="modal-btn modal-btn-danger" onclick="patchSignOut()">Sign Out</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Check for existing Supabase session
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        currentUser = data.session.user;
        onSignedIn();
      }
    });

    // Listen for auth changes
    sb.auth.onAuthStateChange((event, session) => {
      if (session?.user && !currentUser) {
        currentUser = session.user;
        onSignedIn();
      }
    });
  });

  // ===== AUTH FUNCTIONS =====
  window.patchSwitchTab = function(mode) {
    _authMode = mode;
    document.getElementById('tabSignIn').classList.toggle('active', mode === 'signin');
    document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
    document.getElementById('authConfirmWrap').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('authSubmitBtn').textContent = mode === 'signin' ? 'Sign In' : 'Create Account';
    document.getElementById('loginError').textContent = '';
  };

  window.patchSubmitAuth = async function() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const err = document.getElementById('loginError');
    err.style.color = '#dc2626';
    err.textContent = '';
    if (!email || !password) { err.textContent = 'Please enter email and password.'; return; }

    if (_authMode === 'register') {
      const confirm = document.getElementById('authConfirm').value;
      if (password !== confirm) { err.textContent = 'Passwords do not match.'; return; }
      const { error } = await sb.auth.signUp({ email, password });
      if (error) { err.textContent = error.message; return; }
      err.style.color = '#16a34a';
      err.textContent = 'Account created! Check your email to confirm, then sign in.';
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { err.textContent = 'Invalid email or password.'; return; }
      currentUser = data.user;
      onSignedIn();
    }
  };

  function onSignedIn() {
    document.getElementById('loginOverlay').classList.add('hidden');

    // Override sync functions to use user-specific ID
    window.syncToCloud = function() {
      if (!currentUser) return;
      clearTimeout(window._syncTimer);
      window._syncTimer = setTimeout(async () => {
        try {
          setCloudStatus('☁ Syncing…', '');
          const { error } = await sb.from('app_data').upsert({
            id: currentUser.id, user_id: currentUser.id,
            data: state, updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (error) throw error;
          setCloudStatus('☁ Synced', 'synced');
        } catch(e) {
          setCloudStatus('⚠ Sync failed', 'error');
        }
      }, 1500);
    };

    // Load user data from cloud
    sb.from('app_data').select('data,updated_at').eq('id', currentUser.id).maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && data.data) {
          const loaded = data.data;
          state = { ...state, ...loaded, units: loaded.units || state.units };
          localStorage.setItem(STORAGE_KEY + '_' + currentUser.id, JSON.stringify(state));
          setCloudStatus('☁ Synced', 'synced');
        } else {
          // Try old storage key as fallback
          setCloudStatus('☁ No cloud data', '');
        }
        render();
        renderMetrics();
      })
      .catch(() => {
        setCloudStatus('⚠ Offline', 'error');
        render();
      });

    // Override saveData to use user-specific storage key
    const _origSaveData = window.saveData;
    window.saveData = function() {
      state.lastSaved = new Date().toLocaleString();
      localStorage.setItem(STORAGE_KEY + '_' + currentUser.id, JSON.stringify(state));
      const el = document.getElementById('lastSaved');
      if (el) el.textContent = state.lastSaved;
      syncToCloud();
    };

    // Load admin share key if admin
    if (currentUser.email === ADMIN_EMAIL) {
      sb.from('share_keys').select('key').eq('owner_id', currentUser.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            const inp = document.getElementById('myShareKeyInput');
            if (inp) inp.value = data.key;
          }
        });
    }
  }

  // ===== ACCOUNT MODAL =====
  function openAccountModal() {
    if (!currentUser) return;
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    const el = document.getElementById('modalUserEmail');
    if (el) el.textContent = currentUser.email + (isAdmin ? ' — Administrator' : '');
    const adminSection = document.getElementById('adminKeySection');
    if (adminSection) adminSection.style.display = isAdmin ? 'block' : 'none';
    document.getElementById('accountModal').classList.remove('hidden');
  }
  window.openAccountModal = openAccountModal;

  window.patchChangePassword = async function() {
    const np = document.getElementById('newPwdInput').value;
    const cp = document.getElementById('confirmPwdInput').value;
    if (!np || np !== cp) { alert('Passwords do not match.'); return; }
    const { error } = await sb.auth.updateUser({ password: np });
    if (error) { alert('Error: ' + error.message); return; }
    document.getElementById('newPwdInput').value = '';
    document.getElementById('confirmPwdInput').value = '';
    alert('Password updated successfully!');
  };

  window.patchUnlockKey = async function() {
    const key = (document.getElementById('shareKeyInput').value || '').toUpperCase().trim();
    const msg = document.getElementById('shareKeyMsg');
    if (key.length !== 6) { msg.textContent = 'Key must be 6 characters.'; return; }
    const { data, error } = await sb.from('share_keys').select('owner_id').eq('key', key).maybeSingle();
    if (error || !data) { msg.textContent = '❌ Invalid key. Please check and try again.'; return; }
    await sb.from('user_unlocks').upsert({ user_id: currentUser.id, share_key: key }, { onConflict: 'user_id,share_key' });
    const { data: adminData } = await sb.from('app_data').select('data').eq('id', data.owner_id).maybeSingle();
    if (adminData?.data) {
      const ai = (adminData.data.ingredients || []).map(i => ({ ...i, _shared: true, _readOnly: true }));
      const ac = (adminData.data.cocktails || []).map(c => ({ ...c, _shared: true, _readOnly: true }));
      const myIngIds = new Set(state.ingredients.map(i => i.id));
      const myCocktailIds = new Set(state.cocktails.map(c => c.id));
      state.ingredients = [...state.ingredients, ...ai.filter(i => !myIngIds.has(i.id))];
      state.cocktails = [...state.cocktails, ...ac.filter(c => !myCocktailIds.has(c.id))];
      render();
      renderMetrics();
    }
    msg.style.color = '#16a34a';
    msg.textContent = '✅ Unlocked! Shared ingredients and recipes have been added.';
  };

  window.patchSaveShareKey = async function() {
    const key = (document.getElementById('myShareKeyInput').value || '').toUpperCase().trim();
    if (key.length !== 6) { alert('Key must be exactly 6 characters.'); return; }
    const { error } = await sb.from('share_keys').upsert({ key, owner_id: currentUser.id, label: 'Legend Bartending' }, { onConflict: 'key' });
    if (error) { alert('Error saving key: ' + error.message); return; }
    alert('Share key saved! Users can now enter "' + key + '" to access your ingredients and recipes.');
  };

  window.patchSignOut = async function() {
    await sb.auth.signOut();
    currentUser = null;
    state = { tab: 'ingredients', ingredients: [], cocktails: [], selectedCocktailId: '', menu: [], units: state.units, defaultLiquidUnit: 'oz', lastSaved: '' };
    document.getElementById('accountModal').classList.add('hidden');
    document.getElementById('loginOverlay').classList.remove('hidden');
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('loginError').textContent = '';
  };

})();
