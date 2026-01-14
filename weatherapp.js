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
        showLoading(true);
        
        const position = await getCurrentPositionWithTimeout();
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        state.currentLocation = { lat, lon, name: "Текущее местоположение" };
        
        await getWeatherForLocation(state.currentLocation, true);
        
        await showThreeDayForecast(lat, lon);
        
        showMessage("Погода обновлена!", "success");
        
    } catch (error) {
        
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
            reject(new Error("Браузер не поддерживает геолокацию"));//теперь нет в console.log но пусть будет
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
            reject(new Error("Геолокация отклонена"));//теперь нет в console.log но пусть будет
        };

        navigator.geolocation.getCurrentPosition(
            success,
            error,
            { timeout: TIMEOUT }
        );
        
        timeoutId = setTimeout(() => {
            reject(new Error('Таймаут геолокации'));//теперь нет в console.log но пусть будет
        }, TIMEOUT + 1000);
    });
}


async function getWeatherForLocation(location, isCurrentLocation = false) {
    try {
        const url = `${CityData.apiEndpoint}?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code&timezone=auto&forecast_days=1`;
        
        const response = await fetch(url);
      
        
        const weatherData = await response.json();
        
        if (isCurrentLocation) {
            updateCurrentLocationUI(location, weatherData);
        } else {
            updateCityCardUI(location.name, weatherData);
        }
        
        return weatherData;
        
    } catch (error) {
        
        if (isCurrentLocation) {
            document.getElementById('current-temp').textContent = '--°C';
            document.getElementById('current-desc').textContent = 'Ошибка загрузки';
        }
        
        showMessage(`Ошибка загрузки погоды для ${location.name}`, "error");
        
    }
}


