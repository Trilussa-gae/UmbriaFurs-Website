window.eliminaVolontario = eliminaVolontario;
window.eliminaFoto = eliminaFoto;
window.promuoviUtente = promuoviUtente;
window.eliminaUtente = eliminaUtente;

function showMessage(message, type = "success") {
  const msgDiv = document.getElementById("modificaMessage");
  msgDiv.innerHTML = `<i class="material-icons">${type === 'success' ? 'check_circle' : 'error'}</i> ${message}`;
  msgDiv.className = `alert alert-${type}`;
  msgDiv.classList.remove("hidden");
  
  setTimeout(() => msgDiv.classList.add("hidden"), 5000);
}

/* ============================================= GESTIONE EVENTI ============================================= */
async function caricaEventi() {
  try {
    const res = await fetch("/api/eventi-passati");
    const data = await res.json();

    if (data.success) {
      const selectEvento = document.getElementById("eventoSelect");
      const selectFotoEvento = document.getElementById("fotoEventoSelect");
      
      selectEvento.innerHTML = selectFotoEvento.innerHTML = '<option value="">Seleziona Evento</option>';
      
      data.eventi.forEach(evento => {
        const option = `<option value="${evento.id}">${evento.titolo}</option>`;
        selectEvento.innerHTML += option;
        selectFotoEvento.innerHTML += option;
      });
    }
  } catch (err) {
    console.error("Errore nel caricamento eventi:", err);
    showMessage("Errore nel caricamento eventi", "error");
  }
}

async function caricaEventiPerModifica() {
  const select = document.getElementById("selezionaEvento");
  select.innerHTML = '<option value="">Seleziona un evento</option>';
  
  try {
    const res = await fetch("/api/eventi-passati");
    const data = await res.json();

    if (data.success && data.eventi.length > 0) {
      data.eventi.forEach(evento => {
        select.innerHTML += `<option value="${evento.id}">${evento.titolo} (${new Date(evento.data_evento).toLocaleDateString('it-IT')})</option>`;
      });
    }
  } catch (err) {
    console.error("Errore nel caricamento eventi:", err);
    showMessage("Errore nel caricamento degli eventi", "error");
  }
}

async function caricaDatiEvento(eventoId) {
  try {
    const res = await fetch(`/api/eventi/${eventoId}`);
    const data = await res.json();

    if (!data.success || !data.evento) throw new Error("Evento non trovato");

    const evento = data.evento;
    const dataEvento = new Date(evento.data_evento).toISOString().split('T')[0];
    const oraInizio = evento.ora_inizio?.split(':').slice(0, 2).join(':') || '';
    const oraFine = evento.ora_fine?.split(':').slice(0, 2).join(':') || '';
    
    document.getElementById("eventoId").value = evento.id;
    document.getElementById("modificaTitolo").value = evento.titolo;
    document.getElementById("modificaDescrizione").value = evento.descrizione;
    document.getElementById("modificaData").value = dataEvento;
    document.getElementById("modificaOraInizio").value = oraInizio;
    document.getElementById("modificaOraFine").value = oraFine;
    document.getElementById("modificaLocalita").value = evento.localita;
    
    const imgPreview = document.getElementById("anteprimaImmagine");
    imgPreview.src = evento.immagine_base64 || "";
    imgPreview.classList.toggle("hidden", !evento.immagine_base64);
    
    document.getElementById("modificaEventoForm").classList.remove("hidden");
  } catch (err) {
    console.error("Errore nel caricamento evento:", err);
    showMessage("Errore nel caricamento dell'evento", "error");
  }
}

async function caricaUltimoEvento() {
  try {
    const res = await fetch("/api/ultimo-evento");
    const data = await res.json();

    if (!data.success || !data.evento) {
      showMessage("Nessun evento trovato", "error");
      return;
    }

    const select = document.getElementById("selezionaEvento");
    select.value = data.evento.id;
    caricaDatiEvento(data.evento.id);
    showMessage("Ultimo evento caricato con successo");
  } catch (err) {
    console.error("Errore nel caricamento ultimo evento:", err);
    showMessage("Errore nel caricamento dell'ultimo evento", "error");
  }
}

async function salvaEvento(e) {
  e.preventDefault();
  const form = e.target;
  const fileInput = document.getElementById("immagineInput");

  if (fileInput.files.length === 0) {
    showMessage("Seleziona un'immagine per l'evento", "error");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async function(e) {
    const base64Image = e.target.result.split(',')[1];
    const eventoData = {
      titolo: form.titolo.value,
      descrizione: form.descrizione.value,
      data_evento: form.data_evento.value,
      ora_inizio: form.ora_inizio.value,
      ora_fine: form.ora_fine.value,
      localita: form.localita.value,
      immagine: base64Image
    };

    try {
      const res = await fetch("/api/nuovo-evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventoData)
      });

      const result = await res.json();
      showMessage(result.message, result.success ? "success" : "error");

      if (result.success) {
        form.reset();
        await Promise.all([caricaEventi(), caricaEventiPerModifica()]);
      }
    } catch (err) {
      console.error("Errore durante il salvataggio:", err);
      showMessage("Errore durante il salvataggio dell'evento", "error");
    }
  };

  reader.readAsDataURL(file);
}

