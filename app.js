// ===================================================
// Announcement Modal Handler
// ===================================================

/**
 * Initialize and manage announcement modal
 * - Show only once per browser using localStorage
 * - Support keyboard (Escape), backdrop click, and button interactions
 * - Open V2 URL in new tab on primary button click
 */
function initializeAnnouncementModal() {
  const MODAL_STORAGE_KEY = 'archub_v2_announcement_dismissed';
  const V2_URL = 'https://archub-v2.vercel.app/';
  
  const modal = document.getElementById('announcement-modal');
  const overlay = modal;
  const closeBtn = document.getElementById('announcement-modal-close');
  const visitV2Btn = document.getElementById('announcement-visit-v2');
  const continueBtn = document.getElementById('announcement-continue');
  
  if (!modal || !closeBtn || !visitV2Btn || !continueBtn) {
    console.warn('Announcement modal elements not found');
    return;
  }

  /**
   * Close the modal and clean up
   */
  function closeModal() {
    modal.classList.remove('active');
    modal.classList.add('hidden');
    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Show the modal
   */
  function showModal() {
    modal.classList.remove('hidden');
    modal.classList.add('active');
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Check if modal has been dismissed before
   */
  function hasBeenDismissed() {
    return localStorage.getItem(MODAL_STORAGE_KEY) === 'true';
  }

  /**
   * Mark modal as dismissed in localStorage
   */
  function markAsDismissed() {
    localStorage.setItem(MODAL_STORAGE_KEY, 'true');
  }

  /**
   * Handle close button click
   */
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
    markAsDismissed();
  });

  /**
   * Handle "Continue to Current Site" button
   */
  continueBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
    markAsDismissed();
  });

  /**
   * Handle "Visit Arc Hub V2" button
   */
  visitV2Btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(V2_URL, '_blank');
    closeModal();
    markAsDismissed();
  });

  /**
   * Handle click outside the modal box (backdrop click)
   */
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
      markAsDismissed();
    }
  });

  /**
   * Handle Escape key press
   */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
      markAsDismissed();
    }
  });

  /**
   * Initialize: Show modal on page load if not previously dismissed
   */
  if (!hasBeenDismissed()) {
    showModal();
  }
}

// Initialize announcement modal when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAnnouncementModal);
} else {
  initializeAnnouncementModal();
}

/*
================================================================
Arc Hub — Application Controller (Homepage Restructured)
================================================================
*/

// --- 1. DEFAULT DATA STATE ---
const DEFAULT_PROJECTS = [];

const DEFAULT_BUILDERS = [];

const CATEGORIES = ["AI", "DeFi", "Payments", "Infrastructure", "Tools", "Community"];

// --- 2. STATE MANAGER ---
class StateManager {
  constructor() {
    this.projects = [];
    this.builders = [];
    this.userLikes = new Set();
    this.isLoaded = false;
  }

