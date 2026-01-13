const CityData = {
    maxCities: 6,
    forecastDays: 3,
    apiEndpoint: 'https://api.open-meteo.com/v1/forecast',
    cityCoordinates: {
        'Москва': { lat: 55.7558, lon: 37.6173 },
        'Санкт-Петербург': { lat: 59.9343, lon: 30.3351 },
        'Нижний Новгород': { lat: 56.2965, lon: 43.9361 },
        'Казань': { lat: 55.7961, lon: 49.1064 },
        'Екатеринбург': { lat: 56.8389, lon: 60.6057 },
        'Новосибирск': { lat: 55.0084, lon: 82.9357 }
    }
};


let state = {
    currentLocation: null,
    addedCities: JSON.parse(localStorage.getItem('addedCities') || '[]'),
    hasGeolocationPermission: true
};


async function getWeather() {
    try {
        console.log("Запрашиваем геолокацию...");
        showLoading(true);
        
        const position = await getCurrentPositionWithTimeout();
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        state.currentLocation = { lat, lon, name: "Текущее местоположение" };
        
        await getWeatherForLocation(state.currentLocation, true);
        
        await showThreeDayForecast(lat, lon);
        
        showMessage("Погода обновлена!", "success");
        
    } catch (error) {
        console.error("Ошибка геолокации:", error);
        
        document.getElementById('permission-denied').style.display = 'block';
        showMessage("Разрешите доступ к геолокации или добавьте город вручную", "error");
        
        state.hasGeolocationPermission = false;
        
        loadAddedCities();
        
    } finally {
        showLoading(false);
    }
}

function getCurrentPositionWithTimeout() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Браузер не поддерживает геолокацию"));
            return;
        }
        
        const TIMEOUT = 10000;
        let timeoutId;
        
        const success = (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
        };
        
        const error = (err) => {
            clearTimeout(timeoutId);
            reject(new Error("Геолокация отклонена"));
        };

        navigator.geolocation.getCurrentPosition(
            success,
            error,
            { timeout: TIMEOUT }
        );
        
        timeoutId = setTimeout(() => {
            reject(new Error('Таймаут геолокации'));
        }, TIMEOUT + 1000);
    });
}


