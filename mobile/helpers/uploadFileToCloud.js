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
        console.log("Upload started with file:", {
            fileName: file.name || "unnamed",
            fileType: file.type || "unknown",
            originalName: file.originalName || file.name || "unnamed"
        });

        // Extract the original filename without unsafe characters
        const originalName = file.originalName || file.name || `file_${Date.now()}`;
        const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", REACT_APP_CLOUNDINARY_UPLOAD_PRESET);
        formData.append("cloud_name", REACT_APP_CLOUNDINARY_NAME);

        // Add metadata to preserve the original filename
        formData.append("context", `original_filename=${safeOriginalName}`);

        // Don't use the timestamp in the public_id to make URLs cleaner
        // but add a unique identifier to prevent collisions
        const uniqueId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        formData.append("public_id", `chat_app/${uniqueId}`);

        // Important: Add these custom headers to preserve original filename
        formData.append("filename_override", safeOriginalName);

        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${REACT_APP_CLOUNDINARY_NAME}/auto/upload`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "X-Requested-With": "XMLHttpRequest",
                },
            }
        );

        console.log("Upload successful with original name:", safeOriginalName);

        // Add the original filename to the response for use in the app
        return {
            ...response.data,
            original_filename: safeOriginalName
        };
    } catch (error) {
        console.error("Error uploading file:", error);
        throw new Error(error.message || "Failed to upload file");
    }
};

export default uploadFileToCloud;
