// بيانات الأدمن
const ADMIN_EMAIL = "Hamzaaskouk95@gmail.com";
const ADMIN_PASSWORD = "mama dada";

// عناصر DOM
const adminEmail = document.getElementById('adminEmail');
const logoutBtn = document.getElementById('logoutBtn');
const adminSections = document.querySelectorAll('.admin-section');
const adminNavLinks = document.querySelectorAll('.admin-nav-link');
const totalUsers = document.getElementById('totalUsers');
const activeTasks = document.getElementById('activeTasks');
const totalDeposits = document.getElementById('totalDeposits');
const totalWithdrawals = document.getElementById('totalWithdrawals');
const recentDepositsTable = document.getElementById('recentDepositsTable');
const recentWithdrawalsTable = document.getElementById('recentWithdrawalsTable');
const usersTable = document.getElementById('usersTable');
const userSearch = document.getElementById('userSearch');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksTable = document.getElementById('tasksTable');
const pendingDepositsTable = document.getElementById('pendingDepositsTable');
const pendingWithdrawalsTable = document.getElementById('pendingWithdrawalsTable');
const taskModal = document.getElementById('taskModal');
const taskModalTitle = document.getElementById('taskModalTitle');
const taskForm = document.getElementById('taskForm');
const taskId = document.getElementById('taskId');
const taskTitle = document.getElementById('taskTitle');
const taskDescription = document.getElementById('taskDescription');
const taskReward = document.getElementById('taskReward');
const taskActive = document.getElementById('taskActive');
const cancelTaskBtn = document.getElementById('cancelTaskBtn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const balanceModal = document.getElementById('balanceModal');
const balanceUserId = document.getElementById('balanceUserId');
const currentBalance = document.getElementById('currentBalance');
const newBalance = document.getElementById('newBalance');
const balanceReason = document.getElementById('balanceReason');
const cancelBalanceBtn = document.getElementById('cancelBalanceBtn');
const saveBalanceBtn = document.getElementById('saveBalanceBtn');
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertClose = document.getElementById('alertClose');
const modalClose = document.querySelectorAll('.modal-close');

// حالة التطبيق
let currentAdmin = null;
let isEditingTask = false;
let currentTaskId = null;
let allUsers = [];

// تهيئة لوحة تحكم الأدمن
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    setupEventListeners();
});

// التحقق من مصادقة الأدمن
async function checkAdminAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // التحقق إذا كان المستخدم هو الأدمن
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                if (userData.email === ADMIN_EMAIL && userData.role === 'admin') {
                    currentAdmin = user;
                    adminEmail.textContent = userData.email;
                    await loadDashboardData();
                    await loadAllUsers();
                    await loadTasks();
                    await loadPendingDeposits();
                    await loadPendingWithdrawals();
                } else {
                    // إذا كان ليس أدمن، توجيهه للصفحة الرئيسية
                    window.location.href = 'index.html';
                }
            } else {
                // إذا لم يكن هناك مستند، توجيهه للصفحة الرئيسية
                window.location.href = 'index.html';
            }
        } else {
            // إذا لم يكن مسجل الدخول، توجيهه لصفحة المصادقة
            window.location.href = 'auth.html';
        }
    });
}

// تحميل بيانات لوحة التحكم
async function loadDashboardData() {
    try {
        // إجمالي المستخدمين
        const usersSnapshot = await db.collection('users').get();
        totalUsers.textContent = usersSnapshot.size;
        
        // المهام النشطة
        const tasksSnapshot = await db.collection('tasks').where('active', '==', true).get();
        activeTasks.textContent = tasksSnapshot.size;
        
        // إجمالي الإيداعات
        const depositsSnapshot = await db.collection('deposits').get();
        let depositsTotal = 0;
        depositsSnapshot.forEach(doc => {
            depositsTotal += doc.data().amount;
        });
        totalDeposits.textContent = depositsTotal.toFixed(2);
        
        // إجمالي السحوبات
        const withdrawalsSnapshot = await db.collection('withdrawals').get();
        let withdrawalsTotal = 0;
        withdrawalsSnapshot.forEach(doc => {
            withdrawalsTotal += doc.data().amount;
        });
        totalWithdrawals.textContent = withdrawalsTotal.toFixed(2);
        
        // آخر طلبات الإيداع
        await loadRecentDeposits();
        
        // آخر طلبات السحب
        await loadRecentWithdrawals();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل بيانات لوحة التحكم');
    }
}

