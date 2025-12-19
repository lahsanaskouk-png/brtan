// قواعد المصادقة (Authentication)
// لا حاجة لتعديلها، استخدام الإعدادات الافتراضية

// قواعد Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // قاعدة للمستخدمين
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // الأدمن يمكنه تعديل أي مستخدم
      match /{document=**} {
        allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      }
    }
    
    // قاعدة للمهام
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // قاعدة للمهام المكتملة
    match /completedTasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // قاعدة للإيداعات
    match /deposits/{depositId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if false;
    }
    
    // قاعدة للسحوبات
    match /withdrawals/{withdrawalId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow delete: if false;
    }
    
    // قاعدة للأرباح
    match /earnings/{earningId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // قاعدة للمعاملات
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // قاعدة لتعديلات الرصيد
    match /balanceChanges/{changeId} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}

// قواعد التخزين (Storage)
service firebase.storage {
  match /b/{bucket}/o {
    // قاعدة لصور إثبات التحويل
    match /deposit-proofs/{userId}/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
