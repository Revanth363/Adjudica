import api from './api';

export const getPolicy = async () => {
    try {
        const response = await api.get('/policy');
        return response.data;
    } catch (error) {
        console.error('Error fetching policy:', error);
        throw error;
    }
};

export const updatePolicy = async (policyData) => {
    try {
        const response = await api.put('/policy', policyData);
        return response.data;
    } catch (error) {
        console.error('Error updating policy:', error);
        throw error;
    }
};
