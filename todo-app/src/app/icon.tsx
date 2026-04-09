import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070b14",
          color: "#6ee7ff",
          fontSize: 220,
          fontWeight: 700,
          borderRadius: 96,
          border: "12px solid rgba(110,231,255,0.25)",
          boxSizing: "border-box",
        }}
      >
        T
      </div>
    ),
    size,
  );
}
