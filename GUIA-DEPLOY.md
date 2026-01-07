# GUIA RÁPIDO - DEPLOY NO VERCEL

## 📦 Passo a Passo Completo

### 1️⃣ Criar conta no MongoDB Atlas (Gratuito)

1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Clique em "Build a Database"
5. Escolha "FREE" (M0)
6. Selecione a região mais próxima (ex: São Paulo)
7. Clique em "Create"

**Configurar acesso:**
- Username: escolha um nome (ex: `notasapp`)
- Password: gere uma senha forte e **copie**
- IP Whitelist: adicione `0.0.0.0/0` (permite qualquer IP)
- Clique em "Finish and Close"

**Copiar string de conexão:**
- Clique em "Connect"
- Escolha "Connect your application"
- Copie a string (formato: `mongodb+srv://usuario:<password>@...`)
- Substitua `<password>` pela senha que você criou
- Adicione `/notasapp` antes do `?` (nome do banco)

Exemplo final:
```
mongodb+srv://notasapp:SuaSenha123@cluster0.xxxxx.mongodb.net/notasapp?retryWrites=true&w=majority
```

---

### 2️⃣ Obter senha de app do Gmail

1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login com sua conta Google
3. Nome do app: `Notas App`
4. Clique em "Gerar"
5. **Copie a senha** (16 caracteres sem espaços)

Exemplo: `abcd efgh ijkl mnop`

---

### 3️⃣ Deploy no Vercel

**Opção A: Pelo site (mais fácil)**

1. Acesse: https://vercel.com
2. Crie uma conta (pode usar GitHub)
3. Clique em "Add New..." → "Project"
4. Importe este repositório ou faça upload dos arquivos
5. Configure as variáveis de ambiente:

| Nome | Valor |
|------|-------|
| `MONGODB_URI` | Sua string de conexão do MongoDB |
| `EMAIL_USER` | Seu e-mail do Gmail completo |
| `EMAIL_PASS` | A senha de app gerada (16 caracteres) |

6. Clique em "Deploy"
7. Aguarde 1-2 minutos
8. **Pronto!** Seu app está no ar

**Opção B: Via linha de comando**

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel

# 4. Seguir prompts e configurar variáveis de ambiente
```

---

### 4️⃣ Configurar variáveis de ambiente no Vercel

Se você já fez o deploy, adicione as variáveis depois:

1. Vá no dashboard do Vercel
2. Selecione seu projeto
3. Clique em "Settings"
4. Clique em "Environment Variables"
5. Adicione uma por uma:

```
MONGODB_URI = mongodb+srv://usuario:senha@cluster.mongodb.net/notasapp?retryWrites=true&w=majority
EMAIL_USER = seu-email@gmail.com
EMAIL_PASS = abcdefghijklmnop
```

6. Clique em "Save"
7. Vá em "Deployments"
8. Clique nos "..." do último deployment
9. Clique em "Redeploy"

---

### 5️⃣ Testar o aplicativo

1. Acesse a URL fornecida pelo Vercel (ex: `https://seu-app.vercel.app`)
2. Digite seu e-mail e clique em "Entrar"
3. Crie uma nova nota
4. Teste o salvamento automático
5. Teste abrir em pop-up
6. Teste sincronização (🔄)

---

## ✅ Checklist

- [ ] MongoDB Atlas criado e configurado
- [ ] String de conexão copiada e testada
- [ ] Senha de app do Gmail gerada
- [ ] Conta no Vercel criada
- [ ] Projeto enviado ao Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] App testado e funcionando

---

## 🆘 Precisa de Ajuda?

### MongoDB não conecta
- Verifique se adicionou `0.0.0.0/0` no IP Whitelist
- Confirme que a senha está correta na string
- Adicione `/notasapp` antes do `?` na URL

### E-mails não enviam
- Confirme que está usando "Senha de app", não senha normal
- Verifique se tem 2FA ativado no Gmail (obrigatório)
- Remova espaços da senha de app

### Erro 500 no Vercel
- Veja os logs: Dashboard → seu projeto → Functions
- Verifique se todas as 3 variáveis estão configuradas
- Redeploy após adicionar variáveis

---

## 🎉 Sucesso!

Seu aplicativo de notas está online e pode ser acessado de qualquer lugar!

**Próximos passos:**
- Configure um domínio personalizado (opcional)
- Compartilhe com amigos
- Adicione novas funcionalidades

**URL do seu app:**
```
https://seu-projeto.vercel.app
```