// تحميل آخر طلبات الإيداع
async function loadRecentDeposits() {
    try {
        const depositsSnapshot = await db.collection('deposits')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        recentDepositsTable.innerHTML = '';
        
        if (depositsSnapshot.empty) {
            recentDepositsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">لا توجد طلبات إيداع</td>
                </tr>
            `;
            return;
        }
        
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            const depositId = doc.id;
            
            let statusBadge = '';
            switch (deposit.status) {
                case 'pending':
                    statusBadge = '<span class="status-badge status-pending">قيد الانتظار</span>';
                    break;
                case 'approved':
                    statusBadge = '<span class="status-badge status-approved">مقبول</span>';
                    break;
                case 'rejected':
                    statusBadge = '<span class="status-badge status-rejected">مرفوض</span>';
                    break;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${deposit.userEmail}</td>
                <td>${deposit.amount}$</td>
                <td>${statusBadge}</td>
                <td>${deposit.createdAt.toDate().toLocaleDateString('ar-EG')}</td>
                <td class="actions">
                    ${deposit.status === 'pending' ? `
                        <button class="btn-action btn-approve" onclick="approveDeposit('${depositId}', '${deposit.userId}', ${deposit.amount})">قبول</button>
                        <button class="btn-action btn-reject" onclick="rejectDeposit('${depositId}')">رفض</button>
                    ` : ''}
                    <a href="${deposit.proofUrl}" target="_blank" class="btn-action btn-edit">عرض الإثبات</a>
                </td>
            `;
            
            recentDepositsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading recent deposits:', error);
    }
}

// تحميل آخر طلبات السحب
async function loadRecentWithdrawals() {
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        recentWithdrawalsTable.innerHTML = '';
        
        if (withdrawalsSnapshot.empty) {
            recentWithdrawalsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">لا توجد طلبات سحب</td>
                </tr>
            `;
            return;
        }
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const withdrawalId = doc.id;
            
            let statusBadge = '';
            switch (withdrawal.status) {
                case 'pending':
                    statusBadge = '<span class="status-badge status-pending">قيد الانتظار</span>';
                    break;
                case 'approved':
                    statusBadge = '<span class="status-badge status-approved">مقبول</span>';
                    break;
                case 'rejected':
                    statusBadge = '<span class="status-badge status-rejected">مرفوض</span>';
                    break;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${withdrawal.userEmail}</td>
                <td>${withdrawal.amount}$</td>
                <td>${statusBadge}</td>
                <td>${withdrawal.createdAt.toDate().toLocaleDateString('ar-EG')}</td>
                <td class="actions">
                    ${withdrawal.status === 'pending' ? `
                        <button class="btn-action btn-approve" onclick="approveWithdrawal('${withdrawalId}', '${withdrawal.userId}', ${withdrawal.amount})">قبول</button>
                        <button class="btn-action btn-reject" onclick="rejectWithdrawal('${withdrawalId}', '${withdrawal.userId}', ${withdrawal.amount})">رفض</button>
                    ` : ''}
                </td>
            `;
            
            recentWithdrawalsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading recent withdrawals:', error);
    }
}

// تحميل جميع المستخدمين
async function loadAllUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        
        allUsers = [];
        usersSnapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayUsers(allUsers);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل قائمة المستخدمين');
    }
}

