/* ============================================================
   script.js — AgroSmart | Programa Agrinho 2026
   Contém: Menu responsivo, API do clima, calculadoras,
           rotação de culturas, animações de scroll
============================================================ */

/* ============================================================
   1. NAVBAR — scroll e menu hambúrguer
============================================================ */
const navbar   = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

// Adiciona a classe .scrolled ao navbar após 50px de scroll
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// Cria o menu mobile dinamicamente
const mobileMenu = document.createElement('div');
mobileMenu.id = 'mobileMenu';
mobileMenu.className = 'mobile-menu';
const mobileItems = [
  ['Início','#home'],['Clima','#weather'],['Água','#water'],
  ['Rotação','#rotation'],['Culturas','#cultures'],
  ['Sustentabilidade','#sustainability'],['Contato','#contact']
];
mobileItems.forEach(([label, href]) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.onclick = () => { scrollTo(href); closeMenu(); };
  mobileMenu.appendChild(btn);
});
navbar.appendChild(mobileMenu);

// Abre/fecha o menu mobile
function toggleMenu() {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
}
function closeMenu() {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
}

// Fecha o menu ao clicar fora dele
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) closeMenu();
});

/* ============================================================
   2. SCROLL SUAVE
============================================================ */
function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   3. PREVISÃO DO TEMPO — Open-Meteo (gratuito, sem API key)
============================================================ */

// Converte código WMO → emoji + descrição
function getWeatherInfo(code) {
  if (code === 0)                          return { emoji: '☀️',  desc: 'Céu limpo' };
  if ([1,2,3].includes(code))              return { emoji: '⛅',  desc: 'Parcialmente nublado' };
  if ([45,48].includes(code))              return { emoji: '🌫️', desc: 'Nevoeiro' };
  if ([51,53,55,61,63,65].includes(code)) return { emoji: '🌧️', desc: 'Chuva' };
  if ([71,73,75].includes(code))           return { emoji: '❄️',  desc: 'Neve' };
  if ([95,96,99].includes(code))           return { emoji: '⛈️', desc: 'Tempestade' };
  return { emoji: '🌤️', desc: 'Variável' };
}

function getFarmTip(temp, humidity, wind) {
  if (humidity > 80) return '💡 Umidade alta — fique atento a doenças fúngicas nas plantações.';
  if (temp > 35)     return '💡 Temperatura elevada — irrigue as culturas preferencialmente no início da manhã.';
  if (wind > 25)     return '💡 Ventos fortes — evite pulverização de defensivos hoje.';
  return '💡 Condições favoráveis para atividades no campo.';
}

function estimateVisibility(code, humidity) {
  if ([45,48].includes(code))              return '< 1 km';
  if ([95,96,99].includes(code))           return '< 2 km';
  if ([51,53,55,61,63,65].includes(code)) return '2 – 5 km';
  if (humidity > 85)                       return '5 – 8 km';
  if ([1,2,3].includes(code))              return '8 – 15 km';
  return '> 15 km';
}

