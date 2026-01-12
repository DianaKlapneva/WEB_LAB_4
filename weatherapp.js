async function getWeather() {
    try {
        console.log("Запрашиваем новую геолокацию...");
        
        const position = await new Promise((resolve, reject) => {
            let timeoutId;
            
            const success = (pos) => {
                clearTimeout(timeoutId);
                console.log("Геолокация получена:", pos.coords.latitude, pos.coords.longitude);
                resolve(pos);
            };
            
            const error = (err) => {
                clearTimeout(timeoutId);
                console.error("Ошибка геолокации:", err);
                reject(err);
            };
            

            navigator.geolocation.getCurrentPosition(
                success,
                error,
                {
                    enableHighAccuracy: true,
                    timeout: 45000,
                    maximumAge: 0,
                }
            );
            
            timeoutId = setTimeout(() => {
                reject(new Error('+60 секунд'));
            }, 60000);
        });
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        await getWeatherForCoordinates(lat, lon);
        
    } catch (error) {
        console.error("Ошибка при получении погоды:", error);
        MakeTemperatureElement('Не получена геолокация. Нажмите "Обновить" еще раз.');
    }
}


async function getWeatherForCoordinates(latitude, longitude) {
    try {
        console.log("Запрашиваем погоду для координат:", latitude, longitude);
        
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
        
        const response = await fetch(url);
        const weatherData = await response.json();
        
        if (weatherData.current && weatherData.current.temperature_2m !== undefined) {
            const temperature = weatherData.current.temperature_2m;
            MakeTemperatureElement(`${temperature.toFixed(1)}°C`);
            console.log("Температура получена:", temperature);
        } else {
            MakeTemperatureElement('Нет данных о погоде!');
        }
        
    } catch (error) {
        console.error("Ошибка загрузки погоды:", error);
        MakeTemperatureElement('Ошибка загрузки погоды!');
    }
}


function MakeTemperatureElement(text) {   
    let tempElement = document.getElementById('temperature');
    
    if (!tempElement) {
        tempElement = document.createElement('div');
        tempElement.id = 'temperature';
        tempElement.className = 'temperature-display';
        document.querySelector('.container').appendChild(tempElement);
    }
    
    
}

async function updateWeather() {
    console.log("начало обновления");
    

    const button = document.getElementById('restart-btn');
    const originalText = button.textContent;
    button.textContent = 'Обновление...';
    button.disabled = true;
    
    try {
        await getWeather();
    } finally {

        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 500);
    }
}


window.onload = async function() {
    console.log("страница загружена, запрашиваем погоду...");
    

    await getWeather();
    

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', updateWeather);
        console.log("Кнопка 'Обновить' активирована");
    } else {
        console.error("Кнопка 'Обновить' не найдена!");
    }
    

};