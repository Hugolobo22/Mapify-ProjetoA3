// backend/src/index.js
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ========= "BANCO" EM MEMÓRIA =========
let users = []
let nextUserId = 1

let places = []
let nextPlaceId = 1

let resetTokens = [] // { token, userId, expiresAt }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-mapify'

// ========= E-MAIL (NODEMAILER) =========

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // se usar porta 465, mude para true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ========= FUNÇÕES AUXILIARES =========

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  )
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não informado' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

// ========= ROTAS DE AUTENTICAÇÃO =========

// Cadastro
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email e password são obrigatórios' })
    }

    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = {
      id: nextUserId++,
      name,
      email,
      passwordHash,
    }

    users.push(user)

    const token = generateToken(user)

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    })
  } catch (err) {
    console.error('ERRO NO REGISTER:', err)
    res.status(500).json({ error: 'Erro ao registrar usuário' })
  }
})

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'email e password são obrigatórios' })
    }

    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = generateToken(user)

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token,
    })
  } catch (err) {
    console.error('ERRO NO LOGIN:', err)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// ========= RECUPERAÇÃO DE SENHA =========

app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' })
    }

    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    // Resposta genérica mesmo se não achar
    if (!user) {
      console.log('[RECUPERAÇÃO] Pedido para email não cadastrado:', email)
      return res.json({
        message:
          'Se existir uma conta com este e-mail, enviamos instruções de recuperação.',
      })
    }

    // Validação rápida das variáveis de e-mail
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[RECUPERAÇÃO] SMTP não configurado corretamente no .env')
      return res.status(500).json({
        error: 'Servidor de e-mail não configurado',
        details: 'Verifique SMTP_HOST, SMTP_USER e SMTP_PASS no .env',
      })
    }

    // Gera token de reset
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 30 * 60 * 1000 // 30 min

    // Limpa tokens antigos desse usuário
    resetTokens = resetTokens.filter((t) => t.userId !== user.id)
    resetTokens.push({ token, userId: user.id, expiresAt })

    const resetLink = `http://localhost:5173/reset-password?token=${token}` 

    // Tentativa de envio de e-mail
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Mapify" <no-reply@mapify.local>',
        to: user.email,
        subject: 'Recuperação de senha - Mapify Turismo',
        text: `Olá, ${user.name}!\n\nRecebemos um pedido para redefinir sua senha no Mapify.\n\nUse o link abaixo para criar uma nova senha (válido por 30 minutos):\n\n${resetLink}\n\nSe você não fez este pedido, ignore este e-mail.`,
        html: `
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Recebemos um pedido para redefinir sua senha no <strong>Mapify Turismo</strong>.</p>
          <p>Use o botão abaixo para criar uma nova senha (o link é válido por 30 minutos):</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#2563eb;color:white;text-decoration:none;font-weight:bold;">
              Redefinir senha
            </a>
          </p>
          <p>Ou copie e cole este link no navegador:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Se você não fez este pedido, pode ignorar este e-mail.</p>
        `,
      })

      console.log('[RECUPERAÇÃO] E-mail de reset enviado para:', user.email)
    } catch (smtpErr) {
      console.error('[RECUPERAÇÃO] ERRO AO ENVIAR E-MAIL:', smtpErr)
      return res.status(500).json({
        error: 'Erro ao enviar e-mail de recuperação',
        details: smtpErr.message || 'Falha no servidor SMTP',
      })
    }

    return res.json({
      message:
        'Se existir uma conta com este e-mail, enviamos instruções de recuperação.',
    })
  } catch (err) {
    console.error('ERRO NO FORGOT PASSWORD (GERAL):', err)
    res.status(500).json({
      error: 'Erro ao solicitar recuperação de senha',
      details: err.message,
    })
  }
})

// Redefinir senha
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: 'token e password são obrigatórios' })
    }

    const entry = resetTokens.find((t) => t.token === token)

    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Token inválido ou expirado' })
    }

    const user = users.find((u) => u.id === entry.userId)
    if (!user) {
      return res.status(400).json({ error: 'Usuário não encontrado' })
    }

    const newHash = await bcrypt.hash(password, 10)
    user.passwordHash = newHash

    resetTokens = resetTokens.filter((t) => t.token !== token)

    return res.json({ message: 'Senha redefinida com sucesso.' })
  } catch (err) {
    console.error('ERRO NO RESET PASSWORD:', err)
    res.status(500).json({ error: 'Erro ao redefinir senha' })
  }
})

// ========= ROTAS PÚBLICAS =========

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    totalUsers: users.length,
    totalPlaces: places.length,
  })
})

// ========= ROTAS DE PLACES =========

app.get('/places', authMiddleware, (req, res) => {
  res.json(places)
})

app.post('/places', authMiddleware, (req, res) => {
  const { name, type, address, lat, lon, description, imageUrl } = req.body

  if (!name || lat == null || lon == null) {
    return res.status(400).json({ error: 'name, lat e lon são obrigatórios' })
  }

  const place = {
    id: nextPlaceId++,
    name,
    type: type || null,
    address: address || null,
    lat,
    lon,
    description: description || null,
    imageUrl: imageUrl || null,
    created_at: new Date().toISOString(),
    created_by: req.user.id,
  }

  places.push(place)
  res.status(201).json(place)
})

app.put('/places/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const idx = places.findIndex((p) => p.id === id)
  if (idx === -1) {
    return res.status(404).json({ error: 'Lugar não encontrado' })
  }

  const { name, type, address, lat, lon, description, imageUrl } = req.body

  places[idx] = {
    ...places[idx],
    name: name ?? places[idx].name,
    type: type ?? places[idx].type,
    address: address ?? places[idx].address,
    lat: lat ?? places[idx].lat,
    lon: lon ?? places[idx].lon,
    description: description ?? places[idx].description,
    imageUrl: imageUrl ?? places[idx].imageUrl,
  }

  res.json(places[idx])
})

app.delete('/places/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const exists = places.some((p) => p.id === id)
  if (!exists) {
    return res.status(404).json({ error: 'Lugar não encontrado' })
  }

  places = places.filter((p) => p.id !== id)
  res.status(204).send()
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT} (auth em memória, sem banco)`)
})
