// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState } from './state';
import { switchPage, showAuthModal, closeAuthModal, toggleLoading, showToast } from './ui';
import { mountService } from './router';
import { auth, firebaseConfig, GoogleAuthProvider, AppleAuthProvider } from './firebase';
import { t } from './i18n';

/**
 * Updates the UI based on the current authentication state.
 */
export function updateUIForAuthState() {
    const { isLoggedIn, currentUser } = State;

    const loginBtn = document.getElementById('login-signup-btn');
    const accountDropdown = document.getElementById('my-account-dropdown');
    const dashboardLink = document.getElementById('header-dashboard-link');

    if (loginBtn) loginBtn.classList.toggle('hidden', isLoggedIn);
    if (accountDropdown) accountDropdown.classList.toggle('hidden', !isLoggedIn);
    if (dashboardLink) dashboardLink.style.display = isLoggedIn ? 'flex' : 'none';
    
    if (isLoggedIn && currentUser) {
        const userNameDisplay = document.getElementById('user-name-display');
        const userAvatar = document.getElementById('user-avatar');
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
        if (userAvatar) {
            // Get user initials
            const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2);
            userAvatar.textContent = initials;
        }
    }


    // Update welcome banner on landing page
    const welcomeBanner = document.getElementById('welcome-banner');
    if (welcomeBanner) {
        if (isLoggedIn && currentUser) {
            welcomeBanner.innerHTML = `
                <h2 class="welcome-title">Welcome back, ${currentUser.name}!</h2>
                <p>What would you like to ship today?</p>
            `;
             welcomeBanner.classList.remove('hidden');
        } else {
            // Hide the banner if not logged in to keep the focus on the parcel form
            welcomeBanner.innerHTML = '';
            welcomeBanner.classList.add('hidden');
        }
    }
}


// --- MODAL AND FORM LOGIC ---

/**
 * Toggles between the various views within the authentication modal.
 * @param viewToShow The view to display.
 */
function switchAuthView(viewToShow: 'email-entry' | 'password-entry' | 'signup' | 'magic-link-sent') {
    const container = document.getElementById('auth-container');
    if (!container) return;

    const currentView = container.querySelector('.auth-view.active');
    const nextView = document.getElementById(`${viewToShow}-view`);

    if (currentView && nextView && currentView !== nextView) {
        currentView.classList.add('exiting');
        currentView.addEventListener('animationend', () => {
            currentView.classList.remove('active', 'exiting');
            nextView.classList.add('active');
        }, { once: true });
    } else if (nextView) {
        nextView.classList.add('active');
    }
}

// --- AUTHENTICATION ACTIONS ---

/**
 * Finalizes the login process for any authentication method.
 * @param user The Firebase user object.
 */
function completeLogin(user: { displayName: string | null, email: string | null }) {
    if (!user.email) {
        showToast(t('auth.errors.no_email'), "error");
        return;
    }
    const userProfile = { 
        name: user.displayName || user.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: user.email 
    };

    localStorage.setItem('vcanship_user', JSON.stringify(userProfile));
    localStorage.removeItem('vcanship_guest_lookups'); // Clear guest counter on login
    localStorage.setItem('vcanship_free_lookups', '5'); // Set free user counter

    setState({
        isLoggedIn: true,
        currentUser: userProfile,
        subscriptionTier: 'free',
        aiLookupsRemaining: 5,
    });
    
    updateUIForAuthState();
    closeAuthModal();
    
    if (State.postLoginRedirectService) {
        mountService(State.postLoginRedirectService);
        setState({ postLoginRedirectService: null });
    } else {
        switchPage('dashboard');
    }
}

/**
 * Generic helper function to send a magic link for passwordless sign-in.
 * @param email The user's email address.
 * @param name Optional user's name, used during the signup flow.
 */
