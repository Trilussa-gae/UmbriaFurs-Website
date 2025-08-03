const nav = document.querySelector('nav');
nav.classList.add('scrolled');

async function loadGallery(eventId) {
    try {
        const [eventRes, photosRes] = await Promise.all([
            fetch(`/api/eventi/${eventId}`),
            fetch(`/api/eventi/${eventId}/foto`)
        ]);
        
        const [eventData, photosData] = await Promise.all([
            eventRes.json(),
            photosRes.json()
        ]);

        if (!eventData.success || !photosData.success) {
            throw new Error('Dati non disponibili');
        }

        // Aggiorna titolo
        document.querySelector('.gallery-title').textContent = eventData.evento.titolo || 'Galleria Evento';
        
        const galleryGrid = document.getElementById('galleryGrid');
        
        if (!photosData.foto?.length) {
            galleryGrid.innerHTML = '<p class="no-photos">Nessuna foto disponibile per questo evento</p>';
            return;
        }

        galleryGrid.innerHTML = '';
        
        photosData.foto.forEach((foto, index) => {
            const imageUrl = base64ToObjectURL(foto.immagine_base64);
            
            galleryGrid.innerHTML += `
                <div class="gallery-item">
                    <img src="${imageUrl}" alt="Foto evento ${index + 1}" class="gallery-img">
                    <div class="gallery-actions">
                        <button class="view-full-btn" data-img-url="${imageUrl}">
                            <span class="material-icons">fullscreen</span> Visualizza
                        </button>
                        <a href="${imageUrl}" download="umbriafurs-${eventId}-${index + 1}.webp" class="download-btn">
                            <span class="material-icons">download</span> Scarica
                        </a>
                    </div>
                </div>
            `;
        });

        document.querySelectorAll('.view-full-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(btn.dataset.imgUrl, '_blank');
            });
        });

    } catch (error) {
        console.error("Errore:", error);
        document.getElementById('galleryGrid').innerHTML = `
            <div style="text-align:center;padding:2rem;grid-column:1/-1;">
                <p style="color:#dc3545;">
                    <span class="material-icons">warning</span> Errore nel caricamento della galleria
                </p>
                <a href="eventi-passati.html" class="back-button" style="margin-top:1rem;">
                    <span class="material-icons">arrow_back</span> Torna agli eventi
                </a>
            </div>
        `;
    }
}

//Convertire Base64 in URL
function base64ToObjectURL(base64) {
    const byteString = atob(base64.split(',')[1]);
    const buffer = new Uint8Array(byteString.length);
    
    byteString.split('').forEach((char, i) => {
        buffer[i] = char.charCodeAt(0);
    });

    return URL.createObjectURL(new Blob([buffer], {type: 'image/webp'}));
}

window.onload = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    if (!eventId) {
        window.location.href = 'eventi-passati.html';
        return;
    }

    await loadGallery(eventId);
};