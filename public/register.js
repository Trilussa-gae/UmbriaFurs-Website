function showError(message) {
    const el = document.getElementById("message-error");
    el.textContent = message;
    el.style.display = "block";
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccess(message) {
    const el = document.getElementById("message-success");
    el.textContent = message;
    el.style.display = "block";
}

// Gestione registrazione
async function handleRegistration(userData) {
    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            showSuccess("Registrazione completata!");
            setTimeout(() => window.location.href = "login.html", 2000);
            return true;
        }
        showError(data.message || "Errore durante la registrazione");
    } catch (err) {
        showError("Errore di connessione al server");
        console.error("Registration error:", err);
    }
    return false;
}

// Validazione e gestione form
function setupRegistrationForm() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    const nomeField = document.getElementById("nome");
    if (nomeField) {
        nomeField.focus();
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Reset messaggi
        document.getElementById("message-error").style.display = "none";
        document.getElementById("message-success").style.display = "none";

        const userInput = {
            nome: form.nome.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value,
            confirmPassword: form.confirmPassword.value
        };

        // Validazione
        if (!userInput.nome || !userInput.email || !userInput.password || !userInput.confirmPassword) {
            return showError("Tutti i campi sono obbligatori");
        }
        if (userInput.password !== userInput.confirmPassword) {
            return showError("Le password non coincidono");
        }
        if (userInput.password.length < 8) {
            return showError("La password deve contenere almeno 8 caratteri");
        }

        // UI loading state
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "Registrazione in corso...";

        await handleRegistration(userInput);
        
        // Reset UI
        btn.disabled = false;
        btn.textContent = "Registrati";
    });
}

window.onload = function() {
    setupRegistrationForm();
};