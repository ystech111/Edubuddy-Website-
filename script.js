import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js"

import { ref, get, child } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-database.js";

// DOM Elements for Authentication (ensure these IDs match your HTML)
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm'); // ID used in index.html and register.html
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

// --- Forgot Password Handler (Mostly for index.html) ---
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("loginEmail"); // Assumes this is on the page with the link
    if (!emailInput) {
        console.error("Login email input (#loginEmail) not found for forgot password.");
        if (window.NotificationManager) NotificationManager.error("An page error occurred. Please refresh.");
        return;
    }
    const email = emailInput.value.trim();
    if (!email) {
      if (window.NotificationManager) NotificationManager.info("Please enter your email to reset password.");
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {
        if (window.NotificationManager) NotificationManager.success("Password reset email sent. Check your inbox!");
      })
      .catch((error) => {
        console.error("Forgot Password Error:", error.code, error.message);
        if (window.NotificationManager) {
            if (error.code === "auth/user-not-found") {
                NotificationManager.error("No user found with this email.");
            } else if (error.code === "auth/invalid-email") {
                NotificationManager.error("The email address is not valid.");
            } else {
                NotificationManager.error("Failed to send password reset email.");
            }
        }
      });
  });
}

// --- Tab Switching Logic (for index.html's login/register tabs) ---
if (tabBtns && tabBtns.length > 0 && loginForm && registerForm) {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const formType = btn.dataset.form; // 'login' or 'register'
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
      });

      if (formType === 'login') {
        loginForm.classList.add('active');
      } else if (formType === 'register') {
        registerForm.classList.add('active');
      }
    });
  });
  // Ensure the first tab's form is active by default if tabs exist
  if (tabBtns[0] && tabBtns[0].classList.contains('active') && loginForm) {
    loginForm.classList.add('active');
  } else if (tabBtns[1] && tabBtns[1].classList.contains('active') && registerForm) {
    registerForm.classList.add('active');
  }
}


// --- Registration Logic (handles both index.html and register.html forms if ID is 'registerForm') ---
if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Query within the current form instance for robustness
    const usernameInput = registerForm.querySelector("#username");
    const emailInput = registerForm.querySelector("#registerEmail") || registerForm.querySelector("#email");
    const passwordInput = registerForm.querySelector("#registerPassword") || registerForm.querySelector("#password");
    const confirmPasswordInput = registerForm.querySelector("#confirmPassword");

    if (!emailInput || !passwordInput || !confirmPasswordInput) {
        console.error("A required field (email, password, or confirm password) is missing in the registration form.");
        if(window.NotificationManager) NotificationManager.error("Registration form error. Please refresh.");
        return;
    }
    if (!usernameInput){
        console.warn("Username input not found in registration form.");
    }

    const username = usernameInput ? usernameInput.value.trim() : "New User";
    const email = emailInput.value.trim();
    const password = passwordInput.value; // Do not trim passwords
    const confirmPassword = confirmPasswordInput.value;

    if (password !== confirmPassword) {
      if(window.NotificationManager) NotificationManager.error("Passwords do not match!");
      return;
    }
    if (password.length < 6) {
      if(window.NotificationManager) NotificationManager.error("Password must be at least 6 characters long.");
      return;
    }

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    if (!submitBtn) {
        console.error("Submit button not found in registration form.");
        return;
    }
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        if (username) { // Only update profile if username is provided
            return updateProfile(userCredential.user, { displayName: username });
        }
        return userCredential.user; // Pass user along if no username
      })
      .then((user) => { // user here is userCredential.user or the user from updateProfile
        if (auth.currentUser) { // It's safer to use auth.currentUser for verification
            return sendEmailVerification(auth.currentUser);
        } else {
            console.error("User object not available to send verification email.");
            return Promise.reject(new Error("User not available for verification."));
        }
      })
      .then(() => {
        if(window.NotificationManager) NotificationManager.success("Verification email sent! Please check your inbox and verify before logging in.");
        registerForm.reset();
        // If on index.html (where tabs exist), switch to login form
        if (tabBtns && tabBtns.length > 0 && typeof tabBtns[0].click === 'function' && loginForm) {
            tabBtns[0].click(); // Assumes first tab is login
        }
      })
      .catch((error) => {
        console.error("Registration Error:", error.code, error.message);
        if(window.NotificationManager) {
            if (error.code === "auth/email-already-in-use") {
                NotificationManager.error("This email is already registered.");
            } else if (error.code === "auth/invalid-email") {
                NotificationManager.error("The email address is not valid.");
            } else if (error.code === "auth/weak-password") {
                NotificationManager.error("Password is too weak.");
            } else {
                NotificationManager.error("Registration failed: " + error.message);
            }
        }
      })
      .finally(() => { // Ensure button is re-enabled
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  });
}