async function sendMagicLink(email: string, name?: string) {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToast(t('toast.invalid_email'), 'error');
        return;
    }
    
    if (name) {
        window.localStorage.setItem('nameForSignIn', name);
    }
    
    const continueUrl = `https://${firebaseConfig.authDomain}`;

    const actionCodeSettings = {
        url: continueUrl,
        handleCodeInApp: true,
    };

    toggleLoading(true, t('loading.sending_magic_link'));
    try {
        await auth.sendSignInLinkToEmail(email, actionCodeSettings);
        window.localStorage.setItem('emailForSignIn', email);
        showToast(t('toast.magic_link_sent').replace('{email}', email), 'success');
        switchAuthView('magic-link-sent');
        (document.getElementById('magic-link-email-display') as HTMLElement).textContent = email;

    } catch (error: any) {
        console.error("Magic link error:", error);
        showToast(error.message || t('toast.magic_link_failed'), 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handles social login using Firebase's popup method for a seamless UX.
 * @param providerName The social provider ('Google' or 'Apple').
 */
async function handleSocialLogin(providerName: 'Google' | 'Apple') {
    let provider;
    if (providerName === 'Google') {
        provider = new GoogleAuthProvider();
    } else {
        provider = new AppleAuthProvider('apple.com');
    }

    toggleLoading(true, t('loading.signing_in_with').replace('{provider}', providerName));
    try {
        const result = await auth.signInWithPopup(provider);
        if (result.user) {
            completeLogin(result.user);
        } else {
            throw new Error(t('toast.social_signin_failed'));
        }
    } catch (error: any) {
        console.error(`${providerName} Sign-In Error:`, error);
        // Handle common errors gracefully
        if (error.code === 'auth/popup-closed-by-user') {
            showToast(t('toast.signin_cancelled'), 'info');
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            showToast(t('toast.account_exists'), 'error');
        } else {
            showToast(t('toast.social_signin_failed_provider').replace('{provider}', providerName), 'error');
        }
    } finally {
        toggleLoading(false);
    }
}

/**
 * Handles the first step of the auth flow: email entry.
 */
async function handleEmailContinue(e: Event) {
    e.preventDefault();
    const emailInput = document.getElementById('auth-email') as HTMLInputElement;
    const email = emailInput.value.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        showToast(t('toast.invalid_email'), 'error');
        return;
    }
    
    toggleLoading(true, t('loading.checking'));
    try {
        const methods = await auth.fetchSignInMethodsForEmail(email);
        if (methods.length > 0) {
            // User exists, show password screen
            (document.getElementById('password-entry-email') as HTMLElement).textContent = email;
            switchAuthView('password-entry');
        } else {
            // New user, show signup screen
            (document.getElementById('signup-view-email') as HTMLElement).textContent = email;
            switchAuthView('signup');
        }
    } catch (error: any) {
        console.error("Error checking email:", error);
        showToast(error.message, 'error');
    } finally {
        toggleLoading(false);
    }
}


/**
 * Signs a user in with email and password using Firebase Auth.
 */
async function handleSignInWithEmailAndPassword(e: Event) {
    e.preventDefault();
    const email = (document.getElementById('password-entry-email') as HTMLElement).textContent || '';
    const password = (document.getElementById('auth-password') as HTMLInputElement).value;
    
    if (!email || !password) {
        showToast(t('toast.password_required'), "error");
        return;
    }

    toggleLoading(true, t('loading.logging_in'));
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        if (userCredential.user) {
            completeLogin(userCredential.user);
        }
    } catch (error: any) {
        showToast(error.message, 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Signs a user up with email and password using Firebase Auth.
 */
async function handleSignUpWithEmailAndPassword(e: Event) {
    e.preventDefault();
    const name = (document.getElementById('signup-name') as HTMLInputElement).value;
    const email = (document.getElementById('signup-view-email') as HTMLElement).textContent || '';
    const password = (document.getElementById('signup-password') as HTMLInputElement).value;

    if (!name || !email || !password) {
        showToast(t('toast.fill_all_fields'), "error");
        return;
    }
    if (password.length < 6) {
        showToast(t('toast.password_length'), "error");
        return;
    }


    toggleLoading(true, t('loading.creating_account'));
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
            await userCredential.user.updateProfile({ displayName: name });
            const user = { ...userCredential.user, displayName: name };
            completeLogin(user);
        }
    } catch (error: any) {
        showToast(error.message, 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Sends a magic link for passwordless LOGIN for an existing user.
 */
async function handleSendLoginMagicLink() {
    const email = (document.getElementById('password-entry-email') as HTMLElement).textContent;
    if (email) await sendMagicLink(email);
}

/**
 * Sends a magic link for passwordless SIGNUP for a new user.
 */
async function handleSendSignupMagicLink() {
    const email = (document.getElementById('signup-view-email') as HTMLElement).textContent;
    const name = (document.getElementById('signup-name') as HTMLInputElement).value.trim();
    if (!name) {
        showToast(t('toast.name_required_signup'), "error");
        return;
    }
    if (email) await sendMagicLink(email, name);
}


/**
 * Handles resending a magic link using the email stored in localStorage.
 */
async function handleResendMagicLink() {
    const email = window.localStorage.getItem('emailForSignIn');
    if (email) {
        await sendMagicLink(email); 
    } else {
        showToast(t('toast.resend_email_not_found'), 'error');
        switchAuthView('email-entry');
    }
}


/**
 * Handles the user returning to the app from a magic link.
 * @returns {Promise<boolean>} True if sign-in was handled, false otherwise.
 */
export async function handleSignInWithEmailLink(): Promise<boolean> {
    const url = window.location.href;
    if (auth.isSignInWithEmailLink(url)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt(t('prompt.email_confirmation'));
        }
        if (!email) {
            showToast(t('toast.email_required_for_signin'), 'error');
            history.replaceState(null, '', window.location.pathname);
            return false;
        }

        toggleLoading(true, t('loading.signing_you_in'));
        try {
            const result = await auth.signInWithEmailLink(email, url);
            window.localStorage.removeItem('emailForSignIn');
            
            const name = window.localStorage.getItem('nameForSignIn');
            window.localStorage.removeItem('nameForSignIn');
            
            if (!result.user) throw new Error(t('toast.magic_link_signin_failed'));

            if (name && !result.user.displayName) {
                await result.user.updateProfile({ displayName: name });
            }

            const user = { ...result.user, displayName: name || result.user.displayName };
            history.replaceState(null, '', window.location.pathname);
            completeLogin(user);
            return true;

        } catch (error: any) {
            history.replaceState(null, '', window.location.pathname);
            console.error("Magic link error:", error);
            showToast(t('toast.magic_link_invalid'), 'error');
            return false;
        } finally {
            toggleLoading(false);
        }
    }
    return false;
}

/**
 * Handles the logout process.
 */
export async function handleLogout() {
    await auth.signOut();
    localStorage.removeItem('vcanship_user');
    localStorage.removeItem('vcanship_free_lookups');
    setState({
        isLoggedIn: false,
        currentUser: null,
        subscriptionTier: 'guest',
        aiLookupsRemaining: 0,
    });
    updateUIForAuthState();
    switchPage('landing');
}

/**
 * Sets up all event listeners for the authentication flow.
 */
export function initializeAuth() {
    // Use a literal string here so we never depend on a translation key
    toggleLoading(true, 'Please wait...');
    auth.onAuthStateChanged((user: any) => {
        if (user) {
            const userProfile = { name: user.displayName || user.email!.split('@')[0], email: user.email! };
            const savedLookups = localStorage.getItem('vcanship_free_lookups');
            setState({
                isLoggedIn: true,
                currentUser: userProfile,
                subscriptionTier: 'free',
                aiLookupsRemaining: savedLookups ? parseInt(savedLookups, 10) : 5,
            });
        } else {
             setState({
                isLoggedIn: false,
                currentUser: null,
                subscriptionTier: 'guest',
                aiLookupsRemaining: 0,
            });
        }
        updateUIForAuthState();
        toggleLoading(false);
    });

    // Modal controls
    document.getElementById('login-signup-btn')?.addEventListener('click', () => {
        switchAuthView('email-entry'); // Always start at the first step
        showAuthModal();
    });
    DOMElements.closeAuthModalBtn.addEventListener('click', closeAuthModal);

    // View switching
    document.querySelectorAll('.back-to-auth-start-btn').forEach(btn => {
        btn.addEventListener('click', () => switchAuthView('email-entry'));
    });
    
    // Form submissions
    document.getElementById('email-form')?.addEventListener('submit', handleEmailContinue);
    document.getElementById('password-form')?.addEventListener('submit', handleSignInWithEmailAndPassword);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignUpWithEmailAndPassword);

    // Magic Link Buttons
    document.getElementById('send-magic-link-instead-btn')?.addEventListener('click', handleSendLoginMagicLink);
    document.getElementById('magic-link-signup-btn')?.addEventListener('click', handleSendSignupMagicLink);
    document.getElementById('resend-magic-link-btn')?.addEventListener('click', handleResendMagicLink);

    // Logout Button
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Social Logins
    document.querySelectorAll('.google-login-btn').forEach(button => {
        button.addEventListener('click', () => handleSocialLogin('Google'));
    });
    document.querySelectorAll('.apple-login-btn').forEach(button => {
        button.addEventListener('click', () => handleSocialLogin('Apple'));
    });

    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const passwordInput = toggle.previousElementSibling as HTMLInputElement;
            const icon = toggle.querySelector('i');
            if (!passwordInput || !icon) return;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}
