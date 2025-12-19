// عناصر DOM
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const forgotPassword = document.getElementById('forgotPassword');
const backToLogin = document.getElementById('backToLogin');
const passwordError = document.getElementById('passwordError');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');
const modalClose = document.querySelector('.modal-close');

// تبديل التبويبات
loginTab.addEventListener('click', () => {
    switchToLogin();
});

registerTab.addEventListener('click', () => {
    switchToRegister();
});

// تبديل كلمة المرور الظاهرة/المخفية
document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
        const input = this.parentElement.querySelector('input');
        const icon = this.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// التحقق من تطابق كلمة المرور
confirmPassword.addEventListener('input', () => {
    if (registerPassword.value !== confirmPassword.value) {
        passwordError.textContent = 'كلمات المرور غير متطابقة';
    } else {
        passwordError.textContent = '';
    }
});

// نسيت كلمة المرور
forgotPassword.addEventListener('click', (e) => {
    e.preventDefault();
    switchToResetPassword();
});

// العودة لتسجيل الدخول
backToLogin.addEventListener('click', () => {
    switchToLogin();
});

// تسجيل الدخول
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        showLoading(true);
        
        // تعيين استمرارية الجلسة
        const persistence = rememberMe ? 
            firebase.auth.Auth.Persistence.LOCAL : 
            firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        // تسجيل الدخول
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // التحقق إذا كان أدمن
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            if (userData.role === 'admin') {
                // توجيه الأدمن إلى لوحة التحكم
                window.location.href = 'admin.html';
            } else {
                // توجيه المستخدم العادي إلى لوحة التحكم
                window.location.href = 'dashboard.html';
            }
        } else {
            // إذا لم يكن هناك مستند للمستخدم، إنشاء واحد
            await createUserDocument(user);
            window.location.href = 'dashboard.html';
        }
        
    } catch (error) {
        showAlert('خطأ في تسجيل الدخول', getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// إنشاء حساب جديد
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    // التحقق من تطابق كلمات المرور
    if (password !== confirm) {
        showAlert('خطأ', 'كلمات المرور غير متطابقة');
        return;
    }
    
    try {
        showLoading(true);
        
        // إنشاء حساب جديد
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // إنشاء مستند المستخدم في Firestore
        await createUserDocument(user);
        
        showAlert('تم بنجاح', 'تم إنشاء حسابك بنجاح! سيتم توجيهك إلى لوحة التحكم.');
        
        // توجيه المستخدم بعد ثانيتين
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        showAlert('خطأ في التسجيل', getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// إعادة تعيين كلمة المرور
resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    try {
        showLoading(true);
        
        await auth.sendPasswordResetEmail(email);
        
        showAlert('تم الإرسال', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
        switchToLogin();
        
    } catch (error) {
        showAlert('خطأ', getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
});

// وظيفة إنشاء مستند المستخدم في Firestore
async function createUserDocument(user) {
    const userData = {
        email: user.email,
        balance: 0,
        role: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('users').doc(user.uid).set(userData);
}

// وظيفة التحقق من حالة تسجيل الدخول
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // إذا كان المستخدم مسجل الدخول بالفعل
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        
                        // إذا كان في صفحة المصادقة، توجيهه
                        if (window.location.pathname.includes('auth.html')) {
                            if (userData.role === 'admin') {
                                window.location.href = 'admin.html';
                            } else {
                                window.location.href = 'dashboard.html';
                            }
                        }
                    }
                });
        } else {
            // إذا لم يكن مسجل الدخول وكان في لوحة التحكم، توجيهه للمصادقة
            if (window.location.pathname.includes('dashboard.html') || 
                window.location.pathname.includes('admin.html')) {
                window.location.href = 'auth.html';
            }
        }
    });
}

// وظائف المساعدة
function switchToLogin() {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    resetPasswordForm.classList.remove('active');
    authTitle.textContent = 'تسجيل الدخول';
    authSubtitle.textContent = 'أدخل بياناتك للوصول إلى حسابك';
}

function switchToRegister() {
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    resetPasswordForm.classList.remove('active');
    authTitle.textContent = 'إنشاء حساب';
    authSubtitle.textContent = 'أنشئ حسابك للبدء في رحلة الربح';
}

function switchToResetPassword() {
    loginTab.classList.remove('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    resetPasswordForm.classList.add('active');
    authTitle.textContent = 'إعادة تعيين كلمة المرور';
    authSubtitle.textContent = 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور';
}

function showAlert(title, message) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.classList.add('active');
}

function showLoading(show) {
    const buttons = document.querySelectorAll('.auth-form button[type="submit"]');
    
    buttons.forEach(button => {
        if (show) {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            button.disabled = true;
        } else {
            if (button.id === 'alertClose' || button.classList.contains('modal-close')) return;
            
            if (button.closest('#loginForm')) {
                button.textContent = 'تسجيل الدخول';
            } else if (button.closest('#registerForm')) {
                button.textContent = 'إنشاء حساب';
            } else if (button.closest('#resetPasswordForm') && button.type === 'submit') {
                button.textContent = 'إرسال رابط إعادة التعيين';
            }
            button.disabled = false;
        }
    });
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/user-disabled': 'هذا الحساب معطل',
        'auth/user-not-found': 'لم يتم العثور على حساب بهذا البريد',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة، يجب أن تحتوي على 6 أحرف على الأقل',
        'auth/operation-not-allowed': 'عملية غير مسموحة',
        'auth/too-many-requests': 'عدد محاولات كثيرة، حاول مرة أخرى لاحقاً',
        'auth/network-request-failed': 'خطأ في الشبكة، تحقق من اتصالك بالإنترنت'
    };
    
    return errorMessages[errorCode] || 'حدث خطأ غير معروف، حاول مرة أخرى';
}

// إغلاق نافذة التنبيهات
alertClose.addEventListener('click', () => {
    alertModal.classList.remove('active');
});

modalClose.addEventListener('click', () => {
    alertModal.classList.remove('active');
});

// إغلاق النافذة بالنقر خارجها
alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) {
        alertModal.classList.remove('active');
    }
});

// التحقق من معلمة URL لتبديل التبويب تلقائياً
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'register') {
        switchToRegister();
    }
    
    // التحقق من حالة تسجيل الدخول
    checkAuthState();
});
