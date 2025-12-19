// عناصر DOM
const userEmail = document.getElementById('userEmail');
const userBalance = document.getElementById('userBalance');
const currentBalance = document.getElementById('currentBalance');
const userName = document.getElementById('userName');
const todayEarnings = document.getElementById('todayEarnings');
const completedTasks = document.getElementById('completedTasks');
const totalEarnings = document.getElementById('totalEarnings');
const logoutBtn = document.getElementById('logoutBtn');
const tasksList = document.getElementById('tasksList');
const depositForm = document.getElementById('depositForm');
const proofImage = document.getElementById('proofImage');
const fileName = document.getElementById('fileName');
const withdrawForm = document.getElementById('withdrawForm');
const withdrawableBalance = document.getElementById('withdrawableBalance');
const withdrawalsList = document.getElementById('withdrawalsList');
const depositBtn = document.getElementById('depositBtn');
const withdrawBtn = document.getElementById('withdrawBtn');
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');
const modalClose = document.querySelector('.modal-close');

// بيانات المستخدم
let currentUser = null;
let userData = null;

// تهيئة لوحة التحكم
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    
    // تحميل بيانات المستخدم
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            await loadTasks();
            await loadWithdrawals();
            setupEventListeners();
        } else {
            window.location.href = 'auth.html';
        }
    });
});

// تحميل بيانات المستخدم
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            userData = userDoc.data();
            
            // تحديث واجهة المستخدم
            userEmail.textContent = userData.email;
            userBalance.textContent = userData.balance.toFixed(2);
            currentBalance.textContent = userData.balance.toFixed(2);
            withdrawableBalance.textContent = userData.balance.toFixed(2);
            userName.textContent = userData.email.split('@')[0];
            
            // تحميل الإحصائيات
            await loadUserStats();
        } else {
            // إذا لم يكن هناك مستند، إنشاء واحد
            await createUserDocument(currentUser);
            await loadUserData(); // إعادة التحميل
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل بيانات المستخدم');
    }
}

// إنشاء مستند المستخدم
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

// تحميل إحصائيات المستخدم
async function loadUserStats() {
    try {
        // اليوميات
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const earningsSnapshot = await db.collection('earnings')
            .where('userId', '==', currentUser.uid)
            .where('date', '>=', today)
            .get();
        
        let todayTotal = 0;
        earningsSnapshot.forEach(doc => {
            todayTotal += doc.data().amount;
        });
        
        todayEarnings.textContent = todayTotal.toFixed(2);
        
        // المهام المكتملة
        const tasksSnapshot = await db.collection('completedTasks')
            .where('userId', '==', currentUser.uid)
            .get();
        
        completedTasks.textContent = tasksSnapshot.size;
        
        // إجمالي الأرباح
        const allEarningsSnapshot = await db.collection('earnings')
            .where('userId', '==', currentUser.uid)
            .get();
        
        let total = 0;
        allEarningsSnapshot.forEach(doc => {
            total += doc.data().amount;
        });
        
        totalEarnings.textContent = total.toFixed(2);
        
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// تحميل المهام
async function loadTasks() {
    try {
        tasksList.innerHTML = '<div class="loading">جاري تحميل المهام...</div>';
        
        // جلب المهام النشطة
        const tasksSnapshot = await db.collection('tasks')
            .where('active', '==', true)
            .get();
        
        if (tasksSnapshot.empty) {
            tasksList.innerHTML = '<p class="empty-message">لا توجد مهام متاحة حالياً</p>';
            return;
        }
        
        tasksList.innerHTML = '';
        
        // جلب المهام المكتملة من قبل المستخدم
        const completedTasksSnapshot = await db.collection('completedTasks')
            .where('userId', '==', currentUser.uid)
            .get();
        
        const completedTaskIds = [];
        completedTasksSnapshot.forEach(doc => {
            completedTaskIds.push(doc.data().taskId);
        });
        
        // عرض المهام
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const taskId = doc.id;
            const isCompleted = completedTaskIds.includes(taskId);
            
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            
            taskItem.innerHTML = `
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <div class="task-reward">
                        <i class="fas fa-coins"></i>
                        <span>${task.reward} $</span>
                    </div>
                </div>
                <div class="task-body">
                    <p class="task-description">${task.description}</p>
                </div>
                <div class="task-footer">
                    ${isCompleted ? 
                        '<span class="task-status status-completed">مكتملة</span>' : 
                        `<button class="btn btn-primary btn-complete-task" data-id="${taskId}" data-reward="${task.reward}">إكمال المهمة</button>`
                    }
                </div>
            `;
            
            tasksList.appendChild(taskItem);
        });
        
        // إضافة مستمعي الأحداث لأزرار إكمال المهام
        document.querySelectorAll('.btn-complete-task').forEach(button => {
            button.addEventListener('click', async (e) => {
                const taskId = e.target.getAttribute('data-id');
                const reward = parseFloat(e.target.getAttribute('data-reward'));
                await completeTask(taskId, reward);
            });
        });
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasksList.innerHTML = '<p class="empty-message">حدث خطأ في تحميل المهام</p>';
    }
}

