import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCO5xth5F7pVfwSAXaeKOVZQgtSY_Pqxvs",
  authDomain: "archub-616b7.firebaseapp.com",
  projectId: "archub-616b7",
  storageBucket: "archub-616b7.firebasestorage.app",
  messagingSenderId: "1050147225567",
  appId: "1:1050147225567:web:4b46990d71e1f1d8cece6a",
  measurementId: "G-LC5T6YFQNN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const demoProjects = [
  {
    name: "ArcScan",
    category: "Infrastructure",
    description: "Blockchain explorer and analytics platform for the Arc ecosystem.",
    builderName: "Arc Labs",
    website: "https://arcscan.io",
    xUrl: "https://x.com/arcscan",
    logo: "",
    likesCount: 0,
    isDemo: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "demo-builder",
    userEmail: "demo@arcscan.io",
    userName: "Arc Labs",
    submitterEmail: "demo@arcscan.io",
    submitterName: "Arc Labs",
    builderAvatar: ""
  },
  {
    name: "ArcSwap",
    category: "DeFi",
    description: "Decentralized exchange for trading ecosystem assets with low fees.",
    builderName: "Arc Finance",
    website: "https://arcswap.io",
    xUrl: "https://x.com/arcswap",
    logo: "",
    likesCount: 0,
    isDemo: true,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "demo-builder",
    userEmail: "demo@arcswap.io",
    userName: "Arc Finance",
    submitterEmail: "demo@arcswap.io",
    submitterName: "Arc Finance",
    builderAvatar: ""
  },
  {
    name: "ArcPay",
    category: "Payments",
    description: "Fast crypto payment gateway for merchants and online businesses.",
    builderName: "Arc Payments",
    website: "https://arcpay.io",
    xUrl: "https://x.com/arcpay",
    logo: "",
    likesCount: 0,
    isDemo: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "demo-builder",
    userEmail: "demo@arcpay.io",
    userName: "Arc Payments",
    submitterEmail: "demo@arcpay.io",
    submitterName: "Arc Payments",
    builderAvatar: ""
  },
  {
    name: "ArcAI",
    category: "AI",
    description: "AI-powered assistant helping users navigate the Arc ecosystem.",
    builderName: "Arc Intelligence",
    website: "https://arcai.io",
    xUrl: "https://x.com/arcai",
    logo: "",
    likesCount: 0,
    isDemo: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "demo-builder",
    userEmail: "demo@arcai.io",
    userName: "Arc Intelligence",
    submitterEmail: "demo@arcai.io",
    submitterName: "Arc Intelligence",
    builderAvatar: ""
  },
  {
    name: "ArcTools",
    category: "Tools",
    description: "Developer toolkit including APIs, SDKs and testing utilities.",
    builderName: "Arc Developers",
    website: "https://arctools.io",
    xUrl: "https://x.com/arctools",
    logo: "",
    likesCount: 0,
    isDemo: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "demo-builder",
    userEmail: "demo@arctools.io",
    userName: "Arc Developers",
    submitterEmail: "demo@arctools.io",
    submitterName: "Arc Developers",
    builderAvatar: ""
  }
];

async function seed() {
  if (localStorage.getItem("seeded_projects_v1")) {
    console.log("Demo projects already seeded in localStorage.");
    return;
  }

  // Double check in Firestore by querying where isDemo == true
  try {
    const q = query(collection(db, "projects"), where("isDemo", "==", true));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      console.log("Demo projects already exist in Firestore. Skipping.");
      localStorage.setItem("seeded_projects_v1", "true");
      return;
    }
  } catch (err) {
    console.log("Querying check failed, proceeding to seed anyway:", err);
  }

  console.log("Seeding started...");
  for (const proj of demoProjects) {
    try {
      const docRef = await addDoc(collection(db, "projects"), proj);
      console.log(`Successfully added ${proj.name} with ID: ${docRef.id}`);
    } catch (e) {
      console.error(`Error adding ${proj.name}:`, e);
    }
  }
  localStorage.setItem("seeded_projects_v1", "true");
  console.log("Seeding complete.");
}

seed();
