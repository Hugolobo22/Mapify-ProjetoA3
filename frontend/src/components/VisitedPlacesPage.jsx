// src/components/VisitedPlacesPage.jsx
import React from 'react'

export default function VisitedPlacesPage({
  places = [],
  visitedPlaces = [],
  onBack,
}) {
  // monta a lista de lugares completos a partir dos IDs visitados
  const visitedList = places.filter((p) => visitedPlaces.includes(p.id))

  // função simples pra definir "categoria" visual (cor do pin)
  function getCategory(place) {
    const kinds = (place.kinds || place.type || '').toString().toLowerCase()

    if (kinds.includes('restaurant') || kinds.includes('restaurante')) {
      return 'restaurant' // PIN verde (restaurante)
    }
    if (
      kinds.includes('shopping') ||
      kinds.includes('loja') ||
      kinds.includes('store') ||
      kinds.includes('commerce') ||
      kinds.includes('compras')
    ) {
      return 'commerce' // PIN vermelho (comércio)
    }
    return 'tourism' // PIN azul (ponto turístico)
  }

  const categoryLabel = {
    tourism: 'Ponto turístico',
    restaurant: 'Restaurante',
    commerce: 'Comércio',
  }

  return (
    <div className="visited-page">
      <header className="visited-header">
        <h1 className="visited-title">Pontos turísticos visitados</h1>
        <button className="visited-back-btn" onClick={onBack}>
          ← Voltar para o perfil
        </button>
      </header>

      <main className="visited-main">
        <section className="visited-card-wrap">
          {visitedList.length === 0 && (
            <p className="visited-empty">
              Você ainda não marcou nenhum local como cartão postal.
              <br />
              Abra um ponto no mapa e use o botão <b>“Marcar como cartão postal”</b>.
            </p>
          )}

          <div className="visited-grid">
            {visitedList.map((place) => {
              const cat = getCategory(place)
              const label = categoryLabel[cat]

              return (
                <article key={place.id} className="visited-card">
                  <div className="visited-card-header">
                    <div className="visited-pin-wrapper">
                      <span className={`visited-pin visited-pin--${cat}`} />
                    </div>
                    <div className="visited-card-title">
                      <h2>{place.name}</h2>
                      {place.address && (
                        <p className="visited-card-address">{place.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="visited-card-body">
                    <span className={`visited-tag visited-tag--${cat}`}>
                      {label}
                    </span>

                    {place.dist != null && (
                      <span className="visited-distance">
                        Aproximadamente {Math.round(place.dist)} m de distância
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
