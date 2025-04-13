import { toast } from "sonner";

export default function commingSoon() {
  return toast.success(("This feature is comming soon! (Tinh năng này sẽ sớm ra mắt!)"), {
    position: "center-center",
  });
}
