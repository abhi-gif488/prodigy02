// API Configuration
const API_KEY = '32500b5a1520afa9375da043817361b6'; // Get your free API key from https://openweathermap.org/api
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const errorText = document.getElementById('errorText');
const weatherCard = document.getElementById('weatherCard');
const recentSection = document.getElementById('recentSection');
const recentList = document.getElementById('recentList');

// Weather data elements
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const currentTime = document.getElementById('currentTime');
const weatherIcon = document.getElementById('weatherIcon');
const temp = document.getElementById('temp');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const clouds = document.getElementById('clouds');
const windDir = document.getElementById('windDir');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const forecastContainer = document.getElementById('forecast');
const lastUpdate = document.getElementById('lastUpdate');

// State
let currentUnit = 'C';
let currentTempCelsius = 0;
let currentFeelsLikeCelsius = 0;
let recentSearches = JSON.parse(localStorage.getItem('recentWeatherSearches')) || [];

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeatherByCity(city);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherByCity(city);
        }
    }
});

locationBtn.addEventListener('click', getCurrentLocationWeather);

// Unit toggle buttons
const unitBtns = document.querySelectorAll('.unit-btn');
unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUnit = btn.dataset.unit;
        updateTemperatureDisplay();
    });
});

// Get weather by city name
async function getWeatherByCity(city) {
    showLoading();
    hideError();
    
    try {
        // Get current weather
        const currentWeatherUrl = `${API_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const currentResponse = await fetch(currentWeatherUrl);
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        // Get forecast
        const forecastUrl = `${API_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        
        displayWeather(currentData, forecastData);
        addToRecentSearches(city);
        
    } catch (err) {
        showError('City not found. Please check the spelling and try again.');
    } finally {
        hideLoading();
    }
}

// Get weather by coordinates
async function getWeatherByCoords(lat, lon) {
    showLoading();
    hideError();
    
    try {
        // Get current weather
        const currentWeatherUrl = `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const currentResponse = await fetch(currentWeatherUrl);
        const currentData = await currentResponse.json();
        
        // Get forecast
        const forecastUrl = `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();
        
        displayWeather(currentData, forecastData);
        addToRecentSearches(currentData.name);
        
    } catch (err) {
        showError('Unable to fetch weather data. Please try again.');
    } finally {
        hideLoading();
    }
}

// Get current location weather
function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                getWeatherByCoords(latitude, longitude);
            },
            (error) => {
                showError('Unable to get your location. Please enter a city name.');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser.');
    }
}

// Display weather data
function displayWeather(current, forecast) {
    // Store current temps for unit conversion
    currentTempCelsius = current.main.temp;
    currentFeelsLikeCelsius = current.main.feels_like;
    
    // Location and time
    cityName.textContent = `${current.name}, ${current.sys.country}`;
    updateDateTime();
    
    // Main weather
    weatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
    weatherIcon.alt = current.weather[0].description;
    description.textContent = current.weather[0].description;
    
    // Temperature
    updateTemperatureDisplay();
    
    // Details
    humidity.textContent = `${current.main.humidity}%`;
    windSpeed.textContent = `${current.wind.speed} m/s`;
    pressure.textContent = `${current.main.pressure} hPa`;
    visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    clouds.textContent = `${current.clouds.all}%`;
    windDir.textContent = getWindDirection(current.wind.deg);
    
    // Sun times
    sunrise.textContent = formatTime(current.sys.sunrise);
    sunset.textContent = formatTime(current.sys.sunset);
    
    // Display forecast
    displayForecast(forecast);
    
    // Update last update time
    lastUpdate.textContent = new Date().toLocaleTimeString();
    
    // Show weather card
    weatherCard.classList.remove('hidden');
}

// Display 5-day forecast
function displayForecast(data) {
    forecastContainer.innerHTML = '';
    
    // Get one forecast per day at 12:00
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    dailyForecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="day">${dayName}</div>
            <div class="date">${dateStr}</div>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}">
            <div class="temp">${Math.round(day.main.temp)}°C</div>
            <div class="desc">${day.weather[0].description}</div>
        `;
        forecastContainer.appendChild(forecastItem);
    });
}

// Update temperature display based on selected unit
function updateTemperatureDisplay() {
    if (currentUnit === 'C') {
        temp.textContent = Math.round(currentTempCelsius);
        feelsLike.textContent = Math.round(currentFeelsLikeCelsius);
    } else {
        temp.textContent = Math.round(celsiusToFahrenheit(currentTempCelsius));
        feelsLike.textContent = Math.round(celsiusToFahrenheit(currentFeelsLikeCelsius));
    }
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Get wind direction from degrees
function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Format Unix timestamp to time
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    currentDate.textContent = now.toLocaleDateString('en-US', dateOptions);
    
    const timeOptions = { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    };
    currentTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Recent searches management
function addToRecentSearches(city) {
    // Remove duplicates
    recentSearches = recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    recentSearches.unshift(city);
    
    // Keep only 5 recent searches
    recentSearches = recentSearches.slice(0, 5);
    
    // Save to localStorage
    localStorage.setItem('recentWeatherSearches', JSON.stringify(recentSearches));
    
    // Display recent searches
    displayRecentSearches();
}

function displayRecentSearches() {
    if (recentSearches.length === 0) {
        recentSection.classList.add('hidden');
        return;
    }
    
    recentSection.classList.remove('hidden');
    recentList.innerHTML = '';
    
    recentSearches.forEach(city => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <span>${city}</span>
        `;
        item.addEventListener('click', () => {
            cityInput.value = city;
            getWeatherByCity(city);
        });
        recentList.appendChild(item);
    });
}

// UI helper functions
function showLoading() {
    loading.classList.remove('hidden');
    weatherCard.classList.add('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    errorText.textContent = message;
    error.classList.remove('hidden');
    weatherCard.classList.add('hidden');
}

function hideError() {
    error.classList.add('hidden');
}

// Initialize app
function init() {
    // Display recent searches
    displayRecentSearches();
    
    // Get weather for default city or user's location
    // Uncomment one of the following:
    
    // Option 1: Load default city
    // getWeatherByCity('London');
    
    // Option 2: Try to get user's location
    // getCurrentLocationWeather();
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        cityInput.focus();
    }
});

// Demo mode with sample data (when API key is not set)
function loadDemoData() {
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('%c⚠️ API Key Not Set', 'color: orange; font-size: 16px; font-weight: bold;');
        console.log('%cTo use this weather app:', 'color: blue; font-size: 14px;');
        console.log('1. Get a free API key from https://openweathermap.org/api');
        console.log('2. Replace YOUR_API_KEY_HERE in the JavaScript file');
        console.log('3. Refresh the page');
        
        showError('Please add your OpenWeatherMap API key to use this app. Check the browser console for instructions.');
    }
}

// Initialize the app
init();
loadDemoData();

// Log helpful info
console.log('🌤️ Weather App Initialized');
console.log('💡 Tip: Press Ctrl+K to focus the search box');
console.log('💡 Tip: Click "Use My Location" for local weather');
