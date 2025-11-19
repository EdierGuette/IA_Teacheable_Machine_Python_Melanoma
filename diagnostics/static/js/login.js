// Login JS: maneja solo autenticación
(() => {
    const qs = s => document.querySelector(s);
    const qsa = s => document.querySelectorAll(s);

    let token = localStorage.getItem('authToken');

    // Inicializar aplicación de login
    function initLogin() {
        console.log('🚀 Iniciando aplicación de login...');

        if (token) {
            console.log('🔑 Token encontrado, redirigiendo al dashboard...');
            window.location.href = '/dashboard/';
        }

        setupEventListeners();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Tabs de autenticación
        const authTabs = qsa('.auth-tab');
        const authForms = qsa('.auth-form');
        const authMessage = qs('#authMessage');

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                console.log('📌 Cambiando tab:', tabName);

                authTabs.forEach(t => t.classList.remove('active'));
                authForms.forEach(f => f.classList.remove('active'));

                tab.classList.add('active');
                const targetForm = qs(`#${tabName}Form`);
                if (targetForm) targetForm.classList.add('active');

                if (authMessage) authMessage.textContent = '';
            });
        });

        // Formulario de login
        const loginForm = qs('#loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Formulario de registro
        const registerForm = qs('#registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
    }

    // Manejar login
    async function handleLogin(e) {
        e.preventDefault();
        console.log('🔐 Procesando login...');

        const email = qs('#loginEmail')?.value;
        const password = qs('#loginPassword')?.value;

        if (!email || !password) {
            showMessage('Por favor complete todos los campos', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.access_token);
                console.log('✅ Login exitoso, redirigiendo al dashboard...');

                // Redirigir al dashboard
                window.location.href = '/dashboard/';

            } else {
                console.error('❌ Error en login:', data);
                showMessage(data.error || 'Error en el login', 'error');
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            showMessage('Error de conexión', 'error');
        }
    }

    // Manejar registro
    async function handleRegister(e) {
        e.preventDefault();
        console.log('📝 Procesando registro...');

        const formData = {
            first_name: qs('#regFirstName')?.value,
            last_name: qs('#regLastName')?.value,
            email: qs('#regEmail')?.value,
            identification_number: qs('#regIdentification')?.value,
            gender: qs('#regGender')?.value,
            phone: qs('#regPhone')?.value,
            date_of_birth: qs('#regBirthDate')?.value,
            password: qs('#regPassword')?.value,
            password_confirmation: qs('#regPasswordConfirm')?.value
        };

        // Validar campos requeridos
        for (const [key, value] of Object.entries(formData)) {
            if (!value) {
                showMessage(`Por favor complete el campo: ${key}`, 'error');
                return;
            }
        }

        try {
            const response = await fetch('/api/auth/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('authToken', data.access_token);
                console.log('✅ Registro exitoso, redirigiendo al dashboard...');

                // Redirigir al dashboard
                window.location.href = '/dashboard/';

            } else {
                console.error('❌ Error en registro:', data);
                const errors = Object.values(data).flat().join(', ');
                showMessage(errors || 'Error en el registro', 'error');
            }
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            showMessage('Error de conexión', 'error');
        }
    }

    // Mostrar mensajes
    function showMessage(message, type) {
        const authMessage = qs('#authMessage');
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.className = `auth-message ${type}`;
        }
    }

    // Inicializar la aplicación cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogin);
    } else {
        initLogin();
    }
})();