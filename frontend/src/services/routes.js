export async function getRoute(latFrom, lonFrom, latTo, lonTo) {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ ORS API key não configurada");
    return null;
  }

  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${lonFrom},${latFrom}&end=${lonTo},${latTo}`;

  const res = await fetch(url);

  if (!res.ok) {
    console.error("Erro ao buscar rota:", await res.text());
    return null;
  }

  const data = await res.json();
  return data;
}
