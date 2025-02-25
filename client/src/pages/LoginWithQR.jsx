import Images from "../constants/images";

export default function LoginWithQR() {
  return (
    <div className="mx-auto flex w-[236px] flex-col items-center rounded-[10px] border border-[#f0f0f0]">
      <img src={Images.QR} alt="" width={224} height={224} />
      <p className="text-[17.5px] text-[#006af5]">Chỉ dùng để đăng nhập</p>
      <p className="text-[17.5px]">Zz trên máy tính</p>
    </div>
  );
}
