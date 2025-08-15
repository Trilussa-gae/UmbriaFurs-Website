require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3306;

app.use(express.json({ limit: '16mb' }));
app.use(cookieParser());
app.use(express.static("public"));

const JWT_SECRET = "mia_chiave_super_segreta";

const pool = mysql.createPool({
    host: "mysql-mio-db.alwaysdata.net",
    user: "mio-db",
    password: "Riccardo2003",
    database: "mio-db_events",
    port:3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/* ========================================== AUTHENTICATION MIDDLEWARE ========================================== */
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.redirect(302, "/index.html");
    
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.redirect(302, "/index.html");
    }
}

function checkAdmin(req, res, next) {
    if (req.user.ruolo === 'admin') return next();
    return res.redirect(302, "/index.html");
}

/* ========================================== PROTEGGIAMO CARTELLA /RESTRICTED ========================================== */
app.use("/restricted", authenticateToken, checkAdmin, express.static("restricted"));

/* ========================================== ROUTES PUBBLICHE ========================================== */

// Autenticazione
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email e password sono obbligatori"
        });
    }

    const query = "SELECT id, nome, ruolo FROM utenti WHERE email = ? AND password = ?";
    try {
        const [rows] = await pool.promise().execute(query, [email, password]);

        if (rows.length == 0) {
            return res.status(401).json({
                success: false,
                message: "Credenziali non valide"
            });
        }

        const user = rows[0];

        const payload = {
            userId: user.id,
            userName: user.nome,
            ruolo: user.ruolo
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            algorithm: "HS256",
            expiresIn: "1h"
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 3600000,
            sameSite: "Strict"
        });

        return res.json({
            success: true,
            message: "Login riuscito"
        });

    } catch (err) {
        console.error("Errore query DB:", err);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    }
});

app.post("/api/register", async (req, res) => {
    const { nome, email, password } = req.body;

    if (!nome || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email e password obbligatori"
        });
    }

    try {
        const [rows] = await pool.promise().execute(
            'SELECT id FROM utenti WHERE email = ?',
             [email]
        );

        if (rows.length > 0) {
            return res.status(409).json({ success: false, message: "Email già registrata" });
        }

        await pool.promise().execute('INSERT INTO utenti (nome, email, password) VALUES (?, ?, ?)', 
            [nome, email, password]);

        res.json({ success: true, message: "Registrazione riuscita" });
    } catch (err) {
        console.error("Errore nel DB:", err);
        res.status(500).json({ success: false, message: "Errore del server" });
    }
});

/* To save the photo permanently to the filesystem (blobs are objects temporarily loaded into browser memory), 
 the Filesystem API requires the data to be in base64 format, so we must convert the blob into a base64 string */

// Eventi
app.get("/api/ultimo-evento", async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                id, 
                titolo, 
                descrizione, 
                data_evento,
                ora_inizio, 
                ora_fine, 
                localita,
                CONCAT('data:image/*;base64,', TO_BASE64(immagine)) as immagine_base64
            FROM eventi 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (rows.length === 0) {
            return res.json({ success: true, evento: null });
        }

        res.json({ 
            success: true, 
            evento: rows[0] 
        });
    } catch (err) {
        console.error("Errore recupero ultimo evento:", err);
        res.status(500).json({ 
            success: false, 
            message: "Errore recupero evento",
            error: err.message 
        });
    }
});

