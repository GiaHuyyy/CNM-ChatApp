import axios from "axios";
import { REACT_APP_CLOUDINARY_NAME, REACT_APP_CLOUDINARY_UPLOAD_PRESET } from "@env";
import { Platform } from "react-native";

// Debug environment variables to ensure they're loaded properly
console.log("Cloudinary config loaded:", {
    name: REACT_APP_CLOUDINARY_NAME || 'undefined',
    preset: REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'undefined'
});

// Use cloudName directly from env var to construct the upload URL
const cloudName = REACT_APP_CLOUDINARY_NAME;
const uploadPreset = REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

/**
 * Uploads a file to Cloudinary with improved error handling and retries
 */
const uploadFileToCloud = async (file) => {
    try {
        // Check if environment variables are available
        const cloudName = REACT_APP_CLOUDINARY_NAME;
        const uploadPreset = REACT_APP_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error('Cloudinary configuration missing. Check your environment variables.');
            throw new Error('Cloudinary configuration missing');
        }

        console.log(`Uploading to Cloudinary with cloud name: ${cloudName}`);

        const formData = new FormData();

        // Handle file data differently based on platform
        if (Platform.OS === 'web') {
            // For web, we can add the file directly
            formData.append('file', file);
        } else {
            // For mobile, create the correct file structure
            formData.append('file', {
                uri: file.uri,
                type: file.type || 'application/octet-stream',
                name: file.name || file.originalName || `file_${Date.now()}`
            });
        }

        formData.append('upload_preset', uploadPreset);

        // Add original filename as public_id if available
        if (file.originalName || file.name) {
            const fileName = file.originalName || file.name;
            // Remove file extension for public_id
            const publicId = fileName.split('.').slice(0, -1).join('.') || fileName;
            formData.append('public_id', publicId);
        }

        // Log upload attempt for debugging
        console.log(`Attempting to upload file: ${file.name || file.originalName || 'unnamed file'}`);

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );

        console.log('Upload successful:', response.data.secure_url);
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);

        if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
        }

        // Return a standard object with error information
        return {
            error: true,
            message: error.message || 'Upload failed',
            secure_url: null
        };
    }
};

export default uploadFileToCloud;
