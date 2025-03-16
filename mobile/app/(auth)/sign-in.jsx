import React from "react";
import CustomButton from "../../components/CustomButton";
import { router } from "expo-router";

export default function SignIn() {
  return (
    <>
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
