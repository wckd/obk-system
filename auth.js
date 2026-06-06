// auth.js - Håndterer pålogging med Supabase Auth

// Laster inn data-modulene etter bekreftet pålogging. Dette er ENESTE
// stedet modulene skal lastes ved oppstart — datalasting før innlogging
// ville lagt alt i DOM-en bak en ren CSS-skjuling (display:none).
// Bordleie er default-modul, så polling startes her også (idempotent).
function lastModulerEtterPålogging() {
    if (typeof startBordPolling === 'function') startBordPolling();
    if (typeof loadTables === 'function') loadTables();
    if (typeof updateMemberModule === 'function') updateMemberModule();
    if (typeof loadLockers === 'function') loadLockers();
}

// Sjekker om bruker er pålogget ved sidelasting
async function sjekkPålogget() {
    try {
        const { data: { session } } = await window.sb.auth.getSession();

        if (session) {
            // Bruker er pålogget
            document.body.classList.add('logged-in');
            document.body.classList.remove('logged-out');
            startPåloggetSession();
            lastModulerEtterPålogging();
        } else {
            // Bruker er ikke pålogget
            document.body.classList.add('logged-out');
            document.body.classList.remove('logged-in');
        }
    } catch (err) {
        console.error('Feil ved sjekk av pålogging:', err);
        document.body.classList.add('logged-out');
        document.body.classList.remove('logged-in');
    }
}

// Starter pålogget sesjon (setter timer)
function startPåloggetSession() {
    // Fjern eventuelle gamle timere
    if (window.authTimer) clearInterval(window.authTimer);
    if (window.authTimeout) clearTimeout(window.authTimeout);
    
    // Auto-logout etter 2 timer
    window.authTimeout = setTimeout(() => {
        loggUt();
    }, 2 * 60 * 60 * 1000);
    
    
}

// Logger ut
async function loggUt() {
    // Rydd opp timere
    if (window.authTimer) clearInterval(window.authTimer);
    if (window.authTimeout) clearTimeout(window.authTimeout);

    try {
        // Logg ut fra Supabase
        const { error } = await window.sb.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error('Feil ved utlogging:', err);
        // signOut feilet (f.eks. nettverksfeil) — da ligger sesjons-tokenet
        // fortsatt i localStorage, og sjekkPålogget() ville logget brukeren
        // stille inn igjen etter reload. Fjern Supabase-nøklene eksplisitt
        // så utlogging aldri feiler åpent.
        Object.keys(localStorage)
            .filter(k => k.startsWith('sb-') && k.includes('-auth-token'))
            .forEach(k => localStorage.removeItem(k));
    }

    // Last om siden for å vise påloggingsskjerm.
    window.location.reload();
}


// Setter opp login-knapp
function setupLogin() {
    const loginBtn = document.getElementById('login-btn');
    if (!loginBtn) {
        console.log('Login button not found yet, waiting...');
        return;
    }
    
    // Fjern gamle event listeners (ved å klone)
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        if (!password) {
            errorDiv.innerText = 'Vennligst skriv inn passord';
            errorDiv.style.display = 'block';
            return;
        }
        
        errorDiv.style.display = 'none';
        
        try {
            const { data, error } = await window.sb.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Logget inn
            document.body.classList.add('logged-in');
            document.body.classList.remove('logged-out');
            startPåloggetSession();
            
            // Nullstill passordfelt
            document.getElementById('login-password').value = '';
            errorDiv.style.display = 'none';

            lastModulerEtterPålogging();

        } catch (err) {
            console.error('Login error:', err);
            errorDiv.innerText = err.message || 'Feil e-post eller passord';
            errorDiv.style.display = 'block';
        }
    });

    setupPasswordToggle();
    setupEnterKey();
}

// Setter opp toggle for vis/skjul passord
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');
    
    if (!toggleBtn || !passwordInput) return;
    
    toggleBtn.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.innerText = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.innerText = '👁️';
        }
    });
}

// Setter opp Enter-tast på passordfeltet
function setupEnterKey() {
    const passwordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    
    if (!passwordInput || !loginBtn) return;
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loginBtn.click();
        }
    });
}

// Initialiser auth – kjør med en gang
function initAuth() {
    if (document.readyState === 'loading') {
        window.addEventListener('load', () => {
            setupLogin();
            sjekkPålogget();
        });
    } else {
        setupLogin();
        sjekkPålogget();
    }
}

// Start
initAuth();