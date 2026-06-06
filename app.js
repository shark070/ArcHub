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
      <path d="M12 3v4M12 17v4M5 12H1M23 12h-4M5.9 5.9l2.8 2.8M15.3 15.3l2.8 2.8M5.9 18.1l2.8-2.8M15.3 8.7l2.8-2.8"/>
      <path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="currentColor"/>
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
          
          <div class="project-card-actions">
            <button class="btn-card-action btn-edit-project" data-project-id="${project.id}" title="Edit Project">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
            <button class="btn-card-action btn-delete-project" data-project-id="${project.id}" title="Delete Project">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Delete
            </button>
          </div>
          
          <div class="card-footer">
            ${likeButton}
            <a href="${project.website}" target="_blank" rel="noopener noreferrer" class="card-action-btn" aria-label="View Project">
              <span>View Project &nearr;</span>
            </a>
          </div>
        </article>
      `;
    }

    // Public list layout: Keep builder info and View Project, hide management actions
    const builderLetter = getInitialLetter(project.builderName);
    const xLink = project.xUrl ? `
      <a href="${project.xUrl}" target="_blank" rel="noopener noreferrer" class="card-icon-link" aria-label="Twitter X Profile">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      </a>` : '';

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
          <span class="card-footer-owner">By ${project.builderName}</span>
          ${likeButton}
          <a href="${project.website}" target="_blank" rel="noopener noreferrer" class="card-action-btn" aria-label="View Project">
            <span>View Project &nearr;</span>
          </a>
        </div>
      </article>
    `;
  },

  // Render featured projects on homepage (6 items, supports category & search filtering)
  renderFeatured() {
    const grid = document.getElementById("featured-projects-grid");
    if (!grid) return;
    
    const query = router.searchQuery.trim().toLowerCase();
    const activeCat = router.activeCategory;
    
    const filtered = state.projects.filter(p => {
      const matchCat = (activeCat === "All" || p.category.toLowerCase() === activeCat.toLowerCase());
      const matchSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) || 
        p.builderName.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query);
        
      return matchCat && matchSearch;
    }).slice(0, 6);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h4 class="empty-state-title">${state.projects.length === 0 ? "No projects listed yet." : "No projects found in this category."}</h4>
          <p class="empty-state-desc">${state.projects.length === 0 ? "Be the first builder to submit a project." : "Try clearing your search filter or selecting a different category."}</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = filtered.map(p => this.createProjectCardHtml(p)).join("");
  },

  // Render project directory with filter and search
  renderDirectory(categoryFilter = "All", searchQuery = "", myProjectsOnly = false) {
    const grid = document.getElementById("directory-projects-grid");
    const countEl = document.getElementById("results-count");
    if (!grid) return;

    const query = searchQuery.trim().toLowerCase();
    const currentUserEmail = window.ArcFirebase?.currentUser?.email;
    
    const filtered = state.projects.filter(p => {
      // My Projects Filter
      if (myProjectsOnly) {
        if (!currentUserEmail || p.submitterEmail !== currentUserEmail) return false;
      }

      const matchCat = (categoryFilter === "All" || p.category.toLowerCase() === categoryFilter.toLowerCase());
      const matchSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) || 
        p.builderName.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query);
        
      return matchCat && matchSearch;
    });

    if (countEl) {
      if (filtered.length === 1) {
        countEl.textContent = "Showing 1 project";
      } else {
        countEl.textContent = `Showing ${filtered.length} projects`;
      }
    }

    if (filtered.length === 0) {
      let title = state.projects.length === 0 ? "No projects listed yet." : "No projects found in this category.";
      let desc = state.projects.length === 0 ? "Be the first builder to submit a project." : "Try clearing your search filter or selecting a different category.";
      
      if (myProjectsOnly) {
        title = "You haven't submitted any projects yet.";
        desc = "Click Submit Project to add your first project.";
      }

      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h4 class="empty-state-title">${title}</h4>
          <p class="empty-state-desc">${desc}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => this.createProjectCardHtml(p)).join("");
  },

  renderMyProjects() {
    const grid = document.getElementById("my-projects-grid");
    const countEl = document.getElementById("my-projects-results-count");
    if (!grid) return;

    const currentUser = window.ArcFirebase?.currentUser;
    if (!currentUser) {
      grid.innerHTML = `
        <div class="empty-state">
          <h4 class="empty-state-title">Authentication Required</h4>
          <p class="empty-state-desc">Please sign in to view your projects.</p>
          <button class="nav-btn btn-primary-premium btn-signin" style="margin-top: 16px; border: none; cursor: pointer;">Sign In</button>
        </div>
      `;
      grid.querySelector(".btn-signin")?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await window.ArcFirebase.signInWithGoogle();
        } catch (err) {
          console.error("Sign in failed:", err);
        }
      });
      if (countEl) countEl.textContent = "Showing 0 projects";
      return;
    }

    const currentUserId = currentUser.uid;
    const currentUserEmail = currentUser.email;

    const filtered = state.projects.filter(p => {
      return (p.userId === currentUserId) || (p.submitterEmail && p.submitterEmail === currentUserEmail);
    });

    if (countEl) {
      if (filtered.length === 1) {
        countEl.textContent = "Showing 1 project";
      } else {
        countEl.textContent = `Showing ${filtered.length} projects`;
      }
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h4 class="empty-state-title">You haven't submitted any projects yet.</h4>
          <p class="empty-state-desc">Click Submit Project to add your first project.</p>
          <a href="#/submit" class="btn-premium btn-primary-premium" style="margin-top: 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Submit Project</span>
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => this.createProjectCardHtml(p, true)).join("");
  },

  // Render builders page list (dedicated view)
  renderBuilders() {
    const grid = document.getElementById("builders-grid");
    if (!grid) return;

    if (state.builders.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; margin-top: 40px; padding: 40px 0;">
          <h4 class="empty-state-title">No projects listed yet.</h4>
          <p class="empty-state-desc">Be the first builder to submit a project.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.builders.map(builder => {
      const letter = getInitialLetter(builder.name);
      const avatarHtml = builder.avatarUrl ?
        `<img src="${builder.avatarUrl}" alt="${builder.name}" class="builder-avatar-image" />` :
        letter;
      return `
        <article class="builder-card">
          <div class="builder-card-header">
            <div class="builder-card-avatar">${avatarHtml}</div>
          </div>
          <div class="builder-card-content">
            <h3 class="builder-card-name">${builder.name}</h3>
            <p class="builder-card-project">Building <span>${builder.projectName}</span></p>
          </div>
          <div class="builder-card-footer">
            <a href="${builder.socialUrl}" target="_blank" rel="noopener noreferrer" class="builder-minimal-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Connect ↗</span>
            </a>
          </div>
        </article>
      `;
    }).join("");
  },

  // Render builders subset on the homepage
  renderHomepageBuilders() {
    const grid = document.getElementById("homepage-builders-grid");
    if (!grid) return;

    const list = state.builders.slice(0, 3); // Display top 3 on homepage
    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; margin-top: 40px; padding: 40px 0;">
          <h4 class="empty-state-title">No projects listed yet.</h4>
          <p class="empty-state-desc">Be the first builder to submit a project.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(builder => {
      const letter = getInitialLetter(builder.name);
      const avatarHtml = builder.avatarUrl ?
        `<img src="${builder.avatarUrl}" alt="${builder.name}" class="builder-avatar-image" />` :
        letter;
      return `
        <article class="builder-card">
          <div class="builder-card-header">
            <div class="builder-card-avatar">${avatarHtml}</div>
          </div>
          <div class="builder-card-content">
            <h3 class="builder-card-name">${builder.name}</h3>
            <p class="builder-card-project">Building <span>${builder.projectName}</span></p>
          </div>
          <div class="builder-card-footer">
            <a href="${builder.socialUrl}" target="_blank" rel="noopener noreferrer" class="builder-minimal-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>Connect ↗</span>
            </a>
          </div>
        </article>
      `;
    }).join("");
  },

  // Render category pills filter bar
  renderCategoryFilters(activeCat = "All") {
    const list = ["All", ...CATEGORIES];
    const markup = list.map(cat => {
      const activeClass = cat === activeCat ? "active" : "";
      return `<button type="button" class="filter-pill ${activeClass}" data-category="${cat}">${cat}</button>`;
    }).join("");

    const homeContainer = document.getElementById("homepage-category-filters-pills");
    const dirContainer = document.getElementById("category-filters-pills");
    
    if (homeContainer) homeContainer.innerHTML = markup;
    if (dirContainer) dirContainer.innerHTML = markup;
  },

  // Update statistics dynamically
  updateStats() {
    const projectsCountEl = document.getElementById("about-stats-projects");
    const buildersCountEl = document.getElementById("about-stats-builders");
    const categoriesCountEl = document.getElementById("about-stats-categories");
    
    if (projectsCountEl) {
      projectsCountEl.textContent = state.projects.length;
    }
    if (buildersCountEl) {
      const uniqueBuilders = new Set(state.projects.map(p => p.builderName.trim().toLowerCase()));
      buildersCountEl.textContent = uniqueBuilders.size;
    }
    if (categoriesCountEl) {
      categoriesCountEl.textContent = CATEGORIES.length;
    }
  }
};

