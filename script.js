const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-button');
const resultCard = document.getElementById('result-card');
const errorMessage = document.getElementById('error-message');
const locationName = document.getElementById('location-name');
const locationCoordinates = document.getElementById('location-coordinates');
const temperatureEl = document.getElementById('temperature');
const conditionEl = document.getElementById('condition');
const windSpeedEl = document.getElementById('wind-speed');
const humidityEl = document.getElementById('humidity');
const aqiEl = document.getElementById('aqi');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const forecastList = document.getElementById('forecast-list');

const weatherCodes = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  resultCard.classList.add('hidden');
}

function clearError() {
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}

function showResult() {
  errorMessage.classList.add('hidden');
  resultCard.classList.remove('hidden');
}

function formatHour(hourString) {
  const date = new Date(hourString);
  return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
}

async function lookupLocation(query) {
  const params = new URLSearchParams({
    name: query,
    count: '5',
    language: 'en',
    format: 'json',
  });

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!response.ok) throw new Error('Unable to find location.');

  const data = await response.json();
  if (!data.results || !data.results.length) {
    throw new Error('No results found for that place.');
  }

  return data.results[0];
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: 'temperature_2m,weathercode,relativehumidity_2m',
    daily: 'sunrise,sunset',
    current_weather: 'true',
    timezone: 'auto',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error('Unable to fetch weather data.');

  return response.json();
}

async function fetchAQI(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'european_aqi',
    timezone: 'auto',
  });

  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
  if (!response.ok) throw new Error('Unable to fetch AQI data.');

  return response.json();
}

function displayWeather(location, weatherData, aqiData) {
  console.log('Displaying weather data:', { weatherData, aqiData });
  if (!weatherData.current_weather || !weatherData.hourly || !Array.isArray(weatherData.hourly.time)) {
    throw new Error('Incomplete weather data received.');
  }

  locationName.textContent = `${location.name}, ${location.country}`;
  locationCoordinates.textContent = `Lat: ${location.latitude.toFixed(2)}, Lon: ${location.longitude.toFixed(2)}`;

  const current = weatherData.current_weather;
  temperatureEl.textContent = `${current.temperature.toFixed(1)}°C`;
  conditionEl.textContent = weatherCodes[current.weathercode] || 'Unknown';
  windSpeedEl.textContent = `${current.windspeed.toFixed(1)} km/h`;

  const nowIndex = weatherData.hourly.time.findIndex((time) => time === weatherData.current_weather.time);
  const humidityValue = nowIndex >= 0 ? weatherData.hourly.relativehumidity_2m[nowIndex] : null;
  humidityEl.textContent = humidityValue !== null ? `${humidityValue.toFixed(0)}%` : 'Not available';

  aqiEl.textContent = aqiData && aqiData.current && aqiData.current.european_aqi !== undefined ? aqiData.current.european_aqi : 'N/A';

  if (weatherData.daily && weatherData.daily.sunrise && weatherData.daily.sunrise[0]) {
    sunriseEl.textContent = new Date(weatherData.daily.sunrise[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } else {
    sunriseEl.textContent = 'N/A';
  }

  if (weatherData.daily && weatherData.daily.sunset && weatherData.daily.sunset[0]) {
    sunsetEl.textContent = new Date(weatherData.daily.sunset[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } else {
    sunsetEl.textContent = 'N/A';
  }

  forecastList.innerHTML = '';
  const forecastStart = nowIndex >= 0 ? nowIndex : 0;
  const nextHours = weatherData.hourly.time.slice(forecastStart, forecastStart + 8);

  nextHours.forEach((timeValue, index) => {
    const hourIndex = forecastStart + index;
    const tempValue = weatherData.hourly.temperature_2m[hourIndex];
    const weatherCode = weatherData.hourly.weathercode[hourIndex];
    const tempText = typeof tempValue === 'number' ? `${tempValue.toFixed(1)}°C` : 'N/A';
    const conditionText = typeof weatherCode === 'number' ? weatherCodes[weatherCode] || 'Unknown' : 'Unknown';
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <span class="hour">${formatHour(timeValue)}</span>
      <span class="temp">${tempText}</span>
      <span>${conditionText}</span>
    `;
    forecastList.appendChild(card);
  });

  showResult();
}

async function onSearch() {
  const query = cityInput.value.trim();
  if (!query) {
    showError('Please enter a city or place name.');
    return;
  }

  clearError();
  resultCard.classList.add('hidden');
  locationName.textContent = 'Loading...';

  try {
    const location = await lookupLocation(query);
    const [weatherData, aqiData] = await Promise.all([
      fetchWeather(location.latitude, location.longitude),
      fetchAQI(location.latitude, location.longitude).catch(() => null) // Allow AQI to fail gracefully
    ]);
    console.log('Fetched data:', { location, weatherData, aqiData });
    displayWeather(location, weatherData, aqiData);
  } catch (error) {
    showError(error.message || 'Something went wrong.');
    resultCard.classList.add('hidden');
  }
}

searchButton.addEventListener('click', onSearch);
cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') onSearch();
});
