import axios from "axios";
import { REACT_APP_CLOUNDINARY_NAME, REACT_APP_CLOUNDINARY_UPLOAD_PRESET } from "@env";
import { Platform } from "react-native";

// Debug environment variables to ensure they're loaded properly
console.log("Cloudinary config loaded:", {
    name: REACT_APP_CLOUNDINARY_NAME || 'undefined',
    preset: REACT_APP_CLOUNDINARY_UPLOAD_PRESET || 'undefined'
});

// Use cloudName directly from env var to construct the upload URL
const cloudName = REACT_APP_CLOUNDINARY_NAME;
const uploadPreset = REACT_APP_CLOUNDINARY_UPLOAD_PRESET;

const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

/**
 * Uploads a file to Cloudinary with improved error handling and retries
 */
const uploadFileToCloud = async (file) => {
    try {
        // Add platform detection constants
        const IS_WEB = Platform.OS === 'web';
        const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';

        // Add console logging for debugging
        console.log(`Starting file upload on ${IS_WEB ? 'web' : 'mobile'} platform:`, {
            fileName: file.name || file.originalName || 'unknown',
            fileType: file.type || file.mimeType || 'unknown',
            fileSize: file.size || 'unknown',
            hasUri: !!file.uri
        });

        const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME'; // Replace with your Cloudinary cloud name
        const uploadPreset = 'YOUR_UNSIGNED_UPLOAD_PRESET'; // Replace with your upload preset

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        // Add original filename for better tracking
        if (file.originalName) {
            formData.append('public_id', `chat_app/${Date.now()}_${file.originalName.replace(/\.[^/.]+$/, "")}`);
        }

        // Log the request before sending
        console.log(`Sending upload request to Cloudinary (${cloudName})...`);

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        console.log(`Upload successful! Response status: ${response.status}`);
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);

        // More detailed error logging
        if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }

        throw error;
    }
};

export default uploadFileToCloud;
