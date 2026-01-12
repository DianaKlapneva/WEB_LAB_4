async function getWeather() {
    try {
        console.log("Запрашиваем новую геолокацию...");
        showMessage("Определяем ваше местоположение...", "info");
        
        const position = await getCurrentPositionWithTimeout();
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        console.log("Координаты получены:", lat, lon);
        showMessage("Местоположение определено! Получаем данные о погоде...", "success");
        

        const cityName = await getCityName(lat, lon);
        document.getElementById('city-name').textContent = cityName;
        document.getElementById('coordinates').textContent = `Широта: ${lat.toFixed(4)}, Долгота: ${lon.toFixed(4)}`;
        

        await getWeatherForCoordinates(lat, lon);
        

        updateLastUpdatedTime();
        
    } catch (error) {
        console.error("Ошибка при получении погоды:", error.message);
        
        //геолокацию по IP про запас
        if (error.message.includes("геолокация") || error.message.includes("местоположение")) {
            showMessage("Используем приблизительное местоположение по IP...", "info");
            await getWeatherByIPFallback();
        } else {
            showMessage(`Ошибка: ${error.message}`, "error");
            MakeTemperatureElement('Не удалось получить данные о погоде', 'Ошибка');
        }
    }
}


function getCurrentPositionWithTimeout() {
    return new Promise((resolve, reject) => {

        if (!navigator.geolocation) {
            reject(new Error("Ваш браузер не поддерживает геолокацию"));
            return;
        }
        
        let timeoutId;
        
        const success = (pos) => {
            clearTimeout(timeoutId);
            console.log("Геолокация получена:", pos.coords.latitude, pos.coords.longitude);
            resolve(pos);
        };
        
        const error = (err) => {
            clearTimeout(timeoutId);
            console.error("Ошибка геолокации:", err.code, err.message);
            
            let errorMessage;
            switch(err.code) {
                case 1:
                    errorMessage = "Доступ к геолокации запрещен. Разрешите доступ в настройках браузера или обновите страницу.";
                    break;
                case 2:
                    errorMessage = "Не удалось определить местоположение. Проверьте интернет-соединение.";
                    break;
                case 3:
                    errorMessage = "Время ожидания определения местоположения истекло.";
                    break;
                default:
                    errorMessage = "Ошибка при определении местоположения.";
            }
            
            reject(new Error(errorMessage));
        };


        const options = {
            enableHighAccuracy: true, // Используем высокую точность
            timeout: 15000,
            maximumAge: 60000
        };
        

        navigator.geolocation.getCurrentPosition(success, error, options);
        

        timeoutId = setTimeout(() => {
            reject(new Error('Таймаут запроса геолокации (15 секунд)'));
        }, 16000);
    });
}


async function getWeatherByIPFallback() {
    try {
        console.log("Пытаемся определить местоположение по IP...");
        

        const ipResponse = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!ipResponse.ok) {
            throw new Error('Не удалось определить местоположение по IP');
        }
        
        const ipData = await ipResponse.json();
        
        const lat = ipData.latitude;
        const lon = ipData.longitude;
        const city = ipData.city || "Ваш регион";
        const country = ipData.country_name || "";
        
        console.log("Координаты по IP:", lat, lon);

        document.getElementById('city-name').textContent = `${city}, ${country}`;
        document.getElementById('coordinates').textContent = `Приблизительное местоположение по IP`;
        

        await getWeatherForCoordinates(lat, lon);
        updateLastUpdatedTime();
        
        showMessage("Погода определена по приблизительному местоположению (IP)", "success");
        
    } catch (ipError) {
        console.error("Ошибка при определении по IP:", ipError);
        
        // Используем координаты по умолчанию (Москва)
        showMessage("Используем местоположение по умолчанию (Москва)", "info");
        
        const defaultLat = 55.7558;
        const defaultLon = 37.6173;
        
        document.getElementById('city-name').textContent = "Москва, Россия";
        document.getElementById('coordinates').textContent = `Широта: ${defaultLat}, Долгота: ${defaultLon}`;
        
        await getWeatherForCoordinates(defaultLat, defaultLon);
        updateLastUpdatedTime();
    }
}


