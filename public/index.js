

const carouselItems = [
    { image: "./img/photo1.webp" },
    { image: "./img/photo2.webp" },
    { image: "./img/photo3.webp" },
];

let currentSlide = 0;
const totalSlides = carouselItems.length;

function updateArrowStates() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    prevBtn.disabled = false;
    nextBtn.disabled = false;
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-item');
    const bullets = document.querySelectorAll('.swiper-pagination-bullet');
    
    slides[currentSlide].classList.remove('active');
    bullets[currentSlide].classList.remove('swiper-pagination-bullet-active');
    
    currentSlide = (index + totalSlides) % totalSlides;
    
    slides[currentSlide].classList.add('active');
    bullets[currentSlide].classList.add('swiper-pagination-bullet-active');
}

function nextSlide() {
    goToSlide(currentSlide + 1);
}

function prevSlide() {
    goToSlide(currentSlide - 1);
}

async function initCarousel() {
    const carouselContent = document.getElementById('carousel-content');
    const swiperPagination = document.getElementById('swiper-pagination');

    carouselItems.forEach((item, index) => {
        carouselContent.innerHTML += `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${item.image}" alt="Slide ${index + 1}">
            </div>
        `;
        
        swiperPagination.innerHTML += `
            <span class="swiper-pagination-bullet ${index === 0 ? 'swiper-pagination-bullet-active' : ''}"
                  part="bullet" role="button" aria-label="Go to slide ${index + 1}">
            </span>
        `;
    });

    document.querySelectorAll('.swiper-pagination-bullet').forEach((bullet, index) => {
        bullet.addEventListener('click', () => goToSlide(index));
    });

    document.getElementById('prev-btn').addEventListener('click', prevSlide);
    document.getElementById('next-btn').addEventListener('click', nextSlide);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
    });
}

// EVENTI PASSATI
async function loadPastEvents() {
    try {
        const response = await fetch('/api/eventi-passati');
        const data = await response.json();
        
        if (data.success && data.eventi?.length) {
            data.eventi.slice(0, 3).forEach((event, index) => {
                const card = document.getElementById(`event-card-${index + 1}`);
                if (!card) return;
                
                const img = card.querySelector('img');
                if (img && event.immagine_base64) {
                    img.src = event.immagine_base64;
                    img.alt = event.titolo || `Evento ${index + 1}`;
                }
                
                if (event.titolo) card.querySelector('.event-card-content h3').textContent = event.titolo;
                if (event.data_evento) {
                    const date = new Date(event.data_evento);
                    card.querySelector('.event-card-content p').textContent = 
                        date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                }
            });
        }
    } catch (error) {
        console.error("Errore nel caricamento:", error);
    }
}

// GESTIONE EVENTO CORRENTE
async function loadCurrentEvent() {
    try {
        const res = await fetch("/api/ultimo-evento");
        const data = await res.json();
        
        if (!data.success || !data.evento) {
            document.getElementById("event-container").style.display = "none";
            document.getElementById("no-event-message").style.display = "block";
            return;
        }

        const event = data.evento;
        const date = new Date(event.data_evento);
        
        document.getElementById("event-banner").src = 
            event.immagine_base64 || event.immagine_path || 'img/evento_banner.webp';
        document.getElementById("event-title").textContent = event.titolo || "Evento senza titolo";
        document.getElementById("event-date").textContent = 
            date.toLocaleDateString("it-IT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        document.getElementById("event-time").textContent = 
            `Dalle ${event.ora_inizio?.slice(0, 5) || "--:--"} alle ${event.ora_fine?.slice(0, 5) || "--:--"}`;
        document.getElementById("event-location").textContent = event.localita || "Luogo non specificato";
        document.getElementById("event-description").textContent = event.descrizione || "Nessuna descrizione disponibile";

    } catch (err) {
        console.error("Errore nel caricamento evento:", err);
        document.getElementById("error-message").textContent = "Impossibile caricare l'evento. Riprova più tardi.";
        document.getElementById("error-message").style.display = "block";
    }
}

async function setupEventRegistration() {
    let isAuthenticated = false;
    let isRegistered = false;
    const regButton = document.getElementById("EventReg");
    const unsubButton = document.getElementById("EventUnsub");
    const adminSection = document.getElementById("admin-section");

    const updateButtons = () => {
        if (!regButton) return;
        regButton.style.backgroundColor = isRegistered ? "green" : "";
        regButton.textContent = isRegistered ? "REGISTRATO!" : "PARTECIPA";
        if (unsubButton) unsubButton.style.display = isRegistered ? "inline-block" : "none";
    };

    try {
        const response = await fetch("/api/userinfo", { credentials: "include" });
        const data = await response.json();

        if (response.ok && data.success) {
            isAuthenticated = true;
            isRegistered = data.registratoEvento;
            if (data.ruolo === "admin" && adminSection) adminSection.style.display = "block";
            updateButtons();
        }
    } catch (error) {
        console.error("Errore info utente:", error);
    }

    if (regButton) {
        regButton.addEventListener("click", async () => {
            if (!isAuthenticated) {
                alert("Devi fare login per registrarti all'evento.");
                window.location.href = "/login.html";
                return;
            }

            try {
                const res = await fetch("/api/event-register", { method: "POST", credentials: "include" });
                if (res.ok && (await res.json()).success) {
                    isRegistered = true;
                    updateButtons();
                } else alert("Errore durante la registrazione.");
            } catch (err) {
                console.error("Errore richiesta evento:", err);
                alert("Errore di rete.");
            }
        });
    }

    if (unsubButton) {
        unsubButton.addEventListener("click", async () => {
            try {
                const res = await fetch("/api/event-unregister", { method: "POST", credentials: "include" });
                if (res.ok && (await res.json()).success) {
                    isRegistered = false;
                    updateButtons();
                } else alert("Errore durante l'annullamento.");
            } catch (err) {
                console.error("Errore richiesta evento:", err);
                alert("Errore di rete.");
            }
        });
    }
}

window.onload = async function() {
    initCarousel();
    loadPastEvents();
    loadCurrentEvent();
    setupEventRegistration();
};