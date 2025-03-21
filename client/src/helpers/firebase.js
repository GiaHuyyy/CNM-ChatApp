import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBQD5LfdYCllpxfqXRZUOdl9R_wo09bSMk",
    authDomain: "chatapp-verify-otp.firebaseapp.com",
    projectId: "chatapp-verify-otp",
    storageBucket: "chatapp-verify-otp.firebasestorage.app",
    messagingSenderId: "841970760607",
    appId: "1:841970760607:web:d8ccd919bbeb57649c5baa",
    measurementId: "G-P271ZXKEM9"
  };

firebase.initializeApp(firebaseConfig);

export default firebase;