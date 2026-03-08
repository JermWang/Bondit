import dynamic from "next/dynamic";

const LaunchPageClient = dynamic(() => import("./launch-client"), {
  ssr: false,
});

export default function LaunchPage() {
  return <LaunchPageClient />;
}