async function getCityName(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=ru`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'WeatherApp/1.0 (your-email@example.com)'
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении названия города');
        }
        
        const data = await response.json();
        
        if (data.address) {

            const city = data.address.city || data.address.town || data.address.village || 
                        data.address.municipality || data.address.county || data.address.state;
            const country = data.address.country;
            
            return city && country ? `${city}, ${country}` : city || country || "Неизвестное местоположение";
        }
        
        return "Неизвестное местоположение";
        
    } catch (error) {
        console.error("Ошибка при получении названия города:", error);
        return "Ваше местоположение";
    }
}


async function getWeatherForCoordinates(latitude, longitude) {
    try {
        console.log("Запрашиваем погоду для координат:", latitude, longitude);
        

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка API: ${response.status}`);
        }
        
        const weatherData = await response.json();
        console.log("Данные о погоде получены:", weatherData);
        
        if (weatherData.current) {
            const temperature = weatherData.current.temperature_2m;
            const weatherCode = weatherData.current.weather_code;
            const windSpeed = weatherData.current.wind_speed_10m;
            
            const weatherDescription = getWeatherDescription(weatherCode);
            const weatherIcon = getWeatherIcon(weatherCode);
            

            let minTemp = "", maxTemp = "";
            if (weatherData.daily && weatherData.daily.temperature_2m_min && weatherData.daily.temperature_2m_max) {
                minTemp = weatherData.daily.temperature_2m_min[0];
                maxTemp = weatherData.daily.temperature_2m_max[0];
            }
            

            let fullDescription = `${weatherIcon} ${weatherDescription}`;
            if (minTemp && maxTemp) {
                fullDescription += ` (мин: ${minTemp}°C, макс: ${maxTemp}°C)`;
            }
            if (windSpeed) {
                fullDescription += `, ветер: ${windSpeed} м/с`;
            }
            
            MakeTemperatureElement(`${temperature.toFixed(1)}°C`, fullDescription);
            
        } else {
            throw new Error('Нет данных о погоде в ответе API');
        }
        
    } catch (error) {
        console.error("Ошибка загрузки погоды:", error);
        throw new Error('Не удалось загрузить данные о погоде');
    }
}

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
    
    return weatherCodes[code] || "Неизвестная погода";
}


function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌧️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 86) return "🌦️";
    if (code >= 95 && code <= 99) return "⛈️";
    return "🌤️";
}

function MakeTemperatureElement(temperature, description) {   
    const tempElement = document.getElementById('temperature');
    const descElement = document.getElementById('weather-description');
    
    if (tempElement) {

        tempElement.classList.remove('loading');
        tempElement.innerHTML = temperature;
    }
    
    if (descElement && description) {
        descElement.textContent = description;
    }
}

function showMessage(text, type = "info") {
    const container = document.getElementById('message-container');
    if (!container) return;
    

    container.innerHTML = '';
    
    const messageDiv = document.createElement('div');
    
    if (type === "error") {
        messageDiv.className = "error-message";
        messageDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${text}`;
    } else if (type === "success") {
        messageDiv.className = "success-message";
        messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${text}`;
    } else {
        messageDiv.className = "info-box";
        messageDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${text}`;
    }
    
    container.appendChild(messageDiv);
    

    if (type === "info" || type === "success") {
        setTimeout(() => {
            if (messageDiv.parentNode === container) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    if (messageDiv.parentNode === container) {
                        container.removeChild(messageDiv);
                    }
                }, 500);
            }
        }, 5000);
    }
}


function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    
    const dateString = now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Последнее обновление: ${dateString} ${timeString}`;
    }
}


async function updateWeather() {
    console.log("Начало обновления погоды...");
    
    const button = document.getElementById('restart-btn');
    if (!button) {
        console.error("Кнопка 'Обновить' не найдена!");
        return;
    }
    

    const originalHTML = button.innerHTML;

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обновление...';
    button.disabled = true;
    
    try {

        const infoBox = document.getElementById('info-box');
        if (infoBox) {
            infoBox.style.display = 'none';
        }
        
        await getWeather();
        

        showMessage("Погода успешно обновлена!", "success");
        
    } catch (error) {
        console.error("Ошибка при обновлении:", error);
        showMessage(`Ошибка при обновлении: ${error.message}`, "error");
    } finally {

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 1000);
    }
}


window.onload = async function() {
    console.log("Страница загружена, инициализируем приложение...");
    
    const infoBox = document.getElementById('info-box');
    if (infoBox) {
        setTimeout(() => {
            infoBox.style.display = 'none';
        }, 5000);
    }
    

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', updateWeather);
        console.log("Кнопка 'Обновить' активирована");
    } else {
        console.error("Кнопка 'Обновить' не найдена!");
    }
    

    setTimeout(async () => {
        try {
            await getWeather();
        } catch (error) {
            console.error("Ошибка при первоначальной загрузке:", error);

            showMessage("Не удалось загрузить погоду. Нажмите 'Обновить погоду' для повторной попытки.", "error");
        }
    }, 1000);
};


window.addEventListener('unhandledrejection', function(event) {
    console.error('Необработанная ошибка Promise:', event.reason);
    showMessage(`Произошла непредвиденная ошибка: ${event.reason.message || event.reason}`, "error");
});