// إكمال المهمة
async function completeTask(taskId, reward) {
    try {
        showLoading(true, `btn-complete-task[data-id="${taskId}"]`);
        
        // التحقق من عدم إكمال المهمة مسبقاً
        const existingCompletion = await db.collection('completedTasks')
            .where('userId', '==', currentUser.uid)
            .where('taskId', '==', taskId)
            .get();
        
        if (!existingCompletion.empty) {
            showAlert('تنبيه', 'لقد أكملت هذه المهمة مسبقاً');
            return;
        }
        
        // تسجيل المهمة المكتملة
        await db.collection('completedTasks').add({
            userId: currentUser.uid,
            taskId: taskId,
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reward: reward
        });
        
        // إضافة الأرباح
        await db.collection('earnings').add({
            userId: currentUser.uid,
            taskId: taskId,
            amount: reward,
            date: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'task'
        });
        
        // تحديث رصيد المستخدم
        const newBalance = userData.balance + reward;
        await db.collection('users').doc(currentUser.uid).update({
            balance: newBalance
        });
        
        // تحديث البيانات المحلية
        userData.balance = newBalance;
        userBalance.textContent = newBalance.toFixed(2);
        currentBalance.textContent = newBalance.toFixed(2);
        withdrawableBalance.textContent = newBalance.toFixed(2);
        
        // إعادة تحميل المهام والإحصائيات
        await loadTasks();
        await loadUserStats();
        
        showAlert('مبروك!', `لقد أكملت المهمة وتم إضافة ${reward}$ إلى رصيدك`);
        
    } catch (error) {
        console.error('Error completing task:', error);
        showAlert('خطأ', 'حدث خطأ في إكمال المهمة');
    } finally {
        showLoading(false, `btn-complete-task[data-id="${taskId}"]`);
    }
}

// إدارة الملفات
if (proofImage) {
    proofImage.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
        } else {
            fileName.textContent = 'لم يتم اختيار صورة';
        }
    });
}

// تقديم طلب إيداع
if (depositForm) {
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const fullName = document.getElementById('fullName').value;
        const userRIB = document.getElementById('userRIB').value;
        const file = proofImage.files[0];
        
        // التحقق من صحة البيانات
        if (!file) {
            showAlert('خطأ', 'يجب اختيار صورة إثبات التحويل');
            return;
        }
        
        if (userRIB.length !== 24) {
            showAlert('خطأ', 'رقم الحساب يجب أن يكون 24 رقم');
            return;
        }
        
        try {
            showLoading(true, '#depositForm button[type="submit"]');
            
            // رفع الصورة
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`deposit-proofs/${currentUser.uid}/${Date.now()}_${file.name}`);
            await fileRef.put(file);
            const proofUrl = await fileRef.getDownloadURL();
            
            // حفظ طلب الإيداع
            await db.collection('deposits').add({
                userId: currentUser.uid,
                userEmail: currentUser.email,
                fullName: fullName,
                userRIB: userRIB,
                amount: amount,
                proofUrl: proofUrl,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                code: '90931d1'
            });
            
            // إعادة تعيين النموذج
            depositForm.reset();
            fileName.textContent = 'لم يتم اختيار صورة';
            
            showAlert('تم بنجاح', 'تم إرسال طلب الإيداع بنجاح. سيتم مراجعته من قبل الإدارة وإضافة الرصيد عند التأكيد.');
            
        } catch (error) {
            console.error('Error submitting deposit:', error);
            showAlert('خطأ', 'حدث خطأ في إرسال طلب الإيداع');
        } finally {
            showLoading(false, '#depositForm button[type="submit"]');
        }
    });
}