app.get("/api/eventi-passati", async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                id, titolo, descrizione, data_evento,
                ora_inizio, ora_fine, localita,
                CONCAT('data:image/*;base64,', TO_BASE64(immagine)) as immagine_base64
            FROM eventi 
            ORDER BY created_at DESC 
            LIMIT 100 
            OFFSET 1
        `);

        res.json({ success: true, eventi: rows });
    } catch (err) {
        console.error("Errore recupero eventi passati:", err);
        res.status(500).json({ success: false, message: "Errore recupero eventi" });
    }
});

app.get("/api/eventi/:id", async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                id, titolo, descrizione, data_evento, 
                ora_inizio, ora_fine, localita,
                CONCAT('data:image/*;base64,', TO_BASE64(immagine)) as immagine_base64
            FROM eventi 
            WHERE id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Evento non trovato" 
            });
        }

        res.json({ 
            success: true, 
            evento: rows[0] 
        });
    } catch (err) {
        console.error("Errore recupero evento:", err);
        res.status(500).json({ 
            success: false, 
            message: "Errore recupero evento",
            error: err.message 
        });
    }
});

app.get("/api/eventi/:id/foto", async (req, res) => {
    const eventoId = req.params.id;

    try {
        const [foto] = await pool.promise().query(`
            SELECT 
                id,
                CONCAT('data:image/*;base64,', TO_BASE64(immagine)) as immagine_base64,
                descrizione
            FROM eventi_foto 
            WHERE evento_id = ?
            ORDER BY data_caricamento DESC
        `, [eventoId]);

        res.json({ success: true, foto });
    } catch (error) {
        console.error("Errore recupero foto:", error);
        res.status(500).json({ success: false, message: "Errore recupero foto" });
    }
});

/* ========================================== ROUTES PROTETTE ========================================== */

// Gestione utente
app.get("/api/check-auth", authenticateToken, (req, res) => {
    res.json({
        authenticated: true,
        user: req.user
    });
});

app.post("/api/logout", authenticateToken, (req, res) => {
    res.clearCookie("token");
    res.json({
        success: true,
        message: "Logout effettuato"
    });
});

app.get("/api/userinfo", authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT nome, ruolo, registrato_evento, email FROM utenti WHERE id = ?',
            [req.user.userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Utente non trovato" });
        }

        const user = rows[0];

        res.json({
            success: true,
            nome: user.nome,
            ruolo: user.ruolo,
            registratoEvento: user.registrato_evento,
            email: user.email
        });
    } catch (error) {
        console.error("Errore nel recupero userinfo:", error);
        res.status(500).json({ success: false, message: "Errore interno" });
    }
});

// Eventi
app.post("/api/event-register", authenticateToken, async (req, res) => {
    try {
        await pool.promise().execute(
            'UPDATE utenti SET registrato_evento = TRUE WHERE id = ?',
            [req.user.userId]
        );

        res.json({ success: true, message: "Registrazione evento salvata" });
    } catch (error) {
        console.error("Errore registrazione evento:", error);
        res.status(500).json({ success: false, message: "Errore interno" });
    }
});

app.post("/api/event-unregister", authenticateToken, async (req, res) => {
    try {
        await pool.promise().execute('UPDATE utenti SET registrato_evento = FALSE WHERE id = ?',
            [req.user.userId]
        );

        res.json({ success: true, message: "Annullamento registrazione effettuato" });
    } catch (error) {
        console.error("Errore annullamento registrazione:", error);
        res.status(500).json({ success: false, message: "Errore interno" });
    }
});

app.get("/api/check-submission", authenticateToken, async (req, res) => {
    try {
        const [userRows] = await pool.promise().execute(
            'SELECT email FROM utenti WHERE id = ?',
            [req.user.userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Utente non trovato"
            });
        }

        const userEmail = userRows[0].email;

        const [submissionRows] = await pool.promise().execute(
            'SELECT id FROM volontari WHERE email = ?',
            [userEmail]
        );

        res.json({
            success: true,
            alreadySubmitted: submissionRows.length > 0,
            email: userEmail
        });

    } catch (error) {
        console.error("Errore controllo invio form:", error);
        res.status(500).json({
            success: false,
            message: "Errore durante il controllo dello stato dell'invio"
        });
    }
});

app.post("/api/candidatura-volontari", authenticateToken, async (req, res) => {
    const { name, email, phone, age, interest, availability, experience, motivation } = req.body;

    if (!name || !email || !age || !interest || !availability || !motivation) {
        return res.status(400).json({
            success: false,
            message: "Tutti i campi obbligatori devono essere compilati"
        });
    }

    try {
        await pool.promise().execute(
            'INSERT INTO VOLONTARI (name, email, phone, age, interest, availability, experience, motivation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, age, interest, availability, experience, motivation]
        );

        res.json({
            success: true,
            message: "Candidatura inviata con successo!"
        });
    } catch (error) {
        console.error("Errore durante l'inserimento:", error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Esiste già una candidatura con questa email"
            });
        }

        res.status(500).json({
            success: false,
            message: "Errore durante salvataggio della candidatura"
        });
    }
});

/* ========================================== ROUTES ADMIN ========================================== */

// Gestione utenti
app.get("/api/utenti", authenticateToken, checkAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().execute(
            'SELECT id, nome, email, ruolo FROM utenti ORDER BY nome'
        );
        
        res.json({
            success: true,
            utenti: rows
        });
    } catch (err) {
        console.error("Errore recupero utenti:", err);
        res.status(500).json({
            success: false,
            message: "Errore recupero utenti"
        });
    }
});

app.put("/api/utenti/:id/ruolo", authenticateToken, checkAdmin, async (req, res) => {
    const userId = req.params.id;
    const { ruolo } = req.body;

    if (!['admin', 'guest'].includes(ruolo)) {
        return res.status(400).json({
            success: false,
            message: "Ruolo non valido"
        });
    }

    try {
        await pool.promise().execute(
            'UPDATE utenti SET ruolo = ? WHERE id = ?',
            [ruolo, userId]
        );

        res.json({
            success: true,
            message: "Ruolo aggiornato con successo"
        });
    } catch (err) {
        console.error("Errore aggiornamento ruolo:", err);
        res.status(500).json({
            success: false,
            message: "Errore aggiornamento ruolo"
        });
    }
});

app.delete("/api/utenti/:id", authenticateToken, checkAdmin, async (req, res) => {
    const userId = req.params.id;

    try {
        const [userCheck] = await pool.promise().execute(
            'SELECT id FROM utenti WHERE id = ?',
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Utente non trovato"
            });
        }

        if (req.user.id === parseInt(userId)) {
            return res.status(403).json({
                success: false,
                message: "Non puoi eliminare il tuo account"
            });
        }

        await pool.promise().execute(
            'DELETE FROM utenti WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: "Utente eliminato con successo"
        });
    } catch (err) {
        console.error("Errore eliminazione utente:", err);
        res.status(500).json({
            success: false,
            message: "Errore durante l'eliminazione dell'utente"
        });
    }
});

// Gestione eventi
app.post("/api/nuovo-evento", authenticateToken, checkAdmin, async (req, res) => {
    const { titolo, descrizione, data_evento, ora_inizio, ora_fine, localita, immagine } = req.body;

    if (!titolo || !descrizione || !data_evento || !ora_inizio || !ora_fine || !localita || !immagine) {
        return res.status(400).json({ 
            success: false, 
            message: "Tutti i campi sono obbligatori" 
        });
    }

    try {
        const imageBuffer = Buffer.from(immagine, 'base64');
        
        const conn = await pool.promise().getConnection();
        await conn.beginTransaction();

        try {
            const [result] = await conn.execute(`
                INSERT INTO eventi 
                    (titolo, descrizione, data_evento, ora_inizio, ora_fine, localita, immagine) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                titolo, 
                descrizione, 
                data_evento, 
                ora_inizio, 
                ora_fine, 
                localita, 
                imageBuffer
            ]);

            await conn.execute(
                'UPDATE utenti SET registrato_evento = 0 WHERE registrato_evento = 1'
            );

            await conn.commit();

            res.json({ 
                success: true, 
                message: "Evento creato con successo e registrazioni resettate!",
                id: result.insertId 
            });

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error("Errore durante il salvataggio:", error);
        
        if (error.code === 'ER_DATA_TOO_LONG') {
            return res.status(413).json({ 
                success: false, 
                message: "L'immagine è troppo grande (max 16MB)"
            });
        }

        res.status(500).json({ 
            success: false, 
            message: "Errore durante il salvataggio",
            error: error.message 
        });
    }
});

