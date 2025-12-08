// Supabase Client
const SUPABASE_URL = "https://tqihxrrwucbfwrfyjhav.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWh4cnJ3dWNiZndyZnlqaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Nzc5NTgsImV4cCI6MjA4MDU1Mzk1OH0.Vzqrk2oQNfMj8KRcXlcQkk1-4WNmxMWetCNCMA6-8RM"

let supabaseClient = null

// Initialize Supabase
function initSupabase() {
  try {
    if (window.supabase && typeof window.supabase.createClient === "function") {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      return true
    }
  } catch (error) {
    console.warn("Supabase not available:", error)
  }
  return false
}

// State
let posts = []
let currentSlide = 0
let totalSlides = 0

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  const supabaseReady = initSupabase()

  if (supabaseReady) {
    await Promise.all([
      loadSettings(),
      loadPosts(),
      loadQuickLinks(),
      loadAds(),
      incrementVisitCounter(),
      checkHiddenElements(),
    ])
  } else {
    // Load default content if Supabase is not available
    loadDefaultContent()
  }

  initCarousel()
  initScrollEffects()
  initContactForm()
})

// Load Default Content (fallback)
function loadDefaultContent() {
  const quickLinksContainer = document.getElementById("quick-links-container")
  if (quickLinksContainer) {
    quickLinksContainer.innerHTML = `
      <a href="http://acessoainformacao.cidadeocidental.go.gov.br/cidadao/ouvidoria/inicio" class="service-card" target="_blank">
        <div class="service-icon orange">
          <svg viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <h3 class="service-title">Ouvidoria</h3>
        <p class="service-description">Envie sugestões, reclamações e elogios</p>
      </a>
      <a href="https://dom.cidadeocidental.go.gov.br/" class="service-card" target="_blank">
        <div class="service-icon blue">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 19.5C4 18.84 4.26 18.2 4.73 17.73C5.2 17.26 5.84 17 6.5 17H20" stroke="currentColor" stroke-width="2"/><path d="M6.5 2H20V22H6.5C5.84 22 5.2 21.74 4.73 21.27C4.26 20.8 4 20.16 4 19.5V4.5C4 3.84 4.26 3.2 4.73 2.73C5.2 2.26 5.84 2 6.5 2Z" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <h3 class="service-title">Diário Oficial</h3>
        <p class="service-description">Publicações oficiais do município</p>
      </a>
      <a href="http://acessoainformacao.cidadeocidental.go.gov.br/" class="service-card" target="_blank">
        <div class="service-icon green">
          <svg viewBox="0 0 24 24" fill="none"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <h3 class="service-title">Transparência</h3>
        <p class="service-description">Acesse informações públicas</p>
      </a>
      <a href="https://www.cidadeocidental.go.gov.br/" class="service-card" target="_blank">
        <div class="service-icon purple">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 9L12 2L21 9V20C21 20.53 20.79 21.04 20.41 21.41C20.04 21.79 19.53 22 19 22H5C4.47 22 3.96 21.79 3.59 21.41C3.21 21.04 3 20.53 3 20V9Z" stroke="currentColor" stroke-width="2"/><path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <h3 class="service-title">Portal da Prefeitura</h3>
        <p class="service-description">Site oficial da prefeitura</p>
      </a>
    `
  }

  const newsTrack = document.getElementById("news-carousel-track")
  if (newsTrack) {
    newsTrack.innerHTML = `
      <p style="text-align: center; padding: 60px 24px; color: var(--foreground-muted); width: 100%;">
        Carregando notícias...
      </p>
    `
  }
}

