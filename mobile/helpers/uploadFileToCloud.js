const url = `https://api.cloudinary.com/v1_1/daky9cjxu/auto/upload`;

const uploadFileToCloud = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", 'chat-app-file');

    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const data = await response.json();
    return data;
}

export default uploadFileToCloud;