  async fetchInitialData() {
    try {
      if (window.ArcFirebase && window.ArcFirebase.getProjects) {
        this.projects = await window.ArcFirebase.getProjects();
      } else {
        await new Promise(r => setTimeout(r, 200));
        this.projects = window.ArcFirebase ? await window.ArcFirebase.getProjects() : [];
      }
      
      const currentUser = window.ArcFirebase?.currentUser;
      if (currentUser && window.ArcFirebase.getUserLikes) {
        const likedIds = await window.ArcFirebase.getUserLikes(currentUser.uid);
        this.userLikes = new Set(likedIds);
      } else {
        this.userLikes = new Set();
      }
      
      const builderMap = new Map();
      this.projects.forEach(p => {
        const builderId = p.builderName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!builderMap.has(builderId)) {
          builderMap.set(builderId, {
            id: builderId,
            name: p.builderName,
            projectName: p.name,
            socialUrl: p.xUrl || "https://x.com",
            avatarUrl: p.userPhotoURL || p.builderAvatar || ""
          });
        }
      });
      this.builders = Array.from(builderMap.values());
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load data from Firestore:", err);
      this.projects = [];
      this.builders = [];
      this.userLikes = new Set();
    }
  }

  async addProject(projectData) {
    const projectId = projectData.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    
    const currentUser = window.ArcFirebase ? window.ArcFirebase.currentUser : null;
    if (!currentUser) throw new Error("Unauthenticated");

    const newProject = {
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      category: projectData.category,
      website: projectData.website,
      xUrl: projectData.xUrl || "",
      builderName: projectData.builderName,
      logo: projectData.logo || "",
      createdAt: new Date().toISOString(),
      likesCount: 0,
      userId: currentUser.uid,
      userEmail: currentUser.email || "",
      userName: currentUser.displayName || "",
      userPhotoURL: currentUser.photoURL || "",
      // Keep legacy fields for compatibility
      submitterEmail: currentUser.email || "",
      submitterName: currentUser.displayName || "",
      builderAvatar: currentUser.photoURL || ""
    };
    
    try {
      const savedProject = await window.ArcFirebase.saveProject(newProject);
      this.projects.unshift(savedProject);

      const builderId = projectData.builderName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const builderExists = this.builders.some(b => b.id === builderId);
      if (!builderExists) {
        this.builders.unshift({
          id: builderId,
          name: projectData.builderName,
          projectName: projectData.name,
          socialUrl: projectData.xUrl || "https://x.com",
          avatarUrl: currentUser.photoURL || ""
        });
      }
      return savedProject;
    } catch (err) {
      console.error("Error adding project:", err);
      throw err;
    }
  }

  async updateProject(projectId, projectData) {
    const currentUser = window.ArcFirebase ? window.ArcFirebase.currentUser : null;
    if (!currentUser) throw new Error("Unauthenticated");

    const originalProject = this.projects.find(p => p.id === projectId);
    if (!originalProject) throw new Error("Project not found");

    const isOwner = originalProject.userId === currentUser.uid || 
                    (originalProject.submitterEmail && originalProject.submitterEmail === currentUser.email);
    if (!isOwner) throw new Error("Unauthorized");

    const updatedProject = {
      ...originalProject,
      name: projectData.name,
      description: projectData.description,
      category: projectData.category,
      website: projectData.website,
      xUrl: projectData.xUrl || "",
      builderName: projectData.builderName,
      logo: projectData.logo || "",
      userId: originalProject.userId || currentUser.uid,
      userEmail: originalProject.userEmail || currentUser.email || "",
      userName: originalProject.userName || currentUser.displayName || "",
      userPhotoURL: originalProject.userPhotoURL || currentUser.photoURL || ""
    };

    try {
      const savedProject = await window.ArcFirebase.updateProject(projectId, updatedProject);
      
      const idx = this.projects.findIndex(p => p.id === projectId);
      if (idx !== -1) {
        this.projects[idx] = savedProject;
      }

      // Re-update builders list
      const builderMap = new Map();
      this.projects.forEach(p => {
        const builderId = p.builderName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!builderMap.has(builderId)) {
          builderMap.set(builderId, {
            id: builderId,
            name: p.builderName,
            projectName: p.name,
            socialUrl: p.xUrl || "https://x.com",
            avatarUrl: p.builderAvatar || ""
          });
        }
      });
      this.builders = Array.from(builderMap.values());
      
      return savedProject;
    } catch (err) {
      console.error("Error updating project:", err);
      throw err;
    }
  }

  async deleteProject(projectId) {
    const currentUser = window.ArcFirebase ? window.ArcFirebase.currentUser : null;
    if (!currentUser) throw new Error("Unauthenticated");

    const originalProject = this.projects.find(p => p.id === projectId);
    if (!originalProject) throw new Error("Project not found");

    const isOwner = originalProject.userId === currentUser.uid || 
                    (originalProject.submitterEmail && originalProject.submitterEmail === currentUser.email);
    if (!isOwner) throw new Error("Unauthorized");

    try {
      await window.ArcFirebase.deleteProject(projectId);
      
      this.projects = this.projects.filter(p => p.id !== projectId);

      // Re-update builders list
      const builderMap = new Map();
      this.projects.forEach(p => {
        const builderId = p.builderName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        if (!builderMap.has(builderId)) {
          builderMap.set(builderId, {
            id: builderId,
            name: p.builderName,
            projectName: p.name,
            socialUrl: p.xUrl || "https://x.com",
            avatarUrl: p.builderAvatar || ""
          });
        }
      });
      this.builders = Array.from(builderMap.values());

      return true;
    } catch (err) {
      console.error("Error deleting project:", err);
      throw err;
    }
  }

  getFeaturedProjects() {
    return this.projects.slice(0, 6);
  }
}

const state = new StateManager();

