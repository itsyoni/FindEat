import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { getErrorMessage } from "@findeat/utils";
import { router } from "expo-router";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
  XIcon,
} from "phosphor-react-native";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type PostUploadKind = "content" | "review" | "snap";
type PostUploadStatus = "uploading" | "completed" | "failed";

type PostUploadResult =
  | { type: "post"; postId: string; afterOpen?: () => void }
  | { type: "snap"; userId: string };

type PostUploadRunner = (
  reportProgress: (progress: number) => void,
) => Promise<PostUploadResult>;

type StartPostUploadOptions = {
  kind: PostUploadKind;
  run: PostUploadRunner;
};

type PostUploadTask = {
  id: string;
  kind: PostUploadKind;
  progress: number;
  status: PostUploadStatus;
  result?: PostUploadResult;
  error?: string;
};

type PostUploadContextValue = {
  startPostUpload: (options: StartPostUploadOptions) => string;
};

const PostUploadContext = createContext<PostUploadContextValue | null>(null);

function boundedProgress(progress: number) {
  return Math.max(0, Math.min(1, progress));
}

export function createCombinedUploadProgress(
  count: number,
  reportProgress: (progress: number) => void,
  start = 0.08,
  end = 0.9,
) {
  const values = Array.from({ length: Math.max(1, count) }, () => 0);
  return (index: number) => (progress: number) => {
    values[index] = boundedProgress(progress);
    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    reportProgress(start + average * (end - start));
  };
}

export function PostUploadProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const [tasks, setTasks] = useState<PostUploadTask[]>([]);
  const runnersRef = useRef(new Map<string, PostUploadRunner>());
  const nextIdRef = useRef(0);

  const updateTask = useCallback(
    (id: string, update: Partial<PostUploadTask>) => {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, ...update } : task)),
      );
    },
    [],
  );

  const runTask = useCallback(
    (id: string, runner: PostUploadRunner) => {
      void runner((progress) =>
        updateTask(id, { progress: boundedProgress(progress) }),
      )
        .then((result) => {
          updateTask(id, { status: "completed", progress: 1, result });
          void AccessibilityInfo.announceForAccessibility(
            t("postUploadComplete"),
          );
        })
        .catch((error) => {
          console.error("Background post upload failed", error);
          updateTask(id, {
            status: "failed",
            error: getErrorMessage(error, "Could not upload this post."),
          });
          void AccessibilityInfo.announceForAccessibility(
            t("postUploadFailed"),
          );
        });
    },
    [t, updateTask],
  );

  const startPostUpload = useCallback(
    ({ kind, run }: StartPostUploadOptions) => {
      const id = `${Date.now()}-${++nextIdRef.current}`;
      runnersRef.current.set(id, run);
      setTasks((current) => [
        ...current,
        { id, kind, progress: 0.02, status: "uploading" },
      ]);
      runTask(id, run);
      return id;
    },
    [runTask],
  );

  const dismissTask = useCallback((id: string) => {
    runnersRef.current.delete(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const retryTask = useCallback(
    (id: string) => {
      const runner = runnersRef.current.get(id);
      if (!runner) return;
      updateTask(id, {
        status: "uploading",
        progress: 0.02,
        error: undefined,
        result: undefined,
      });
      runTask(id, runner);
    },
    [runTask, updateTask],
  );

  const value = useMemo(
    () => ({ startPostUpload }),
    [startPostUpload],
  );
  const visibleTask = tasks[tasks.length - 1];

  return (
    <PostUploadContext.Provider value={value}>
      {children}
      {visibleTask ? (
        <PostUploadBanner
          task={visibleTask}
          onDismiss={() => dismissTask(visibleTask.id)}
          onRetry={() => retryTask(visibleTask.id)}
        />
      ) : null}
    </PostUploadContext.Provider>
  );
}

function PostUploadBanner({
  task,
  onDismiss,
  onRetry,
}: {
  task: PostUploadTask;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation("common");
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const completed = task.status === "completed";
  const failed = task.status === "failed";
  const color = failed ? "#EF4444" : completed ? "#22C55E" : "#F7D786";
  const Icon = failed
    ? WarningCircleIcon
    : completed
      ? CheckCircleIcon
      : UploadSimpleIcon;

  function openUploadedPost() {
    if (!task.result) return;
    onDismiss();
    if (task.result.type === "snap") {
      router.push({
        pathname: "/snaps/[userId]",
        params: { userId: task.result.userId },
      });
      return;
    }
    router.push({
      pathname: "/(posts)/[id]",
      params: { id: task.result.postId },
    });
    if (task.result.afterOpen) {
      setTimeout(task.result.afterOpen, 450);
    }
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: insets.bottom + 76,
        zIndex: 10_100,
        alignItems: "center",
      }}
    >
      <Animated.View
        entering={FadeInDown.springify().damping(18).stiffness(220)}
        exiting={FadeOutDown.duration(160)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          width: "100%",
          maxWidth: 460,
          overflow: "hidden",
          borderRadius: 19,
          backgroundColor: isDark ? "#242424" : "#171717",
          shadowColor: "#000",
          shadowOpacity: 0.24,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 7 },
          elevation: 10,
        }}
      >
        <View
          style={{
            minHeight: 66,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 15,
            paddingVertical: 12,
          }}
        >
          <Icon size={25} color={color} weight="fill" />
          <View style={{ marginLeft: 11, flex: 1 }}>
            <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "800" }}>
              {t(
                failed
                  ? "postUploadFailed"
                  : completed
                    ? "postUploadComplete"
                    : "postUploading",
              )}
            </Text>
            <Text
              style={{ marginTop: 2, color: "#A3A3A3", fontSize: 12 }}
              numberOfLines={1}
            >
              {failed
                ? task.error
                : t(`postUploadKind_${task.kind}`)}
            </Text>
          </View>
          {failed ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onRetry}
              style={{ flexDirection: "row", alignItems: "center", padding: 8 }}
            >
              <ArrowClockwiseIcon size={17} color={color} weight="bold" />
              <Text style={{ marginLeft: 5, color, fontWeight: "800" }}>
                {t("retry")}
              </Text>
            </TouchableOpacity>
          ) : completed ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={openUploadedPost}
              style={{ paddingHorizontal: 8, paddingVertical: 9 }}
            >
              <Text style={{ color, fontWeight: "800" }}>
                {t("viewUpload")}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "800" }}>
              {Math.round(task.progress * 100)}%
            </Text>
          )}
          {task.status !== "uploading" ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("dismiss")}
              onPress={onDismiss}
              hitSlop={10}
              style={{ marginLeft: 4, padding: 5 }}
            >
              <XIcon size={16} color="#A3A3A3" weight="bold" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={{ height: 4, backgroundColor: "#FFFFFF18" }}>
          <View
            style={{
              width: `${Math.max(task.progress * 100, 2)}%`,
              height: "100%",
              backgroundColor: color,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

export function usePostUpload() {
  const context = useContext(PostUploadContext);
  if (!context) {
    throw new Error("usePostUpload must be used inside PostUploadProvider");
  }
  return context;
}