async function getWeatherForLocation(location, isCurrentLocation = false) {
    try {
        const url = `${CityData.apiEndpoint}?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const weatherData = await response.json();
        
        if (isCurrentLocation) {
            updateCurrentLocationUI(location, weatherData);
        } else {
            updateCityCardUI(location.name, weatherData);
        }
        
        return weatherData;
        
    } catch (error) {
        console.error("Ошибка получения погоды:", error);
        
        if (isCurrentLocation) {
            document.getElementById('current-temp').textContent = '--°C';
            document.getElementById('current-desc').textContent = 'Ошибка загрузки';
        }
        
        showMessage(`Ошибка загрузки погоды для ${location.name}`, "error");
        throw error;
    }
}


async function showThreeDayForecast(lat, lon) {
    try {
        const url = `${CityData.apiEndpoint}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=${CityData.forecastDays}`;
        
        const response = await fetch(url);
        const forecastData = await response.json();
        
        if (!forecastData.daily) {
            throw new Error("Нет данных прогноза");
        }
        
        document.getElementById('forecast-container').style.display = 'grid';
        document.getElementById('permission-denied').style.display = 'none';
        
        updateForecastUI(forecastData);
        
    } catch (error) {
        console.error("Ошибка прогноза:", error);
        showMessage("Не удалось загрузить прогноз", "error");
    }
}

function updateCurrentLocationUI(location, weatherData) {
    const temp = weatherData.current.temperature_2m;
    const weatherCode = weatherData.current.weather_code;
    
    document.getElementById('current-temp').textContent = `${temp.toFixed(1)}°C`;
    document.getElementById('current-desc').textContent = getWeatherDescription(weatherCode);
}


function updateForecastUI(forecastData) {
    const container = document.getElementById('forecast-container');
    container.innerHTML = '';
    
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    
    for (let i = 0; i < CityData.forecastDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        
        const dayCard = document.createElement('div');
        dayCard.className = 'day-forecast';
        
        const dayName = days[date.getDay()];
        const dateStr = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
        
        const weatherCode = forecastData.daily.weather_code[i];
        const temp = forecastData.daily.temperature_2m_max[i];
        

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        
        const dayInfo = document.createElement('div');
        
        const dayNameElement = document.createElement('div');
        dayNameElement.className = 'day-name';
        dayNameElement.textContent = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : dayName;
        
        const dateElement = document.createElement('div');
        dateElement.className = 'date';
        dateElement.textContent = dateStr;
        
        dayInfo.appendChild(dayNameElement);
        dayInfo.appendChild(dateElement);
        
        const weatherIcon = document.createElement('div');
        weatherIcon.className = 'weather-icon';
        weatherIcon.textContent = getWeatherIcon(weatherCode);
        
        dayHeader.appendChild(dayInfo);
        dayHeader.appendChild(weatherIcon);
        

        const tempDisplay = document.createElement('div');
        tempDisplay.className = 'temp-display';
        tempDisplay.textContent = `${temp.toFixed(1)}°C`;
        

        const weatherDesc = document.createElement('div');
        weatherDesc.style.textAlign = 'center';
        weatherDesc.style.color = '#666';
        weatherDesc.textContent = getWeatherDescription(weatherCode);
        

        dayCard.appendChild(dayHeader);
        dayCard.appendChild(tempDisplay);
        dayCard.appendChild(weatherDesc);
        
        container.appendChild(dayCard);
    }
}


async function addCity() {
    const select = document.getElementById('city-select');
    const cityName = select.value;
    
    if (!cityName) {
        showMessage("Выберите город из списка", "error");
        return;
    }
    
    if (state.addedCities.length >= CityData.maxCities) {
        showMessage(`Можно добавить не более ${CityData.maxCities} городов`, "error");
        return;
    }
    
    if (state.addedCities.includes(cityName)) {
        showMessage("Этот город уже добавлен", "error");
        return;
    }
    
    state.addedCities.push(cityName);
    saveCitiesToStorage();
    
    const coords = CityData.cityCoordinates[cityName];
    
    if (!coords) {
        showMessage("Координаты города не найдены", "error");
        return;
    }
    
    createCityCard(cityName);
    
    try {
        await getWeatherForLocation({
            name: cityName,
            lat: coords.lat,
            lon: coords.lon
        });
        
        showMessage(`Город ${cityName} добавлен`, "success");
        
    } catch (error) {
        console.error("Ошибка загрузки погоды для города:", error);
    }
    
    select.value = '';
    updateEmptyState();
}


function createCityCard(cityName) {
    const container = document.getElementById('cities-container');
    const emptyState = document.getElementById('cities-empty');
    
    emptyState.style.display = 'none';
    
    const card = document.createElement('div');
    card.className = 'city-card';
    card.id = `city-${cityName.replace(/\s+/g, '-')}`;

    const cityHeader = document.createElement('div');
    cityHeader.className = 'city-header';
    
    const cityNameElement = document.createElement('div');
    cityNameElement.className = 'city-name';
    cityNameElement.textContent = cityName;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-city';
    removeBtn.textContent = '×';
    removeBtn.onclick = function() {
        removeCity(cityName);
    };
    
    cityHeader.appendChild(cityNameElement);
    cityHeader.appendChild(removeBtn);
    
    // Погода
    const cityWeather = document.createElement('div');
    cityWeather.className = 'city-weather';
    
    const cityTemp = document.createElement('div');
    cityTemp.className = 'city-temp';
    cityTemp.textContent = '--°C';
    cityTemp.id = `temp-${cityName.replace(/\s+/g, '-')}`;
    
    const cityDesc = document.createElement('div');
    cityDesc.textContent = 'Загрузка...';
    cityDesc.id = `desc-${cityName.replace(/\s+/g, '-')}`;
    
    cityWeather.appendChild(cityTemp);
    cityWeather.appendChild(cityDesc);
    
    // Сборка
    card.appendChild(cityHeader);
    card.appendChild(cityWeather);
    
    container.appendChild(card);
}


function removeCity(cityName) {
    state.addedCities = state.addedCities.filter(city => city !== cityName);
    saveCitiesToStorage();
    
    const card = document.getElementById(`city-${cityName.replace(/\s+/g, '-')}`);
    if (card) {
        card.remove();
    }
    
    showMessage(`Город ${cityName} удален`, "success");
    updateEmptyState();
}


function updateCityCardUI(cityName, weatherData) {
    const temp = weatherData.current.temperature_2m;
    const weatherCode = weatherData.current.weather_code;
    
    const tempElement = document.getElementById(`temp-${cityName.replace(/\s+/g, '-')}`);
    const descElement = document.getElementById(`desc-${cityName.replace(/\s+/g, '-')}`);
    
    if (tempElement) {
        tempElement.textContent = `${temp.toFixed(1)}°C`;
    }
    
    if (descElement) {
        descElement.textContent = getWeatherDescription(weatherCode);
    }
}


function loadAddedCities() {
    const container = document.getElementById('cities-container');
    container.innerHTML = '';
    
    if (state.addedCities.length === 0) {
        document.getElementById('cities-empty').style.display = 'block';
        return;
    }
    
    document.getElementById('cities-empty').style.display = 'none';
    
    state.addedCities.forEach(cityName => {
        createCityCard(cityName);
        
        const coords = CityData.cityCoordinates[cityName];
        if (coords) {
            getWeatherForLocation({
                name: cityName,
                lat: coords.lat,
                lon: coords.lon
            });
        }
    });
}

//пустышка
function updateEmptyState() {
    const emptyState = document.getElementById('cities-empty');
    const container = document.getElementById('cities-container');
    
    if (state.addedCities.length === 0) {
        emptyState.style.display = 'block';
        container.innerHTML = '';
    } else {
        emptyState.style.display = 'none';
    }
}


function saveCitiesToStorage() {
    localStorage.setItem('addedCities', JSON.stringify(state.addedCities));
}


async function updateAllWeather() {
    try {
        showLoading(true);
        
        const updateBtn = document.getElementById('update-btn');
        const originalText = updateBtn.textContent;
        updateBtn.textContent = 'Обновление...';
        updateBtn.disabled = true;
        
        if (state.currentLocation) {
            await getWeatherForLocation(state.currentLocation, true);
        }
        
        for (const cityName of state.addedCities) {
            const coords = CityData.cityCoordinates[cityName];
            if (coords) {
                await getWeatherForLocation({
                    name: cityName,
                    lat: coords.lat,
                    lon: coords.lon
                });
            }
        }
        
        showMessage("Вся погода обновлена!", "success");
        
    } catch (error) {
        console.error("Ошибка обновления:", error);
        showMessage("Ошибка при обновлении погоды", "error");
    } finally {
        showLoading(false);
        
        const updateBtn = document.getElementById('update-btn');
        updateBtn.textContent = 'Обновить все';
        updateBtn.disabled = false;
    }
}


async function retryGeolocation() {
    try {
        showLoading(true);
        
        const locationBtn = document.getElementById('location-btn');
        locationBtn.disabled = true;
        
        await getWeather();
        
        document.getElementById('permission-denied').style.display = 'none';
        
    } catch (error) {
        console.error("Не удалось определить местоположение:", error);
        showMessage("Не удалось определить местоположение", "error");
    } finally {
        showLoading(false);
        
        const locationBtn = document.getElementById('location-btn');
        locationBtn.disabled = false;
    }
}


function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.style.display = 'flex';
    } else {
        loading.style.display = 'none';
    }
}


function showMessage(text, type = "info") {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const messageDiv = document.createElement('div');
    
    if (type === "error") {
        messageDiv.className = "error-message";
        messageDiv.textContent = `⚠️ ${text}`;
    } else if (type === "success") {
        messageDiv.className = "success-message";
        messageDiv.textContent = `✓ ${text}`;
    }
    
    container.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode === container) {
            container.removeChild(messageDiv);
        }
    }, 3000);
}

//эти есть в api
function getWeatherDescription(code) {
    const weatherCodes = {
        0: "Ясно",
        1: "Преимущественно ясно",
        2: "Переменная облачность",
        3: "Пасмурно",
        45: "Туман",
        48: "Изморозь",
        51: "Легкая морось",
        53: "Умеренная морось",
        55: "Сильная морось",
        56: "Легкая ледяная морось",
        57: "Сильная ледяная морось",
        61: "Небольшой дождь",
        63: "Умеренный дождь",
        65: "Сильный дождь",
        66: "Ледяной дождь",
        67: "Сильный ледяной дождь",
        71: "Небольшой снег",
        73: "Умеренный снег",
        75: "Сильный снег",
        77: "Снежные зерна",
        80: "Небольшие ливни",
        81: "Умеренные ливни",
        82: "Сильные ливни",
        85: "Небольшие снегопады",
        86: "Сильные снегопады",
        95: "Гроза",
        96: "Гроза с градом",
        99: "Сильная гроза с градом"
    };
    
    return weatherCodes[code] || "Облачно";
}


function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 86) return "🌦️";
    if (code >= 95 && code <= 99) return "⛈️";
}


function initApp() {
    console.log("Приложение запускается...");
    
    const addCityBtn = document.getElementById('add-city-btn');
    if (addCityBtn) {
        addCityBtn.addEventListener('click', addCity);
    }
    
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', updateAllWeather);
    }
    
    const locationBtn = document.getElementById('location-btn');
    if (locationBtn) {
        locationBtn.addEventListener('click', retryGeolocation);
    }
    
    loadAddedCities();
    
    setTimeout(() => {
        getWeather();
    }, 500);
}

window.addEventListener('DOMContentLoaded', initApp);