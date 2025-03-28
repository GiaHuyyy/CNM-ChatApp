import React from "react";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";
import HeaderOfSignIn from "../../components/HeaderOfSignIn";

export default function SignIn() {
  return (
    <>
      {/* Sử dụng HeaderOfSignIn với tiêu đề "Đăng nhập" */}
      <HeaderOfSignIn title="Đăng nhập" />

      {/* Nội dung SignIn */}
      <div>SignIn</div>

      <CustomButton
        title="Go to chat"
        handlePress={() => router.push("/chat")}
        containerStyles="bg-white mt-11 mx-[21px]"
        textStyles="text-primary"
      />
    </>
  );
}