// Load Site Settings
async function loadSettings() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("site_settings").select("*")
    if (error) throw error

    if (data) {
      data.forEach((setting) => {
        let value
        try {
          value = setting.value ? JSON.parse(setting.value) : setting.value
        } catch {
          value = setting.value
        }

        switch (setting.key) {
          case "primary_color":
            document.documentElement.style.setProperty("--primary", value)
            break
          case "secondary_color":
            document.documentElement.style.setProperty("--secondary", value)
            break
          case "emergency_phone":
            updateElementText("emergency-phone", value)
            updateElementText("contact-emergency", value)
            break
          case "contact_email":
            updateElementText("contact-email", value)
            break
          case "address":
            updateElementText("contact-address", value)
            break
        }
      })
    }
  } catch (error) {
    console.warn("Error loading settings:", error)
  }
}

// Helper function to update element text
function updateElementText(id, text) {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

// Load Posts
async function loadPosts() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })

    if (error) throw error

    posts = data || []
    renderPosts()
  } catch (error) {
    console.warn("Error loading posts:", error)
    renderEmptyPosts()
  }
}

// Render Empty Posts State
function renderEmptyPosts() {
  const track = document.getElementById("news-carousel-track")
  if (!track) return

  track.innerHTML = `
    <div style="text-align: center; padding: 80px 24px; color: var(--foreground-muted); width: 100%;">
      <svg viewBox="0 0 24 24" fill="none" width="48" height="48" style="margin: 0 auto 16px; opacity: 0.5;">
        <path d="M19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H15L21 10V18C21 19.1046 20.1046 20 19 20Z" stroke="currentColor" stroke-width="2"/>
      </svg>
      <p>Nenhuma notícia disponível no momento.</p>
    </div>
  `
}

// Render Posts in Carousel
function renderPosts() {
  const track = document.getElementById("news-carousel-track")
  if (!track) return

  if (posts.length === 0) {
    renderEmptyPosts()
    return
  }

  const postsPerSlide = window.innerWidth <= 768 ? 1 : 3
  totalSlides = Math.ceil(posts.length / postsPerSlide)

  let slidesHTML = ""

  for (let i = 0; i < totalSlides; i++) {
    const slideStart = i * postsPerSlide
    const slidePosts = posts.slice(slideStart, slideStart + postsPerSlide)

    slidesHTML += `<div class="news-slide">`

    slidePosts.forEach((post) => {
      const date = new Date(post.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })

      slidesHTML += `
        <article class="news-card">
          <div class="news-image">
            <img src="${post.image_url || "/news-collage.png"}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='/news-collage.png'">
            <span class="news-tag">Notícia</span>
          </div>
          <div class="news-content">
            <span class="news-date">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              ${date}
            </span>
            <h3 class="news-title">${escapeHtml(post.title)}</h3>
            <p class="news-excerpt">${escapeHtml(post.content || "")}</p>
            <a href="${post.external_link || "https://www.instagram.com/defesacivil_co/"}" class="news-link" target="_blank" rel="noopener noreferrer">
              Ver no Instagram
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </article>
      `
    })

    slidesHTML += `</div>`
  }

  track.innerHTML = slidesHTML
  renderDots()
  updateCarouselButtons()
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Render Carousel Dots
function renderDots() {
  const dotsContainer = document.getElementById("carousel-dots")
  if (!dotsContainer || totalSlides <= 1) {
    if (dotsContainer) dotsContainer.innerHTML = ""
    return
  }

  let dotsHTML = ""
  for (let i = 0; i < totalSlides; i++) {
    dotsHTML += `<span class="carousel-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})" role="button" tabindex="0" aria-label="Ir para slide ${i + 1}"></span>`
  }
  dotsContainer.innerHTML = dotsHTML
}

// Carousel Navigation
function initCarousel() {
  updateCarouselButtons()

  // Auto-advance carousel
  setInterval(() => {
    if (totalSlides > 1) {
      nextSlide()
    }
  }, 8000)
}

function nextSlide() {
  if (totalSlides <= 1) return
  currentSlide = (currentSlide + 1) % totalSlides
  updateCarousel()
}

function prevSlide() {
  if (totalSlides <= 1) return
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides
  updateCarousel()
}

function goToSlide(index) {
  if (index < 0 || index >= totalSlides) return
  currentSlide = index
  updateCarousel()
}

