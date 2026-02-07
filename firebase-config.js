import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js"; // ADD THIS LINE


const firebaseConfig = {
  apiKey: "AIzaSyBR5fQ0TelsLRtxKNjoQ8-sjrHs_XMaAUA",
  authDomain: "edubuddy-b8a87.firebaseapp.com",
  projectId: "edubuddy-b8a87",
  storageBucket: "edubuddy-b8a87.firebasestorage.app",
  messagingSenderId: "334052246296",
  appId: "1:334052246296:web:6122304ca33e49594c946d",
  // measurementId: "G-C4DRS90EZN", // Optional
  databaseURL: "https://edubuddy-b8a87-default-rtdb.asia-southeast1.firebasedatabase.app/" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); 

export { auth, db }; 
