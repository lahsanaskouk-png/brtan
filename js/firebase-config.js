// إعدادات Firebase - يجب استبدالها بإعدادات مشروعك
const firebaseConfig = {
    apiKey: "AIzaSyBmOOERF0KkDQ7G08L7_F7TuM7SItkoO_o",
    authDomain: "brtiol.firebaseapp.com",
    projectId: "brtiol",
    storageBucket: "brtiol.firebasestorage.app",
    messagingSenderId: "711908351848",
    appId: "1:711908351848:web:a6c1ac4836988c4a7340dd"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مراجع Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
