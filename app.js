// Supabase Client
const SUPABASE_URL = "https://tqihxrrwucbfwrfyjhav.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWh4cnJ3dWNiZndyZnlqaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Nzc5NTgsImV4cCI6MjA4MDU1Mzk1OH0.Vzqrk2oQNfMj8KRcXlcQkk1-4WNmxMWetCNCMA6-8RM"

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// State
let posts = []
let currentSlide = 0
let totalSlides = 0

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings()
  await loadPosts()
  await loadQuickLinks()
  await loadAds()
  await incrementVisitCounter()
  await checkHiddenElements()
  initCarousel()
})

// Load Site Settings
async function loadSettings() {
  try {
    const { data, error } = await supabase.from("site_settings").select("*")
    if (error) throw error

    if (data) {
      data.forEach((setting) => {
        const value = setting.value ? JSON.parse(setting.value) : setting.value

        switch (setting.key) {
          case "primary_color":
            document.documentElement.style.setProperty("--primary", value)
            break
          case "secondary_color":
            document.documentElement.style.setProperty("--secondary", value)
            break
          case "emergency_phone":
            const emergencyEl = document.getElementById("emergency-phone")
            const contactEmergency = document.getElementById("contact-emergency")
            if (emergencyEl) emergencyEl.textContent = value
            if (contactEmergency) contactEmergency.textContent = value
            break
          case "contact_email":
            const emailEl = document.getElementById("contact-email")
            if (emailEl) emailEl.textContent = value
            break
          case "address":
            const addressEl = document.getElementById("contact-address")
            if (addressEl) addressEl.textContent = value
            break
        }
      })
    }
  } catch (error) {
    console.error("Error loading settings:", error)
  }
}

// Load Posts
async function loadPosts() {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false })

    if (error) throw error

    posts = data || []
    renderPosts()
  } catch (error) {
    console.error("Error loading posts:", error)
  }
}

// Render Posts in Carousel
function renderPosts() {
  const track = document.getElementById("news-carousel-track")
  if (!track) return

  if (posts.length === 0) {
    track.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: var(--foreground-muted);">Nenhuma notícia disponível no momento.</p>'
    return
  }

  // Create slides with 6 posts per slide
  const postsPerSlide = 6
  totalSlides = Math.ceil(posts.length / postsPerSlide)

  let slidesHTML = ""

  for (let i = 0; i < totalSlides; i++) {
    const slideStart = i * postsPerSlide
    const slidePosts = posts.slice(slideStart, slideStart + postsPerSlide)

    slidesHTML += `<div class="news-slide" style="flex: 0 0 100%;">`

    slidePosts.forEach((post) => {
      const date = new Date(post.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })

      slidesHTML += `
        <article class="news-card">
          <div class="news-image">
            <img src="${post.image_url || "/news-collage.png"}" alt="${post.title}">
            <span class="news-tag">Notícia</span>
          </div>
          <div class="news-content">
            <span class="news-date">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              ${date}
            </span>
            <h3 class="news-title">${post.title}</h3>
            <p class="news-excerpt">${post.content || ""}</p>
            <a href="${post.external_link || "https://www.instagram.com/defesacivil_co/"}" class="news-link" target="_blank">
              Ver no Instagram
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </article>
      `
    })

    slidesHTML += `</div>`
  }

  track.style.display = "flex"
  track.style.transition = "transform 0.5s ease"
  track.innerHTML = slidesHTML
  renderDots()
  updateCarouselButtons()
}

// Render Carousel Dots
function renderDots() {
  const dotsContainer = document.getElementById("carousel-dots")
  if (!dotsContainer) return

  let dotsHTML = ""
  for (let i = 0; i < totalSlides; i++) {
    dotsHTML += `<span class="carousel-dot ${i === 0 ? "active" : ""}" onclick="goToSlide(${i})"></span>`
  }
  dotsContainer.innerHTML = dotsHTML
}

  // Update dots
  const dots = document.querySelectorAll(".carousel-dot")
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide)
  })

// Load Quick Links
async function loadQuickLinks() {
  try {
    const { data, error } = await supabase
      .from("quick_links")
      .select("*")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    if (!data) return;

    const container = document.getElementById("quick-links-container");
    if (!container) return;

    const iconColors = ["orange", "blue", "green", "purple", "teal", "red", "pink", "yellow"];

    // Remove duplicados por título
    const uniqueLinks = data.filter((link, index, self) =>
      index === self.findIndex((l) => l.title === link.title)
    );

    // Renderiza os links únicos
    container.innerHTML = uniqueLinks
      .map(
        (link, index) => `
          <a href="${link.url}" class="service-card" target="_blank">
            <div class="service-icon ${iconColors[index % iconColors.length]}">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 13C10.4295 13.5741 10.9774 14.0492 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9404 15.7513 14.6898C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59699 21.9548 8.33397 21.9434 7.02299C21.932 5.71201 21.4061 4.45794 20.4791 3.5309C19.5521 2.60386 18.298 2.07802 16.987 2.06663C15.676 2.05523 14.413 2.55921 13.47 3.47L11.75 5.18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60707C11.7642 9.26331 11.0684 9.05889 10.3533 9.00768C9.63816 8.95646 8.92037 9.05964 8.24861 9.31023C7.57685 9.56082 6.96684 9.95304 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <h3 class="service-title">${link.title}</h3>
            <p class="service-description">${link.description || "Acesse este serviço"}</p>
          </a>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading quick links:", error);
  }
}

// Load Advertisements
async function loadAds() {
  try {
    const { data, error } = await supabase
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
                <a href="${ad.link_url || "#"}" class="sidebar-ad ${ad.size}" target="_blank">
                    <img src="${ad.image_url}" alt="${ad.title || "Propaganda"}">
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
                <a href="${ad.link_url || "#"}" class="sidebar-ad ${ad.size}" target="_blank">
                    <img src="${ad.image_url}" alt="${ad.title || "Propaganda"}">
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
                <a href="${ad.link_url || "#"}" class="between-ad ${ad.size}" target="_blank">
                    <img src="${ad.image_url}" alt="${ad.title || "Propaganda"}">
                </a>
            `,
        )
        .join("")
    }
  } catch (error) {
    console.error("Error loading ads:", error)
  }
}

// Increment Visit Counter
async function incrementVisitCounter() {
  try {
    // Get current count
    const { data, error } = await supabase.from("visit_counter").select("*").limit(1).single()

    if (error) throw error

    if (data) {
      const newCount = (data.count || 0) + 1

      // Update count
      await supabase
        .from("visit_counter")
        .update({ count: newCount, last_updated: new Date().toISOString() })
        .eq("id", data.id)

      // Display count
      const countEl = document.getElementById("visit-count")
      if (countEl) {
        countEl.textContent = newCount.toLocaleString("pt-BR")
      }
    }
  } catch (error) {
    console.error("Error updating visit counter:", error)
  }
}

// Check Hidden Elements
async function checkHiddenElements() {
  try {
    const { data, error } = await supabase.from("hidden_elements").select("*").eq("is_hidden", true)

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
    console.error("Error checking hidden elements:", error)
  }
}

// Toggle Mobile Menu
function toggleMenu() {
  const navLinks = document.getElementById("navLinks")
  if (navLinks) {
    navLinks.classList.toggle("active")
  }
}

// Scroll effect for navbar
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar")
  if (navbar) {
    navbar.classList.toggle("scrolled", window.scrollY > 50)
  }
})