async function fetchWeatherByCoords(lat, lon, label) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,weather_code&timezone=auto`
  );
  if (!res.ok) throw new Error('Erro ao buscar clima');
  const data = await res.json();
  const c = data.current;
  return {
    label,
    temp:      c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity:  c.relative_humidity_2m,
    wind:      c.wind_speed_10m,
    code:      c.weather_code,
  };
}

async function fetchWeather(cityOverride) {
  const cityInput = document.getElementById('cityInput');
  const errorEl   = document.getElementById('weatherError');
  const resultEl  = document.getElementById('weatherResult');
  const quickEl   = document.getElementById('weatherQuick');
  const name = cityOverride || cityInput.value.trim();
  if (!name) return;

  errorEl.style.display  = 'none';
  resultEl.style.display = 'none';

  const btn = document.querySelector('.weather-search .btn');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Buscando...';
  btn.disabled = true;

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=pt&format=json`
    );
    if (!geoRes.ok) throw new Error('Erro no geocoding');
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      errorEl.textContent   = '❌ Cidade não encontrada. Verifique o nome e tente novamente.';
      errorEl.style.display = 'block';
      return;
    }

    const place = geoData.results[0];
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    const w = await fetchWeatherByCoords(place.latitude, place.longitude, label);
    const info = getWeatherInfo(w.code);

    document.getElementById('weatherCity').textContent     = w.label;
    document.getElementById('weatherDesc').textContent     = info.desc;
    document.getElementById('weatherIcon').textContent     = info.emoji;
    document.getElementById('weatherTemp').textContent     = `${Math.round(w.temp)}°`;
    document.getElementById('weatherFeels').textContent    = `${Math.round(w.feelsLike)}°C`;
    document.getElementById('weatherHumidity').textContent = `${w.humidity}%`;
    document.getElementById('weatherWind').textContent     = `${w.wind.toFixed(1)} km/h`;
    document.getElementById('weatherVis').textContent      = estimateVisibility(w.code, w.humidity);
    document.getElementById('weatherTip').textContent      = getFarmTip(w.temp, w.humidity, w.wind);

    resultEl.style.display = 'block';
    quickEl.style.display  = 'none';
    resultEl.style.opacity   = '0';
    resultEl.style.transform = 'scale(0.96)';
    resultEl.style.transition = 'all 0.4s';
    setTimeout(() => { resultEl.style.opacity = '1'; resultEl.style.transform = 'scale(1)'; }, 10);
  } catch {
    errorEl.textContent   = '❌ Não foi possível obter os dados do clima. Tente novamente.';
    errorEl.style.display = 'block';
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// Botão GPS (localização atual)
function fetchByGPS() {
  if (!navigator.geolocation) {
    const errorEl = document.getElementById('weatherError');
    errorEl.textContent   = '📍 GPS não suportado neste navegador. Pesquise uma cidade manualmente.';
    errorEl.style.display = 'block';
    return;
  }
  const btn = document.getElementById('gpsBtn');
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt`
        );
        if (!geoRes.ok) throw new Error('Erro geocoding reverso');
        const geoData = await geoRes.json();
        const label = [
          geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Sua localização',
          geoData.address?.state, geoData.address?.country,
        ].filter(Boolean).join(', ');
        const w = await fetchWeatherByCoords(latitude, longitude, label);
        const info = getWeatherInfo(w.code);
        document.getElementById('cityInput').value             = label;
        document.getElementById('weatherCity').textContent     = w.label;
        document.getElementById('weatherDesc').textContent     = info.desc;
        document.getElementById('weatherIcon').textContent     = info.emoji;
        document.getElementById('weatherTemp').textContent     = `${Math.round(w.temp)}°`;
        document.getElementById('weatherFeels').textContent    = `${Math.round(w.feelsLike)}°C`;
        document.getElementById('weatherHumidity').textContent = `${w.humidity}%`;
        document.getElementById('weatherWind').textContent     = `${w.wind.toFixed(1)} km/h`;
        document.getElementById('weatherVis').textContent      = estimateVisibility(w.code, w.humidity);
        document.getElementById('weatherTip').textContent      = getFarmTip(w.temp, w.humidity, w.wind);
        document.getElementById('weatherResult').style.display = 'block';
        document.getElementById('weatherQuick').style.display  = 'none';
      } catch {
        const errorEl = document.getElementById('weatherError');
        errorEl.textContent   = '❌ Não foi possível obter os dados do clima. Tente novamente.';
        errorEl.style.display = 'block';
      } finally {
        if (btn) { btn.textContent = '📍'; btn.disabled = false; }
      }
    },
    () => {
      const errorEl = document.getElementById('weatherError');
      errorEl.textContent   = '📍 Não foi possível acessar sua localização. Pesquise uma cidade manualmente.';
      errorEl.style.display = 'block';
      if (btn) { btn.textContent = '📍'; btn.disabled = false; }
    }
  );
}

function quickCity(name) {
  document.getElementById('cityInput').value = name;
  fetchWeather(name);
}

/* ============================================================
   REGIÕES — cidades rápidas
============================================================ */
const REGION_CITIES = {
  'Norte': ['Rio Branco','Manaus','Belém','Porto Velho','Boa Vista','Macapá','Palmas'],
  'Nordeste': ['Salvador','Fortaleza','Recife','João Pessoa','Natal','Maceió','Aracaju','São Luís','Teresina'],
  'Centro-Oeste': ['Brasília','Goiânia','Cuiabá','Campo Grande'],
  'Sudeste': ['São Paulo','Rio de Janeiro','Belo Horizonte','Vitória'],
  'Sul': ['Curitiba','Florianópolis','Porto Alegre','Campos Novos'],
};

function showRegion(region, btn) {
  // Atualiza tab ativa
  document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  // Preenche as cidades
  const container = document.getElementById('regionCities');
  container.innerHTML = '';
  REGION_CITIES[region].forEach(city => {
    const b = document.createElement('button');
    b.textContent = city;
    b.onclick = () => quickCity(city);
    container.appendChild(b);
  });
}

/* ============================================================
   4. CALCULADORA DE ÁGUA (IRRIGAÇÃO)
============================================================ */
const CROP_DATA = {
  milho:     { liters: 5,   tip: '💡 Irrigação por gotejamento é ideal para milho.' },
  soja:      { liters: 4.5, tip: '💡 Soja precisa de mais água na fase de floração.' },
  arroz:     { liters: 9,   tip: '💡 Arroz irrigado demanda manejo cuidadoso da lâmina d'água.' },
  feijao:    { liters: 4,   tip: '💡 Feijão é sensível ao estresse hídrico na floração.' },
  cafe:      { liters: 6,   tip: '💡 Irrigação por gotejamento reduz o consumo em até 30%.' },
  cana:      { liters: 7,   tip: '💡 Cana tolera períodos curtos de seca, mas responde bem à irrigação.' },
  hortalicas:{ liters: 8,   tip: '💡 Hortaliças precisam de irrigação frequente e uniforme.' },
};

function calculateWater() {
  const crop  = document.getElementById('cropSelect').value;
  const area  = parseFloat(document.getElementById('areaInput').value);
  const result = document.getElementById('waterResult');

  if (!crop || !area || area <= 0) return;

  const data  = CROP_DATA[crop];
  const daily   = data.liters * area * 1000;        // litros/dia
  const monthly = daily * 30;                        // litros/mês

  // Formata número em PT-BR
  const fmt = (n) => n.toLocaleString('pt-BR');

  document.getElementById('dailyWater').textContent   = `${fmt(daily)} L`;
  document.getElementById('monthlyWater').textContent = `${fmt(monthly)} L`;
  document.getElementById('waterTip').textContent     = data.tip;

  result.style.display = 'block';

  // Animação de entrada
  result.style.opacity = '0';
  result.style.transform = 'translateY(16px)';
  result.style.transition = 'all 0.4s';
  setTimeout(() => {
    result.style.opacity = '1';
    result.style.transform = 'translateY(0)';
  }, 10);
}

/* ============================================================
   5. ROTAÇÃO DE CULTURAS
============================================================ */
const ROTATION_DATA = {
  milho: {
    name: 'Milho',
    sequence: ['Milho', 'Soja', 'Aveia/Trigo', 'Feijão'],
    period: 'Safra principal: outubro a março',
    benefits: [
      'Fixa nitrogênio com a soja na rotação',
      'Reduz nematoides e pragas do solo',
      'Melhora a estrutura do solo com gramíneas',
    ],
  },
  soja: {
    name: 'Soja',
    sequence: ['Soja', 'Milho Safrinha', 'Trigo', 'Soja'],
    period: 'Safra principal: setembro a fevereiro',
    benefits: [
      'Diversifica as fontes de renda',
      'Aproveita o nitrogênio fixado pela soja',
      'Controle natural de plantas daninhas',
    ],
  },
  cafe: {
    name: 'Café',
    sequence: ['Café', 'Feijão (entrelinhas)', 'Adubo Verde', 'Café'],
    period: 'Perene — manejo durante todo o ano',
    benefits: [
      'Proteção do solo entre as linhas de plantio',
      'Fixação de nitrogênio com leguminosas',
      'Controle de erosão e melhoria da fertilidade',
    ],
  },
  hortalicas: {
    name: 'Hortaliças',
    sequence: ['Folhosas', 'Raízes', 'Leguminosas', 'Frutos'],
    period: 'Rotação a cada 2-3 meses',
    benefits: [
      'Reduz doenças do solo especializadas',
      'Equilibra a retirada de nutrientes',
      'Diversifica a produção e a renda',
    ],
  },
};

function showRotation() {
  const key = document.getElementById('rotationSelect').value;
  const resultEl      = document.getElementById('rotationResult');
  const placeholderEl = document.getElementById('rotationPlaceholder');

  if (!key) {
    resultEl.style.display      = 'none';
    placeholderEl.style.display = 'flex';
    return;
  }

  const data = ROTATION_DATA[key];

  document.getElementById('rotationTitle').textContent  = `Rotação para ${data.name}`;
  document.getElementById('rotationPeriod').textContent = data.period;

  // Sequência com setas
  const seqEl = document.getElementById('rotationSequence');
  seqEl.innerHTML = '';
  data.sequence.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = `rot-step ${i === 0 ? 'active' : 'next'}`;
    div.textContent = step;
    seqEl.appendChild(div);
    if (i < data.sequence.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'rot-arrow';
      arrow.textContent = '→';
      seqEl.appendChild(arrow);
    }
  });

  // Benefícios
  const benEl = document.getElementById('rotationBenefits');
  benEl.innerHTML = '';
  data.benefits.forEach(b => {
    const div = document.createElement('div');
    div.className = 'rot-benefit';
    div.textContent = b;
    benEl.appendChild(div);
  });

  placeholderEl.style.display = 'none';
  resultEl.style.display      = 'block';

  // Animação
  resultEl.style.opacity   = '0';
  resultEl.style.transform = 'translateY(16px)';
  resultEl.style.transition = 'all 0.4s';
  setTimeout(() => {
    resultEl.style.opacity   = '1';
    resultEl.style.transform = 'translateY(0)';
  }, 10);
}

/* ============================================================
   6. FORMULÁRIO DE CONTATO
============================================================ */
function submitForm(e) {
  e.preventDefault();
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  const errorEl = document.getElementById('formError');

  const name    = document.getElementById('contactName').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  // Validação
  if (errorEl) errorEl.style.display = 'none';

  if (!name) {
    if (errorEl) { errorEl.textContent = '❌ Por favor, informe seu nome.'; errorEl.style.display = 'block'; }
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    if (errorEl) { errorEl.textContent = '❌ Por favor, informe um e-mail válido.'; errorEl.style.display = 'block'; }
    return;
  }
  if (!message) {
    if (errorEl) { errorEl.textContent = '❌ Por favor, escreva uma mensagem.'; errorEl.style.display = 'block'; }
    return;
  }

  form.style.display    = 'none';
  success.style.display = 'flex';

  // Reseta após 4 segundos
  setTimeout(() => {
    document.getElementById('contactName').value    = '';
    document.getElementById('contactEmail').value   = '';
    document.getElementById('contactSubject').value = '';
    document.getElementById('contactMessage').value = '';
    success.style.display = 'none';
    form.style.display    = 'block';
  }, 4000);
}

/* ============================================================
   7. ANIMAÇÕES DE SCROLL (Intersection Observer)
   Observa: .fade-in, .fade-in-left, .fade-in-right
============================================================ */
const fadeEls = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // anima apenas uma vez
      }
    });
  },
  { threshold: 0.15 }
);
fadeEls.forEach(el => observer.observe(el));