async function salvaModificheEvento(e) {
  e.preventDefault();
  const loading = document.getElementById("modificaLoading");
  loading.classList.remove("hidden");
  
  const eventoId = document.getElementById("eventoId").value;
  const eventoData = {
    titolo: document.getElementById("modificaTitolo").value,
    descrizione: document.getElementById("modificaDescrizione").value,
    data_evento: document.getElementById("modificaData").value,
    ora_inizio: document.getElementById("modificaOraInizio").value,
    ora_fine: document.getElementById("modificaOraFine").value,
    localita: document.getElementById("modificaLocalita").value
  };

  const fileInput = document.getElementById("modificaImmagine");
  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      eventoData.immagine = e.target.result.split(',')[1];
      await inviaModifiche(eventoId, eventoData, loading);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    await inviaModifiche(eventoId, eventoData, loading);
  }
}

async function inviaModifiche(eventoId, eventoData, loading) {
  try {
    const res = await fetch(`/api/eventi/${eventoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventoData)
    });

    const result = await res.json();
    
    if (result.success) {
      showMessage("Evento aggiornato con successo!");
      await Promise.all([caricaEventiPerModifica(), caricaEventi()]);
    } else {
      throw new Error(result.message || "Errore durante l'aggiornamento");
    }
  } catch (err) {
    console.error("Errore durante l'invio:", err);
    showMessage("Errore durante il salvataggio", "error");
  } finally {
    loading?.classList.add("hidden");
  }
}

async function eliminaEvento() {
  const eventoId = document.getElementById("eventoId").value;
  if (!eventoId || !confirm("Sei sicuro di voler eliminare questo evento? L'azione è irreversibile.")) return;

  try {
    const res = await fetch(`/api/eventi/${eventoId}`, { method: "DELETE" });
    const result = await res.json();
    
    if (result.success) {
      showMessage("Evento eliminato con successo");
      document.getElementById("modificaEventoForm").classList.add("hidden");
      await Promise.all([caricaEventiPerModifica(), caricaEventi()]);
    } else {
      throw new Error(result.message || "Errore durante l'eliminazione");
    }
  } catch (err) {
    console.error("Errore durante l'eliminazione:", err);
    showMessage("Errore durante l'eliminazione dell'evento", "error");
  }
}

/* ============================================= GESTIONE UTENTI ============================================= */
async function caricaListaUtenti() {
  const container = document.getElementById("listaUtenti");
  container.innerHTML = '<p><i class="material-icons spin">refresh</i> Caricamento utenti in corso...</p>';

  try {
    const res = await fetch("/api/utenti");
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = '<div class="alert alert-error"><i class="material-icons">error</i> Errore nel recupero utenti</div>';
      return;
    }

    if (!data.utenti?.length) {
      container.innerHTML = '<p>Nessun utente registrato</p>';
      return;
    }

    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";
    
    const table = document.createElement("table");
    table.className = "table-volontari";
    
    table.innerHTML = `
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Ruolo</th>
          <th>Azioni</th>
        </tr>
      </thead>
    `;
    
    const tbody = document.createElement("tbody");
    data.utenti.forEach(utente => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td title="${utente.nome}">${utente.nome.length > 20 ? `${utente.nome.substring(0, 20)}...` : utente.nome}</td>
        <td title="${utente.email}">${utente.email.length > 25 ? `${utente.email.substring(0, 25)}...` : utente.email}</td>
        <td>${utente.ruolo === 'admin' ? 'Admin' : 'Utente'}</td>
        <td style="display: flex; gap: 0.5rem; flex-wrap: nowrap;">
          ${utente.ruolo === 'guest' ? 
            `<button class="btn btn-primary" onclick="promuoviUtente(${utente.id}, 'admin')" title="Promuovi ad admin">
              <i class="material-icons">admin_panel_settings</i>
            </button>` : 
            `<button class="btn btn-warning" onclick="promuoviUtente(${utente.id}, 'guest')" title="Retrocedi a utente">
              <i class="material-icons">person_remove</i>
            </button>`}
          <button class="btn btn-danger" onclick="eliminaUtente(${utente.id})" title="Elimina utente">
            <i class="material-icons">delete</i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableContainer.appendChild(table);
    container.innerHTML = "";
    container.appendChild(tableContainer);
  } catch (err) {
    console.error("Errore nel caricamento utenti:", err);
    container.innerHTML = '<div class="alert alert-error"><i class="material-icons">error</i> Errore nel caricamento</div>';
  }
}

async function promuoviUtente(userId, nuovoRuolo) {
  if (!confirm(`Sei sicuro di voler ${nuovoRuolo === 'admin' ? 'promuovere' : 'retrocedere'} questo utente?`)) return;
  const scrollPosition = window.scrollY || window.pageYOffset;

  try {
    const res = await fetch(`/api/utenti/${userId}/ruolo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruolo: nuovoRuolo })
    });

    const result = await res.json();
    
    if (result.success) {
      showMessage(`Utente ${nuovoRuolo === 'admin' ? 'promosso' : 'retrocesso'} con successo`, "success");
      await caricaListaUtenti();
      window.scrollTo(0, scrollPosition);
    } else {
      throw new Error(result.message || "Errore nell'aggiornamento");
    }
  } catch (err) {
    console.error("Errore durante l'aggiornamento:", err);
    showMessage("Errore durante l'aggiornamento del ruolo", "error");
    window.scrollTo(0, scrollPosition);
  }
}

