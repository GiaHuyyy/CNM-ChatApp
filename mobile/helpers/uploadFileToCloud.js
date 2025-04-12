import { Platform } from 'react-native';
import Config from 'react-native-config';

// Cloudinary config
const url = `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_NAME}/auto/upload`;

const uploadFileToCloud = async (imageFile) => {
    try {
        // Xử lý khi nhận vào là đối tượng từ ImagePicker (như trong sign-up.jsx)
        const imageUri = imageFile.uri || imageFile;

        // Chuẩn bị file từ URI của ảnh
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';

        // Tạo form data
        const formData = new FormData();
        formData.append("file", {
            uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
            name: filename,
            type: type
        });
        formData.append("upload_preset", Config.CLOUDINARY_UPLOAD_PRESET);

        console.log("Đang upload ảnh lên Cloudinary...");
        const response = await fetch(url, {
            method: "POST",
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        const data = await response.json();
        console.log("Upload thành công:", data.secure_url);
        return data;
    } catch (error) {
        console.error("Lỗi upload:", error);
        throw error;
    }
}

export default uploadFileToCloud;