import { useVideoPlayer, VideoView } from "expo-video";
import type { StyleProp, ViewStyle } from "react-native";

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: "contain" | "cover" | "fill";
  autoPlay?: boolean;
  nativeControls?: boolean;
  muted?: boolean;
  loop?: boolean;
};

export default function ContentVideo({
  uri,
  style,
  contentFit = "contain",
  autoPlay = false,
  nativeControls = true,
  muted = false,
  loop = true,
}: Props) {
  const player = useVideoPlayer(
    { uri, useCaching: true },
    (videoPlayer) => {
      videoPlayer.loop = loop;
      videoPlayer.muted = muted;
      if (autoPlay) videoPlayer.play();
    },
  );

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={nativeControls}
      allowsPictureInPicture={false}
      surfaceType="textureView"
    />
  );
}