async function eliminaUtente(userId) {
  if (!confirm("Sei sicuro di voler eliminare definitivamente questo utente?")) return;
  const scrollPosition = window.scrollY || window.pageYOffset;

  try {
    const res = await fetch(`/api/utenti/${userId}`, { method: "DELETE" });
    const result = await res.json();
    
    if (result.success) {
      showMessage("Utente eliminato con successo", "success");
      await caricaListaUtenti();
      window.scrollTo(0, scrollPosition);
    } else {
      throw new Error(result.message || "Errore nell'eliminazione");
    }
  } catch (err) {
    console.error("Errore durante l'eliminazione:", err);
    showMessage("Errore durante l'eliminazione dell'utente", "error");
    window.scrollTo(0, scrollPosition);
  }
}

/* ============================================= GESTIONE FOTO DI EVENTI ============================================= */
async function caricaFoto(e) {
  e.preventDefault();
  const eventoId = document.getElementById("eventoSelect").value;
  const fileInput = document.getElementById("fotoInput");
  const descrizione = document.getElementById("fotoDesc").value;
  const statusDiv = document.getElementById("caricamentoStatus");
  
  if (!eventoId) return showMessage("Seleziona un evento", "error");
  if (fileInput.files.length === 0) return showMessage("Seleziona almeno una foto", "error");

  for (let file of fileInput.files) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const res = await fetch(`/api/eventi/${eventoId}/foto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            immagine: e.target.result.split(',')[1],
            descrizione: descrizione
          })
        });

        const result = await res.json();
        const icon = result.success ? 'check_circle' : 'error';
        const color = result.success ? 'var(--success)' : 'var(--danger)';
        statusDiv.innerHTML += `<p><i class="material-icons" style="color: ${color}">${icon}</i> ${file.name} ${result.success ? 'caricata' : 'errore'}</p>`;
      } catch (err) {
        console.error(err);
        statusDiv.innerHTML += `<p><i class="material-icons" style="color: var(--danger)">error</i> Errore nel caricamento di ${file.name}</p>`;
      }
    };
    reader.readAsDataURL(file);
  }
}

async function mostraFotoPerEvento() {
  const eventoId = document.getElementById("fotoEventoSelect").value;
  const fotoContainer = document.getElementById("fotoContainer");
  
  if (!eventoId) return showMessage("Seleziona un evento", "error");

  fotoContainer.innerHTML = '<p><i class="material-icons spin">refresh</i> Caricamento foto...</p>';

  try {
    const res = await fetch(`/api/eventi/${eventoId}/foto`);
    const data = await res.json();

    if (!data.success || !data.foto?.length) {
      fotoContainer.innerHTML = '<p>Nessuna foto disponibile per questo evento</p>';
      return;
    }

    fotoContainer.innerHTML = "";
    const gallery = document.createElement("div");
    gallery.className = "gallery";

    data.foto.forEach(foto => {
      const photoCard = document.createElement("div");
      photoCard.className = "photo-card";
      photoCard.innerHTML = `
        <img src="${foto.immagine_base64}" alt="${foto.descrizione || 'Foto evento'}">
        ${foto.descrizione ? `<p class="photo-desc">${foto.descrizione}</p>` : ''}
        <div class="photo-actions">
          <button class="btn btn-danger" onclick="eliminaFoto(${eventoId}, ${foto.id})">
            <i class="material-icons">delete</i> Elimina
          </button>
        </div>
      `;
      gallery.appendChild(photoCard);
    });

    fotoContainer.appendChild(gallery);
  } catch (err) {
    console.error("Errore nel caricamento foto:", err);
    fotoContainer.innerHTML = '<div class="alert alert-error"><i class="material-icons">error</i> Errore nel caricamento delle foto</div>';
  }
}

async function eliminaFoto(eventoId, fotoId) {
  if (!confirm("Sei sicuro di voler eliminare questa foto?")) return;
  
  try {
    const delRes = await fetch(`/api/eventi/${eventoId}/foto/${fotoId}`, { method: "DELETE" });
    const result = await delRes.json();
    
    if (result.success) {
      document.querySelector(`.photo-card button[onclick="eliminaFoto(${eventoId}, ${fotoId})"]`).closest('.photo-card').remove();
      showMessage("Foto eliminata con successo");
    } else {
      throw new Error(result.message || "Errore durante l'eliminazione");
    }
  } catch (err) {
    console.error("Errore eliminazione foto:", err);
    showMessage("Errore durante l'eliminazione della foto", "error");
  }
}

/* ============================================= GESTIONE VOLONTARI ============================================= */
async function caricaVolontari() {
  const lista = document.getElementById("listaVolontari");
  lista.innerHTML = '<p><i class="material-icons spin">refresh</i> Caricamento volontari in corso...</p>';

  try {
    const res = await fetch("/api/visualizzazione-volontari");
    const data = await res.json();

    if (!data.success) {
      lista.innerHTML = '<div class="alert alert-error"><i class="material-icons">error</i> Errore nel recupero volontari</div>';
      return;
    }

    if (data.volontari.length === 0) {
      lista.innerHTML = '<p>Nessun volontario trovato</p>';
      return;
    }

    const container = document.createElement("div");
    container.className = "table-container";
    
    const table = document.createElement("table");
    table.className = "table-volontari";
    
    const headers = ["Nome", "Email", "Tel", "Età", "Interesse", "Disponibilità", "Esperienza", "Motivazione", "Data", "Azioni"];
    const headerRow = headers.map(text => {
      const th = document.createElement("th");
      th.textContent = text;
      return th;
    });
    
    table.innerHTML = `<thead><tr>${headerRow.map(th => th.outerHTML).join('')}</tr></thead>`;
    
    const tbody = document.createElement("tbody");
    data.volontari.forEach(v => {
      const experience = v.experience?.length > 30 ? `${v.experience.substring(0, 30)}...` : v.experience || "-";
      const motivation = v.motivation?.length > 30 ? `${v.motivation.substring(0, 30)}...` : v.motivation || "-";
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${v.name}</td>
        <td>${v.email}</td>
        <td>${v.phone || "-"}</td>
        <td>${v.age}</td>
        <td>${v.interest}</td>
        <td>${v.availability}</td>
        <td>${experience.replace(/\n/g, "<br>")}</td>
        <td>${motivation.replace(/\n/g, "<br>")}</td>
        <td>${new Date(v.application_date).toLocaleDateString('it-IT')}</td>
        <td>
          <button class="btn btn-danger" onclick="eliminaVolontario(${v.id}, '${v.name}')" title="Elimina volontario">
            <i class="material-icons">delete</i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    lista.innerHTML = "";
    lista.appendChild(container);
  } catch (err) {
    console.error("Errore caricamento volontari:", err);
    lista.innerHTML = '<div class="alert alert-error"><i class="material-icons">error</i> Errore nel caricamento</div>';
  }
}

async function eliminaVolontario(id, name) {
  if (!confirm(`Eliminare ${name}?`)) return;
  
  try {
    const delRes = await fetch(`/api/volontari/${id}`, { method: "DELETE" });
    const result = await delRes.json();
    
    showMessage(result.message, result.success ? "success" : "error");
    if (result.success) caricaVolontari();
  } catch (err) {
    console.error("Errore eliminazione:", err);
    showMessage("Errore durante l'eliminazione", "error");
  }
}

window.onload = async function() {
  await Promise.all([
    caricaListaUtenti(),
    caricaVolontari(),
    caricaEventi(),
    caricaEventiPerModifica()
  ]);

  document.getElementById("eventoForm").addEventListener("submit", salvaEvento);
  document.getElementById("fotoForm").addEventListener("submit", caricaFoto);
  document.getElementById("mostraFotoBtn").addEventListener("click", mostraFotoPerEvento);
  document.getElementById("caricaUltimoEventoBtn").addEventListener("click", caricaUltimoEvento);
  document.getElementById("modificaEventoForm").addEventListener("submit", salvaModificheEvento);
  document.getElementById("eliminaEventoBtn").addEventListener("click", eliminaEvento);

  document.getElementById("selezionaEvento").addEventListener("change", function() {
    this.value ? caricaDatiEvento(this.value) : document.getElementById("modificaEventoForm").classList.add("hidden");
  });

  document.getElementById("modificaImmagine").addEventListener("change", function(e) {
    if (this.files?.[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.getElementById("anteprimaImmagine");
        img.src = e.target.result;
        img.classList.remove("hidden");
      };
      reader.readAsDataURL(this.files[0]);
    }
  });
};