// عرض المستخدمين في الجدول
function displayUsers(users) {
    usersTable.innerHTML = '';
    
    if (users.length === 0) {
        usersTable.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">لا توجد مستخدمين</td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // تنسيق التاريخ
        let createdAt = 'غير محدد';
        if (user.createdAt) {
            createdAt = user.createdAt.toDate().toLocaleDateString('ar-EG');
        }
        
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.balance.toFixed(2)}$</td>
            <td>${createdAt}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'status-active' : 'status-inactive'}">
                    ${user.role === 'admin' ? 'مدير' : 'مستخدم'}
                </span>
            </td>
            <td class="actions">
                <button class="btn-action btn-edit" onclick="openBalanceModal('${user.id}', ${user.balance})">تعديل الرصيد</button>
            </td>
        `;
        
        usersTable.appendChild(row);
    });
}

// تحميل المهام
async function loadTasks() {
    try {
        const tasksSnapshot = await db.collection('tasks').get();
        
        tasksTable.innerHTML = '';
        
        if (tasksSnapshot.empty) {
            tasksTable.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">لا توجد مهام</td>
                </tr>
            `;
            return;
        }
        
        tasksSnapshot.forEach(doc => {
            const task = doc.data();
            const taskId = doc.id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.title}</td>
                <td>${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}</td>
                <td>${task.reward}$</td>
                <td>
                    <span class="status-badge ${task.active ? 'status-active' : 'status-inactive'}">
                        ${task.active ? 'نشطة' : 'غير نشطة'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn-action btn-edit" onclick="editTask('${taskId}')">تعديل</button>
                    <button class="btn-action btn-delete" onclick="deleteTask('${taskId}')">حذف</button>
                </td>
            `;
            
            tasksTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل المهام');
    }
}

// تحميل طلبات الإيداع قيد الانتظار
async function loadPendingDeposits() {
    try {
        const depositsSnapshot = await db.collection('deposits')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        
        pendingDepositsTable.innerHTML = '';
        
        if (depositsSnapshot.empty) {
            pendingDepositsTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">لا توجد طلبات إيداع قيد الانتظار</td>
                </tr>
            `;
            return;
        }
        
        depositsSnapshot.forEach(doc => {
            const deposit = doc.data();
            const depositId = doc.id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${deposit.userEmail}</td>
                <td>${deposit.fullName}</td>
                <td>${deposit.amount}$</td>
                <td>${deposit.userRIB}</td>
                <td><a href="${deposit.proofUrl}" target="_blank" class="proof-link">عرض الإثبات</a></td>
                <td>${deposit.createdAt.toDate().toLocaleDateString('ar-EG')}</td>
                <td class="actions">
                    <button class="btn-action btn-approve" onclick="approveDeposit('${depositId}', '${deposit.userId}', ${deposit.amount})">قبول</button>
                    <button class="btn-action btn-reject" onclick="rejectDeposit('${depositId}')">رفض</button>
                </td>
            `;
            
            pendingDepositsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading pending deposits:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل طلبات الإيداع');
    }
}

// تحميل طلبات السحب قيد الانتظار
async function loadPendingWithdrawals() {
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'desc')
            .get();
        
        pendingWithdrawalsTable.innerHTML = '';
        
        if (withdrawalsSnapshot.empty) {
            pendingWithdrawalsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">لا توجد طلبات سحب قيد الانتظار</td>
                </tr>
            `;
            return;
        }
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const withdrawalId = doc.id;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${withdrawal.userEmail}</td>
                <td>${withdrawal.amount}$</td>
                <td>${withdrawal.userRIB}</td>
                <td>${withdrawal.createdAt.toDate().toLocaleDateString('ar-EG')}</td>
                <td class="actions">
                    <button class="btn-action btn-approve" onclick="approveWithdrawal('${withdrawalId}', '${withdrawal.userId}', ${withdrawal.amount})">قبول</button>
                    <button class="btn-action btn-reject" onclick="rejectWithdrawal('${withdrawalId}', '${withdrawal.userId}', ${withdrawal.amount})">رفض</button>
                </td>
            `;
            
            pendingWithdrawalsTable.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading pending withdrawals:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل طلبات السحب');
    }
}

// قبول طلب الإيداع
async function approveDeposit(depositId, userId, amount) {
    try {
        showLoading(true);
        
        // تحديث حالة طلب الإيداع
        await db.collection('deposits').doc(depositId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentAdmin.uid
        });
        
        // تحديث رصيد المستخدم
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const newBalance = userData.balance + amount;
        
        await db.collection('users').doc(userId).update({
            balance: newBalance
        });
        
        // تسجيل المعاملة
        await db.collection('transactions').add({
            userId: userId,
            type: 'deposit',
            amount: amount,
            status: 'approved',
            depositId: depositId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إعادة تحميل البيانات
        await loadDashboardData();
        await loadPendingDeposits();
        
        showAlert('تم بنجاح', 'تم قبول طلب الإيداع وتحديث رصيد المستخدم');
        
    } catch (error) {
        console.error('Error approving deposit:', error);
        showAlert('خطأ', 'حدث خطأ في قبول طلب الإيداع');
    } finally {
        showLoading(false);
    }
}

// رفض طلب الإيداع
async function rejectDeposit(depositId) {
    try {
        showLoading(true);
        
        // تحديث حالة طلب الإيداع
        await db.collection('deposits').doc(depositId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: currentAdmin.uid
        });
        
        // إعادة تحميل البيانات
        await loadDashboardData();
        await loadPendingDeposits();
        
        showAlert('تم بنجاح', 'تم رفض طلب الإيداع');
        
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showAlert('خطأ', 'حدث خطأ في رفض طلب الإيداع');
    } finally {
        showLoading(false);
    }
}

// قبول طلب السحب
async function approveWithdrawal(withdrawalId, userId, amount) {
    try {
        showLoading(true);
        
        // تحديث حالة طلب السحب
        await db.collection('withdrawals').doc(withdrawalId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: currentAdmin.uid
        });
        
        // تسجيل المعاملة
        await db.collection('transactions').add({
            userId: userId,
            type: 'withdrawal',
            amount: amount,
            status: 'approved',
            withdrawalId: withdrawalId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إعادة تحميل البيانات
        await loadDashboardData();
        await loadPendingWithdrawals();
        
        showAlert('تم بنجاح', 'تم قبول طلب السحب');
        
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        showAlert('خطأ', 'حدث خطأ في قبول طلب السحب');
    } finally {
        showLoading(false);
    }
}

// رفض طلب السحب
async function rejectWithdrawal(withdrawalId, userId, amount) {
    try {
        showLoading(true);
        
        // تحديث حالة طلب السحب
        await db.collection('withdrawals').doc(withdrawalId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: currentAdmin.uid
        });
        
        // إعادة المبلغ إلى رصيد المستخدم
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const newBalance = userData.balance + amount;
        
        await db.collection('users').doc(userId).update({
            balance: newBalance
        });
        
        // تسجيل المعاملة
        await db.collection('transactions').add({
            userId: userId,
            type: 'withdrawal',
            amount: amount,
            status: 'rejected',
            withdrawalId: withdrawalId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إعادة تحميل البيانات
        await loadDashboardData();
        await loadPendingWithdrawals();
        
        showAlert('تم بنجاح', 'تم رفض طلب السحب وإعادة المبلغ إلى رصيد المستخدم');
        
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        showAlert('خطأ', 'حدث خطأ في رفض طلب السحب');
    } finally {
        showLoading(false);
    }
}

// فتح نافذة تعديل الرصيد
function openBalanceModal(userId, currentBalanceValue) {
    balanceUserId.value = userId;
    currentBalance.value = currentBalanceValue.toFixed(2);
    newBalance.value = currentBalanceValue.toFixed(2);
    balanceReason.value = '';
    
    balanceModal.classList.add('active');
}

// حفظ تعديل الرصيد
async function saveBalance() {
    const userId = balanceUserId.value;
    const newBalanceValue = parseFloat(newBalance.value);
    const reason = balanceReason.value;
    
    if (isNaN(newBalanceValue) || newBalanceValue < 0) {
        showAlert('خطأ', 'الرجاء إدخال قيمة رصيد صحيحة');
        return;
    }
    
    try {
        showLoading(true);
        
        // تحديث رصيد المستخدم
        await db.collection('users').doc(userId).update({
            balance: newBalanceValue
        });
        
        // تسجيل تعديل الرصيد
        await db.collection('balanceChanges').add({
            userId: userId,
            adminId: currentAdmin.uid,
            oldBalance: parseFloat(currentBalance.value),
            newBalance: newBalanceValue,
            reason: reason,
            changedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // إغلاق النافذة وإعادة تحميل البيانات
        balanceModal.classList.remove('active');
        await loadAllUsers();
        
        showAlert('تم بنجاح', 'تم تحديث رصيد المستخدم بنجاح');
        
    } catch (error) {
        console.error('Error updating balance:', error);
        showAlert('خطأ', 'حدث خطأ في تحديث رصيد المستخدم');
    } finally {
        showLoading(false);
    }
}

// فتح نافذة إضافة مهمة
function openAddTaskModal() {
    isEditingTask = false;
    currentTaskId = null;
    taskModalTitle.textContent = 'إضافة مهمة جديدة';
    taskForm.reset();
    taskActive.value = 'true';
    taskModal.classList.add('active');
}

// فتح نافذة تعديل مهمة
async function editTask(taskId) {
    try {
        const taskDoc = await db.collection('tasks').doc(taskId).get();
        
        if (!taskDoc.exists) {
            showAlert('خطأ', 'المهمة غير موجودة');
            return;
        }
        
        const task = taskDoc.data();
        
        isEditingTask = true;
        currentTaskId = taskId;
        taskModalTitle.textContent = 'تعديل المهمة';
        taskId.value = taskId;
        taskTitle.value = task.title;
        taskDescription.value = task.description;
        taskReward.value = task.reward;
        taskActive.value = task.active.toString();
        
        taskModal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading task for edit:', error);
        showAlert('خطأ', 'حدث خطأ في تحميل بيانات المهمة');
    }
}

// حفظ المهمة (إضافة أو تعديل)
async function saveTask() {
    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();
    const reward = parseFloat(taskReward.value);
    const active = taskActive.value === 'true';
    
    // التحقق من صحة البيانات
    if (!title || !description) {
        showAlert('خطأ', 'الرجاء ملء جميع الحقول المطلوبة');
        return;
    }
    
    if (isNaN(reward) || reward <= 0) {
        showAlert('خطأ', 'الرجاء إدخال مكافأة صحيحة');
        return;
    }
    
    try {
        showLoading(true);
        
        const taskData = {
            title: title,
            description: description,
            reward: reward,
            active: active,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (isEditingTask) {
            // تحديث المهمة
            await db.collection('tasks').doc(currentTaskId).update(taskData);
            showAlert('تم بنجاح', 'تم تحديث المهمة بنجاح');
        } else {
            // إضافة مهمة جديدة
            taskData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('tasks').add(taskData);
            showAlert('تم بنجاح', 'تم إضافة المهمة بنجاح');
        }
        
        // إغلاق النافذة وإعادة تحميل البيانات
        taskModal.classList.remove('active');
        await loadTasks();
        await loadDashboardData();
        
    } catch (error) {
        console.error('Error saving task:', error);
        showAlert('خطأ', 'حدث خطأ في حفظ المهمة');
    } finally {
        showLoading(false);
    }
}

// حذف المهمة
async function deleteTask(taskId) {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        return;
    }
    
    try {
        showLoading(true);
        
        await db.collection('tasks').doc(taskId).delete();
        
        await loadTasks();
        await loadDashboardData();
        
        showAlert('تم بنجاح', 'تم حذف المهمة بنجاح');
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showAlert('خطأ', 'حدث خطأ في حذف المهمة');
    } finally {
        showLoading(false);
    }
}

// البحث عن المستخدمين
if (userSearch) {
    userSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            displayUsers(allUsers);
            return;
        }
        
        const filteredUsers = allUsers.filter(user => 
            user.email.toLowerCase().includes(searchTerm)
        );
        
        displayUsers(filteredUsers);
    });
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التنقل بين الأقسام
    adminNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            
            // إزالة النشاط من جميع الروابط
            adminNavLinks.forEach(l => l.classList.remove('active'));
            
            // إضافة النشاط للرابط الحالي
            this.classList.add('active');
            
            // إخفاء جميع الأقسام
            adminSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // إظهار القسم المطلوب
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // إضافة مهمة جديدة
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', openAddTaskModal);
    }
    
    // حفظ المهمة
    if (saveTaskBtn) {
        saveTaskBtn.addEventListener('click', saveTask);
    }
    
    // إلغاء إضافة/تعديل المهمة
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', () => {
            taskModal.classList.remove('active');
        });
    }
    
    // حفظ تعديل الرصيد
    if (saveBalanceBtn) {
        saveBalanceBtn.addEventListener('click', saveBalance);
    }
    
    // إلغاء تعديل الرصيد
    if (cancelBalanceBtn) {
        cancelBalanceBtn.addEventListener('click', () => {
            balanceModal.classList.remove('active');
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
    
    // إغلاق النوافذ
    modalClose.forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // إغلاق النوافذ بالنقر خارجها
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
    
    // إغلاق نافذة التنبيهات
    if (alertClose) {
        alertClose.addEventListener('click', () => {
            alertModal.classList.remove('active');
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
