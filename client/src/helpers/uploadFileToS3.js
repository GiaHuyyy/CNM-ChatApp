import axios from "axios";

const uploadFileToS3 = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${import.meta.env.VITE_APP_BACKEND_URL}/api/upload-file`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      withCredentials: true,
    });

    const fileData = response.data;

    return {
      secure_url: fileData.url,
      url: fileData.url,
      public_id: fileData.key,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

export default uploadFileToS3;
