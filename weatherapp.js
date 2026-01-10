window.onload = async function() {
    try {
        console.log('старт');
        
        localStorage.removeItem('lastGeolocation');
        
        const position = await new Promise((resolve, reject) => {
            let timeoutId;
            
            const success = (pos) => {
                clearTimeout(timeoutId);
                resolve(pos);
            };
            
            const error = (err) => {
                clearTimeout(timeoutId);
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
            
            //еще время
            timeoutId = setTimeout(() => {
                reject(new Error('+60секунд'));
            }, 60000);
        });
        
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const params = {
            latitude: lat,
            longitude: lon,
        };
        
        console.log(`Координаты: ${lat}, ${lon}`);
        localStorage.setItem('lastGeolocation', JSON.stringify(params));
        await getWeatherForCoordinates(lat, lon);
        
    } catch (error) {
        console.error('не получена геолокация', error.message);
    }

     async function getWeatherForCoordinates(latitude, longitude) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
            
            const response = await fetch(url);
            const weatherData = await response.json();
            
            if (weatherData.current && weatherData.current.temperature_2m !== undefined) {
                const temperature = weatherData.current.temperature_2m;
                
                MakeTemperatureElement(`${temperature.toFixed(1)}°C`);
            } else {
                MakeTemperatureElement('Нет данных о погоде!');
            }
            
        } catch (error) {
            console.error('не получили погоду', error);
            MakeTemperatureElement('Ошибка загрузки погоды!');
        }
    }

    function MakeTemperatureElement(text) {   
        let tempElement = document.getElementById('temperature');
        
        if (!tempElement) {
            tempElement = document.createElement('div');
            tempElement.id = 'temperature';
            document.body.appendChild(tempElement);
        }
        tempElement.textContent = text;
    }
};