// --- Login Logic (handles loginForm on index.html) ---
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    if (!emailInput || !passwordInput) {
        console.error("Email or Password input not found in login form.");
        if(window.NotificationManager) NotificationManager.error("Login form error. Please refresh.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value; // Do not trim passwords

    const submitBtn = loginForm.querySelector('button[type="submit"]');
     if (!submitBtn) {
        console.error("Submit button not found in login form.");
        return;
    }
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        if (!user.emailVerified) {
          if(window.NotificationManager) NotificationManager.error("Please verify your email before logging in. Check your inbox.");
          // Optionally, sign out the user if email not verified, or offer to resend.
          // auth.signOut();
          return; // Stop further action
        }
        if(window.NotificationManager) NotificationManager.success("Login successful! Redirecting...");
        localStorage.setItem('userName', user.displayName || user.email.split('@')[0]); // Store username for dashboard
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      })
      .catch((error) => {
        console.error("Login Error:", error.code, error.message);
        if (window.NotificationManager) {
            if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                NotificationManager.error("Incorrect email or password.");
            } else if (error.code === "auth/invalid-email") {
                NotificationManager.error("The email address is not valid.");
            }  else if (error.code === "auth/too-many-requests") {
                NotificationManager.error("Access temporarily disabled due to many failed login attempts. Try again later or reset your password.");
            } else {
                NotificationManager.error("Login failed: " + error.message);
            }
        }
      })
      .finally(() => { // Ensure button is re-enabled
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      });
  });
}

// --- Dashboard specific logic will be added later ---
// Example: Logout functionality (can be here as #logout is global, but better scoped if possible)
const logoutButton = document.getElementById('logout');
if (logoutButton && window.location.pathname.endsWith('dashboard.html')) { // Only if on dashboard
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            localStorage.removeItem('userName');
            if(window.NotificationManager) NotificationManager.success("Logged out successfully.");
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Logout Error', error);
            if(window.NotificationManager) NotificationManager.error("Logout failed. Please try again.");
        });
    });
}


// ... (all your existing working authentication code and logout function from the previous step should be above this) ...

// --- DASHBOARD AND FIREBASE REALTIME DATABASE LOGIC STARTS HERE ---
// This code will only attempt to run if on dashboard.html

