const nav = document.querySelector('nav');
nav.classList.add('scrolled');
const mainContent = document.getElementById('eventsContainer');

async function loadEventsPage() {
    try {
        const response = await fetch("/api/eventi-passati");
        const data = await response.json();

        if (!data.success || !data.eventi || data.eventi.length === 0) {
            mainContent.innerHTML = '<p class="no-events">Nessun evento passato disponibile al momento.</p>';
            return;
        }
        
        mainContent.innerHTML = '';
        data.eventi.forEach(evento => {
            const eventDate = new Date(evento.data_evento);
            const formattedDate = eventDate.toLocaleDateString("it-IT", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });
            const badgeDate = eventDate.toLocaleDateString("it-IT", {
                day: "numeric",
                month: "short"
            });

            mainContent.innerHTML += `
                <div class="past-event-card">
                    <div class="past-event-banner-frame">
                        <img src="${evento.immagine_base64}" alt="${evento.titolo}" class="past-event-banner" loading="lazy">
                        <div class="event-date-badge">${badgeDate}</div>
                    </div>
                    <div class="past-event-info">
                        <h3>${evento.titolo || 'Evento senza titolo'}</h3>
                        <div class="info-item">
                            <span class="info-icon"><span class="material-icons">event</span></span>
                            <span class="info-text">${formattedDate}</span>
                        </div>
                        ${evento.ora_inizio || evento.ora_fine ? `
                        <div class="info-item">
                            <span class="info-icon"><span class="material-icons">schedule</span></span>
                            <span class="info-text">
                                ${evento.ora_inizio ? `Dalle ${evento.ora_inizio.slice(0, 5)}` : ''}
                                ${evento.ora_fine ? `alle ${evento.ora_fine.slice(0, 5)}` : ''}
                            </span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="info-icon"><span class="material-icons">place</span></span>
                            <span class="info-text">${evento.localita || 'Luogo non specificato'}</span>
                        </div>
                        <p class="past-event-description">${evento.descrizione || 'Nessuna descrizione disponibile'}</p>
                        <a href="foto-eventi.html?id=${evento.id}" class="view-photos-btn">
                            Vedi le foto <span class="material-icons">photo_camera</span>
                        </a>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Errore nel caricamento:", error);
        mainContent.innerHTML = '<p class="error-message">Errore nel caricamento degli eventi</p>';
    }
}

window.onload = async function() {
    await loadEventsPage();
};