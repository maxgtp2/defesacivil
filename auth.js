// Supabase Configuration
const SUPABASE_URL = "https://tqihxrrwucbfwrfyjhav.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWh4cnJ3dWNiZndyZnlqaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNDM2MTcsImV4cCI6MjA2NDgxOTYxN30.xsRicBxetP0OOjNVj2gCVavGMKLmAgVdcZ7M68gkx0c"

const supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Check if already logged in
async function checkAuth() {
  const session = localStorage.getItem("admin_session")
  if (session) {
    const sessionData = JSON.parse(session)
    if (new Date(sessionData.expires_at) > new Date()) {
      return sessionData
    } else {
      localStorage.removeItem("admin_session")
    }
  }
  return null
}

// Login Handler
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form")

  if (loginForm) {
    checkAuth().then((session) => {
      if (session) {
        window.location.href = "admin.html"
      }
    })

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const username = document.getElementById("username").value.trim()
      const password = document.getElementById("password").value
      const errorEl = document.getElementById("login-error")
      const loginText = document.getElementById("login-text")
      const loginLoading = document.getElementById("login-loading")

      loginText.style.display = "none"
      loginLoading.style.display = "inline"
      errorEl.style.display = "none"

      try {
        console.log("[v0] Tentando login com usuário:", username)

        const { data: user, error } = await supabaseAuth
          .from("users")
          .select("*")
          .eq("username", username)
          .eq("is_active", true)
          .single()

        console.log("[v0] Resposta do banco:", { user, error })

        if (error || !user) {
          console.log("[v0] Erro ao buscar usuário:", error)
          throw new Error("Usuário não encontrado ou inativo")
        }

        console.log("[v0] Usuário encontrado:", user.username)
        console.log("[v0] Comparando senhas - DB:", user.password_hash, "Input:", password)

        if (user.password_hash !== password) {
          console.log("[v0] Senha incorreta")
          throw new Error("Senha incorreta")
        }

        console.log("[v0] Login bem-sucedido!")

        const sessionData = {
          user_id: user.id,
          username: user.username,
          name: user.name,
          is_master: user.is_master,
          permissions: user.permissions,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }

        localStorage.setItem("admin_session", JSON.stringify(sessionData))
        window.location.href = "admin.html"
      } catch (err) {
        console.log("[v0] Erro no login:", err)
        errorEl.textContent = err.message
        errorEl.style.display = "block"
        loginText.style.display = "inline"
        loginLoading.style.display = "none"
      }
    })
  }
})

// Logout function
function logout() {
  localStorage.removeItem("admin_session")
  window.location.href = "login.html"
}