// تحميل طلبات السحب
async function loadWithdrawals() {
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (withdrawalsSnapshot.empty) {
            withdrawalsList.innerHTML = '<p class="empty-message">لا توجد طلبات سحب قيد الانتظار</p>';
            return;
        }
        
        withdrawalsList.innerHTML = '';
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const withdrawalId = doc.id;
            
            let statusText = '';
            let statusClass = '';
            
            switch (withdrawal.status) {
                case 'pending':
                    statusText = 'قيد الانتظار';
                    statusClass = 'status-pending';
                    break;
                case 'approved':
                    statusText = 'مقبول';
                    statusClass = 'status-approved';
                    break;
                case 'rejected':
                    statusText = 'مرفوض';
                    statusClass = 'status-rejected';
                    break;
            }
            
            const withdrawalItem = document.createElement('div');
            withdrawalItem.className = 'withdrawal-item';
            
            withdrawalItem.innerHTML = `
                <div class="withdrawal-info">
                    <h4>طلب سحب ${withdrawal.amount}$</h4>
                    <p>${withdrawal.createdAt.toDate().toLocaleDateString('ar-EG')}</p>
                </div>
                <div class="withdrawal-status ${statusClass}">${statusText}</div>
            `;
            
            withdrawalsList.appendChild(withdrawalItem);
        });
        
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

// تقديم طلب سحب
if (withdrawForm) {
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const withdrawRIB = document.getElementById('withdrawRIB').value;
        
        // التحقق من صحة البيانات
        if (withdrawRIB.length !== 24) {
            showAlert('خطأ', 'رقم الحساب يجب أن يكون 24 رقم');
            return;
        }
        
        if (amount < 20) {
            showAlert('خطأ', 'الحد الأدنى للسحب هو 20$');
            return;
        }
        
        if (amount > userData.balance) {
            showAlert('خطأ', 'رصيدك غير كافي');
            return;
        }
        
        try {
            showLoading(true, '#withdrawForm button[type="submit"]');
            
            // إنشاء طلب السحب
            await db.collection('withdrawals').add({
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userRIB: withdrawRIB,
                amount: amount,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // خصم المبلغ من الرصيد المؤقت
            const newBalance = userData.balance - amount;
            await db.collection('users').doc(currentUser.uid).update({
                balance: newBalance
            });
            
            // تحديث البيانات المحلية
            userData.balance = newBalance;
            userBalance.textContent = newBalance.toFixed(2);
            currentBalance.textContent = newBalance.toFixed(2);
            withdrawableBalance.textContent = newBalance.toFixed(2);
            
            // إعادة تعيين النموذج
            withdrawForm.reset();
            
            // إعادة تحميل طلبات السحب
            await loadWithdrawals();
            
            showAlert('تم بنجاح', 'تم إرسال طلب السحب بنجاح. سيتم مراجعته من قبل الإدارة.');
            
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            showAlert('خطأ', 'حدث خطأ في إرسال طلب السحب');
        } finally {
            showLoading(false, '#withdrawForm button[type="submit"]');
        }
    });
}

// تسجيل الخروج
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showAlert('خطأ', 'حدث خطأ في تسجيل الخروج');
        }
    });
}

// التنقل السلس
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // إزالة النشاط من جميع الروابط
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.classList.remove('active');
            });
            
            // إضافة النشاط للرابط الحالي
            this.classList.add('active');
            
            // التمرير إلى العنصر
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التمرير إلى قسم الإيداع
    if (depositBtn) {
        depositBtn.addEventListener('click', () => {
            document.querySelector('a[href="#deposit"]').click();
        });
    }
    
    // التمرير إلى قسم السحب
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
            document.querySelector('a[href="#withdraw"]').click();
        });
    }
    
    // إغلاق نافذة التنبيهات
    if (alertClose) {
        alertClose.addEventListener('click', () => {
            alertModal.classList.remove('active');
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            alertModal.classList.remove('active');
        });
    }
    
    // إغلاق النافذة بالنقر خارجها
    if (alertModal) {
        alertModal.addEventListener('click', (e) => {
            if (e.target === alertModal) {
                alertModal.classList.remove('active');
            }
        });
    }
}

// وظائف المساعدة
function showAlert(title, message) {
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    alertModal.classList.add('active');
}

function showLoading(show, selector = 'button') {
    const buttons = document.querySelectorAll(selector);
    
    buttons.forEach(button => {
        if (show) {
            const originalText = button.textContent;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
            button.disabled = true;
        } else {
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
            button.disabled = false;
        }
    });
}

// التحقق من حالة تسجيل الدخول
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (!user && (window.location.pathname.includes('dashboard.html') || 
                      window.location.pathname.includes('admin.html'))) {
            window.location.href = 'auth.html';
        }
    });
}
