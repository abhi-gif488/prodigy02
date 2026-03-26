const API_KEY   = '32500b5a1520afa9375da043817361b6';
const BASE_URL  = 'https://api.openweathermap.org/data/2.5';

// State
let currentUnit = 'C';
let tempC = 0, feelsC = 0;
let forecastData = [];
let recentSearches = [];

try { recentSearches = JSON.parse(localStorage.getItem('wxLensRecent')) || []; } catch(e) { recentSearches = []; }

const $ = id => document.getElementById(id);
const cityInput     = $('cityInput');
const searchBtn     = $('searchBtn');
const locationBtn   = $('locationBtn');
const loadingEl     = $('loading');
const errorBoxEl    = $('errorBox');
const errorTextEl   = $('errorText');
const weatherCardEl = $('weatherCard');
const recentSec     = $('recentSection');
const recentListEl  = $('recentList');

searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
locationBtn.addEventListener('click', doLocation);

document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUnit = btn.dataset.unit;
        refreshTemps();
    });
});

function doSearch() {
    const city = cityInput.value.trim();
    if (!city) return;
    fetchByCity(city);
}

async function fetchByCity(city) {
    try {
        const res = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
        const data = await res.json();

        $('cityName').textContent = data.name;
        $('tempVal').textContent = Math.round(data.main.temp);
        $('description').textContent = data.weather[0].description;

        weatherCardEl.classList.remove('hidden');
    } catch(err) {
        console.error(err);
    }
}