// backend/src/db.js
import dotenv from 'dotenv'
import pkg from 'pg'

dotenv.config()

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessário pro Supabase
  },
})

export default pool

// Devido à uma falha de conexão com o banco de dados devido ao Antivirús Kaspersky, tentamos resolver de algum jeito para conectá-lo porém não conseguimos à tempo.
// Utilizamos o BackEnd para armazenar dados fora do navegador (Arrays que armazenam enquanto a aplicação rodar) e para configurar rotas e Autenticação.