app.put('/api/eventi/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { 
            titolo, 
            descrizione, 
            data_evento, 
            ora_inizio, 
            ora_fine, 
            localita,
            immagine 
        } = req.body;
        
        let updates = {
            titolo, 
            descrizione, 
            data_evento, 
            ora_inizio, 
            ora_fine, 
            localita
        };

        if (immagine) {
            updates.immagine = Buffer.from(immagine, 'base64');
        }

        const [result] = await pool.promise().query(
            'UPDATE eventi SET ? WHERE id = ?', 
            [updates, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Evento non trovato" 
            });
        }
        
        res.json({ 
            success: true, 
            message: "Evento aggiornato con successo" 
        });
    } catch (err) {
        console.error("Errore modifica evento:", err);
        res.status(500).json({ 
            success: false, 
            message: "Errore modifica evento",
            error: err.message 
        });
    }
});

app.delete('/api/eventi/:id', authenticateToken, checkAdmin, async (req, res) => {
    try {
        await pool.promise().query(
            'DELETE FROM eventi_foto WHERE evento_id = ?', 
            [req.params.id]
        );

        const [result] = await pool.promise().query(
            'DELETE FROM eventi WHERE id = ?', 
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Evento non trovato" 
            });
        }

        res.json({ 
            success: true, 
            message: "Evento e foto associate eliminati con successo" 
        });
    } catch (err) {
        console.error("Errore eliminazione evento:", err);
        res.status(500).json({ 
            success: false, 
            message: "Errore eliminazione evento",
            error: err.message 
        });
    }
});

