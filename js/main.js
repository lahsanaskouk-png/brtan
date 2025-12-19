// إدارة القائمة المتنقلة
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
    
    // إغلاق القائمة عند النقر على رابط
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// عرض بعض المهام في الصفحة الرئيسية
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname === '/') {
        loadSampleTasks();
    }
});

function loadSampleTasks() {
    const tasksGrid = document.querySelector('.tasks-grid');
    
    if (!tasksGrid) return;
    
    const sampleTasks = [
        {
            title: 'متابعة حساب على إنستغرام',
            description: 'اتبع حسابنا على إنستغرام وأرسل لنا اسم المستخدم الخاص بك كمصادقة.',
            reward: 2.50
        },
        {
            title: 'الإعجاب بصفحة على فيسبوك',
            description: 'أعجب بصفحتنا على فيسبوك واترك تعليقاً على أحد المنشورات.',
            reward: 1.75
        },
        {
            title: 'مشاهدة فيديو تعريفي',
            description: 'شاهد الفيديو التعريفي الخاص بنا على يوتيوب لمدة دقيقة على الأقل.',
            reward: 3.00
        }
    ];
    
    tasksGrid.innerHTML = '';
    
    sampleTasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.innerHTML = `
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
                <button class="btn btn-outline btn-block" onclick="window.location.href='auth.html?action=register'">
                    سجّل لإكمال المهمة
                </button>
            </div>
        `;
        
        tasksGrid.appendChild(taskCard);
    });
}