// --- 3. BRAND LOGO GENERATORS (Startup Grade) ---
function getProjectLogoSVG(project) {
  // 1. If project has an uploaded/custom logo:
  if (project.logo) {
    if (project.logo.trim().startsWith("<svg")) {
      return project.logo;
    }
    return `<img src="${project.logo}" alt="${project.name}" class="project-card-logo-image" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />`;
  }

  // 2. Fallback icons based on category:
  const category = project.category ? project.category.trim().toLowerCase() : "";
  if (category === "ai") {
    // Spark icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3v4M12 17v4M5.9 5.9l2.8 2.8M15.3 15.3l2.8 2.8M5.9 18.1l2.8-2.8M15.3 8.7l2.8-2.8"/>
      <path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor"/>
    </svg>`;
  } else if (category === "defi") {
    // Layered blocks icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>`;
  } else if (category === "payments") {
    // Credit card icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="6" y1="15" x2="10" y2="15"/>
    </svg>`;
  } else if (category === "infrastructure") {
    // Cube stack icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L7 4.5 12 7l5-2.5L12 2z"/>
      <path d="M7 4.5V9.5L12 12V7L7 4.5z"/>
      <path d="M17 4.5V9.5L12 12V7L17 4.5z"/>
      <path d="M7 12l-5 2.5 5 2.5 5-2.5L7 12z"/>
      <path d="M2 14.5v5l5 2.5v-5l-5-2.5z"/>
      <path d="M12 14.5v5l-5 2.5v-5l5-2.5z"/>
      <path d="M17 12l-5 2.5 5 2.5 5-2.5L17 12z"/>
      <path d="M12 14.5v5l5 2.5v-5l-5-2.5z"/>
      <path d="M22 14.5v5l-5 2.5v-5l5-2.5z"/>
    </svg>`;
  } else if (category === "tools") {
    // Wrench icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>`;
  } else if (category === "community") {
    // Users icon
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`;
  }

  // Generic fallback if category is unknown: simple circle
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10" />
  </svg>`;
}

// Generate single letter builder monogram initial
function getInitialLetter(name) {
  return name ? name.trim().charAt(0).toUpperCase() : "A";
}

// --- 4. RENDER ENGINE ---
const renderEngine = {
  // Compile project card template
  createProjectCardHtml(project, isDashboard = false) {
    const logoMarkup = getProjectLogoSVG(project);
    const likesCount = project.likesCount || 0;
    const isLiked = state.userLikes.has(project.id);

    const likeButton = `
      <button class="btn-like-project ${isLiked ? 'liked' : ''}" data-project-id="${project.id}" title="${isLiked ? 'Unlike' : 'Like'} this project">
        <svg viewBox="0 0 24 24" class="heart-icon">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">${likesCount}</span>
      </button>
    `;
    
    if (isDashboard) {
      // Management dashboard layout: Show Edit/Delete, hide builder details and socials, show likes in footer
      return `
        <article class="project-card dashboard-card">
          <div class="card-header">
            <div class="project-logo-container">
              ${logoMarkup}
            </div>
            <span class="category-badge badge-${project.category.toLowerCase()}">${project.category}</span>
          </div>
          <h3 class="project-name">${project.name}</h3>
          <p class="project-desc">${project.description}</p>
          
          <div class="card-footer">
            <div class="builder-meta">
              <div class="builder-avatar">${getInitialLetter(project.builderName)}</div>
              <span class="builder-name-text">${project.builderName}</span>
            </div>

            <div class="card-center-link">
              ${likeButton}
            </div>

            <div class="card-action-btns">
              <a href="#/projects/${project.id}/edit" class="card-action-btn edit-btn" title="Edit project">Edit</a>
              <button type="button" class="card-action-btn delete-btn" data-project-id="${project.id}" title="Delete project">Delete</button>
            </div>
          </div>
        </article>
      `;
    } else {
      // Public directory layout
      return `
        <article class="project-card">
          <div class="card-header">
            <div class="project-logo-container">
              ${logoMarkup}
            </div>
            <span class="category-badge badge-${project.category.toLowerCase()}">${project.category}</span>
          </div>
          <h3 class="project-name">${project.name}</h3>
          <p class="project-desc">${project.description}</p>
          
          <div class="card-footer">
            <div class="builder-meta">
              <div class="builder-avatar">${getInitialLetter(project.builderName)}</div>
              <span class="builder-name-text">${project.builderName}</span>
            </div>

            <div class="card-center-link">
              ${likeButton}
            </div>

            <a href="${project.website}" target="_blank" rel="noopener noreferrer" class="card-action-btn" title="Visit ${project.name}">Visit</a>
          </div>
        </article>
      `;
    }
  },

  renderProjects(containerId, projects = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = projects.map(p => this.createProjectCardHtml(p, containerId === "my-projects-grid")).join("");

    // Attach like button listeners
    container.querySelectorAll(".btn-like-project").forEach(btn => {
      btn.addEventListener("click", (e) => handleLikeToggle(e, btn));
    });

    // Attach delete button listeners (for dashboard)
    container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => handleDeleteClick(e, btn));
    });
  },

  renderCategoryFilters(containerId, activeCategory = "All") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = ["All", ...CATEGORIES];
    container.innerHTML = categories
      .map(cat => `<button class="filter-pill ${cat === activeCategory ? 'active' : ''}" data-category="${cat}">${cat}</button>`)
      .join("");

    container.querySelectorAll(".filter-pill").forEach(btn => {
      btn.addEventListener("click", () => handleCategoryFilter(btn));
    });
  },

  renderBuildersGrid(container, builders = []) {
    if (!container) return;

    container.innerHTML = builders.map(builder => `
      <article class="builder-card">
        <div class="builder-card-avatar">${getInitialLetter(builder.name)}</div>
        <h3 class="builder-card-name">${builder.name}</h3>
        <p class="builder-card-project">${builder.projectName}</p>
        <div class="builder-card-socials">
          <a href="${builder.socialUrl}" target="_blank" rel="noopener noreferrer" class="social-icon-link" title="Visit ${builder.name}'s social">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </article>
    `).join("");
  }
};