function updateCarousel() {
  const track = document.getElementById("news-carousel-track")
  if (track) {
    track.style.transform = `translateX(-${currentSlide * 100}%)`
  }

  // Update dots
  const dots = document.querySelectorAll(".carousel-dot")
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide)
  })

  updateCarouselButtons()
}

function updateCarouselButtons() {
  const prevBtn = document.getElementById("carousel-prev")
  const nextBtn = document.getElementById("carousel-next")

  if (prevBtn) prevBtn.disabled = totalSlides <= 1
  if (nextBtn) nextBtn.disabled = totalSlides <= 1
}

// Load Quick Links
async function loadQuickLinks() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient
      .from("quick_links")
      .select("*")
      .eq("is_visible", true)
      .order("display_order", { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return

    const container = document.getElementById("quick-links-container")
    if (!container) return

    const iconColors = ["orange", "blue", "green", "purple", "teal", "red", "pink", "yellow"]

    // Remove duplicates by title
    const uniqueLinks = data.filter((link, index, self) => index === self.findIndex((l) => l.title === link.title))

    container.innerHTML = uniqueLinks
      .map(
        (link, index) => `
          <a href="${escapeHtml(link.url)}" class="service-card" target="_blank" rel="noopener noreferrer">
            <div class="service-icon ${iconColors[index % iconColors.length]}">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M10 13C10.43 13.57 10.98 14.05 11.61 14.39C12.24 14.74 12.93 14.94 13.65 14.99C14.36 15.04 15.08 14.94 15.75 14.69C16.42 14.44 17.03 14.05 17.54 13.54L20.54 10.54C21.45 9.6 21.95 8.33 21.94 7.02C21.93 5.71 21.41 4.46 20.48 3.53C19.55 2.6 18.3 2.08 16.99 2.07C15.68 2.06 14.41 2.56 13.47 3.47L11.75 5.18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 11C13.57 10.43 13.02 9.95 12.39 9.61C11.76 9.26 11.07 9.06 10.35 9.01C9.64 8.96 8.92 9.06 8.25 9.31C7.58 9.56 6.97 9.95 6.46 10.46L3.46 13.46C2.55 14.4 2.05 15.67 2.06 16.98C2.07 18.29 2.59 19.54 3.52 20.47C4.45 21.4 5.7 21.92 7.01 21.93C8.32 21.94 9.59 21.44 10.53 20.53L12.24 18.82" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="service-title">${escapeHtml(link.title)}</h3>
            <p class="service-description">${escapeHtml(link.description || "Acesse este serviço")}</p>
          </a>
        `,
      )
      .join("")
  } catch (error) {
    console.warn("Error loading quick links:", error)
  }
}

// Load Advertisements
async function loadAds() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient
      .from("advertisements")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) throw error
    if (!data) return

    // Sidebar Ads (Left)
    const leftAds = data.filter((ad) => ad.position === "sidebar")
    const leftContainer = document.getElementById("sidebar-ads-left")
    if (leftContainer && leftAds.length > 0) {
      leftContainer.innerHTML = leftAds
        .slice(0, 3)
        .map(
          (ad) => `
            <a href="${escapeHtml(ad.link_url || "#")}" class="sidebar-ad ${ad.size || ""}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHtml(ad.image_url)}" alt="${escapeHtml(ad.title || "Propaganda")}" loading="lazy">
            </a>
          `,
        )
        .join("")
    }

    // Sidebar Ads (Right)
    const rightContainer = document.getElementById("sidebar-ads-right")
    if (rightContainer && leftAds.length > 3) {
      rightContainer.innerHTML = leftAds
        .slice(3, 6)
        .map(
          (ad) => `
            <a href="${escapeHtml(ad.link_url || "#")}" class="sidebar-ad ${ad.size || ""}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHtml(ad.image_url)}" alt="${escapeHtml(ad.title || "Propaganda")}" loading="lazy">
            </a>
          `,
        )
        .join("")
    }

    // Between Posts Ads
    const betweenAds = data.filter((ad) => ad.position === "between_posts")
    const betweenContainer = document.getElementById("between-posts-ads")
    if (betweenContainer && betweenAds.length > 0) {
      betweenContainer.innerHTML = betweenAds
        .map(
          (ad) => `
            <a href="${escapeHtml(ad.link_url || "#")}" class="between-ad ${ad.size || ""}" target="_blank" rel="noopener noreferrer">
              <img src="${escapeHtml(ad.image_url)}" alt="${escapeHtml(ad.title || "Propaganda")}" loading="lazy">
            </a>
          `,
        )
        .join("")
    }
  } catch (error) {
    console.warn("Error loading ads:", error)
  }
}

