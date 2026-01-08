window.onload = async function() {
    try {
        
        //убираем кеши чтобы каждый раз забрасывать
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    console.log('геолокация напрямую');
                    resolve(pos);
                },
                reject,
                {
                    enableHighAccuracy: false,
                    timeout: 15000,
                    maximumAge: 0, 
                }
            );
        });
        
        const params = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toLocaleTimeString(),
        };
        
        console.log('геолокация:', params);
        
        localStorage.setItem('lastGeolocation', JSON.stringify(params));
        
        return params;
        
    } catch (error) {
        console.error('Ошибка:', error.code, error.message);

        const lastGeo = localStorage.getItem('lastGeolocation');
        if (lastGeo) {
            console.log('Используем сохраненную геолокацию из прошлой сессии:', JSON.parse(lastGeo));
        }
        
        return null;
    }
};