// --- 5. EVENT HANDLERS ---

// Handle like/unlike toggle
async function handleLikeToggle(e, btn) {
  e.preventDefault();
  e.stopPropagation();
  
  const projectId = btn.dataset.projectId;
  const isLiked = btn.classList.contains("liked");
  
  try {
    const currentUser = window.ArcFirebase?.currentUser;
    if (!currentUser) {
      alert("Please sign in to like projects");
      return;
    }

    if (isLiked) {
      await window.ArcFirebase.removeLike(projectId, currentUser.uid);
      state.userLikes.delete(projectId);
    } else {
      await window.ArcFirebase.addLike(projectId, currentUser.uid);
      state.userLikes.add(projectId);
    }

    // Update UI
    btn.classList.toggle("liked");
    const likeCountEl = btn.querySelector(".like-count");
    if (likeCountEl) {
      const currentCount = parseInt(likeCountEl.textContent) || 0;
      likeCountEl.textContent = isLiked ? currentCount - 1 : currentCount + 1;
    }
  } catch (err) {
    console.error("Error toggling like:", err);
  }
}

// Handle category filter
function handleCategoryFilter(btn) {
  const container = btn.parentElement;
  container.querySelectorAll(".filter-pill").forEach(pill => pill.classList.remove("active"));
  btn.classList.add("active");

  const category = btn.dataset.category;
  const projects = category === "All" ? state.projects : state.projects.filter(p => p.category === category);

  // Update the appropriate grid based on context
  if (container.id === "homepage-category-filters-pills") {
    renderEngine.renderProjects("featured-projects-grid", renderEngine.getFeaturedProjects());
  } else if (container.id === "category-filters-pills") {
    const resultsCount = document.getElementById("results-count");
    if (resultsCount) resultsCount.textContent = `Showing ${projects.length} project${projects.length !== 1 ? 's' : ''}`;
    renderEngine.renderProjects("directory-projects-grid", projects);
  }
}

// Handle delete click
function handleDeleteClick(e, btn) {
  e.preventDefault();
  e.stopPropagation();

  const modal = document.getElementById("custom-confirm-modal");
  const deleteBtn = document.getElementById("confirm-modal-delete-btn");
  const cancelBtn = document.getElementById("confirm-modal-cancel-btn");

  if (!modal) return;

  const projectId = btn.dataset.projectId;

  // Show modal
  modal.classList.remove("hidden");

  // Delete handler
  const onDelete = async () => {
    try {
      await state.deleteProject(projectId);
      
      // Refresh grids
      renderEngine.renderProjects("my-projects-grid", state.projects.filter(p => p.userId === window.ArcFirebase.currentUser.uid));
      
      // Close modal
      modal.classList.add("hidden");
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project");
    }

    // Cleanup
    deleteBtn.removeEventListener("click", onDelete);
    cancelBtn.removeEventListener("click", onCancel);
  };

  const onCancel = () => {
    modal.classList.add("hidden");
    deleteBtn.removeEventListener("click", onDelete);
    cancelBtn.removeEventListener("click", onCancel);
  };

  deleteBtn.addEventListener("click", onDelete);
  cancelBtn.addEventListener("click", onCancel);
}

