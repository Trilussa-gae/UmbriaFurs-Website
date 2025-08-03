const toggleFAQ = () => {
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentNode;
      item.classList.toggle('active');
      
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
        }
      });
    });
  });
};

const setupNavbarScroll = () => {
  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
};

const setupSmoothScrolling = () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });
};

const checkAuthStatus = async () => {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'include' });
    if (!response.ok) throw new Error("Auth check failed");
    return await response.json();
  } catch (error) {
    throw error;
  }
};

const getUserInfo = async () => {
  try {
    const response = await fetch('/api/userinfo', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      return data.success ? data : null;
    }
  } catch (error) {
    console.error("Errore nel recupero info utente:", error);
  }
  return null;
};

const showLoginRequired = () => {
  const formContainer = document.getElementById('volunteerForm');
  const titleElement = document.querySelector('#form .title-and-smts-text h2');
  const descriptionElement = document.querySelector('#form .title-and-smts-text p');
  
  formContainer.style.display = 'none';
  titleElement.textContent = 'Accesso Richiesto';
  
  const loginMessage = document.createElement('div');
  loginMessage.className = 'alert alert-danger';
  loginMessage.style.maxWidth = '600px';
  loginMessage.style.margin = '0 auto';
  loginMessage.innerHTML = `
    <p>Devi effettuare l'accesso per compilare il modulo di volontariato.</p>
    <a href="/login.html" class="btn-submit" style="display: inline-block; margin-top: 1rem;">
      Accedi ora
    </a>
  `;
  
  descriptionElement.replaceWith(loginMessage);
};

/* ============================================ FORM ============================================ */
const checkExistingSubmission = async (email) => {
  try {
    const response = await fetch(`/api/check-submission?email=${encodeURIComponent(email)}`, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error("Errore nel controllo invio");
    const data = await response.json();
    return data.alreadySubmitted;
  } catch (error) {
    console.error("Errore controllo invio:", error);
    return false;
  }
};

const showAlreadySubmittedMessage = () => {
  const form = document.getElementById('volunteerForm');
  const submitBtn = document.getElementById('submitBtn');
  
  // Disabilita tutti i campi
  form.querySelectorAll('input, textarea, select, button').forEach(el => {
    el.disabled = true;
  });
  
  // Mostra messaggio SE la mail associata ad account è gia presente nella table volontari
  const alertDiv = document.getElementById('alertMessage');
  alertDiv.classList.remove('alert-danger', 'alert-success', 'd-none');
  alertDiv.classList.add('alert-info');
  alertDiv.innerHTML = `
    <i class="material-icons">info</i>
    Hai già inviato la tua candidatura!
  `;
  
  // Modifica pulsante
  submitBtn.innerHTML = '<i class="material-icons">check_circle</i> Già inviato';
  submitBtn.style.backgroundColor = '#6c757d';
};

const initVolunteerForm = async (userInfo) => {
  const form = document.getElementById('volunteerForm');
  const emailField = document.getElementById('email');
  
  if (!userInfo || !userInfo.email) {
    showLoginRequired();
    return;
  }

  // Precompila email e verifica
  emailField.value = userInfo.email;
  emailField.readOnly = true;
  
  // Icona email verificata
  const emailGroup = emailField.closest('.form-group');
  if (emailGroup) {
    emailGroup.insertAdjacentHTML('beforeend', 
      '<div style="color: #28a745; margin-top: 5px; font-size: 0.9rem;">' +
      '<i class="material-icons">check_circle</i> Email verificata' +
      '</div>');
  }

  const alreadySubmitted = await checkExistingSubmission(userInfo.email);
  if (alreadySubmitted) {
    showAlreadySubmittedMessage();
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const alertDiv = document.getElementById('alertMessage');
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Invio in corso...';
    alertDiv.classList.add('d-none');
    
    try {
      const formValues  = {
        name: document.getElementById('name').value,
        email: userInfo.email, 
        phone: document.getElementById('phone').value,
        age: document.getElementById('age').value,
        interest: document.getElementById('interest').value,
        availability: document.getElementById('availability').value,
        experience: document.getElementById('experience').value,
        motivation: document.getElementById('motivation').value
      };

      if (formValues .age < 18 || formValues .age > 99) {
        throw new Error("Devi avere tra 18 e 99 anni");
      }

      const response = await fetch('/api/candidatura-volontari', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formValues )
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Errore durante l'invio");
      }
      
      alertDiv.classList.remove('alert-danger', 'd-none');
      alertDiv.classList.add('alert-success');
      alertDiv.textContent = result.message || "Candidatura inviata con successo!";
      form.reset();
      emailField.value = userInfo.email; 
      
      showAlreadySubmittedMessage();
      
    } catch (error) {
      console.error('Errore:', error);
      alertDiv.classList.remove('alert-success', 'd-none');
      alertDiv.classList.add('alert-danger');
      alertDiv.textContent = error.message || "Errore durante l'invio";
      alertDiv.scrollIntoView({ behavior: 'smooth' });
      
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
};

window.onload = async function() {
  toggleFAQ();
  setupNavbarScroll();
  setupSmoothScrolling();
  
  try {
    const authData = await checkAuthStatus();
    if (!authData.authenticated) {
      showLoginRequired();
      return;
    }

    const userInfo = await getUserInfo();
    if (!userInfo) {
      showLoginRequired();
      return;
    }

    await initVolunteerForm(userInfo);
    
  } catch (error) {
    console.error("Errore inizializzazione:", error);
    showLoginRequired();
  }
};