// --- 5. CLIENT SIDE HASH ROUTER ---
const router = {
  routes: {
    "home": "section-home",
    "projects": "section-projects",
    "my-projects": "section-my-projects",
    "builders": "section-builders",
    "about": "section-about",
    "submit": "section-submit"
  },
  activeCategory: "All",
  searchQuery: "",
  myProjectsOnly: false,

  async init() {
    window.addEventListener("hashchange", () => this.handleRoute());
    
    await state.fetchInitialData();

    this.handleRoute();
    // Compile grids
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(this.activeCategory, this.searchQuery, this.myProjectsOnly);
    renderEngine.renderMyProjects();
    renderEngine.renderBuilders();
    renderEngine.renderHomepageBuilders();
    renderEngine.renderCategoryFilters(this.activeCategory);
    renderEngine.updateStats();
  },

  handleRoute() {
    let hash = window.location.hash.slice(2).trim(); // Remove #/
    if (!hash || !this.routes[hash]) {
      hash = "home";
      window.location.hash = "#/home";
      return;
    }

    // Toggle view elements
    Object.keys(this.routes).forEach(route => {
      const section = document.getElementById(this.routes[route]);
      if (route === hash) {
        section?.classList.add("active");
        document.getElementById(`link-${route}`)?.classList.add("active");
        document.getElementById(`mob-link-${route}`)?.classList.add("active");
      } else {
        section?.classList.remove("active");
        document.getElementById(`link-${route}`)?.classList.remove("active");
        document.getElementById(`mob-link-${route}`)?.classList.remove("active");
      }
    });

    // Reset drawer state on navigate
    drawer.close();
    window.scrollTo(0, 0);

    // Dynamic refreshes
    if (hash === "home") {
      renderEngine.renderFeatured();
      renderEngine.renderHomepageBuilders();
    } else if (hash === "projects") {
      renderEngine.renderDirectory(this.activeCategory, this.searchQuery, this.myProjectsOnly);
    } else if (hash === "my-projects") {
      renderEngine.renderMyProjects();
    } else if (hash === "builders") {
      renderEngine.renderBuilders();
    }
  },

  navigateTo(hashPath) {
    window.location.hash = `#/${hashPath}`;
  }
};