// --- 6. ROUTER ---
const router = {
  currentPage: "home",

  init() {
    window.addEventListener("hashchange", () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash.slice(1).split("/")[0] || "home";
    this.showPage(hash);
  },

  showPage(pageName) {
    // Hide all sections
    document.querySelectorAll(".page-section").forEach(section => {
      section.classList.remove("active");
    });

    // Show requested section
    const section = document.getElementById(`section-${pageName}`);
    if (section) {
      section.classList.add("active");
      this.currentPage = pageName;

      // Load page-specific data
      if (pageName === "projects") this.loadProjectsPage();
      if (pageName === "my-projects") this.loadMyProjectsPage();
      if (pageName === "builders") this.loadBuildersPage();
    } else {
      // Fallback to home
      document.getElementById("section-home").classList.add("active");
      this.currentPage = "home";
      this.loadHomePage();
    }
  },

  async loadHomePage() {
    renderEngine.renderCategoryFilters("homepage-category-filters-pills");
    renderEngine.renderProjects("featured-projects-grid", renderEngine.getFeaturedProjects());
  },

  async loadProjectsPage() {
    renderEngine.renderCategoryFilters("category-filters-pills");
    renderEngine.renderProjects("directory-projects-grid", state.projects);
    const resultsCount = document.getElementById("results-count");
    if (resultsCount) resultsCount.textContent = `Showing ${state.projects.length} project${state.projects.length !== 1 ? 's' : ''}`;
  },

  async loadMyProjectsPage() {
    const currentUser = window.ArcFirebase?.currentUser;
    if (!currentUser) {
      alert("Please sign in to manage your projects");
      window.location.hash = "#/home";
      return;
    }

    const userProjects = state.projects.filter(p => p.userId === currentUser.uid);
    renderEngine.renderProjects("my-projects-grid", userProjects);
    const resultsCount = document.getElementById("my-projects-results-count");
    if (resultsCount) resultsCount.textContent = `Showing ${userProjects.length} project${userProjects.length !== 1 ? 's' : ''}`;
  },

  async loadBuildersPage() {
    const buildersGrid = document.getElementById("builders-grid");
    renderEngine.renderBuildersGrid(buildersGrid, state.builders);
  }
};

// --- 7. INITIALIZATION ---
async function initializeApp() {
  try {
    // Wait for Firebase to initialize
    await new Promise(resolve => {
      const checkFirebase = setInterval(() => {
        if (window.ArcFirebase) {
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
      setTimeout(() => clearInterval(checkFirebase), 5000);
    });

    // Load data
    await state.fetchInitialData();

    // Initialize router
    router.init();

    // Setup form handlers
    setupFormHandlers();
  } catch (err) {
    console.error("App initialization error:", err);
  }
}

// Setup project submission form
function setupFormHandlers() {
  const form = document.getElementById("project-submission-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const projectData = {
      name: document.getElementById("form-project-name").value,
      category: document.getElementById("form-category").value,
      description: document.getElementById("form-description").value,
      website: document.getElementById("form-website").value,
      xUrl: document.getElementById("form-twitter").value,
      builderName: document.getElementById("form-builder-name").value,
      logo: ""
    };

    try {
      await state.addProject(projectData);
      
      // Show success state
      document.getElementById("project-submission-form").style.display = "none";
      document.getElementById("submit-success-card").classList.remove("hidden");
    } catch (err) {
      console.error("Error submitting project:", err);
      alert("Failed to submit project. Please check your details.");
    }
  });

  // Reset form on "Submit Another" click
  const submitAnotherBtn = document.getElementById("submit-another-btn");
  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("submit-success-card").classList.add("hidden");
      form.style.display = "block";
    });
  }

  // Character counter for description
  const descInput = document.getElementById("form-description");
  if (descInput) {
    descInput.addEventListener("input", () => {
      const count = descInput.value.length;
      const charCountEl = document.getElementById("char-count");
      if (charCountEl) charCountEl.textContent = count;
    });
  }

  // Form input error handling
  const nameInput = document.getElementById("form-project-name");
  if (nameInput) {
    nameInput.addEventListener("blur", function validateName() {
      if (!this.value.trim()) {
        this.style.borderColor = "#ff4444";
      }
      this.addEventListener("input", function resetColor() {
        this.style.borderColor = "";
        this.removeEventListener("input", resetColor);
      });
    });
  }

  const websiteInput = document.getElementById("form-website");
  if (websiteInput) {
    websiteInput.addEventListener("blur", function validateUrl() {
      if (!this.value.trim() || !this.value.startsWith("http")) {
        this.style.borderColor = "#ff4444";
      }
      this.addEventListener("input", function resetColor() {
        this.style.borderColor = "";
        this.removeEventListener("input", resetColor);
      });
    });
  }
}

// Start the app
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
