
import { CLOUDINARY_NAME, REACT_APP_CLOUNDINARY_UPLOAD_PRESET } from "@env"

const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/auto/upload`;

const uploadFileToCloud = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", REACT_APP_CLOUNDINARY_UPLOAD_PRESET);

    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });

    const data = await response.json();
    return data;
}

export default uploadFileToCloud;
