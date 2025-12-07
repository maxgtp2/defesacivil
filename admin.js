// Navegação entre seções
const sidebarItems = document.querySelectorAll('#sidebar li');
const sections = document.querySelectorAll('.section');

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        // ativa o item selecionado
        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // mostra a seção correspondente
        const sectionId = item.dataset.section;
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    });
});

// Funções para buscar dados do backend
async function fetchDashboard() {
    try {
        const res = await fetch('/api/dashboard'); // rota do backend
        const data = await res.json();
        document.getElementById('total-posts').textContent = data.totalPosts;
        document.getElementById('total-users').textContent = data.totalUsers;
    } catch (err) {
        console.error('Erro ao buscar dashboard:', err);
    }
}

async function fetchPosts() {
    try {
        const res = await fetch('/api/posts');
        const posts = await res.json();
        const tbody = document.querySelector('#posts-table tbody');
        tbody.innerHTML = '';
        posts.forEach(post => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${post.id}</td>
                <td>${post.title}</td>
                <td>${post.author}</td>
                <td>
                    <button onclick="editPost(${post.id})">Editar</button>
                    <button onclick="deletePost(${post.id})">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao buscar posts:', err);
    }
}

async function fetchUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <button onclick="editUser(${user.id})">Editar</button>
                    <button onclick="deleteUser(${user.id})">Excluir</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
    }
}

// Funções de ação (exemplo)
function editPost(id) {
    alert('Editar post ' + id);
}

function deletePost(id) {
    if(confirm('Deseja realmente excluir este post?')) {
        fetch(`/api/posts/${id}`, { method: 'DELETE' })
            .then(() => fetchPosts());
    }
}

function editUser(id) {
    alert('Editar usuário ' + id);
}

function deleteUser(id) {
    if(confirm('Deseja realmente excluir este usuário?')) {
        fetch(`/api/users/${id}`, { method: 'DELETE' })
            .then(() => fetchUsers());
    }
}

// Inicialização
fetchDashboard();
fetchPosts();
fetchUsers();
