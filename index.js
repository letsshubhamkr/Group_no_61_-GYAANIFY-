// ==========================================
// 1. FIREBASE IMPORTS & CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Fallback configuration if environment variables are not set
const fallbackConfig = {
    apiKey: "AIzaSyDSatzai-x28_Pp3KXWRxUvAmfxw-0Gupc",
    authDomain: "e-learning-d8e8c.firebaseapp.com",
    projectId: "e-learning-d8e8c",
    storageBucket: "e-learning-d8e8c.firebasestorage.app",
    messagingSenderId: "973835657295",
    appId: "1:973835657295:web:df36873f0d56771dd28a3a"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : fallbackConfig;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gyaanify-app';

// ==========================================
// 2. FIREBASE INITIALIZATION
// ==========================================
let app_firebase, auth, db;
try {
    app_firebase = initializeApp(firebaseConfig);
    auth = getAuth(app_firebase);
    db = getFirestore(app_firebase);
} catch (e) { 
    console.error("Firebase init error. Did you forget to add your Firebase config?", e); 
    // Handled missing DOM element for resources by logging error safely for this scope
}

// ==========================================
// 3. STATIC MOCK DATA (Classes)
// ==========================================
const staticData = {
    classes: [
        { id: 'c9', name: 'Class 9', icon: 'fa-book-open', desc: 'Stepping stone concepts' },
        { id: 'c10', name: 'Class 10', icon: 'fa-award', desc: 'Board exam preparation' },
        { id: 'c11', name: 'Class 11', icon: 'fa-microscope', desc: 'Stream selection & deep dive' },
        { id: 'c12', name: 'Class 12', icon: 'fa-user-graduate', desc: 'Final boards & competitive exams' }
    ]
    // Note for Future GitHub update: Add subjects and initialResources arrays back here.
};

// ==========================================
// 4. MAIN APPLICATION LOGIC (window.app)
// ==========================================
window.app = {
    // --- App State Variables ---
    user: null, 
    profile: null, 
    authMode: 'login', 

    // --- Application Initialization ---
    init: async function() {
        const yearEl = document.getElementById('year');
        if(yearEl) yearEl.textContent = new Date().getFullYear();
        
        this.renderClasses();
        
        if (!auth) return;

        await this.initAuth();

        // Listen for authentication state changes
        onAuthStateChanged(auth, async (user) => {
            this.user = user;
            if (user) {
                await this.loadActiveSession();
                this.renderClasses(); 
                // FUTURE: this.listenToResources();
            } else {
                this.profile = null;
                this.updateAuthUI();
                this.renderClasses();
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) this.showView(e.state.view, false);
        });
    },

    // ==========================================
    // 5. AUTHENTICATION MODULE (Login/Signup)
    // ==========================================
    
    // Initialize Auth (Anonymous or Custom Token)
    initAuth: async function() {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch(e) { console.error("Auth failed:", e); }
    },

    // Load user session from Firestore
    loadActiveSession: async function() {
        if (!this.user || !db) return;
        try {
            const sessionRef = doc(db, 'artifacts', appId, 'users', this.user.uid, 'session', 'current');
            const snap = await getDoc(sessionRef);
            if (snap.exists() && snap.data().email) {
                const accountRef = doc(db, 'artifacts', appId, 'public', 'data', 'accounts', snap.data().email);
                const accSnap = await getDoc(accountRef);
                if (accSnap.exists()) {
                    this.profile = accSnap.data();
                }
            }
            this.updateAuthUI();
        } catch(e) { console.error("Error loading session", e); }
    },

    // Save user session to Firestore
    saveActiveSession: async function(email) {
        try {
            const sessionRef = doc(db, 'artifacts', appId, 'users', this.user.uid, 'session', 'current');
            if (email) {
                await setDoc(sessionRef, { email: email });
            } else {
                await deleteDoc(sessionRef); 
            }
        } catch(e) { console.error(e); }
    },

    // Update the Header UI based on login status
    updateAuthUI: function() {
        const container = document.getElementById('auth-container');
        const uploadContainer = document.getElementById('upload-action-container');
        
        if(!container) return; // Guard clause just in case

        if (this.profile) {
            const isAdmin = this.profile.role === 'admin';
            const roleBadge = isAdmin ? `<span class="user-role admin-badge">Admin</span>` : `<span class="user-role">Student</span>`;
            
            container.innerHTML = `
                <div class="user-info">
                    <span class="user-name">Hi, ${this.profile.name.split(' ')[0]}</span>
                    ${roleBadge}
                </div>
                <button class="btn btn-outline btn-small" onclick="app.logout()">Logout</button>
            `;
            if(uploadContainer) uploadContainer.style.display = isAdmin ? 'block' : 'none';
        } else {
            container.innerHTML = `<button class="btn btn-primary" onclick="app.openAuthModal()">Login / Sign Up</button>`;
            if(uploadContainer) uploadContainer.style.display = 'none';
        }
    },

    // Modal Controls for Auth
    openAuthModal: function() { 
        document.getElementById('auth-form').reset();
        this.toggleAuthMode('login'); 
        document.getElementById('auth-modal').classList.add('active'); 
    },
    closeAuthModal: function() { document.getElementById('auth-modal').classList.remove('active'); },

    // Toggle between Login and Signup modes
    toggleAuthMode: function(mode) {
        this.authMode = mode;
        document.getElementById('auth-error').innerText = ''; 
        
        const signupFields = document.querySelectorAll('.signup-only');
        
        if (mode === 'login') {
            signupFields.forEach(f => f.style.display = 'none');
            document.getElementById('auth-name').removeAttribute('required');
            document.getElementById('auth-class').removeAttribute('required');
            document.getElementById('auth-mobile').removeAttribute('required');
            document.getElementById('auth-confirm-password').removeAttribute('required');
            
            document.getElementById('auth-submit-btn').innerText = 'Login';
            document.getElementById('tab-login').classList.add('active-tab');
            document.getElementById('tab-signup').classList.remove('active-tab');
        } else {
            signupFields.forEach(f => f.style.display = 'block');
            document.getElementById('auth-name').setAttribute('required', 'true');
            document.getElementById('auth-class').setAttribute('required', 'true');
            document.getElementById('auth-mobile').setAttribute('required', 'true');
            document.getElementById('auth-confirm-password').setAttribute('required', 'true');
            
            document.getElementById('auth-submit-btn').innerText = 'Sign Up';
            document.getElementById('tab-signup').classList.add('active-tab');
            document.getElementById('tab-login').classList.remove('active-tab');
        }
    },
    
    // Main Form Submission Handler (Handles both Login and Signup)
    handleAuthSubmit: async function(e) {
        e.preventDefault(); 
        const btn = document.getElementById('auth-submit-btn');
        const errorDiv = document.getElementById('auth-error');
        
        errorDiv.innerText = '';
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        btn.disabled = true;

        const email = document.getElementById('auth-email').value.trim().toLowerCase();
        const password = document.getElementById('auth-password').value;

        try {
            const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
            const accountDoc = doc(accountsRef, email);
            const snapshot = await getDoc(accountDoc);

            // --- LOGIN LOGIC ---
            if (this.authMode === 'login') {
                if (email === 'admin@gyaanify.com' && password === 'Admin@Secure!2026') {
                    const adminProfile = { 
                        name: "Platform Admin", 
                        email: email, 
                        role: "admin", 
                        createdAt: new Date().toISOString() 
                    };
                    await setDoc(accountDoc, { ...adminProfile, password: btoa(password) }, { merge: true });
                    
                    this.profile = adminProfile;
                    await this.saveActiveSession(email);
                    this.updateAuthUI(); 
                    this.closeAuthModal();
                    this.renderClasses();
                    // FUTURE: this.renderResources();
                    return; 
                }

                if (!snapshot.exists()) {
                    errorDiv.innerText = "No account found with this email. Please switch to Sign Up.";
                } else {
                    const accountData = snapshot.data();
                    if (accountData.password !== btoa(password)) {
                        errorDiv.innerText = "Incorrect email or password.";
                    } else {
                        this.profile = accountData;
                        await this.saveActiveSession(email);
                        this.updateAuthUI();
                        this.closeAuthModal();
                        this.renderClasses();
                        // FUTURE: this.renderResources();
                    }
                }
            // --- SIGNUP LOGIC ---
            } else if (this.authMode === 'signup') {
                const confirmPassword = document.getElementById('auth-confirm-password').value;
                const mobile = document.getElementById('auth-mobile').value.trim();

                if (password !== confirmPassword) {
                    errorDiv.innerText = "Passwords do not match. Please try again.";
                    btn.innerHTML = 'Sign Up';
                    btn.disabled = false;
                    return;
                }

                if (!/^\d{10}$/.test(mobile)) {
                    errorDiv.innerText = "Please enter a valid 10-digit mobile number.";
                    btn.innerHTML = 'Sign Up';
                    btn.disabled = false;
                    return;
                }

                if (snapshot.exists()) {
                    errorDiv.innerText = "This email is already registered. Please switch to Login.";
                } else {
                    const name = document.getElementById('auth-name').value;
                    const studentClass = document.getElementById('auth-class').value;
                    const role = (email === 'admin@gyaanify.com') ? 'admin' : 'user';
                    
                    const newProfile = { 
                        name, email, mobile, studentClass,
                        password: btoa(password), 
                        role, 
                        createdAt: new Date().toISOString() 
                    };
                    
                    await setDoc(accountDoc, newProfile);
                    
                    this.profile = newProfile;
                    await this.saveActiveSession(email);
                    this.updateAuthUI(); 
                    this.closeAuthModal();
                    this.renderClasses();
                    // FUTURE: this.renderResources();
                }
            }
        } catch (error) {
            console.error("Auth error:", error);
            errorDiv.innerText = "Permission Denied. Ensure your Firestore Security Rules allow read/write access.";
        } finally {
            btn.innerHTML = this.authMode === 'login' ? 'Login' : 'Sign Up';
            btn.disabled = false;
        }
    },

    // Logout Function
    logout: async function() {
        try {
            this.profile = null;
            await this.saveActiveSession(null); 
            this.updateAuthUI();
            this.renderClasses();
            // FUTURE: this.renderResources(); 
        } catch(e) { console.error("Logout error", e); }
    },

    // ==========================================
    // 6. RENDERING & UI UPDATES
    // ==========================================

    // Render Classes Grid
    renderClasses: function() {
        const container = document.getElementById('classes-container');
        if(!container) return; // Safety check
        
        container.innerHTML = ''; 
        
        let classesToShow = staticData.classes;
        
        // Show ONLY the user's class if they are a regular student
        if (this.profile && this.profile.role !== 'admin' && this.profile.studentClass) {
            classesToShow = staticData.classes.filter(cls => cls.name === this.profile.studentClass);
        }

        if (classesToShow.length === 0) {
            container.innerHTML = '<div class="empty-state">No classes available.</div>';
            return;
        }

        classesToShow.forEach(cls => {
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => this.navigate('subjects', { classId: cls.id });
            card.innerHTML = `
                <i class="fa-solid ${cls.icon} card-icon"></i>
                <h3 class="card-title">${cls.name}</h3>
                <p class="card-desc">${cls.desc}</p>
            `;
            container.appendChild(card);
        });
    },

    // ==========================================
    // 7. NAVIGATION & ROUTING
    // ==========================================
    
    // Navigate to different "pages/views" within the SPA
    navigate: function(viewId, params = {}) {
        this.showView(viewId, true);
        
        // FUTURE routing connections for Subjects and Resources:
        // if (viewId === 'subjects' && params.classId) this.renderSubjects(params.classId);
        // if (viewId === 'resources') this.renderResources(); 
        
        const navLinks = document.getElementById('nav-links');
        if(navLinks && navLinks.classList.contains('show')) navLinks.classList.remove('show');
    },

    // Show/Hide specific HTML sections based on View ID
    showView: function(viewId, pushState = true) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        
        const targetEl = document.getElementById(`view-${viewId}`);
        if (targetEl) targetEl.classList.add('active');

        document.querySelectorAll('.nav-links a').forEach(el => el.classList.remove('active-link'));
        const activeNav = document.getElementById(`nav-${viewId}`);
        if (activeNav) activeNav.classList.add('active-link');

        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        
        if (pushState) window.history.pushState({ view: viewId }, '', `#${viewId}`);
    },

    // Mobile Hamburger Menu Toggle
    toggleMobileMenu: function(forceClose = false) { 
        const navLinks = document.getElementById('nav-links');
        if(!navLinks) return;
        
        if (forceClose === true) {
            navLinks.classList.remove('show');
        } else {
            navLinks.classList.toggle('show'); 
        }
    }
};

// ==========================================
// 8. INITIALIZE APP ON LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', () => { app.init(); });