if (window.location.pathname.endsWith('dashboard.html')) {

    // DOM Elements for Dashboard Material Popup and Interactions
    const pdfNotesLink = document.getElementById('pdfNotes');
    const pyqLink = document.getElementById('pyq');
    const syllabusLink = document.getElementById('syllabus');
    const materialPopup = document.getElementById('materialPopup');
    const closePopupBtn = document.getElementById('closePopup');
    const departmentSelect = document.getElementById('department');
    const semesterSelect = document.getElementById('semester');
    const subjectSelect = document.getElementById('subject');
    const unitSelect = document.getElementById('unit');
    const examTypeSelect = document.getElementById('examType');
    const getMaterialBtn = document.getElementById('getMaterial');

    const subjectGroup = document.getElementById('subjectGroup'); // div containing subject dropdown
    const unitGroup = document.getElementById('unitGroup');       // div containing unit dropdown
    const examTypeGroup = document.getElementById('examTypeGroup'); // div containing exam type dropdown
    const dashboardUsernameDisplay = document.getElementById('username'); // span to display username on dashboard
    const materialPopupTitle = materialPopup ? materialPopup.querySelector('.popup-header h2') : null;
    const mainContentForBlur = document.querySelector('.main-content'); // For blur effect

    let currentMaterialType = ''; // Stores "PDF Notes", "PYQs", or "Syllabus"

    // Map for HTML select values to Firebase keys (ensure these match your DB structure)
    const departmentMap = {
        "it": "IT",
        "mech": "Mechanics" // Assuming "Mechanics" is the key in Firebase for Mechanical
    };

    // Function to display username on dashboard
    function displayDashboardUsername() {
        if (auth.currentUser && dashboardUsernameDisplay) {
            dashboardUsernameDisplay.textContent = auth.currentUser.displayName || localStorage.getItem('userName') || 'User';
        } else if (dashboardUsernameDisplay && localStorage.getItem('userName')) {
            dashboardUsernameDisplay.textContent = localStorage.getItem('userName');
        }
    }

    // Update username when auth state changes or page loads
    auth.onAuthStateChanged(user => {
        if (user) {
            displayDashboardUsername();
        } else {
            // If user is not logged in and on dashboard, redirect (client-side)
            // console.log("User not logged in, redirecting from dashboard.");
            // window.location.href = 'index.html';
        }
    });
    // Initial call in case user is already logged in when dashboard loads
    displayDashboardUsername();

    function applyBlur(shouldBlur) {
        if (mainContentForBlur) {
            if (shouldBlur) {
                mainContentForBlur.classList.add('blur-effect');
            } else {
                mainContentForBlur.classList.remove('blur-effect');
            }
        }
    }

    function resetPopupForm() {
        if (departmentSelect) departmentSelect.value = "";
        if (semesterSelect) semesterSelect.value = "";
        if (subjectSelect) subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        if (unitSelect) unitSelect.innerHTML = '<option value="">Select Unit</option>';
        if (examTypeSelect) examTypeSelect.value = "";

        if (subjectGroup) subjectGroup.style.display = 'none';
        if (unitGroup) unitGroup.style.display = 'none';
        if (examTypeGroup) examTypeGroup.style.display = 'none';
    }

    function openMaterialPopup(materialType) {
        if (!materialPopup || !materialPopupTitle) {
            console.error("Material popup elements not found!");
            return;
        }
        currentMaterialType = materialType;
        resetPopupForm();
        materialPopup.style.display = 'flex';
        applyBlur(true);
        materialPopupTitle.textContent = `Select ${materialType}`;

        // Configure visibility of dropdowns based on material type
        // These checks ensure elements exist before trying to modify style
        if (materialType === 'PDF Notes') {
            if (subjectGroup) subjectGroup.style.display = 'block';
            if (unitGroup) unitGroup.style.display = 'block';
            if (examTypeGroup) examTypeGroup.style.display = 'none';
        } else if (materialType === 'PYQs') {
            if (subjectGroup) subjectGroup.style.display = 'block';
            if (unitGroup) unitGroup.style.display = 'none';
            if (examTypeGroup) examTypeGroup.style.display = 'block';
        } else if (materialType === 'Syllabus') {
            if (subjectGroup) subjectGroup.style.display = 'none';
            if (unitGroup) unitGroup.style.display = 'none';
            if (examTypeGroup) examTypeGroup.style.display = 'none';
        }
    }

    // Event Listeners for Sidebar Links to open popup
    if (pdfNotesLink) {
        pdfNotesLink.addEventListener('click', (e) => {
            e.preventDefault();
            openMaterialPopup('PDF Notes');
        });
    }
    if (pyqLink) {
        pyqLink.addEventListener('click', (e) => {
            e.preventDefault();
            openMaterialPopup('PYQs');
        });
    }
    if (syllabusLink) {
        syllabusLink.addEventListener('click', (e) => {
            e.preventDefault();
            openMaterialPopup('Syllabus');
        });
    }

    // Close popup button
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            if (materialPopup) materialPopup.style.display = 'none';
            applyBlur(false);
        });
    }
    // Close popup if clicked outside
    if (materialPopup) {
        materialPopup.addEventListener('click', (e) => {
            if (e.target === materialPopup) {
                materialPopup.style.display = 'none';
                applyBlur(false);
            }
        });
    }


    // Populate Subjects based on Department and Semester
    async function populateSubjects() {
        if (!departmentSelect || !semesterSelect || !subjectSelect || !db) {
            console.warn("Dropdowns or DB not ready for populating subjects.");
            return;
        }

        const deptValue = departmentSelect.value; // e.g., "it"
        const semValue = semesterSelect.value;   // e.g., "1"
        subjectSelect.innerHTML = '<option value="">Loading Subjects...</option>';
        if (unitSelect) unitSelect.innerHTML = '<option value="">Select Unit</option>'; // Reset subsequent dropdown

        if (!deptValue || !semValue) {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            return;
        }

        const firebaseDeptKey = departmentMap[deptValue]; // e.g., "IT"
        if (!firebaseDeptKey) {
            subjectSelect.innerHTML = '<option value="">Invalid Department</option>';
            console.error("Invalid department key for Firebase:", deptValue);
            return;
        }

        let pathType = currentMaterialType === "PYQs" ? "PYQ" : "PDF Notes";
        if (currentMaterialType === "Syllabus") {
            if (subjectGroup) subjectGroup.style.display = 'none';
            return; // Syllabus might not need subjects based on your structure
        } else {
            if (subjectGroup) subjectGroup.style.display = 'block';
        }

        const dbRefNodePath = `${pathType}/Department/${firebaseDeptKey}/Semester ${semValue}/Subjects`;
        try {
            const snapshot = await get(child(ref(db), dbRefNodePath));
            if (snapshot.exists()) {
                const subjects = snapshot.val();
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';
                for (const subjectName in subjects) {
                    const option = document.createElement('option');
                    option.value = subjectName; // Use the exact subject name key from Firebase
                    option.textContent = subjectName;
                    subjectSelect.appendChild(option);
                }
            } else {
                subjectSelect.innerHTML = '<option value="">No Subjects Found</option>';
                console.log("No subjects found at path:", dbRefNodePath);
            }
        } catch (error) {
            console.error("Error fetching subjects from path", dbRefNodePath, ":", error);
            subjectSelect.innerHTML = '<option value="">Error Loading Subjects</option>';
            if (window.NotificationManager) NotificationManager.error("Failed to load subjects.");
        }
    }

    // Populate Units based on Department, Semester, and Subject (for PDF Notes)
    async function populateUnits() {
        if (currentMaterialType !== 'PDF Notes') {
            if (unitGroup) unitGroup.style.display = 'none';
            return;
        }
        if (!departmentSelect || !semesterSelect || !subjectSelect || !unitSelect || !db) {
            console.warn("Dropdowns or DB not ready for populating units.");
            if (unitGroup) unitGroup.style.display = 'none';
            return;
        }
        if (unitGroup) unitGroup.style.display = 'block';


        const deptValue = departmentSelect.value;
        const semValue = semesterSelect.value;
        const subjectValue = subjectSelect.value; // This is the key from Firebase, e.g., "Engineering Mathematics-I"
        unitSelect.innerHTML = '<option value="">Loading Units...</option>';

        if (!deptValue || !semValue || !subjectValue) {
            unitSelect.innerHTML = '<option value="">Select Unit</option>';
            return;
        }
        const firebaseDeptKey = departmentMap[deptValue];
        if (!firebaseDeptKey) {
            unitSelect.innerHTML = '<option value="">Invalid Department</option>';
            console.error("Invalid department key for Firebase:", deptValue);
            return;
        }

        const dbRefNodePath = `PDF Notes/Department/${firebaseDeptKey}/Semester ${semValue}/Subjects/${subjectValue}`;
        try {
            const snapshot = await get(child(ref(db), dbRefNodePath));
            if (snapshot.exists()) {
                const unitsData = snapshot.val(); // Object like {"Unit I": {Name:"...", getPDFlink:"..."}, ...}
                unitSelect.innerHTML = '<option value="">Select Unit</option>';
                for (const unitKey in unitsData) { // unitKey will be "Unit I", "Unit II"
                    if (typeof unitsData[unitKey] === 'object' && unitsData[unitKey] !== null && unitsData[unitKey].hasOwnProperty('Name')) {
                        const option = document.createElement('option');
                        option.value = unitKey; // Value is the key e.g., "Unit I"
                        option.textContent = unitsData[unitKey].Name; // Display text is the full name
                        unitSelect.appendChild(option);
                    }
                }
            } else {
                unitSelect.innerHTML = '<option value="">No Units Found</option>';
                console.log("No units found at path:", dbRefNodePath);
            }
        } catch (error) {
            console.error("Error fetching units from path", dbRefNodePath, ":", error);
            unitSelect.innerHTML = '<option value="">Error Loading Units</option>';
            if (window.NotificationManager) NotificationManager.error("Failed to load units.");
        }
    }

    // Event listeners for dropdown changes to trigger population of next dropdown
    if (departmentSelect) departmentSelect.addEventListener('change', populateSubjects);
    if (semesterSelect) semesterSelect.addEventListener('change', populateSubjects);

    if (subjectSelect) {
        subjectSelect.addEventListener('change', () => {
            if (currentMaterialType === 'PDF Notes') {
                populateUnits();
            } else {
                // For PYQs or Syllabus, units are not typically selected after subject
                if (unitGroup) unitGroup.style.display = 'none';
                if (unitSelect) unitSelect.innerHTML = '<option value="">Select Unit</option>';
            }
        });
    }

    // Handle "Get Material" Button Click
    if (getMaterialBtn) {
        getMaterialBtn.addEventListener('click', async () => {
            if (!departmentSelect || !semesterSelect || !db) {
                 if (window.NotificationManager) NotificationManager.error("Page components not ready.");
                return;
            }

            const deptValue = departmentSelect.value;
            const semValue = semesterSelect.value;

            if (!deptValue || !semValue) {
                if (window.NotificationManager) NotificationManager.error("Please select Department and Semester.");
                return;
            }
            const firebaseDeptKey = departmentMap[deptValue];
            if (!firebaseDeptKey) {
                if (window.NotificationManager) NotificationManager.error("Invalid department selection.");
                return;
            }

            let pathToLink = '';
            let linkField = ''; // The field in Firebase that holds the URL

            if (currentMaterialType === 'PDF Notes') {
                if (!subjectSelect || !unitSelect) return; // Should not happen if UI is correct
                const subjectValue = subjectSelect.value;
                const unitValue = unitSelect.value; // This is the key like "Unit I"
                if (!subjectValue || !unitValue) {
                    if (window.NotificationManager) NotificationManager.error("Please select Subject and Unit for PDF Notes.");
                    return;
                }
                pathToLink = `PDF Notes/Department/${firebaseDeptKey}/Semester ${semValue}/Subjects/${subjectValue}/${unitValue}`;
                linkField = 'getPDFlink';
            } else if (currentMaterialType === 'PYQs') {
                if (!subjectSelect || !examTypeSelect) return; // Should not happen
                const subjectValue = subjectSelect.value;
                const examTypeValue = examTypeSelect.value; // "insem" or "endsem"
                if (!subjectValue || !examTypeValue) {
                    if (window.NotificationManager) NotificationManager.error("Please select Subject and Exam Type for PYQs.");
                    return;
                }
                const firebaseExamType = examTypeValue.charAt(0).toUpperCase() + examTypeValue.slice(1); // "Insem" or "Endsem"
                pathToLink = `PYQ/Department/${firebaseDeptKey}/Semester ${semValue}/Subjects/${subjectValue}/${firebaseExamType}`;
                linkField = 'getPYQlink';
            } else if (currentMaterialType === 'Syllabus') {
                pathToLink = `Syllabus Structure/Department/${firebaseDeptKey}/Semester ${semValue}`;
                linkField = 'Get Syllabus Structure'; // Matches your JSON key
            } else {
                if (window.NotificationManager) NotificationManager.error("Invalid material type selected.");
                return;
            }

            const originalButtonText = getMaterialBtn.innerHTML;
            getMaterialBtn.disabled = true;
            getMaterialBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';

            try {
                const snapshot = await get(child(ref(db), `${pathToLink}/${linkField}`));
                if (snapshot.exists() && snapshot.val()) {
                    const materialLink = snapshot.val();
                    if (materialLink && typeof materialLink === 'string' && materialLink.trim() !== '' && materialLink.startsWith('http')) {
                        if (window.NotificationManager) NotificationManager.success("Material link found! Opening...");
                        window.open(materialLink, '_blank'); // Open link in a new tab
                    } else {
                        if (window.NotificationManager) NotificationManager.error("Material link is empty, invalid, or not a valid URL.");
                        console.warn("Invalid link retrieved:", materialLink, "from path:", `${pathToLink}/${linkField}`);
                    }
                } else {
                    if (window.NotificationManager) NotificationManager.error("Material not found for the selected criteria.");
                    console.log("No data found at path:", `${pathToLink}/${linkField}`);
                }
            } catch (error) {
                console.error("Error fetching material link from path", `${pathToLink}/${linkField}`, ":", error);
                if (window.NotificationManager) NotificationManager.error("Failed to fetch material. Please try again.");
            } finally {
                getMaterialBtn.disabled = false;
                getMaterialBtn.innerHTML = originalButtonText;
            }
        });
    }
    // Add blur style dynamically for main content when popup is active
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .main-content.blur-effect {
        filter: blur(4px);
        pointer-events: none; /* Optional: prevent interaction with blurred content */
        transition: filter 0.3s ease-out;
      }
    `;
    document.head.appendChild(styleElement);


    // --- SEARCH FUNCTIONALITY ---
       const searchInput = document.getElementById('dashboardSearchInput');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const searchResultsList = document.getElementById('searchResultsList');

    let allSearchableData = []; // To store fetched data for searching

    async function fetchAllSearchableData() {
        if (!db) {
            console.error("Database not initialized for search.");
            return [];
        }
        const dataRoots = [
            { type: "PDF Notes", rootPath: "PDF Notes/Department", linkField: "getPDFlink", details: "unit" },
            { type: "PYQs", rootPath: "PYQ/Department", linkField: "getPYQlink", details: "exam" },
            { type: "Syllabus", rootPath: "Syllabus Structure/Department", linkField: "Get Syllabus Structure", details: "semester" }
        ];
        let combinedData = [];
        const dbRef = ref(db);

        console.log("Starting to fetch all searchable data...");

        for (const itemRoot of dataRoots) {
            try {
                const deptSnapshot = await get(child(dbRef, itemRoot.rootPath));
                if (!deptSnapshot.exists()) {
                    console.warn(`No data found for ${itemRoot.type} at path: ${itemRoot.rootPath}`);
                    continue;
                }

                const departments = deptSnapshot.val();
                for (const deptName in departments) {
                    const semesters = departments[deptName];
                    for (const semKey in semesters) { // semKey is "Semester 1", "Semester 2", etc.
                        const semesterNumber = semKey.replace('Semester ', '').trim();
                        const currentPathDisplay = `${deptName} > ${semKey}`;

                        if (itemRoot.details === "semester") { // Syllabus
                            const syllabusData = semesters[semKey];
                            if (syllabusData && syllabusData[itemRoot.linkField]) {
                                combinedData.push({
                                    type: itemRoot.type,
                                    department: deptName,
                                    semester: semesterNumber,
                                    name: `${itemRoot.type} - ${deptName} - ${semKey}`,
                                    link: syllabusData[itemRoot.linkField],
                                    pathDisplay: currentPathDisplay,
                                    searchText: `${itemRoot.type} ${deptName} ${semKey} syllabus`.toLowerCase()
                                });
                            }
                        } else { // PDF Notes and PYQs have Subjects
                            const subjectsData = semesters[semKey].Subjects;
                            if (subjectsData) {
                                for (const subjectName in subjectsData) {
                                    const subjectDetails = subjectsData[subjectName];
                                    const subjectPathDisplay = `${currentPathDisplay} > ${subjectName}`;

                                    if (itemRoot.details === "unit") { // PDF Notes
                                        for (const unitKey in subjectDetails) { // unitKey is "Unit I", "Unit II"
                                            const unitData = subjectDetails[unitKey];
                                            if (unitData && unitData.Name && unitData[itemRoot.linkField]) {
                                                combinedData.push({
                                                    type: itemRoot.type,
                                                    department: deptName,
                                                    semester: semesterNumber,
                                                    subject: subjectName,
                                                    unitName: unitData.Name, // Full name of the unit
                                                    unitKey: unitKey,       // Key like "Unit I"
                                                    name: `${subjectName} - ${unitData.Name}`,
                                                    link: unitData[itemRoot.linkField],
                                                    pathDisplay: `${subjectPathDisplay} > ${unitData.Name}`,
                                                    searchText: `${itemRoot.type} ${deptName} ${semKey} ${subjectName} ${unitData.Name} ${unitKey} pdf notes`.toLowerCase()
                                                });
                                            }
                                        }
                                    } else if (itemRoot.details === "exam") { // PYQs
                                        for (const examKey in subjectDetails) { // examKey is "Insem", "Endsem"
                                            const examData = subjectDetails[examKey];
                                            if (examData && examData[itemRoot.linkField]) {
                                                combinedData.push({
                                                    type: itemRoot.type,
                                                    department: deptName,
                                                    semester: semesterNumber,
                                                    subject: subjectName,
                                                    examType: examKey,
                                                    name: `${subjectName} - ${examKey} ${itemRoot.type}`,
                                                    link: examData[itemRoot.linkField],
                                                    pathDisplay: `${subjectPathDisplay} > ${examKey}`,
                                                    searchText: `${itemRoot.type} ${deptName} ${semKey} ${subjectName} ${examKey} pyq previous year question paper`.toLowerCase()
                                                });
                                            }
                                        }
                                    }
                                }
                            } else {
                               // console.warn(`No subjects found for ${deptName} > ${semKey} in ${itemRoot.type}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error fetching data for ${itemRoot.type}:`, error);
                if (window.NotificationManager) NotificationManager.error(`Could not load some ${itemRoot.type} for search.`);
            }
        }
        console.log("fetchAllSearchableData complete. Total items:", combinedData.length);
        // console.log("Sample of fetched data:", combinedData.slice(0, 5)); // Log first 5 items
        return combinedData;
    }

    function displaySearchResults(results) {
        if (!searchResultsList || !searchResultsContainer) return;
        searchResultsList.innerHTML = '';

        if (results.length === 0) {
            searchResultsList.innerHTML = '<p class="no-results">No materials found matching your search.</p>';
            searchResultsContainer.style.display = 'block';
            return;
        }

        results.forEach(item => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';
            resultElement.innerHTML = `
                <div class="result-item-info">
                    <h4>${item.name}</h4>
                    <p><strong>Type:</strong> ${item.type}</p>
                    <p class="result-path">${item.pathDisplay}</p>
                </div>
                <a href="${item.link}" target="_blank" class="btn-view-result">View</a>
            `;
            searchResultsList.appendChild(resultElement);
        });
        searchResultsContainer.style.display = 'block';
    }

    function performSearch(query) {
        const trimmedQuery = query.trim();
        // console.log(`Performing search for: "${trimmedQuery}"`);

        if (!trimmedQuery) {
            if (searchResultsContainer) searchResultsContainer.style.display = 'none';
            if (searchResultsList) searchResultsList.innerHTML = '';
            return;
        }

        if (allSearchableData.length === 0) {
            // console.warn("allSearchableData is empty. Cannot perform search.");
            // displaySearchResults([]); // Show "no results" if data isn't loaded
            return;
        }

        const lowerCaseQuery = trimmedQuery.toLowerCase();
        const filteredResults = allSearchableData.filter(item => {
            // The item.searchText already contains all relevant terms in lowercase
            return item.searchText.includes(lowerCaseQuery);
        });

        // console.log(`Found ${filteredResults.length} results for query "${trimmedQuery}"`);
        displaySearchResults(filteredResults);
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value); // Pass the raw value, trim inside performSearch
        });
    }

    // Fetch all data when dashboard loads.
    // This is crucial for the search to work.
    fetchAllSearchableData().then(data => {
        allSearchableData = data;
        if (allSearchableData.length > 0) {
            console.log("Search data initialized successfully.");
            // Optional: Perform an empty search to clear any stale display if needed,
            // or if search input might have a pre-filled value on load.
            // performSearch(searchInput ? searchInput.value : "");
        } else {
            console.warn("No data was loaded for the search functionality. Search will not work effectively.");
            // You might want to inform the user or disable search if no data.
        }
    }).catch(err => {
        console.error("Failed to initialize search data:", err);
        if(window.NotificationManager) NotificationManager.error("Search functionality might be limited due to a data loading error.");
    });

// ... (rest of your dashboard logic, like popup handlers, blur effect style) ...

} // End of: if (window.location.pathname.endsWith('dashboard.html'))
