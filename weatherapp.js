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
        
        const params = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toLocaleTimeString()
        };
        
        console.log('получена геолокация');
        localStorage.setItem('lastGeolocation', JSON.stringify(params));
        console.log(params);
        return params;
        
    } catch (error) {
        console.error('не получена геолокация', error.message);
        
        return null;
    }
};