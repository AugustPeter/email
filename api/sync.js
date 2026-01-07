// Vercel Serverless Function - Sincronização de Notas
const { MongoClient } = require('mongodb');

// Configuração do MongoDB (usar MongoDB Atlas - gratuito)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://usuario:senha@cluster.mongodb.net/notas?retryWrites=true&w=majority';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }

    try {
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        cachedClient = client;
        return client;
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        throw error;
    }
}

function mergeNotes(localNotes, serverNotes) {
    const serverNotesMap = new Map(serverNotes.map(note => [note.id, note]));
    
    localNotes.forEach(localNote => {
        const serverNote = serverNotesMap.get(localNote.id);
        
        if (!serverNote) {
            serverNotesMap.set(localNote.id, localNote);
        } else {
            const localDate = new Date(localNote.updatedAt);
            const serverDate = new Date(serverNote.updatedAt);
            
            if (localDate > serverDate) {
                serverNotesMap.set(localNote.id, localNote);
            }
        }
    });
    
    return Array.from(serverNotesMap.values());
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { email, notes: localNotes } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'E-mail é obrigatório' });
        }

        // Conectar ao MongoDB
        const client = await connectToDatabase();
        const db = client.db('notasapp');
        const collection = db.collection('users');

        // Buscar notas do servidor
        const userData = await collection.findOne({ email });
        const serverNotes = userData ? userData.notes : [];

        // Mesclar notas
        const mergedNotes = mergeNotes(localNotes || [], serverNotes);

        // Salvar notas mescladas
        await collection.updateOne(
            { email },
            { 
                $set: { 
                    email,
                    notes: mergedNotes,
                    lastSync: new Date()
                } 
            },
            { upsert: true }
        );

        return res.status(200).json({
            success: true,
            notes: mergedNotes,
            message: 'Notas sincronizadas com sucesso'
        });

    } catch (error) {
        console.error('Erro na sincronização:', error);
        return res.status(500).json({ 
            error: 'Erro ao sincronizar notas',
            details: error.message 
        });
    }
};
