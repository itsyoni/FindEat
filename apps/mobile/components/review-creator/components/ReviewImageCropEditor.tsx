import SingleImageCropEditor from "@/components/create/SingleImageCropEditor";
import type {
  PickedReviewImage,
  ReviewImageKind,
} from "@/lib/reviewImagePicker";

type Props = {
  image: PickedReviewImage;
  kind: ReviewImageKind;
  onCancel: () => void;
  onApply: (image: PickedReviewImage) => void;
};

export default function ReviewImageCropEditor({
  image,
  onCancel,
  onApply,
}: Props) {
  return (
    <SingleImageCropEditor
      image={image}
      aspectRatio={4 / 3}
      outputWidth={1200}
      outputHeight={900}
      onCancel={onCancel}
      onApply={onApply}
    />
  );
}
