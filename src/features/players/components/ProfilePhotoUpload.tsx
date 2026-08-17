import { useEffect, useRef, useState } from "react";
import { CameraIcon } from "lucide-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import {
  getProfilePhotoError,
  uploadProfilePhoto,
} from "@/features/players/profile-photo.service";

type ProfilePhotoUploadProps = {
  userId: string;
  displayName: string;
  photoURL?: string;
  disabled?: boolean;
  onUploaded?: (photoURL: string) => void;
};

export function ProfilePhotoUpload({
  userId,
  displayName,
  photoURL,
  disabled,
  onUploaded,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewURL, setPreviewURL] = useState(photoURL);

  useEffect(() => {
    setPreviewURL(photoURL);
  }, [photoURL, userId]);

  const shownURL = previewURL || photoURL;
  const initial = displayName.charAt(0).toUpperCase() || "U";

  const handleFile = async (file: File) => {
    const validationError = getProfilePhotoError(file);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);

    try {
      const nextURL = await uploadProfilePhoto(userId, file);
      setPreviewURL(nextURL);
      onUploaded?.(nextURL);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not upload this photo."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={disabled || uploading}
        className={cn(
          "relative rounded-full",
          (disabled || uploading) && "cursor-not-allowed opacity-70",
        )}
        aria-label={uploading ? "Uploading photo" : "Change profile photo"}
        onClick={() => inputRef.current?.click()}
      >
        <Avatar className="size-20 after:hidden">
          <AvatarImage src={shownURL} alt={displayName} />
          <AvatarFallback className="text-lg">{initial}</AvatarFallback>
        </Avatar>
        <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
          <CameraIcon className="size-3.5" />
        </span>
      </button>
      <div>
        <p className="text-sm font-medium">
          {uploading ? "Uploading..." : "Profile photo"}
        </p>
        <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. Max 2 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            void handleFile(file);
          }
        }}
      />
    </div>
  );
}