// Increment Visit Counter
async function incrementVisitCounter() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("visit_counter").select("*").limit(1).single()

    if (error) throw error

    if (data) {
      const newCount = (data.count || 0) + 1

      await supabaseClient
        .from("visit_counter")
        .update({ count: newCount, last_updated: new Date().toISOString() })
        .eq("id", data.id)

      const countEl = document.getElementById("visit-count")
      if (countEl) {
        countEl.textContent = newCount.toLocaleString("pt-BR")
      }
    }
  } catch (error) {
    console.warn("Error updating visit counter:", error)
  }
}

// Check Hidden Elements
async function checkHiddenElements() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("hidden_elements").select("*").eq("is_hidden", true)

    if (error) throw error

    if (data) {
      data.forEach((element) => {
        const el = document.getElementById(element.element_key)
        if (el) {
          el.style.display = "none"
        }
      })
    }
  } catch (error) {
    console.warn("Error checking hidden elements:", error)
  }
}

// Toggle Mobile Menu
function toggleMenu() {
  const navLinks = document.getElementById("navLinks")
  const menuBtn = document.querySelector(".mobile-menu-btn")

  if (navLinks) {
    navLinks.classList.toggle("active")
    menuBtn?.classList.toggle("active")
  }
}

// Close menu when clicking on links
document.addEventListener("click", (e) => {
  if (e.target.matches(".nav-links a")) {
    const navLinks = document.getElementById("navLinks")
    if (navLinks && window.innerWidth <= 768) {
      navLinks.classList.remove("active")
    }
  }
})

// Scroll effects
function initScrollEffects() {
  const header = document.querySelector(".header")
  const emergencyBar = document.querySelector(".emergency-bar")

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY

    if (header) {
      header.classList.toggle("scrolled", scrollY > 50)
    }

    // Smooth nav link highlighting
    const sections = document.querySelectorAll("section[id]")
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 150
      const sectionHeight = section.offsetHeight
      const sectionId = section.getAttribute("id")

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        document.querySelectorAll(".nav-links a").forEach((link) => {
          link.classList.remove("active")
          if (link.getAttribute("href") === `#${sectionId}`) {
            link.classList.add("active")
          }
        })
      }
    })
  })
}

// Contact Form
function initContactForm() {
  const form = document.getElementById("contact-form")

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault()

      const formData = new FormData(form)
      const data = Object.fromEntries(formData)

      // Basic validation
      if (!data.name || !data.email || !data.subject || !data.message) {
        showToast("Por favor, preencha todos os campos.", "error")
        return
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        showToast("Por favor, insira um e-mail válido.", "error")
        return
      }

      // Simulate form submission
      showToast("Mensagem enviada com sucesso!", "success")
      form.reset()
    })
  }
}

// Toast Notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast")
  if (!toast) return

  toast.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.classList.remove("show")
  }, 4000)
}

// Window resize handler
let resizeTimeout
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    if (posts.length > 0) {
      renderPosts()
    }
  }, 250)
})

// Make functions globally available
window.toggleMenu = toggleMenu
window.nextSlide = nextSlide
window.prevSlide = prevSlide
window.goToSlide = goToSlide
