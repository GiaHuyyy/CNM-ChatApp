import { REACT_APP_CLOUNDINARY_NAME, REACT_APP_CLOUNDINARY_UPLOAD_PRESET } from "@env"
import { Platform } from 'react-native';

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
    // Set maximum retries and timeout
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 30000; // 30 seconds timeout
    let retries = 0;

    try {
        console.log("Starting file upload to Cloudinary:", {
            cloudName,
            hasFile: !!file,
            fileType: typeof file,
            platform: Platform.OS || 'unknown'
        });

        if (!file) {
            throw new Error("No file provided for upload");
        }

        // Verify Cloudinary configuration
        if (!cloudName || !uploadPreset) {
            throw new Error(`Invalid Cloudinary configuration: cloudName=${cloudName}, uploadPreset=${uploadPreset}`);
        }

        const uploadWithRetry = async () => {
            try {
                const formData = new FormData();

                // Handle file appropriately based on platform and file type
                if (Platform.OS === "web") {
                    console.log("Preparing web file for upload");

                    // For web, we can directly use the File object if available
                    if (file instanceof File) {
                        formData.append("file", file);
                    } else if (file.uri) {
                        console.log("File has URI, fetching blob");
                        // If we have a URI but not a File object, fetch it
                        try {
                            const response = await fetch(file.uri);
                            if (!response.ok) {
                                throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
                            }
                            const blob = await response.blob();
                            formData.append("file", blob, file.name || file.fileName || 'file.jpg');
                        } catch (fetchError) {
                            console.error("Error fetching file from URI:", fetchError);
                            throw new Error(`Failed to fetch file from URI: ${fetchError.message}`);
                        }
                    } else {
                        throw new Error("Invalid file format for web upload");
                    }
                } else {
                    console.log("Preparing native file for upload");
                    // For native platforms (iOS/Android)
                    formData.append("file", {
                        uri: file.uri,
                        name: file.fileName || file.name || `file-${Date.now()}.${file.type?.split('/')[1] || 'jpg'}`,
                        type: file.type || file.mimeType || 'image/jpeg'
                    });
                }

                // Add upload preset parameter required by Cloudinary
                formData.append("upload_preset", uploadPreset);

                console.log("Sending request to Cloudinary:", url);

                // Create AbortController for timeout handling
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                // Send the request with improved fetch options
                const response = await fetch(url, {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                    headers: {
                        // Avoid setting Content-Type header as it's set automatically with FormData
                        'Accept': 'application/json',
                    },
                    mode: 'cors', // Explicitly set CORS mode
                    credentials: 'omit', // Don't send cookies
                });

                // Clear the timeout
                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Try to get error details
                    let errorData;
                    try {
                        errorData = await response.text();
                    } catch (e) {
                        errorData = `Status ${response.status}`;
                    }

                    console.error("Upload error response:", errorData);
                    throw new Error(`Upload failed with status ${response.status}: ${errorData}`);
                }

                // Parse the successful response
                const data = await response.json();
                console.log("Upload successful, URL:", data.secure_url);
                return data;
            } catch (error) {
                // Check if we should retry
                if (retries < MAX_RETRIES) {
                    retries++;
                    console.log(`Upload attempt ${retries} failed, retrying...`);
                    // Wait 1 second before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return uploadWithRetry();
                }
                throw error; // Rethrow if we've exhausted retries
            }
        };

        return await uploadWithRetry();
    } catch (error) {
        // Log the full error for debugging
        console.error("Error in uploadFileToCloud:", error.message);
        throw error; // Rethrow to allow handling by callers
    }
};

export default uploadFileToCloud;
