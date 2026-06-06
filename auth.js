import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, browserPopupRedirectResolver } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, setDoc, getDoc, where, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";



const firebaseConfig = {
  apiKey: "AIzaSyCO5xth5F7pVfwSAXaeKOVZQgtSY_Pqxvs",
  authDomain: "archub-616b7.firebaseapp.com",
  projectId: "archub-616b7",
  storageBucket: "archub-616b7.firebasestorage.app",
  messagingSenderId: "1050147225567",
  appId: "1:1050147225567:web:4b46990d71e1f1d8cece6a",
  measurementId: "G-LC5T6YFQNN"
};

let app, auth, db, provider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
} catch (initError) {
  console.error("Firebase Initialization Error (Likely invalid API Key):", initError);
}

// Safely expose Firebase services to the global window object so app.js can use them
window.ArcFirebase = {
  app: app || null,
  auth: auth || null,
  db: db || null,
  currentUser: null,
  
  signInWithGoogle: async () => {
    if (!auth || !provider) {
      console.error("Cannot sign in: Firebase Auth is not initialized.");
      throw new Error("Firebase Auth is not initialized. Please check your API key.");
    }
    try {
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      return result.user;
    } catch (error) {
      console.error("Authentication Error:", error);
      throw error;
    }
  },
  
  signOutUser: async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  },

  // Firestore DB helpers
  saveProject: async (projectData) => {
    if (!db) throw new Error("Firestore is not initialized.");
    try {
      const { id, ...dataToSave } = projectData;
      console.log("[Firestore] Creating document. Input payload:", projectData);
      const docRef = await addDoc(collection(db, "projects"), dataToSave);
      console.log("[Firestore] Document created successfully. Assigned document ID:", docRef.id);
      return { ...dataToSave, id: docRef.id };
    } catch (error) {
      console.error("[Firestore] Error saving project:", error);
      throw error;
    }
  },

  updateProject: async (projectId, projectData) => {
    if (!db) throw new Error("Firestore is not initialized.");
    console.log("[Firestore] Updating document. Target ID:", projectId, "Payload:", projectData);
    try {
      const docRef = doc(db, "projects", projectId);
      const { id, ...fieldsToUpdate } = projectData;
      await updateDoc(docRef, fieldsToUpdate);
      console.log("[Firestore] Document updated successfully. ID:", projectId);
      return { ...fieldsToUpdate, id: projectId };
    } catch (error) {
      console.error("[Firestore] Error updating document:", projectId, error);
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    console.log("[Firestore] Deleting document. Target ID:", projectId);
    try {
      const docRef = doc(db, "projects", projectId);
      await deleteDoc(docRef);
      console.log("[Firestore] Document deleted successfully. ID:", projectId);
      return true;
    } catch (error) {
      console.error("[Firestore] Error deleting document:", projectId, error);
      throw error;
    }
  },

  getProjects: async () => {
    if (!db) return [];
    try {
      const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const projects = [];
      querySnapshot.forEach((doc) => {
        // Spread data first, then explicitly set id: doc.id so that the actual doc.id takes precedence
        projects.push({ ...doc.data(), id: doc.id });
      });
      return projects;
    } catch (error) {
      console.error("[Firestore] Error fetching projects:", error);
      return [];
    }
  },

  likeProject: async (projectId, userId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    console.log("[Firestore] Liking project. ID:", projectId, "User:", userId);
    try {
      const likeRef = doc(db, "projectLikes", `${userId}_${projectId}`);
      await setDoc(likeRef, { userId, projectId, createdAt: new Date().toISOString() });
      
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, { likesCount: increment(1) });
      console.log("[Firestore] Project liked successfully.");
      return true;
    } catch (error) {
      console.error("[Firestore] Error liking project:", error);
      throw error;
    }
  },

  unlikeProject: async (projectId, userId) => {
    if (!db) throw new Error("Firestore is not initialized.");
    console.log("[Firestore] Unliking project. ID:", projectId, "User:", userId);
    try {
      const likeRef = doc(db, "projectLikes", `${userId}_${projectId}`);
      await deleteDoc(likeRef);
      
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, { likesCount: increment(-1) });
      console.log("[Firestore] Project unliked successfully.");
      return true;
    } catch (error) {
      console.error("[Firestore] Error unliking project:", error);
      throw error;
    }
  },

  getUserLikes: async (userId) => {
    if (!db || !userId) return [];
    try {
      const q = query(collection(db, "projectLikes"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const likedProjectIds = [];
      querySnapshot.forEach((doc) => {
        likedProjectIds.push(doc.data().projectId);
      });
      return likedProjectIds;
    } catch (error) {
      console.error("[Firestore] Error fetching user likes:", error);
      return [];
    }
  }
};

// Listen for Auth State Changes only if auth was successfully initialized
if (auth) {
  onAuthStateChanged(auth, (user) => {
    window.ArcFirebase.currentUser = user;
    
    // Dispatch a custom event so the UI can update
    const event = new CustomEvent("arc-auth-changed", { detail: { user } });
    window.dispatchEvent(event);
  });
} else {
  console.warn("Firebase Auth listener skipped due to initialization failure.");
}
