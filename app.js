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
    // Clear legacy demo data on first load to enforce an empty state
    if (!localStorage.getItem("archub_cleared_legacy")) {
      localStorage.removeItem("archub_projects_restructured");
      localStorage.removeItem("archub_builders_restructured");
      localStorage.setItem("archub_cleared_legacy", "true");
    }

    this.projects = this.loadProjects();
    this.builders = this.loadBuilders();
  }

  loadProjects() {
    const saved = localStorage.getItem("archub_projects_restructured");
    return saved ? JSON.parse(saved) : [...DEFAULT_PROJECTS];
  }

  loadBuilders() {
    const saved = localStorage.getItem("archub_builders_restructured");
    return saved ? JSON.parse(saved) : [...DEFAULT_BUILDERS];
  }

  saveToStorage() {
    localStorage.setItem("archub_projects_restructured", JSON.stringify(this.projects));
    localStorage.setItem("archub_builders_restructured", JSON.stringify(this.builders));
  }

  addProject(projectData) {
    const projectId = projectData.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    
    const newProject = {
      id: projectId,
      name: projectData.name,
      description: projectData.description,
      category: projectData.category,
      website: projectData.website,
      xUrl: projectData.xUrl || "",
      builderName: projectData.builderName,
      logo: projectData.logo || ""
    };
    
    this.projects.unshift(newProject);

    const builderId = projectData.builderName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const builderExists = this.builders.some(b => b.id === builderId);
    
    if (!builderExists) {
      const newBuilder = {
        id: builderId,
        name: projectData.builderName,
        projectName: projectData.name,
        socialUrl: projectData.xUrl || "https://x.com"
      };
      this.builders.unshift(newBuilder);
    }

    this.saveToStorage();
    return newProject;
  }

  getFeaturedProjects() {
    // Show all 6 default projects (or top 6 projects in list)
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
  createProjectCardHtml(project) {
    const logoMarkup = getProjectLogoSVG(project);
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
          <div class="builder-meta">
            <div class="builder-avatar">${builderLetter}</div>
            <span class="builder-name-text">${project.builderName}</span>
          </div>
          <div class="card-center-link">
            ${xLink}
          </div>
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
  renderDirectory(categoryFilter = "All", searchQuery = "") {
    const grid = document.getElementById("directory-projects-grid");
    const countEl = document.getElementById("results-count");
    if (!grid) return;

    const query = searchQuery.trim().toLowerCase();
    
    const filtered = state.projects.filter(p => {
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
      return `
        <article class="builder-card">
          <div class="builder-card-header">
            <div class="builder-card-avatar">${letter}</div>
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
      return `
        <article class="builder-card">
          <div class="builder-card-header">
            <div class="builder-card-avatar">${letter}</div>
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
    "builders": "section-builders",
    "about": "section-about",
    "submit": "section-submit"
  },
  activeCategory: "All",
  searchQuery: "",

  init() {
    window.addEventListener("hashchange", () => this.handleRoute());
    
    // Execute immediately since we are already inside a DOMContentLoaded listener
    this.handleRoute();
    // Compile grids
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(this.activeCategory, this.searchQuery);
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
      renderEngine.renderDirectory(this.activeCategory, this.searchQuery);
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

// --- 7. EVENT ACTION REGISTRATION ---
document.addEventListener("DOMContentLoaded", () => {
  router.init();
  drawer.init();

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
    renderEngine.renderCategoryFilters(cat);
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(cat, router.searchQuery);
  };

  document.getElementById("category-filters-pills")?.addEventListener("click", handleCategoryFilterClick);
  document.getElementById("homepage-category-filters-pills")?.addEventListener("click", handleCategoryFilterClick);

  // Centered Navbar Search handlers
  const navSearchInput = document.getElementById("nav-search-input");
  const mobSearchInput = document.getElementById("mob-search-input");

  const handleSearchInput = (value) => {
    router.searchQuery = value;
    
    // Sync values
    if (navSearchInput && navSearchInput.value !== value) navSearchInput.value = value;
    if (mobSearchInput && mobSearchInput.value !== value) mobSearchInput.value = value;

    const hash = window.location.hash.slice(2).trim();
    if (hash !== "home" && hash !== "projects") {
      router.navigateTo("projects");
    }

    // Dynamic filtering
    renderEngine.renderFeatured();
    renderEngine.renderDirectory(router.activeCategory, router.searchQuery);
  };

  navSearchInput?.addEventListener("input", (e) => handleSearchInput(e.target.value));
  mobSearchInput?.addEventListener("input", (e) => handleSearchInput(e.target.value));

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
  
  form?.addEventListener("submit", (e) => {
    e.preventDefault();

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

    const nameConflict = state.projects.some(p => p.name.trim().toLowerCase() === nameLower);
    const websiteConflict = state.projects.some(p => p.website.trim().toLowerCase() === websiteLower);

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

    state.addProject({
      name,
      category,
      description,
      website,
      xUrl,
      builderName,
      logo: uploadedLogoBase64
    });

    // Re-render and navigate updates
    renderEngine.renderDirectory(router.activeCategory, router.searchQuery);
    renderEngine.renderFeatured();
    renderEngine.updateStats();

    notifications.show("Submission Success", "Project submitted successfully.", "success");

    // Toggle screens
    form.classList.add("hidden");
    successCard.classList.remove("hidden");
  });

  // Close notification button
  document.getElementById("notification-close-btn")?.addEventListener("click", () => {
    notifications.close();
  });

  // Form Reset Trigger
  const resetBtn = document.getElementById("submit-another-btn");
  resetBtn?.addEventListener("click", () => {
    form.reset();
    if (charCounter) charCounter.textContent = "0";
    successCard.classList.add("hidden");
    form.classList.remove("hidden");
    
    // Reset file upload state
    uploadedLogoBase64 = null;
    if (fileInput) fileInput.value = "";
    if (previewImage) previewImage.src = "";
    previewContainer?.classList.add("hidden");
    uploadPrompt?.classList.remove("hidden");
    clearError();
  });
});
