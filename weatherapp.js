window.onload = async function() {
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
        
        const params = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        };
        
        console.log('Геолокация:', params); //это я смотрю работает или нет
        
        return params;
        
    } 
    
};