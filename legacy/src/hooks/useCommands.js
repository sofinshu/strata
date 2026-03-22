import { useEffect, useState } from 'react';

const useCommands = (url) => {
    const [commands, setCommands] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const socket = new WebSocket(url);

        socket.onopen = () => {
            console.log('WebSocket connection established');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setCommands((prevCommands) => [...prevCommands, data]);
        };

        socket.onerror = (event) => {
            setError('WebSocket error: ' + event);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return () => {
            socket.close();
        };
    }, [url]);

    return { commands, error };
};

export default useCommands;
