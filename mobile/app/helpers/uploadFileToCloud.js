const url = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_APP_CLOUNDINARY_NAME}/auto/upload`;

const uploadFileToCloud = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", import.meta.env.VITE_APP_CLOUNDINARY_UPLOAD_PRESET);
    
    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });
    
    const data = await response.json();
    return data;
}

export default uploadFileToCloud;
