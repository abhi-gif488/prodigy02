
    const API_KEY   = '32500b5a1520afa9375da043817361b6';
    const BASE_URL  = 'https://api.openweathermap.org/data/2.5';

    // State
    let currentUnit = 'C';
    let tempC = 0, feelsC = 0;
    let forecastData = [];   // [{tempC, desc, icon, day, date}]
    let recentSearches = [];

    // Load recent from localStorage (with fallback)
    try { recentSearches = JSON.parse(localStorage.getItem('wxLensRecent')) || []; } catch(e) { recentSearches = []; }

    // DOM
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

    // ── EVENTS ──────────────────────────────────────────

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

    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            cityInput.focus();
        }
    });

    // ── CORE ─────────────────────────────────────────────

    function doSearch() {
        const city = cityInput.value.trim();
        if (!city) { cityInput.focus(); return; }
        fetchByCity(city);
    }

    function doLocation() {
        if (!navigator.geolocation) {
            showError('Geolocation is not supported by your browser.');
            return;
        }
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location…';
        navigator.geolocation.getCurrentPosition(
            pos => {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Use My Location';
                fetchByCoords(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Use My Location';
                const msgs = {
                    1: 'Location access denied. Please enable it in your browser settings.',
                    2: 'Unable to determine your position. Try searching manually.',
                    3: 'Location request timed out. Try searching manually.'
                };
                showError(msgs[err.code] || 'Unable to get your location.');
            },
            { timeout: 10000 }
        );
    }

    async function fetchByCity(city) {
        showLoading();
        try {
            const [cur, fore] = await Promise.all([
                apiFetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
                apiFetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
            ]);
            renderWeather(cur, fore);
            saveRecent(cur.name + ', ' + cur.sys.country);
        } catch(err) {
            showError(err.message || 'City not found. Check the spelling and try again.');
        } finally {
            hideLoading();
        }
    }

    async function fetchByCoords(lat, lon) {
        showLoading();
        try {
            const [cur, fore] = await Promise.all([
                apiFetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
                apiFetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
            ]);
            renderWeather(cur, fore);
            saveRecent(cur.name + ', ' + cur.sys.country);
        } catch(err) {
            showError(err.message || 'Unable to fetch weather. Try again.');
        } finally {
            hideLoading();
        }
    }

    async function apiFetch(url) {
        const res = await fetch(url);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `HTTP ${res.status}`);
        }
        return res.json();
    }

    // ── RENDER ───────────────────────────────────────────

    function renderWeather(cur, fore) {
        hideError();

        // Store temps
        tempC  = cur.main.temp;
        feelsC = cur.main.feels_like;

        // Location & time
        $('cityName').textContent = `${cur.name}, ${cur.sys.country}`;
        updateDateTime();

        // Icon & description
        const icon = cur.weather[0].icon;
        $('weatherIcon').src = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        $('weatherIcon').alt = cur.weather[0].description;
        $('description').textContent = cur.weather[0].description;

        // Details
        $('humidity').textContent   = `${cur.main.humidity}%`;
        $('windSpeed').textContent  = `${(cur.wind.speed * 3.6).toFixed(1)} km/h`;
        $('pressure').textContent   = `${cur.main.pressure} hPa`;
        $('visibility').textContent = `${(cur.visibility / 1000).toFixed(1)} km`;
        $('clouds').textContent     = `${cur.clouds.all}%`;
        $('windDir').textContent    = windDeg(cur.wind.deg);
        $('sunrise').textContent    = fmtTime(cur.sys.sunrise);
        $('sunset').textContent     = fmtTime(cur.sys.sunset);

        // Build forecast store
        forecastData = fore.list
            .filter(i => i.dt_txt.includes('12:00:00'))
            .slice(0, 5)
            .map(i => {
                const d = new Date(i.dt * 1000);
                return {
                    tempC: i.main.temp,
                    minC:  i.main.temp_min,
                    maxC:  i.main.temp_max,
                    desc:  i.weather[0].description,
                    icon:  i.weather[0].icon,
                    day:   d.toLocaleDateString('en-US', { weekday:'short' }),
                    date:  d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
                };
            });

        refreshTemps();

        $('lastUpdate').textContent = new Date().toLocaleTimeString();
        weatherCardEl.classList.remove('hidden');

        // Adapt background based on weather id
        adaptBackground(cur.weather[0].id, icon);
    }

    function refreshTemps() {
        const conv = v => currentUnit === 'C' ? Math.round(v) : Math.round(v * 9/5 + 32);
        $('tempVal').textContent    = conv(tempC);
        $('feelsLike').textContent  = conv(feelsC);

        // Rebuild forecast
        const grid = $('forecastGrid');
        grid.innerHTML = '';
        forecastData.forEach(f => {
            const t = conv(f.tempC);
            const el = document.createElement('div');
            el.className = 'forecast-item';
            el.innerHTML = `
                <div class="f-day">${f.day}</div>
                <div class="f-date">${f.date}</div>
                <img src="https://openweathermap.org/img/wn/${f.icon}@2x.png" alt="${f.desc}" loading="lazy">
                <div class="f-temp">${t}°${currentUnit}</div>
                <div class="f-desc">${f.desc}</div>
            `;
            grid.appendChild(el);
        });
    }

    // ── RECENT SEARCHES ──────────────────────────────────

    function saveRecent(label) {
        recentSearches = recentSearches.filter(s => s.toLowerCase() !== label.toLowerCase());
        recentSearches.unshift(label);
        recentSearches = recentSearches.slice(0, 6);
        try { localStorage.setItem('wxLensRecent', JSON.stringify(recentSearches)); } catch(e) {}
        renderRecent();
    }

    function renderRecent() {
        if (!recentSearches.length) { recentSec.classList.add('hidden'); return; }
        recentSec.classList.remove('hidden');
        recentListEl.innerHTML = '';
        recentSearches.forEach(s => {
            const el = document.createElement('div');
            el.className = 'recent-item';
            el.innerHTML = `<i class="fas fa-location-dot"></i><span>${s}</span>`;
            el.addEventListener('click', () => {
                cityInput.value = s;
                fetchByCity(s);
            });
            recentListEl.appendChild(el);
        });
    }

    // ── TIME ─────────────────────────────────────────────

    function updateDateTime() {
        const now = new Date();
        $('currentDate').textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'short', day:'numeric' });
        $('currentTime').textContent = now.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true });
    }

    setInterval(() => {
        if (!weatherCardEl.classList.contains('hidden')) updateDateTime();
    }, 30000);

    // ── UI HELPERS ───────────────────────────────────────

    function showLoading()  { loadingEl.classList.remove('hidden'); weatherCardEl.classList.add('hidden'); hideError(); }
    function hideLoading()  { loadingEl.classList.add('hidden'); }
    function showError(msg) { errorTextEl.textContent = msg; errorBoxEl.classList.remove('hidden'); }
    function hideError()    { errorBoxEl.classList.add('hidden'); }

    function fmtTime(unix) {
        return new Date(unix * 1000).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true });
    }

    function windDeg(deg) {
        const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
        return dirs[Math.round(deg / 22.5) % 16];
    }

    // Subtle background shift by weather type
    function adaptBackground(id, icon) {
        const isNight = icon.endsWith('n');
        let top, mid, low;
        if (id >= 200 && id < 300) { top='#0a0f1e'; mid='#1c2340'; low='#2c3565'; }        // thunderstorm
        else if (id >= 300 && id < 600) { top='#0d1b2e'; mid='#1a2e4a'; low='#2a4568'; }  // rain/drizzle
        else if (id >= 600 && id < 700) { top='#1a1f35'; mid='#2a3a5c'; low='#4a6080'; }  // snow
        else if (id >= 700 && id < 800) { top='#1a1a2e'; mid='#2d2d4e'; low='#4a4a70'; }  // fog/mist
        else if (id === 800) {
            top = isNight ? '#05091a' : '#0d1b3e';
            mid = isNight ? '#0d1636' : '#1a3a6e';
            low = isNight ? '#1a2855' : '#2d5fa8';
        } else {
            top = isNight ? '#07101f' : '#0e2040'; mid = isNight ? '#152040' : '#1e4070'; low = isNight ? '#22355a' : '#3a68b8';
        }
        document.documentElement.style.setProperty('--sky-top', top);
        document.documentElement.style.setProperty('--sky-mid', mid);
        document.documentElement.style.setProperty('--sky-low', low);
    }

    // ── INIT ─────────────────────────────────────────────
    renderRecent();
    console.log('%c🌤 WeatherLens ready', 'color:#60c8f5;font-size:14px;font-weight:bold');
    console.log('%c⌨  Ctrl+K → focus search', 'color:#a78bfa;font-size:12px');