// Gestione volontari
app.get("/api/visualizzazione-volontari", authenticateToken, checkAdmin, async (req, res) => {
    try {
        const [rows] = await pool.promise().query(`
            SELECT 
                id, name, email, phone, age, interest, availability, experience, motivation, application_date 
            FROM volontari
            ORDER BY application_date DESC
        `);

        res.json({
            success: true,
            volontari: rows
        });
    } catch (err) {
        console.error("Errore recupero volontari:", err);
        res.status(500).json({
            success: false,
            message: "Errore interno del server"
        });
    }
});

app.delete("/api/volontari/:id", authenticateToken, checkAdmin, async (req, res) => {
    const volontarioId = req.params.id;

    try {
        const [result] = await pool.promise().execute(
            "DELETE FROM volontari WHERE id = ?",
            [volontarioId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Volontario non trovato"
            });
        }

        res.json({
            success: true,
            message: "Volontario eliminato con successo"
        });
    } catch (error) {
        console.error("Errore eliminazione volontario:", error);
        res.status(500).json({
            success: false,
            message: "Errore durante l'eliminazione del volontario"
        });
    }
});

// Gestione foto
app.post('/api/eventi/:id/foto', authenticateToken, checkAdmin, async (req, res) => {
    const eventoId = req.params.id;
    const { immagine, descrizione } = req.body;

    if (!immagine) {
        return res.status(400).json({ success: false, message: "Immagine mancante" });
    }

    try {
        const imageBuffer = Buffer.from(immagine, 'base64');
        
        await pool.promise().execute(
            'INSERT INTO eventi_foto (evento_id, immagine, descrizione) VALUES (?, ?, ?)',
            [eventoId, imageBuffer, descrizione]
        );

        res.json({ success: true, message: "Foto caricata con successo" });
    } catch (error) {
        console.error("Errore caricamento foto:", error);
        res.status(500).json({ success: false, message: "Errore caricamento foto" });
    }
});

app.delete('/api/eventi/:eventoId/foto/:fotoId', authenticateToken, checkAdmin, async (req, res) => {
    const { eventoId, fotoId } = req.params;

    try {
        const [result] = await pool.promise().execute(
            'DELETE FROM eventi_foto WHERE id = ? AND evento_id = ?',
            [fotoId, eventoId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Foto non trovata o non appartiene all'evento" 
            });
        }

        res.json({ 
            success: true, 
            message: "Foto eliminata con successo" 
        });
    } catch (err) {
        console.error("Errore eliminazione foto:", err);
        res.status(500).json({ 
            success: false, 
            message: "Errore durante l'eliminazione della foto",
            error: err.message 
        });
    }
});

/* ========================================== GESTIONE ERRORE 404 ========================================== */
app.use((req, res) => {
    if (req.originalUrl.startsWith("/api")) {
        return res.status(404).json({ error: "Endpoint non trovato" });
    } else {
        return res.status(404).sendFile(__dirname + "/public/404.html");
    }
});

/* ========================================== AVVIO SERVER ========================================== */
app.listen(PORT, () => {
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});