async function showThreeDayForecast(lat, lon) {
    try {
        const url = `${CityData.apiEndpoint}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=${CityData.forecastDays}`;
        
        const response = await fetch(url);
        const forecastData = await response.json();
        
       
        
        document.getElementById('forecast-container').style.display = 'grid';
        document.getElementById('permission-denied').style.display = 'none';
        
        updateForecastUI(forecastData);
        
    } catch (error) {
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
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
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




//то же самое что и для осн локации
async function showCityForecast(cityName, lat, lon) {
    try {
        const url = `${CityData.apiEndpoint}?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=${CityData.forecastDays}`;

        
        const response = await fetch(url);

        
        const forecastData = await response.json();

        const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        
        for (let i = 0; i < CityData.forecastDays; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            const weatherCode = forecastData.daily.weather_code[i];
            const temp = forecastData.daily.temperature_2m_max[i];
            const dayName = days[date.getDay()];
            const dayLabel = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : dayName;
            

            const forecastDay = document.getElementById(`forecast-day-${cityName.replace(/\s+/g, '-')}-${i}`);
            if (!forecastDay) continue;
            

            const dayNameElement = forecastDay.querySelector('.forecast-day-name');
            if (dayNameElement) {
                dayNameElement.textContent = dayLabel;
            }

            const tempElement = forecastDay.querySelector('.forecast-temp');
            if (tempElement) {
                tempElement.textContent = `${temp.toFixed(1)}°`;
            }

            const iconElement = forecastDay.querySelector('.forecast-icon');
            if (iconElement) {
                iconElement.textContent = getWeatherIcon(weatherCode);
            }
            
            const descElement = forecastDay.querySelector('.forecast-desc');
            if (descElement) {
                descElement.textContent = getWeatherDescription(weatherCode);
            }
        }

        
    } catch (error) {

        
        for (let i = 0; i < CityData.forecastDays; i++) {
            const forecastDay = document.getElementById(`forecast-day-${cityName.replace(/\s+/g, '-')}-${i}`);
            if (forecastDay) {
                const tempElement = forecastDay.querySelector('.forecast-temp');
                if (tempElement) {
                    tempElement.textContent = 'Ошибка';
                    tempElement.style.color = '#e74c3c';
                }
            }
        }
    }
}




async function addCityWithAutocomplete() {
    const cityInput = document.getElementById('city-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    
    if (!cityInput) return;
    
    const cityName = cityInput.value.trim();
    
    if (!cityName) {
        showMessage("Введите название города", "error");
        return;
    }

    if (!CityData.cityCoordinates[cityName]) {
        showMessage("Этот город не поддерживается. Выберите город из списка.", "error");
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
    
    createCityCard(cityName);
    
    try {
        await getWeatherForLocation({
            name: cityName,
            lat: coords.lat,
            lon: coords.lon
        });
        
        showMessage(`Город ${cityName} добавлен`, "success");
        
    } catch (error) {
        // silent error handling тоже
    }
    
    cityInput.value = '';
    if (autocompleteList) {
        autocompleteList.style.display = 'none';
    }
    updateEmptyState();
}




function setupCityAutocomplete() {
    const cityInput = document.getElementById('city-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    const addCityBtn = document.getElementById('add-city-btn');
    
    if (!cityInput || !autocompleteList || !addCityBtn) {
        console.error('Элементы автодополнения не найдены');
        return;
    }

    while (autocompleteList.firstChild) {
        autocompleteList.removeChild(autocompleteList.firstChild);
    }
    autocompleteList.style.display = 'none';
    

    cityInput.addEventListener('input', function() {
        const inputValue = this.value.trim();

        while (autocompleteList.firstChild) {
            autocompleteList.removeChild(autocompleteList.firstChild);
        }
        autocompleteList.style.display = 'none';
        
        if (inputValue.length === 0) return;
        

        const matchingCities = Object.keys(CityData.cityCoordinates).filter(city => 
            city.toLowerCase().includes(inputValue.toLowerCase())
        );
        
        if (matchingCities.length > 0) {
            
            matchingCities.forEach(city => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = city;
                item.dataset.city = city;
                
                item.addEventListener('click', function() {
                    cityInput.value = this.dataset.city;
                    autocompleteList.style.display = 'none';
                });
                
                autocompleteList.appendChild(item);
            });
            
            autocompleteList.style.display = 'block';
        } else {

            const item = document.createElement('div');
            item.className = 'autocomplete-item disabled';
            item.textContent = 'Данный город не поддерживается';
            autocompleteList.appendChild(item);
            autocompleteList.style.display = 'block';
        }
    });

    document.addEventListener('click', function(event) {
        const citySelectContainer = document.querySelector('.city-form');
        if (!citySelectContainer.contains(event.target)) {
            autocompleteList.style.display = 'none';
        }
    });

    addCityBtn.addEventListener('click', async function() {
        await addCityWithAutocomplete();
    });

    cityInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addCityBtn.click();
        }
    });
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
    

    const cityForecastContainer = document.createElement('div');
    cityForecastContainer.className = 'city-forecast';
    cityForecastContainer.id = `forecast-${cityName.replace(/\s+/g, '-')}`;

    for (let i = 0; i < CityData.forecastDays; i++) {
        const forecastDay = document.createElement('div');
        forecastDay.className = 'forecast-day';
        forecastDay.id = `forecast-day-${cityName.replace(/\s+/g, '-')}-${i}`;
        

        const dayNameElement = document.createElement('div');
        dayNameElement.className = 'forecast-day-name';
        dayNameElement.textContent = '--';
        

        const tempElement = document.createElement('div');
        tempElement.className = 'forecast-temp';
        tempElement.textContent = '--°';
        

        const iconElement = document.createElement('div');
        iconElement.className = 'forecast-icon';
        iconElement.textContent = '☁️';

        const descElement = document.createElement('div');
        descElement.className = 'forecast-desc';
        descElement.textContent = '--';
        
        forecastDay.appendChild(dayNameElement);
        forecastDay.appendChild(tempElement);
        forecastDay.appendChild(iconElement);
        forecastDay.appendChild(descElement);
        
        cityForecastContainer.appendChild(forecastDay);
    }
    

    card.appendChild(cityHeader);
    card.appendChild(cityWeather);
    card.appendChild(cityForecastContainer);
    
    container.appendChild(card);
}


function removeCity(cityName) {
    state.addedCities = state.addedCities.filter(city => city !== cityName);
    saveCitiesToStorage();
    
    clearCityForecast(cityName);
    
    const card = document.getElementById(`city-${cityName.replace(/\s+/g, '-')}`);
    if (card) {
        card.remove();
    }
    
    showMessage(`Город ${cityName} удален`, "success");
    updateEmptyState();
}

function clearCityForecast(cityName) {
    for (let i = 0; i < CityData.forecastDays; i++) {
        const forecastDay = document.getElementById(`forecast-day-${cityName.replace(/\s+/g, '-')}-${i}`);
        if (forecastDay) {
            forecastDay.remove();
        }
    }
}


async function updateCityCardUI(cityName, weatherData) {
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
    
    const coords = CityData.cityCoordinates[cityName];
    if (coords) {
        await showCityForecast(cityName, coords.lat, coords.lon);
    }
}


function loadAddedCities() {
    const container = document.getElementById('cities-container');
    
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
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


function updateEmptyState() {
    const emptyState = document.getElementById('cities-empty');
    const container = document.getElementById('cities-container');
    
    if (state.addedCities.length === 0) {
        emptyState.style.display = 'block';
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
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

        state.currentLocation = null;
        state.hasGeolocationPermission = true;
        
        try {
            const position = await getCurrentPositionWithTimeout();
            
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            state.currentLocation = { lat, lon, name: "Текущее местоположение" };
            
            await getWeatherForLocation(state.currentLocation, true);
            await showThreeDayForecast(lat, lon);
            
            document.getElementById('permission-denied').style.display = 'none';
            
        } catch (geolocationError) {
            
            
            if (state.currentLocation) {
                await getWeatherForLocation(state.currentLocation, true);
                await showThreeDayForecast(state.currentLocation.lat, state.currentLocation.lon);
            } else {
                document.getElementById('permission-denied').style.display = 'block';
                showMessage("Доступ к геолокации отклонен! Пожалуйста, добавьте город вручную ", "error");
            }
        }

        for (const cityName of state.addedCities) {
            const coords = CityData.cityCoordinates[cityName];
            if (coords) {
                try {
                    await getWeatherForLocation({
                        name: cityName,
                        lat: coords.lat,
                        lon: coords.lon
                    });
                    await showCityForecast(cityName, coords.lat, coords.lon);
                } catch (cityError) {
                    //silent error handling тк не загрузилось и ладно
                }
            }
        }
        
        showMessage("Вся погода обновлена!", "success");
        
    } catch (error) {
        showMessage("Ошибка при обновлении погоды", "error");
    } finally {
        showLoading(false);
        
        const updateBtn = document.getElementById('update-btn');
        updateBtn.textContent = 'Обновить все';
        updateBtn.disabled = false;
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

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
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
    setupCityAutocomplete();
    
    loadAddedCities();
    
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', updateAllWeather);
    }

    
    loadAddedCities();
    
    setTimeout(() => {
        getWeather();
    }, 500);
}

window.addEventListener('DOMContentLoaded', initApp);
