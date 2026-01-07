// Vercel Serverless Function - Envio de E-mail
const nodemailer = require('nodemailer');

function createEmailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

async function sendNotesEmail(userEmail, notes) {
    try {
        const transporter = createEmailTransporter();
        
        // Preparar anexos
        const attachments = notes.map(note => ({
            filename: `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
            content: `${note.title}\n${'='.repeat(note.title.length)}\n\n${note.content}\n\nCriado em: ${new Date(note.createdAt).toLocaleString('pt-BR')}\nAtualizado em: ${new Date(note.updatedAt).toLocaleString('pt-BR')}`
        }));
        
        // Preparar corpo do e-mail
        const emailBody = `
            <h1>Suas Notas - Backup</h1>
            <p>Olá! Aqui está o backup das suas ${notes.length} nota(s):</p>
            <hr>
            ${notes.map(note => `
                <div style="margin-bottom: 30px; padding: 15px; border-left: 4px solid #0078d4; background-color: #f5f5f5;">
                    <h2 style="margin-top: 0;">${escapeHtml(note.title)}</h2>
                    <p style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(note.content)}</p>
                    <p style="font-size: 0.85em; color: #666;">
                        Criado: ${new Date(note.createdAt).toLocaleString('pt-BR')} | 
                        Atualizado: ${new Date(note.updatedAt).toLocaleString('pt-BR')}
                    </p>
                </div>
            `).join('')}
            <hr>
            <p style="font-size: 0.9em; color: #666;">
                Este é um backup automático das suas notas. 
                Os arquivos .txt em anexo podem ser importados de volta no aplicativo.
            </p>
        `;
        
        // Enviar e-mail
        await transporter.sendMail({
            from: `"Notas App" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Backup das suas Notas - ${new Date().toLocaleDateString('pt-BR')}`,
            html: emailBody,
            attachments: attachments
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        throw error;
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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
        const { email, notes } = req.body;
        
        if (!email || !notes) {
            return res.status(400).json({ error: 'E-mail e notas são obrigatórios' });
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(500).json({ 
                error: 'Configuração de e-mail não disponível',
                message: 'Configure as variáveis de ambiente EMAIL_USER e EMAIL_PASS no Vercel'
            });
        }

        await sendNotesEmail(email, notes);

        return res.status(200).json({
            success: true,
            message: 'E-mail enviado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return res.status(500).json({ 
            error: 'Erro ao enviar e-mail',
            details: error.message 
        });
    }
};
