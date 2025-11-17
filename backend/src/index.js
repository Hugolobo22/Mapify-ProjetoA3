// backend/src/index.js
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ========= "BANCO" EM MEMÓRIA =========
// usuários e lugares só existem enquanto o servidor está rodando
let users = []
let nextUserId = 1

let places = []
let nextPlaceId = 1

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-mapify'

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

// ========= ROTAS PÚBLICAS SIMPLES =========

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    totalUsers: users.length,
    totalPlaces: places.length,
  })
})

// ========= ROTAS DE PLACES (PROTEGIDAS) =========

// Listar lugares (somente logado)
app.get('/places', authMiddleware, (req, res) => {
  res.json(places)
})

// Criar lugar
app.post('/places', authMiddleware, (req, res) => {
  const { name, type, address, lat, lon } = req.body

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
    created_at: new Date().toISOString(),
    created_by: req.user.id,
  }

  places.push(place)
  res.status(201).json(place)
})

// Atualizar lugar
app.put('/places/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id)
  const idx = places.findIndex((p) => p.id === id)
  if (idx === -1) {
    return res.status(404).json({ error: 'Lugar não encontrado' })
  }

  const { name, type, address, lat, lon } = req.body

  places[idx] = {
    ...places[idx],
    name: name ?? places[idx].name,
    type: type ?? places[idx].type,
    address: address ?? places[idx].address,
    lat: lat ?? places[idx].lat,
    lon: lon ?? places[idx].lon,
  }

  res.json(places[idx])
})

// Remover lugar
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
