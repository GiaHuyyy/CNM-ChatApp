import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setUser, setToken } from '../redux/userSlice';

const GlobalContext = createContext();

export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
    const [socketConnection, setSocketConnection] = useState(null);
    const [seenMessage, setSeenMessage] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
    const dispatch = useDispatch();

    // Check for authentication on app start
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    // Validate token with a lightweight API call
                    try {
                        const response = await axios.get('http://localhost:5000/api/validate-token', {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });

                        if (response.data.valid) {
                            dispatch(setToken(token));
                            setIsAuthenticated(true);

                            // Fetch user details
                            const userResponse = await axios.get('http://localhost:5000/api/user-details', {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            });

                            if (userResponse.data.data) {
                                dispatch(setUser(userResponse.data.data));
                            }
                        } else {
                            // Token invalid - clear it
                            await AsyncStorage.removeItem('token');
                            setIsAuthenticated(false);
                        }
                    } catch (error) {
                        console.warn('Token validation failed:', error.message);
                        // Keep the token but mark as not authenticated
                        // This allows offline access but will revalidate when online
                        setIsAuthenticated(false);
                    }
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setIsAuthenticated(false);
            } finally {
                setIsAuthCheckComplete(true);
            }
        };

        checkAuth();
    }, [dispatch]);

    // Handle token refresh logic
    const refreshToken = async () => {
        try {
            const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
            if (!refreshTokenValue) {
                throw new Error('No refresh token available');
            }

            const response = await axios.post('http://localhost:5000/api/refresh-token', {
                refreshToken: refreshTokenValue
            });

            if (response.data.token) {
                await AsyncStorage.setItem('token', response.data.token);
                if (response.data.refreshToken) {
                    await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
                }
                dispatch(setToken(response.data.token));
                setIsAuthenticated(true);
                return response.data.token;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            // If refresh fails, log the user out
            handleLogout();
            throw error;
        }
    };

    const handleLogout = async () => {
        try {
            // Disconnect socket if connected
            if (socketConnection) {
                socketConnection.disconnect();
                setSocketConnection(null);
            }

            // Clear auth tokens
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('refreshToken');

            // Clear cached data
            await AsyncStorage.removeItem('cachedConversations');
            await AsyncStorage.removeItem('lastSelectedChat');

            // Update auth state
            setIsAuthenticated(false);
            dispatch(setUser(null));
            dispatch(setToken(null));

        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <GlobalContext.Provider
            value={{
                socketConnection,
                setSocketConnection,
                seenMessage,
                setSeenMessage,
                isAuthenticated,
                isAuthCheckComplete,
                refreshToken,
                handleLogout
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
};
