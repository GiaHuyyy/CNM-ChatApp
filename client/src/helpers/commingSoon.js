import { toast } from "sonner";

export default function commingSoon() {
  return toast.success(("Tính năng này sẽ sớm ra mắt!"), {
    position: "center-center",
  });
}