// --- 6. MOBILE NAVIGATION DRAWER CONTROLLER ---
const drawer = {
  el: document.getElementById("mobile-drawer"),
  openBtn: document.getElementById("mobile-toggle-btn"),
  closeBtn: document.getElementById("drawer-close-btn"),
  overlay: document.getElementById("drawer-overlay"),

  init() {
    this.openBtn?.addEventListener("click", () => this.open());
    this.closeBtn?.addEventListener("click", () => this.close());
    this.overlay?.addEventListener("click", () => this.close());
  },

  open() {
    this.el?.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  close() {
    this.el?.classList.remove("open");
    document.body.style.overflow = "";
  }
};

// --- 6.5 PREMIUM NOTIFICATION CONTROLLER ---
const notifications = {
  timeoutId: null,
  
  show(title, message, type = "success") {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    const overlay = document.getElementById("custom-notification");
    const titleEl = document.getElementById("notification-title");
    const msgEl = document.getElementById("notification-message");
    const iconContainer = document.getElementById("notification-icon-container");
    
    if (!overlay || !titleEl || !msgEl || !iconContainer) return;
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    
    iconContainer.className = `notification-icon-wrapper ${type}`;
    if (type === "success") {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    } else {
      iconContainer.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    }
    
    overlay.classList.remove("hidden");
    overlay.offsetHeight; // force reflow
    overlay.classList.add("active");
    
    this.timeoutId = setTimeout(() => {
      this.close();
    }, 3000);
  },
  
  close() {
    const overlay = document.getElementById("custom-notification");
    if (!overlay) return;
    
    overlay.classList.remove("active");
    setTimeout(() => {
      if (!overlay.classList.contains("active")) {
        overlay.classList.add("hidden");
      }
    }, 300);
  }
};

// --- 6.6 PREMIUM CONFIRM MODAL CONTROLLER ---
const confirmModal = {
  resolveFn: null,

  show() {
    const modal = document.getElementById("custom-confirm-modal");
    if (!modal) return Promise.resolve(false);

    modal.classList.remove("hidden");
    modal.offsetHeight; // force reflow
    modal.classList.add("active");

    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  },

  close(result = false) {
    const modal = document.getElementById("custom-confirm-modal");
    if (!modal) return;

    modal.classList.remove("active");
    setTimeout(() => {
      if (!modal.classList.contains("active")) {
        modal.classList.add("hidden");
      }
    }, 300);

    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
  }
};

// --- 7. EVENT ACTION REGISTRATION ---
const initApp = () => {
  router.init();
  drawer.init();

  // Confirm modal event listeners
  document.getElementById("confirm-modal-close-btn")?.addEventListener("click", () => {
    confirmModal.close(false);
  });
  document.getElementById("confirm-modal-cancel-btn")?.addEventListener("click", () => {
    confirmModal.close(false);
  });
  document.getElementById("confirm-modal-delete-btn")?.addEventListener("click", () => {
    confirmModal.close(true);
  });
  document.getElementById("custom-confirm-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "custom-confirm-modal") {
      confirmModal.close(false);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("custom-confirm-modal");
      if (modal && !modal.classList.contains("hidden") && modal.classList.contains("active")) {
        confirmModal.close(false);
      }
    }
  });

  // Character limit validation for project submission description
  const descTextarea = document.getElementById("form-description");
  const charCounter = document.getElementById("char-count");
  descTextarea?.addEventListener("input", (e) => {
    if (charCounter) charCounter.textContent = e.target.value.length;
  });

  // Directory & Homepage Category Pill Click Listeners
  const handleCategoryFilterClick = (e) => {
    const pill = e.target.closest(".filter-pill");
    if (!pill) return;
    
    const cat = pill.dataset.category;
    router.activeCategory = cat;
    router.myProjectsOnly = false; // Reset my projects filter on new category
    renderEngine.renderCategoryFilters(cat);
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(cat, router.searchQuery, false);
  };

  document.getElementById("category-filters-pills")?.addEventListener("click", handleCategoryFilterClick);
  document.getElementById("homepage-category-filters-pills")?.addEventListener("click", handleCategoryFilterClick);

  // Centered Navbar Search handlers
  const navSearchInput = document.getElementById("nav-search-input");
  const mobSearchInput = document.getElementById("mob-search-input");

  const handleSearchInput = (value) => {
    router.searchQuery = value;
    router.myProjectsOnly = false; // Reset my projects filter on global search
    
    // Sync values
    if (navSearchInput && navSearchInput.value !== value) navSearchInput.value = value;
    if (mobSearchInput && mobSearchInput.value !== value) mobSearchInput.value = value;

    const hash = window.location.hash.slice(2).trim();
    if (hash !== "home" && hash !== "projects") {
      router.navigateTo("projects");
    }

    // Dynamic filtering
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(router.activeCategory, router.searchQuery, router.myProjectsOnly);
  };

  navSearchInput?.addEventListener("input", (e) => handleSearchInput(e.target.value));
  mobSearchInput?.addEventListener("input", (e) => handleSearchInput(e.target.value));

  // Reset myProjects filter when clicking the main Projects nav links
  document.querySelectorAll('a[href="#/projects"]').forEach(link => {
    link.addEventListener("click", () => {
      router.myProjectsOnly = false;
    });
  });

  // --- Logo Upload Logic ---
  let uploadedLogoBase64 = null;

  const dropzone = document.getElementById("logo-dropzone");
  const fileInput = document.getElementById("form-logo-input");
  const uploadPrompt = document.getElementById("upload-prompt");
  const previewContainer = document.getElementById("upload-preview-container");
  const previewImage = document.getElementById("logo-preview-image");
  const previewFilename = document.getElementById("preview-filename");
  const removeLogoBtn = document.getElementById("btn-remove-logo");
  const uploadErrorMsg = document.getElementById("upload-error-msg");

  const showError = (msg) => {
    if (uploadErrorMsg) {
      uploadErrorMsg.textContent = msg;
      uploadErrorMsg.classList.remove("hidden");
    }
  };

  const clearError = () => {
    if (uploadErrorMsg) {
      uploadErrorMsg.textContent = "";
      uploadErrorMsg.classList.add("hidden");
    }
  };

  const handleLogoFile = (file) => {
    clearError();
    if (!file) return;

    // Validate size (5MB = 5 * 1024 * 1024)
    if (file.size > 5242880) {
      showError("File size exceeds 5MB limit.");
      return;
    }

    // Validate type (PNG, JPG, JPEG, SVG, WebP)
    const allowedExtensions = ["png", "jpg", "jpeg", "svg", "webp"];
    const fileExtension = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      showError("Unsupported format. Use PNG, JPG, JPEG, SVG, or WebP.");
      return;
    }

    // Read file as base64 data-uri
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedLogoBase64 = e.target.result;
      
      // Update preview elements
      if (previewImage) previewImage.src = uploadedLogoBase64;
      if (previewFilename) previewFilename.textContent = file.name;
      
      // Toggle visibility
      uploadPrompt?.classList.add("hidden");
      previewContainer?.classList.remove("hidden");
    };
    reader.onerror = () => {
      showError("Error reading file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  // Click triggers hidden input
  dropzone?.addEventListener("click", (e) => {
    if (e.target.closest("#btn-remove-logo")) return;
    fileInput?.click();
  });

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoFile(e.target.files[0]);
    }
  });

  // Drag and drop events
  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone?.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  });

  // Remove button handler
  removeLogoBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    uploadedLogoBase64 = null;
    if (fileInput) fileInput.value = "";
    if (previewImage) previewImage.src = "";
    
    previewContainer?.classList.add("hidden");
    uploadPrompt?.classList.remove("hidden");
    clearError();
  });

  // Form submission handler
  const form = document.getElementById("project-submission-form");
  const successCard = document.getElementById("submit-success-card");
  
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentUser = window.ArcFirebase ? window.ArcFirebase.currentUser : null;
    if (!currentUser) {
      notifications.show("Authentication Required", "You must be signed in to submit a project.", "error");
      return;
    }

    const name = document.getElementById("form-project-name").value.trim();
    const category = document.getElementById("form-category").value;
    const description = document.getElementById("form-description").value.trim();
    const website = document.getElementById("form-website").value.trim();
    const xUrl = document.getElementById("form-twitter").value.trim();
    const builderName = document.getElementById("form-builder-name").value.trim();

    if (!name || !category || !description || !website || !builderName) {
      notifications.show("Required Fields", "Please fill in all required fields.", "error");
      return;
    }

    // Duplicate Submission Validation (Case-Insensitive & Trimmed)
    const nameLower = name.toLowerCase();
    const websiteLower = website.toLowerCase();

    const editId = form.dataset.editId;
    console.log("[Form Submit] Form submitted. Detected editId (document ID):", editId);
    const originalProject = editId ? state.projects.find(p => p.id === editId) : null;
    if (editId) {
      console.log("[Form Submit] Original project object found in state:", originalProject);
    }


    const nameConflict = state.projects.some(p => {
      if (originalProject && p.id === originalProject.id) return false;
      return p.name.trim().toLowerCase() === nameLower;
    });

    const websiteConflict = state.projects.some(p => {
      if (originalProject && p.id === originalProject.id) return false;
      return p.website.trim().toLowerCase() === websiteLower;
    });

    if (nameConflict || websiteConflict) {
      notifications.show("Duplicate Submission", "This project has already been submitted.", "error");
      
      // Highlight conflicting field in red
      if (nameConflict) {
        const nameInput = document.getElementById("form-project-name");
        if (nameInput) {
          nameInput.focus();
          nameInput.style.borderColor = "#EF4444";
          nameInput.addEventListener("input", function resetColor() {
            nameInput.style.borderColor = "";
            nameInput.removeEventListener("input", resetColor);
          });
        }
      } else if (websiteConflict) {
        const websiteInput = document.getElementById("form-website");
        if (websiteInput) {
          websiteInput.focus();
          websiteInput.style.borderColor = "#EF4444";
          websiteInput.addEventListener("input", function resetColor() {
            websiteInput.style.borderColor = "";
            websiteInput.removeEventListener("input", resetColor);
          });
        }
      }
      return;
    }

    const submitBtn = form.querySelector(".btn-submit-premium");
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>${editId ? 'Saving...' : 'Submitting...'}</span>`;
    submitBtn.disabled = true;

    try {
      if (editId) {
        await state.updateProject(editId, {
          name,
          category,
          description,
          website,
          xUrl,
          builderName,
          logo: uploadedLogoBase64
        });

        notifications.show("Update Success", "Project updated successfully.", "success");
        window.location.hash = "#/my-projects";
      } else {
        await state.addProject({
          name,
          category,
          description,
          website,
          xUrl,
          builderName,
          logo: uploadedLogoBase64
        });

        notifications.show("Submission Success", "Project submitted successfully.", "success");
        
        // Toggle screens
        form.classList.add("hidden");
        successCard.classList.remove("hidden");
      }

      // Re-render views
      renderEngine.renderDirectory(router.activeCategory, router.searchQuery, router.myProjectsOnly);
      renderEngine.renderFeatured();
      renderEngine.renderMyProjects();
      renderEngine.updateStats();
    } catch (err) {
      notifications.show(editId ? "Update Failed" : "Submission Failed", err.message || "An error occurred.", "error");
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Like, Edit, & Delete button click events delegation
  document.addEventListener("click", async (e) => {
    // Global Auth Sign In
    const signinBtn = e.target.closest(".btn-signin");
    if (signinBtn) {
      e.preventDefault();
      try {
        await window.ArcFirebase.signInWithGoogle();
      } catch (err) {
        console.error("Sign in failed:", err);
      }
      return;
    }

    // Global Auth Sign Out
    const signoutBtn = e.target.closest(".btn-signout");
    if (signoutBtn) {
      e.preventDefault();
      signoutBtn.closest(".dropdown-menu")?.classList.add("hidden");
      await window.ArcFirebase.signOutUser();
      return;
    }

    // Global My Projects Navigation
    const myProjectsBtn = e.target.closest(".btn-myprojects");
    if (myProjectsBtn) {
      e.preventDefault();
      myProjectsBtn.closest(".dropdown-menu")?.classList.add("hidden");
      window.location.hash = "#/my-projects";
      return;
    }

    // Global Auth Avatar Toggle
    const avatarToggle = e.target.closest(".user-avatar");
    if (avatarToggle) {
      e.preventDefault();
      e.stopPropagation();
      const menu = avatarToggle.parentElement.querySelector(".dropdown-menu");
      menu?.classList.toggle("hidden");
      return;
    }

    // Like Project Action
    const likeBtn = e.target.closest(".btn-like-project");
    if (likeBtn) {
      e.preventDefault();
      
      const currentUser = window.ArcFirebase ? window.ArcFirebase.currentUser : null;
      if (!currentUser) {
        notifications.show("Authentication Required", "Please sign in to like projects.", "error");
        try {
          await window.ArcFirebase.signInWithGoogle();
        } catch (err) {
          console.error("Sign in failed:", err);
        }
        return;
      }

      const projectId = likeBtn.dataset.projectId;
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return;

      const isLiked = state.userLikes.has(projectId);
      
      // Optimistic UI Update
      if (isLiked) {
        state.userLikes.delete(projectId);
        project.likesCount = Math.max(0, (project.likesCount || 0) - 1);
        likeBtn.classList.remove("liked");
        likeBtn.title = "Like this project";
      } else {
        state.userLikes.add(projectId);
        project.likesCount = (project.likesCount || 0) + 1;
        likeBtn.classList.add("liked");
        likeBtn.title = "Unlike this project";
      }
      
      const countEl = likeBtn.querySelector(".like-count");
      if (countEl) {
        countEl.textContent = project.likesCount;
        countEl.style.transform = "scale(1.2)";
        setTimeout(() => countEl.style.transform = "scale(1)", 150);
      }

      document.querySelectorAll(`.btn-like-project[data-project-id="${projectId}"]`).forEach(btn => {
        if (btn !== likeBtn) {
          if (isLiked) {
            btn.classList.remove("liked");
          } else {
            btn.classList.add("liked");
          }
          const cEl = btn.querySelector(".like-count");
          if (cEl) cEl.textContent = project.likesCount;
        }
      });

      try {
        if (isLiked) {
          await window.ArcFirebase.unlikeProject(projectId, currentUser.uid);
        } else {
          await window.ArcFirebase.likeProject(projectId, currentUser.uid);
        }
      } catch (err) {
        console.error("Error syncing like:", err);
        if (isLiked) {
          state.userLikes.add(projectId);
          project.likesCount += 1;
        } else {
          state.userLikes.delete(projectId);
          project.likesCount = Math.max(0, project.likesCount - 1);
        }
        
        document.querySelectorAll(`.btn-like-project[data-project-id="${projectId}"]`).forEach(btn => {
          if (isLiked) {
            btn.classList.add("liked");
          } else {
            btn.classList.remove("liked");
          }
          const cEl = btn.querySelector(".like-count");
          if (cEl) cEl.textContent = project.likesCount;
        });
        
        notifications.show("Sync Failed", "Could not save your like. Please try again.", "error");
      }
      return;
    }

    // Edit Action
    const editBtn = e.target.closest(".btn-edit-project");
    if (editBtn) {
      e.preventDefault();
      const projectId = editBtn.dataset.projectId;
      console.log("[Edit Flow] Edit button clicked. Project ID (document ID) from dataset:", projectId);
      const project = state.projects.find(p => p.id === projectId);
      if (project) {
        console.log("[Edit Flow] Found matching project object in local state:", project);
        form.classList.remove("hidden");
        if (successCard) successCard.classList.add("hidden");

        form.dataset.editId = project.id;
        console.log("[Edit Flow] Form form.dataset.editId set to:", form.dataset.editId);

        document.getElementById("form-project-name").value = project.name;
        document.getElementById("form-category").value = project.category;
        document.getElementById("form-description").value = project.description;
        document.getElementById("form-website").value = project.website;
        document.getElementById("form-twitter").value = project.xUrl || "";
        document.getElementById("form-builder-name").value = project.builderName;

        if (charCounter) charCounter.textContent = project.description.length;

        if (project.logo) {
          uploadedLogoBase64 = project.logo;
          if (previewImage) previewImage.src = project.logo;
          if (previewFilename) previewFilename.textContent = "project_logo.png";
          uploadPrompt?.classList.add("hidden");
          previewContainer?.classList.remove("hidden");
        } else {
          uploadedLogoBase64 = null;
          if (fileInput) fileInput.value = "";
          if (previewImage) previewImage.src = "";
          previewContainer?.classList.add("hidden");
          uploadPrompt?.classList.remove("hidden");
        }
        clearError();

        const sectionTitle = document.querySelector("#section-submit .page-title");
        const sectionDesc = document.querySelector("#section-submit .page-description");
        const submitBtn = form.querySelector(".btn-submit-premium");

        if (sectionTitle) sectionTitle.textContent = "Edit your Project";
        if (sectionDesc) sectionDesc.textContent = "Update your project details in the ecosystem directory.";
        if (submitBtn) {
          submitBtn.innerHTML = `
            <span>Save Changes</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          `;
        }

        window.location.hash = "#/submit";
      }
      return;
    }

    // Delete Action
    const deleteBtn = e.target.closest(".btn-delete-project");
    if (deleteBtn) {
      e.preventDefault();
      const projectId = deleteBtn.dataset.projectId;
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return;

      const confirmed = await confirmModal.show();
      if (confirmed) {
        try {
          await state.deleteProject(projectId);
          notifications.show("Delete Success", "Project deleted successfully.", "success");
          
          renderEngine.renderDirectory(router.activeCategory, router.searchQuery, router.myProjectsOnly);
          renderEngine.renderFeatured();
          renderEngine.renderMyProjects();
          renderEngine.updateStats();
        } catch (err) {
          notifications.show("Delete Failed", err.message || "An error occurred.", "error");
        }
      }
      return;
    }
  });

  // Reset form to Create Mode helper
  const resetFormToCreateMode = () => {
    form.reset();
    form.removeAttribute("data-edit-id");
    form.dataset.editId = "";

    const sectionTitle = document.querySelector("#section-submit .page-title");
    const sectionDesc = document.querySelector("#section-submit .page-description");
    const submitBtn = form.querySelector(".btn-submit-premium");

    if (sectionTitle) sectionTitle.textContent = "Submit your Project";
    if (sectionDesc) sectionDesc.textContent = "Register your product in the community directory to gain visibility and recruit early adopters.";
    if (submitBtn) {
      submitBtn.innerHTML = `
        <span>List Project</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    uploadedLogoBase64 = null;
    if (fileInput) fileInput.value = "";
    if (previewImage) previewImage.src = "";
    previewContainer?.classList.add("hidden");
    uploadPrompt?.classList.remove("hidden");
    clearError();
    if (charCounter) charCounter.textContent = "0";

    successCard.classList.add("hidden");
    form.classList.remove("hidden");
  };

  document.querySelectorAll('a[href="#/submit"]').forEach(link => {
    link.addEventListener("click", () => {
      resetFormToCreateMode();
    });
  });

  // Close notification button
  document.getElementById("notification-close-btn")?.addEventListener("click", () => {
    notifications.close();
  });

  // Form Reset Trigger
  const resetBtn = document.getElementById("submit-another-btn");
  resetBtn?.addEventListener("click", () => {
    resetFormToCreateMode();
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// --- 9. AUTHENTICATION UI LOGIC ---
// --- 9. AUTHENTICATION UI LOGIC ---
const updateAuthUI = (user) => {
  const desktopContainer = document.getElementById("desktop-auth-container");
  const mobileContainer = document.getElementById("mobile-auth-container");
  
  // Do not strictly require both containers; proceed if at least one exists
  if (!desktopContainer && !mobileContainer) return;

  if (user) {
    const profileHtml = `
      <div class="user-profile-dropdown">
        <img src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="User Avatar" class="user-avatar" id="auth-avatar-toggle">
        <div class="dropdown-menu hidden" id="auth-dropdown-menu">
          <div class="dropdown-header">
            <span class="user-name">${user.displayName || 'Arc Builder'}</span>
            <span class="user-email">${user.email}</span>
          </div>
          <button class="dropdown-item btn-myprojects" style="display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 8px;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            My Projects
          </button>
          <button class="dropdown-item btn-signout" id="btn-signout">Sign Out</button>
        </div>
      </div>
    `;
    if (desktopContainer) desktopContainer.innerHTML = profileHtml;
    if (mobileContainer) mobileContainer.innerHTML = profileHtml;
  } else {
    // Show Sign In buttons
    const signinHtml = `<button class="nav-btn btn-primary-premium btn-signin" id="btn-signin-global">Sign In</button>`;
    const mobileSigninHtml = `<button class="mobile-nav-btn btn-signin" id="btn-signin-mobile-global" style="width: 100%;">Sign In</button>`;
    
    if (desktopContainer) desktopContainer.innerHTML = signinHtml;
    if (mobileContainer) mobileContainer.innerHTML = mobileSigninHtml;
  }
};

// Handle the case where the event already fired before app.js parsed
const handleStartupAuth = async () => {
  if (window.ArcFirebase && window.ArcFirebase.currentUser !== null) {
    const user = window.ArcFirebase.currentUser;
    updateAuthUI(user);
    if (window.ArcFirebase.getUserLikes) {
      const likedIds = await window.ArcFirebase.getUserLikes(user.uid);
      state.userLikes = new Set(likedIds);
      
      const hash = window.location.hash.slice(2).trim();
      if (hash === "my-projects") {
        renderEngine.renderMyProjects();
      } else if (hash === "projects") {
        renderEngine.renderDirectory(router.activeCategory, router.searchQuery, router.myProjectsOnly);
      } else if (hash === "home") {
        renderEngine.renderFeatured();
      }
    }
  } else {
    updateAuthUI(null);
  }
};
handleStartupAuth();

window.addEventListener("arc-auth-changed", async (e) => {
  updateAuthUI(e.detail.user);
  
  // Refresh likes cache for the signed-in user
  if (e.detail.user) {
    if (window.ArcFirebase && window.ArcFirebase.getUserLikes) {
      const likedIds = await window.ArcFirebase.getUserLikes(e.detail.user.uid);
      state.userLikes = new Set(likedIds);
    }
  } else {
    state.userLikes = new Set();
  }
  
  // Refresh grids on authentication state changes to dynamically render action buttons and heart states
  const hash = window.location.hash.slice(2).trim();
  if (hash === "my-projects") {
    renderEngine.renderMyProjects();
  } else if (hash === "projects") {
    renderEngine.renderDirectory(router.activeCategory, router.searchQuery, router.myProjectsOnly);
  } else if (hash === "home") {
    renderEngine.renderFeatured();
  }
});

// Single global document click listener to handle closing open dropdowns.
// This prevents multiple listeners from causing DOM recalculations that close native selects.
document.addEventListener("click", (e) => {
  // Ignore clicks inside form groups and native selects to prevent unintended blur events
  if (e.target.closest(".form-group-premium, select, input, textarea")) return;

  let dropdownsClosed = false;
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (!menu.classList.contains("hidden") && !menu.parentElement.contains(e.target)) {
      menu.classList.add("hidden");
      dropdownsClosed = true;
    }
  });
  
  // If we closed a dropdown, stop propagation just in case to prevent other global click handlers
  if (dropdownsClosed) {
    // e.stopPropagation(); // Only if needed, but usually mutating classList is enough.
  }
});

