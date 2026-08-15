import type { SnapTextFont, SnapTextOverlay } from "@findeat/types";

export const SNAP_TEXT_FONTS: ReadonlyArray<{
  id: SnapTextFont;
  labelKey: string;
}> = [
  { id: "MODERN", labelKey: "snaps:textFontModern" },
  { id: "ELEGANT", labelKey: "snaps:textFontElegant" },
  { id: "HANDWRITTEN", labelKey: "snaps:textFontHandwritten" },
  { id: "TYPEWRITER", labelKey: "snaps:textFontTypewriter" },
];

export const SNAP_TEXT_COLORS = [
  "#FAF9F6",
  "#171717",
  "#F7D786",
  "#FF5B35",
  "#FF4D8D",
  "#52D273",
  "#4FA3FF",
  "#A56EFF",
] as const;

export function snapTextFontFamily(
  font: SnapTextFont,
  bold: boolean,
  italic: boolean,
) {
  const suffix = bold
    ? italic
      ? "BoldItalic"
      : "Bold"
    : italic
      ? "Italic"
      : "Regular";

  switch (font) {
    case "ELEGANT":
      return `SnapPlayfair${suffix}`;
    case "HANDWRITTEN":
      return bold ? "SnapCaveatBold" : "SnapCaveatRegular";
    case "TYPEWRITER":
      return `SnapRobotoMono${suffix}`;
    case "MODERN":
    default:
      return `SnapRubik${suffix}`;
  }
}

export function snapTextStyle(overlay: SnapTextOverlay) {
  return {
    color: overlay.color,
    fontFamily: snapTextFontFamily(
      overlay.font,
      overlay.bold,
      overlay.italic,
    ),
    fontSize: overlay.fontSize,
    lineHeight: Math.round(overlay.fontSize * 1.18),
    fontStyle:
      overlay.font === "HANDWRITTEN" && overlay.italic
        ? ("italic" as const)
        : ("normal" as const),
  };
}
