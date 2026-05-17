type Props = {
  initial: string;
  color: string;
  textColor?: string;
  size: number;
  overlap?: number;
  isFirst?: boolean;
};

export default function Avatar({ initial, color, textColor = "#fff", size, overlap = 9, isFirst = false }: Props) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        marginLeft: isFirst ? 0 : -overlap,
        fontSize: Math.round(size * 0.37),
        border: `${Math.ceil(size * 0.083)}px solid #0a0a0d`,
        flexShrink: 0,
      }}
      className="rounded-full flex items-center justify-center font-bold select-none"
    >
      {initial}
    </div>
  );
}
